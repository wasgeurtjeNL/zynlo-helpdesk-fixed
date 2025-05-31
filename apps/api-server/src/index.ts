import dotenv from 'dotenv'
import path from 'path'

// Load environment variables FIRST, before any other imports
dotenv.config({ path: path.resolve(__dirname, '../.env') })
dotenv.config({ path: path.resolve(__dirname, '../.env.local') })

import express from 'express'
import cors from 'cors'
import * as cron from 'node-cron'

// Import routes
import gmailAuthRoutes from '../routes/auth/gmail'
import emailWebhookRoutes from '../routes/webhooks/email'
import whatsappWebhookRoutes from '../routes/webhooks/whatsapp'
import emailSendRoutes from '../routes/email/send'

// Import services
import { gmailSync } from '../services/gmail-sync'
import { emailPoller } from './services/email-poller'

const app = express()
const PORT = process.env.PORT || 3001

// Middleware
app.use(cors())
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// Routes
app.use('/auth/gmail', gmailAuthRoutes)
app.use('/webhooks/email', emailWebhookRoutes)
app.use('/webhooks/whatsapp', whatsappWebhookRoutes)
app.use('/email', emailSendRoutes)

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// Webhook endpoint for manual sync trigger
app.post('/sync/gmail/:channelId', async (req, res) => {
  const { channelId } = req.params
  
  try {
    const result = await gmailSync.syncChannel(channelId)
    res.json({ success: true, ...result })
  } catch (error) {
    console.error('Manual sync error:', error)
    res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Sync failed' 
    })
  }
})

// Start cron job for Gmail sync (every 5 minutes)
cron.schedule('*/5 * * * *', async () => {
  console.log('Running Gmail sync cron job...')
  try {
    await gmailSync.syncAllChannels()
  } catch (error) {
    console.error('Cron job error:', error)
  }
})

// Start server
app.listen(PORT, async () => {
  console.log(`API server running on port ${PORT}`)
  console.log('Gmail sync cron job scheduled to run every 5 minutes')
  console.log('Email webhook available at /webhooks/email')
  console.log('WhatsApp webhook available at /webhooks/whatsapp/:project_id')
  console.log('Email send API available at /email/send')
  
  // Start email poller
  try {
    await emailPoller.start();
    console.log('Email poller started successfully');
  } catch (error) {
    console.error('Failed to start email poller:', error);
  }
  
  // Log environment status
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY
  
  if (!supabaseUrl || !serviceKey) {
    console.warn('⚠️  Warning: Supabase credentials not configured')
    console.warn('   URL found:', !!supabaseUrl)
    console.warn('   Service key found:', !!serviceKey)
    console.warn('   Please add NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY to your .env.local file')
  }
  
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    console.warn('⚠️  Warning: Google OAuth credentials not configured')
    console.warn('   Gmail integration will not work without these credentials')
    console.warn('   See docs/EMAIL_INTEGRATION.md for setup instructions')
  }
  
  if (!process.env.EMAIL_WEBHOOK_SECRET) {
    console.info('ℹ️  Info: EMAIL_WEBHOOK_SECRET not configured')
    console.info('   Webhook signature validation will be skipped')
  }
})

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully...');
  await emailPoller.stop();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, shutting down gracefully...');
  await emailPoller.stop();
  process.exit(0);
});

// Error handling middleware
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Error:', err)
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error'
  })
}) 