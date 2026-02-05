import express, { type RequestHandler } from 'express'
import cors from 'cors'
import { makeAuthMiddleware } from './middleware/auth'
import { registerV1p1Routes } from './http-public/v1p1/routes'
import { registerV1p0Routes } from './http-public/v1p0/routes'
import { registerPublicRoutes } from './http-public/public/routes'
import { registerManagementRoutes } from './http-management/routes'
import { type Container } from '../../wiring/container'

export function createServer (container: Container): express.Express {
  const app = express()

  // CORS middleware - allow all origins for development (restrict in production)
  app.use(cors({
    origin: true, // Allow all origins (for development) - restrict in production
    credentials: true, // Allow credentials (cookies, authorization headers)
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
  }))

  app.use(express.json())
  app.use(express.urlencoded({ extended: true }))

  // Service Discovery endpoint (no auth required - used for service discovery)
  app.get(
    '/ims/case/v1p1/discovery/imscasev1p1_openapi3_v1p0.json',
    container.controllers.v1p1.discovery.getOpenAPISpec as RequestHandler
  )

  app.get(
    '/ims/case/v1p0/discovery/imscasev1p0_openapi3_v1p0.json',
    container.controllers.v1p0.discovery.getOpenAPISpec as RequestHandler
  )

  // Public routes (no auth)
  registerPublicRoutes(app, {
    tenantLookupController: container.controllers.public.tenantLookup
  })

  // Protected routes
  const authMiddleware = makeAuthMiddleware(container.jwtVerifier)
  app.use('/ims/case', authMiddleware)
  app.use('/management', authMiddleware)

  registerV1p1Routes(app, {
    cfPackagesController: container.controllers.v1p1.cfPackages,
    cfDocumentsController: container.controllers.v1p1.cfDocuments,
    getAllCFDocumentsController: container.controllers.v1p1.getAllCFDocuments,
    cfItemsController: container.controllers.v1p1.cfItems,
    cfAssociationsController: container.controllers.v1p1.cfAssociations,
    cfItemAssociationsController: container.controllers.v1p1.cfItemAssociations,
    cfRubricsController: container.controllers.v1p1.cfRubrics,
    cfSubjectsController: container.controllers.v1p1.cfSubjects,
    cfConceptsController: container.controllers.v1p1.cfConcepts,
    cfAssociationGroupingsController: container.controllers.v1p1.cfAssociationGroupings,
    cfItemTypesController: container.controllers.v1p1.cfItemTypes,
    cfLicensesController: container.controllers.v1p1.cfLicenses
  })

  registerV1p0Routes(app, {
    cfPackagesController: container.controllers.v1p0.cfPackages,
    cfDocumentsController: container.controllers.v1p0.cfDocuments,
    getAllCFDocumentsController: container.controllers.v1p0.getAllCFDocuments,
    cfItemsController: container.controllers.v1p0.cfItems,
    cfAssociationsController: container.controllers.v1p0.cfAssociations,
    cfItemAssociationsController: container.controllers.v1p0.cfItemAssociations,
    cfRubricsController: container.controllers.v1p0.cfRubrics,
    cfSubjectsController: container.controllers.v1p0.cfSubjects,
    cfConceptsController: container.controllers.v1p0.cfConcepts,
    cfAssociationGroupingsController: container.controllers.v1p0.cfAssociationGroupings,
    cfItemTypesController: container.controllers.v1p0.cfItemTypes,
    cfLicensesController: container.controllers.v1p0.cfLicenses
  })

  // Management routes (non-CASE-standard UPDATE/DELETE endpoints)
  registerManagementRoutes(app, {
    cfDocumentsController: container.controllers.management.cfDocuments,
    cfItemsController: container.controllers.management.cfItems,
    cfAssociationsController: container.controllers.management.cfAssociations,
    cfPackagesController: container.controllers.management.cfPackages,
    tenantsController: container.controllers.management.tenants,
    // Keycloak is the source of truth for accounts/clients in this deployment
  })

  // simple health endpoint
  app.get('/health', (_req, res) => res.json({ status: 'ok' }))

  return app
}
