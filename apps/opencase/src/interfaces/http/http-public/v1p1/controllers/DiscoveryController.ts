import type { Request, Response, RequestHandler } from 'express'
import { getBaseUrl } from '../utils/httpUtils'
import { generateOpenApiFromJSDoc } from '../../../../../infrastructure/http/swagger'

export class DiscoveryControllerV1p1 {
  getOpenAPISpec: RequestHandler = (req: Request, res: Response) => {
    const baseUrl = getBaseUrl(req)

    const spec = generateOpenApiFromJSDoc({
      baseUrl,
      caseVersion: '1.1',
      version: '1.0.0'
    })

    // Set appropriate content type
    res.setHeader('Content-Type', 'application/json')
    res.json(spec)
  }
}
