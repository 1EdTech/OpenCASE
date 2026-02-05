import type { Request, Response, RequestHandler } from 'express'
import { getBaseUrl } from '../utils/httpUtils'
import { generateOpenApiFromJSDoc } from '../../../../../infrastructure/http/swagger'

export class DiscoveryControllerV1p0 {
  getOpenAPISpec: RequestHandler = (req: Request, res: Response) => {
    const baseUrl = getBaseUrl(req)
    const spec = generateOpenApiFromJSDoc({
      baseUrl,
      caseVersion: '1.0',
      version: '1.0.0'
    })
    res.setHeader('Content-Type', 'application/json')
    res.json(spec)
  }
}

