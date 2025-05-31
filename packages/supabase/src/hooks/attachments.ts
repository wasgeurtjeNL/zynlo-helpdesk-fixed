import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../client';
import type { Database } from '../types/database.types';

type MessageAttachment = Database['public']['Tables']['message_attachments']['Row'];
type MessageAttachmentInsert = Database['public']['Tables']['message_attachments']['Insert'];

// Get attachments for a message
export function useMessageAttachments(messageId: string) {
  return useQuery({
    queryKey: ['message-attachments', messageId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('message_attachments')
        .select('*')
        .eq('message_id', messageId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data || [];
    },
    enabled: !!messageId,
  });
}

// Upload attachment to Supabase Storage
export function useUploadAttachment() {
  return useMutation({
    mutationFn: async ({
      file,
      messageId,
      bucket = 'message-attachments',
    }: {
      file: File;
      messageId: string;
      bucket?: string;
    }) => {
      // Generate unique filename
      const timestamp = Date.now();
      const extension = file.name.split('.').pop();
      const filename = `${messageId}/${timestamp}.${extension}`;

      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from(bucket)
        .upload(filename, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (error) throw error;
      return { path: data.path, filename: file.name, size: file.size, type: file.type };
    },
  });
}

// Create attachment record
export function useCreateMessageAttachment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      messageId,
      fileName,
      fileSize,
      fileType,
      storagePath,
      userId,
    }: {
      messageId: string;
      fileName: string;
      fileSize: number;
      fileType: string;
      storagePath: string;
      userId: string;
    }) => {
      // Call the stored procedure
      const { data, error } = await supabase
        .rpc('handle_message_attachment_upload', {
          p_message_id: messageId,
          p_file_name: fileName,
          p_file_size: fileSize,
          p_file_type: fileType,
          p_storage_path: storagePath,
          p_user_id: userId,
        });

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ 
        queryKey: ['message-attachments', variables.messageId] 
      });
      queryClient.invalidateQueries({ 
        queryKey: ['messages'] 
      });
    },
  });
}

// Delete attachment
export function useDeleteMessageAttachment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      attachmentId,
      storagePath,
      messageId,
      bucket = 'message-attachments',
    }: {
      attachmentId: string;
      storagePath: string;
      messageId: string;
      bucket?: string;
    }) => {
      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from(bucket)
        .remove([storagePath]);

      if (storageError) throw storageError;

      // Delete from database
      const { error: dbError } = await supabase
        .from('message_attachments')
        .delete()
        .eq('id', attachmentId);

      if (dbError) throw dbError;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ 
        queryKey: ['message-attachments', variables.messageId] 
      });
    },
  });
}

// Combined hook for uploading and creating attachment record
export function useUploadAndCreateAttachment() {
  const uploadAttachment = useUploadAttachment();
  const createAttachment = useCreateMessageAttachment();

  return useMutation({
    mutationFn: async ({
      file,
      messageId,
      userId,
    }: {
      file: File;
      messageId: string;
      userId: string;
    }) => {
      // First upload the file
      const uploadResult = await uploadAttachment.mutateAsync({
        file,
        messageId,
      });

      // Then create the database record
      const attachmentId = await createAttachment.mutateAsync({
        messageId,
        fileName: uploadResult.filename,
        fileSize: uploadResult.size,
        fileType: uploadResult.type,
        storagePath: uploadResult.path,
        userId,
      });

      return { attachmentId, ...uploadResult };
    },
  });
} 