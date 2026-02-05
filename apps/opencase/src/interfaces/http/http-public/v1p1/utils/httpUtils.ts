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
 * Normalize outgoing payloads so any CASE `uri` fields (and LinkData `.uri`) are absolute.
 * We only rewrite known relative CASE paths to avoid mangling external URLs.
 * Also handles URN Case URIs as defense-in-depth (though they should be transformed on input).
 */
export function absolutizeCaseUris<T> (payload: T, baseUrl: string, caseVersion: CaseVersion = '1.1'): T {
  const seen = new WeakSet<object>()

  const walk = (value: any): any => {
    if (!value) return value
    if (typeof value === 'string') {
      // Handle URN Case URIs (defense-in-depth - should already be transformed on input)
      if (UrnCaseUriHelper.isUrnCaseUri(value)) {
        const relativePath = UrnCaseUriHelper.urnCaseToRelativePath(value, caseVersion)
        // If parsing failed, relativePath will be the original URN - don't absolutize it
        if (UrnCaseUriHelper.isUrnCaseUri(relativePath)) {
          return value // Return original URN as-is if we can't parse it
        }
        return `${baseUrl}${relativePath}`
      }
      // Handle relative CASE paths
      if (isRelativeCasePath(value)) {
        return `${baseUrl}${value}`
      }
      return value
    }
    if (typeof value !== 'object') return value
    if (seen.has(value)) return value
    seen.add(value)

    if (Array.isArray(value)) {
      return value.map(walk)
    }

    const out: any = {}
    for (const [k, v] of Object.entries(value)) {
      if (k === 'uri') {
        // Transform URN or relative path to absolute URL
        if (typeof v === 'string') {
          if (UrnCaseUriHelper.isUrnCaseUri(v)) {
            const relativePath = UrnCaseUriHelper.urnCaseToRelativePath(v, caseVersion)
            // If parsing failed, relativePath will be the original URN - don't absolutize it
            if (UrnCaseUriHelper.isUrnCaseUri(relativePath)) {
              out[k] = v // Return original URN as-is if we can't parse it
            } else {
              out[k] = `${baseUrl}${relativePath}`
            }
          } else if (isRelativeCasePath(v)) {
            out[k] = `${baseUrl}${v}`
          } else {
            out[k] = v
          }
        } else {
          out[k] = walk(v)
        }
      } else {
        out[k] = walk(v)
      }
    }
    return out
  }

  return walk(payload)
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

