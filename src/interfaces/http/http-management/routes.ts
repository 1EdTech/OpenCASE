import type { Express, RequestHandler } from 'express'
import type { CFDocumentsManagementController } from './controllers/CFDocumentsManagementController'
import type { CFItemsManagementController } from './controllers/CFItemsManagementController'
import type { CFAssociationsManagementController } from './controllers/CFAssociationsManagementController'
import type { FrameworksManagementController } from './controllers/FrameworksManagementController'
import type { TenantsManagementController } from './controllers/TenantsManagementController'
import { requireScope } from '../middleware/scope'

function withCaseVersion (caseVersion: '1.0' | '1.1', handler: RequestHandler): RequestHandler {
  return (req, res, next) => {
    // Treat query param as legacy; versioned routes set it explicitly.
    ;(req as any).query = { ...(req as any).query, caseVersion }
    return handler(req, res, next)
  }
}

/**
 * Management API Routes
 *
 * These endpoints provide UPDATE and DELETE operations for CASE entities.
 * These operations are NOT part of the CASE standard specification and are
 * provided as extended functionality for management purposes.
 *
 * All endpoints require authentication and are scoped to the authenticated tenant.
 * Tenant management endpoints require the 'case.admin' scope.
 */
export interface ManagementDeps {
  cfDocumentsController: CFDocumentsManagementController
  cfItemsController: CFItemsManagementController
  cfAssociationsController: CFAssociationsManagementController
  frameworksController: FrameworksManagementController
  tenantsController: TenantsManagementController
}

