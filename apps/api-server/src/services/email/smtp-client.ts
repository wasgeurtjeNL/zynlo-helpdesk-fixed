import * as nodemailer from 'nodemailer';
import { OAuth2Handler } from './oauth2';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

export interface SmtpConnectionConfig {
  channelId: string;
  provider: 'gmail' | 'outlook' | 'other';
  host?: string;
  port?: number;
  secure?: boolean;
  oauth2Handler?: OAuth2Handler;
  // For non-OAuth2 connections
  username?: string;
  password?: string;
}

export interface EmailSendOptions {
  from: {
    address: string;
    name?: string;
  };
  to: {
    address: string;
    name?: string;
  }[];
  cc?: {
    address: string;
    name?: string;
  }[];
  bcc?: {
    address: string;
    name?: string;
  }[];
  replyTo?: {
    address: string;
    name?: string;
  };
  subject: string;
  text?: string;
  html?: string;
  attachments?: {
    filename: string;
    content?: Buffer | string;
    path?: string;
    contentType?: string;
    cid?: string; // For embedded images
  }[];
  inReplyTo?: string;
  references?: string[];
  headers?: Record<string, string>;
}

export interface EmailSendResult {
  messageId: string;
  accepted: string[];
  rejected: string[];
  response: string;
}

export class SmtpClient {
  private config: SmtpConnectionConfig;
  private transporterPool: Map<string, nodemailer.Transporter> = new Map();

  constructor(config: SmtpConnectionConfig) {
    this.config = config;
  }

  /**
   * Get or create SMTP transporter
   */
  private async getTransporter(): Promise<nodemailer.Transporter> {
    const poolKey = this.config.channelId;
    
    // Check if transporter already exists
    if (this.transporterPool.has(poolKey)) {
      const transporter = this.transporterPool.get(poolKey)!;
      
      // Verify connection is still good
      try {
        await transporter.verify();
        return transporter;
      } catch (error) {
        // Connection failed, recreate
        console.log(`SMTP connection failed for channel ${poolKey}, recreating...`);
        this.transporterPool.delete(poolKey);
      }
    }

    // Create new transporter
    const transporter = await this.createTransporter();
    this.transporterPool.set(poolKey, transporter);
    
    return transporter;
  }

  /**
   * Create SMTP transporter based on provider
   */
  private async createTransporter(): Promise<nodemailer.Transporter> {
    let transportConfig: any;

    if (this.config.provider === 'gmail') {
      if (this.config.oauth2Handler) {
        // Get valid access token
        const accessToken = await this.config.oauth2Handler.getValidAccessToken(this.config.channelId);
        
        // Get user email from channel settings
        const { data: channel } = await supabase
          .from('channels')
          .select('settings')
          .eq('id', this.config.channelId)
          .single();
        
        const userEmail = (channel?.settings as any)?.email_address || this.config.username;

        transportConfig = {
          service: 'gmail',
          auth: {
            type: 'OAuth2',
            user: userEmail,
            accessToken: accessToken,
          },
        };
      } else {
        // Use app password
        transportConfig = {
          service: 'gmail',
          auth: {
            user: this.config.username!,
            pass: this.config.password!,
          },
        };
      }
    } else if (this.config.provider === 'outlook') {
      if (this.config.oauth2Handler) {
        // Get valid access token
        const accessToken = await this.config.oauth2Handler.getValidAccessToken(this.config.channelId);
        
        // Get user email from channel settings
        const { data: channel } = await supabase
          .from('channels')
          .select('settings')
          .eq('id', this.config.channelId)
          .single();
        
        const userEmail = (channel?.settings as any)?.email_address || this.config.username;

        transportConfig = {
          host: 'smtp.office365.com',
          port: 587,
          secure: false,
          auth: {
            type: 'OAuth2',
            user: userEmail,
            accessToken: accessToken,
          },
          tls: {
            ciphers: 'SSLv3',
          },
        };
      } else {
        // Use password
        transportConfig = {
          host: 'smtp.office365.com',
          port: 587,
          secure: false,
          auth: {
            user: this.config.username!,
            pass: this.config.password!,
          },
          tls: {
            ciphers: 'SSLv3',
          },
        };
      }
    } else {
      // Custom SMTP server
      transportConfig = {
        host: this.config.host!,
        port: this.config.port || 587,
        secure: this.config.secure || false,
        auth: {
          user: this.config.username!,
          pass: this.config.password!,
        },
      };
    }

    const transporter = nodemailer.createTransport(transportConfig);

    // Verify connection
    try {
      await transporter.verify();
      console.log(`SMTP connection verified for channel ${this.config.channelId}`);
    } catch (error) {
      console.error(`SMTP connection failed for channel ${this.config.channelId}:`, error);
      throw error;
    }

    return transporter;
  }

