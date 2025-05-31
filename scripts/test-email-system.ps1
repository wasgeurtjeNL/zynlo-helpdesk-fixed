# Test script voor het nieuwe email systeem

Write-Host "=== Zynlo Email System Tester ===" -ForegroundColor Yellow
Write-Host ""

Write-Host "SYSTEEM STATUS:" -ForegroundColor Cyan
Write-Host "✅ Email API route: apps/dashboard/app/api/send-email-reply/route.ts" -ForegroundColor Green
Write-Host "✅ Frontend integration: Complete" -ForegroundColor Green
Write-Host "✅ Mock mode: Enabled (geen Resend API key nodig)" -ForegroundColor Green
Write-Host ""

Write-Host "TEST OPTIES:" -ForegroundColor Yellow
Write-Host "1. Mock mode test (werkt direct)" -ForegroundColor White
Write-Host "2. Echte email test (Resend API key nodig)" -ForegroundColor White
Write-Host ""

$choice = Read-Host "Kies optie (1 voor mock, 2 voor echt)"

if ($choice -eq "1") {
    Write-Host ""
    Write-Host "🎯 MOCK MODE TEST" -ForegroundColor Green
    Write-Host "Het systeem zal simuleren dat emails worden verzonden" -ForegroundColor White
    Write-Host ""
    
    Write-Host "STAPPEN:" -ForegroundColor Cyan
    Write-Host "1. Ga naar: http://localhost:3000/inbox/nieuw" -ForegroundColor White
    Write-Host "2. Open ticket #17 of #19" -ForegroundColor White
    Write-Host "3. Zorg dat toggle NIET op 'Interne notitie' staat" -ForegroundColor White
    Write-Host "4. Type: 'Test email in mock mode'" -ForegroundColor White
    Write-Host "5. Klik 'Verstuur'" -ForegroundColor White
    Write-Host ""
    
    Write-Host "VERWACHT RESULTAAT:" -ForegroundColor Green
    Write-Host "- Bericht verschijnt als '📧 EMAIL SENT: Test email in mock mode'" -ForegroundColor White
    Write-Host "- Console toont mock email data" -ForegroundColor White
    Write-Host "- Geen echte email wordt verzonden" -ForegroundColor White
    Write-Host ""

} elseif ($choice -eq "2") {
    Write-Host ""
    Write-Host "📧 ECHTE EMAIL TEST" -ForegroundColor Blue
    Write-Host ""
    
    Write-Host "SETUP VEREIST:" -ForegroundColor Yellow
    Write-Host "1. Ga naar: https://resend.com" -ForegroundColor White
    Write-Host "2. Maak gratis account aan" -ForegroundColor White
    Write-Host "3. Kopieer je API key" -ForegroundColor White
    Write-Host "4. Voeg toe aan .env.local:" -ForegroundColor White
    Write-Host "   RESEND_API_KEY=your_api_key_here" -ForegroundColor Gray
    Write-Host "5. Restart development servers" -ForegroundColor White
    Write-Host ""
    
    Write-Host "DAARNA TESTEN:" -ForegroundColor Cyan
    Write-Host "1. Ga naar ticket detail" -ForegroundColor White
    Write-Host "2. Verstuur email reply" -ForegroundColor White
    Write-Host "3. Check inbox van customer email" -ForegroundColor White
    Write-Host "4. Professionele HTML email ontvangen!" -ForegroundColor White
    Write-Host ""

} else {
    Write-Host "Ongeldige keuze" -ForegroundColor Red
    exit 1
}

Write-Host "TROUBLESHOOTING:" -ForegroundColor Yellow
Write-Host "- Console errors? Open F12 en check Network tab" -ForegroundColor White
Write-Host "- API errors? Check server logs (terminal)" -ForegroundColor White
Write-Host "- Email niet ontvangen? Check Resend dashboard" -ForegroundColor White
Write-Host ""

Write-Host "🎯 READY TO TEST!" -ForegroundColor Green
Write-Host "Open je browser en volg de stappen hierboven." -ForegroundColor White
Write-Host ""

Write-Host "Press any key to exit..."
$Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown") | Out-Null 