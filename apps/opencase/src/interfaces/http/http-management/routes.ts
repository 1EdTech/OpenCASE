import type { Express, Request, Response, RequestHandler } from 'express'
import type { CFDocumentsManagementController } from './controllers/CFDocumentsManagementController'
import type { CFItemsManagementController } from './controllers/CFItemsManagementController'
import type { CFAssociationsManagementController } from './controllers/CFAssociationsManagementController'
import type { CFPackagesManagementController } from './controllers/CFPackagesManagementController'
import type { TenantsManagementController } from './controllers/TenantsManagementController'
import type { ApiKeysManagementController } from './controllers/ApiKeysManagementController'
import type { MembersManagementController } from './controllers/MembersManagementController'
import type { CgeManagementController } from './controllers/CgeManagementController'
import type { FileFrameworkStore } from '../../../infrastructure/persistence/file/FileFrameworkStore'
import { requireScope, requireAnyScope } from '../middleware/scope'

function withCaseVersion (caseVersion: '1.0' | '1.1', handler: RequestHandler): RequestHandler {
  return (req, res, next) => {
    // Express 5's req.query is effectively read-only; stash an override instead.
    ;(req as unknown as { caseVersionOverride?: '1.0' | '1.1' }).caseVersionOverride = caseVersion
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
  cfPackagesController: CFPackagesManagementController
  tenantsController: TenantsManagementController
  apiKeysController?: ApiKeysManagementController
  membersController?: MembersManagementController
  cgeController?: CgeManagementController
  store?: FileFrameworkStore
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
 * /management/tenants/{tenantId}/ims/case/v1p0/CFPackages:
 *   post:
 *     operationId: createCFPackageV1p0
 *     summary: Create/publish a CFPackage (non-CASE extension) (CASE v1p0)
 *     tags: [PackagesManager]
 *     parameters:
 *       - { name: tenantId, in: path, required: true, schema: { type: string } }
 *     responses:
 *       200: { description: Unchanged }
 *       201: { description: Created/Published }
 *
 * /management/tenants/{tenantId}/ims/case/v1p1/CFPackages:
 *   post:
 *     operationId: createCFPackageV1p1
 *     summary: Create/publish a CFPackage (non-CASE extension) (CASE v1p1)
 *     tags: [PackagesManager]
 *     parameters:
 *       - { name: tenantId, in: path, required: true, schema: { type: string } }
 *     responses:
 *       200: { description: Unchanged }
 *       201: { description: Created/Published }
 *
 * /management/tenants/{tenantId}/ims/case/v1p0/CFPackages/import:
 *   post:
 *     operationId: importCFPackageV1p0
 *     summary: Import a CFPackage from endpoint (non-CASE extension) (CASE v1p0)
 *     tags: [PackagesManager]
 *     parameters:
 *       - { name: tenantId, in: path, required: true, schema: { type: string } }
 *     responses:
 *       201: { description: Imported }
 *
 * /management/tenants/{tenantId}/ims/case/v1p1/CFPackages/import:
 *   post:
 *     operationId: importCFPackageV1p1
 *     summary: Import a CFPackage from endpoint (non-CASE extension) (CASE v1p1)
 *     tags: [PackagesManager]
 *     parameters:
 *       - { name: tenantId, in: path, required: true, schema: { type: string } }
 *     responses:
 *       201: { description: Imported }
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
  // CFPackage list/create/import/delete endpoints (non-CASE extension)
  app.get(
    '/management/tenants/:tenantId/CFPackages',
    requireScope('case.read'),
    deps.cfPackagesController.list
  )
  app.post(
    '/management/tenants/:tenantId/ims/case/v1p0/CFPackages',
    requireScope('case.write'),
    withCaseVersion('1.0', deps.cfPackagesController.create as unknown as RequestHandler)
  )
  app.post(
    '/management/tenants/:tenantId/ims/case/v1p1/CFPackages',
    requireScope('case.write'),
    withCaseVersion('1.1', deps.cfPackagesController.create as unknown as RequestHandler)
  )
  app.post(
    '/management/tenants/:tenantId/ims/case/v1p0/CFPackages/import',
    requireScope('case.write'),
    withCaseVersion('1.0', deps.cfPackagesController.import as unknown as RequestHandler)
  )
  app.post(
    '/management/tenants/:tenantId/ims/case/v1p1/CFPackages/import',
    requireScope('case.write'),
    withCaseVersion('1.1', deps.cfPackagesController.import as unknown as RequestHandler)
  )
  // CASE entity management endpoints (explicit version in the path)
  app.put(
    '/management/tenants/:tenantId/ims/case/v1p0/CFDocuments/:id',
    requireScope('case.write'),
    withCaseVersion('1.0', deps.cfDocumentsController.update as unknown as RequestHandler)
  )
  app.delete(
    '/management/tenants/:tenantId/ims/case/v1p0/CFDocuments/:id',
    requireScope('case.write'),
    withCaseVersion('1.0', deps.cfDocumentsController.delete as unknown as RequestHandler)
  )
  app.put(
    '/management/tenants/:tenantId/ims/case/v1p1/CFDocuments/:id',
    requireScope('case.write'),
    withCaseVersion('1.1', deps.cfDocumentsController.update as unknown as RequestHandler)
  )
  app.delete(
    '/management/tenants/:tenantId/ims/case/v1p1/CFDocuments/:id',
    requireScope('case.write'),
    withCaseVersion('1.1', deps.cfDocumentsController.delete as unknown as RequestHandler)
  )

  app.put(
    '/management/tenants/:tenantId/ims/case/v1p0/CFItems/:id',
    requireScope('case.write'),
    withCaseVersion('1.0', deps.cfItemsController.update as unknown as RequestHandler)
  )
  app.delete(
    '/management/tenants/:tenantId/ims/case/v1p0/CFItems/:id',
    requireScope('case.write'),
    withCaseVersion('1.0', deps.cfItemsController.delete as unknown as RequestHandler)
  )
  app.put(
    '/management/tenants/:tenantId/ims/case/v1p1/CFItems/:id',
    requireScope('case.write'),
    withCaseVersion('1.1', deps.cfItemsController.update as unknown as RequestHandler)
  )
  app.delete(
    '/management/tenants/:tenantId/ims/case/v1p1/CFItems/:id',
    requireScope('case.write'),
    withCaseVersion('1.1', deps.cfItemsController.delete as unknown as RequestHandler)
  )

  app.put(
    '/management/tenants/:tenantId/ims/case/v1p0/CFAssociations/:id',
    requireScope('case.write'),
    withCaseVersion('1.0', deps.cfAssociationsController.update as unknown as RequestHandler)
  )
  app.delete(
    '/management/tenants/:tenantId/ims/case/v1p0/CFAssociations/:id',
    requireScope('case.write'),
    withCaseVersion('1.0', deps.cfAssociationsController.delete as unknown as RequestHandler)
  )
  app.put(
    '/management/tenants/:tenantId/ims/case/v1p1/CFAssociations/:id',
    requireScope('case.write'),
    withCaseVersion('1.1', deps.cfAssociationsController.update as unknown as RequestHandler)
  )
  app.delete(
    '/management/tenants/:tenantId/ims/case/v1p1/CFAssociations/:id',
    requireScope('case.write'),
    withCaseVersion('1.1', deps.cfAssociationsController.delete as unknown as RequestHandler)
  )

  app.delete(
    '/management/tenants/:tenantId/ims/case/v1p0/CFPackages/:id',
    requireScope('case.write'),
    withCaseVersion('1.0', deps.cfPackagesController.delete as unknown as RequestHandler)
  )
  app.delete(
    '/management/tenants/:tenantId/ims/case/v1p1/CFPackages/:id',
    requireScope('case.write'),
    withCaseVersion('1.1', deps.cfPackagesController.delete as unknown as RequestHandler)
  )

  // Restore (unarchive) a previously archived framework
  app.post(
    '/management/tenants/:tenantId/ims/case/v1p0/CFPackages/:id/restore',
    requireScope('case.write'),
    withCaseVersion('1.0', deps.cfPackagesController.restore as unknown as RequestHandler)
  )
  app.post(
    '/management/tenants/:tenantId/ims/case/v1p1/CFPackages/:id/restore',
    requireScope('case.write'),
    withCaseVersion('1.1', deps.cfPackagesController.restore as unknown as RequestHandler)
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

  // License listing endpoint (non-CASE extension)
  if (deps.store) {
    app.get(
      '/management/tenants/:tenantId/licenses',
      requireScope('case.read'),
      (req: Request, res: Response) => {
        try {
          const tenantId = (req as any).tenantId ?? req.params.tenantId
          const urlTenantId = req.params.tenantId
          if (urlTenantId && urlTenantId !== tenantId) {
            res.status(403).json({ error: 'Tenant mismatch' })
            return
          }
          const defs = deps.store!.getTenantDefinitions(tenantId, '1.1')
          res.status(200).json({ CFLicenses: defs.CFLicenses ?? [] })
        } catch (error: any) {
          res.status(400).json({ error: error.message || 'Failed to list licenses' })
        }
      }
    )

    // All tenant definitions endpoint (non-CASE extension)
    // Returns the full set of available definitions (seeds + framework-contributed)
    // for use by the editor's combobox / picker UI.
    app.get(
      '/management/tenants/:tenantId/definitions',
      requireScope('case.read'),
      (req: Request, res: Response) => {
        try {
          const tenantId = (req as any).tenantId ?? req.params.tenantId
          const urlTenantId = req.params.tenantId
          if (urlTenantId && urlTenantId !== tenantId) {
            res.status(403).json({ error: 'Tenant mismatch' })
            return
          }
          const caseVersion = (req.query.caseVersion === '1.0' ? '1.0' : '1.1') as '1.0' | '1.1'
          const defs = deps.store!.getTenantDefinitions(tenantId, caseVersion)
          res.status(200).json({
            CFConcepts: defs.CFConcepts ?? [],
            CFSubjects: defs.CFSubjects ?? [],
            CFLicenses: defs.CFLicenses ?? [],
            CFItemTypes: defs.CFItemTypes ?? [],
            CFAssociationGroupings: defs.CFAssociationGroupings ?? [],
          })
        } catch (error: any) {
          res.status(400).json({ error: error.message || 'Failed to list definitions' })
        }
      }
    )
  }

  // API key management endpoints (tenant owner or system case.admin)
  if (deps.apiKeysController) {
    app.get(
      '/management/tenants/:tenantId/api-keys',
      requireAnyScope('case.owner', 'case.admin'),
      deps.apiKeysController.list
    )
    app.post(
      '/management/tenants/:tenantId/api-keys',
      requireAnyScope('case.owner', 'case.admin'),
      deps.apiKeysController.create
    )
    app.delete(
      '/management/tenants/:tenantId/api-keys/:keyId',
      requireAnyScope('case.owner', 'case.admin'),
      deps.apiKeysController.delete
    )
  }

  // Member management (Keycloak client roles)
  if (deps.membersController) {
    // SSO first-login ensure — authenticated, no case.* scope required (register before :userId)
    app.post(
      '/management/tenants/:tenantId/members/ensure-self',
      deps.membersController.ensureSelf
    )
    app.get(
      '/management/tenants/:tenantId/members',
      requireAnyScope('case.owner', 'case.admin'),
      deps.membersController.list
    )
    app.post(
      '/management/tenants/:tenantId/members',
      requireAnyScope('case.owner', 'case.admin'),
      deps.membersController.create
    )
    app.patch(
      '/management/tenants/:tenantId/members/:userId',
      requireAnyScope('case.owner', 'case.admin'),
      deps.membersController.update
    )
    app.delete(
      '/management/tenants/:tenantId/members/:userId',
      requireAnyScope('case.owner', 'case.admin'),
      deps.membersController.remove
    )
  }

  // CASE Global credentials + proxy APIs
  if (deps.cgeController) {
    app.get(
      '/management/tenants/:tenantId/cge/credentials',
      requireAnyScope('case.owner', 'case.admin'),
      deps.cgeController.getCredentials
    )
    app.put(
      '/management/tenants/:tenantId/cge/credentials',
      requireAnyScope('case.owner', 'case.admin'),
      deps.cgeController.putCredentials
    )
    app.delete(
      '/management/tenants/:tenantId/cge/credentials',
      requireAnyScope('case.owner', 'case.admin'),
      deps.cgeController.deleteCredentials
    )
    app.post(
      '/management/tenants/:tenantId/cge/credentials/test',
      requireAnyScope('case.owner', 'case.admin'),
      deps.cgeController.testCredentials
    )

    app.get(
      '/management/tenants/:tenantId/cge/frameworks',
      requireScope('case.write'),
      deps.cgeController.listFrameworks
    )
    app.get(
      '/management/tenants/:tenantId/cge/frameworks/:frameworkId',
      requireScope('case.write'),
      deps.cgeController.getFramework
    )
    app.post(
      '/management/tenants/:tenantId/cge/subscriptions',
      requireScope('case.write'),
      deps.cgeController.createSubscription
    )
    app.get(
      '/management/tenants/:tenantId/cge/subscriptions',
      requireScope('case.write'),
      deps.cgeController.listSubscriptions
    )
    app.post(
      '/management/tenants/:tenantId/cge/import',
      requireScope('case.write'),
      deps.cgeController.importFromCge
    )
    app.post(
      '/management/tenants/:tenantId/cge/frameworks/:frameworkId/refresh',
      requireScope('case.write'),
      deps.cgeController.refreshCachedFramework
    )
    app.get(
      '/management/tenants/:tenantId/cge/cache/:docId/items',
      requireScope('case.write'),
      deps.cgeController.searchCachedItems
    )
  }

}
