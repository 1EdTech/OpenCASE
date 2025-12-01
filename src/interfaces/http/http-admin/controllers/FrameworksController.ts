import { Request, Response } from 'express';
import { CreateFramework } from '../../../../application/case/commands/CreateFramework';

export class FrameworksController {
  constructor(private readonly createFramework: CreateFramework) {}

  create = async (req: Request, res: Response) => {
    const tenantId = req.params.tenantId;
    const caseVersion = (req.query.caseVersion as '1.0' | '1.1') ?? '1.1';

    // TODO: validate req.body against CASE JSON Schema via JsonSchemaValidator

    await this.createFramework.execute({
      tenantId,
      caseVersion,
      payload: req.body
    });

    res.status(201).json({ status: 'created' });
  };
}

