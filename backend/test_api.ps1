$body = @{
    name = "Test User"
    age = "20"
    qualification = "Bachelor's Degree"
    skills = @("Python", "Machine Learning")
    preferredState = "Tamil Nadu"
    preferredSector = "Technology"
    workPreference = "office"
} | ConvertTo-Json

Write-Host "Sending request..."
try {
    $response = Invoke-WebRequest -Uri 'http://localhost:5000/api/recommendations' -Method POST -ContentType 'application/json' -Body $body -TimeoutSec 120 -UseBasicParsing
    Write-Host "Status: $($response.StatusCode)"
    Write-Host "Content: $($response.Content.Substring(0, [Math]::Min(500, $response.Content.Length)))"
} catch {
    Write-Host "Error: $($_.Exception.Message)"
    Write-Host "Response: $($_.Exception.Response)"
}
