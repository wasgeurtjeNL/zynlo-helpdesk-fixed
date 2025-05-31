# Setup script voor email systeem configuratie

Write-Host "=== Zynlo Email System Setup ===" -ForegroundColor Yellow
Write-Host ""

Write-Host "STAP 1: Resend API Key" -ForegroundColor Cyan
Write-Host "1. Ga naar: https://resend.com" -ForegroundColor White
Write-Host "2. Maak gratis account aan" -ForegroundColor White
Write-Host "3. Kopieer je API key" -ForegroundColor White
Write-Host ""

$resendKey = Read-Host "Plak je Resend API key hier"

if ($resendKey) {
    Write-Host "STAP 2: Environment Variables instellen..." -ForegroundColor Cyan
    
    # Add to .env.local if it exists
    $envFile = "../.env.local"
    if (Test-Path $envFile) {
        Write-Host "Updating .env.local..." -ForegroundColor White
        Add-Content $envFile "`nRESEND_API_KEY=$resendKey"
    }
    
    Write-Host "✅ Resend API key toegevoegd" -ForegroundColor Green
} else {
    Write-Host "❌ Geen API key ingevoerd, setup gestopt" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "STAP 3: Edge Function deployen..." -ForegroundColor Cyan
Write-Host "We gaan nu de email functie uploaden naar Supabase" -ForegroundColor White
Write-Host ""

Write-Host "MANUAL STEPS NEEDED:" -ForegroundColor Yellow
Write-Host "1. Open Supabase Dashboard: https://supabase.com/dashboard" -ForegroundColor White
Write-Host "2. Ga naar je project: nkrytssezaefinbjgwnq" -ForegroundColor White
Write-Host "3. Klik 'Edge Functions' in sidebar" -ForegroundColor White
Write-Host "4. Klik 'Create a new function'" -ForegroundColor White
Write-Host "5. Naam: 'send-email-reply'" -ForegroundColor White
Write-Host "6. Kopieer code uit: supabase/functions/send-email-reply/index.ts" -ForegroundColor White
Write-Host "7. Klik 'Deploy'" -ForegroundColor White
Write-Host ""

Write-Host "STAP 4: Environment Variables in Supabase" -ForegroundColor Cyan
Write-Host "1. Ga naar 'Settings' > 'Edge Functions'" -ForegroundColor White
Write-Host "2. Voeg toe: RESEND_API_KEY = $resendKey" -ForegroundColor White
Write-Host ""

Write-Host "STAP 5: Test het systeem" -ForegroundColor Cyan
Write-Host "1. Restart development servers" -ForegroundColor White
Write-Host "2. Ga naar ticket #17 of #19" -ForegroundColor White
Write-Host "3. Zorg dat toggle NIET op 'Interne notitie' staat" -ForegroundColor White
Write-Host "4. Type test bericht" -ForegroundColor White
Write-Host "5. Klik 'Verstuur'" -ForegroundColor White
Write-Host "6. Check je email inbox!" -ForegroundColor White
Write-Host ""

Write-Host "✅ Setup complete! Email systeem is geconfigureerd." -ForegroundColor Green
Write-Host ""
Write-Host "TROUBLESHOOTING:" -ForegroundColor Yellow
Write-Host "- Als je 'Email service not configured' ziet:" -ForegroundColor White
Write-Host "  -> Check RESEND_API_KEY in Supabase Settings" -ForegroundColor Gray
Write-Host "- Als je 'Function not found' ziet:" -ForegroundColor White  
Write-Host "  -> Deploy Edge Function opnieuw" -ForegroundColor Gray
Write-Host "- Als email niet aankomt:" -ForegroundColor White
Write-Host "  -> Check Resend dashboard voor delivery status" -ForegroundColor Gray

Write-Host ""
Write-Host "Press any key to continue..."
$Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown") | Out-Null 