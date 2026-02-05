import { FileFrameworkStore } from '../../infrastructure/persistence/file/FileFrameworkStore'
import { FileCFPackageRepository } from '../../infrastructure/persistence/file/FileCFPackageRepository'
import { CaseApiClient } from '../../infrastructure/http/CaseApiClient'
import { JsonSchemaValidator } from '../../infrastructure/validation/JsonSchemaValidator'
import { ImportFrameworkFromEndpoint } from '../case/endpoints/ImportFrameworkFromEndpoint'
import { loadConfig } from '../../infrastructure/config/Config'

async function main () {
  const args = process.argv.slice(2)

  if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
    console.log(`
Usage: npm run import-framework -- <url> [options]

Arguments:
  <url>                    The CASE API endpoint URL to import from
                           (e.g., https://example.com/ims/case/v1p1/CFPackages/doc-123)

Options:
  --tenant-id <id>         Tenant ID (default: demo)
  --case-version <version> CASE version: 1.0 or 1.1 (default: 1.1)
  --access-token <token>   Optional Bearer token for endpoint authentication
  --validate-schema        Enable JSON schema validation
  --schema-name <name>     Schema name to use for validation (required if --validate-schema)

Examples:
  npm run import-framework -- https://case.example.com/ims/case/v1p1/CFPackages/doc-123
  npm run import-framework -- https://case.example.com/ims/case/v1p1/CFPackages/doc-123 --tenant-id my-tenant
  npm run import-framework -- https://case.example.com/ims/case/v1p1/CFPackages/doc-123 --access-token abc123
`)
    process.exit(0)
  }

  const url = args[0]
  let tenantId = 'demo'
  let caseVersion: '1.0' | '1.1' = '1.1'
  let accessToken: string | undefined
  let validateSchema = false
  let schemaName: string | undefined

  // Parse arguments
  for (let i = 1; i < args.length; i++) {
    const arg = args[i]
    const nextArg = args[i + 1]

    switch (arg) {
      case '--tenant-id':
        if (nextArg) {
          tenantId = nextArg
          i++
        } else {
          console.error('Error: --tenant-id requires a value')
          process.exit(1)
        }
        break
      case '--case-version':
        if (nextArg && (nextArg === '1.0' || nextArg === '1.1')) {
          caseVersion = nextArg as '1.0' | '1.1'
          i++
        } else {
          console.error('Error: --case-version must be 1.0 or 1.1')
          process.exit(1)
        }
        break
      case '--access-token':
        if (nextArg) {
          accessToken = nextArg
          i++
        } else {
          console.error('Error: --access-token requires a value')
          process.exit(1)
        }
        break
      case '--validate-schema':
        validateSchema = true
        break
      case '--schema-name':
        if (nextArg) {
          schemaName = nextArg
          i++
        } else {
          console.error('Error: --schema-name requires a value')
          process.exit(1)
        }
        break
      default:
        console.error(`Error: Unknown option: ${arg}`)
        console.error('Run with --help for usage information')
        process.exit(1)
    }
  }

  // Validate URL
  try {
    new URL(url)
  } catch {
    console.error(`Error: Invalid URL: ${url}`)
    process.exit(1)
  }

  // Validate schema options
  if (validateSchema && !schemaName) {
    console.error('Error: --schema-name is required when --validate-schema is used')
    process.exit(1)
  }

  try {
    console.log(`Importing CASE framework from: ${url}`)
    console.log(`Tenant ID: ${tenantId}`)
    console.log(`CASE Version: ${caseVersion}`)
    if (accessToken) {
      console.log('Using access token for authentication')
    }
    if (validateSchema) {
      console.log(`Validating against schema: ${schemaName}`)
    }
    console.log('')

    // Load config and initialize components
    const config = loadConfig()
    const store = new FileFrameworkStore({ baseDataDir: config.caseDataDir })
    await store.loadAll()

    const pkgRepo = new FileCFPackageRepository(store)
    const caseApiClient = new CaseApiClient({ timeout: 30000 })
    const jsonSchemaValidator = new JsonSchemaValidator()

    const importCommand = new ImportFrameworkFromEndpoint(
      pkgRepo,
      caseApiClient,
      jsonSchemaValidator
    )

    const result = await importCommand.execute({
      tenantId,
      caseVersion,
      endpointUrl: url,
      accessToken,
      validateSchema,
      schemaName
    })

    console.log('✓ Framework imported successfully!')
    console.log(`  Document ID: ${result.docId}`)
    console.log(`  Version: ${result.version}`)
    process.exit(0)
  } catch (error: any) {
    console.error('✗ Import failed:')
    console.error(`  ${error.message}`)
    if (error.details) {
      console.error('  Validation details:', error.details)
    }
    process.exit(1)
  }
}

main().catch(err => {
  console.error('Fatal error:', err)
  process.exit(1)
})













