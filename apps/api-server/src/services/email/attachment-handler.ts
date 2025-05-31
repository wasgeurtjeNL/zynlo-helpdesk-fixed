import { createClient } from '@supabase/supabase-js';
import { EmailMessage } from './imap-client';
import * as crypto from 'crypto';
import { Readable } from 'stream';

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

export interface AttachmentMetadata {
  id: string;
  messageId: string;
  filename: string;
  contentType: string;
  size: number;
  path: string;
  url: string;
  checksum?: string;
  uploadedAt: Date;
}

export interface AttachmentUploadResult {
  success: boolean;
  metadata?: AttachmentMetadata;
  error?: string;
}

export class AttachmentHandler {
  private readonly BUCKET_NAME = 'ticket-attachments';
  private readonly MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
  private readonly CHUNK_SIZE = 1024 * 1024; // 1MB chunks for streaming
  
  // Allowed MIME types (from migration)
  private readonly ALLOWED_MIME_TYPES = [
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
    'text/csv'
  ];

  /**
   * Process all attachments from an email message
   */
  async processEmailAttachments(
    message: EmailMessage,
    ticketId: string,
    messageDbId: string
  ): Promise<AttachmentMetadata[]> {
    if (!message.attachments || message.attachments.length === 0) {
      return [];
    }

    const uploadedAttachments: AttachmentMetadata[] = [];

    for (const attachment of message.attachments) {
      try {
        const result = await this.uploadAttachment(
          attachment,
          ticketId,
          messageDbId,
          message.messageId
        );

        if (result.success && result.metadata) {
          uploadedAttachments.push(result.metadata);
        } else {
          console.error(`Failed to upload attachment ${attachment.filename}: ${result.error}`);
        }
      } catch (error) {
        console.error(`Error processing attachment ${attachment.filename}:`, error);
      }
    }

    return uploadedAttachments;
  }

