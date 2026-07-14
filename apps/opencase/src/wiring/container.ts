import { loadConfig, type AppConfig } from '../infrastructure/config/Config'
import { logger } from '../infrastructure/logging/Logger'
import { OidcJwtVerifier } from '../infrastructure/auth/OidcJwtVerifier'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { FileFrameworkStore } from '../infrastructure/persistence/file/FileFrameworkStore'
import { FileCFPackageRepository } from '../infrastructure/persistence/file/FileCFPackageRepository'
import { CreateFramework } from '../application/case/endpoints/CreateFramework'
import { ImportFramework } from '../application/case/endpoints/ImportFramework'
import { GetCFPackage } from '../application/case/endpoints/GetCFPackage'
import { GetCFDocument } from '../application/case/endpoints/GetCFDocument'
import { GetAllCFDocuments } from '../application/case/endpoints/GetAllCFDocuments'
import { GetCFItem } from '../application/case/endpoints/GetCFItem'
import { GetCFAssociation } from '../application/case/endpoints/GetCFAssociation'
import { GetCFItemAssociations } from '../application/case/endpoints/GetCFItemAssociations'
import { GetCFRubric } from '../application/case/endpoints/GetCFRubric'
import { GetCFSubject } from '../application/case/endpoints/GetCFSubject'
import { GetCFConcept } from '../application/case/endpoints/GetCFConcept'
import { GetCFAssociationGrouping } from '../application/case/endpoints/GetCFAssociationGrouping'
import { GetCFItemType } from '../application/case/endpoints/GetCFItemType'
import { GetCFLicense } from '../application/case/endpoints/GetCFLicense'
import { UpdateCFDocument } from '../application/case/endpoints/UpdateCFDocument'
import { UpdateCFItem } from '../application/case/endpoints/UpdateCFItem'
import { UpdateCFAssociation } from '../application/case/endpoints/UpdateCFAssociation'
import { DeleteCFDocument } from '../application/case/endpoints/DeleteCFDocument'
import { RestoreFramework } from '../application/case/endpoints/RestoreFramework'
import { DeleteCFItem } from '../application/case/endpoints/DeleteCFItem'
import { DeleteCFAssociation } from '../application/case/endpoints/DeleteCFAssociation'
import { CFPackagesControllerV1p0 } from '../interfaces/http/http-public/v1p0/controllers/CFPackagesController'
import { CFDocumentsControllerV1p0 } from '../interfaces/http/http-public/v1p0/controllers/CFDocumentsController'
import { GetAllCFDocumentsControllerV1p0 } from '../interfaces/http/http-public/v1p0/controllers/GetAllCFDocumentsController'
import { CFItemsControllerV1p0 } from '../interfaces/http/http-public/v1p0/controllers/CFItemsController'
import { CFAssociationsControllerV1p0 } from '../interfaces/http/http-public/v1p0/controllers/CFAssociationsController'
import { CFItemAssociationsControllerV1p0 } from '../interfaces/http/http-public/v1p0/controllers/CFItemAssociationsController'
import { CFRubricsControllerV1p0 } from '../interfaces/http/http-public/v1p0/controllers/CFRubricsController'
import { CFSubjectsControllerV1p0 } from '../interfaces/http/http-public/v1p0/controllers/CFSubjectsController'
import { CFConceptsControllerV1p0 } from '../interfaces/http/http-public/v1p0/controllers/CFConceptsController'
import { CFAssociationGroupingsControllerV1p0 } from '../interfaces/http/http-public/v1p0/controllers/CFAssociationGroupingsController'
import { CFItemTypesControllerV1p0 } from '../interfaces/http/http-public/v1p0/controllers/CFItemTypesController'
import { CFLicensesControllerV1p0 } from '../interfaces/http/http-public/v1p0/controllers/CFLicensesController'
import { DiscoveryControllerV1p0 } from '../interfaces/http/http-public/v1p0/controllers/DiscoveryController'
import { CFPackagesControllerV1p1 } from '../interfaces/http/http-public/v1p1/controllers/CFPackagesController'
import { CFDocumentsControllerV1p1 } from '../interfaces/http/http-public/v1p1/controllers/CFDocumentsController'
import { GetAllCFDocumentsControllerV1p1 } from '../interfaces/http/http-public/v1p1/controllers/GetAllCFDocumentsController'
import { CFItemsControllerV1p1 } from '../interfaces/http/http-public/v1p1/controllers/CFItemsController'
import { CFAssociationsControllerV1p1 } from '../interfaces/http/http-public/v1p1/controllers/CFAssociationsController'
import { CFItemAssociationsControllerV1p1 } from '../interfaces/http/http-public/v1p1/controllers/CFItemAssociationsController'
import { CFRubricsControllerV1p1 } from '../interfaces/http/http-public/v1p1/controllers/CFRubricsController'
import { CFSubjectsControllerV1p1 } from '../interfaces/http/http-public/v1p1/controllers/CFSubjectsController'
import { CFConceptsControllerV1p1 } from '../interfaces/http/http-public/v1p1/controllers/CFConceptsController'
import { CFAssociationGroupingsControllerV1p1 } from '../interfaces/http/http-public/v1p1/controllers/CFAssociationGroupingsController'
import { CFItemTypesControllerV1p1 } from '../interfaces/http/http-public/v1p1/controllers/CFItemTypesController'
import { CFLicensesControllerV1p1 } from '../interfaces/http/http-public/v1p1/controllers/CFLicensesController'
import { DiscoveryControllerV1p1 } from '../interfaces/http/http-public/v1p1/controllers/DiscoveryController'
import { CFDocumentsManagementController } from '../interfaces/http/http-management/controllers/CFDocumentsManagementController'
import { CFItemsManagementController } from '../interfaces/http/http-management/controllers/CFItemsManagementController'
import { CFAssociationsManagementController } from '../interfaces/http/http-management/controllers/CFAssociationsManagementController'
import { CFPackagesManagementController } from '../interfaces/http/http-management/controllers/CFPackagesManagementController'
import { TenantsManagementController } from '../interfaces/http/http-management/controllers/TenantsManagementController'
import { ApiKeysManagementController } from '../interfaces/http/http-management/controllers/ApiKeysManagementController'
import { ListFrameworks } from '../application/case/endpoints/ListFrameworks'
import { ListTenants } from '../application/case/endpoints/ListTenants'
import { CreateTenant } from '../application/case/endpoints/CreateTenant'
import { CaseApiClient } from '../infrastructure/http/CaseApiClient'
import { JsonSchemaValidator } from '../infrastructure/validation/JsonSchemaValidator'
import { KeycloakAdminClient } from '../infrastructure/keycloak/KeycloakAdminClient'
import { KeycloakTenantProvisioner } from '../infrastructure/keycloak/KeycloakTenantProvisioner'
import { TenantLookupController } from '../interfaces/http/http-public/public/controllers/TenantLookupController'

