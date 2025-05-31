const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

console.log('Current directory:', __dirname);
console.log('');

// Check different possible locations
const locations = [
  '.env',
  './.env',
  path.join(__dirname, '.env'),
  path.join(__dirname, '../.env'),
  path.join(__dirname, 'src', '../.env')
];

console.log('Checking for .env file in these locations:');
locations.forEach(loc => {
  const exists = fs.existsSync(loc);
  const absolute = path.resolve(loc);
  console.log(`${exists ? '✓' : '✗'} ${loc} -> ${absolute}`);
});

console.log('\nTrying to load .env from current directory:');
const result = dotenv.config();
if (result.error) {
  console.log('Error:', result.error.message);
} else {
  console.log('Success! Loaded variables:');
  console.log('SUPABASE_URL:', process.env.SUPABASE_URL ? 'Set ✓' : 'Not set ✗');
  console.log('SUPABASE_SERVICE_ROLE_KEY:', process.env.SUPABASE_SERVICE_ROLE_KEY ? 'Set ✓' : 'Not set ✗');
} 