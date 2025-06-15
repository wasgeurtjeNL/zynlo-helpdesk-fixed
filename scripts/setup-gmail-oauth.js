#!/usr/bin/env node

/**
 * Gmail OAuth Setup Script for Production
 * 
 * This script helps you:
 * 1. Test your Google Cloud Console OAuth credentials
 * 2. Generate a refresh token for server-to-server authentication
 * 3. Verify the OAuth flow works correctly
 * 
 * Prerequisites:
 * - Google Cloud Console project with Gmail API enabled
 * - OAuth 2.0 Client ID and Secret
 * - Redirect URI configured in Google Cloud Console
 * 
 * Usage:
 *   node scripts/setup-gmail-oauth.js
 */

const readline = require('node:readline/promises');
const { google } = require('googleapis');

// ANSI color codes for better console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function colorLog(color, message) {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function prompt(question, defaultValue) {
  const rl = readline.createInterface({ 
    input: process.stdin, 
    output: process.stdout 
  });
  
  const displayQuestion = defaultValue 
    ? `${question} (${colors.cyan}${defaultValue}${colors.reset}): `
    : `${question}: `;
    
  const answer = await rl.question(displayQuestion);
  rl.close();
  return answer.trim() || defaultValue;
}

async function main() {
  console.clear();
  colorLog('bright', '🔧 Gmail OAuth Production Setup');
  colorLog('blue', '=====================================\n');

  // Dynamic import for ESM module
  let open;
  try {
    open = (await import('open')).default;
  } catch (error) {
    // Fallback if open is not available
    open = null;
  }

  // Step 1: Get OAuth credentials
  colorLog('yellow', '📋 Step 1: OAuth Credentials');
  console.log('Enter your Google Cloud Console OAuth credentials:\n');

  const clientId = await prompt(
    'Google Client ID', 
    process.env.GOOGLE_CLIENT_ID || process.env.GMAIL_CLIENT_ID
  );
  
  const clientSecret = await prompt(
    'Google Client Secret', 
    process.env.GOOGLE_CLIENT_SECRET || process.env.GMAIL_CLIENT_SECRET
  );

  const redirectUri = await prompt(
    'Redirect URI', 
    'http://localhost:3000/api/auth/gmail/callback'
  );

  if (!clientId || !clientSecret) {
    colorLog('red', '❌ Error: Client ID and Secret are required');
    process.exit(1);
  }

  // Step 2: Create OAuth2 client
  colorLog('yellow', '\n📡 Step 2: Creating OAuth Client');
  
  const oauth2Client = new google.auth.OAuth2(
    clientId,
    clientSecret,
    redirectUri
  );

  // Step 3: Generate authorization URL
  const scopes = [
    'https://www.googleapis.com/auth/gmail.readonly',
    'https://www.googleapis.com/auth/gmail.send',
    'https://www.googleapis.com/auth/gmail.modify',
    'https://www.googleapis.com/auth/userinfo.email',
    'https://mail.google.com/'
  ];

  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: scopes,
    prompt: 'consent' // Force consent to get refresh token
  });

  colorLog('green', '✅ OAuth client created successfully');
  colorLog('yellow', '\n🌐 Step 3: Authorization');
  console.log('Opening authorization URL in your browser...\n');
  
  colorLog('cyan', authUrl);
  console.log('\nIf the browser doesn\'t open automatically, copy and paste the URL above.\n');

  // Try to open browser
  try {
    if (open) {
      await open(authUrl);
      colorLog('green', '✅ Browser opened');
    } else {
      colorLog('yellow', '⚠️  Could not open browser automatically');
    }
  } catch (error) {
    colorLog('yellow', '⚠️  Could not open browser automatically');
  }

  // Step 4: Get authorization code
  colorLog('yellow', '\n📝 Step 4: Authorization Code');
  console.log('After authorizing, you\'ll be redirected to a URL that looks like:');
  colorLog('cyan', `${redirectUri}?code=AUTHORIZATION_CODE&scope=...`);
  console.log('\nCopy the AUTHORIZATION_CODE from the URL:\n');

  const code = await prompt('Authorization Code');

  if (!code) {
    colorLog('red', '❌ Error: Authorization code is required');
    process.exit(1);
  }

  // Step 5: Exchange code for tokens
  colorLog('yellow', '\n🔄 Step 5: Exchanging Code for Tokens');
  
  try {
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);

    colorLog('green', '✅ Tokens obtained successfully!');

    // Step 6: Test the connection
    colorLog('yellow', '\n🧪 Step 6: Testing Connection');
    
    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
    const profile = await gmail.users.getProfile({ userId: 'me' });
    
    colorLog('green', `✅ Connection successful!`);
    colorLog('cyan', `📧 Email: ${profile.data.emailAddress}`);
    colorLog('cyan', `📊 Total Messages: ${profile.data.messagesTotal}`);

    // Step 7: Display results
    colorLog('yellow', '\n📋 Step 7: Configuration Results');
    console.log('Add these environment variables to your .env.local file:\n');

    colorLog('green', '# Gmail OAuth Configuration');
    colorLog('cyan', `GOOGLE_CLIENT_ID=${clientId}`);
    colorLog('cyan', `GOOGLE_CLIENT_SECRET=${clientSecret}`);
    colorLog('cyan', `GMAIL_CLIENT_ID=${clientId}`);
    colorLog('cyan', `GMAIL_CLIENT_SECRET=${clientSecret}`);
    
    if (tokens.refresh_token) {
      colorLog('cyan', `GMAIL_REFRESH_TOKEN=${tokens.refresh_token}`);
    }

    console.log('\n');
    colorLog('green', '🎉 Setup Complete!');
    console.log('Your Gmail OAuth integration is now configured for production use.');
    
    if (!tokens.refresh_token) {
      colorLog('yellow', '\n⚠️  Note: No refresh token received.');
      console.log('This might happen if you\'ve already authorized this app before.');
      console.log('To get a refresh token, revoke access at:');
      colorLog('cyan', 'https://myaccount.google.com/permissions');
      console.log('Then run this script again.');
    }

  } catch (error) {
    colorLog('red', '❌ Error exchanging code for tokens:');
    console.error(error.message);
    
    if (error.message.includes('invalid_grant')) {
      colorLog('yellow', '\n💡 Tip: The authorization code may have expired.');
      console.log('Authorization codes are only valid for a few minutes.');
      console.log('Please run the script again and use the code immediately.');
    }
    
    process.exit(1);
  }
}

// Handle Ctrl+C gracefully
process.on('SIGINT', () => {
  colorLog('yellow', '\n\n👋 Setup cancelled by user');
  process.exit(0);
});

// Run the script
main().catch((error) => {
  colorLog('red', '\n❌ Unexpected error:');
  console.error(error);
  process.exit(1);
}); 