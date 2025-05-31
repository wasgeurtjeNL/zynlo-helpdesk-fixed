# Zynlo Helpdesk API Server

This is the backend API server for the Zynlo Helpdesk system, handling email integrations and webhooks.

## Setup

1. **Create `.env` file**:
   ```bash
   cp .env.example .env
   ```

2. **Add your environment variables**:
   ```env
   # Server Configuration
   PORT=3001
   API_URL=http://localhost:3001
   DASHBOARD_URL=http://localhost:3000

   # Supabase Configuration
   SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

   # Google OAuth Configuration
   GOOGLE_CLIENT_ID=your_google_client_id
   GOOGLE_CLIENT_SECRET=your_google_client_secret
   ```

3. **Install dependencies**:
   ```bash
   pnpm install
   ```

4. **Start development server**:
   ```bash
   pnpm dev
   ```

## Features

- Gmail OAuth integration
- Email sync via Gmail API
- Automatic ticket creation from emails
- Cron job for periodic email sync (every 5 minutes)
- Webhook endpoints for manual sync

## API Endpoints

- `GET /health` - Health check
- `GET /auth/gmail/connect` - Start Gmail OAuth flow
- `GET /auth/gmail/callback` - OAuth callback
- `POST /auth/gmail/refresh/:channelId` - Refresh OAuth token
- `DELETE /auth/gmail/disconnect/:channelId` - Disconnect Gmail account
- `POST /sync/gmail/:channelId` - Manually trigger email sync

## Development

The server uses:
- Express.js for the web framework
- TypeScript for type safety
- Gmail API for email integration
- Supabase for database operations
- Node-cron for scheduled tasks 