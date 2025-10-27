# Questionnaire API Testing Guide

## Quick Start

### 1. Start the Backend Server

```bash
cd backend
npm run dev
```

Server should start on `http://localhost:3001`

### 2. Run Automated Tests

```bash
# Run all tests
npm test

# Run specific test file
npm test tests/questionnaire.test.js
npm test tests/questionnaire.api.test.js

# Run tests with coverage
npm test -- --coverage
```

## Manual Testing with cURL

### Health Check

```bash
# Check if server is running
curl http://localhost:3001/api/health

# Expected response:
# {
#   "status": "ok",
#   "message": "Conveyancing Portal API is running",
#   "timestamp": "2025-10-24T..."
# }
```

### Get Questionnaire Structure

```bash
# Get complete form structure with all sections
curl http://localhost:3001/api/questionnaire/structure

# Expected response:
# {
#   "success": true,
#   "data": {
#     "sections": [
#       {
#         "section_number": "1",
#         "section_title": "Title Details and Encumbrances",
#         "question_count": 5
#       },
#       ...
#     ],
#     "total_sections": 5,
#     "total_questions": 50+
#   }
# }
```

### Get Section Fields

```bash
# Get all fields for section 1
curl http://localhost:3001/api/questionnaire/1/fields

# Get all fields for section 2
curl http://localhost:3001/api/questionnaire/2/fields

# Get all fields for section 3
curl http://localhost:3001/api/questionnaire/3/fields

# Get all fields for section 4
curl http://localhost:3001/api/questionnaire/4/fields

# Get all fields for section 5
curl http://localhost:3001/api/questionnaire/5/fields

# Expected response:
# {
#   "success": true,
#   "data": {
#     "section_number": "1",
#     "field_count": 5,
#     "fields": [
#       {
#         "field_name": "body_corporate",
#         "question": "Is the property part of a body corporate?",
#         "type": "radio",
#         "required": true,
#         "conditional": false,
#         "options": [
#           {"value": "yes", "label": "Yes"},
#           {"value": "no", "label": "No"}
#         ]
#       },
#       ...
#     ]
#   }
# }
```

### Get Section Data (Load Existing)

```bash
# Get saved data for section 1 of deal 123456
curl http://localhost:3001/api/questionnaire/123456/section/1

# Try different deal IDs
curl http://localhost:3001/api/questionnaire/999999/section/1
curl http://localhost:3001/api/questionnaire/DEAL-ABC-123/section/1

# Expected response (empty data for new deals):
# {
#   "success": true,
#   "data": {
#     "section_number": "1",
#     "section_title": "Title Details and Encumbrances",
#     "questions": [...],
#     "savedData": {}
#   }
# }
```

### Save Section Data

```bash
# Save section 1 data
curl -X POST http://localhost:3001/api/questionnaire/123456/section/1 \
  -H "Content-Type: application/json" \
  -d '{
    "body_corporate": "yes",
    "registered_encumbrances": "no",
    "unregistered_encumbrances": "no"
  }'

# Save section 2 data (with conditional fields)
curl -X POST http://localhost:3001/api/questionnaire/123456/section/2 \
  -H "Content-Type: application/json" \
  -d '{
    "tenancy_agreement": "yes",
    "tenancy_agreement_lease_start_date": "2024-01-01",
    "tenancy_agreement_lease_end_date": "2025-01-01",
    "tenancy_agreement_rent_and_bond_payable": "2000 + bond"
  }'

# Save section 3 data
curl -X POST http://localhost:3001/api/questionnaire/123456/section/3 \
  -H "Content-Type: application/json" \
  -d '{
    "resume_notice": "no",
    "environmental_register": "yes",
    "environmental_register_details": "Property in flood-prone area"
  }'

# Save section 4 data
curl -X POST http://localhost:3001/api/questionnaire/123456/section/4 \
  -H "Content-Type: application/json" \
  -d '{
    "swimming_pool": "yes",
    "owner_builder": "no",
    "enforcement_notice": "no"
  }'

# Expected response (if HubSpot is available):
# {
#   "success": true,
#   "message": "Section 1 saved successfully",
#   "data": {
#     "dealId": "123456",
#     "sectionNumber": "1",
#     "fields_updated": 3
#   }
# }

# Expected response (if HubSpot fails):
# {
#   "success": false,
#   "message": "HubSpot sync queued for retry",
#   "queueId": 1,
#   "error": "API Error details"
# }
```

