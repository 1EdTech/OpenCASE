/**
 * CFDocument adoptionStatus vocabulary.
 *
 * Based on the CASE Implementation Guide §4.2 recommendations.
 * The spec doesn't mandate a fixed vocabulary, but these are the
 * agreed best-practice values. Imported frameworks may carry other
 * values, which the editor preserves as free text.
 */

export type AdoptionStatusOption = {
  /** The canonical value stored in the framework */
  value: string
  /** Short UI label (same as value for the recommended set) */
  label: string
  /** Explanatory description for tooltips / help text */
  description: string
}

/**
 * Recommended adoption status values per the CASE Implementation Guide §4.2.
 */
export const ADOPTION_STATUS_OPTIONS: readonly AdoptionStatusOption[] = [
  {
    value: 'Draft',
    label: 'Draft',
    description:
      'The framework and its competencies are still being actively authored and should not yet be considered definitive.',
  },
  {
    value: 'Pending Implementation',
    label: 'Pending Implementation',
    description:
      'Authoring is complete and officially approved, but constituents are not yet governed by this framework\u2019s competencies.',
  },
  {
    value: 'Implemented',
    label: 'Implemented',
    description:
      'Authoring is complete and officially approved, and constituents are currently governed by this framework\u2019s competencies. Replaces the legacy "Adopted" value.',
  },
  {
    value: 'Retired',
    label: 'Retired',
    description:
      'The competencies represented by this framework are no longer being implemented. Replaces the legacy "Deprecated" value.',
  },
] as const

/** Just the canonical string values */
export const ADOPTION_STATUS_VALUES = ADOPTION_STATUS_OPTIONS.map((o) => o.value)

/**
 * Map legacy CASE 1.0 values to their modern equivalents.
 *
 * Per the implementation guide:
 *   - "Adopted"    → "Implemented"
 *   - "Deprecated" → "Retired"
 */
export const LEGACY_STATUS_MAP: Readonly<Record<string, string>> = {
  Adopted: 'Implemented',
  Deprecated: 'Retired',
}

/**
 * Normalise an adoption status value:
 *  1. Map known legacy values to their modern equivalents.
 *  2. Leave all other values (including custom / imported) unchanged.
 */
export function normalizeAdoptionStatus(raw: string | undefined): string | undefined {
  if (!raw) return raw
  return LEGACY_STATUS_MAP[raw] ?? raw
}
