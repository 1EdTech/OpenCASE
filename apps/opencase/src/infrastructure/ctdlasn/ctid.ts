import { randomUUID } from 'node:crypto'

/**
 * Generate a Credential Transparency Identifier (CTID): "ce-" followed by a
 * lowercase UUID, e.g. "ce-60f05674-961c-4482-8e6e-323e6a538994".
 *
 * OpenCASE mints CTIDs client-side and sends them to the Registry Assistant so
 * the framework and every competency have stable identifiers we control and can
 * persist for later updates.
 */
export function generateCtid (): string {
  return `ce-${randomUUID()}`
}

/** True if the value is already a well-formed CTID. */
export function isCtid (value: unknown): value is string {
  return typeof value === 'string' &&
    /^ce-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)
}
