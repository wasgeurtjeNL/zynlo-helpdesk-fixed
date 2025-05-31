# Real Email Test Script

Write-Host "📧 REAL EMAIL TEST - Ready!" -ForegroundColor Green
Write-Host ""

Write-Host "SETUP CHECKLIST:" -ForegroundColor Yellow
Write-Host "✅ Resend API key: re_2jDs1FRQ_EPLaYCS6s3TmNqtvb55BU5ap" -ForegroundColor Green
Write-Host "⚠️ Add to .env.local: RESEND_API_KEY=re_2jDs1FRQ_EPLaYCS6s3TmNqtvb55BU5ap" -ForegroundColor Yellow
Write-Host "⚠️ Restart development servers" -ForegroundColor Yellow
Write-Host ""

Write-Host "TEST STAPPEN:" -ForegroundColor Cyan
Write-Host "1. Stop development servers (Ctrl+C)" -ForegroundColor White
Write-Host "2. Add API key to .env.local" -ForegroundColor White
Write-Host "3. Run: pnpm dev" -ForegroundColor White
Write-Host "4. Open ticket #17 or #19" -ForegroundColor White
Write-Host "5. Toggle should be 'Antwoord naar klant'" -ForegroundColor White
Write-Host "6. Type: 'This is a real email test!'" -ForegroundColor White
Write-Host "7. Click 'Verstuur'" -ForegroundColor White
Write-Host "8. Check email inbox at: info@wasgeurtje.nl" -ForegroundColor White
Write-Host ""

Write-Host "EXPECTED RESULTS:" -ForegroundColor Green
Write-Host "- Message appears: '📧 EMAIL SENT: This is a real email test!'" -ForegroundColor White
Write-Host "- Console shows: 'Email sent successfully via Resend'" -ForegroundColor White
Write-Host "- Real HTML email received in inbox!" -ForegroundColor White
Write-Host ""

Write-Host "🎯 Ready to send real emails!" -ForegroundColor Green

Write-Host ""
Write-Host "Press any key to exit..."
$Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown") | Out-Null 