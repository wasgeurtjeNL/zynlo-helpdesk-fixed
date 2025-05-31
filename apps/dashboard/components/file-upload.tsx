'use client'

import { useState, useRef } from 'react'
import { Upload, X, File, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@zynlo/ui'
import { 
  uploadFile, 
  formatFileSize, 
  ALLOWED_FILE_TYPES,
  MAX_FILE_SIZE,
  generateTicketAttachmentPath
} from '@/lib/storage'

interface FileUploadProps {
  ticketId: string
  onFilesUploaded: (files: UploadedFile[]) => void
  className?: string
}

export interface UploadedFile {
  url: string
  path: string
  name: string
  size: number
  type: string
}

export function FileUpload({ ticketId, onFilesUploaded, className }: FileUploadProps) {
  const [files, setFiles] = useState<File[]>([])
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({})
  const [errors, setErrors] = useState<Record<string, string>>({})
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = event.target.files
    if (!selectedFiles) return

    const newFiles = Array.from(selectedFiles).filter(file => {
      // Check if file is already selected
      if (files.some(f => f.name === file.name && f.size === file.size)) {
        setErrors(prev => ({ ...prev, [file.name]: 'Bestand is al geselecteerd' }))
        return false
      }

      // Check file size
      if (file.size > MAX_FILE_SIZE) {
        setErrors(prev => ({ 
          ...prev, 
          [file.name]: `Bestand is te groot (max ${MAX_FILE_SIZE / 1024 / 1024}MB)` 
        }))
        return false
      }

      // Check file type
      if (!ALLOWED_FILE_TYPES.includes(file.type)) {
        setErrors(prev => ({ ...prev, [file.name]: 'Bestandstype niet toegestaan' }))
        return false
      }

      return true
    })

    setFiles(prev => [...prev, ...newFiles])
    
    // Clear input
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index))
    const fileName = files[index].name
    setErrors(prev => {
      const newErrors = { ...prev }
      delete newErrors[fileName]
      return newErrors
    })
    setUploadProgress(prev => {
      const newProgress = { ...prev }
      delete newProgress[fileName]
      return newProgress
    })
  }

  const handleUpload = async () => {
    if (files.length === 0) return

    setUploading(true)
    const uploadedFiles: UploadedFile[] = []

    try {
      // Upload files in parallel
      const uploadPromises = files.map(async (file) => {
        try {
          const path = generateTicketAttachmentPath(ticketId, file.name)
          
          const result = await uploadFile({
            bucket: 'TICKET_ATTACHMENTS',
            path,
            file,
            onProgress: (progress) => {
              setUploadProgress(prev => ({ ...prev, [file.name]: progress }))
            }
          })

          uploadedFiles.push({
            url: result.url,
            path: result.path,
            name: file.name,
            size: result.size,
            type: result.type,
          })
        } catch (error) {
          setErrors(prev => ({ 
            ...prev, 
            [file.name]: error instanceof Error ? error.message : 'Upload mislukt' 
          }))
          throw error
        }
      })

      await Promise.allSettled(uploadPromises)

      // Only call callback if at least one file was uploaded successfully
      if (uploadedFiles.length > 0) {
        onFilesUploaded(uploadedFiles)
        // Clear successfully uploaded files
        setFiles([])
        setUploadProgress({})
      }
    } finally {
      setUploading(false)
    }
  }

  const getFileIcon = (type: string) => {
    if (type.startsWith('image/')) return '🖼️'
    if (type === 'application/pdf') return '📄'
    if (type.includes('word')) return '📝'
    if (type.includes('excel') || type.includes('spreadsheet')) return '📊'
    return '📎'
  }

  return (
    <div className={cn("space-y-4", className)}>
      {/* File input area */}
      <div className="relative">
        <input
          ref={fileInputRef}
          type="file"
          multiple
          onChange={handleFileSelect}
          className="hidden"
          accept={ALLOWED_FILE_TYPES.join(',')}
        />
        
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className={cn(
            "w-full p-4 border-2 border-dashed rounded-lg",
            "hover:border-gray-400 hover:bg-gray-50",
            "transition-colors cursor-pointer",
            "flex flex-col items-center gap-2",
            uploading && "opacity-50 cursor-not-allowed"
          )}
        >
          <Upload className="w-6 h-6 text-gray-400" />
          <span className="text-sm text-gray-600">
            Klik om bestanden te selecteren of sleep ze hierheen
          </span>
          <span className="text-xs text-gray-500">
            Max {MAX_FILE_SIZE / 1024 / 1024}MB per bestand
          </span>
        </button>
      </div>

      {/* Selected files */}
      {files.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-gray-700">
            Geselecteerde bestanden ({files.length})
          </h4>
          
          <div className="space-y-1">
            {files.map((file, index) => (
              <div
                key={`${file.name}-${index}`}
                className={cn(
                  "flex items-center gap-2 p-2 rounded-lg bg-gray-50",
                  errors[file.name] && "bg-red-50"
                )}
              >
                <span className="text-lg">{getFileIcon(file.type)}</span>
                
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{file.name}</p>
                  <p className="text-xs text-gray-500">
                    {formatFileSize(file.size)}
                    {uploadProgress[file.name] !== undefined && (
                      <span className="ml-2">
                        • {uploadProgress[file.name]}% geüpload
                      </span>
                    )}
                  </p>
                  {errors[file.name] && (
                    <p className="text-xs text-red-600 mt-1">{errors[file.name]}</p>
                  )}
                </div>

                {!uploading && (
                  <button
                    onClick={() => removeFile(index)}
                    className="p-1 hover:bg-gray-200 rounded"
                  >
                    <X className="w-4 h-4 text-gray-500" />
                  </button>
                )}

                {uploading && uploadProgress[file.name] !== undefined && (
                  <Loader2 className="w-4 h-4 animate-spin text-gray-500" />
                )}
              </div>
            ))}
          </div>

          {/* Upload button */}
          <Button
            onClick={handleUpload}
            disabled={uploading}
            className="w-full"
          >
            {uploading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Uploaden...
              </>
            ) : (
              <>
                <Upload className="mr-2 h-4 w-4" />
                Upload {files.length} {files.length === 1 ? 'bestand' : 'bestanden'}
              </>
            )}
          </Button>
        </div>
      )}

      {/* Allowed file types info */}
      <div className="text-xs text-gray-500">
        <p>Toegestane bestandstypen:</p>
        <p>Afbeeldingen (JPG, PNG, GIF, WebP), PDF, Word, Excel, TXT, CSV</p>
      </div>
    </div>
  )
} 