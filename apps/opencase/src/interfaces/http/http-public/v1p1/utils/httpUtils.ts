import type { Request, Response } from 'express'
import crypto from 'node:crypto'

import { StatusInfoFormatter } from '../../../../../infrastructure/http/StatusInfoFormatter'
import { UrnCaseUriHelper } from '../../../../../domain/case/value-objects/LinkData'
import { CaseVersion } from '../../../../../domain/case/value-objects/Identifiers'

export type OrderBy = 'asc' | 'desc'

export interface CaseQueryParams {
  limit?: number
  offset?: number
  sort?: string
  orderBy?: OrderBy
  filter?: string
  fields?: string[]
}

export function parseCaseQueryParams (req: Request): { ok: true, value: CaseQueryParams } | { ok: false, status: number, body: any } {
  const limit = req.query.limit !== undefined ? parseInt(String(req.query.limit), 10) : undefined
  const offset = req.query.offset !== undefined ? parseInt(String(req.query.offset), 10) : undefined
  const sort = req.query.sort !== undefined ? String(req.query.sort) : undefined
  const orderByRaw = req.query.orderBy !== undefined ? String(req.query.orderBy) : undefined
  const filter = req.query.filter !== undefined ? String(req.query.filter) : undefined
  const fields = req.query.fields !== undefined ? String(req.query.fields).split(',').map(s => s.trim()).filter(Boolean) : undefined

  if (limit !== undefined && (Number.isNaN(limit) || limit < 1)) {
    return { ok: false, status: 400, body: StatusInfoFormatter.invalidSelectionField('Invalid limit parameter.') }
  }
  if (offset !== undefined && (Number.isNaN(offset) || offset < 0)) {
    return { ok: false, status: 400, body: StatusInfoFormatter.invalidSelectionField('Invalid offset parameter.') }
  }
  if (orderByRaw !== undefined && orderByRaw !== 'asc' && orderByRaw !== 'desc') {
    return { ok: false, status: 400, body: StatusInfoFormatter.invalidSelectionField('Invalid orderBy parameter. Must be "asc" or "desc".') }
  }

  return {
    ok: true,
    value: {
      limit,
      offset,
      sort,
      orderBy: orderByRaw as OrderBy | undefined,
      filter,
      fields
    }
  }
}

export function getBaseUrl (req: Request): string {
  // Prefer forwarded headers (common behind proxies), fallback to Express values.
  const xfProto = req.header('x-forwarded-proto')
  const xfHost = req.header('x-forwarded-host')
  const proto = (xfProto ? xfProto.split(',')[0].trim() : req.protocol) || 'http'
  const host = (xfHost ? xfHost.split(',')[0].trim() : req.get('host')) || 'localhost'
  return `${proto}://${host}`
}

function isRelativeCasePath (uri: unknown): uri is string {
  return typeof uri === 'string' && uri.startsWith('/ims/case/')
}

/**
 * Check if a string is an absolute CASE URI (e.g. http://host/ims/case/v1p1/...).
 */
function isAbsoluteCaseUri (uri: unknown): uri is string {
  return typeof uri === 'string' && /https?:\/\/[^/]+\/ims\/case\/v1p[01]\//.test(uri)
}

/**
 * Normalize the version segment in a CASE path (relative or absolute) to match the target caseVersion.
 * e.g. '/ims/case/v1p1/CFItems/abc' → '/ims/case/v1p0/CFItems/abc' when caseVersion is '1.0'
 * e.g. 'http://host/ims/case/v1p1/CFItems/abc' → 'http://host/ims/case/v1p0/CFItems/abc'
 */
