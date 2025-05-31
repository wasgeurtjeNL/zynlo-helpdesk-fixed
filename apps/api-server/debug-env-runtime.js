// Debug script to check runtime environment variables
const dotenv = require('dotenv');
const path = require('path');

console.log('=== Environment Debug ===');
console.log('Current working directory:', process.cwd());
console.log('__dirname:', __dirname);

// Try to load .env manually
console.log('\n=== Loading .env manually ===');
const envPath = path.resolve(__dirname, '.env');
console.log('Trying to load from:', envPath);

const result = dotenv.config({ path: envPath });
if (result.error) {
  console.log('Error loading .env:', result.error.message);
} else {
  console.log('✅ .env loaded successfully');
}

console.log('\n=== Environment Variables ===');
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('SUPABASE_URL exists:', !!process.env.SUPABASE_URL);
console.log('SUPABASE_SERVICE_ROLE_KEY exists:', !!process.env.SUPABASE_SERVICE_ROLE_KEY);

if (process.env.SUPABASE_URL) {
  console.log('SUPABASE_URL value:', process.env.SUPABASE_URL);
}

if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.log('SUPABASE_SERVICE_ROLE_KEY length:', process.env.SUPABASE_SERVICE_ROLE_KEY.length);
  console.log('SUPABASE_SERVICE_ROLE_KEY starts with:', process.env.SUPABASE_SERVICE_ROLE_KEY.substring(0, 20) + '...');
}

console.log('\n=== Test Import Simulation ===');
// Simulate what happens when we import the supabase client
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

console.log('After variable assignment:');
console.log('supabaseUrl:', supabaseUrl || 'EMPTY!');
console.log('supabaseServiceKey exists:', !!supabaseServiceKey);
console.log('supabaseServiceKey length:', supabaseServiceKey.length); 