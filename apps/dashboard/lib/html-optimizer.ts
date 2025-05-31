/**
 * HTML optimization utilities to reduce storage size
 */

/**
 * Strip base64 images from HTML content
 * Replaces them with placeholder text or external URL
 */
export function stripBase64Images(html: string): string {
  // Regex to match base64 image data URLs
  const base64Regex = /data:image\/[^;]+;base64,[^"'\s]+/gi
  
  // Replace base64 images with placeholder
  return html.replace(base64Regex, '[AFBEELDING VERWIJDERD]')
}

/**
 * Strip inline styles from HTML
 * Removes style attributes but preserves structure
 */
export function stripInlineStyles(html: string): string {
  // Remove style attributes
  const styleRegex = /\sstyle\s*=\s*["'][^"']*["']/gi
  return html.replace(styleRegex, '')
}

/**
 * Extract and save base64 images before stripping
 * Returns array of extracted images with metadata
 */
export function extractBase64Images(html: string): Array<{
  index: number
  dataUrl: string
  mimeType: string
  sizeEstimate: number
}> {
  const images: Array<{
    index: number
    dataUrl: string
    mimeType: string
    sizeEstimate: number
  }> = []
  
  const base64Regex = /data:image\/([^;]+);base64,([^"'\s]+)/gi
  let match
  let index = 0
  
  while ((match = base64Regex.exec(html)) !== null) {
    const mimeType = match[1]
    const base64Data = match[2]
    const dataUrl = match[0]
    
    // Estimate size (base64 is ~33% larger than binary)
    const sizeEstimate = Math.floor(base64Data.length * 0.75)
    
    images.push({
      index: index++,
      dataUrl,
      mimeType,
      sizeEstimate
    })
  }
  
  return images
}

/**
 * Optimize HTML for storage
 * Strips heavy content while preserving readability
 */
export function optimizeHtmlForStorage(
  html: string,
  options: {
    stripImages?: boolean
    stripStyles?: boolean
    preserveStructure?: boolean
  } = {}
): {
  optimizedHtml: string
  metadata: {
    originalSize: number
    optimizedSize: number
    imagesRemoved: number
    stylesRemoved: boolean
  }
} {
  const {
    stripImages = true,
    stripStyles = true,
    preserveStructure = true
  } = options
  
  const originalSize = new Blob([html]).size
  let optimizedHtml = html
  let imagesRemoved = 0
  
  // Strip base64 images
  if (stripImages) {
    const images = extractBase64Images(html)
    imagesRemoved = images.length
    optimizedHtml = stripBase64Images(optimizedHtml)
  }
  
  // Strip inline styles
  if (stripStyles) {
    optimizedHtml = stripInlineStyles(optimizedHtml)
  }
  
  // Remove excessive whitespace
  if (!preserveStructure) {
    optimizedHtml = optimizedHtml
      .replace(/\s+/g, ' ')
      .replace(/>\s+</g, '><')
      .trim()
  }
  
  const optimizedSize = new Blob([optimizedHtml]).size
  
  return {
    optimizedHtml,
    metadata: {
      originalSize,
      optimizedSize,
      imagesRemoved,
      stylesRemoved: stripStyles
    }
  }
}

/**
 * Check if HTML contains heavy content
 */
export function hasHeavyContent(html: string): {
  hasBase64Images: boolean
  hasInlineStyles: boolean
  estimatedSize: number
} {
  const hasBase64Images = /data:image\/[^;]+;base64,/i.test(html)
  const hasInlineStyles = /\sstyle\s*=\s*["']/i.test(html)
  const estimatedSize = new Blob([html]).size
  
  return {
    hasBase64Images,
    hasInlineStyles,
    estimatedSize
  }
}

/**
 * Get size reduction percentage
 */
export function calculateSizeReduction(originalSize: number, optimizedSize: number): number {
  if (originalSize === 0) return 0
  return Math.round(((originalSize - optimizedSize) / originalSize) * 100)
} 