function normalizeCaseVersionInPath (path: string, caseVersion: CaseVersion): string {
  const targetSegment = caseVersion === '1.0' ? 'v1p0' : 'v1p1'
  return path.replace(/\/ims\/case\/v1p[01]\//, `/ims/case/${targetSegment}/`)
}

/**
 * Normalize outgoing payloads so any CASE `uri` fields (and LinkData `.uri`) are absolute.
 * We only rewrite known relative CASE paths to avoid mangling external URLs.
 * Also handles URN Case URIs as defense-in-depth (though they should be transformed on input).
 * When the stored data's version differs from the target caseVersion, URI version segments
 * are normalized (e.g. v1p1 → v1p0) before absolutizing.
 */
export function absolutizeCaseUris<T> (payload: T, baseUrl: string, caseVersion: CaseVersion = '1.1'): T {
  const seen = new WeakSet<object>()

  /** Normalize a single string URI: absolutize relative paths, rewrite URNs, and
   *  normalize the version segment in both relative and already-absolute CASE URIs. */
  const normalizeUri = (v: string): string => {
    // Handle URN Case URIs (defense-in-depth - should already be transformed on input)
    if (UrnCaseUriHelper.isUrnCaseUri(v)) {
      const relativePath = UrnCaseUriHelper.urnCaseToRelativePath(v, caseVersion)
      if (UrnCaseUriHelper.isUrnCaseUri(relativePath)) return v // parsing failed
      return `${baseUrl}${relativePath}`
    }
    // Handle relative CASE paths — normalize version segment before absolutizing
    if (isRelativeCasePath(v)) {
      return `${baseUrl}${normalizeCaseVersionInPath(v, caseVersion)}`
    }
    // Handle already-absolute CASE URIs — normalize the version segment in-place
    if (isAbsoluteCaseUri(v)) {
      return normalizeCaseVersionInPath(v, caseVersion)
    }
    return v
  }

  const walk = (value: any): any => {
    if (!value) return value
    if (typeof value === 'string') return normalizeUri(value)
    if (typeof value !== 'object') return value
    if (seen.has(value)) return value
    seen.add(value)

    if (Array.isArray(value)) {
      return value.map(walk)
    }

    const out: any = {}
    for (const [k, v] of Object.entries(value)) {
      if (k === 'uri') {
        out[k] = typeof v === 'string' ? normalizeUri(v) : walk(v)
      } else {
        out[k] = walk(v)
      }
    }
    return out
  }

  return walk(payload)
}

/**
 * Strip all `extensions` properties from a CFPackage response.
 * OpenCASE extensions are proprietary and should only be included
 * when the client explicitly requests them via the X-CASE-EDITOR header.
 */
export function stripExtensions<T> (payload: T): T {
  if (!payload || typeof payload !== 'object') return payload

  const walk = (value: any): any => {
    if (!value || typeof value !== 'object') return value
    if (Array.isArray(value)) return value.map(walk)

    const out: any = {}
    for (const [k, v] of Object.entries(value)) {
      if (k === 'extensions') continue
      out[k] = walk(v)
    }
    return out
  }

  return walk(payload)
}

/**
 * Check whether the request includes the X-CASE-EDITOR header,
 * indicating the client wants OpenCASE-specific extensions.
 */
export function wantsOpenCaseExtensions (req: Request): boolean {
  return req.header('X-CASE-EDITOR') !== undefined
}

export function applyFieldSelectionToEntity (entity: Record<string, any>, fields?: string[]): Record<string, any> {
  if (!fields || fields.length === 0) return entity
  const filtered: Record<string, any> = {}
  for (const f of fields) {
    if (entity[f] !== undefined) filtered[f] = entity[f]
  }
  return filtered
}

export function applyQueryToArray<T extends Record<string, any>> (
  items: T[],
  q: CaseQueryParams
): { ok: true, items: Array<Record<string, any>> } | { ok: false, status: number, body: any } {
  let out: Array<Record<string, any>> = items

  if (q.filter) {
    const needle = q.filter.toLowerCase()
    out = out.filter(it => {
      try {
        return JSON.stringify(it).toLowerCase().includes(needle)
      } catch {
        return false
      }
    })
  }

  if (q.sort) {
    const key = q.sort
    // Validate sort field exists on at least one item.
    const hasField = out.some(it => it != null && Object.prototype.hasOwnProperty.call(it, key))
    if (!hasField) {
      return { ok: false, status: 400, body: StatusInfoFormatter.error('invalid_sort_field', `An invalid sort field was supplied: '${key}'.`) }
    }
    const dir = q.orderBy ?? 'asc'
    out = [...out].sort((a, b) => {
      const av = (a as any)[key]
      const bv = (b as any)[key]
      if (av === bv) return 0
      if (av === undefined) return 1
      if (bv === undefined) return -1
      return av < bv ? (dir === 'asc' ? -1 : 1) : (dir === 'asc' ? 1 : -1)
    })
  }

  const offset = q.offset ?? 0
  const limit = q.limit
  out = limit !== undefined ? out.slice(offset, offset + limit) : out.slice(offset)

  if (q.fields && q.fields.length > 0) {
    out = out.map(it => applyFieldSelectionToEntity(it, q.fields) as T)
  }

  return { ok: true, items: out }
}

export function setEtagAndHandleNotModified (req: Request, res: Response, body: unknown): boolean {
  // returns true if response was ended (304)
  const json = JSON.stringify(body)
  const hash = crypto.createHash('sha256').update(json).digest('base64')
  const etag = `"${hash}"`
  res.setHeader('ETag', etag)
  const inm = req.header('if-none-match')
  if (inm && inm === etag) {
    res.status(304).end()
    return true
  }
  return false
}

