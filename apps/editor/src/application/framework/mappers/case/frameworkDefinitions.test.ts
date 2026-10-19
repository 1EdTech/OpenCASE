import { describe, it, expect } from 'vitest'
import { frameworkToCfPackage } from './toCasePackage'
import { extractCfDefinitions, preferFrameworkDefinitions, type DefinitionLists } from './frameworkDefinitions'
import { loadFrameworkFromCfPackage } from '@/application/framework/services/FrameworkLoader'
import { toReactFlowGraph } from '@/ui/editor/reactflow/mapping/toReactFlow'
import { fromEditorGraph } from '@/ui/editor/reactflow/mapping/fromEditorGraph'
import type { CFItemType, CFPackage, CFSubject } from '@/domain/case/types'

const DOC_ID = 'sc-doc'

const scStandard: CFItemType = {
  identifier: 'sc-standard',
  uri: '/ims/case/v1p1/CFItemTypes/sc-standard',
  title: 'Standard',
  description: 'SC standard',
  hierarchyCode: '1',
  lastChangeDateTime: '2026-01-01T00:00:00.000Z',
  extensions: { scTypeCode: 'STD' },
}

// Another framework's definitions with the same titles, as found in the tenant
// catalogue — including invalid data (integer hierarchyCode, as in the WIDA package).
const widaStandard = {
  identifier: 'wida-standard',
  uri: '/ims/case/v1p1/CFItemTypes/wida-standard',
  title: 'Standard',
  description: 'WIDA standard',
  hierarchyCode: 1,
  lastChangeDateTime: '2026-01-01T00:00:00.000Z',
} as unknown as CFItemType
const widaComponent = { ...widaStandard, identifier: 'wida-component', uri: '/ims/case/v1p1/CFItemTypes/wida-component', title: 'Component' } as CFItemType
const widaMath: CFSubject = { identifier: 'wida-math', uri: '/ims/case/v1p1/CFSubjects/wida-math', title: 'Math' }

function emptyTenant(): DefinitionLists {
  return { cfItemTypes: [], cfSubjects: [], cfConcepts: [], cfLicenses: [], cfAssociationGroupings: [] }
}

function tenantWithWida(): DefinitionLists {
  // The tenant copy of sc-standard lost its extensions — what the old
  // first-copy-wins catalogue could hand back for a shared identifier.
  const { extensions: _dropped, ...scStandardWithoutExtensions } = scStandard
  return {
    ...emptyTenant(),
    cfItemTypes: [widaStandard, widaComponent, scStandardWithoutExtensions],
    cfSubjects: [widaMath],
  }
}

// SC: one item links to its own "Standard" type by URI; another names "Component"
// and a subject by string only (spec-valid, but not a link to any definition).
function makeScPackage(): CFPackage {
  return {
    CFDocument: {
      identifier: DOC_ID,
      uri: `/ims/case/v1p1/CFDocuments/${DOC_ID}`,
      title: 'SC Standards',
      creator: 'SC',
      lastChangeDateTime: '2026-01-01T00:00:00.000Z',
      caseVersion: '1.1',
    },
    CFItems: [
      {
        identifier: 'item-linked',
        uri: '/ims/case/v1p1/CFItems/item-linked',
        fullStatement: 'Linked',
        CFItemType: 'Standard',
        CFItemTypeURI: { title: 'Standard', identifier: scStandard.identifier, uri: scStandard.uri },
        lastChangeDateTime: '2026-01-01T00:00:00.000Z',
      },
      {
        identifier: 'item-title-only',
        uri: '/ims/case/v1p1/CFItems/item-title-only',
        fullStatement: 'Title only',
        CFItemType: 'Component',
        subject: ['Math'],
        lastChangeDateTime: '2026-01-01T00:00:00.000Z',
      },
    ],
    CFAssociations: [
      {
        identifier: 'assoc-1',
        uri: '/ims/case/v1p1/CFAssociations/assoc-1',
        associationType: 'isChildOf',
        originNodeURI: { identifier: 'item-linked', uri: '/ims/case/v1p1/CFItems/item-linked', title: 'Linked' },
        destinationNodeURI: { identifier: DOC_ID, uri: `/ims/case/v1p1/CFDocuments/${DOC_ID}`, title: 'SC Standards' },
        lastChangeDateTime: '2026-01-01T00:00:00.000Z',
      },
      {
        identifier: 'assoc-2',
        uri: '/ims/case/v1p1/CFAssociations/assoc-2',
        associationType: 'isChildOf',
        originNodeURI: { identifier: 'item-title-only', uri: '/ims/case/v1p1/CFItems/item-title-only', title: 'Title only' },
        destinationNodeURI: { identifier: 'item-linked', uri: '/ims/case/v1p1/CFItems/item-linked', title: 'Linked' },
        lastChangeDateTime: '2026-01-01T00:00:00.000Z',
      },
    ],
    CFDefinitions: {
      CFItemTypes: [scStandard],
      extensions: { definitionsSource: 'sc-sync' },
    },
  } as unknown as CFPackage
}

