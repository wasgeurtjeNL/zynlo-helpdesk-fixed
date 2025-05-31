#!/usr/bin/env pwsh

Write-Host "🔗 Webhook Setup Guide voor Zynlo Helpdesk" -ForegroundColor Green
Write-Host "============================================" -ForegroundColor Green
Write-Host ""

Write-Host "📋 STAP 1: Start je development servers" -ForegroundColor Cyan
Write-Host "pnpm dev          # In terminal 1 (Dashboard op poort 3000)"
Write-Host "pnpm api-server   # In terminal 2 (API server op poort 3001)"
Write-Host ""

Write-Host "📋 STAP 2: Start ngrok tunnel" -ForegroundColor Cyan
Write-Host "./start-ngrok.ps1  # Kies optie 2 voor API server"
Write-Host ""

Write-Host "📋 STAP 3: Configureer je webhook URLs" -ForegroundColor Cyan
Write-Host ""

Write-Host "🔸 RESEND WEBHOOKS:" -ForegroundColor Yellow
Write-Host "URL: https://YOUR-TUNNEL.ngrok.io/webhooks/resend"
Write-Host "Events: delivered, bounced, complained"
Write-Host "Setup: https://resend.com/webhooks"
Write-Host ""

Write-Host "🔸 GMAIL WEBHOOKS (als je die gebruikt):" -ForegroundColor Yellow  
Write-Host "URL: https://YOUR-TUNNEL.ngrok.io/webhooks/gmail"
Write-Host ""

Write-Host "🔸 WHATSAPP WEBHOOKS:" -ForegroundColor Yellow
Write-Host "URL: https://YOUR-TUNNEL.ngrok.io/webhooks/whatsapp"
Write-Host ""

Write-Host "📋 STAP 4: Test je webhook" -ForegroundColor Cyan
Write-Host "1. Verstuur een test email via je Zynlo dashboard"
Write-Host "2. Check de ngrok web interface: http://localhost:4040"
Write-Host "3. Bekijk incoming webhook calls in de terminal"
Write-Host ""

Write-Host "💡 TIPS:" -ForegroundColor Green
Write-Host "• ngrok web interface toont alle HTTP traffic"
Write-Host "• Gebruik ngrok account voor stabiele URLs"
Write-Host "• Voor productie: gebruik eigen domain + HTTPS"
Write-Host "• Check firewall settings als webhooks falen"
Write-Host ""

$answer = Read-Host "Wil je nu ngrok starten? (y/n)"
if ($answer -eq "y" -or $answer -eq "Y") {
    Write-Host ""
    Write-Host "🚀 Starting ngrok voor API server..." -ForegroundColor Green
    ./start-ngrok.ps1
} 