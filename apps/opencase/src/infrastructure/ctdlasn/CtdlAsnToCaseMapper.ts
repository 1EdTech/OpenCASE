import { randomUUID } from 'node:crypto'
import type { CtdlGraph } from '../http/CredentialRegistryClient'

export interface CtdlCasePackage {
  CFDocument: Record<string, any>
  CFItems: Record<string, any>[]
  CFAssociations: Record<string, any>[]
}

// Extract a display string from a CTDL language-tagged value or plain string
function getLangValue (val: any, preferredLang = 'en-us'): string | undefined {
  if (!val) return undefined
  if (typeof val === 'string') return val
  if (typeof val === 'object' && !Array.isArray(val)) {
    if (val[preferredLang]) return String(val[preferredLang])
    if (val['en-US']) return String(val['en-US'])
    if (val['en']) return String(val['en'])
    const first = Object.values(val)[0]
    return typeof first === 'string' ? first : undefined
  }
  return undefined
}

// Normalize a CTDL value to an array of string URIs
function toUriArray (val: any): string[] {
  if (!val) return []
  if (typeof val === 'string') return [val]
  if (typeof val === 'object' && val['@id']) return [String(val['@id'])]
  if (Array.isArray(val)) {
    return val
      .map((v: any) => (typeof v === 'string' ? v : v?.['@id']))
      .filter((v): v is string => typeof v === 'string')
  }
  return []
}

function toStringArray (val: any): string[] {
  if (!val) return []
  if (typeof val === 'string') return [val]
  if (Array.isArray(val)) return val.filter((v): v is string => typeof v === 'string')
  return []
}

// Origin of a resource @id (e.g. "https://credentialengineregistry.org"), used to
// record which registry a node was imported from — this is what makes provenance
// unambiguous when frameworks are pulled from more than one CTDL registry.
function deriveRegistryBase (uri: string | undefined): string | undefined {
  if (!uri) return undefined
  try { return new URL(uri).origin } catch { return undefined }
}

// Unified Registry provenance block, written identically on CFDocument and CFItem.
// The @id URI is authoritative (resolvable + registry-qualified); ctid is a derivable
// convenience and omitted when the source doesn't provide one (non-CE registries).
function buildSource (uri: string, ctid: string | undefined, registry: string | undefined): Record<string, unknown> {
  return {
    uri,
    ...(ctid ? { ctid } : {}),
    ...(registry ? { registry } : {}),
    format: 'ctdl-asn',
  }
}

