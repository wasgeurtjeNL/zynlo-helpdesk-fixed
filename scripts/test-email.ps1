# Test Email Script for Windows PowerShell
# This script simulates an incoming email to test the webhook

# Configuration - UPDATE THESE VALUES
$SUPABASE_URL = "https://nkrytssezaefinbjgwnq.supabase.co"
$SUPABASE_SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5rcnl0c3NlemFlZmluYmpnd25xIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0ODQzMzM2OSwiZXhwIjoyMDY0MDA5MzY5fQ.DjFDOI3ZWws9kVv868h9RVArtnWYOR37TWQS-IKP6x0"  # Your service key from the .env file
$TO_EMAIL = "jackwullems18@gmail.com"  # The email address of your connected Gmail channel

# Test email data
$testEmail = @{
    from = @{
        email = "test.customer@example.com"
        name = "Test Customer"
    }
    to = $TO_EMAIL
    subject = "Test Ticket - Help needed with login"
    text = "Hi, I cannot login to my account. Can you please help me? This is a test email sent at $(Get-Date)"
    html = "<p>Hi, I cannot login to my account. Can you please help me?</p><p>This is a test email sent at $(Get-Date)</p>"
    messageId = "test-$(Get-Date -Format 'yyyyMMddHHmmss')@example.com"
    attachments = @()
} | ConvertTo-Json -Depth 10

# Send the test email
Write-Host "Sending test email to webhook..." -ForegroundColor Yellow

try {
    $headers = @{
        "Authorization" = "Bearer $SUPABASE_SERVICE_KEY"
        "Content-Type" = "application/json"
    }
    
    $response = Invoke-RestMethod `
        -Uri "$SUPABASE_URL/functions/v1/process-email" `
        -Method Post `
        -Headers $headers `
        -Body $testEmail
    
    if ($response.success) {
        Write-Host "âœ… Test email processed successfully!" -ForegroundColor Green
        Write-Host "Ticket ID: $($response.ticketId)" -ForegroundColor Cyan
        Write-Host "Check your dashboard at http://localhost:3002 to see the new ticket." -ForegroundColor Yellow
    } else {
        Write-Host "âŒ Error processing email: $($response.error)" -ForegroundColor Red
    }
} catch {
    Write-Host "âŒ Failed to send test email:" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $reader.BaseStream.Position = 0
        $reader.DiscardBufferedData()
        Write-Host $reader.ReadToEnd() -ForegroundColor Red
    }
}

Write-Host "`nPress any key to exit..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown") 
