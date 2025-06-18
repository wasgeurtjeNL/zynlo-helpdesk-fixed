'use client';

import { useState, useEffect } from 'react';
import {
  Shield,
  ShieldOff,
  Eye,
  EyeOff,
  Loader2,
  Paperclip,
  Download,
  FileText,
  Image as ImageIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { optimizeHtmlForDisplay } from '@/lib/html-optimizer';

interface MessageContentProps {
  content: string;
  contentType?: string;
  className?: string;
  safeMode?: boolean;
  showControls?: boolean;
  messageId?: string;
  attachments?: any[];
}

export function MessageContent({
  content,
  contentType,
  className,
  safeMode: initialSafeMode = false,
  showControls = true,
  messageId,
  attachments = [],
}: MessageContentProps) {
  const [safeMode, setSafeMode] = useState(initialSafeMode);
  const [showRaw, setShowRaw] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Log for debugging
  useEffect(() => {
    console.log('[MessageContent] Rendering with:', {
      contentLength: content?.length || 0,
      contentType,
      hasContent: !!content,
      contentPreview: content?.substring(0, 100),
    });
  }, [content, contentType]);

  // Helper functions
  const isHtmlContent = () => {
    if (contentType?.toLowerCase().includes('text/html')) return true;
    if (!content) return false;

    // Simple HTML detection
    const htmlPatterns = [
      /<[a-z][\s\S]*>/i,
      /<\/[a-z]+>/i,
      /<!DOCTYPE/i,
      /<html[\s>]/i,
      /<body[\s>]/i,
    ];

    return htmlPatterns.some((pattern) => pattern.test(content));
  };

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

  // Handle empty content
  if (!content) {
    return (
      <div className={cn('text-sm text-gray-500 italic', className)}>(Geen inhoud beschikbaar)</div>
    );
  }

  const hasHtml = isHtmlContent();

  return (
    <div className="space-y-2">
      {/* Controls */}
      {showControls && hasHtml && (
        <div className="flex items-center gap-2 text-xs">
          <span className="text-yellow-600">HTML content gedetecteerd</span>
          <div className="flex items-center gap-2 ml-auto">
            <button
              onClick={() => setSafeMode(!safeMode)}
              className={cn(
                'flex items-center gap-1 px-2 py-1 rounded transition-colors',
                safeMode
                  ? 'bg-green-100 text-green-700 hover:bg-green-200'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              )}
              title={safeMode ? 'Veilige modus aan' : 'HTML modus aan'}
            >
              {safeMode ? (
                <>
                  <Shield className="w-3 h-3" />
                  <span>Veilig</span>
                </>
              ) : (
                <>
                  <ShieldOff className="w-3 h-3" />
                  <span>HTML</span>
                </>
              )}
            </button>
            <button
              onClick={() => setShowRaw(!showRaw)}
              className="flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
              title={showRaw ? 'Toon geformatteerd' : 'Toon broncode'}
            >
              {showRaw ? (
                <>
                  <Eye className="w-3 h-3" />
                  <span>Geformatteerd</span>
                </>
              ) : (
                <>
                  <EyeOff className="w-3 h-3" />
                  <span>Broncode</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Content display */}
      <div className={cn('message-content', className)}>
        {showRaw ? (
          // Raw content view
          <pre className="whitespace-pre-wrap font-mono text-xs bg-gray-100 p-3 rounded overflow-x-auto">
            {content}
          </pre>
        ) : hasHtml && !safeMode ? (
          // HTML content - render in iframe for safety
          <div className="html-content-wrapper">
            <iframe
              srcDoc={`
                <!DOCTYPE html>
                <html>
                <head>
                  <meta charset="utf-8">
                  <meta name="viewport" content="width=device-width, initial-scale=1">
                  <style>
                    body {
                      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;
                      font-size: 14px;
                      line-height: 1.6;
                      color: #333;
                      margin: 0;
                      padding: 16px;
                      word-wrap: break-word;
                      overflow-wrap: break-word;
                    }
                    a { color: #0066cc; text-decoration: underline; }
                    a:hover { color: #0052a3; }
                    img { max-width: 100%; height: auto; }
                    table { border-collapse: collapse; width: 100%; }
                    th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                    th { background-color: #f5f5f5; }
                    blockquote { 
                      margin: 1em 0; 
                      padding-left: 1em; 
                      border-left: 4px solid #ddd; 
                      color: #666; 
                    }
                    pre { 
                      background: #f5f5f5; 
                      padding: 12px; 
                      border-radius: 4px; 
                      overflow-x: auto; 
                    }
                    code { 
                      background: #f5f5f5; 
                      padding: 2px 4px; 
                      border-radius: 3px; 
                      font-family: monospace; 
                    }
                  </style>
                </head>
                <body>${optimizeHtmlForDisplay(content)}</body>
                </html>
              `}
              className="w-full border-0 rounded"
              style={{ minHeight: '100px', height: 'auto' }}
              sandbox="allow-same-origin"
              onLoad={(e) => {
                const iframe = e.target as HTMLIFrameElement;
                if (iframe.contentDocument?.body) {
                  const height = iframe.contentDocument.body.scrollHeight;
                  iframe.style.height = `${height + 32}px`;
                }
              }}
            />
          </div>
        ) : (
          // Plain text or safe mode - show as text with line breaks
          <div className="whitespace-pre-wrap break-words text-sm text-gray-700">{content}</div>
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
                    {attachment.file_name || 'Naamloos bestand'}
                  </div>
                  <div className="text-xs text-gray-500">
                    {formatFileSize(attachment.file_size || 0)}
                    {attachment.file_type && ` • ${attachment.file_type}`}
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
