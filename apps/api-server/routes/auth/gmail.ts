import { Router } from 'express'
import { google } from 'googleapis'
import { supabase } from '../../utils/supabase'

const router = Router()

// Gmail OAuth configuration
const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  `${process.env.API_URL}/auth/gmail/callback`
)

// Scopes needed for Gmail access
const SCOPES = [
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/gmail.send',
  'https://www.googleapis.com/auth/gmail.modify',
  'https://www.googleapis.com/auth/userinfo.email'
]

// Start OAuth flow
router.get('/connect', (req, res) => {
  const { channelName, userId } = req.query

  if (!channelName || !userId) {
    return res.status(400).json({ error: 'Missing channelName or userId' })
  }

  // Generate OAuth URL with state parameter
  const state = Buffer.from(JSON.stringify({ channelName, userId })).toString('base64')
  
  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
    state,
    prompt: 'consent' // Force consent to get refresh token
  })

  return res.redirect(authUrl)
})

// OAuth callback
router.get('/callback', async (req, res) => {
  const { code, state } = req.query

  if (!code || !state) {
    return res.status(400).send('Missing code or state parameter')
  }

  try {
    // Decode state
    const { channelName, userId } = JSON.parse(
      Buffer.from(state as string, 'base64').toString()
    )

    // Exchange code for tokens
    const { tokens } = await oauth2Client.getToken(code as string)
    oauth2Client.setCredentials(tokens)

    // Get user email
    const gmail = google.gmail({ version: 'v1', auth: oauth2Client })
    const profile = await gmail.users.getProfile({ userId: 'me' })
    const emailAddress = profile.data.emailAddress

    // Save channel to database
    const { error } = await supabase.from('channels').insert({
      name: channelName,
      type: 'email',
      provider: 'gmail',
      email_address: emailAddress,
      is_active: true,
      settings: {
        oauth_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        token_expiry: tokens.expiry_date,
        sync_interval: 5 // minutes
      }
    })

    if (error) {
      console.error('Error saving channel:', error)
      return res.status(500).send('Error saving email channel')
    }

    // Redirect back to dashboard
    return res.redirect(`${process.env.DASHBOARD_URL}/kanalen/email?success=true`)
  } catch (error) {
    console.error('OAuth callback error:', error)
    return res.status(500).send('Authentication failed')
  }
})

// Refresh token endpoint
router.post('/refresh/:channelId', async (req, res) => {
  const { channelId } = req.params

  try {
    // Get channel from database
    const { data: channel, error } = await supabase
      .from('channels')
      .select('*')
      .eq('id', channelId)
      .single()

    if (error || !channel) {
      return res.status(404).json({ error: 'Channel not found' })
    }

    // Set up OAuth client with refresh token
    oauth2Client.setCredentials({
      refresh_token: channel.settings.refresh_token
    })

    // Get new access token
    const { credentials } = await oauth2Client.refreshAccessToken()

    // Update channel with new token
    await supabase
      .from('channels')
      .update({
        settings: {
          ...channel.settings,
          oauth_token: credentials.access_token,
          token_expiry: credentials.expiry_date
        }
      })
      .eq('id', channelId)

    return res.json({ success: true })
  } catch (error) {
    console.error('Token refresh error:', error)
    return res.status(500).json({ error: 'Failed to refresh token' })
  }
})

// Disconnect Gmail account
router.delete('/disconnect/:channelId', async (req, res) => {
  const { channelId } = req.params

  try {
    const { error } = await supabase
      .from('channels')
      .delete()
      .eq('id', channelId)

    if (error) {
      return res.status(500).json({ error: 'Failed to disconnect channel' })
    }

    return res.json({ success: true })
  } catch (error) {
    console.error('Disconnect error:', error)
    return res.status(500).json({ error: 'Failed to disconnect' })
  }
})

export default router 