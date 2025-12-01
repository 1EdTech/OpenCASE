import { JsonSchemaValidator } from '../JsonSchemaValidator';

describe('JsonSchemaValidator', () => {
  let validator: JsonSchemaValidator;

  beforeEach(() => {
    validator = new JsonSchemaValidator();
  });

  describe('addSchema', () => {
    it('should add a schema successfully', () => {
      const schema = {
        type: 'object',
        properties: {
          name: { type: 'string' },
          age: { type: 'number' }
        },
        required: ['name']
      };

      expect(() => validator.addSchema('test-schema', schema)).not.toThrow();
    });

    it('should allow adding multiple schemas', () => {
      const schema1 = { type: 'object', properties: { name: { type: 'string' } } };
      const schema2 = { type: 'object', properties: { id: { type: 'string' } } };

      validator.addSchema('schema1', schema1);
      validator.addSchema('schema2', schema2);

      expect(() => validator.validate('schema1', { name: 'test' })).not.toThrow();
      expect(() => validator.validate('schema2', { id: 'test' })).not.toThrow();
    });
  });

  describe('validate', () => {
    beforeEach(() => {
      const schema = {
        type: 'object',
        properties: {
          name: { type: 'string' },
          age: { type: 'number' }
        },
        required: ['name']
      };
      validator.addSchema('test-schema', schema);
    });

    it('should validate data against schema successfully', () => {
      const data = { name: 'John', age: 30 };

      expect(() => validator.validate('test-schema', data)).not.toThrow();
    });

    it('should throw error for unknown schema', () => {
      const data = { name: 'John' };

      expect(() => validator.validate('unknown-schema', data)).toThrow('Unknown schema: unknown-schema');
    });

    it('should throw error when validation fails', () => {
      const invalidData = { age: 30 }; // missing required 'name'

      expect(() => validator.validate('test-schema', invalidData)).toThrow();
    });

    it('should throw error with details when validation fails', () => {
      const invalidData = { name: 123 }; // wrong type

      try {
        validator.validate('test-schema', invalidData);
        fail('Should have thrown an error');
      } catch (error: any) {
        expect(error).toBeInstanceOf(Error);
        expect(error.details).toBeDefined();
        expect(Array.isArray(error.details)).toBe(true);
      }
    });

    it('should validate nested objects', () => {
      const nestedSchema = {
        type: 'object',
        properties: {
          user: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              email: { type: 'string' }
            },
            required: ['name']
          }
        },
        required: ['user']
      };

      validator.addSchema('nested-schema', nestedSchema);

      const validData = {
        user: {
          name: 'John',
          email: 'john@example.com'
        }
      };

      expect(() => validator.validate('nested-schema', validData)).not.toThrow();
    });

    it('should validate arrays', () => {
      const arraySchema = {
        type: 'object',
        properties: {
          items: {
            type: 'array',
            items: { type: 'string' }
          }
        },
        required: ['items']
      };

      validator.addSchema('array-schema', arraySchema);

      const validData = { items: ['item1', 'item2'] };
      const invalidData = { items: [1, 2] };

      expect(() => validator.validate('array-schema', validData)).not.toThrow();
      expect(() => validator.validate('array-schema', invalidData)).toThrow();
    });
  });
});

