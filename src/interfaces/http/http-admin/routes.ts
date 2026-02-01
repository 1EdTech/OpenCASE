import type { Express, RequestHandler } from 'express'
import type { FrameworksController } from './controllers/FrameworksController'

export interface AdminDeps {
  frameworksController: FrameworksController
}

function withCaseVersion (caseVersion: '1.0' | '1.1', handler: RequestHandler): RequestHandler {
  return (req, res, next) => {
    // Treat query param as legacy; versioned routes set it explicitly.
    ;(req as any).query = { ...(req as any).query, caseVersion }
    return handler(req, res, next)
  }
}

/**
 * @openapi
 * /admin/tenants/{tenantId}/ims/case/v1p0/CFPackages:
 *   post:
 *     operationId: adminCreateCFPackageV1p0
 *     summary: Create/publish a CFPackage (non-CASE extension) (CASE v1p0)
 *     tags: [Admin]
 *     parameters:
 *       - { name: tenantId, in: path, required: true, schema: { type: string } }
 *     responses:
 *       200: { description: Unchanged }
 *       201: { description: Created/Published }
 *
 * /admin/tenants/{tenantId}/ims/case/v1p1/CFPackages:
 *   post:
 *     operationId: adminCreateCFPackageV1p1
 *     summary: Create/publish a CFPackage (non-CASE extension) (CASE v1p1)
 *     tags: [Admin]
 *     parameters:
 *       - { name: tenantId, in: path, required: true, schema: { type: string } }
 *     responses:
 *       200: { description: Unchanged }
 *       201: { description: Created/Published }
 *
 * /admin/tenants/{tenantId}/ims/case/v1p0/CFPackages/import:
 *   post:
 *     operationId: adminImportCFPackageV1p0
 *     summary: Import a CFPackage from endpoint (non-CASE extension) (CASE v1p0)
 *     tags: [Admin]
 *     parameters:
 *       - { name: tenantId, in: path, required: true, schema: { type: string } }
 *     responses:
 *       201: { description: Imported }
 *
 * /admin/tenants/{tenantId}/ims/case/v1p1/CFPackages/import:
 *   post:
 *     operationId: adminImportCFPackageV1p1
 *     summary: Import a CFPackage from endpoint (non-CASE extension) (CASE v1p1)
 *     tags: [Admin]
 *     parameters:
 *       - { name: tenantId, in: path, required: true, schema: { type: string } }
 *     responses:
 *       201: { description: Imported }
 *
 * /admin/tenants/{tenantId}/ims/case/v1p0/CFPackages/{id}:
 *   delete:
 *     operationId: adminDeleteCFPackageV1p0
 *     summary: Delete a CFPackage (non-CASE extension) (CASE v1p0)
 *     tags: [Admin]
 *     parameters:
 *       - { name: tenantId, in: path, required: true, schema: { type: string } }
 *       - { name: id, in: path, required: true, schema: { type: string, format: uuid } }
 *     responses:
 *       200: { description: Deleted }
 *
 * /admin/tenants/{tenantId}/ims/case/v1p1/CFPackages/{id}:
 *   delete:
 *     operationId: adminDeleteCFPackageV1p1
 *     summary: Delete a CFPackage (non-CASE extension) (CASE v1p1)
 *     tags: [Admin]
 *     parameters:
 *       - { name: tenantId, in: path, required: true, schema: { type: string } }
 *       - { name: id, in: path, required: true, schema: { type: string, format: uuid } }
 *     responses:
 *       200: { description: Deleted }
 */
export function registerAdminRoutes (app: Express, deps: AdminDeps): void {
  // Explicit CASE version in the path for mutation endpoints
  app.post(
    '/admin/tenants/:tenantId/ims/case/v1p0/CFPackages',
    withCaseVersion('1.0', deps.frameworksController.create as unknown as RequestHandler)
  )
  app.post(
    '/admin/tenants/:tenantId/ims/case/v1p1/CFPackages',
    withCaseVersion('1.1', deps.frameworksController.create as unknown as RequestHandler)
  )

  app.post(
    '/admin/tenants/:tenantId/ims/case/v1p0/CFPackages/import',
    withCaseVersion('1.0', deps.frameworksController.importFromEndpoint as unknown as RequestHandler)
  )
  app.post(
    '/admin/tenants/:tenantId/ims/case/v1p1/CFPackages/import',
    withCaseVersion('1.1', deps.frameworksController.importFromEndpoint as unknown as RequestHandler)
  )

  app.delete(
    '/admin/tenants/:tenantId/ims/case/v1p0/CFPackages/:id',
    withCaseVersion('1.0', deps.frameworksController.delete as unknown as RequestHandler)
  )
  app.delete(
    '/admin/tenants/:tenantId/ims/case/v1p1/CFPackages/:id',
    withCaseVersion('1.1', deps.frameworksController.delete as unknown as RequestHandler)
  )
}
