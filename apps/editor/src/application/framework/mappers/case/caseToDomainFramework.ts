import type { CasePackageSnapshot } from './CasePackageSnapshot'
import type { Framework, FrameworkMetadata, Item, Association, AssociationType, ItemType } from '@/domain/framework/model/types'
import type { FrameworkId, ItemId, AssociationId } from '@/domain/shared/types'
import { normalizeAdoptionStatus } from '@/domain/framework/model/adoptionStatus'

function mapItemType(rawType?: string): ItemType {
  const raw = (rawType ?? '').toLowerCase()
  if (raw.includes('skill')) return 'Skill'
  if (raw.includes('learning') || raw.includes('outcome')) return 'LearningOutcome'
  if (raw.includes('standard')) return 'Standard'
  if (raw.includes('compet')) return 'Competency'
  return 'Competency'
}

function mapAssociationType(rawType?: string): AssociationType {
  // Preserve the original association type - CASE has many valid types
  // Only normalize casing for known types, pass through others as-is
  const t = (rawType ?? '').toLowerCase()
  
  // Map known types to canonical casing
  const knownTypes: Record<string, AssociationType> = {
    'ischildof': 'isChildOf',
    'ispartof': 'isPartOf',
    'isrelatedto': 'isRelatedTo',
    'precedes': 'precedes',
    'ispeerof': 'isPeerOf',
    'exactmatchof': 'exactMatchOf',
    'replacedby': 'replacedBy',
    'haspart': 'hasPart',
    'exemplar': 'exemplar',
    'hasskillevel': 'hasSkillLevel',
  }
  
  return knownTypes[t] ?? (rawType as AssociationType) ?? 'isRelatedTo'
}

export function mapCaseSnapshotToDomainFramework(snapshot: CasePackageSnapshot): Framework {
  const doc = snapshot.document
  const id = doc.identifier as unknown as FrameworkId
  const metadata: FrameworkMetadata = {
    title: doc.title,
    description: doc.description,
    creator: doc.creator,
    frameworkType: doc.frameworkType,
    adoptionStatus: normalizeAdoptionStatus(doc.adoptionStatus) ?? doc.adoptionStatus,
    caseVersion: doc.caseVersion ?? (snapshot.version === 'unknown' ? undefined : snapshot.version),
    lastChangeDateTime: doc.lastChangeDateTime,
    licenseURI: doc.licenseURI,
  }

  const items: Framework['items'] = new Map()
  for (const it of snapshot.items) {
    const item: Item = {
      id: it.identifier as unknown as ItemId,
      statement: it.fullStatement,
      type: mapItemType(it.CFItemType),
      metadata: {
        abbreviatedStatement: it.abbreviatedStatement,
        alternativeLabel: it.alternativeLabel,
        humanCodingScheme: it.humanCodingScheme,
        CFItemType: it.CFItemType,
        CFItemTypeURI: it.CFItemTypeURI,
        subject: it.subject,
        subjectURI: it.subjectURI,
        educationLevel: it.educationLevel,
        conceptKeywords: it.conceptKeywords,
        conceptKeywordsURI: it.conceptKeywordsURI,
        notes: it.notes,
        caseUri: it.uri,
        lastChangeDateTime: it.lastChangeDateTime,
        ...it.extensions,
      },
    }
    items.set(item.id, item)
  }

  const associations: Framework['associations'] = new Map()
  for (const a of snapshot.associations) {
    const fromId = a.originIdentifier
    const toId = a.destinationIdentifier
    if (!fromId || !toId) continue
    const assoc: Association = {
      id: a.identifier as unknown as AssociationId,
      fromItemId: fromId as unknown as ItemId,
      toItemId: toId as unknown as ItemId,
      associationType: mapAssociationType(a.associationType),
      metadata: {
        originUri: a.originUri,
        destinationUri: a.destinationUri,
        sequenceNumber: a.sequenceNumber,
        CFAssociationGroupingIdentifier: a.CFAssociationGroupingIdentifier,
        CFAssociationGroupingTitle: a.CFAssociationGroupingTitle,
        ...a.extensions,
      },
    }
    associations.set(assoc.id, assoc)
  }

  return {
    id,
    metadata,
    items,
    associations,
    status: 'Published',
  }
}

