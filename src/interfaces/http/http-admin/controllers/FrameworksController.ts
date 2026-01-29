import { Request, Response } from 'express'
import { CreateFramework } from '../../../../application/case/endpoints/CreateFramework'
import { DeleteCFDocument } from '../../../../application/case/endpoints/DeleteCFDocument'
import { ImportFrameworkFromEndpoint } from '../../../../application/case/endpoints/ImportFrameworkFromEndpoint'

export class FrameworksController {
  constructor(
    private readonly createFramework: CreateFramework,
    private readonly importFramework: ImportFrameworkFromEndpoint,
    private readonly deleteCFDocument: DeleteCFDocument
  ) {}

  create = async (req: Request, res: Response) => {
    const tenantId = req.params.tenantId
    const caseVersion = (req.query.caseVersion as '1.0' | '1.1') ?? '1.1'

    try {
      const result = await this.createFramework.execute({
        tenantId,
        caseVersion,
        payload: req.body
      })

      const statusCode = result.status === 'unchanged' ? 200 : 201
      res.status(statusCode).json(result)
    } catch (error: any) {
      if (error.message?.includes('Schema validation failed')) {
        return res.status(400).json({
          error: 'validation_failed',
          message: error.message
        })
      }
      return res.status(400).json({
        error: 'creation_failed',
        message: error.message || 'Failed to create framework'
      })
    }
  }

  importFromEndpoint = async (req: Request, res: Response) => {
    const tenantId = req.params.tenantId
    const caseVersion = (req.query.caseVersion as '1.0' | '1.1') ?? '1.1'
    const { endpointUrl, accessToken, validateSchema, schemaName } = req.body

    if (!endpointUrl) {
      return res.status(400).json({ error: 'endpointUrl is required' })
    }

    try {
      const result = await this.importFramework.execute({
        tenantId,
        caseVersion,
        endpointUrl,
        accessToken,
        validateSchema: validateSchema ?? false,
        schemaName
      })

      res.status(201).json({
        status: 'imported',
        docId: result.docId,
        version: result.version
      })
    } catch (error: any) {
      res.status(400).json({
        error: 'import_failed',
        message: error.message
      })
    }
  }

  delete = async (req: Request, res: Response) => {
    const tenantId = req.params.tenantId
    const docId = req.params.docId
    const caseVersion = (req.query.caseVersion as '1.0' | '1.1') ?? '1.1'

    try {
      await this.deleteCFDocument.execute({
        tenantId,
        caseVersion,
        sourcedId: docId
      })

      return res.status(200).json({ status: 'deleted', docId })
    } catch (error: any) {
      const msg = error?.message || 'Delete failed'
      const status = msg.includes('not found') ? 404 : 400
      return res.status(status).json({ error: 'delete_failed', message: msg })
    }
  }
}
