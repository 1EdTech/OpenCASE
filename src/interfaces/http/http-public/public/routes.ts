import type { Express } from 'express'
import type { TenantLookupController } from './controllers/TenantLookupController'

export interface PublicDeps {
  tenantLookupController: TenantLookupController
}

/**
 * @openapi
 * /public/tenant-lookup:
 *   get:
 *     operationId: publicTenantLookup
 *     summary: Tenant lookup by email (anti-enumeration; always 202)
 *     description: |
 *       Used by SPAs to discover a tenantId for Keycloak client-per-tenant login.
 *       Always responds with 202 Accepted. The response body may include tenantId if a mapping exists.
 *     tags: [Public]
 *     security: []
 *     parameters:
 *       - { name: email, in: query, required: true, schema: { type: string, format: email } }
 *     responses:
 *       202: { description: Accepted }
 */
export function registerPublicRoutes (app: Express, deps: PublicDeps): void {
  app.get('/public/tenant-lookup', deps.tenantLookupController.lookup)
}

