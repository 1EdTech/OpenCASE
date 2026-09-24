import { describe, it, expect } from 'vitest'
import { frameworkToCfPackage, toOpenCaseFormat } from './toCasePackage'
import type { Framework } from '@/domain/framework/model/types'
import type { AssociationId, FrameworkId, ItemId } from '@/domain/shared/types'

const FOREIGN_DOC_URI = 'https://source.example.org/ims/case/v1p1/CFDocuments/doc-abc'
const FOREIGN_ITEM_URI = 'https://source.example.org/ims/case/v1p1/CFItems/item-1'

function makeMirroredFramework(): Framework {
  return {
    id: 'doc-abc' as FrameworkId,
    metadata: { title: 'Mirrored Framework', caseUri: FOREIGN_DOC_URI },
    items: new Map([
      ['item-1' as ItemId, {
        id: 'item-1' as ItemId,
        statement: 'Statement 1',
        type: 'Standard',
        metadata: { caseUri: FOREIGN_ITEM_URI },
      }],
    ]),
    associations: new Map(),
    status: 'Published',
  }
}

function makeLocalFramework(): Framework {
  return {
    id: 'fw-1' as FrameworkId,
    metadata: { title: 'Local Framework' },
    items: new Map([
      ['item-1' as ItemId, { id: 'item-1' as ItemId, statement: 'Statement 1', type: 'Standard' }],
      ['item-2' as ItemId, { id: 'item-2' as ItemId, statement: 'Statement 2', type: 'Standard' }],
    ]),
    associations: new Map([
      ['assoc-1' as AssociationId, {
        id: 'assoc-1' as AssociationId,
        fromItemId: 'item-1' as ItemId,
        toItemId: 'item-2' as ItemId,
        associationType: 'isChildOf',
      }],
    ]),
    status: 'Draft',
  }
}

describe('toOpenCaseFormat — URI preservation', () => {
  it('preserves a foreign mirrored document uri instead of localizing it', () => {
    const cfPackage = frameworkToCfPackage({ framework: makeMirroredFramework(), caseVersion: '1.1' })
    const openCase = toOpenCaseFormat(cfPackage)

    expect(openCase.CFDocument.uri).toBe(FOREIGN_DOC_URI)
  })

  it('preserves a foreign mirrored item uri, and its CFDocumentURI points at the resolved document uri', () => {
    const cfPackage = frameworkToCfPackage({ framework: makeMirroredFramework(), caseVersion: '1.1' })
    const openCase = toOpenCaseFormat(cfPackage)

    const item = openCase.CFItems?.[0]
    expect(item?.uri).toBe(FOREIGN_ITEM_URI)
    expect(item?.CFDocumentURI.uri).toBe(FOREIGN_DOC_URI)
  })

  it('mints a local uri for a brand-new document/item with no prior caseUri', () => {
    const cfPackage = frameworkToCfPackage({ framework: makeLocalFramework(), caseVersion: '1.1' })
    const openCase = toOpenCaseFormat(cfPackage)

    expect(openCase.CFDocument.uri).toMatch(/^\/ims\/case\/v1p1\/CFDocuments\//)
    expect(openCase.CFItems?.[0].uri).toMatch(/^\/ims\/case\/v1p1\/CFItems\//)
  })

  it('resolves association origin/destination to the same uri each item reports for itself', () => {
    const cfPackage = frameworkToCfPackage({ framework: makeLocalFramework(), caseVersion: '1.1' })
    const openCase = toOpenCaseFormat(cfPackage)

    const items = openCase.CFItems ?? []
    const assoc = openCase.CFAssociations?.[0]
    const origin = items.find((i) => i.identifier === assoc?.originNodeURI.identifier)
    const dest = items.find((i) => i.identifier === assoc?.destinationNodeURI.identifier)

    expect(assoc?.originNodeURI.uri).toBe(origin?.uri)
    expect(assoc?.destinationNodeURI.uri).toBe(dest?.uri)
  })

  it('resolves an association referencing the framework/document itself (not another item) to the document\'s own id/uri', () => {
    const framework = makeMirroredFramework()
    framework.associations.set('assoc-doc' as AssociationId, {
      id: 'assoc-doc' as AssociationId,
      fromItemId: 'item-1' as ItemId,
      // References the framework's own id, not another item — CASE allows a
      // top-level item to be "isChildOf" the framework/document itself.
      toItemId: framework.id as unknown as ItemId,
      associationType: 'isChildOf',
    })

    const cfPackage = frameworkToCfPackage({ framework, caseVersion: '1.1' })
    const openCase = toOpenCaseFormat(cfPackage)

    const assoc = openCase.CFAssociations?.find((a) => a.identifier !== undefined && a.destinationNodeURI.identifier === openCase.CFDocument.identifier)
    expect(assoc?.destinationNodeURI.uri).toBe(openCase.CFDocument.uri)
  })

  it('preserves a mirrored association\'s own recorded node uri even when it disagrees with how this instance would otherwise reconstruct it', () => {
    // Some sources point a document-as-node reference at a `/CFItems/{id}`
    // path instead of `/CFDocuments/{id}` — whatever shape the source used,
    // it must round-trip byte-for-byte on an unmodified mirror, or every save
    // would look like a data change and spuriously fork it.
    const framework = makeMirroredFramework()
    const foreignDocAsNodeUri = 'https://source.example.org/ims/case/v1p1/CFItems/doc-abc'
    framework.associations.set('assoc-doc' as AssociationId, {
      id: 'assoc-doc' as AssociationId,
      fromItemId: 'item-1' as ItemId,
      toItemId: framework.id as unknown as ItemId,
      associationType: 'isChildOf',
      metadata: { destinationUri: foreignDocAsNodeUri },
    })

    const cfPackage = frameworkToCfPackage({ framework, caseVersion: '1.1' })
    const openCase = toOpenCaseFormat(cfPackage)

    expect(openCase.CFAssociations?.[0]?.destinationNodeURI.uri).toBe(foreignDocAsNodeUri)
  })

  it('produces a stable (idempotent) uri and identifier across repeated conversions of the same framework', () => {
    const framework = makeMirroredFramework()
    const first = toOpenCaseFormat(frameworkToCfPackage({ framework, caseVersion: '1.1' }))
    const second = toOpenCaseFormat(frameworkToCfPackage({ framework, caseVersion: '1.1' }))

    expect(second.CFDocument.uri).toBe(first.CFDocument.uri)
    expect(second.CFDocument.identifier).toBe(first.CFDocument.identifier)
    expect(second.CFItems?.[0].uri).toBe(first.CFItems?.[0].uri)
  })
})