// Open the package in the editor and save it again, the way App + EditorCanvas do.
function openAndSave(pkg: CFPackage, tenant: DefinitionLists) {
  const own = extractCfDefinitions(pkg)
  const loaded = loadFrameworkFromCfPackage(pkg)
  if (!loaded) throw new Error('failed to load framework')
  const { framework, layout } = fromEditorGraph({ graph: toReactFlowGraph({ framework: loaded }) })
  return frameworkToCfPackage({
    framework,
    layout,
    caseVersion: '1.1',
    ...preferFrameworkDefinitions(own, tenant),
    definitionsExtensions: own?.extensions,
  })
}

describe('CFDefinitions on save', () => {
  it("does not pull in another framework's definitions that share a title", () => {
    const saved = openAndSave(makeScPackage(), tenantWithWida())

    expect(saved.CFDefinitions?.CFItemTypes?.map((t) => t.identifier)).toEqual(['sc-standard'])
    expect(saved.CFDefinitions?.CFSubjects).toBeUndefined()
  })

  it('keeps title-only types and subjects as plain strings', () => {
    const saved = openAndSave(makeScPackage(), tenantWithWida())
    const item = saved.CFItems?.find((i) => i.identifier === 'item-title-only')

    expect(item?.CFItemType).toBe('Component')
    expect(item?.CFItemTypeURI).toBeUndefined()
    expect(item?.subject).toEqual(['Math'])
    expect(item?.subjectURI).toBeUndefined()
  })

  it("uses the framework's own copy of a definition over the tenant copy, keeping its extensions", () => {
    const saved = openAndSave(makeScPackage(), tenantWithWida())

    expect(saved.CFDefinitions?.CFItemTypes).toEqual([scStandard])
  })

  it('carries the CFDefinitions-level extensions through unchanged', () => {
    const saved = openAndSave(makeScPackage(), tenantWithWida())

    expect(saved.CFDefinitions?.extensions).toEqual({ definitionsSource: 'sc-sync' })
  })

  it('keeps CFDefinitions-level extensions even when no definitions are referenced', () => {
    const pkg = makeScPackage()
    pkg.CFItems = pkg.CFItems?.map(({ CFItemTypeURI: _unlinked, ...item }) => item)

    const saved = openAndSave(pkg, tenantWithWida())

    expect(saved.CFDefinitions).toEqual({ extensions: { definitionsSource: 'sc-sync' } })
  })

  it('still includes a tenant definition the framework links to but does not own', () => {
    const pkg = makeScPackage()
    pkg.CFItems = pkg.CFItems?.map((item) => item.identifier === 'item-title-only'
      ? { ...item, CFItemTypeURI: { title: 'Component', identifier: widaComponent.identifier, uri: widaComponent.uri } }
      : item)

    const saved = openAndSave(pkg, tenantWithWida())

    expect(saved.CFDefinitions?.CFItemTypes?.map((t) => t.identifier)).toEqual(['sc-standard', 'wida-component'])
  })
})

describe('preferFrameworkDefinitions', () => {
  it("puts the framework's own definitions first so a title lookup finds them before the tenant's", () => {
    const lists = preferFrameworkDefinitions({ CFItemTypes: [scStandard] }, tenantWithWida())

    expect(lists.cfItemTypes.find((t) => t.title === 'Standard')).toBe(scStandard)
    expect(lists.cfItemTypes.map((t) => t.identifier)).toEqual(['sc-standard', 'wida-standard', 'wida-component'])
  })

  it('returns the tenant lists unchanged when the framework has no definitions', () => {
    const tenant = tenantWithWida()

    expect(preferFrameworkDefinitions(undefined, tenant)).toEqual(tenant)
  })
})
