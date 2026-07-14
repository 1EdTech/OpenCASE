export interface CFPackageResponse {
  CFPackage: {
    CFDocument: any
    CFItems?: any[]
    CFAssociations?: any[]
    CFRubrics?: any[]
    CFDefinitions?: any
    extensions?: any
  }
}

/**
 * Normalizes a raw CFPackage JSON payload, accepting either CASE v1.1 shape
 * (data wrapped under a top-level `CFPackage` key) or CASE v1.0 shape
 * (CFDocument/CFItems/etc. flat at the top level).
 * @throws Error if neither shape is recognized (missing CFDocument)
 */
export function normalizeCfPackageData (data: any): CFPackageResponse['CFPackage'] {
  let cfPackage: CFPackageResponse['CFPackage']

  if (data.CFPackage) {
    // CASE v1.1 format: data wrapped in CFPackage
    cfPackage = data.CFPackage
  } else if (data.CFDocument) {
    // CASE v1.0 format: flat structure
    cfPackage = {
      CFDocument: data.CFDocument,
      CFItems: data.CFItems,
      CFAssociations: data.CFAssociations,
      CFRubrics: data.CFRubrics,
      CFDefinitions: data.CFDefinitions,
      extensions: data.extensions
    }
  } else {
    throw new Error('Invalid CFPackage data: missing CFDocument')
  }

  if (!cfPackage.CFDocument) {
    throw new Error('Invalid CFPackage data: missing CFDocument')
  }

  return cfPackage
}
