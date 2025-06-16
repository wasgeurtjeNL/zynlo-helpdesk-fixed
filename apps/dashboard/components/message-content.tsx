'use client';

import { useMemo, useState, useEffect, useRef } from 'react';
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
  Bug,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  prepareMessageContent,
  extractTextFromHtml,
  type HtmlContentOptions,
} from '@/lib/html-content';
import { useMessageAttachments } from '@zynlo/supabase';

interface MessageContentProps {
  content: string;
  contentType?: string;
  className?: string;
  safeMode?: boolean;
  detectHtml?: boolean;
  showControls?: boolean;
  maxPreviewLength?: number;
  messageId?: string;
  attachments?: any[];
}

export function MessageContent({
  content,
  contentType,
  className,
  safeMode: initialSafeMode = false,
  detectHtml = true,
  showControls = true,
  maxPreviewLength = 200,
  messageId,
  attachments: propAttachments,
}: MessageContentProps) {
  const [safeMode, setSafeMode] = useState(initialSafeMode);
  const [showRaw, setShowRaw] = useState(false);
  const [isProcessing, setIsProcessing] = useState(true);
  const [processedContent, setProcessedContent] = useState<any>(null);
  const [iframeError, setIframeError] = useState<string | null>(null);
  const [useIframe, setUseIframe] = useState(process.env.NODE_ENV === 'development');
  const [showDebug, setShowDebug] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [iframeHeight, setIframeHeight] = useState(400);

  // Fetch attachments if messageId is provided
  const { data: fetchedAttachments } = useMessageAttachments(messageId || '');
  const attachments = propAttachments || fetchedAttachments || [];

  const options: HtmlContentOptions = {
    safeMode,
    detectHtml,
  };

  // Process content in useEffect to avoid blocking
  useEffect(() => {
    setIsProcessing(true);

    // Process in next tick to avoid blocking UI
    const timer = setTimeout(() => {
      try {
        const processed = prepareMessageContent(content, contentType, options);
        setProcessedContent(processed);
        console.log('[MessageContent] Processed:', {
          isHtml: processed.isHtml,
          sanitized: processed.sanitized,
          contentLength: processed.content.length,
          originalLength: content.length,
          useIframe,
          environment: process.env.NODE_ENV,
        });
      } catch (error) {
        console.error('[MessageContent] Processing error:', error);
        setIframeError(
          `Processing error: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
        setUseIframe(false);
      }
      setIsProcessing(false);
    }, 0);

    return () => clearTimeout(timer);
  }, [content, contentType, safeMode, detectHtml, useIframe]);

  const hasHtmlContent = processedContent?.isHtml && !safeMode;

  // For preview in safe mode
  const plainTextPreview = useMemo(
    () => extractTextFromHtml(content, maxPreviewLength),
    [content, maxPreviewLength]
  );

  // Update iframe height based on content
  useEffect(() => {
    if (!hasHtmlContent || showRaw || !iframeRef.current || !useIframe) return;

    const updateHeight = () => {
      try {
        const iframe = iframeRef.current;
        if (iframe?.contentDocument?.body) {
          const newHeight = iframe.contentDocument.body.scrollHeight;
          setIframeHeight(Math.max(100, newHeight + 40));
          console.log('[MessageContent] Updated iframe height:', newHeight);
        }
      } catch (e) {
        console.warn('[MessageContent] Height update failed:', e);
        // Don't set error here as this is expected for cross-origin
      }
    };

    // Initial update
    const timer = setTimeout(updateHeight, 200);

    // Watch for changes
    const interval = setInterval(updateHeight, 1000);

    return () => {
      clearTimeout(timer);
      clearInterval(interval);
    };
  }, [hasHtmlContent, showRaw, processedContent, useIframe]);

  // Handle iframe load errors
  const handleIframeError = (error: string) => {
    console.error('[MessageContent] Iframe error:', error);
    setIframeError(error);
    setUseIframe(false);
  };

  const getFileIcon = (fileType: string) => {
    if (fileType.startsWith('image/')) return <ImageIcon className="w-4 h-4" />;
    if (fileType.includes('pdf')) return <FileText className="w-4 h-4 text-red-600" />;
    return <FileText className="w-4 h-4" />;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  if (isProcessing) {
    return (
      <div className="flex items-center gap-2 p-2">
        <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
        <span className="text-sm text-gray-500">Inhoud laden...</span>
      </div>
    );
  }

  if (!processedContent) return null;

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
              title={showRaw ? 'Show formatted' : 'Show raw HTML'}
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
            {iframeError && (
              <button
                onClick={() => setShowDebug(!showDebug)}
                className="flex items-center gap-1 px-2 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors"
                title="Show debug info"
              >
                <Bug className="w-3 h-3" />
                <span>Debug</span>
              </button>
            )}
            <button
              onClick={() => setUseIframe(!useIframe)}
              className={cn(
                'flex items-center gap-1 px-2 py-1 rounded transition-colors text-xs',
                useIframe
                  ? 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                  : 'bg-green-100 text-green-700 hover:bg-green-200'
              )}
              title={
                useIframe
                  ? 'Currently using iframe - click to test fallback'
                  : 'Currently using fallback - click to test iframe'
              }
            >
              <span>{useIframe ? 'Using Iframe' : 'Using Fallback'}</span>
            </button>
          </div>
        </div>
      )}

      {/* Debug info */}
      {showDebug && iframeError && (
        <div className="bg-red-50 border border-red-200 rounded p-3 text-xs">
          <div className="font-medium text-red-800 mb-2">Debug Information:</div>
          <div className="space-y-1 text-red-700">
            <div>Error: {iframeError}</div>
            <div>Environment: {process.env.NODE_ENV}</div>
            <div>Use iframe: {useIframe ? 'Yes' : 'No'}</div>
            <div>Content type: {contentType || 'Not specified'}</div>
            <div>Content length: {content.length}</div>
            <div>Is HTML: {processedContent?.isHtml ? 'Yes' : 'No'}</div>
            <div>Sanitized: {processedContent?.sanitized ? 'Yes' : 'No'}</div>
          </div>
          <div className="mt-2">
            <button
              onClick={() => setUseIframe(true)}
              className="text-xs bg-red-100 hover:bg-red-200 px-2 py-1 rounded mr-2"
            >
              Retry iframe
            </button>
            <button
              onClick={() => setUseIframe(false)}
              className="text-xs bg-red-100 hover:bg-red-200 px-2 py-1 rounded"
            >
              Use fallback
            </button>
          </div>
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
          // Render as HTML
          useIframe && !iframeError ? (
            // Try iframe first
            <iframe
              ref={iframeRef}
              className="w-full border-0 overflow-hidden bg-white rounded"
              style={{ height: `${iframeHeight}px` }}
              sandbox="allow-same-origin allow-popups allow-popups-to-escape-sandbox allow-forms"
              onError={() => handleIframeError('Iframe failed to load')}
              onLoad={() => {
                console.log('[MessageContent] Iframe loaded successfully');
                // Clear any previous errors
                setIframeError(null);
              }}
              srcDoc={`
                <!DOCTYPE html>
                <html>
                <head>
                  <meta charset="utf-8">
                  <meta name="viewport" content="width=device-width, initial-scale=1">
                  <base target="_blank">
                  <style>
                    /* Reset styles */
                    * {
                      margin: 0;
                      padding: 0;
                      box-sizing: border-box;
                    }
                    
                    /* Body styles */
                    body {
                      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
                      font-size: 14px;
                      line-height: 1.6;
                      color: #333;
                      background: #fff;
                      padding: 20px;
                      word-wrap: break-word;
                      overflow-wrap: break-word;
                    }
                    
                    /* Basic typography */
                    p { margin: 1em 0; }
                    h1, h2, h3, h4, h5, h6 { margin: 1em 0 0.5em; font-weight: bold; }
                    h1 { font-size: 2em; }
                    h2 { font-size: 1.5em; }
                    h3 { font-size: 1.17em; }
                    h4 { font-size: 1em; }
                    h5 { font-size: 0.83em; }
                    h6 { font-size: 0.67em; }
                    
                    /* Links */
                    a {
                      color: #0066cc;
                      text-decoration: underline;
                    }
                    a:hover {
                      color: #0052a3;
                    }
                    
                    /* Images */
                    img {
                      max-width: 100%;
                      height: auto;
                      display: block;
                      margin: 1em 0;
                    }
                    
                    /* Tables */
                    table {
                      width: 100%;
                      border-collapse: collapse;
                      margin: 1em 0;
                    }
                    
                    /* Lists */
                    ul, ol {
                      margin: 1em 0;
                      padding-left: 2em;
                    }
                    li {
                      margin: 0.5em 0;
                    }
                    
                    /* Blockquotes */
                    blockquote {
                      margin: 1em 0;
                      padding-left: 1em;
                      border-left: 4px solid #ddd;
                      color: #666;
                    }
                    
                    /* Horizontal rules */
                    hr {
                      margin: 2em 0;
                      border: none;
                      border-top: 1px solid #ddd;
                    }
                    
                    /* Buttons */
                    button, a.button {
                      display: inline-block;
                      padding: 10px 20px;
                      background: #0066cc;
                      color: white;
                      text-decoration: none;
                      border-radius: 4px;
                      border: none;
                      cursor: pointer;
                      margin: 0.5em 0;
                    }
                    button:hover, a.button:hover {
                      background: #0052a3;
                    }
                    
                    /* Email specific fixes */
                    center { text-align: center; }
                    .preheader { display: none !important; }
                    
                    /* Responsive */
                    @media (max-width: 600px) {
                      body { padding: 10px; }
                      table { width: 100% !important; }
                    }
                  </style>
                </head>
                <body>
                  ${processedContent.content}
                </body>
                </html>
              `}
            />
          ) : (
            // Fallback: direct HTML rendering with dangerouslySetInnerHTML
            <div
              className={cn(
                'rounded',
                process.env.NODE_ENV === 'production'
                  ? 'bg-white border'
                  : 'bg-yellow-50 border border-yellow-200'
              )}
            >
              {process.env.NODE_ENV !== 'production' && (
                <div className="text-xs text-yellow-700 mb-2 p-2">
                  ⚠️ Using fallback HTML rendering (iframe not available)
                </div>
              )}
              <div
                className="p-4 rounded"
                style={{
                  fontFamily:
                    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
                  fontSize: '14px',
                  lineHeight: '1.6',
                  color: '#333',
                  backgroundColor: '#fff',
                }}
                dangerouslySetInnerHTML={{ __html: processedContent.content }}
              />
            </div>
          )
        ) : safeMode && processedContent.isHtml ? (
          // Safe mode - show plain text preview
          <div className="space-y-2">
            <p className="text-sm text-gray-600 italic">
              (HTML content displayed as plain text for security)
            </p>
            <p className="whitespace-pre-wrap text-sm text-gray-700">{plainTextPreview}</p>
          </div>
        ) : (
          // Plain text with line breaks preserved
          <div
            className="whitespace-pre-wrap break-words text-sm text-gray-700"
            dangerouslySetInnerHTML={{ __html: processedContent.content }}
          />
        )}
      </div>

      {/* Attachments */}
      {attachments.length > 0 && (
        <div className="space-y-2">
          <div className="text-xs text-gray-500 font-medium">Bijlagen ({attachments.length})</div>
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
                <a
                  href={attachment.file_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                  title="Download bijlage"
                >
                  <Download className="w-4 h-4" />
                </a>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