export interface Container {
  config: AppConfig
  logger: typeof logger
  jwtVerifier: OidcJwtVerifier
  store: FileFrameworkStore
  keycloakAdmin: KeycloakAdminClient
  controllers: {
    v1p0: {
      cfPackages: CFPackagesControllerV1p0
      cfDocuments: CFDocumentsControllerV1p0
      getAllCFDocuments: GetAllCFDocumentsControllerV1p0
      cfItems: CFItemsControllerV1p0
      cfAssociations: CFAssociationsControllerV1p0
      cfItemAssociations: CFItemAssociationsControllerV1p0
      cfRubrics: CFRubricsControllerV1p0
      cfSubjects: CFSubjectsControllerV1p0
      cfConcepts: CFConceptsControllerV1p0
      cfAssociationGroupings: CFAssociationGroupingsControllerV1p0
      cfItemTypes: CFItemTypesControllerV1p0
      cfLicenses: CFLicensesControllerV1p0
      discovery: DiscoveryControllerV1p0
    }
    v1p1: {
      cfPackages: CFPackagesControllerV1p1
      cfDocuments: CFDocumentsControllerV1p1
      getAllCFDocuments: GetAllCFDocumentsControllerV1p1
      cfItems: CFItemsControllerV1p1
      cfAssociations: CFAssociationsControllerV1p1
      cfItemAssociations: CFItemAssociationsControllerV1p1
      cfRubrics: CFRubricsControllerV1p1
      cfSubjects: CFSubjectsControllerV1p1
      cfConcepts: CFConceptsControllerV1p1
      cfAssociationGroupings: CFAssociationGroupingsControllerV1p1
      cfItemTypes: CFItemTypesControllerV1p1
      cfLicenses: CFLicensesControllerV1p1
      discovery: DiscoveryControllerV1p1
    }
    management: {
      cfDocuments: CFDocumentsManagementController
      cfItems: CFItemsManagementController
      cfAssociations: CFAssociationsManagementController
      cfPackages: CFPackagesManagementController
      tenants: TenantsManagementController
      apiKeys: ApiKeysManagementController
    }
    public: {
      tenantLookup: TenantLookupController
    }
  }
}

