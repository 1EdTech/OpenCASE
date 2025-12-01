import { Request, Response } from 'express';
import { GetCFPackage } from '../../../../../application/case/queries/GetCFPackage';

export class CFPackagesControllerV1p1 {
  constructor(private readonly getCFPackage: GetCFPackage) {}

  getById = async (req: Request, res: Response) => {
    const tenantId = (req as any).tenantId ?? 'demo';
    const docId = req.params.id;

    const result = await this.getCFPackage.execute({
      tenantId,
      caseVersion: '1.1',
      docId
    });

    if (!result) {
      return res.status(404).json({ error: 'CFPackage not found' });
    }

    res.json(result);
  };
}

