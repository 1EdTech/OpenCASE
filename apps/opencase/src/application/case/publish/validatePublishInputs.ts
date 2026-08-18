/**
 * Fast, local pre-flight checks for Registry Assistant *required* fields — run
 * before a publish/preview job so users get instant feedback instead of waiting
 * minutes for RA to reject the payload. This is a cheap subset of RA's own
 * validation (the fields we know RA rejects on), NOT a replacement for it: a
 * payload that passes here can still surface further issues from RA's /format.
 */

export interface PublishValidationIssue {
  /** Stable machine code, e.g. 'framework_description_missing'. */
  code: string
  /** Human-readable, user-facing explanation. */
  message: string
  /** For per-item issues: how many items are affected. */
  count?: number
  /** A few human-readable identifiers (coding scheme / id) to help the user locate them. */
  samples?: string[]
}

export interface CaseInputsForValidation {
  CFDocument?: Record<string, any>
  CFItems?: Record<string, any>[]
}

const nonEmpty = (v: unknown): boolean => typeof v === 'string' && v.trim().length > 0
const MAX_SAMPLES = 5

/**
 * Return the blocking issues that would cause Registry Assistant to reject this
 * framework. Empty array = passes the checks we know about.
 */
export function validatePublishInputs (caseJson: CaseInputsForValidation): PublishValidationIssue[] {
  const issues: PublishValidationIssue[] = []
  const doc = caseJson.CFDocument ?? {}
  const items = caseJson.CFItems ?? []

  // RA requires a framework description (ceasn:description).
  if (!nonEmpty(doc.description)) {
    issues.push({
      code: 'framework_description_missing',
      message: 'The framework needs a description before it can be published to the Credential Registry.',
    })
  }

  // Every competency must carry statement text (ceasn:competencyText).
  const missingText = items.filter((i) => !nonEmpty(i.fullStatement))
  if (missingText.length) {
    const samples = missingText
      .map((i) => (nonEmpty(i.humanCodingScheme) ? String(i.humanCodingScheme) : String(i.identifier ?? i.sourcedId ?? '?')))
      .slice(0, MAX_SAMPLES)
    issues.push({
      code: 'competency_text_missing',
      message: `${missingText.length} competenc${missingText.length === 1 ? 'y has' : 'ies have'} no statement text, which the Credential Registry requires.`,
      count: missingText.length,
      samples,
    })
  }

  return issues
}
