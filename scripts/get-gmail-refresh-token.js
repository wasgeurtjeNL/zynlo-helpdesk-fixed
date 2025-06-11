// Script: scripts/get-gmail-refresh-token.js
// Purpose: Interactive utility to obtain a Gmail OAuth2 refresh token for use with SMTP.
// Usage:
//   1. Run `node scripts/get-gmail-refresh-token.js` (ensure googleapis & open packages are installed).
//   2. Follow console instructions to input your Google OAuth Client ID and Secret (or set as env vars).
//   3. Script opens the consent URL in the browser. Log in with the Gmail account you want to connect.
//   4. Paste the resulting code from the redirect URL back into the terminal.
//   5. Refresh token will be printed to console (copy into your .env or database channel settings).

const readline = require('node:readline/promises')
const { google } = require('googleapis')
const { randomUUID } = require('crypto')

async function prompt(question, defaultValue) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
  const answer = await rl.question(`${question}${defaultValue ? ` (${defaultValue})` : ''}: `)
  rl.close()
  return answer.trim() || defaultValue
}

async function main() {
  console.log('\n🛠  Gmail OAuth2 Refresh Token Generator')

  // Fetch credentials from env or prompt
  const clientId = await prompt('Google OAuth Client ID', process.env.GMAIL_CLIENT_ID)
  const clientSecret = await prompt('Google OAuth Client Secret', process.env.GMAIL_CLIENT_SECRET)
  const redirectUri = 'urn:ietf:wg:oauth:2.0:oob'

  if (!clientId || !clientSecret) {
    console.error('❌ Client ID and Secret are required.')
    process.exit(1)
  }

  const oAuth2Client = new google.auth.OAuth2({ clientId, clientSecret, redirectUri })

  const scopes = [
    'https://mail.google.com/', // Full access to Gmail (read/send)
    'https://www.googleapis.com/auth/userinfo.email',
    'https://www.googleapis.com/auth/userinfo.profile',
  ]

  const state = randomUUID()
  const authUrl = oAuth2Client.generateAuthUrl({ access_type: 'offline', scope: scopes, state, prompt: 'consent' })
  console.log('\n👉 Opening browser for consent...')

  // Dynamically import 'open' (ESM-only) at runtime
  try {
    const { default: open } = await import('open')
    await open(authUrl)
  } catch (err) {
    console.warn('⚠️  Kon browser niet automatisch openen:', err.message)
    console.log('Open handmatig deze URL in je browser:\n', authUrl, '\n')
  }

  // Even if browser opened, print URL for reference
  console.log('If the browser did not open, visit this URL manually:\n', authUrl, '\n')

  // Capture code
  const code = await prompt('Paste the authorization code here')
  if (!code) {
    console.error('❌ No code provided.')
    process.exit(1)
  }

  try {
    const { tokens } = await oAuth2Client.getToken(code)
    if (!tokens.refresh_token) {
      console.error('❌ No refresh_token returned. Ensure you requested offline access and haven\'t used this client before with the same account.')
      process.exit(1)
    }

    console.log('\n✅ Successfully obtained tokens:')
    console.log('Access Token:', tokens.access_token)
    console.log('Refresh Token:', tokens.refresh_token)
    console.log('\nAdd these to your environment or database channel settings.')
  } catch (err) {
    console.error('❌ Failed to exchange code for tokens:', err)
    process.exit(1)
  }
}

main().catch(err => {
  console.error('Unexpected error:', err)
  process.exit(1)
}) 