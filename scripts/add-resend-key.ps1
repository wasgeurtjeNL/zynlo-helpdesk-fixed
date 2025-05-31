# Script om Resend API key toe te voegen

$apiKey = "re_2jDs1FRQ_EPLaYCS6s3TmNqtvb55BU5ap"
$envFile = "../.env.local"

Write-Host "🔧 Adding Resend API key to .env.local..." -ForegroundColor Yellow

if (Test-Path $envFile) {
    # Check if RESEND_API_KEY already exists
    $content = Get-Content $envFile
    $hasResendKey = $content | Where-Object { $_ -match "^RESEND_API_KEY=" }
    
    if ($hasResendKey) {
        Write-Host "⚠️ RESEND_API_KEY already exists, updating..." -ForegroundColor Yellow
        # Replace existing key
        $newContent = $content | ForEach-Object { 
            if ($_ -match "^RESEND_API_KEY=") { 
                "RESEND_API_KEY=$apiKey" 
            } else { 
                $_ 
            }
        }
        $newContent | Set-Content $envFile
    } else {
        Write-Host "➕ Adding new RESEND_API_KEY..." -ForegroundColor Green
        # Add new key
        Add-Content $envFile "`nRESEND_API_KEY=$apiKey"
    }
    
    Write-Host "✅ Resend API key configured successfully!" -ForegroundColor Green
    Write-Host ""
    Write-Host "📧 Email system is now ready for real email sending!" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "NEXT STEPS:" -ForegroundColor Yellow
    Write-Host "1. Restart your development servers (Ctrl+C in both terminals)" -ForegroundColor White
    Write-Host "2. Run: pnpm dev" -ForegroundColor White  
    Write-Host "3. Test the email system!" -ForegroundColor White
    Write-Host ""
    
} else {
    Write-Host "❌ .env.local file not found!" -ForegroundColor Red
    Write-Host "Please create .env.local in the root directory first." -ForegroundColor White
}

Write-Host "Press any key to continue..."
$Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown") | Out-Null 