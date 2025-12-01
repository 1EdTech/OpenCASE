import Ajv, { ValidateFunction } from 'ajv';

export class JsonSchemaValidator {
  private readonly ajv = new Ajv({ allErrors: true, strict: false });
  private readonly validators = new Map<string, ValidateFunction>();

  addSchema(name: string, schema: object) {
    const validate = this.ajv.compile(schema);
    this.validators.set(name, validate);
  }

  validate(name: string, data: unknown) {
    const v = this.validators.get(name);
    if (!v) throw new Error(`Unknown schema: ${name}`);
    const ok = v(data);
    if (!ok) {
      const message = this.ajv.errorsText(v.errors ?? []);
      const err: any = new Error(message);
      err.details = v.errors;
      throw err;
    }
  }
}

