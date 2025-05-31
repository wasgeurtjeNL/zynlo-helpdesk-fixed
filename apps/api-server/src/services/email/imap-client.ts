import * as imaps from 'imap-simple';
import { Config as ImapConfig } from 'imap';
import { simpleParser, ParsedMail } from 'mailparser';
import { OAuth2Handler } from './oauth2';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

export interface ImapConnectionConfig {
  channelId: string;
  provider: 'gmail' | 'outlook' | 'other';
  host?: string;
  port?: number;
  tls?: boolean;
  oauth2Handler?: OAuth2Handler;
  // For non-OAuth2 connections
  username?: string;
  password?: string;
}

export interface EmailMessage {
  uid: number;
  messageId: string;
  date: Date;
  from: {
    address: string;
    name?: string;
  }[];
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
  subject: string;
  text?: string;
  html?: string;
  attachments: {
    filename: string;
    contentType: string;
    size: number;
    content?: Buffer;
  }[];
  inReplyTo?: string;
  references?: string[];
  headers: Map<string, string[]>;
}

export class ImapClient {
  private config: ImapConnectionConfig;
  private connection?: imaps.ImapSimple;
  private connectionPool: Map<string, imaps.ImapSimple> = new Map();

  constructor(config: ImapConnectionConfig) {
    this.config = config;
  }

  /**
   * Build IMAP configuration based on provider
   */
  private async buildImapConfig(): Promise<ImapConfig> {
    let imapConfig: Partial<ImapConfig> = {
      port: this.config.port || 993,
      tls: this.config.tls !== false,
      tlsOptions: { rejectUnauthorized: false },
      keepalive: true,
    };

    if (this.config.provider === 'gmail') {
      imapConfig.host = 'imap.gmail.com';
      
      if (this.config.oauth2Handler) {
        const accessToken = await this.config.oauth2Handler.getValidAccessToken(this.config.channelId);
        
        // Get user email from channel settings
        const { data: channel } = await supabase
          .from('channels')
          .select('settings')
          .eq('id', this.config.channelId)
          .single();
        
        const userEmail = (channel?.settings as any)?.email_address || this.config.username;
        
        imapConfig.user = userEmail!;
        imapConfig.xoauth2 = this.buildXOAuth2String(userEmail!, accessToken);
      } else {
        imapConfig.user = this.config.username!;
        imapConfig.password = this.config.password!;
      }
    } else if (this.config.provider === 'outlook') {
      imapConfig.host = 'outlook.office365.com';
      
      if (this.config.oauth2Handler) {
        const accessToken = await this.config.oauth2Handler.getValidAccessToken(this.config.channelId);
        
        // Get user email from channel settings
        const { data: channel } = await supabase
          .from('channels')
          .select('settings')
          .eq('id', this.config.channelId)
          .single();
        
        const userEmail = (channel?.settings as any)?.email_address || this.config.username;
        
        imapConfig.user = userEmail!;
        imapConfig.xoauth2 = this.buildXOAuth2String(userEmail!, accessToken);
      } else {
        imapConfig.user = this.config.username!;
        imapConfig.password = this.config.password!;
      }
    } else {
      // Custom IMAP server
      imapConfig.host = this.config.host!;
      imapConfig.port = this.config.port || 993;
      imapConfig.user = this.config.username!;
      imapConfig.password = this.config.password!;
    }

    return imapConfig as ImapConfig;
  }

  /**
   * Build XOAuth2 string for authentication
   */
  private buildXOAuth2String(email: string, accessToken: string): string {
    const authString = [
      `user=${email}`,
      `auth=Bearer ${accessToken}`,
      '',
      ''
    ].join('\x01');
    
    return Buffer.from(authString).toString('base64');
  }

  /**
   * Connect to IMAP server
   */
  async connect(): Promise<void> {
    // Check if connection already exists in pool
    const poolKey = this.config.channelId;
    if (this.connectionPool.has(poolKey)) {
      this.connection = this.connectionPool.get(poolKey);
      return;
    }

    const imapConfig = await this.buildImapConfig();
    
    try {
      this.connection = await imaps.connect({ imap: imapConfig });
      this.connectionPool.set(poolKey, this.connection);
      console.log(`Connected to IMAP server for channel ${this.config.channelId}`);
    } catch (error) {
      console.error('Failed to connect to IMAP server:', error);
      throw new Error(`IMAP connection failed: ${error}`);
    }
  }

  /**
   * Disconnect from IMAP server
   */
  async disconnect(): Promise<void> {
    if (this.connection) {
      this.connection.end();
      this.connectionPool.delete(this.config.channelId);
      this.connection = undefined;
    }
  }

  /**
   * List available folders
   */
  async listFolders(): Promise<string[]> {
    if (!this.connection) {
      await this.connect();
    }

    const boxes = await this.connection!.getBoxes();
    
    const folders: string[] = [];
    const extractFolders = (boxes: any, prefix = '') => {
      for (const [name, box] of Object.entries(boxes)) {
        const fullName = prefix ? `${prefix}/${name}` : name;
        folders.push(fullName);
        
        if (box && typeof box === 'object' && !Array.isArray(box)) {
          // Check if it has child folders
          const hasChildren = Object.keys(box as Record<string, any>).some(key => 
            typeof (box as Record<string, any>)[key] === 'object' && !Array.isArray((box as Record<string, any>)[key])
          );
          
          if (hasChildren) {
            extractFolders(box, fullName);
          }
        }
      }
    };

    extractFolders(boxes);
    return folders;
  }

