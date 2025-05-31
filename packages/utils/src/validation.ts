import { z } from 'zod';

// Email validation
export const emailSchema = z.string().email('Invalid email address');

// Phone validation (basic international format)
export const phoneSchema = z.string().regex(
  /^\+?[1-9]\d{1,14}$/,
  'Invalid phone number format'
);

// Ticket schemas
export const ticketStatusSchema = z.enum(['new', 'open', 'pending', 'resolved', 'closed']);
export const ticketPrioritySchema = z.enum(['low', 'normal', 'high', 'urgent']);

export const createTicketSchema = z.object({
  subject: z.string().min(1, 'Subject is required').max(200),
  description: z.string().optional(),
  priority: ticketPrioritySchema.default('normal'),
  customerEmail: emailSchema,
  customerName: z.string().min(1).max(100),
  channel: z.enum(['email', 'whatsapp', 'chat', 'phone', 'api']),
  metadata: z.record(z.unknown()).optional(),
});

// Message schemas
export const createMessageSchema = z.object({
  conversationId: z.string().uuid(),
  content: z.string().min(1, 'Message content is required'),
  attachments: z.array(z.object({
    url: z.string().url(),
    name: z.string(),
    size: z.number(),
    type: z.string(),
  })).optional(),
  isInternal: z.boolean().default(false),
});

// Webhook schemas
export const webhookPayloadSchema = z.object({
  channel: z.string(),
  payload: z.record(z.unknown()),
  headers: z.record(z.string()).optional(),
  signature: z.string().optional(),
});

// Type exports
export type TicketStatus = z.infer<typeof ticketStatusSchema>;
export type TicketPriority = z.infer<typeof ticketPrioritySchema>;
export type CreateTicketInput = z.infer<typeof createTicketSchema>;
export type CreateMessageInput = z.infer<typeof createMessageSchema>;
export type WebhookPayload = z.infer<typeof webhookPayloadSchema>; 