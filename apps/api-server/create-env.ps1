# Create .env file for API server
$envContent = @"
# Server Configuration
PORT=3001
API_URL=http://localhost:3001
DASHBOARD_URL=http://localhost:3000

# Supabase Configuration
SUPABASE_URL=https://nkrytssezaefinbjgwnq.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5rcnl0c3NlemFlZmluYmpnd25xIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczMjc5NTU2OSwiZXhwIjoyMDQ4MzcxNTY5fQ.DjFPOI3ZMws9kYv86Sh9RVArtnPi

# Google OAuth (optional for now)
GOOGLE_CLIENT_ID=optional
GOOGLE_CLIENT_SECRET=optional
"@

# Write to .env file
$envContent | Out-File -FilePath ".env" -Encoding UTF8 -NoNewline

Write-Host "✅ .env file created successfully!" -ForegroundColor Green
Write-Host "📍 Location: apps/api-server/.env" -ForegroundColor Yellow 