  /**
   * Fetch messages from a folder
   */
  async fetchMessages(
    folder: string = 'INBOX',
    criteria: string[] = ['UNSEEN'],
    limit: number = 50
  ): Promise<EmailMessage[]> {
    if (!this.connection) {
      await this.connect();
    }

    await this.connection!.openBox(folder);

    // Search for messages
    const searchResults = await this.connection!.search(criteria, {
      bodies: 'HEADER.FIELDS (FROM TO CC BCC SUBJECT DATE MESSAGE-ID IN-REPLY-TO REFERENCES)',
      struct: true,
      envelope: true,
    });

    // Limit results
    const limitedResults = searchResults.slice(0, limit);

    const messages: EmailMessage[] = [];

    for (const item of limitedResults) {
      try {
        // Fetch full message
        const all = await this.connection!.search([`UID ${item.attributes.uid}`], {
          bodies: '',
          struct: true,
          envelope: true,
        });

        if (all.length === 0) continue;

        const message = all[0];
        const parsed = await simpleParser(message.parts.find(p => p.which === '')?.body || '');

        messages.push(this.convertParsedMail(parsed, item.attributes.uid));
      } catch (error) {
        console.error(`Failed to parse message UID ${item.attributes.uid}:`, error);
      }
    }

    return messages;
  }

  /**
   * Fetch a single message by UID
   */
  async fetchMessage(uid: number, folder: string = 'INBOX'): Promise<EmailMessage | null> {
    if (!this.connection) {
      await this.connect();
    }

    await this.connection!.openBox(folder);

    const messages = await this.connection!.search([`UID ${uid}`], {
      bodies: '',
      struct: true,
      envelope: true,
    });

    if (messages.length === 0) {
      return null;
    }

    const message = messages[0];
    const parsed = await simpleParser(message.parts.find(p => p.which === '')?.body || '');

    return this.convertParsedMail(parsed, uid);
  }

  /**
   * Mark message as seen
   */
  async markAsSeen(uid: number, folder: string = 'INBOX'): Promise<void> {
    if (!this.connection) {
      await this.connect();
    }

    await this.connection!.openBox(folder);
    await this.connection!.addFlags(uid, '\\Seen');
  }

  /**
   * Mark message as unseen
   */
  async markAsUnseen(uid: number, folder: string = 'INBOX'): Promise<void> {
    if (!this.connection) {
      await this.connect();
    }

    await this.connection!.openBox(folder);
    await this.connection!.delFlags(uid, '\\Seen');
  }

  /**
   * Move message to another folder
   */
  async moveMessage(uid: number, fromFolder: string, toFolder: string): Promise<void> {
    if (!this.connection) {
      await this.connect();
    }

    await this.connection!.openBox(fromFolder);
    await this.connection!.moveMessage(uid.toString(), toFolder);
  }

  /**
   * Delete message
   */
  async deleteMessage(uid: number, folder: string = 'INBOX'): Promise<void> {
    if (!this.connection) {
      await this.connect();
    }

    await this.connection!.openBox(folder);
    await this.connection!.addFlags([uid], '\\Deleted');
    await this.connection!.closeBox(true); // Expunge on close
  }

  /**
   * Start IDLE connection for real-time updates
   */
  async startIdleConnection(
    folder: string = 'INBOX',
    onNewMessage: (message: EmailMessage) => void
  ): Promise<void> {
    if (!this.connection) {
      await this.connect();
    }

    await this.connection!.openBox(folder);

    // Set up event listeners
    this.connection!.on('mail', async (numNewMail: number) => {
      console.log(`New mail received: ${numNewMail} messages`);
      
      // Fetch new messages
      const messages = await this.fetchMessages(folder, ['UNSEEN'], numNewMail);
      
      for (const message of messages) {
        onNewMessage(message);
      }
    });

    // Start IDLE
    console.log('Starting IDLE connection...');
  }

  /**
   * Convert ParsedMail to EmailMessage
   */
  private convertParsedMail(parsed: ParsedMail, uid: number): EmailMessage {
    const headers = new Map<string, string[]>();
    
    if (parsed.headers) {
      parsed.headers.forEach((value, key) => {
        if (Array.isArray(value)) {
          // Handle string arrays
          if (value.every(v => typeof v === 'string')) {
            headers.set(key, value as string[]);
          } else {
            // Convert non-string values to strings
            headers.set(key, value.map(v => String(v)));
          }
        } else {
          headers.set(key, [String(value)]);
        }
      });
    }

    return {
      uid,
      messageId: parsed.messageId || '',
      date: parsed.date || new Date(),
      from: this.parseAddresses(parsed.from),
      to: this.parseAddresses(parsed.to),
      cc: parsed.cc ? this.parseAddresses(parsed.cc) : undefined,
      bcc: parsed.bcc ? this.parseAddresses(parsed.bcc) : undefined,
      subject: parsed.subject || '',
      text: parsed.text,
      html: parsed.html || undefined,
      attachments: (parsed.attachments || []).map(att => ({
        filename: att.filename || 'attachment',
        contentType: att.contentType || 'application/octet-stream',
        size: att.size || 0,
        content: att.content,
      })),
      inReplyTo: parsed.inReplyTo,
      references: parsed.references ? 
        (Array.isArray(parsed.references) ? parsed.references : [parsed.references]) : 
        undefined,
      headers,
    };
  }

  /**
   * Parse email addresses
   */
  private parseAddresses(addresses: any): { address: string; name?: string }[] {
    if (!addresses) return [];
    
    const addressArray = Array.isArray(addresses) ? addresses : [addresses];
    
    return addressArray.map(addr => {
      if (typeof addr === 'string') {
        return { address: addr };
      } else if (addr.value) {
        return addr.value.map((v: any) => ({
          address: v.address || '',
          name: v.name,
        }));
      } else {
        return {
          address: addr.address || '',
          name: addr.name,
        };
      }
    }).flat();
  }
} 