import type { Express } from 'express'
import type { CFPackagesControllerV1p1 } from './controllers/CFPackagesController'
import type { CFDocumentsControllerV1p1 } from './controllers/CFDocumentsController'
import type { GetAllCFDocumentsControllerV1p1 } from './controllers/GetAllCFDocumentsController'
import type { CFItemsControllerV1p1 } from './controllers/CFItemsController'
import type { CFAssociationsControllerV1p1 } from './controllers/CFAssociationsController'
import type { CFItemAssociationsControllerV1p1 } from './controllers/CFItemAssociationsController'
import type { CFRubricsControllerV1p1 } from './controllers/CFRubricsController'
import type { CFSubjectsControllerV1p1 } from './controllers/CFSubjectsController'
import type { CFConceptsControllerV1p1 } from './controllers/CFConceptsController'
import type { CFAssociationGroupingsControllerV1p1 } from './controllers/CFAssociationGroupingsController'
import type { CFItemTypesControllerV1p1 } from './controllers/CFItemTypesController'
import type { CFLicensesControllerV1p1 } from './controllers/CFLicensesController'

export interface PublicV1p1Deps {
  cfPackagesController: CFPackagesControllerV1p1
  cfDocumentsController: CFDocumentsControllerV1p1
  getAllCFDocumentsController: GetAllCFDocumentsControllerV1p1
  cfItemsController: CFItemsControllerV1p1
  cfAssociationsController: CFAssociationsControllerV1p1
  cfItemAssociationsController: CFItemAssociationsControllerV1p1
  cfRubricsController: CFRubricsControllerV1p1
  cfSubjectsController: CFSubjectsControllerV1p1
  cfConceptsController: CFConceptsControllerV1p1
  cfAssociationGroupingsController: CFAssociationGroupingsControllerV1p1
  cfItemTypesController: CFItemTypesControllerV1p1
  cfLicensesController: CFLicensesControllerV1p1
}

/**
 * @openapi
 * /ims/case/v1p1/CFPackages/{id}:
 *   get:
 *     operationId: getCFPackage
 *     summary: Get a CFPackage by id
 *     tags: [PackagesManager]
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: OK }
 *
 * /ims/case/v1p1/CFDocuments:
 *   get:
 *     operationId: getAllCFDocuments
 *     summary: Get all CFDocuments
 *     tags: [DocumentsManager]
 *     parameters:
 *       - { name: limit, in: query, required: false, schema: { type: integer, minimum: 1 } }
 *       - { name: offset, in: query, required: false, schema: { type: integer, minimum: 0 } }
 *       - { name: sort, in: query, required: false, schema: { type: string } }
 *       - { name: orderBy, in: query, required: false, schema: { type: string, enum: [asc, desc] } }
 *       - { name: filter, in: query, required: false, schema: { type: string } }
 *       - { name: fields, in: query, required: false, schema: { type: string } }
 *     responses:
 *       200: { description: OK }
 *
 * /ims/case/v1p1/CFDocuments/{id}:
 *   get:
 *     operationId: getCFDocument
 *     summary: Get a CFDocument by id
 *     tags: [DocumentsManager]
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: OK }
 *
 * /ims/case/v1p1/CFItems/{id}:
 *   get:
 *     operationId: getCFItem
 *     summary: Get a CFItem by id
 *     tags: [ItemsManager]
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: OK }
 *
 * /ims/case/v1p1/CFItemAssociations/{id}:
 *   get:
 *     operationId: getCFItemAssociations
 *     summary: Get CFItem associations by item id
 *     tags: [AssociationsManager]
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: OK }
 *
 * /ims/case/v1p1/CFAssociations/{id}:
 *   get:
 *     operationId: getCFAssociation
 *     summary: Get a CFAssociation by id
 *     tags: [AssociationsManager]
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: OK }
 *
 * /ims/case/v1p1/CFRubrics/{id}:
 *   get:
 *     operationId: getCFRubric
 *     summary: Get a CFRubric by id
 *     tags: [RubricsManager]
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: OK }
 *
 * /ims/case/v1p1/CFSubjects/{id}:
 *   get:
 *     operationId: getCFSubject
 *     summary: Get a CFSubject by id
 *     tags: [DefinitionsManager]
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: OK }
 *
 * /ims/case/v1p1/CFConcepts/{id}:
 *   get:
 *     operationId: getCFConcept
 *     summary: Get a CFConcept by id
 *     tags: [DefinitionsManager]
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: OK }
 *
 * /ims/case/v1p1/CFAssociationGroupings/{id}:
 *   get:
 *     operationId: getCFAssociationGrouping
 *     summary: Get a CFAssociationGrouping by id
 *     tags: [DefinitionsManager]
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: OK }
 *
 * /ims/case/v1p1/CFItemTypes/{id}:
 *   get:
 *     operationId: getCFItemType
 *     summary: Get a CFItemType by id
 *     tags: [DefinitionsManager]
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: OK }
 *
 * /ims/case/v1p1/CFLicenses/{id}:
 *   get:
 *     operationId: getCFLicense
 *     summary: Get a CFLicense by id
 *     tags: [DefinitionsManager]
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: OK }
 */
export function registerV1p1Routes (app: Express, deps: PublicV1p1Deps) {
  // Note: Discovery endpoint is registered in server.ts before auth middleware
  // to ensure it's accessible without authentication (as required by spec)

  // CFPackage endpoint
  app.get('/ims/case/v1p1/CFPackages/:id', deps.cfPackagesController.getById)

  // CFDocument endpoints
  app.get('/ims/case/v1p1/CFDocuments', deps.getAllCFDocumentsController.getAll)
  app.get('/ims/case/v1p1/CFDocuments/:id', deps.cfDocumentsController.getById)

  // CFItem endpoints
  app.get('/ims/case/v1p1/CFItems/:id', deps.cfItemsController.getById)
  app.get('/ims/case/v1p1/CFItemAssociations/:id', deps.cfItemAssociationsController.getById)

  // CFAssociation endpoint
  app.get('/ims/case/v1p1/CFAssociations/:id', deps.cfAssociationsController.getById)

  // CFRubric endpoint
  app.get('/ims/case/v1p1/CFRubrics/:id', deps.cfRubricsController.getById)

  // CFSubject endpoint
  app.get('/ims/case/v1p1/CFSubjects/:id', deps.cfSubjectsController.getById)

  // CFConcept endpoint
  app.get('/ims/case/v1p1/CFConcepts/:id', deps.cfConceptsController.getById)

  // CFAssociationGrouping endpoint
  app.get('/ims/case/v1p1/CFAssociationGroupings/:id', deps.cfAssociationGroupingsController.getById)

  // CFItemType endpoint
  app.get('/ims/case/v1p1/CFItemTypes/:id', deps.cfItemTypesController.getById)

  // CFLicense endpoint
  app.get('/ims/case/v1p1/CFLicenses/:id', deps.cfLicensesController.getById)
}