### Validation Testing

```bash
# Test invalid radio option - should get validation error
curl -X POST http://localhost:3001/api/questionnaire/123456/section/1 \
  -H "Content-Type: application/json" \
  -d '{
    "body_corporate": "maybe",
    "registered_encumbrances": "no"
  }'

# Expected response:
# {
#   "error": "Validation Error",
#   "message": "Form data validation failed",
#   "errors": [
#     {
#       "field": "body_corporate",
#       "message": "... has invalid value",
#       "type": "invalid_option"
#     }
#   ]
# }

# Test missing required field
curl -X POST http://localhost:3001/api/questionnaire/123456/section/1 \
  -H "Content-Type: application/json" \
  -d '{
    "registered_encumbrances": "no"
  }'

# Expected response:
# {
#   "error": "Validation Error",
#   "message": "Form data validation failed",
#   "errors": [
#     {
#       "field": "body_corporate",
#       "message": "Is the property part of a body corporate? is required",
#       "type": "required"
#     }
#   ]
# }

# Test invalid section number
curl -X POST http://localhost:3001/api/questionnaire/123456/section/999 \
  -H "Content-Type: application/json" \
  -d '{"test": "data"}'

# Expected response:
# {
#   "error": "Not Found",
#   "message": "Section 999 not found"
# }
```

### File Upload Testing

```bash
# Upload a PDF file
curl -X POST http://localhost:3001/api/questionnaire/123456/file-upload \
  -F "file=@/path/to/document.pdf" \
  -F "fieldName=tenancy_agreement_upload"

# Upload a Word document
curl -X POST http://localhost:3001/api/questionnaire/123456/file-upload \
  -F "file=@/path/to/agreement.docx" \
  -F "fieldName=tenancy_agreement_upload"

# Upload a JPG image
curl -X POST http://localhost:3001/api/questionnaire/123456/file-upload \
  -F "file=@/path/to/photo.jpg" \
  -F "fieldName=owner_builder_uploads"

# Test missing fieldName
curl -X POST http://localhost:3001/api/questionnaire/123456/file-upload \
  -F "file=@/path/to/document.pdf"

# Expected response:
# {
#   "error": "Validation Error",
#   "message": "fieldName is required"
# }

# Test missing file
curl -X POST http://localhost:3001/api/questionnaire/123456/file-upload \
  -F "fieldName=tenancy_agreement_upload"

# Expected response (multer returns 400):
# Error response from multer

# Test file size limit (create 26MB file and upload)
# Expected response:
# {
#   "error": "Validation Error",
#   "message": "File validation failed",
#   "errors": [
#     "File size (26.00MB) exceeds maximum of 25MB"
#   ]
# }
```

### Sync Queue Testing

```bash
# Check current sync queue status
curl http://localhost:3001/api/questionnaire/sync-queue/status

# Expected response:
# {
#   "success": true,
#   "data": {
#     "status": "active",
#     "statistics": {
#       "total": 0,
#       "queued": 0,
#       "scheduled": 0,
#       "completed": 0,
#       "failedManualReview": 0
#     },
#     "requiresAttention": false,
#     "itemsRequiringAttention": 0,
#     "oldestFailedItem": null
#   }
# }

# Get all queue items
curl http://localhost:3001/api/questionnaire/sync-queue/items

# Get only queued items
curl "http://localhost:3001/api/questionnaire/sync-queue/items?status=queued"

# Get items for specific deal
curl "http://localhost:3001/api/questionnaire/sync-queue/items?dealId=123456"

# Get items with multiple filters
curl "http://localhost:3001/api/questionnaire/sync-queue/items?status=failed_manual_review&dealId=123456"

# Expected response:
# {
#   "success": true,
#   "data": {
#     "count": 0,
#     "items": []
#   }
# }
```

## Testing Different Scenarios

### Scenario 1: Complete Form Workflow

