#!/usr/bin/env pwsh

Write-Host "🌐 Starting ngrok tunnels for Zynlo Helpdesk..." -ForegroundColor Green
Write-Host ""

# Check if ngrok is available
if (-not (Test-Path "C:\ngrok\ngrok.exe")) {
    Write-Host "❌ ngrok not found at C:\ngrok\ngrok.exe" -ForegroundColor Red
    Write-Host "Please install ngrok first" -ForegroundColor Yellow
    exit 1
}

Write-Host "📋 Available options:" -ForegroundColor Cyan
Write-Host "1. Dashboard only (port 3000)" -ForegroundColor White
Write-Host "2. API server only (port 3001)" -ForegroundColor White  
Write-Host "3. Both Dashboard + API server" -ForegroundColor White
Write-Host ""

$choice = Read-Host "Select option (1-3)"

switch ($choice) {
    "1" {
        Write-Host "🚀 Starting tunnel for Dashboard (localhost:3000)..." -ForegroundColor Green
        Write-Host ""
        Write-Host "Your public URL will be shown below:" -ForegroundColor Yellow
        Write-Host "Use this URL for testing external integrations" -ForegroundColor Yellow
        Write-Host ""
        C:\ngrok\ngrok.exe http 3000
    }
    "2" {
        Write-Host "🚀 Starting tunnel for API server (localhost:3001)..." -ForegroundColor Green
        Write-Host ""
        Write-Host "📧 Webhook URL format: https://YOUR-TUNNEL.ngrok.io/webhooks/resend" -ForegroundColor Cyan
        Write-Host "📧 Use this for Resend webhook configuration" -ForegroundColor Yellow
        Write-Host ""
        C:\ngrok\ngrok.exe http 3001
    }
    "3" {
        Write-Host "🚀 Starting tunnels for both services..." -ForegroundColor Green
        Write-Host ""
        Write-Host "This will open both tunnels in separate terminals" -ForegroundColor Yellow
        Write-Host ""
        
        # Start dashboard tunnel in new window
        Start-Process powershell -ArgumentList "-Command", "C:\ngrok\ngrok.exe http 3000" -WindowStyle Normal
        
        # Wait a moment
        Start-Sleep 2
        
        # Start API server tunnel
        Write-Host "📧 API server webhook URL: https://YOUR-TUNNEL.ngrok.io/webhooks/resend" -ForegroundColor Cyan
        C:\ngrok\ngrok.exe http 3001
    }
    default {
        Write-Host "❌ Invalid choice. Please run again and select 1, 2, or 3" -ForegroundColor Red
        exit 1
    }
} 