  /**
   * Upload a single attachment to Supabase Storage
   */
  private async uploadAttachment(
    attachment: {
      filename: string;
      contentType: string;
      size: number;
      content?: Buffer;
    },
    ticketId: string,
    messageDbId: string,
    emailMessageId: string
  ): Promise<AttachmentUploadResult> {
    // Validate file type
    if (!this.isAllowedMimeType(attachment.contentType)) {
      return {
        success: false,
        error: `File type not allowed: ${attachment.contentType}`
      };
    }

    // Validate file size
    if (attachment.size > this.MAX_FILE_SIZE) {
      return {
        success: false,
        error: `File too large: ${attachment.size} bytes (max: ${this.MAX_FILE_SIZE} bytes)`
      };
    }

    // Generate unique path
    const timestamp = Date.now();
    const sanitizedFilename = this.sanitizeFilename(attachment.filename);
    const path = `tickets/${ticketId}/${messageDbId}/${timestamp}-${sanitizedFilename}`;

    try {
      // Upload to Supabase Storage
      let uploadResult;
      
      if (attachment.content) {
        // Direct upload for small files
        const { data, error } = await supabase.storage
          .from(this.BUCKET_NAME)
          .upload(path, attachment.content, {
            contentType: attachment.contentType,
            cacheControl: '3600',
            upsert: false
          });

        if (error) throw error;
        uploadResult = data;
      } else {
        // For large files, we'd need to implement streaming
        // This would require fetching the attachment content from IMAP
        return {
          success: false,
          error: 'Streaming upload not yet implemented for large attachments'
        };
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from(this.BUCKET_NAME)
        .getPublicUrl(path);

      // Calculate checksum
      const checksum = attachment.content 
        ? crypto.createHash('md5').update(attachment.content).digest('hex')
        : undefined;

      // Create metadata
      const metadata: AttachmentMetadata = {
        id: crypto.randomUUID(),
        messageId: messageDbId,
        filename: attachment.filename,
        contentType: attachment.contentType,
        size: attachment.size,
        path: path,
        url: publicUrl,
        checksum,
        uploadedAt: new Date()
      };

      // Store metadata in database
      await this.storeAttachmentMetadata(metadata, ticketId);

      return {
        success: true,
        metadata
      };
    } catch (error) {
      console.error('Upload error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown upload error'
      };
    }
  }

  /**
   * Store attachment metadata in database
   */
  private async storeAttachmentMetadata(
    metadata: AttachmentMetadata,
    ticketId: string
  ): Promise<void> {
    // Update the message's attachments array
    const { data: message } = await supabase
      .from('messages')
      .select('attachments')
      .eq('id', metadata.messageId)
      .single();

    const currentAttachments = (message?.attachments as any[]) || [];
    
    const attachmentRecord = {
      id: metadata.id,
      filename: metadata.filename,
      contentType: metadata.contentType,
      size: metadata.size,
      path: metadata.path,
      url: metadata.url,
      checksum: metadata.checksum,
      uploadedAt: metadata.uploadedAt.toISOString()
    };

    await supabase
      .from('messages')
      .update({
        attachments: [...currentAttachments, attachmentRecord]
      })
      .eq('id', metadata.messageId);
  }

  /**
   * Generate secure download URL with expiration
   */
  async generateSecureDownloadUrl(
    path: string,
    expiresIn: number = 3600 // 1 hour default
  ): Promise<string | null> {
    try {
      const { data, error } = await supabase.storage
        .from(this.BUCKET_NAME)
        .createSignedUrl(path, expiresIn);

      if (error) {
        console.error('Error creating signed URL:', error);
        return null;
      }

      return data.signedUrl;
    } catch (error) {
      console.error('Error generating secure URL:', error);
      return null;
    }
  }

  /**
   * Delete attachment from storage and database
   */
  async deleteAttachment(
    messageId: string,
    attachmentId: string,
    path: string
  ): Promise<boolean> {
    try {
      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from(this.BUCKET_NAME)
        .remove([path]);

      if (storageError) {
        console.error('Storage deletion error:', storageError);
        return false;
      }

      // Remove from message attachments array
      const { data: message } = await supabase
        .from('messages')
        .select('attachments')
        .eq('id', messageId)
        .single();

      if (message) {
        const updatedAttachments = ((message.attachments as any[]) || [])
          .filter(att => att.id !== attachmentId);

        await supabase
          .from('messages')
          .update({ attachments: updatedAttachments })
          .eq('id', messageId);
      }

      return true;
    } catch (error) {
      console.error('Error deleting attachment:', error);
      return false;
    }
  }

  /**
   * Clean up orphaned attachments
   */
  async cleanupOrphanedAttachments(daysOld: number = 30): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    // Find old messages with attachments
    const { data: oldMessages } = await supabase
      .from('messages')
      .select('id, attachments, created_at')
      .not('attachments', 'is', null)
      .lt('created_at', cutoffDate.toISOString())
      .limit(100);

    if (!oldMessages || oldMessages.length === 0) {
      return 0;
    }

    let deletedCount = 0;

    for (const message of oldMessages) {
      const attachments = message.attachments as any[];
      
      for (const attachment of attachments) {
        if (attachment.path) {
          const deleted = await this.deleteAttachment(
            message.id,
            attachment.id,
            attachment.path
          );
          
          if (deleted) {
            deletedCount++;
          }
        }
      }
    }

    return deletedCount;
  }

  /**
   * Stream upload for large files (future implementation)
   */
  private async streamUpload(
    stream: Readable,
    path: string,
    contentType: string,
    size: number
  ): Promise<{ data: any; error: any }> {
    // This would require implementing multipart upload
    // For now, return error
    return {
      data: null,
      error: new Error('Streaming upload not yet implemented')
    };
  }

  /**
   * Check if MIME type is allowed
   */
  private isAllowedMimeType(mimeType: string): boolean {
    return this.ALLOWED_MIME_TYPES.includes(mimeType.toLowerCase());
  }

  /**
   * Sanitize filename for storage
   */
  private sanitizeFilename(filename: string): string {
    // Remove or replace problematic characters
    return filename
      .replace(/[^a-zA-Z0-9.-]/g, '_')
      .replace(/_{2,}/g, '_')
      .toLowerCase();
  }

  /**
   * Scan attachment for viruses (future implementation)
   */
  private async scanForViruses(content: Buffer): Promise<boolean> {
    // Placeholder for virus scanning integration
    // Could integrate with ClamAV, Windows Defender API, or cloud service
    // For now, return true (safe)
    return true;
  }
}

// Export singleton instance
export const attachmentHandler = new AttachmentHandler(); 