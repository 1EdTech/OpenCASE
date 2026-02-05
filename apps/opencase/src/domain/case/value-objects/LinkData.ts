import { CaseVersion } from './Identifiers'

/**
 * Link Data structure as defined in CASE v1p1 specification
 * Used for URI references that require title, identifier, and uri
 */
export interface LinkData {
  title: string
  identifier: string
  uri: string
  targetType?: string // v1.1 addition
}

export class LinkDataHelper {
  /**
   * Validates that an identifier is a valid UUID format
   * UUID format: 8-4-4-4-12 hexadecimal characters (lowercase preferred)
   */
  static isValidUUID(identifier: string): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    return uuidRegex.test(identifier)
  }

  /**
   * Validates that a LinkData object conforms to LinkURI requirements (UUID identifier)
   * Throws an error if validation fails
   */
  static validateLinkURI(linkData: LinkData, fieldName: string): void {
    if (!this.isValidUUID(linkData.identifier)) {
      throw new Error(
        `${fieldName} must use LinkURI format with a valid UUID identifier. ` +
        `Got identifier: "${linkData.identifier}". ` +
        `Expected format: 8-4-4-4-12 hexadecimal characters (e.g., 550e8400-e29b-41d4-a716-446655440000)`
      )
    }
  }

  /**
   * Creates a link data object from a URI string
   * If full link data is provided, uses it; otherwise constructs from URI
   */
  static fromURI(uri: string, identifier?: string, title?: string): LinkData {
    return {
      title: title || identifier || uri,
      identifier: identifier || this.extractIdFromURI(uri),
      uri
    }
  }

  /**
   * Creates link data from an object (handles both full link data and simple URI strings)
   */
  static fromRaw(raw: string | LinkData | undefined): LinkData | undefined {
    if (!raw) return undefined
    if (typeof raw === 'string') {
      return this.fromURI(raw)
    }
    if (raw.title && raw.identifier && raw.uri) {
      return raw as LinkData
    }
    return undefined
  }

  /**
   * Extracts an identifier from a URI (last segment or UUID pattern)
   */
  static extractIdFromURI(uri: string): string {
    // Try to extract UUID or last path segment
    const uuidMatch = uri.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i)
    if (uuidMatch) return uuidMatch[0]
    
    const segments = uri.split('/').filter(s => s)
    return segments[segments.length - 1] || uri
  }

  /**
   * Creates link data for a CFDocument reference
   */
  static forDocument(uri: string, identifier: string, title: string): LinkData {
    return { title, identifier, uri }
  }

  /**
   * Creates link data for a CFItem reference
   */
  static forItem(uri: string, identifier: string, title?: string): LinkData {
    return { title: title || identifier, identifier, uri }
  }
}

/**
 * URN Case URI utilities for handling urn:case:* format URIs
 */
export class UrnCaseUriHelper {
  /**
   * Checks if a URI is a URN Case URI (starts with urn:case:)
   */
  static isUrnCaseUri(uri: string): boolean {
    return typeof uri === 'string' && uri.startsWith('urn:case:')
  }

  /**
   * Parses a URN Case URI to extract type and identifier
   * Format: urn:case:{type}:{identifier}
   * Example: urn:case:item:tu_7d097707-1122-474b-9944-d3aace336b35
   * Returns: { type: 'item', identifier: '7d097707-1122-474b-9944-d3aace336b35' }
   */
  static parseUrnCaseUri(uri: string): { type: 'item' | 'document' | 'association' | 'package', identifier: string } | null {
    if (!this.isUrnCaseUri(uri)) {
      return null
    }

    // Parse format: urn:case:{type}:{identifier}
    const match = uri.match(/^urn:case:(item|document|association|package):(.+)$/i)
    if (!match) {
      return null
    }

    const [, typeStr, identifierWithPrefix] = match
    const type = typeStr.toLowerCase() as 'item' | 'document' | 'association' | 'package'

    // Extract identifier, stripping any prefixes like "tu_"
    // Try to find UUID pattern first (8-4-4-4-12 hex format)
    const uuidMatch = identifierWithPrefix.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i)
    if (uuidMatch) {
      return { type, identifier: uuidMatch[0] }
    }

    // If no UUID found, use the identifier as-is (after any prefix)
    // Remove common prefixes like "tu_", "id_", etc.
    const cleanedIdentifier = identifierWithPrefix.replace(/^[a-z]+_/i, '')
    return { type, identifier: cleanedIdentifier || identifierWithPrefix }
  }

  /**
   * Converts a URN Case URI to a relative CASE path
   * Example: urn:case:item:abc-123 → /ims/case/v1p1/CFItems/abc-123
   */
  static urnCaseToRelativePath(urn: string, caseVersion: CaseVersion): string {
    const parsed = this.parseUrnCaseUri(urn)
    if (!parsed) {
      // If not a valid URN, return as-is
      return urn
    }

    const basePath = caseVersion === '1.1' ? '/ims/case/v1p1' : '/ims/case/v1p0'
    
    // Map type to CASE entity path
    const typeMap: Record<'item' | 'document' | 'association' | 'package', string> = {
      item: 'CFItems',
      document: 'CFDocuments',
      association: 'CFAssociations',
      package: 'CFPackages'
    }

    const entityPath = typeMap[parsed.type]
    return `${basePath}/${entityPath}/${parsed.identifier}`
  }

  /**
   * Transforms a URI if it's a URN Case URI, otherwise returns it unchanged
   * This is a convenience method for use in fromRaw() methods
   */
  static transformUrnIfPresent(uri: string | undefined, caseVersion: CaseVersion): string | undefined {
    if (!uri || !this.isUrnCaseUri(uri)) {
      return uri
    }
    return this.urnCaseToRelativePath(uri, caseVersion)
  }
}

