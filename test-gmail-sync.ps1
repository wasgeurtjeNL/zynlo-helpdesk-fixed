$headers = @{
    'Authorization' = 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5rcnl0c3NlemFlZmluYmpnd25xIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg0MzMzNjksImV4cCI6MjA2NDAwOTM2OX0.lYibGsjREQYbrHI0P8QJc4tm4KOVbzHiXXmPq_BBLxg'
    'Content-Type' = 'application/json'
}

$url = 'https://nkrytssezaefinbjgwnq.supabase.co/functions/v1/gmail-sync'

try {
    $response = Invoke-RestMethod -Uri $url -Method POST -Headers $headers
    Write-Host "Success Response:"
    $response | ConvertTo-Json -Depth 10
} catch {
    Write-Host "Error Response:"
    Write-Host $_.Exception.Message
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $reader.BaseStream.Position = 0
        $reader.DiscardBufferedData()
        $responseBody = $reader.ReadToEnd()
        Write-Host "Response Body: $responseBody"
    }
} 