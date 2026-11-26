import path from 'node:path'
import { OpenAPISpecGenerator } from './OpenAPISpecGenerator'

export type SwaggerCaseVersion = '1.0' | '1.1'

// swagger-jsdoc may not ship perfect TS types in all environments; keep the integration loose.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const swaggerJSDoc = require('swagger-jsdoc') as (opts: any) => any

export function generateOpenApiFromJSDoc (opts: { baseUrl: string, caseVersion: SwaggerCaseVersion, version: string }): any {
  const { baseUrl, caseVersion, version } = opts

  const srcRoot = path.join(process.cwd(), 'src')

  const publicRoutesFile =
    caseVersion === '1.0'
      ? path.join(srcRoot, 'interfaces/http/http-public/v1p0/routes.ts')
      : path.join(srcRoot, 'interfaces/http/http-public/v1p1/routes.ts')

  const apis = [
    publicRoutesFile,
    path.join(srcRoot, 'interfaces/http/http-management/routes.ts')
  ]

  const definition = {
    openapi: '3.0.0',
    info: {
      title: 'CASE Service API',
      description: `Competencies and Academic Standards Exchange (CASE) Service Version ${caseVersion}`,
      version: version || '1.0.0',
      'x-1edtech-spec-version': caseVersion
    },
    servers: [{ url: baseUrl, description: 'CASE Service Provider' }],
    // All runtime routes except the discovery JSON itself are protected by Bearer JWT.
    security: [{ BearerAuth: [] }],
    components: {
      securitySchemes: {
        BearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'JWT token obtained from an external OIDC provider (e.g., Keycloak)'
        }
      }
    }
  }

  const spec = swaggerJSDoc({ definition, apis })

  // Reuse the existing schema/component generation so we don't have to duplicate CASE schema definitions in JSDoc.
  // This keeps swagger-jsdoc focused on "what routes exist" while schemas remain centralized.
  const componentsSource =
    caseVersion === '1.0'
      ? OpenAPISpecGenerator.generateV1p0({ baseUrl, version })
      : OpenAPISpecGenerator.generateV1p1({ baseUrl, version })

  spec.components = {
    ...(spec.components ?? {}),
    ...(componentsSource.components ?? {})
  }

  // Ensure the server URL is always the runtime baseUrl
  spec.servers = [{ url: baseUrl, description: 'CASE Service Provider' }]

  return spec
}

