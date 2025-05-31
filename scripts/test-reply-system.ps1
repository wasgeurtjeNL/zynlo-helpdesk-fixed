# Test script om de reply functionaliteit te controleren

Write-Host "Testing Reply System - Internal Notes Focus" -ForegroundColor Yellow
Write-Host ""

Write-Host "Test checklist voor interne notities:" -ForegroundColor Cyan
Write-Host "1. Ga naar: http://localhost:3000/inbox/nieuw" -ForegroundColor White
Write-Host "2. Open ticket #17 (of een ander ticket)" -ForegroundColor White  
Write-Host "3. Scroll naar beneden naar het tekstvak" -ForegroundColor White
Write-Host ""

Write-Host "TOGGLE BUTTON TEST:" -ForegroundColor Yellow
Write-Host "   4. Kijk naar de knop boven het tekstvak" -ForegroundColor White
Write-Host "   5. Standaard: 'Antwoord naar klant' (grijs)" -ForegroundColor Gray
Write-Host "   6. Klik op de knop -> 'Interne notitie' (geel)" -ForegroundColor Yellow
Write-Host ""

Write-Host "INTERNE NOTITIE TEST:" -ForegroundColor Green
Write-Host "   7. Zorg dat toggle op 'Interne notitie' staat" -ForegroundColor White
Write-Host "   8. Type: 'Dit is een interne notitie test'" -ForegroundColor White
Write-Host "   9. Klik 'Verstuur'" -ForegroundColor White
Write-Host "   10. VERWACHT RESULTAAT:" -ForegroundColor Green
Write-Host "       - Bericht verschijnt rechts in chat" -ForegroundColor White
Write-Host "       - Heeft GEEL 'Interne notitie' label" -ForegroundColor Yellow
Write-Host "       - Gele achtergrond en border" -ForegroundColor Yellow
Write-Host ""

Write-Host "EMAIL REPLY TEST:" -ForegroundColor Blue
Write-Host "   11. Klik toggle terug naar 'Antwoord naar klant'" -ForegroundColor White
Write-Host "   12. Type: 'Dit is een customer reply test'" -ForegroundColor White
Write-Host "   13. Klik 'Verstuur'" -ForegroundColor White
Write-Host "   14. VERWACHT RESULTAAT:" -ForegroundColor Blue
Write-Host "       - Bericht verschijnt rechts in chat" -ForegroundColor White
Write-Host "       - Heeft EMAIL REPLY prefix" -ForegroundColor White
Write-Host "       - Blauwe achtergrond (geen geel label)" -ForegroundColor Blue
Write-Host ""

Write-Host "Als je GEEN interne notities ziet:" -ForegroundColor Red
Write-Host "   - Check console (F12) voor errors" -ForegroundColor White
Write-Host "   - Hard refresh (Ctrl+F5)" -ForegroundColor White
Write-Host "   - Zorg dat toggle geel is bij interne notitie" -ForegroundColor White
Write-Host ""

Write-Host "🔧 Voor extra debugging:" -ForegroundColor Cyan
Write-Host "   - Controleer of servers draaien:" -ForegroundColor White
Write-Host "     Dashboard: http://localhost:3000" -ForegroundColor Gray
Write-Host "     API Server: http://localhost:3001" -ForegroundColor Gray
Write-Host ""

# Check if servers are running
Write-Host "🌐 Checking if servers are accessible..." -ForegroundColor Yellow

try {
    $dashboardResponse = Invoke-WebRequest -Uri "http://localhost:3000" -TimeoutSec 5 -UseBasicParsing
    Write-Host "✅ Dashboard (3000): RUNNING" -ForegroundColor Green
} catch {
    Write-Host "❌ Dashboard (3000): NOT ACCESSIBLE" -ForegroundColor Red
}

try {
    $apiResponse = Invoke-WebRequest -Uri "http://localhost:3001/health" -TimeoutSec 5 -UseBasicParsing
    Write-Host "✅ API Server (3001): RUNNING" -ForegroundColor Green  
} catch {
    Write-Host "❌ API Server (3001): NOT ACCESSIBLE" -ForegroundColor Red
}

Write-Host ""
Write-Host "🚀 Ready to test! Open browser and follow checklist above." -ForegroundColor Green
Write-Host ""
Write-Host "Press any key to exit..."
$Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown") | Out-Null 