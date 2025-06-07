# Vercel Deployment Script for Zynlo Helpdesk Monorepo

Write-Host "🚀 Starting Vercel deployment for Zynlo Helpdesk..." -ForegroundColor Green

# Clean up any existing Vercel configuration
Write-Host "🧹 Cleaning up old configurations..." -ForegroundColor Yellow
Remove-Item -Path .vercel -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item -Path vercel.json -Force -ErrorAction SilentlyContinue
Remove-Item -Path apps/dashboard/.vercel -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item -Path apps/dashboard/vercel.json -Force -ErrorAction SilentlyContinue

# Create vercel.json using a hashtable and convert to JSON
Write-Host "📝 Creating Vercel configuration..." -ForegroundColor Yellow
$config = @{
    buildCommand = "cd ../.. && pnpm install && pnpm turbo run build --filter=@zynlo/dashboard"
    outputDirectory = ".next"
    framework = "nextjs"
    installCommand = "echo 'Skipping install - handled by buildCommand'"
}

$config | ConvertTo-Json | Set-Content -Path "apps/dashboard/vercel.json"

# Deploy from the dashboard directory
Write-Host "🔧 Starting deployment..." -ForegroundColor Yellow
Set-Location -Path "apps/dashboard"

# Use npx vercel with all settings
npx vercel --prod --yes

Write-Host "✅ Deployment script completed!" -ForegroundColor Green
Write-Host "Check the output above for your deployment URL." -ForegroundColor Cyan 