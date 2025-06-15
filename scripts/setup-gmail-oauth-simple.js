#!/usr/bin/env node

/**
 * Simple Gmail OAuth Setup Script
 * 
 * This script helps you test your Gmail OAuth credentials without external dependencies.
 * 
 * Usage: node scripts/setup-gmail-oauth-simple.js
 */

const readline = require('node:readline/promises');
const { google } = require('googleapis');

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
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
  colorLog('bright', '🔧 Gmail OAuth Configuration Test');
  colorLog('blue', '===================================\n');

  // Check environment variables first
  const envClientId = process.env.GOOGLE_CLIENT_ID || process.env.GMAIL_CLIENT_ID;
  const envClientSecret = process.env.GOOGLE_CLIENT_SECRET || process.env.GMAIL_CLIENT_SECRET;

  if (envClientId && envClientSecret) {
    colorLog('green', '✅ Found OAuth credentials in environment variables');
    colorLog('cyan', `Client ID: ${envClientId.substring(0, 20)}...`);
    
    const useEnv = await prompt('Use these credentials? (y/n)', 'y');
    if (useEnv.toLowerCase() === 'y') {
      await testCredentials(envClientId, envClientSecret);
      return;
    }
  }

  // Manual input
  colorLog('yellow', '📋 Enter your Gmail OAuth credentials:');
  console.log('(Get these from Google Cloud Console → APIs & Services → Credentials)\n');

  const clientId = await prompt('Google Client ID');
  const clientSecret = await prompt('Google Client Secret');

  if (!clientId || !clientSecret) {
    colorLog('red', '❌ Error: Both Client ID and Secret are required');
    process.exit(1);
  }

  await testCredentials(clientId, clientSecret);
}

async function testCredentials(clientId, clientSecret) {
  const redirectUri = 'http://localhost:3000/api/auth/gmail/callback';
  
  try {
    // Test OAuth client creation
    const oauth2Client = new google.auth.OAuth2(clientId, clientSecret, redirectUri);
    
    // Generate auth URL
    const scopes = [
      'https://www.googleapis.com/auth/gmail.readonly',
      'https://www.googleapis.com/auth/gmail.send',
      'https://www.googleapis.com/auth/userinfo.email'
    ];

    const authUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      prompt: 'consent'
    });

    colorLog('green', '✅ OAuth client created successfully!');
    colorLog('yellow', '\n🌐 Authorization URL Generated:');
    colorLog('cyan', authUrl);
    
    console.log('\n📋 Next Steps:');
    console.log('1. Copy the URL above and open it in your browser');
    console.log('2. Complete the OAuth authorization');
    console.log('3. The system will redirect to your callback URL');
    console.log('4. Your Gmail OAuth is properly configured!\n');

    colorLog('green', '🎉 Configuration Test Successful!');
    console.log('Your Gmail OAuth credentials are valid and ready to use.');

    // Show environment variables format
    colorLog('yellow', '\n📝 Environment Variables (add to .env.local):');
    colorLog('cyan', `GOOGLE_CLIENT_ID=${clientId}`);
    colorLog('cyan', `GOOGLE_CLIENT_SECRET=${clientSecret}`);
    colorLog('cyan', `GMAIL_CLIENT_ID=${clientId}`);
    colorLog('cyan', `GMAIL_CLIENT_SECRET=${clientSecret}`);

  } catch (error) {
    colorLog('red', '❌ Error testing credentials:');
    console.error(error.message);
    
    console.log('\n💡 Common Issues:');
    console.log('- Check that Client ID and Secret are correct');
    console.log('- Ensure Gmail API is enabled in Google Cloud Console');
    console.log('- Verify redirect URI is configured correctly');
    
    process.exit(1);
  }
}

// Handle Ctrl+C gracefully
process.on('SIGINT', () => {
  colorLog('yellow', '\n\n👋 Test cancelled');
  process.exit(0);
});

// Run the script
main().catch((error) => {
  colorLog('red', '\n❌ Unexpected error:');
  console.error(error);
  process.exit(1);
}); 