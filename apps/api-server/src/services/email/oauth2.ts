import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import { Client } from '@microsoft/microsoft-graph-client';
import { createClient } from '@supabase/supabase-js';
import 'isomorphic-fetch'; // Required for microsoft-graph-client

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

export interface OAuth2Config {
  provider: 'gmail' | 'outlook';
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  refreshToken?: string;
  accessToken?: string;
}

export interface OAuth2Tokens {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: Date;
}

export class OAuth2Handler {
  private googleClient?: OAuth2Client;
  private config: OAuth2Config;

  constructor(config: OAuth2Config) {
    this.config = config;

    if (config.provider === 'gmail') {
      this.googleClient = new OAuth2Client(
        config.clientId,
        config.clientSecret,
        config.redirectUri
      );

      // Set tokens if available
      if (config.refreshToken) {
        this.googleClient.setCredentials({
          refresh_token: config.refreshToken,
          access_token: config.accessToken,
        });
      }
    }
  }

  /**
   * Get authorization URL for OAuth2 flow
   */
  getAuthorizationUrl(): string {
    if (this.config.provider === 'gmail' && this.googleClient) {
      return this.googleClient.generateAuthUrl({
        access_type: 'offline',
        scope: [
          'https://www.googleapis.com/auth/gmail.readonly',
          'https://www.googleapis.com/auth/gmail.send',
          'https://mail.google.com/',
        ],
        prompt: 'consent', // Force consent to get refresh token
      });
    } else if (this.config.provider === 'outlook') {
      const scopes = [
        'https://graph.microsoft.com/mail.read',
        'https://graph.microsoft.com/mail.send',
        'offline_access', // For refresh token
      ];

      const authUrl = new URL('https://login.microsoftonline.com/common/oauth2/v2.0/authorize');
      authUrl.searchParams.append('client_id', this.config.clientId);
      authUrl.searchParams.append('response_type', 'code');
      authUrl.searchParams.append('redirect_uri', this.config.redirectUri);
      authUrl.searchParams.append('scope', scopes.join(' '));
      authUrl.searchParams.append('response_mode', 'query');
      authUrl.searchParams.append('prompt', 'consent');

      return authUrl.toString();
    }

    throw new Error(`Unsupported provider: ${this.config.provider}`);
  }

  /**
   * Exchange authorization code for tokens
   */
  async exchangeCodeForTokens(code: string): Promise<OAuth2Tokens> {
    if (this.config.provider === 'gmail' && this.googleClient) {
      const { tokens } = await this.googleClient.getToken(code);
      
      return {
        accessToken: tokens.access_token || '',
        refreshToken: tokens.refresh_token || undefined,
        expiresAt: tokens.expiry_date ? new Date(tokens.expiry_date) : undefined,
      };
    } else if (this.config.provider === 'outlook') {
      const tokenUrl = 'https://login.microsoftonline.com/common/oauth2/v2.0/token';
      
      const params = new URLSearchParams({
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret,
        code: code,
        redirect_uri: this.config.redirectUri,
        grant_type: 'authorization_code',
      });

      const response = await fetch(tokenUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params.toString(),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Failed to exchange code: ${error}`);
      }

      const data = await response.json();

      return {
        accessToken: (data as any).access_token,
        refreshToken: (data as any).refresh_token || undefined,
        expiresAt: (data as any).expires_in ? new Date(Date.now() + (data as any).expires_in * 1000) : undefined,
      };
    }

    throw new Error(`Unsupported provider: ${this.config.provider}`);
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshAccessToken(refreshToken: string): Promise<OAuth2Tokens> {
    if (this.config.provider === 'gmail' && this.googleClient) {
      this.googleClient.setCredentials({
        refresh_token: refreshToken,
      });

      const { credentials } = await this.googleClient.refreshAccessToken();
      
      return {
        accessToken: credentials.access_token || '',
        refreshToken: credentials.refresh_token || refreshToken,
        expiresAt: credentials.expiry_date ? new Date(credentials.expiry_date) : undefined,
      };
    } else if (this.config.provider === 'outlook') {
      const tokenUrl = 'https://login.microsoftonline.com/common/oauth2/v2.0/token';
      
      const params = new URLSearchParams({
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      });

      const response = await fetch(tokenUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params.toString(),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Failed to refresh token: ${error}`);
      }

      const data = await response.json();

      return {
        accessToken: (data as any).access_token,
        refreshToken: (data as any).refresh_token || refreshToken,
        expiresAt: (data as any).expires_in ? new Date(Date.now() + (data as any).expires_in * 1000) : undefined,
      };
    }

    throw new Error(`Unsupported provider: ${this.config.provider}`);
  }

  /**
   * Get valid access token (refreshes if needed)
   */
  async getValidAccessToken(channelId: string): Promise<string> {
    // Get stored tokens from database
    const { data: channel, error } = await supabase
      .from('channels')
      .select('settings')
      .eq('id', channelId)
      .single();

    if (error || !channel) {
      throw new Error('Channel not found');
    }

    const settings = channel.settings as any;
    const refreshToken = settings.oauth_refresh_token;
    const accessToken = settings.oauth_access_token;
    const expiresAt = settings.oauth_expires_at ? new Date(settings.oauth_expires_at) : null;

    // Check if token is still valid
    if (accessToken && expiresAt && expiresAt > new Date()) {
      return accessToken;
    }

    // Token expired, refresh it
    if (!refreshToken) {
      throw new Error('No refresh token available');
    }

    const tokens = await this.refreshAccessToken(refreshToken);

    // Update tokens in database
    await supabase
      .from('channels')
      .update({
        settings: {
          ...settings,
          oauth_access_token: tokens.accessToken,
          oauth_refresh_token: tokens.refreshToken || refreshToken,
          oauth_expires_at: tokens.expiresAt?.toISOString(),
        }
      })
      .eq('id', channelId);

    return tokens.accessToken;
  }

  /**
   * Test connection with current tokens
   */
  async testConnection(accessToken: string): Promise<boolean> {
    try {
      if (this.config.provider === 'gmail') {
        const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
        });

        if (!response.ok) {
          return false;
        }

        const data = await response.json();
        return !!(data as any).email;
      } else if (this.config.provider === 'outlook') {
        const client = Client.init({
          authProvider: (done) => {
            done(null, accessToken);
          },
        });

        const user = await client.api('/me').get();
        return !!user.mail || !!user.userPrincipalName;
      }

      return false;
    } catch (error) {
      console.error('Connection test failed:', error);
      return false;
    }
  }
} 