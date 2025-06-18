'use client';

import { useMemo, useState, useEffect } from 'react';
import {
  Shield,
  ShieldOff,
  Eye,
  EyeOff,
  AlertTriangle,
  Loader2,
  Paperclip,
  Download,
  FileText,
  Image as ImageIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useMessageAttachments } from '@zynlo/supabase';
import { sanitizeHtmlForHttps } from '@/lib/html-optimizer';
import DOMPurify from 'isomorphic-dompurify';

interface MessageContentProps {
  content: string;
  contentType?: string;
  className?: string;
  safeMode?: boolean;
  showControls?: boolean;
  messageId?: string;
  attachments?: any[];
}

interface ProcessedContent {
  displayContent: string;
  isHtml: boolean;
  sanitized: boolean;
  plainText: string;
  error?: string;
}

/**
 * Detect if content contains HTML
 */
function detectHtmlContent(content: string): boolean {
  if (!content || typeof content !== 'string') return false;

  const htmlPatterns = [
    /<[a-z][\s\S]*>/i, // Basic HTML tag
    /<\/[a-z]+>/i, // Closing tag
    /<!DOCTYPE/i, // DOCTYPE
    /<html[\s>]/i, // HTML tag
    /<body[\s>]/i, // Body tag
    /<(p|div|span|a|img|br|hr|table|td|tr)[\s/>]/i, // Common tags
    /&(nbsp|lt|gt|amp|quot|#\d+|#x[\da-f]+);/i, // HTML entities
  ];

  return htmlPatterns.some((pattern) => pattern.test(content));
}

/**
 * Sanitize HTML content safely
 */
function sanitizeHtml(html: string): string {
  const config = {
    ALLOWED_TAGS: [
      'p',
      'br',
      'span',
      'div',
      'a',
      'b',
      'i',
      'u',
      'strong',
      'em',
      'small',
      'big',
      'h1',
      'h2',
      'h3',
      'h4',
      'h5',
      'h6',
      'ul',
      'ol',
      'li',
      'blockquote',
      'pre',
      'table',
      'thead',
      'tbody',
      'tr',
      'th',
      'td',
      'img',
      'hr',
      'center',
      'font',
    ],
    ALLOWED_ATTR: [
      'href',
      'src',
      'alt',
      'title',
      'width',
      'height',
      'target',
      'rel',
      'style',
      'class',
      'id',
      'bgcolor',
      'color',
      'align',
      'valign',
      'cellpadding',
      'cellspacing',
      'border',
    ],
    FORBID_TAGS: ['script', 'iframe', 'object', 'embed', 'form', 'input', 'textarea'],
    FORBID_ATTR: ['onclick', 'onload', 'onerror', 'onmouseover', 'onfocus', 'onblur'],
    ALLOW_DATA_ATTR: false,
    FORCE_BODY: true,
    KEEP_CONTENT: true,
    RETURN_TRUSTED_TYPE: false,
  };

  try {
    return DOMPurify.sanitize(html, config) as string;
  } catch (error) {
    console.error('[MessageContent] Sanitization failed:', error);
    return html; // Return original if sanitization fails
  }
}

/**
 * Convert HTML to plain text
 */
function htmlToPlainText(html: string): string {
  try {
    const cleaned = DOMPurify.sanitize(html, {
      ALLOWED_TAGS: [],
      KEEP_CONTENT: true,
    });

    return cleaned.replace(/\s+/g, ' ').trim();
  } catch (error) {
    console.error('[MessageContent] HTML to text conversion failed:', error);
    return html;
  }
}

/**
 * Process message content for display
 */
function processMessageContent(
  content: string,
  contentType?: string,
  safeMode: boolean = false
): ProcessedContent {
  try {
    // Handle empty or invalid content
    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      return {
        displayContent: 'No content available',
        isHtml: false,
        sanitized: false,
        plainText: 'No content available',
      };
    }

    const trimmedContent = content.trim();

    // Determine if content should be treated as HTML
    const isExplicitHtml = contentType?.toLowerCase().includes('text/html');
    const hasHtmlTags = detectHtmlContent(trimmedContent);
    const shouldRenderAsHtml = isExplicitHtml || hasHtmlTags;

    console.log('[MessageContent] Processing:', {
      contentLength: trimmedContent.length,
      contentType,
      isExplicitHtml,
      hasHtmlTags,
      shouldRenderAsHtml,
      safeMode,
    });

    if (shouldRenderAsHtml && !safeMode) {
      // Render as HTML
      const sanitizedHtml = sanitizeHtml(trimmedContent);
      const httpsSecureHtml = sanitizeHtmlForHttps(sanitizedHtml);
      const plainText = htmlToPlainText(trimmedContent);

      return {
        displayContent: httpsSecureHtml,
        isHtml: true,
        sanitized: true,
        plainText: plainText,
      };
    } else if (shouldRenderAsHtml && safeMode) {
      // Safe mode: convert HTML to plain text
      const plainText = htmlToPlainText(trimmedContent);

      return {
        displayContent: plainText,
        isHtml: false,
        sanitized: true,
        plainText: plainText,
      };
    } else {
      // Render as plain text with line breaks
      const escapedContent = trimmedContent
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;')
        .replace(/\n/g, '<br />');

      return {
        displayContent: escapedContent,
        isHtml: false,
        sanitized: false,
        plainText: trimmedContent,
      };
    }
  } catch (error) {
    console.error('[MessageContent] Processing error:', error);

    return {
      displayContent: content || 'Content processing error',
      isHtml: false,
      sanitized: false,
      plainText: content || 'Content processing error',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

export function MessageContent({
  content,
  contentType,
  className,
  safeMode: initialSafeMode = false,
  showControls = true,
  messageId,
  attachments: propAttachments,
}: MessageContentProps) {
  const [safeMode, setSafeMode] = useState(initialSafeMode);
  const [showRaw, setShowRaw] = useState(false);
  const [isProcessing, setIsProcessing] = useState(true);
  const [processedContent, setProcessedContent] = useState<ProcessedContent | null>(null);

  // Fetch attachments if messageId is provided
  const { data: fetchedAttachments } = useMessageAttachments(messageId || '');
  const attachments = propAttachments || fetchedAttachments || [];

  // Process content
  useEffect(() => {
    setIsProcessing(true);

    // Process in next tick to avoid blocking UI
    const timer = setTimeout(() => {
      try {
        const processed = processMessageContent(content, contentType, safeMode);
        setProcessedContent(processed);
        console.log('[MessageContent] Content processed:', {
          isHtml: processed.isHtml,
          sanitized: processed.sanitized,
          contentLength: processed.displayContent.length,
          originalLength: content?.length || 0,
          hasError: !!processed.error,
        });
      } catch (error) {
        console.error('[MessageContent] Processing failed:', error);
        setProcessedContent({
          displayContent: content || 'Processing failed',
          isHtml: false,
          sanitized: false,
          plainText: content || 'Processing failed',
          error: error instanceof Error ? error.message : 'Processing failed',
        });
      }
      setIsProcessing(false);
    }, 0);

    return () => clearTimeout(timer);
  }, [content, contentType, safeMode]);

  // Helper functions for attachments
  const getFileIcon = (fileType: string) => {
    if (fileType?.startsWith('image/')) return <ImageIcon className="w-4 h-4" />;
    if (fileType?.includes('pdf')) return <FileText className="w-4 h-4 text-red-600" />;
    return <FileText className="w-4 h-4" />;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  // Loading state
  if (isProcessing) {
    return (
      <div className="flex items-center gap-2 p-2">
        <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
        <span className="text-sm text-gray-500">Content laden...</span>
      </div>
    );
  }

  // Error state
  if (!processedContent) {
    return (
      <div className="p-2 bg-red-50 border border-red-200 rounded">
        <span className="text-sm text-red-700">Failed to process message content</span>
      </div>
    );
  }

  const hasHtmlContent = processedContent.isHtml && !safeMode;

  return (
    <div className="space-y-2">
      {/* Controls for HTML content */}
      {showControls && processedContent.isHtml && (
        <div className="flex items-center gap-2 text-xs">
          <span className="flex items-center gap-1 text-yellow-600">
            <AlertTriangle className="w-3 h-3" />
            HTML content detected
          </span>
          <div className="flex items-center gap-2 ml-auto">
            <button
              onClick={() => setSafeMode(!safeMode)}
              className={cn(
                'flex items-center gap-1 px-2 py-1 rounded transition-colors',
                safeMode
                  ? 'bg-green-100 text-green-700 hover:bg-green-200'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              )}
              title={safeMode ? 'Safe mode enabled' : 'Safe mode disabled'}
            >
              {safeMode ? (
                <>
                  <Shield className="w-3 h-3" />
                  <span>Safe mode</span>
                </>
              ) : (
                <>
                  <ShieldOff className="w-3 h-3" />
                  <span>HTML mode</span>
                </>
              )}
            </button>
            <button
              onClick={() => setShowRaw(!showRaw)}
              className="flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
              title={showRaw ? 'Show formatted' : 'Show raw content'}
            >
              {showRaw ? (
                <>
                  <Eye className="w-3 h-3" />
                  <span>Formatted</span>
                </>
              ) : (
                <>
                  <EyeOff className="w-3 h-3" />
                  <span>Raw</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Error display */}
      {processedContent.error && (
        <div className="p-2 bg-red-50 border border-red-200 rounded text-xs text-red-700">
          Processing error: {processedContent.error}
        </div>
      )}

      {/* Message content */}
      <div className={cn('message-content', className)}>
        {showRaw ? (
          // Show raw content
          <pre className="whitespace-pre-wrap font-mono text-xs bg-gray-100 p-3 rounded overflow-x-auto">
            {content}
          </pre>
        ) : hasHtmlContent ? (
          // Render as HTML using dangerouslySetInnerHTML
          <div
            className="prose prose-sm max-w-none"
            style={{
              fontFamily:
                '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
              fontSize: '14px',
              lineHeight: '1.6',
              color: '#333',
            }}
            dangerouslySetInnerHTML={{ __html: processedContent.displayContent }}
          />
        ) : (
          // Plain text with preserved formatting
          <div
            className="whitespace-pre-wrap break-words text-sm text-gray-700"
            dangerouslySetInnerHTML={{ __html: processedContent.displayContent }}
          />
        )}
      </div>

      {/* Attachments */}
      {attachments.length > 0 && (
        <div className="space-y-2">
          <div className="text-xs text-gray-500 font-medium flex items-center gap-1">
            <Paperclip className="w-3 h-3" />
            Bijlagen ({attachments.length})
          </div>
          <div className="space-y-1">
            {attachments.map((attachment: any, index: number) => (
              <div
                key={attachment.id || index}
                className="flex items-center gap-2 p-2 bg-gray-50 rounded border"
              >
                {getFileIcon(attachment.file_type || '')}
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium text-gray-900 truncate">
                    {attachment.file_name}
                  </div>
                  <div className="text-xs text-gray-500">
                    {formatFileSize(attachment.file_size || 0)} •{' '}
                    {attachment.file_type || 'Unknown type'}
                  </div>
                </div>
                {attachment.file_url && (
                  <a
                    href={attachment.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                    title="Download bijlage"
                  >
                    <Download className="w-4 h-4" />
                  </a>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
