import { supabase } from '@zynlo/supabase'

export const STORAGE_BUCKETS = {
  TICKET_ATTACHMENTS: 'ticket-attachments',
  USER_AVATARS: 'user-avatars',
} as const

export const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
export const ALLOWED_FILE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain',
  'text/csv',
]

interface UploadFileOptions {
  bucket: keyof typeof STORAGE_BUCKETS
  path: string
  file: File
  onProgress?: (progress: number) => void
}

interface UploadResult {
  url: string
  path: string
  size: number
  type: string
}

/**
 * Upload a file to Supabase Storage
 */
export async function uploadFile({
  bucket,
  path,
  file,
  onProgress,
}: UploadFileOptions): Promise<UploadResult> {
  // Validate file size
  if (file.size > MAX_FILE_SIZE) {
    throw new Error(`Bestand is te groot. Maximum grootte is ${MAX_FILE_SIZE / 1024 / 1024}MB`)
  }

  // Validate file type
  if (!ALLOWED_FILE_TYPES.includes(file.type)) {
    throw new Error('Bestandstype niet toegestaan')
  }

  const bucketName = STORAGE_BUCKETS[bucket]

  // Upload file
  const { data, error } = await supabase.storage
    .from(bucketName)
    .upload(path, file, {
      cacheControl: '3600',
      upsert: false,
    })

  if (error) {
    console.error('Storage upload error:', error)
    throw new Error('Fout bij uploaden van bestand')
  }

  // Get public URL
  const { data: { publicUrl } } = supabase.storage
    .from(bucketName)
    .getPublicUrl(data.path)

  return {
    url: publicUrl,
    path: data.path,
    size: file.size,
    type: file.type,
  }
}

/**
 * Delete a file from Supabase Storage
 */
export async function deleteFile(bucket: keyof typeof STORAGE_BUCKETS, path: string) {
  const bucketName = STORAGE_BUCKETS[bucket]
  
  const { error } = await supabase.storage
    .from(bucketName)
    .remove([path])

  if (error) {
    console.error('Storage delete error:', error)
    throw new Error('Fout bij verwijderen van bestand')
  }
}

/**
 * Generate a unique file path for ticket attachments
 */
export function generateTicketAttachmentPath(ticketId: string, fileName: string): string {
  const timestamp = Date.now()
  const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_')
  return `tickets/${ticketId}/${timestamp}-${sanitizedFileName}`
}

/**
 * Download a file from storage
 */
export async function downloadFile(bucket: keyof typeof STORAGE_BUCKETS, path: string) {
  const bucketName = STORAGE_BUCKETS[bucket]
  
  const { data, error } = await supabase.storage
    .from(bucketName)
    .download(path)

  if (error) {
    console.error('Storage download error:', error)
    throw new Error('Fout bij downloaden van bestand')
  }

  return data
}

/**
 * Get file metadata
 */
export function getFileMetadata(file: File) {
  return {
    name: file.name,
    size: file.size,
    type: file.type,
    lastModified: new Date(file.lastModified),
  }
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes'
  
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
} 