  /**
   * Send an email
   */
  async sendEmail(options: EmailSendOptions): Promise<EmailSendResult> {
    const transporter = await this.getTransporter();

    // Generate Message-ID if not provided
    const messageId = this.generateMessageId(options.from.address);

    // Build email headers
    const headers: Record<string, string> = {
      'Message-ID': messageId,
      ...options.headers,
    };

    if (options.inReplyTo) {
      headers['In-Reply-To'] = options.inReplyTo;
    }

    if (options.references && options.references.length > 0) {
      headers['References'] = options.references.join(' ');
    }

    // Build mail options
    const mailOptions: nodemailer.SendMailOptions = {
      from: this.formatAddress(options.from),
      to: options.to.map(addr => this.formatAddress(addr)),
      cc: options.cc?.map(addr => this.formatAddress(addr)),
      bcc: options.bcc?.map(addr => this.formatAddress(addr)),
      replyTo: options.replyTo ? this.formatAddress(options.replyTo) : undefined,
      subject: options.subject,
      text: options.text,
      html: options.html,
      attachments: options.attachments?.map(att => ({
        filename: att.filename,
        content: att.content,
        path: att.path,
        contentType: att.contentType,
        cid: att.cid,
      })),
      headers,
      messageId,
    };

    // Send email with retry logic
    let lastError: Error | null = null;
    const maxRetries = 3;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const info = await transporter.sendMail(mailOptions);

        return {
          messageId: info.messageId || messageId,
          accepted: info.accepted as string[],
          rejected: info.rejected as string[],
          response: info.response,
        };
      } catch (error) {
        lastError = error as Error;
        console.error(`Email send attempt ${attempt} failed:`, error);

        if (attempt < maxRetries) {
          // Wait before retry with exponential backoff
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
          
          // Recreate transporter on auth errors
          if (lastError.message.includes('auth') || lastError.message.includes('Authentication')) {
            this.transporterPool.delete(this.config.channelId);
          }
        }
      }
    }

    throw new Error(`Failed to send email after ${maxRetries} attempts: ${lastError?.message}`);
  }

  /**
   * Send a reply to an existing email
   */
  async sendReply(
    originalMessage: {
      messageId: string;
      references?: string[];
      subject: string;
    },
    replyOptions: EmailSendOptions
  ): Promise<EmailSendResult> {
    // Build references chain
    const references = originalMessage.references || [];
    references.push(originalMessage.messageId);

    // Add Re: to subject if not already present
    let subject = replyOptions.subject;
    if (!subject.toLowerCase().startsWith('re:')) {
      subject = `Re: ${originalMessage.subject}`;
    }

    // Send with proper threading headers
    return this.sendEmail({
      ...replyOptions,
      subject,
      inReplyTo: originalMessage.messageId,
      references,
    });
  }

  /**
   * Forward an email
   */
  async forwardEmail(
    originalMessage: {
      subject: string;
      from: string;
      date: Date;
      body: string;
    },
    forwardOptions: EmailSendOptions
  ): Promise<EmailSendResult> {
    // Add Fwd: to subject if not already present
    let subject = forwardOptions.subject;
    if (!subject.toLowerCase().startsWith('fwd:') && !subject.toLowerCase().startsWith('fw:')) {
      subject = `Fwd: ${originalMessage.subject}`;
    }

    // Build forward body
    const forwardHeader = `
---------- Forwarded message ----------
From: ${originalMessage.from}
Date: ${originalMessage.date.toLocaleString()}
Subject: ${originalMessage.subject}

`;

    const text = forwardOptions.text 
      ? `${forwardOptions.text}\n\n${forwardHeader}${originalMessage.body}`
      : `${forwardHeader}${originalMessage.body}`;

    const html = forwardOptions.html
      ? `${forwardOptions.html}<br><br><div style="border-left: 2px solid #ccc; padding-left: 10px; margin-left: 10px;">${forwardHeader.replace(/\n/g, '<br>')}${originalMessage.body}</div>`
      : undefined;

    // Send forwarded email
    return this.sendEmail({
      ...forwardOptions,
      subject,
      text,
      html,
    });
  }

  /**
   * Close SMTP connection
   */
  async close(): Promise<void> {
    const transporter = this.transporterPool.get(this.config.channelId);
    if (transporter) {
      transporter.close();
      this.transporterPool.delete(this.config.channelId);
      console.log(`SMTP connection closed for channel ${this.config.channelId}`);
    }
  }

  /**
   * Close all SMTP connections
   */
  static async closeAll(): Promise<void> {
    // Note: This would need a static registry of all clients
    // For now, individual clients manage their own connections
  }

  /**
   * Format email address
   */
  private formatAddress(addr: { address: string; name?: string }): string {
    if (addr.name) {
      // Escape quotes in name
      const name = addr.name.replace(/"/g, '\\"');
      return `"${name}" <${addr.address}>`;
    }
    return addr.address;
  }

  /**
   * Generate Message-ID
   */
  private generateMessageId(fromAddress: string): string {
    const timestamp = Date.now();
    const random = crypto.randomBytes(8).toString('hex');
    const domain = fromAddress.split('@')[1] || 'localhost';
    return `<${timestamp}.${random}@${domain}>`;
  }
} 