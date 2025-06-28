/**
 * Gmail OAuth Service
 * Uses official googleapis library for secure Gmail integration
 */

import { google } from 'googleapis';

export interface GmailOAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}

export interface GmailTokens {
  access_token: string;
  refresh_token?: string;
  scope: string;
  token_type: string;
  expiry_date?: number;
}

export class GmailOAuthService {
  private oauth2Client: any;

  constructor(config: GmailOAuthConfig) {
    this.oauth2Client = new google.auth.OAuth2(
      config.clientId,
      config.clientSecret,
      config.redirectUri
    );
  }

  /**
   * Generate authorization URL for Gmail OAuth flow
   */
  generateAuthUrl(state?: string): string {
    return this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      prompt: 'consent', // Forces refresh token
      scope: [
        'https://www.googleapis.com/auth/gmail.readonly',
        'https://www.googleapis.com/auth/gmail.send',
        'https://www.googleapis.com/auth/userinfo.email',
      ],
      state: state || undefined,
    });
  }

  /**
   * Exchange authorization code for tokens
   */
  async exchangeCodeForTokens(code: string): Promise<GmailTokens> {
    const { tokens } = await this.oauth2Client.getAccessToken(code);
    return tokens as GmailTokens;
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshAccessToken(refreshToken: string): Promise<GmailTokens> {
    this.oauth2Client.setCredentials({
      refresh_token: refreshToken,
    });

    const { tokens } = await this.oauth2Client.refreshAccessToken();
    return tokens as GmailTokens;
  }

  /**
   * Get authenticated Gmail API client
   */
  getGmailClient(tokens: GmailTokens) {
    this.oauth2Client.setCredentials(tokens);
    return google.gmail({ version: 'v1', auth: this.oauth2Client });
  }

  /**
   * Get user profile information
   */
  async getUserProfile(tokens: GmailTokens) {
    this.oauth2Client.setCredentials(tokens);
    const oauth2 = google.oauth2({ version: 'v2', auth: this.oauth2Client });
    const { data } = await oauth2.userinfo.get();
    return data;
  }

  /**
   * Test if tokens are valid
   */
  async validateTokens(tokens: GmailTokens): Promise<boolean> {
    try {
      this.oauth2Client.setCredentials(tokens);
      const gmail = google.gmail({ version: 'v1', auth: this.oauth2Client });
      await gmail.users.getProfile({ userId: 'me' });
      return true;
    } catch (error) {
      console.error('Token validation failed:', error);
      return false;
    }
  }
}

/**
 * Factory function to create Gmail OAuth service
 */
export function createGmailOAuthService(): GmailOAuthService {
  const clientId = process.env.GMAIL_CLIENT_ID;
  const clientSecret = process.env.GMAIL_CLIENT_SECRET;
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  if (!clientId || !clientSecret) {
    throw new Error(
      'Gmail OAuth credentials not configured. Set GMAIL_CLIENT_ID and GMAIL_CLIENT_SECRET in environment variables.'
    );
  }

  return new GmailOAuthService({
    clientId,
    clientSecret,
    redirectUri: `${baseUrl}/api/auth/gmail/callback`,
  });
}

/**
 * Gmail API helper functions
 */
export class GmailApiHelper {
  private gmail: any;

  constructor(gmailClient: any) {
    this.gmail = gmailClient;
  }

  /**
   * Get user's Gmail profile
   */
  async getProfile() {
    const response = await this.gmail.users.getProfile({ userId: 'me' });
    return response.data;
  }

  /**
   * List messages with optional query
   */
  async listMessages(query?: string, maxResults = 50) {
    const response = await this.gmail.users.messages.list({
      userId: 'me',
      q: query,
      maxResults,
    });
    return response.data;
  }

  /**
   * Get specific message by ID
   */
  async getMessage(messageId: string) {
    const response = await this.gmail.users.messages.get({
      userId: 'me',
      id: messageId,
      format: 'full',
    });
    return response.data;
  }

  /**
   * Send email via Gmail API
   */
  async sendEmail(to: string, subject: string, body: string, isHtml = false) {
    const mimeType = isHtml ? 'text/html' : 'text/plain';
    const messageParts = [
      `To: ${to}`,
      `Subject: ${subject}`,
      `Content-Type: ${mimeType}; charset=utf-8`,
      '',
      body,
    ];

    const message = messageParts.join('\n');
    const encodedMessage = Buffer.from(message)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    const response = await this.gmail.users.messages.send({
      userId: 'me',
      requestBody: {
        raw: encodedMessage,
      },
    });

    return response.data;
  }
}
