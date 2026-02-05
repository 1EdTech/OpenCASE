import type { Express } from 'express'
import type { CFPackagesControllerV1p0 } from './controllers/CFPackagesController'
import type { CFDocumentsControllerV1p0 } from './controllers/CFDocumentsController'
import type { GetAllCFDocumentsControllerV1p0 } from './controllers/GetAllCFDocumentsController'
import type { CFItemsControllerV1p0 } from './controllers/CFItemsController'
import type { CFAssociationsControllerV1p0 } from './controllers/CFAssociationsController'
import type { CFItemAssociationsControllerV1p0 } from './controllers/CFItemAssociationsController'
import type { CFRubricsControllerV1p0 } from './controllers/CFRubricsController'
import type { CFSubjectsControllerV1p0 } from './controllers/CFSubjectsController'
import type { CFConceptsControllerV1p0 } from './controllers/CFConceptsController'
import type { CFAssociationGroupingsControllerV1p0 } from './controllers/CFAssociationGroupingsController'
import type { CFItemTypesControllerV1p0 } from './controllers/CFItemTypesController'
import type { CFLicensesControllerV1p0 } from './controllers/CFLicensesController'

export interface PublicV1p0Deps {
  cfPackagesController: CFPackagesControllerV1p0
  cfDocumentsController: CFDocumentsControllerV1p0
  getAllCFDocumentsController: GetAllCFDocumentsControllerV1p0
  cfItemsController: CFItemsControllerV1p0
  cfAssociationsController: CFAssociationsControllerV1p0
  cfItemAssociationsController: CFItemAssociationsControllerV1p0
  cfRubricsController: CFRubricsControllerV1p0
  cfSubjectsController: CFSubjectsControllerV1p0
  cfConceptsController: CFConceptsControllerV1p0
  cfAssociationGroupingsController: CFAssociationGroupingsControllerV1p0
  cfItemTypesController: CFItemTypesControllerV1p0
  cfLicensesController: CFLicensesControllerV1p0
}

/**
 * @openapi
 * /ims/case/v1p0/CFPackages/{id}:
 *   get:
 *     operationId: getCFPackageV1p0
 *     summary: Get a CFPackage by id (CASE 1.0)
 *     tags: [PackagesManager]
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: OK }
 *
 * /ims/case/v1p0/CFDocuments:
 *   get:
 *     operationId: getAllCFDocumentsV1p0
 *     summary: Get all CFDocuments (CASE 1.0)
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
 * /ims/case/v1p0/CFDocuments/{id}:
 *   get:
 *     operationId: getCFDocumentV1p0
 *     summary: Get a CFDocument by id (CASE 1.0)
 *     tags: [DocumentsManager]
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: OK }
 *
 * /ims/case/v1p0/CFItems/{id}:
 *   get:
 *     operationId: getCFItemV1p0
 *     summary: Get a CFItem by id (CASE 1.0)
 *     tags: [ItemsManager]
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: OK }
 *
 * /ims/case/v1p0/CFItemAssociations/{id}:
 *   get:
 *     operationId: getCFItemAssociationsV1p0
 *     summary: Get CFItem associations by item id (CASE 1.0)
 *     tags: [AssociationsManager]
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: OK }
 *
 * /ims/case/v1p0/CFAssociations/{id}:
 *   get:
 *     operationId: getCFAssociationV1p0
 *     summary: Get a CFAssociation by id (CASE 1.0)
 *     tags: [AssociationsManager]
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: OK }
 *
 * /ims/case/v1p0/CFRubrics/{id}:
 *   get:
 *     operationId: getCFRubricV1p0
 *     summary: Get a CFRubric by id (CASE 1.0)
 *     tags: [RubricsManager]
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: OK }
 *
 * /ims/case/v1p0/CFSubjects/{id}:
 *   get:
 *     operationId: getCFSubjectV1p0
 *     summary: Get a CFSubject by id (CASE 1.0)
 *     tags: [DefinitionsManager]
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: OK }
 *
 * /ims/case/v1p0/CFConcepts/{id}:
 *   get:
 *     operationId: getCFConceptV1p0
 *     summary: Get a CFConcept by id (CASE 1.0)
 *     tags: [DefinitionsManager]
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: OK }
 *
 * /ims/case/v1p0/CFAssociationGroupings/{id}:
 *   get:
 *     operationId: getCFAssociationGroupingV1p0
 *     summary: Get a CFAssociationGrouping by id (CASE 1.0)
 *     tags: [DefinitionsManager]
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: OK }
 *
 * /ims/case/v1p0/CFItemTypes/{id}:
 *   get:
 *     operationId: getCFItemTypeV1p0
 *     summary: Get a CFItemType by id (CASE 1.0)
 *     tags: [DefinitionsManager]
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: OK }
 *
 * /ims/case/v1p0/CFLicenses/{id}:
 *   get:
 *     operationId: getCFLicenseV1p0
 *     summary: Get a CFLicense by id (CASE 1.0)
 *     tags: [DefinitionsManager]
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: OK }
 */
export function registerV1p0Routes (app: Express, deps: PublicV1p0Deps) {
  // CFPackage endpoint
  app.get('/ims/case/v1p0/CFPackages/:id', deps.cfPackagesController.getById)

  // CFDocument endpoints
  app.get('/ims/case/v1p0/CFDocuments', deps.getAllCFDocumentsController.getAll)
  app.get('/ims/case/v1p0/CFDocuments/:id', deps.cfDocumentsController.getById)

  // CFItem endpoints
  app.get('/ims/case/v1p0/CFItems/:id', deps.cfItemsController.getById)
  app.get('/ims/case/v1p0/CFItemAssociations/:id', deps.cfItemAssociationsController.getById)

  // CFAssociation endpoint
  app.get('/ims/case/v1p0/CFAssociations/:id', deps.cfAssociationsController.getById)

  // CFRubric endpoint
  app.get('/ims/case/v1p0/CFRubrics/:id', deps.cfRubricsController.getById)

  // CFSubject endpoint
  app.get('/ims/case/v1p0/CFSubjects/:id', deps.cfSubjectsController.getById)

  // CFConcept endpoint
  app.get('/ims/case/v1p0/CFConcepts/:id', deps.cfConceptsController.getById)

  // CFAssociationGrouping endpoint
  app.get('/ims/case/v1p0/CFAssociationGroupings/:id', deps.cfAssociationGroupingsController.getById)

  // CFItemType endpoint
  app.get('/ims/case/v1p0/CFItemTypes/:id', deps.cfItemTypesController.getById)

  // CFLicense endpoint
  app.get('/ims/case/v1p0/CFLicenses/:id', deps.cfLicensesController.getById)
}

