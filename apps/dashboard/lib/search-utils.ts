/**
 * Utility functions for safe search parameter handling
 */

/**
 * Escape special characters in search terms for safe SQL LIKE queries
 * This prevents SQL injection and ensures special characters are treated literally
 */
export function escapeSearchTerm(term: string): string {
  // Escape special characters used in LIKE patterns
  return term
    .replace(/\\/g, '\\\\') // Escape backslash first
    .replace(/%/g, '\\%')   // Escape percent
    .replace(/_/g, '\\_')   // Escape underscore
    .replace(/'/g, "''")    // Escape single quote
}

/**
 * Sanitize search input by removing potentially dangerous characters
 * and limiting length
 */
export function sanitizeSearchInput(input: string): string {
  // Remove any null bytes
  let sanitized = input.replace(/\0/g, '')
  
  // Trim whitespace
  sanitized = sanitized.trim()
  
  // Limit length to prevent DoS
  const MAX_SEARCH_LENGTH = 100
  if (sanitized.length > MAX_SEARCH_LENGTH) {
    sanitized = sanitized.substring(0, MAX_SEARCH_LENGTH)
  }
  
  return sanitized
}

/**
 * Build a safe ILIKE pattern for Supabase queries
 */
export function buildSearchPattern(term: string): string {
  const sanitized = sanitizeSearchInput(term)
  const escaped = escapeSearchTerm(sanitized)
  return `%${escaped}%`
} 