/**
 * @openapi
 * /management/tenants:
 *   get:
 *     operationId: listTenants
 *     summary: List all tenants (non-CASE extension)
 *     tags: [DefinitionsManager]
 *     security:
 *       - BearerAuth: []
 *     x-required-scopes: [case.admin]
 *     responses:
 *       200: { description: OK }
 *   post:
 *     operationId: createTenant
 *     summary: Create a tenant (non-CASE extension)
 *     tags: [DefinitionsManager]
 *     security:
 *       - BearerAuth: []
 *     x-required-scopes: [case.admin]
 *     responses:
 *       201: { description: Created }
 *
 * /management/tenants/{tenantId}/ims/case/v1p0/CFDocuments/{id}:
 *   put:
 *     operationId: updateCFDocumentV1p0
 *     summary: Update a CFDocument (non-CASE extension) (CASE v1p0)
 *     tags: [DocumentsManager]
 *     parameters:
 *       - { name: tenantId, in: path, required: true, schema: { type: string } }
 *       - { name: id, in: path, required: true, schema: { type: string, format: uuid } }
 *     responses:
 *       200: { description: Updated }
 *   delete:
 *     operationId: deleteCFDocumentV1p0
 *     summary: Delete a CFDocument (non-CASE extension) (CASE v1p0)
 *     tags: [DocumentsManager]
 *     parameters:
 *       - { name: tenantId, in: path, required: true, schema: { type: string } }
 *       - { name: id, in: path, required: true, schema: { type: string, format: uuid } }
 *     responses:
 *       200: { description: Deleted }
 *
 * /management/tenants/{tenantId}/ims/case/v1p1/CFDocuments/{id}:
 *   put:
 *     operationId: updateCFDocumentV1p1
 *     summary: Update a CFDocument (non-CASE extension) (CASE v1p1)
 *     tags: [DocumentsManager]
 *     parameters:
 *       - { name: tenantId, in: path, required: true, schema: { type: string } }
 *       - { name: id, in: path, required: true, schema: { type: string, format: uuid } }
 *     responses:
 *       200: { description: Updated }
 *   delete:
 *     operationId: deleteCFDocumentV1p1
 *     summary: Delete a CFDocument (non-CASE extension) (CASE v1p1)
 *     tags: [DocumentsManager]
 *     parameters:
 *       - { name: tenantId, in: path, required: true, schema: { type: string } }
 *       - { name: id, in: path, required: true, schema: { type: string, format: uuid } }
 *     responses:
 *       200: { description: Deleted }
 *
 * /management/tenants/{tenantId}/ims/case/v1p0/CFItems/{id}:
 *   put:
 *     operationId: updateCFItemV1p0
 *     summary: Update a CFItem (non-CASE extension) (CASE v1p0)
 *     tags: [ItemsManager]
 *     parameters:
 *       - { name: tenantId, in: path, required: true, schema: { type: string } }
 *       - { name: id, in: path, required: true, schema: { type: string, format: uuid } }
 *     responses:
 *       200: { description: Updated }
 *   delete:
 *     operationId: deleteCFItemV1p0
 *     summary: Delete a CFItem (non-CASE extension) (CASE v1p0)
 *     tags: [ItemsManager]
 *     parameters:
 *       - { name: tenantId, in: path, required: true, schema: { type: string } }
 *       - { name: id, in: path, required: true, schema: { type: string, format: uuid } }
 *     responses:
 *       200: { description: Deleted }
 *
 * /management/tenants/{tenantId}/ims/case/v1p1/CFItems/{id}:
 *   put:
 *     operationId: updateCFItemV1p1
 *     summary: Update a CFItem (non-CASE extension) (CASE v1p1)
 *     tags: [ItemsManager]
 *     parameters:
 *       - { name: tenantId, in: path, required: true, schema: { type: string } }
 *       - { name: id, in: path, required: true, schema: { type: string, format: uuid } }
 *     responses:
 *       200: { description: Updated }
 *   delete:
 *     operationId: deleteCFItemV1p1
 *     summary: Delete a CFItem (non-CASE extension) (CASE v1p1)
 *     tags: [ItemsManager]
 *     parameters:
 *       - { name: tenantId, in: path, required: true, schema: { type: string } }
 *       - { name: id, in: path, required: true, schema: { type: string, format: uuid } }
 *     responses:
 *       200: { description: Deleted }
 *
 * /management/tenants/{tenantId}/ims/case/v1p0/CFAssociations/{id}:
 *   put:
 *     operationId: updateCFAssociationV1p0
 *     summary: Update a CFAssociation (non-CASE extension) (CASE v1p0)
 *     tags: [AssociationsManager]
 *     parameters:
 *       - { name: tenantId, in: path, required: true, schema: { type: string } }
 *       - { name: id, in: path, required: true, schema: { type: string, format: uuid } }
 *     responses:
 *       200: { description: Updated }
 *   delete:
 *     operationId: deleteCFAssociationV1p0
 *     summary: Delete a CFAssociation (non-CASE extension) (CASE v1p0)
 *     tags: [AssociationsManager]
 *     parameters:
 *       - { name: tenantId, in: path, required: true, schema: { type: string } }
 *       - { name: id, in: path, required: true, schema: { type: string, format: uuid } }
 *     responses:
 *       200: { description: Deleted }
 *
 * /management/tenants/{tenantId}/ims/case/v1p1/CFAssociations/{id}:
 *   put:
 *     operationId: updateCFAssociationV1p1
 *     summary: Update a CFAssociation (non-CASE extension) (CASE v1p1)
 *     tags: [AssociationsManager]
 *     parameters:
 *       - { name: tenantId, in: path, required: true, schema: { type: string } }
 *       - { name: id, in: path, required: true, schema: { type: string, format: uuid } }
 *     responses:
 *       200: { description: Updated }
 *   delete:
 *     operationId: deleteCFAssociationV1p1
 *     summary: Delete a CFAssociation (non-CASE extension) (CASE v1p1)
 *     tags: [AssociationsManager]
 *     parameters:
 *       - { name: tenantId, in: path, required: true, schema: { type: string } }
 *       - { name: id, in: path, required: true, schema: { type: string, format: uuid } }
 *     responses:
 *       200: { description: Deleted }
 *
 * /management/tenants/{tenantId}/CFPackages:
 *   get:
 *     operationId: listCFPackages
 *     summary: List CFPackages for a tenant (non-CASE extension)
 *     tags: [PackagesManager]
 *     parameters:
 *       - { name: tenantId, in: path, required: true, schema: { type: string } }
 *       - { name: caseVersion, in: query, required: false, schema: { type: string, enum: [1.0, 1.1] } }
 *     responses:
 *       200: { description: OK }
 *
 * /management/tenants/{tenantId}/ims/case/v1p0/CFPackages/{id}:
 *   delete:
 *     operationId: deleteCFPackageV1p0
 *     summary: Delete a CFPackage for a tenant (non-CASE extension) (CASE v1p0)
 *     tags: [PackagesManager]
 *     parameters:
 *       - { name: tenantId, in: path, required: true, schema: { type: string } }
 *       - { name: id, in: path, required: true, schema: { type: string, format: uuid } }
 *     responses:
 *       200: { description: Deleted }
 *
 * /management/tenants/{tenantId}/ims/case/v1p1/CFPackages/{id}:
 *   delete:
 *     operationId: deleteCFPackageV1p1
 *     summary: Delete a CFPackage for a tenant (non-CASE extension) (CASE v1p1)
 *     tags: [PackagesManager]
 *     parameters:
 *       - { name: tenantId, in: path, required: true, schema: { type: string } }
 *       - { name: id, in: path, required: true, schema: { type: string, format: uuid } }
 *     responses:
 *       200: { description: Deleted }
 */
