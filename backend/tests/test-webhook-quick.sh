#!/bin/bash
# Quick test to check if DocuSign webhook is accessible

echo "🧪 Testing DocuSign Webhook Endpoint..."
echo "URL: https://conveyancing-portal-backend-fxcn40ltp.vercel.app/api/webhook/docusign"
echo ""

curl -X POST https://conveyancing-portal-backend-fxcn40ltp.vercel.app/api/webhook/docusign \
  -H "Content-Type: application/json" \
  -d '{
    "data": {
      "envelopeSummary": {
        "status": "completed",
        "customFields": {
          "textCustomFields": [
            {"name": "hs_deal_id", "value": "TEST_DEAL_123"}
          ]
        },
        "recipients": {
          "signers": [
            {"email": "test@example.com", "status": "completed"}
          ]
        }
      }
    }
  }'

echo ""
echo ""
echo "✅ If you see a response (even an error about deal ID), the endpoint is working!"
echo "❌ If you see connection refused, there's a deployment issue."




