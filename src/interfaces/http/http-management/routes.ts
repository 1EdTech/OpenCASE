import { Express } from 'express'
import { CFDocumentsManagementController } from './controllers/CFDocumentsManagementController'
import { CFItemsManagementController } from './controllers/CFItemsManagementController'
import { CFAssociationsManagementController } from './controllers/CFAssociationsManagementController'
import { FrameworksManagementController } from './controllers/FrameworksManagementController'
import { TenantsManagementController } from './controllers/TenantsManagementController'
import { requireScope } from '../middleware/scope'

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

  // Framework listing endpoint
  app.get(
    '/management/tenants/:tenantId/frameworks',
    deps.frameworksController.list
  )

  // Framework delete endpoint
  app.delete(
    '/management/tenants/:tenantId/frameworks/:docId',
    deps.frameworksController.delete
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