export function registerManagementRoutes (app: Express, deps: ManagementDeps): void {
  // CFDocument management endpoints
  app.put(
    '/management/tenants/:tenantId/CFDocuments/:id',
    deps.cfDocumentsController.update
  )
  app.delete(
    '/management/tenants/:tenantId/CFDocuments/:id',
    deps.cfDocumentsController.delete
  )

  // CFItem management endpoints
  app.put(
    '/management/tenants/:tenantId/CFItems/:id',
    deps.cfItemsController.update
  )
  app.delete(
    '/management/tenants/:tenantId/CFItems/:id',
    deps.cfItemsController.delete
  )

  // CFAssociation management endpoints
  app.put(
    '/management/tenants/:tenantId/CFAssociations/:id',
    deps.cfAssociationsController.update
  )
  app.delete(
    '/management/tenants/:tenantId/CFAssociations/:id',
    deps.cfAssociationsController.delete
  )

  // CFPackage listing endpoint (non-CASE extension)
  app.get(
    '/management/tenants/:tenantId/CFPackages',
    deps.frameworksController.list
  )

  // Preferred: explicit CASE version in the path for mutation endpoints
  app.put(
    '/management/tenants/:tenantId/ims/case/v1p0/CFDocuments/:id',
    withCaseVersion('1.0', deps.cfDocumentsController.update as unknown as RequestHandler)
  )
  app.delete(
    '/management/tenants/:tenantId/ims/case/v1p0/CFDocuments/:id',
    withCaseVersion('1.0', deps.cfDocumentsController.delete as unknown as RequestHandler)
  )
  app.put(
    '/management/tenants/:tenantId/ims/case/v1p1/CFDocuments/:id',
    withCaseVersion('1.1', deps.cfDocumentsController.update as unknown as RequestHandler)
  )
  app.delete(
    '/management/tenants/:tenantId/ims/case/v1p1/CFDocuments/:id',
    withCaseVersion('1.1', deps.cfDocumentsController.delete as unknown as RequestHandler)
  )

  app.put(
    '/management/tenants/:tenantId/ims/case/v1p0/CFItems/:id',
    withCaseVersion('1.0', deps.cfItemsController.update as unknown as RequestHandler)
  )
  app.delete(
    '/management/tenants/:tenantId/ims/case/v1p0/CFItems/:id',
    withCaseVersion('1.0', deps.cfItemsController.delete as unknown as RequestHandler)
  )
  app.put(
    '/management/tenants/:tenantId/ims/case/v1p1/CFItems/:id',
    withCaseVersion('1.1', deps.cfItemsController.update as unknown as RequestHandler)
  )
  app.delete(
    '/management/tenants/:tenantId/ims/case/v1p1/CFItems/:id',
    withCaseVersion('1.1', deps.cfItemsController.delete as unknown as RequestHandler)
  )

  app.put(
    '/management/tenants/:tenantId/ims/case/v1p0/CFAssociations/:id',
    withCaseVersion('1.0', deps.cfAssociationsController.update as unknown as RequestHandler)
  )
  app.delete(
    '/management/tenants/:tenantId/ims/case/v1p0/CFAssociations/:id',
    withCaseVersion('1.0', deps.cfAssociationsController.delete as unknown as RequestHandler)
  )
  app.put(
    '/management/tenants/:tenantId/ims/case/v1p1/CFAssociations/:id',
    withCaseVersion('1.1', deps.cfAssociationsController.update as unknown as RequestHandler)
  )
  app.delete(
    '/management/tenants/:tenantId/ims/case/v1p1/CFAssociations/:id',
    withCaseVersion('1.1', deps.cfAssociationsController.delete as unknown as RequestHandler)
  )

  app.delete(
    '/management/tenants/:tenantId/ims/case/v1p0/CFPackages/:id',
    withCaseVersion('1.0', deps.frameworksController.delete as unknown as RequestHandler)
  )
  app.delete(
    '/management/tenants/:tenantId/ims/case/v1p1/CFPackages/:id',
    withCaseVersion('1.1', deps.frameworksController.delete as unknown as RequestHandler)
  )

  // Tenant management endpoints (require case.admin scope)
  app.get(
    '/management/tenants',
    requireScope('case.admin'),
    deps.tenantsController.list
  )
  app.post(
    '/management/tenants',
    requireScope('case.admin'),
    deps.tenantsController.create
  )
}
