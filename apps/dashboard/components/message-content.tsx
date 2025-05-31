'use client'

import { useMemo, useState, useEffect, useRef } from 'react'
import { Shield, ShieldOff, Eye, EyeOff, AlertTriangle, Loader2, Paperclip, Download, FileText, Image as ImageIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { prepareMessageContent, extractTextFromHtml, type HtmlContentOptions } from '@/lib/html-content'
import { useMessageAttachments } from '@zynlo/supabase'

interface MessageContentProps {
  content: string
  contentType?: string
  className?: string
  safeMode?: boolean
  detectHtml?: boolean
  showControls?: boolean
  maxPreviewLength?: number
  messageId?: string
  attachments?: any[]
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
  attachments: propAttachments
}: MessageContentProps) {
  const [safeMode, setSafeMode] = useState(initialSafeMode)
  const [showRaw, setShowRaw] = useState(false)
  const [isProcessing, setIsProcessing] = useState(true)
  const [processedContent, setProcessedContent] = useState<any>(null)
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const [iframeHeight, setIframeHeight] = useState(400)

  // Fetch attachments if messageId is provided
  const { data: fetchedAttachments } = useMessageAttachments(messageId || '')
  const attachments = propAttachments || fetchedAttachments || []

  const options: HtmlContentOptions = {
    safeMode,
    detectHtml
  }

  // Process content in useEffect to avoid blocking
  useEffect(() => {
    setIsProcessing(true)
    
    // Process in next tick to avoid blocking UI
    const timer = setTimeout(() => {
      const processed = prepareMessageContent(content, contentType, options)
      setProcessedContent(processed)
      setIsProcessing(false)
    }, 0)

    return () => clearTimeout(timer)
  }, [content, contentType, safeMode, detectHtml])

  const hasHtmlContent = processedContent?.isHtml && !safeMode

  // For preview in safe mode
  const plainTextPreview = useMemo(
    () => extractTextFromHtml(content, maxPreviewLength),
    [content, maxPreviewLength]
  )

  // Update iframe height based on content
  useEffect(() => {
    if (!hasHtmlContent || showRaw || !iframeRef.current) return

    const updateHeight = () => {
      try {
        const iframe = iframeRef.current
        if (iframe?.contentDocument?.body) {
          const newHeight = iframe.contentDocument.body.scrollHeight
          setIframeHeight(Math.max(100, newHeight + 40))
        }
      } catch (e) {
        // Ignore cross-origin errors
      }
    }

    // Initial update
    const timer = setTimeout(updateHeight, 200)
    
    // Watch for changes
    const interval = setInterval(updateHeight, 1000)

    return () => {
      clearTimeout(timer)
      clearInterval(interval)
    }
  }, [hasHtmlContent, showRaw, processedContent])

  const getFileIcon = (fileType: string) => {
    if (fileType.startsWith('image/')) return <ImageIcon className="w-4 h-4" />
    if (fileType.includes('pdf')) return <FileText className="w-4 h-4 text-red-600" />
    return <FileText className="w-4 h-4" />
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
  }

  if (isProcessing) {
    return (
      <div className="flex items-center gap-2 p-2">
        <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
        <span className="text-sm text-gray-500">Inhoud laden...</span>
      </div>
    )
  }

  if (!processedContent) return null

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
                "flex items-center gap-1 px-2 py-1 rounded transition-colors",
                safeMode
                  ? "bg-green-100 text-green-700 hover:bg-green-200"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              )}
              title={safeMode ? "Safe mode enabled" : "Safe mode disabled"}
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
              title={showRaw ? "Show formatted" : "Show raw HTML"}
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

      {/* Message content */}
      <div className={cn("message-content", className)}>
        {showRaw ? (
          // Show raw content
          <pre className="whitespace-pre-wrap font-mono text-xs bg-gray-100 p-3 rounded overflow-x-auto">
            {content}
          </pre>
        ) : hasHtmlContent ? (
          // Render as HTML in isolated iframe
          <iframe
            ref={iframeRef}
            className="w-full border-0 overflow-hidden bg-white"
            style={{ height: `${iframeHeight}px` }}
            sandbox="allow-same-origin allow-popups"
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
              <body>${processedContent.content}</body>
              </html>
            `}
          />
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
        <div className="mt-3 space-y-2">
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <Paperclip className="w-3 h-3" />
            <span>{attachments.length} bijlage{attachments.length > 1 ? 'n' : ''}</span>
          </div>
          <div className="space-y-1">
            {attachments.map((attachment: any) => (
              <a
                key={attachment.id}
                href={attachment.file_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 p-2 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors group"
              >
                <div className="flex-shrink-0">
                  {getFileIcon(attachment.file_type)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-700 truncate group-hover:text-gray-900">
                    {attachment.file_name}
                  </p>
                  <p className="text-xs text-gray-500">
                    {formatFileSize(attachment.file_size)}
                  </p>
                </div>
                <Download className="w-4 h-4 text-gray-400 group-hover:text-gray-600 flex-shrink-0" />
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  )
} 