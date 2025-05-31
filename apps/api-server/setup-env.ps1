# Setup Environment Variables for API Server

Write-Host "Setting up .env file for API Server..." -ForegroundColor Yellow

# Create backup if .env exists
if (Test-Path .env) {
    Copy-Item .env ".env.backup.$(Get-Date -Format 'yyyyMMdd-HHmmss')"
    Write-Host "Created backup of existing .env file" -ForegroundColor Cyan
}

# Create new .env content
$envContent = @"
# Server Configuration
PORT=3001
API_URL=http://localhost:3001
DASHBOARD_URL=http://localhost:3000

# Supabase Configuration
SUPABASE_URL=https://nkrytssezaefinbjgwnq.supabase.co
SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVICE_KEY_HERE

# Google OAuth Configuration (optional)
GOOGLE_CLIENT_ID=optional
GOOGLE_CLIENT_SECRET=optional

# Logging
LOG_LEVEL=debug
"@

# Write to file
$envContent | Out-File -FilePath .env -Encoding UTF8
Write-Host "✅ Created .env file with template" -ForegroundColor Green

Write-Host "`n⚠️  IMPORTANT: You need to replace YOUR_SERVICE_KEY_HERE with your actual Supabase service key!" -ForegroundColor Yellow
Write-Host "1. Go to https://app.supabase.com" -ForegroundColor White
Write-Host "2. Select your project (supabase-teal-yacht)" -ForegroundColor White
Write-Host "3. Go to Settings → API" -ForegroundColor White
Write-Host "4. Copy the 'service_role' key (NOT the anon key!)" -ForegroundColor White
Write-Host "5. Replace YOUR_SERVICE_KEY_HERE in the .env file" -ForegroundColor White

Write-Host "`nPress any key to open .env file in notepad..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")

# Open in notepad
notepad .env 