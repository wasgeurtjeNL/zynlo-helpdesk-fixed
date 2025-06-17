/**
 * Sanitizes email content to prevent mixed content errors
 * Converts HTTP URLs to HTTPS where possible, or proxies them
 */

// Common domains that support HTTPS
const HTTPS_SAFE_DOMAINS = [
  'chromium.org',
  'google.com',
  'gmail.com',
  'outlook.com',
  'microsoft.com',
  'github.com',
  'stackoverflow.com',
  'youtube.com',
  'twitter.com',
  'facebook.com',
  'linkedin.com',
  'amazon.com',
  'wikipedia.org',
  'w3.org',
];

/**
 * Check if a domain likely supports HTTPS
 */
function isDomainLikelyHttps(url: string): boolean {
  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname.toLowerCase();

    // Check if it's a known HTTPS domain
    return HTTPS_SAFE_DOMAINS.some(
      (domain) => hostname.includes(domain) || hostname.endsWith(`.${domain}`)
    );
  } catch {
    return false;
  }
}

/**
 * Convert HTTP URLs to HTTPS where safe, or proxy through a secure endpoint
 */
export function sanitizeHttpUrls(content: string): string {
  // Regular expression to find all HTTP URLs
  const httpUrlRegex = /http:\/\/[^\s<>"']+/g;

  return content.replace(httpUrlRegex, (match) => {
    // If domain likely supports HTTPS, convert it
    if (isDomainLikelyHttps(match)) {
      return match.replace('http://', 'https://');
    }

    // For other domains, we could proxy through our own endpoint
    // For now, we'll strip the protocol to let the browser decide
    // This prevents mixed content errors while keeping the reference
    try {
      const url = new URL(match);
      // Return protocol-relative URL
      return `//${url.host}${url.pathname}${url.search}${url.hash}`;
    } catch {
      // If URL parsing fails, return the original
      return match;
    }
  });
}

/**
 * Sanitize email content for safe display
 */
export function sanitizeEmailContent(content: string): string {
  if (!content) return '';

  // First, fix mixed content issues
  let sanitized = sanitizeHttpUrls(content);

  // Additional sanitization can be added here
  // For example: XSS prevention, script removal, etc.

  return sanitized;
}

/**
 * Extract and sanitize URLs from content
 */
export function extractSafeUrls(content: string): string[] {
  const urlRegex = /(https?:\/\/[^\s<>"']+)/g;
  const matches = content.match(urlRegex) || [];

  return matches.map((url) => {
    if (url.startsWith('http://')) {
      if (isDomainLikelyHttps(url)) {
        return url.replace('http://', 'https://');
      }
      // Return protocol-relative URL
      try {
        const urlObj = new URL(url);
        return `//${urlObj.host}${urlObj.pathname}${urlObj.search}${urlObj.hash}`;
      } catch {
        return url;
      }
    }
    return url;
  });
}