export async function buildContainer(): Promise<Container> {
  const config = loadConfig()

  const jwtVerifier = new OidcJwtVerifier({
    issuerUrl: config.oidcIssuerUrl,
    clientIdPrefix: config.oidcClientIdPrefix,
    jwksFetchUrl: config.oidcJwksFetchUrl
  })

  // Initialize CASE services
  const store = new FileFrameworkStore({ baseDataDir: config.caseDataDir })
  await store.loadAll()

  const pkgRepo = new FileCFPackageRepository(store)

  // Initialize HTTP client for fetching frameworks from endpoints
  const caseApiClient = new CaseApiClient({
    timeout: 30000 // 30 second timeout
  })

  // Initialize JSON schema validator and load CASE schemas
  const jsonSchemaValidator = new JsonSchemaValidator()
  try {
    // Try multiple paths to support both development and production builds
    const possiblePaths = [
      join(__dirname, '../../schemas'), // Development: src/wiring -> schemas
      join(__dirname, '../../../schemas'), // Production: dist/wiring -> schemas
      join(process.cwd(), 'schemas') // Fallback: project root
    ]
    
    let schemasDir: string | null = null
    for (const path of possiblePaths) {
      try {
        const testFile = join(path, 'case-v1p1-cfpackage.json')
        readFileSync(testFile, 'utf-8')
        schemasDir = path
        break
      } catch {
        // Try next path
      }
    }
    
    if (!schemasDir) {
      throw new Error('Could not find schemas directory')
    }
    
    // Use official schema for CASE v1p1 CFPackage (from 1EdTech)
    let officialSchemasDir: string | null = null
    for (const path of possiblePaths) {
      try {
        const testFile = join(path, 'official/case-v1p1-cfpackage.json')
        readFileSync(testFile, 'utf-8')
        officialSchemasDir = path
        break
      } catch {
        // Try next path
      }
    }
    
    // Use official schema for CASE v1p1 - it validates CFPackage format (CFDocument, CFItems, etc.)
    let cfPackageSchemaV1p1: any
    if (officialSchemasDir) {
      try {
        const officialSchemaPath = join(officialSchemasDir, 'official/case-v1p1-cfpackage.json')
        logger.info({ path: officialSchemaPath }, 'Loading official CASE v1p1 CFPackage schema')
        cfPackageSchemaV1p1 = JSON.parse(readFileSync(officialSchemaPath, 'utf-8'))
        logger.info('Using official CASE v1p1 CFPackage schema for validation')
      } catch (officialError: any) {
        logger.warn({ error: officialError.message }, 'Failed to load official schema, using custom schema')
        cfPackageSchemaV1p1 = JSON.parse(readFileSync(join(schemasDir, 'case-v1p1-cfpackage.json'), 'utf-8'))
      }
    } else {
      logger.warn('Official schema directory not found, using custom schema')
      cfPackageSchemaV1p1 = JSON.parse(readFileSync(join(schemasDir, 'case-v1p1-cfpackage.json'), 'utf-8'))
    }
    
    const cfDocumentSchemaV1p1 = JSON.parse(readFileSync(join(schemasDir, 'case-v1p1-cfdocument.json'), 'utf-8'))
    const cfItemSchemaV1p1 = JSON.parse(readFileSync(join(schemasDir, 'case-v1p1-cfitem.json'), 'utf-8'))
    const cfAssociationSchemaV1p1 = JSON.parse(readFileSync(join(schemasDir, 'case-v1p1-cfassociation.json'), 'utf-8'))

    const cfPackageSchemaV1p0 = JSON.parse(readFileSync(join(schemasDir, 'case-v1p0-cfpackage.json'), 'utf-8'))
    const cfDocumentSchemaV1p0 = JSON.parse(readFileSync(join(schemasDir, 'case-v1p0-cfdocument.json'), 'utf-8'))
    const cfItemSchemaV1p0 = JSON.parse(readFileSync(join(schemasDir, 'case-v1p0-cfitem.json'), 'utf-8'))
    const cfAssociationSchemaV1p0 = JSON.parse(readFileSync(join(schemasDir, 'case-v1p0-cfassociation.json'), 'utf-8'))
    
    try {
      // Register schemas one at a time to identify which one fails
      const schemasToRegister = [
        { name: 'case-v1p1-cfpackage', schema: cfPackageSchemaV1p1 },
        { name: 'case-v1p1-cfdocument', schema: cfDocumentSchemaV1p1 },
        { name: 'case-v1p1-cfitem', schema: cfItemSchemaV1p1 },
        { name: 'case-v1p1-cfassociation', schema: cfAssociationSchemaV1p1 },
        { name: 'case-v1p0-cfpackage', schema: cfPackageSchemaV1p0 },
        { name: 'case-v1p0-cfdocument', schema: cfDocumentSchemaV1p0 },
        { name: 'case-v1p0-cfitem', schema: cfItemSchemaV1p0 },
        { name: 'case-v1p0-cfassociation', schema: cfAssociationSchemaV1p0 }
      ]
      
      for (const { name, schema } of schemasToRegister) {
        try {
          jsonSchemaValidator.addSchema(name, schema)
          logger.debug({ schema: name }, 'Registered schema')
        } catch (addError: any) {
          logger.error({ 
            schema: name, 
            error: addError.message, 
            stack: addError.stack 
          }, `Failed to register schema '${name}'`)
          throw addError // Re-throw to stop registration
        }
      }
      
      logger.info({ 
        registeredSchemas: jsonSchemaValidator.getRegisteredSchemas() 
      }, 'Loaded CASE JSON schemas for validation')
    } catch (schemaError: any) {
      logger.error({ 
        error: schemaError.message, 
        stack: schemaError.stack,
        registeredSchemas: jsonSchemaValidator.getRegisteredSchemas(),
        attemptedSchemas: ['case-v1p1-cfpackage', 'case-v1p1-cfdocument', 'case-v1p1-cfitem', 'case-v1p1-cfassociation', 'case-v1p0-cfpackage', 'case-v1p0-cfdocument', 'case-v1p0-cfitem', 'case-v1p0-cfassociation']
      }, 'Failed to add schemas to validator')
      throw schemaError // Re-throw to be caught by outer catch
    }
  } catch (error: any) {
    logger.error({ 
      error: error.message, 
      stack: error.stack,
      registeredSchemas: jsonSchemaValidator.getRegisteredSchemas()
    }, 'Failed to load JSON schemas - validation will be skipped')
    // Don't throw - allow application to continue without validation
    // But log which schemas were successfully registered (if any)
  }

  const createFramework = new CreateFramework(pkgRepo, jsonSchemaValidator, store)
  const importFramework = new ImportFramework(pkgRepo, caseApiClient, jsonSchemaValidator)
  
  // Initialize CASE endpoints
  const getCFPackage = new GetCFPackage(pkgRepo, store)
  const getCFDocument = new GetCFDocument(pkgRepo)
  const getAllCFDocuments = new GetAllCFDocuments(store)
  const getCFItem = new GetCFItem(pkgRepo, store)
  const getCFAssociation = new GetCFAssociation(pkgRepo, store)
  const getCFItemAssociations = new GetCFItemAssociations(pkgRepo, store)
  const getCFRubric = new GetCFRubric(pkgRepo, store)
  const getCFSubject = new GetCFSubject(pkgRepo, store)
  const getCFConcept = new GetCFConcept(pkgRepo, store)
  const getCFAssociationGrouping = new GetCFAssociationGrouping(pkgRepo, store)
  const getCFItemType = new GetCFItemType(pkgRepo, store)
  const getCFLicense = new GetCFLicense(pkgRepo, store)

  // Initialize management commands
  const updateCFDocument = new UpdateCFDocument(pkgRepo, jsonSchemaValidator)
  const updateCFItem = new UpdateCFItem(pkgRepo, store, jsonSchemaValidator)
  const updateCFAssociation = new UpdateCFAssociation(pkgRepo, store, jsonSchemaValidator)
  const deleteCFDocument = new DeleteCFDocument(pkgRepo, store)
  const deleteCFItem = new DeleteCFItem(pkgRepo, store)
  const deleteCFAssociation = new DeleteCFAssociation(pkgRepo, store)

  const cfPackagesControllerV1p0 = new CFPackagesControllerV1p0(getCFPackage, store)
  const cfDocumentsControllerV1p0 = new CFDocumentsControllerV1p0(getCFDocument, store)
  const getAllCFDocumentsControllerV1p0 = new GetAllCFDocumentsControllerV1p0(getAllCFDocuments, store)
  const cfItemsControllerV1p0 = new CFItemsControllerV1p0(getCFItem, store)
  const cfAssociationsControllerV1p0 = new CFAssociationsControllerV1p0(getCFAssociation, store)
  const cfItemAssociationsControllerV1p0 = new CFItemAssociationsControllerV1p0(getCFItemAssociations, store)
  const cfRubricsControllerV1p0 = new CFRubricsControllerV1p0(getCFRubric, store)
  const cfSubjectsControllerV1p0 = new CFSubjectsControllerV1p0(getCFSubject, store)
  const cfConceptsControllerV1p0 = new CFConceptsControllerV1p0(getCFConcept, store)
  const cfAssociationGroupingsControllerV1p0 = new CFAssociationGroupingsControllerV1p0(getCFAssociationGrouping, store)
  const cfItemTypesControllerV1p0 = new CFItemTypesControllerV1p0(getCFItemType, store)
  const cfLicensesControllerV1p0 = new CFLicensesControllerV1p0(getCFLicense, store)
  const discoveryControllerV1p0 = new DiscoveryControllerV1p0()

  const cfPackagesControllerV1p1 = new CFPackagesControllerV1p1(getCFPackage, store)
  const cfDocumentsControllerV1p1 = new CFDocumentsControllerV1p1(getCFDocument, store)
  const getAllCFDocumentsControllerV1p1 = new GetAllCFDocumentsControllerV1p1(getAllCFDocuments, store)
  const cfItemsControllerV1p1 = new CFItemsControllerV1p1(getCFItem, store)
  const cfAssociationsControllerV1p1 = new CFAssociationsControllerV1p1(getCFAssociation, store)
  const cfItemAssociationsControllerV1p1 = new CFItemAssociationsControllerV1p1(getCFItemAssociations, store)
  const cfRubricsControllerV1p1 = new CFRubricsControllerV1p1(getCFRubric, store)
  const cfSubjectsControllerV1p1 = new CFSubjectsControllerV1p1(getCFSubject, store)
  const cfConceptsControllerV1p1 = new CFConceptsControllerV1p1(getCFConcept, store)
  const cfAssociationGroupingsControllerV1p1 = new CFAssociationGroupingsControllerV1p1(getCFAssociationGrouping, store)
  const cfItemTypesControllerV1p1 = new CFItemTypesControllerV1p1(getCFItemType, store)
  const cfLicensesControllerV1p1 = new CFLicensesControllerV1p1(getCFLicense, store)
  const discoveryControllerV1p1 = new DiscoveryControllerV1p1()
  
  // Initialize management commands
  const listFrameworks = new ListFrameworks(store)
  const listTenants = new ListTenants()
  const keycloakAdmin = new KeycloakAdminClient({
    baseUrl: config.keycloakBaseUrl,
    realm: config.keycloakRealm,
    adminRealm: config.keycloakAdminRealm,
    clientId: config.keycloakAdminClientId,
    clientSecret: config.keycloakAdminClientSecret,
    username: config.keycloakAdminUsername,
    password: config.keycloakAdminPassword
  })
  const keycloakTenantProvisioner = new KeycloakTenantProvisioner(keycloakAdmin, {
    realm: config.keycloakRealm,
    clientIdPrefix: config.oidcClientIdPrefix,
    spaRedirectUris: config.keycloakSpaRedirectUris,
    spaWebOrigins: config.keycloakSpaWebOrigins,
    bootstrapSystemAdmin: config.keycloakBootstrapSystemAdmin,
    systemAdminEmail: config.keycloakSystemAdminEmail,
    systemAdminPassword: config.keycloakSystemAdminPassword,
    smtpHost: config.smtpHost,
    smtpPort: config.smtpPort,
    smtpFrom: config.smtpFrom,
  })

  // Keycloak bootstrap with retry logic (wait for Keycloak to be ready)
  const maxRetries = 30
  const retryDelayMs = 2000
  let keycloakReady = false
  
  for (let attempt = 1; attempt <= maxRetries && !keycloakReady; attempt++) {
    try {
      await keycloakAdmin.ensureRealmExists()
      await keycloakTenantProvisioner.bootstrapSystemAdmin()
      await keycloakAdmin.setRealmSslRequired(config.keycloakRealm, config.keycloakRealmSslRequired)
      await keycloakAdmin.setRealmSslRequired(config.keycloakAdminRealm, config.keycloakRealmSslRequired)
      keycloakReady = true
      logger.info('Keycloak bootstrap completed successfully')
    } catch (error: any) {
      if (attempt < maxRetries) {
        logger.info({ attempt, maxRetries, error: error?.message }, `Waiting for Keycloak to be ready (attempt ${attempt}/${maxRetries})...`)
        await new Promise(resolve => setTimeout(resolve, retryDelayMs))
      } else {
        logger.warn({ error: error?.message }, 'Keycloak bootstrap failed after max retries (continuing without bootstrap)')
      }
    }
  }
  const createTenant = new CreateTenant(keycloakTenantProvisioner)

  // Initialize management controllers
  const cfDocumentsManagementController = new CFDocumentsManagementController(
    updateCFDocument,
    deleteCFDocument
  )
  const cfItemsManagementController = new CFItemsManagementController(
    updateCFItem,
    deleteCFItem
  )
  const cfAssociationsManagementController = new CFAssociationsManagementController(
    updateCFAssociation,
    deleteCFAssociation
  )
  const restoreFramework = new RestoreFramework(store)
  const cfPackagesManagementController = new CFPackagesManagementController(
    createFramework,
    importFramework,
    listFrameworks,
    deleteCFDocument,
    restoreFramework
  )
  const tenantsManagementController = new TenantsManagementController(
    listTenants,
    createTenant,
    config.caseDataDir
  )

  const apiKeysManagementController = new ApiKeysManagementController(keycloakAdmin, {
    clientIdPrefix: config.oidcClientIdPrefix
  })

  const tenantLookupController = new TenantLookupController(keycloakAdmin, {
    clientIdPrefix: config.oidcClientIdPrefix
  })

  return {
    config,
    logger,
    jwtVerifier,
    store,
    keycloakAdmin,
    controllers: {
      v1p0: {
        cfPackages: cfPackagesControllerV1p0,
        cfDocuments: cfDocumentsControllerV1p0,
        getAllCFDocuments: getAllCFDocumentsControllerV1p0,
        cfItems: cfItemsControllerV1p0,
        cfAssociations: cfAssociationsControllerV1p0,
        cfItemAssociations: cfItemAssociationsControllerV1p0,
        cfRubrics: cfRubricsControllerV1p0,
        cfSubjects: cfSubjectsControllerV1p0,
        cfConcepts: cfConceptsControllerV1p0,
        cfAssociationGroupings: cfAssociationGroupingsControllerV1p0,
        cfItemTypes: cfItemTypesControllerV1p0,
        cfLicenses: cfLicensesControllerV1p0,
        discovery: discoveryControllerV1p0
      },
      v1p1: {
        cfPackages: cfPackagesControllerV1p1,
        cfDocuments: cfDocumentsControllerV1p1,
        getAllCFDocuments: getAllCFDocumentsControllerV1p1,
        cfItems: cfItemsControllerV1p1,
        cfAssociations: cfAssociationsControllerV1p1,
        cfItemAssociations: cfItemAssociationsControllerV1p1,
        cfRubrics: cfRubricsControllerV1p1,
        cfSubjects: cfSubjectsControllerV1p1,
        cfConcepts: cfConceptsControllerV1p1,
        cfAssociationGroupings: cfAssociationGroupingsControllerV1p1,
        cfItemTypes: cfItemTypesControllerV1p1,
        cfLicenses: cfLicensesControllerV1p1,
        discovery: discoveryControllerV1p1
      },
      management: {
        cfDocuments: cfDocumentsManagementController,
        cfItems: cfItemsManagementController,
        cfAssociations: cfAssociationsManagementController,
        cfPackages: cfPackagesManagementController,
        tenants: tenantsManagementController,
        apiKeys: apiKeysManagementController
      },
      public: {
        tenantLookup: tenantLookupController
      }
    }
  }
}
