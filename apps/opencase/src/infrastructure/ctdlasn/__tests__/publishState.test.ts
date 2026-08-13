import { buildPublishCtids, envelopeIdFor, applyPublishResult, carryForwardPublishState, extractEnvelopeId, registryResourceUrl } from '../publishState'

const basePkg = () => ({
  CFDocument: { identifier: 'doc-1', title: 'FW' } as Record<string, any>,
  CFItems: [{ identifier: 'item-1', fullStatement: 'A' }, { identifier: 'item-2', fullStatement: 'B' }] as Record<string, any>[],
})

describe('buildPublishCtids', () => {
  it('mints ce-<uuid> CTIDs for a never-published framework', () => {
    const { frameworkCtid, ctidFor } = buildPublishCtids(basePkg())
    expect(frameworkCtid).toMatch(/^ce-[0-9a-f-]{36}$/)
    expect(ctidFor('item-1')).toMatch(/^ce-/)
    expect(ctidFor('item-1')).toBe(ctidFor('item-1')) // stable within a call
    expect(ctidFor('item-1')).not.toBe(ctidFor('item-2'))
  })

  it('reuses CTIDs already persisted under ext:opencase.published.ctid', () => {
    const pkg = basePkg()
    pkg.CFDocument.extensions = { 'ext:opencase': { published: { ctid: 'ce-fw-existing' } } }
    pkg.CFItems[0].extensions = { 'ext:opencase': { published: { ctid: 'ce-item1-existing' } } }
    const { frameworkCtid, ctidFor } = buildPublishCtids(pkg)
    expect(frameworkCtid).toBe('ce-fw-existing')
    expect(ctidFor('item-1')).toBe('ce-item1-existing')
    expect(ctidFor('item-2')).toMatch(/^ce-/) // item-2 had none → minted
  })
})

describe('envelopeIdFor', () => {
  it('returns the recorded envelope per environment, else undefined', () => {
    const pkg = basePkg()
    pkg.CFDocument.extensions = { 'ext:opencase': { published: { byEnvironment: { sandbox: { registryEnvelopeId: 'env-sb' } } } } }
    expect(envelopeIdFor(pkg, 'sandbox')).toBe('env-sb')
    expect(envelopeIdFor(pkg, 'production')).toBeUndefined()
  })
})

describe('applyPublishResult', () => {
  it('writes CTIDs on every node and the envelope under the environment; round-trips for update', () => {
    const pkg = basePkg()
    const { ctidFor, frameworkCtid } = buildPublishCtids(pkg)
    const updated = applyPublishResult(pkg, { ctidFor, environment: 'sandbox', registryEnvelopeId: 'env-1', publishedAt: '2026-08-12T00:00:00Z' })

    const docPub = (updated.CFDocument.extensions as any)['ext:opencase'].published
    expect(docPub.ctid).toBe(frameworkCtid)
    expect(docPub.byEnvironment.sandbox).toEqual({ registryEnvelopeId: 'env-1', publishedAt: '2026-08-12T00:00:00Z' })
    expect((updated.CFItems[0].extensions as any)['ext:opencase'].published.ctid).toBe(ctidFor('item-1'))

    // Feeding the updated package back reuses the same identity → a subsequent publish updates.
    const reload = { CFDocument: updated.CFDocument, CFItems: updated.CFItems }
    expect(buildPublishCtids(reload).frameworkCtid).toBe(frameworkCtid)
    expect(envelopeIdFor(reload, 'sandbox')).toBe('env-1')

    // A different environment is independent.
    const updated2 = applyPublishResult(reload, { ctidFor: buildPublishCtids(reload).ctidFor, environment: 'production', registryEnvelopeId: 'env-prod', publishedAt: '2026-08-12T01:00:00Z' })
    const pub2 = (updated2.CFDocument.extensions as any)['ext:opencase'].published
    expect(pub2.byEnvironment.sandbox.registryEnvelopeId).toBe('env-1')   // preserved
    expect(pub2.byEnvironment.production.registryEnvelopeId).toBe('env-prod')
  })
})

describe('carryForwardPublishState', () => {
  const pub = (ctid: string, extra: Record<string, any> = {}) => ({ extensions: { 'ext:opencase': { published: { ctid, ...extra } } } })

  it('copies the prior published block onto a save that dropped it (doc + items by id)', () => {
    const prior = {
      CFDocument: { identifier: 'doc-1', ...pub('ce-fw', { byEnvironment: { sandbox: { registryEnvelopeId: 'env-1' } } }) },
      CFItems: [{ identifier: 'item-1', ...pub('ce-i1') }, { identifier: 'item-2', ...pub('ce-i2') }],
    }
    // Editor save: same nodes, no published block, plus a brand-new item.
    const incoming = {
      CFDocument: { identifier: 'doc-1', title: 'FW' },
      CFItems: [{ identifier: 'item-1' }, { identifier: 'item-2' }, { identifier: 'item-3-new' }],
    }
    const merged = carryForwardPublishState(incoming, prior)

    expect(buildPublishCtids(merged).frameworkCtid).toBe('ce-fw')
    expect(envelopeIdFor(merged, 'sandbox')).toBe('env-1')
    const ctids = merged.CFItems!.map((i) => (i.extensions as any)?.['ext:opencase']?.published?.ctid)
    expect(ctids[0]).toBe('ce-i1')
    expect(ctids[1]).toBe('ce-i2')
    expect(ctids[2]).toBeUndefined() // new item keeps none → publish mints a fresh CTID
    expect((merged.CFDocument as any).title).toBe('FW') // other fields preserved
  })

  it('never overwrites a published block the incoming save already carries', () => {
    const prior = { CFDocument: { identifier: 'doc-1', ...pub('ce-old') }, CFItems: [] }
    const incoming = { CFDocument: { identifier: 'doc-1', ...pub('ce-new') }, CFItems: [] }
    const merged = carryForwardPublishState(incoming, prior)
    expect((merged.CFDocument as any).extensions['ext:opencase'].published.ctid).toBe('ce-new')
  })

  it('returns the incoming save unchanged when there is no prior version', () => {
    const incoming = { CFDocument: { identifier: 'doc-1' }, CFItems: [{ identifier: 'item-1' }] }
    expect(carryForwardPublishState(incoming, null)).toBe(incoming)
  })
})

describe('extractEnvelopeId', () => {
  it('reads common Registry Assistant response fields', () => {
    expect(extractEnvelopeId({ RegistryEnvelopeIdentifier: 'a' })).toBe('a')
    expect(extractEnvelopeId({ RegistryEnvelopeId: 'b' })).toBe('b')
    expect(extractEnvelopeId({ Successful: true })).toBeUndefined()
  })
})

describe('registryResourceUrl', () => {
  it('points at the registry host per environment', () => {
    expect(registryResourceUrl('sandbox', 'ce-x')).toBe('https://sandbox.credentialengineregistry.org/resources/ce-x')
    expect(registryResourceUrl('production', 'ce-x')).toBe('https://credentialengineregistry.org/resources/ce-x')
  })
})
