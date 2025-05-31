const axios = require('axios');

// Test email data
const testEmail = {
  from: {
    email: 'test.customer@example.com',
    name: 'Test Customer'
  },
  to: 'support@yourcompany.com', // Replace with your connected Gmail address
  subject: 'Test Ticket - Help needed with login',
  text: 'Hi, I cannot login to my account. Can you please help me? This is a test email.',
  html: '<p>Hi, I cannot login to my account. Can you please help me?</p><p>This is a test email.</p>',
  messageId: `test-${Date.now()}@example.com`,
  attachments: []
};

// Get Supabase URL from environment or use default
const SUPABASE_URL = process.env.SUPABASE_URL || 'YOUR_SUPABASE_URL'; // Replace with your Supabase URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || 'YOUR_SERVICE_KEY'; // Replace with your service key

async function sendTestEmail() {
  try {
    console.log('Sending test email to webhook...');
    
    const response = await axios.post(
      `${SUPABASE_URL}/functions/v1/process-email`,
      testEmail,
      {
        headers: {
          'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    console.log('Response:', response.data);
    
    if (response.data.success) {
      console.log('✅ Test email processed successfully!');
      console.log(`Ticket ID: ${response.data.ticketId}`);
      console.log('Check your dashboard to see the new ticket.');
    } else {
      console.log('❌ Error processing email:', response.data.error);
    }
  } catch (error) {
    console.error('❌ Failed to send test email:', error.response?.data || error.message);
  }
}

// Run the test
sendTestEmail(); 