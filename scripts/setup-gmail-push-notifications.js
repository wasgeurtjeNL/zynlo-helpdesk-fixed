/**
 * Setup Gmail Push Notifications Script
 *
 * This script helps you configure Gmail Push Notifications using Google Cloud Pub/Sub
 * for real-time email sync instead of polling.
 *
 * Prerequisites:
 * 1. Google Cloud Console project with Gmail API enabled
 * 2. Service account with Pub/Sub permissions
 * 3. GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET already configured
 *
 * Usage: node scripts/setup-gmail-push-notifications.js
 */

const fs = require('fs');
const path = require('path');
const { google } = require('googleapis');

function colorLog(color, message) {
  const colors = {
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m',
    white: '\x1b[37m',
    bright: '\x1b[1m',
    reset: '\x1b[0m',
  };
  console.log(`${colors[color] || ''}${message}${colors.reset}`);
}

async function main() {
  colorLog('bright', '🔔 Gmail Push Notifications Setup');
  console.log();

  // Load environment variables
  require('dotenv').config({ path: path.resolve(__dirname, '../.env.local') });
  require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

  // Check prerequisites
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    colorLog('red', '❌ Google OAuth credentials not found');
    console.log('Please run setup-gmail-oauth.js first to configure Gmail OAuth');
    process.exit(1);
  }

  colorLog('green', '✅ Google OAuth credentials found');
  console.log();

  // Check current configuration
  const projectId = process.env.GOOGLE_CLOUD_PROJECT_ID;
  const topicName = process.env.GMAIL_PUBSUB_TOPIC;
  const pushToken = process.env.GMAIL_PUSH_TOKEN;

  console.log('Current configuration:');
  console.log(`  GOOGLE_CLOUD_PROJECT_ID: ${projectId || 'Not set'}`);
  console.log(`  GMAIL_PUBSUB_TOPIC: ${topicName || 'Not set'}`);
  console.log(`  GMAIL_PUSH_TOKEN: ${pushToken ? 'Set' : 'Not set'}`);
  console.log();

  if (projectId && topicName) {
    colorLog('green', '✅ Gmail Push Notifications already configured');
    console.log();
    console.log('To test your configuration, you can:');
    console.log('1. Restart your API server');
    console.log('2. Check the logs for "Gmail Push Notifications setup completed"');
    console.log('3. Send a test email to your connected Gmail account');
    console.log();
    return;
  }

  // Configuration steps
  colorLog('yellow', '📋 Gmail Push Notifications Configuration Steps:');
  console.log();

  console.log('1. 🏗️  Set up Google Cloud Pub/Sub:');
  console.log('   • Go to Google Cloud Console (console.cloud.google.com)');
  console.log('   • Enable the Pub/Sub API for your project');
  console.log('   • Create a new topic (e.g., "gmail-notifications")');
  console.log('   • Create a push subscription with your webhook URL');
  console.log();

  console.log('2. 🔗 Configure your webhook URL:');
  console.log('   Your webhook URL should be:');
  const baseUrl = process.env.API_URL || 'https://your-domain.com';
  colorLog('cyan', `   ${baseUrl}/webhooks/gmail-push`);
  console.log();

  console.log('3. 🔑 Set up environment variables:');
  console.log('   Add these to your .env.local file:');
  console.log();
  colorLog('cyan', '   # Gmail Push Notifications');
  colorLog('cyan', '   GOOGLE_CLOUD_PROJECT_ID=your-project-id');
  colorLog('cyan', '   GMAIL_PUBSUB_TOPIC=gmail-notifications');
  colorLog('cyan', '   GMAIL_PUSH_TOKEN=your-security-token');
  console.log();

  console.log('4. 🔐 Set up service account (optional but recommended):');
  console.log('   • Create a service account in Google Cloud Console');
  console.log('   • Grant it "Pub/Sub Admin" permissions');
  console.log('   • Download the JSON key file');
  console.log('   • Set GOOGLE_APPLICATION_CREDENTIALS environment variable');
  console.log();

  // Interactive configuration
  const readline = require('readline');
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  function ask(question) {
    return new Promise((resolve) => {
      rl.question(question, resolve);
    });
  }

  try {
    const configureNow = await ask('Would you like to configure these values now? (y/n): ');

    if (configureNow.toLowerCase() === 'y' || configureNow.toLowerCase() === 'yes') {
      const newProjectId = await ask('Enter your Google Cloud Project ID: ');
      const newTopicName =
        (await ask('Enter Pub/Sub topic name (default: gmail-notifications): ')) ||
        'gmail-notifications';
      const newPushToken =
        (await ask('Enter a security token for webhook validation (optional): ')) || '';

      // Update environment file
      const envPath = path.resolve(__dirname, '../.env.local');
      let envContent = '';

      if (fs.existsSync(envPath)) {
        envContent = fs.readFileSync(envPath, 'utf8');
      }

      // Remove existing entries if any
      envContent = envContent
        .split('\n')
        .filter(
          (line) =>
            !line.startsWith('GOOGLE_CLOUD_PROJECT_ID=') &&
            !line.startsWith('GMAIL_PUBSUB_TOPIC=') &&
            !line.startsWith('GMAIL_PUSH_TOKEN=')
        )
        .join('\n');

      // Add new configuration
      const newConfig = [
        '',
        '# Gmail Push Notifications',
        `GOOGLE_CLOUD_PROJECT_ID=${newProjectId}`,
        `GMAIL_PUBSUB_TOPIC=${newTopicName}`,
        newPushToken ? `GMAIL_PUSH_TOKEN=${newPushToken}` : '',
      ]
        .filter(Boolean)
        .join('\n');

      envContent += newConfig;

      fs.writeFileSync(envPath, envContent);

      colorLog('green', '✅ Configuration saved to .env.local');
      console.log();
      console.log('Next steps:');
      console.log('1. Create the Pub/Sub topic and subscription in Google Cloud Console');
      console.log('2. Configure the push subscription webhook URL:');
      colorLog('cyan', `   ${baseUrl}/webhooks/gmail-push`);
      console.log('3. Restart your API server to apply the new configuration');
      console.log();
    } else {
      console.log('Configuration skipped. Please set up manually using the steps above.');
    }
  } catch (error) {
    console.error('Error during configuration:', error);
  } finally {
    rl.close();
  }

  console.log();
  colorLog('bright', '📚 Additional Resources:');
  console.log(
    '• Gmail Push Notifications Guide: https://developers.google.com/gmail/api/guides/push'
  );
  console.log('• Google Cloud Pub/Sub: https://cloud.google.com/pubsub/docs');
  console.log('• Webhook setup: https://cloud.google.com/pubsub/docs/push');
  console.log();

  colorLog('yellow', '💡 Pro Tip: Gmail Push Notifications provide real-time email sync');
  colorLog('yellow', '   instead of polling every 5 minutes, improving user experience!');
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { main };
