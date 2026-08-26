import { CFRubric } from '../CFRubric';
import { CaseVersion, TenantId } from '../../value-objects/Identifiers';

describe('CFRubric', () => {
  const tenantId: TenantId = 'test-tenant';
  const caseVersion: CaseVersion = '1.1';

  describe('fromRaw', () => {
    it('should generate a local uri when none is supplied', () => {
      const raw = {
        identifier: 'rubric-123',
        title: 'Test Rubric'
      };

      const rubric = CFRubric.fromRaw(tenantId, caseVersion, raw);

      expect(rubric.toJSON().uri).toBe('/ims/case/v1p1/CFRubrics/rubric-123');
    });

    it('should rewrite an absolute foreign-host uri to the local host on import (POR-730)', () => {
      const raw = {
        identifier: 'rubric-123',
        title: 'Test Rubric',
        uri: 'https://standards.example.org/ims/case/v1p0/CFRubrics/rubric-123'
      };

      const rubric = CFRubric.fromRaw(tenantId, caseVersion, raw);

      expect(rubric.toJSON().uri).toBe('/ims/case/v1p1/CFRubrics/rubric-123');
    });
  });
});