```bash
# Step 1: Get structure
curl http://localhost:3001/api/questionnaire/structure

# Step 2: Get section fields
curl http://localhost:3001/api/questionnaire/1/fields

# Step 3: Save section data
curl -X POST http://localhost:3001/api/questionnaire/DEAL-001/section/1 \
  -H "Content-Type: application/json" \
  -d '{
    "body_corporate": "yes",
    "registered_encumbrances": "no",
    "unregistered_encumbrances": "no"
  }'

# Step 4: Check queue status
curl http://localhost:3001/api/questionnaire/sync-queue/status

# Step 5: Upload file (if needed)
curl -X POST http://localhost:3001/api/questionnaire/DEAL-001/file-upload \
  -F "file=@document.pdf" \
  -F "fieldName=owner_builder_uploads"
```

### Scenario 2: Conditional Field Testing

```bash
# Section 1: Save with "yes" to body_corporate
curl -X POST http://localhost:3001/api/questionnaire/DEAL-002/section/1 \
  -H "Content-Type: application/json" \
  -d '{
    "body_corporate": "yes",
    "registered_encumbrances": "yes",
    "registered_encumbrance_details": "Mortgage on property",
    "unregistered_encumbrances": "no"
  }'

# Section 2: Save tenancy with conditional dates
curl -X POST http://localhost:3001/api/questionnaire/DEAL-002/section/2 \
  -H "Content-Type: application/json" \
  -d '{
    "tenancy_agreement": "yes",
    "tenancy_agreement_lease_start_date": "2023-06-01",
    "tenancy_agreement_lease_end_date": "2025-06-01"
  }'

# Section 3: Save with conditional environmental details
curl -X POST http://localhost:3001/api/questionnaire/DEAL-002/section/3 \
  -H "Content-Type: application/json" \
  -d '{
    "resume_notice": "no",
    "environmental_register": "yes",
    "environmental_register_details": "Site history indicates previous industrial use"
  }'
```

### Scenario 3: Error Handling

```bash
# Test network error (stop server and try)
curl http://localhost:3001/api/questionnaire/structure

# Test invalid JSON
curl -X POST http://localhost:3001/api/questionnaire/DEAL-003/section/1 \
  -H "Content-Type: application/json" \
  -d '{invalid json}'

# Test missing required headers
curl -X POST http://localhost:3001/api/questionnaire/DEAL-003/section/1 \
  -d '{"body_corporate": "yes"}'
```

## Postman Collection

Import this JSON into Postman for easier testing:

```json
{
  "info": {
    "name": "Questionnaire API",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "item": [
    {
      "name": "Get Questionnaire Structure",
      "request": {
        "method": "GET",
        "url": "http://localhost:3001/api/questionnaire/structure"
      }
    },
    {
      "name": "Get Section 1 Fields",
      "request": {
        "method": "GET",
        "url": "http://localhost:3001/api/questionnaire/1/fields"
      }
    },
    {
      "name": "Save Section 1",
      "request": {
        "method": "POST",
        "header": [{"key": "Content-Type", "value": "application/json"}],
        "body": {
          "mode": "raw",
          "raw": "{\"body_corporate\":\"yes\",\"registered_encumbrances\":\"no\",\"unregistered_encumbrances\":\"no\"}"
        },
        "url": "http://localhost:3001/api/questionnaire/123456/section/1"
      }
    },
    {
      "name": "Get Sync Queue Status",
      "request": {
        "method": "GET",
        "url": "http://localhost:3001/api/questionnaire/sync-queue/status"
      }
    }
  ]
}
```

## Troubleshooting

### Server won't start

```bash
# Check if port 3001 is already in use
lsof -i :3001

# Kill existing process
kill -9 <PID>

# Start server again
npm run dev
```

### HubSpot API errors

- Check `HUBSPOT_ACCESS_TOKEN` in `.env`
- Verify HubSpot workspace is accessible
- Check that deal IDs are valid in your HubSpot instance

### File upload fails

- Ensure file size is under 25MB
- Check MIME type is supported (PDF, DOC, DOCX, XLS, XLSX, JPG, PNG, GIF)
- Verify the fieldName matches a file upload field in the schema

### Validation errors

- Check that all required fields are provided
- Verify field values match allowed options
- Ensure conditional dependencies are met

## Expected Status Codes

| Code | Scenario |
|------|----------|
| 200 | Successful GET request |
| 202 | Accepted (queued for retry) |
| 400 | Validation error or bad request |
| 404 | Resource not found |
| 413 | Payload too large (file upload) |
| 500 | Server error |

---

**Testing Complete!** All endpoints are ready for integration with the frontend.
