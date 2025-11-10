# Quick test to check if DocuSign webhook is accessible
# PowerShell version

Write-Host "🧪 Testing DocuSign Webhook Endpoint..." -ForegroundColor Cyan
Write-Host "URL: https://conveyancing-portal-backend-fxcn40ltp.vercel.app/api/webhook/docusign" -ForegroundColor Yellow
Write-Host ""

$body = @{
    data = @{
        envelopeSummary = @{
            status = "completed"
            customFields = @{
                textCustomFields = @(
                    @{
                        name = "hs_deal_id"
                        value = "TEST_DEAL_123"
                    }
                )
            }
            recipients = @{
                signers = @(
                    @{
                        email = "test@example.com"
                        status = "completed"
                    }
                )
            }
        }
    }
} | ConvertTo-Json -Depth 10

try {
    $response = Invoke-RestMethod -Uri "https://conveyancing-portal-backend-fxcn40ltp.vercel.app/api/webhook/docusign" `
        -Method Post `
        -Body $body `
        -ContentType "application/json" `
        -ErrorAction Stop
    
    Write-Host ""
    Write-Host "✅ SUCCESS! Webhook is accessible!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Response:" -ForegroundColor Cyan
    $response | ConvertTo-Json -Depth 10
    
} catch {
    Write-Host ""
    if ($_.Exception.Response.StatusCode -eq 400 -or $_.Exception.Response.StatusCode -eq 404) {
        Write-Host "✅ Endpoint is accessible (got HTTP error, which is expected with fake deal ID)" -ForegroundColor Yellow
        Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Gray
    } else {
        Write-Host "❌ FAILED! Webhook is not accessible!" -ForegroundColor Red
        Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "📝 Next Steps:" -ForegroundColor Cyan
Write-Host "  1. If you got a response → Webhook is working!" -ForegroundColor White
Write-Host "  2. Configure DocuSign Connect with this URL" -ForegroundColor White
Write-Host "  3. Update DOCUSIGN_RETURN_URL and DOCUSIGN_PING_URL on Vercel" -ForegroundColor White
Write-Host ""