export function mapCtdlGraphToCasePackage (graph: CtdlGraph): CtdlCasePackage {
  const nodes = graph['@graph']

  const framework = nodes.find(n => n['@type'] === 'ceasn:CompetencyFramework')
  if (!framework) {
    throw new Error('No ceasn:CompetencyFramework node found in Credential Registry graph')
  }

  const competencies = nodes.filter(n => n['@type'] === 'ceasn:Competency')
  const frameworkUri: string = framework['@id']
  const now = new Date().toISOString()
  const ctid: string = framework['ceterms:ctid'] ?? ''
  const registryBase = deriveRegistryBase(frameworkUri)

  // Assign a stable UUID to every node up front so associations can reference them
  const uuidByCtdlUri = new Map<string, string>()
  const docUuid = randomUUID()
  uuidByCtdlUri.set(frameworkUri, docUuid)
  for (const comp of competencies) {
    uuidByCtdlUri.set(comp['@id'], randomUUID())
  }

  // Publisher / creator display name — prefer publisherName (language-tagged string)
  const publisherName =
    getLangValue(framework['ceasn:publisherName']) ??
    toUriArray(framework['ceasn:publisher'])[0] ??
    'Unknown'

  const language = toStringArray(framework['ceasn:inLanguage'])[0] ?? 'en'

  const title = getLangValue(framework['ceasn:name']) ?? 'Untitled Framework'

  // --- CFDocument ---
  const CFDocument: Record<string, any> = {
    sourcedId: docUuid,
    title,
    description: getLangValue(framework['ceasn:description']),
    creator: publisherName,
    publisher: publisherName,
    language,
    officialSourceURL: frameworkUri,
    lastChangeDateTime: framework['ceasn:dateModified'] ?? now,
    extensions: {
      'ext:opencase': {
        source: buildSource(frameworkUri, ctid || undefined, registryBase),
        // Drives the home-screen "Imported"/"Forked" badge (indexed from ext:opencase).
        sourcePackageURI: frameworkUri,
        importedFrom: 'credential-registry',
        importedAt: now,
        isModifiedFromSource: false,
        ...(toUriArray(framework['ceasn:source'])[0]
          ? { derivedFromSource: toUriArray(framework['ceasn:source'])[0] }
          : {})
      }
    }
  }

  // --- CFItems ---
  const CFItems: Record<string, any>[] = []

  for (const comp of competencies) {
    const uuid = uuidByCtdlUri.get(comp['@id'])
    if (!uuid) continue

    const fullStatement = getLangValue(comp['ceasn:competencyText'])
    if (!fullStatement) continue  // skip items with no text

    const itemLanguages = toStringArray(comp['ceasn:inLanguage'])
    const educationLevelUris = toUriArray(comp['ceasn:educationLevelType'])
    const codedNotation = getLangValue(comp['ceasn:codedNotation'])
    const competencyLabel = getLangValue(comp['ceasn:competencyLabel'])

    CFItems.push({
      sourcedId: uuid,
      fullStatement,
      abbreviatedStatement: competencyLabel,
      humanCodingScheme: codedNotation,
      language: itemLanguages[0] ?? language,
      educationLevel: educationLevelUris.length > 0 ? educationLevelUris : undefined,
      lastChangeDateTime: now,
      CFDocumentURI: {
        identifier: docUuid,
        title,
        uri: undefined  // generated by CFItem.fromRaw()
      },
      extensions: {
        'ext:opencase': {
          source: buildSource(comp['@id'], comp['ceterms:ctid'] ?? undefined, registryBase)
        }
      }
    })
  }

  // Build a title lookup (truncated statement) for use in association LinkData
  const titleByUuid = new Map<string, string>([[docUuid, title]])
  for (const item of CFItems) {
    const label = typeof item.fullStatement === 'string'
      ? item.fullStatement.substring(0, 120)
      : String(item.sourcedId)
    titleByUuid.set(item.sourcedId as string, label)
  }

  // --- CFAssociations from CTDL hierarchy ---
  const CFAssociations: Record<string, any>[] = []

  for (const comp of competencies) {
    const childUuid = uuidByCtdlUri.get(comp['@id'])
    if (!childUuid) continue

    const childTitle = titleByUuid.get(childUuid) ?? childUuid
    const isChildOfUris = toUriArray(comp['ceasn:isChildOf'])
    const isTopChildOfUris = toUriArray(comp['ceasn:isTopChildOf'])

    if (isChildOfUris.length > 0) {
      // Item has an explicit parent — create isChildOf to the parent node
      for (const parentUri of isChildOfUris) {
        const parentUuid = uuidByCtdlUri.get(parentUri)
        if (!parentUuid) continue  // parent not in this graph

        CFAssociations.push({
          sourcedId: randomUUID(),
          associationType: 'isChildOf',
          originNodeURI: { identifier: childUuid, title: childTitle },
          destinationNodeURI: {
            identifier: parentUuid,
            title: titleByUuid.get(parentUuid) ?? parentUuid
          },
          lastChangeDateTime: now
        })
      }
    } else if (isTopChildOfUris.includes(frameworkUri)) {
      // Top-level item — parent is the CFDocument itself
      CFAssociations.push({
        sourcedId: randomUUID(),
        associationType: 'isChildOf',
        originNodeURI: { identifier: childUuid, title: childTitle },
        destinationNodeURI: { identifier: docUuid, title },
        lastChangeDateTime: now
      })
    }
  }

  return { CFDocument, CFItems, CFAssociations }
}
