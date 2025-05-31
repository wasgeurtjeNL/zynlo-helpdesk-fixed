import DOMPurify from 'isomorphic-dompurify'
import type { Config as DOMPurifyConfig } from 'dompurify'

export interface HtmlContentOptions {
  allowedTags?: string[]
  allowedAttributes?: string[]
  safeMode?: boolean
  detectHtml?: boolean
}

const DEFAULT_ALLOWED_TAGS = [
  // Text content
  'a', 'abbr', 'b', 'blockquote', 'br', 'code', 'del', 'div', 'em', 'h1', 'h2', 'h3', 
  'h4', 'h5', 'h6', 'hr', 'i', 'img', 'ins', 'li', 'ol', 'p', 'pre', 'q', 's', 
  'small', 'span', 'strong', 'sub', 'sup', 'u', 'ul',
  // Tables
  'table', 'tbody', 'td', 'tfoot', 'th', 'thead', 'tr',
  // Layout (common in emails)
  'center', 'font', 'section', 'article', 'aside', 'header', 'footer', 'main', 'nav',
  // Media
  'picture', 'source', 'video', 'audio', 'track',
  // Forms (sometimes in emails)
  'button', 'label',
  // Style
  'style'
]

const DEFAULT_ALLOWED_ATTRIBUTES = [
  // Links and references
  'href', 'title', 'target', 'rel', 'download',
  // Images and media
  'src', 'alt', 'width', 'height', 'loading', 'srcset', 'sizes',
  // Styling
  'class', 'id', 'style', 'bgcolor', 'color', 'align', 'valign',
  // Tables
  'colspan', 'rowspan', 'cellpadding', 'cellspacing', 'border',
  // Layout
  'dir', 'lang', 'role', 'aria-label', 'aria-hidden', 'aria-describedby',
  // Data attributes (common in email tracking)
  'data-*'
]

/**
 * Detects if a string contains HTML tags
 */
export function detectHtmlContent(content: string): boolean {
  // Check for common HTML patterns
  const htmlPatterns = [
    /<[a-z][\s\S]*>/i,                    // Basic HTML tag
    /<\/[a-z]+>/i,                        // Closing tag
    /<!DOCTYPE\s+html>/i,                 // DOCTYPE
    /<html[\s>]/i,                        // HTML tag
    /<head[\s>]/i,                        // Head tag
    /<body[\s>]/i,                        // Body tag
    /<(p|div|span|a|img|br|hr|table|td|tr)[\s/>]/i,  // Common tags
    /&(nbsp|lt|gt|amp|quot|#\d+|#x[\da-f]+);/i  // HTML entities
  ]
  
  return htmlPatterns.some(pattern => pattern.test(content))
}

/**
 * Determines if content should be rendered as HTML based on content type and detection
 */
export function shouldRenderAsHtml(
  content: string, 
  contentType?: string,
  forceDetection: boolean = true
): boolean {
  // If content type explicitly says HTML, render as HTML
  if (contentType?.toLowerCase().includes('text/html')) {
    return true
  }
  
  // If force detection is enabled, check content for HTML
  if (forceDetection) {
    return detectHtmlContent(content)
  }
  
  return false
}

/**
 * Sanitizes HTML content to prevent XSS attacks
 */
export function sanitizeHtml(html: string, options: HtmlContentOptions = {}): string {
  // Less strict DOMPurify configuration to preserve email content
  const config: DOMPurifyConfig = {
    ALLOWED_TAGS: [
      // Text content
      'p', 'br', 'span', 'div', 'a', 'b', 'i', 'u', 'strong', 'em', 'small', 'big',
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      // Lists
      'ul', 'ol', 'li', 'dl', 'dt', 'dd',
      // Formatting
      'blockquote', 'pre', 'code', 'kbd', 'samp', 'var',
      // Tables
      'table', 'thead', 'tbody', 'tfoot', 'tr', 'th', 'td', 'caption', 'col', 'colgroup',
      // Media
      'img', 'picture', 'source', 'figure', 'figcaption',
      // Layout
      'hr', 'sub', 'sup', 's', 'del', 'ins', 'mark', 'abbr', 'cite',
      // Common email elements
      'center', 'font', 'section', 'article', 'aside', 'header', 'footer', 'main', 'nav',
      // Forms (for buttons in emails)
      'button',
      // Style tag for email formatting
      'style'
    ],
    ALLOWED_ATTR: [
      'href', 'src', 'alt', 'title', 'width', 'height',
      'target', 'rel', 'colspan', 'rowspan', 'headers',
      'cite', 'datetime', 'dir', 'lang', 'align', 'valign',
      // Keep styling for email layout
      'cellpadding', 'cellspacing', 'border',
      'style', 'class', 'id', 'bgcolor', 'background', 'color'
    ],
    // Only forbid actually dangerous tags
    FORBID_TAGS: ['script', 'iframe', 'object', 'embed', 'form', 'input', 'textarea', 'select'],
    FORBID_ATTR: ['onclick', 'onload', 'onerror', 'onmouseover', 'onfocus', 'onblur'],
    ALLOW_DATA_ATTR: true,
    FORCE_BODY: true,
    KEEP_CONTENT: true,
    WHOLE_DOCUMENT: false,
    RETURN_DOM: false,
    RETURN_DOM_FRAGMENT: false,
    RETURN_TRUSTED_TYPE: false,
    SANITIZE_DOM: true,
    IN_PLACE: false,
  }

  if (options.safeMode) {
    // Even stricter configuration for safe mode
    config.ALLOWED_TAGS = ['p', 'br', 'span', 'b', 'i', 'u', 'strong', 'em']
    config.ALLOWED_ATTR = []
  }

  // Only remove script tags - keep all other content
  let processedHtml = html
  
  // Remove all <script> tags and their content
  processedHtml = processedHtml.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')

  return DOMPurify.sanitize(processedHtml, config) as string
}

/**
 * Prepares content for rendering, handling both plain text and HTML
 */
export function prepareMessageContent(
  content: string,
  contentType?: string,
  options: HtmlContentOptions = {}
): {
  isHtml: boolean
  content: string
  sanitized: boolean
} {
  const shouldBeHtml = shouldRenderAsHtml(content, contentType, options.detectHtml !== false)
  
  if (shouldBeHtml) {
    return {
      isHtml: true,
      content: sanitizeHtml(content, options),
      sanitized: true
    }
  }
  
  // For plain text, convert line breaks to <br> for better formatting
  const escapedContent = content
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
    .replace(/\n/g, '<br />')
  
  return {
    isHtml: false,
    content: escapedContent,
    sanitized: false
  }
}

/**
 * Extracts plain text from HTML content for preview purposes
 */
export function extractTextFromHtml(html: string, maxLength?: number): string {
  const cleaned = DOMPurify.sanitize(html, { 
    ALLOWED_TAGS: [], 
    KEEP_CONTENT: true 
  })
  
  // Remove extra whitespace
  const text = cleaned
    .replace(/\s+/g, ' ')
    .trim()
  
  if (maxLength && text.length > maxLength) {
    return text.substring(0, maxLength) + '...'
  }
  
  return text
} 