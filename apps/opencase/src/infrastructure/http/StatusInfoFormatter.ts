/**
 * Utility for formatting CASE v1p1 compliant error responses using imsx_StatusInfo structure
 */

export type CodeMinorValue =
  | 'fullsuccess'
  | 'invalid_sort_field'
  | 'invalid_selection_field'
  | 'forbidden'
  | 'unauthorised_request'
  | 'internal_server_error'
  | 'unknownobject'
  | 'server_busy'
  | 'invalid_uuid'

export interface StatusInfoResponse {
  imsx_codeMajor: 'success' | 'processing' | 'failure' | 'unsupported'
  imsx_severity: 'status' | 'warning' | 'error'
  imsx_description?: string
  imsx_codeMinor?: {
    imsx_codeMinorField: Array<{
      imsx_codeMinorFieldName: string
      imsx_codeMinorFieldValue: CodeMinorValue
    }>
  }
}

export class StatusInfoFormatter {
  static error(
    codeMinor: CodeMinorValue,
    description?: string,
    fieldName: string = 'CASE Service'
  ): StatusInfoResponse {
    return {
      imsx_codeMajor: 'failure',
      imsx_severity: 'error',
      imsx_description: description,
      imsx_codeMinor: {
        imsx_codeMinorField: [
          {
            imsx_codeMinorFieldName: fieldName,
            imsx_codeMinorFieldValue: codeMinor
          }
        ]
      }
    }
  }

  static notFound(description?: string): StatusInfoResponse {
    return this.error('unknownobject', description || 'The requested resource was not found.')
  }

  static invalidUUID(description?: string): StatusInfoResponse {
    return this.error('invalid_uuid', description || 'The supplied identifier is not a valid UUID.')
  }

  static unauthorized(description?: string): StatusInfoResponse {
    return this.error('unauthorised_request', description || 'The request was not correctly authorised.')
  }

  static forbidden(description?: string): StatusInfoResponse {
    return this.error('forbidden', description || 'The server refuses to take any further action.')
  }

  static invalidSelectionField(description?: string): StatusInfoResponse {
    return this.error('invalid_selection_field', description || 'An invalid selection field was supplied.')
  }

  static serverBusy(description?: string): StatusInfoResponse {
    return this.error('server_busy', description || 'The server is receiving too many requests. Retry at a later time.')
  }

  static internalError(description?: string): StatusInfoResponse {
    return this.error('internal_server_error', description || 'An internal server error occurred.')
  }
}













