import { randomUUID } from 'node:crypto'
import type { CFPackageRepository } from '../ports/CFPackageRepository'
import { CaseVersion, TenantId } from '../../../domain/case/value-objects/Identifiers'
import { CFDocument } from '../../../domain/case/entities/CFDocument'
import { CFItem } from '../../../domain/case/entities/CFItem'
import { CFAssociation } from '../../../domain/case/entities/CFAssociation'
import { CFRubric } from '../../../domain/case/entities/CFRubric'
import { CFPackage } from '../../../domain/case/entities/CFPackage'
import { JsonSchemaValidator } from '../../../infrastructure/validation/JsonSchemaValidator'
import type { FileFrameworkStore } from '../../../infrastructure/persistence/file/FileFrameworkStore'
import { mintForkedIdentifiers, stripNonDataFields, type RawComparableBundle } from '../services/mirrorFork'

export interface CreateFrameworkCommand {
  tenantId: TenantId
  caseVersion: CaseVersion
  payload: {
    CFDocument: any
    CFItems?: any[]
    CFAssociations?: any[]
    CFRubrics?: any[]
    CFDefinitions?: any
    extensions?: any
  }
}

export type CreateFrameworkResult =
  | { status: 'created', docId: string }
  | { status: 'published', docId: string, forked?: boolean, isModifiedFromSource?: boolean, sourcePackageURI?: string }
  | { status: 'unchanged', docId: string, isModifiedFromSource?: boolean, sourcePackageURI?: string }

function stableStringify (value: any): string {
  const seen = new WeakSet<object>()
  const normalize = (v: any): any => {
    if (v === null || v === undefined) return v
    if (typeof v !== 'object') return v

    if (Array.isArray(v)) {
      return v.map(normalize)
    }

    if (seen.has(v)) return v
    seen.add(v)

    const out: any = {}
    for (const k of Object.keys(v).sort()) {
      out[k] = normalize(v[k])
    }
    return out
  }

  return JSON.stringify(normalize(value))
}

function sortById (arr: any[]): any[] {
  const getId = (o: any): string => (o?.sourcedId ?? o?.identifier ?? o?.id ?? '').toString()
  return [...arr].sort((a, b) => getId(a).localeCompare(getId(b)))
}

function stableStringifyBundle (bundle: RawComparableBundle): string {
  return stableStringify({
    CFDocument: bundle.CFDocument,
    CFItems: sortById(bundle.CFItems ?? []),
    CFAssociations: sortById(bundle.CFAssociations ?? []),
    CFRubrics: sortById(bundle.CFRubrics ?? []),
    CFDefinitions: bundle.CFDefinitions ?? null
  })
}

/**
 * Prepares payload for validation by removing fields that are only present in GET responses
 * but not allowed in POST requests according to the official CFPackage schema.
 *
 * - CFPackageURI: Added to CFDocument in GET responses, but not in CFPackage POST
 * - CFDocumentURI: Added to CFItems and CFAssociations in GET responses, but not in CFPackage POST
 */
function preparePayloadForValidation (payload: any): any {
  const cleaned = { ...payload }

  // Remove CFPackageURI from CFDocument (only in GET responses)
  if (cleaned.CFDocument) {
    const { CFPackageURI, ...documentWithoutPackageURI } = cleaned.CFDocument
    cleaned.CFDocument = documentWithoutPackageURI
  }

  // Remove CFDocumentURI from CFItems (only in GET responses)
  if (cleaned.CFItems && Array.isArray(cleaned.CFItems)) {
    cleaned.CFItems = cleaned.CFItems.map((item: any) => {
      const { CFDocumentURI, ...itemWithoutDocumentURI } = item
      return itemWithoutDocumentURI
    })
  }

  // Remove CFDocumentURI from CFAssociations (only in GET responses)
  if (cleaned.CFAssociations && Array.isArray(cleaned.CFAssociations)) {
    cleaned.CFAssociations = cleaned.CFAssociations.map((assoc: any) => {
      const { CFDocumentURI, ...assocWithoutDocumentURI } = assoc
      return assocWithoutDocumentURI
    })
  }

  return cleaned
}

