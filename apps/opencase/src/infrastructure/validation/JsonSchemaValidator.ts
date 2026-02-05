import addFormats from 'ajv-formats'
import Ajv, { type ValidateFunction } from 'ajv'

export class JsonSchemaValidator {
  private readonly ajv = addFormats(new Ajv({ 
    allErrors: true, 
    strict: false,
    // Support both draft-07 (definitions) and draft-2019-09 ($defs)
    strictSchema: false
  }))
  private readonly validators = new Map<string, ValidateFunction>()

  /**
   * Check if a schema is registered
   */
  hasSchema (name: string): boolean {
    return this.validators.has(name)
  }

  /**
   * Get list of registered schema names
   */
  getRegisteredSchemas (): string[] {
    return Array.from(this.validators.keys())
  }

  addSchema (name: string, schema: object): void {
    try {
      // Transform $defs to definitions for compatibility if needed
      const transformedSchema = this.transformSchema(schema)
      const validate = this.ajv.compile(transformedSchema)
      this.validators.set(name, validate)
    } catch (error: any) {
      throw new Error(`Failed to compile schema '${name}': ${error.message}`)
    }
  }

  /**
   * Transforms schema from draft-2019-09 ($defs) to draft-07 (definitions) format
   * for AJV compatibility, while preserving the original structure
   */
  private transformSchema(schema: any): any {
    if (!schema || typeof schema !== 'object') return schema
    
    const transformed = { ...schema }
    
    // Transform $schema from draft-2019-09 to draft-07 for AJV compatibility
    if (transformed.$schema === 'https://json-schema.org/draft/2019-09/schema#') {
      transformed.$schema = 'http://json-schema.org/draft-07/schema#'
    }
    
    // Convert $defs to definitions for AJV compatibility (must happen before recursive transform)
    if (transformed.$defs && !transformed.definitions) {
      transformed.definitions = transformed.$defs
      // Recursively transform nested schemas in $defs as well
      if (typeof transformed.definitions === 'object') {
        const transformedDefs: any = {}
        for (const key in transformed.definitions) {
          transformedDefs[key] = this.transformSchema(transformed.definitions[key])
        }
        transformed.definitions = transformedDefs
      }
    }
    
    // Transform $ref references from #/$defs/ to #/definitions/
    if (transformed.$ref && typeof transformed.$ref === 'string') {
      transformed.$ref = transformed.$ref.replace('#/$defs/', '#/definitions/')
    }
    
    // Recursively transform nested schemas
    if (transformed.properties) {
      for (const key in transformed.properties) {
        transformed.properties[key] = this.transformSchema(transformed.properties[key])
      }
    }
    
    if (transformed.items) {
      if (typeof transformed.items === 'object') {
        transformed.items = this.transformSchema(transformed.items)
      } else if (Array.isArray(transformed.items)) {
        transformed.items = transformed.items.map((s: any) => this.transformSchema(s))
      }
    }
    
    if (Array.isArray(transformed.oneOf)) {
      transformed.oneOf = transformed.oneOf.map((s: any) => this.transformSchema(s))
    }
    
    if (Array.isArray(transformed.allOf)) {
      transformed.allOf = transformed.allOf.map((s: any) => this.transformSchema(s))
    }
    
    if (Array.isArray(transformed.anyOf)) {
      transformed.anyOf = transformed.anyOf.map((s: any) => this.transformSchema(s))
    }
    
    // Transform definitions recursively if they exist
    if (transformed.definitions && typeof transformed.definitions === 'object') {
      const transformedDefs: any = {}
      for (const key in transformed.definitions) {
        transformedDefs[key] = this.transformSchema(transformed.definitions[key])
      }
      transformed.definitions = transformedDefs
    }
    
    return transformed
  }

  validate (name: string, data: unknown): void {
    const v = this.validators.get(name)
    if (!v) throw new Error(`Unknown schema: ${name}`)
    const ok = v(data)
    if (!ok) {
      const message = this.ajv.errorsText(v.errors ?? [])
      const err: any = new Error(message)
      err.details = v.errors
      throw err
    }
  }
}