export class CreateFramework {
  constructor (
    private readonly pkgRepo: CFPackageRepository,
    private readonly validator: JsonSchemaValidator | undefined,
    private readonly store: FileFrameworkStore
  ) {}

  /**
   * Prepares payload for validation by removing fields that are only present in GET responses
   * but not allowed in POST requests according to the official CFPackage schema.
   */
  private preparePayloadForValidation (payload: any): any {
    return preparePayloadForValidation(payload)
  }

  async execute (cmd: CreateFrameworkCommand): Promise<CreateFrameworkResult> {
    const { tenantId, caseVersion, payload } = cmd

    // Validate against JSON schema if validator is available
    // Payload should match CFPackage format (CFDocument, CFItems, etc.)
    // Note: CFPackageURI and CFDocumentURI are added in GET responses but NOT allowed in POST
    if (this.validator) {
      const schemaName = caseVersion === '1.1' ? 'case-v1p1-cfpackage' : 'case-v1p0-cfpackage'

      // Check if schema is registered
      if (!this.validator.hasSchema(schemaName)) {
        const registeredSchemas = this.validator.getRegisteredSchemas()
        throw new Error(
          `Schema '${schemaName}' is not available. ` +
          `Registered schemas: ${registeredSchemas.length > 0 ? registeredSchemas.join(', ') : 'none'}. ` +
          `Schema loading may have failed during startup. Check server logs for details.`
        )
      }

      // Prepare payload for validation by removing fields that are only in GET responses
      const validationPayload = this.preparePayloadForValidation(payload)

      try {
        this.validator.validate(schemaName, validationPayload)
      } catch (error: any) {
        const validationError: any = new Error(`Schema validation failed: ${error.message}`)
        validationError.details = error.details || error.errors
        throw validationError
      }
    }

    let cfDocPayload = payload.CFDocument
    let cfItemsPayload = payload.CFItems ?? []
    let cfAssociationsPayload = payload.CFAssociations ?? []
    let cfRubricsPayload = payload.CFRubrics ?? []
    let preserveUris: { preserveUris: boolean } | undefined
    let forked = false
    let resultIsModifiedFromSource: boolean | undefined
    let resultSourcePackageURI: string | undefined

    // Build entities from the payload as submitted (pre-fork) so we can
    // compare like-for-like against the existing persisted entities' own
    // .toJSON() output — comparing the raw POST payload directly against a
    // .toJSON()'d bundle would false-positive on every save, since GET-only
    // fields (CFDocumentURI, CFPackageURI) are legitimately absent from POST
    // payloads by CASE spec convention but always present after fromRaw/toJSON.
    const buildEntities = (docPayload: any, itemsPayload: any[], assocPayload: any[], rubricsPayload: any[], uriOptions?: { preserveUris: boolean }) => {
      const doc = CFDocument.fromRaw(tenantId, caseVersion, docPayload, uriOptions)
      const dId = doc.sourcedId
      const dURI = doc.toJSON().uri
      return {
        document: doc,
        items: itemsPayload.map((i: any) => CFItem.fromRaw(tenantId, caseVersion, i, dId, dURI, uriOptions)),
        associations: assocPayload.map((a: any) => CFAssociation.fromRaw(tenantId, caseVersion, a, uriOptions)),
        rubrics: rubricsPayload.map((r: any) => CFRubric.fromRaw(tenantId, caseVersion, r, uriOptions))
      }
    }

    // Resolve the document's existing storage key ONCE, up front, from
    // whatever identifier the payload currently reports. This is the ONLY
    // identifier -> storage-key translation in this method; everything below
    // reuses `resolvedStorageKey` rather than re-deriving it from an
    // identifier that may be about to change (a fork) or may never have
    // existed (a brand-new document).
    const requestedDocId = (cfDocPayload.sourcedId ?? cfDocPayload.identifier) as string | undefined
    let resolvedStorageKey: string | null = null
    if (requestedDocId) {
      resolvedStorageKey = this.store.resolveStorageKey(tenantId, caseVersion, requestedDocId)
      if (!resolvedStorageKey) {
        const otherVersion: CaseVersion = caseVersion === '1.0' ? '1.1' : '1.0'
        const storageKeyOtherVersion = this.store.resolveStorageKey(tenantId, otherVersion, requestedDocId)
        if (storageKeyOtherVersion) {
          throw new Error(
            `CFDocument '${requestedDocId}' already exists under CASE version ${otherVersion === '1.1' ? '1.1' : '1.0'}, but this save was submitted as ${caseVersion === '1.1' ? '1.1' : '1.0'}. Save using the CASE version the document was created under.`
          )
        }
      }
    }

    if (resolvedStorageKey) {
      const existingMeta = this.store.getDocumentMetadata(tenantId, caseVersion, resolvedStorageKey)
      const existingPkg = existingMeta ? await this.pkgRepo.load(tenantId, caseVersion, resolvedStorageKey) : null

      if (existingMeta?.isModifiedFromSource !== undefined && existingPkg) {
        preserveUris = { preserveUris: existingMeta.isModifiedFromSource === false }
        const candidate = buildEntities(cfDocPayload, cfItemsPayload, cfAssociationsPayload, cfRubricsPayload, preserveUris)

        const existingComparable: RawComparableBundle = {
          CFDocument: existingPkg.document.toJSON(),
          CFItems: existingPkg.items.map(i => i.toJSON()),
          CFAssociations: existingPkg.associations.map(a => a.toJSON()),
          CFRubrics: (existingPkg.rubrics ?? []).map(r => r.toJSON()),
          CFDefinitions: existingPkg.definitions ?? null
        }
        const newComparable: RawComparableBundle = {
          CFDocument: candidate.document.toJSON(),
          CFItems: candidate.items.map(i => i.toJSON()),
          CFAssociations: candidate.associations.map(a => a.toJSON()),
          CFRubrics: candidate.rubrics.map(r => r.toJSON()),
          CFDefinitions: payload.CFDefinitions ?? null
        }
        const dataChanged = stableStringifyBundle(stripNonDataFields(existingComparable)) !== stableStringifyBundle(stripNonDataFields(newComparable))

        const priorOpencase = (existingComparable.CFDocument as any)?.extensions?.['ext:opencase']
        const priorOpencaseObj = (priorOpencase && typeof priorOpencase === 'object') ? priorOpencase : {}

        let newIsModifiedFromSource = existingMeta.isModifiedFromSource

        if (dataChanged && existingMeta.isModifiedFromSource === false) {
          // Fork event: mint fresh local identifiers for the document,
          // items, associations, and rubrics. The document's storage
          // location doesn't change — it keeps living under its pre-fork
          // storage key even though its own identifier just changed.
          const minted = mintForkedIdentifiers(
            { CFDocument: cfDocPayload, CFItems: cfItemsPayload, CFAssociations: cfAssociationsPayload, CFRubrics: cfRubricsPayload },
            tenantId,
            caseVersion
          )
          cfDocPayload = minted.CFDocument
          cfItemsPayload = minted.CFItems ?? []
          cfAssociationsPayload = minted.CFAssociations ?? []
          cfRubricsPayload = minted.CFRubrics ?? []
          preserveUris = { preserveUris: true }
          forked = true
          newIsModifiedFromSource = true
        }

        // Always re-inject provenance — the frontend never round-trips
        // sourcePackageURI/isModifiedFromSource/importedAt, only its own
        // canvas layout extension keys, so the server must restore them
        // from the persisted document on every save of a previously
        // imported doc, not just on the fork event itself.
        const incomingExt = cfDocPayload.extensions ?? {}
        const incomingOpencase = (incomingExt['ext:opencase'] && typeof incomingExt['ext:opencase'] === 'object')
          ? incomingExt['ext:opencase']
          : {}
        cfDocPayload = {
          ...cfDocPayload,
          extensions: {
            ...incomingExt,
            'ext:opencase': {
              ...incomingOpencase,
              ...(priorOpencaseObj.sourcePackageURI ? { sourcePackageURI: priorOpencaseObj.sourcePackageURI } : {}),
              ...(priorOpencaseObj.importedAt ? { importedAt: priorOpencaseObj.importedAt } : {}),
              isModifiedFromSource: newIsModifiedFromSource,
            }
          }
        }

        resultIsModifiedFromSource = newIsModifiedFromSource
        resultSourcePackageURI = priorOpencaseObj.sourcePackageURI
      }
    }

    // Extract from CFPackage format and create domain entities
    const document = CFDocument.fromRaw(tenantId, caseVersion, cfDocPayload, preserveUris)
    const docId = document.sourcedId
    const docJSON = document.toJSON()
    const docURI = docJSON.uri

    const items = cfItemsPayload.map((i: any) =>
      CFItem.fromRaw(tenantId, caseVersion, i, docId, docURI, preserveUris)
    )
    const associations = cfAssociationsPayload.map((a: any) =>
      CFAssociation.fromRaw(tenantId, caseVersion, a, preserveUris)
    )
    const rubrics = cfRubricsPayload.map((r: any) =>
      CFRubric.fromRaw(tenantId, caseVersion, r, preserveUris)
    )
    const definitions = payload.CFDefinitions ?? null

    const pkg = new CFPackage({ document, items, associations, rubrics, definitions })

    if (forked) {
      // A fork always writes a new version — no idempotency short-circuit.
      // resolvedStorageKey is guaranteed non-null here (forking only happens
      // when an existing document was found above).
      await this.pkgRepo.saveNewVersion(tenantId, caseVersion, pkg, resolvedStorageKey!)
      return {
        status: 'published',
        docId,
        forked: true,
        isModifiedFromSource: resultIsModifiedFromSource,
        sourcePackageURI: resultSourcePackageURI
      }
    }

    if (resolvedStorageKey) {
      // Idempotency: if this doc already exists and the resulting stored bundle would be identical,
      // don't create a new version.
      // Compare using CFPackage format (CFDocument, CFItems, etc.) to match validation format
      const existing = await this.pkgRepo.load(tenantId, caseVersion, resolvedStorageKey)
      if (existing) {
        const existingBundle = {
          CFDocument: existing.document.toJSON(),
          CFItems: sortById(existing.items.map(i => i.toJSON())),
          CFAssociations: sortById(existing.associations.map(a => a.toJSON())),
          CFRubrics: sortById((existing.rubrics ?? []).map(r => r.toJSON())),
          CFDefinitions: existing.definitions ?? null
        }
        const newBundle = {
          CFDocument: docJSON,
          CFItems: sortById(items.map(i => i.toJSON())),
          CFAssociations: sortById(associations.map(a => a.toJSON())),
          CFRubrics: sortById(rubrics.map(r => r.toJSON())),
          CFDefinitions: definitions
        }

        if (stableStringify(existingBundle) === stableStringify(newBundle)) {
          return { status: 'unchanged', docId, isModifiedFromSource: resultIsModifiedFromSource, sourcePackageURI: resultSourcePackageURI }
        }

        await this.pkgRepo.saveNewVersion(tenantId, caseVersion, pkg, resolvedStorageKey)
        return { status: 'published', docId, isModifiedFromSource: resultIsModifiedFromSource, sourcePackageURI: resultSourcePackageURI }
      }
    }

    // Brand new document: mint a storage key independent of its identifier
    // from the start (never inferred from a CASE identifier that could
    // later be freed and reused by an unrelated document — see
    // ImportFramework.ts for the same rationale).
    await this.pkgRepo.saveNewVersion(tenantId, caseVersion, pkg, randomUUID())
    return { status: 'created', docId }
  }
}
