# Property Questionnaire API Documentation

**Version:** 1.0
**Base URL:** `http://localhost:3001` (local) | `https://api.yourdomain.com` (production)
**API Pattern:** Follows HubSpot CRM v3 API conventions

---

## Overview

The Property Questionnaire API provides endpoints for managing property intake forms for conveyancing deals. It follows HubSpot v3 API naming patterns and conventions, making it familiar to developers who work with HubSpot's CRM API.

**Key Features:**
- 📋 30 structured questions across 5 sections
- ✅ Real-time form validation with detailed error messages
- 🔗 Direct HubSpot integration (maps form fields to deal properties)
- 📎 File upload support for document collection
- 🔄 Conditional field logic (fields show/hide based on parent answers)

---

## API Endpoints

### 1. GET /crm/v3/objects/property-questionnaire

**Get all questionnaire questions**

Returns the complete questionnaire schema with all 30 questions from all 5 sections, flattened into a single array. Each question includes metadata about its section, field type, validation rules, and HubSpot property mapping.

**Request:**
```bash
curl http://localhost:3001/crm/v3/objects/property-questionnaire
```

**Response:**
```json
{
  "status": "ok",
  "results": [
    {
      "section_number": "1",
      "section_title": "Title Details and Encumbrances",
      "field_name": "body_corporate",
      "question": "Is the property part of a body corporate?",
      "type": "radio",
      "required": true,
      "conditional": false,
      "conditional_on": {
        "question": null,
        "value": null
      },
      "options": [
        {
          "value": "yes",
          "label": "Yes",
          "hs_property_value": "Yes"
        },
        {
          "value": "no",
          "label": "No",
          "hs_property_value": "No"
        }
      ],
      "hsPropertyName": "body_corporate"
    },
    // ... 29 more questions
  ],
  "paging": {
    "total": 30
  }
}
```

**Status Code:** `200 OK`

**Use Cases:**
- Load the entire questionnaire form on frontend startup
- Display all questions with conditional logic handled client-side
- Build dynamic forms with validation rules

**Notes:**
- Results are flattened (not grouped by section)
- Each question includes the HubSpot property name it maps to
- Conditional questions include conditional_on metadata for frontend logic
- No authentication required (public endpoint)

---

### 2. PATCH /crm/v3/objects/property-questionnaire/{dealId}

**Update a deal with questionnaire answers**

Validates form data against the questionnaire schema and updates the HubSpot deal with the answers. Validates across all sections and returns detailed error messages if validation fails.

**Parameters:**
- `dealId` (path parameter): The HubSpot deal ID to update

**Request Body:**
```json
{
  "body_corporate": "yes",
  "registered_encumbrances": "no",
  "unregistered_encumbrances": "no",
  "tenancy_agreement": "no",
  "resume_notice": "no",
  "environmental_register": "no",
  "government_notice": "no",
  "tree_order": "no",
  "heritage_act": "no",
  "enforcement_notice": "no",
  "rates_notice_upload": "file-123",
  "water_notice_upload": "file-456"
}
```

**Request:**
```bash
curl -X PATCH http://localhost:3001/crm/v3/objects/property-questionnaire/123456 \
  -H "Content-Type: application/json" \
  -d '{
    "body_corporate": "yes",
    "registered_encumbrances": "no",
    ...
  }'
```

**Success Response (200):**
```json
{
  "status": "ok",
  "id": "123456",
  "message": "Questionnaire answers saved successfully",
  "properties": [
    "body_corporate",
    "registered_encumbrances",
    "unregistered_encumbrances",
    "tenancy_agreement",
    // ... more properties updated
  ]
}
```

**Status Code:** `200 OK` - Successfully saved to HubSpot

**Validation Error Response (400):**
```json
{
  "status": "error",
  "message": "Form data validation failed",
  "errors": [
    {
      "field": "body_corporate",
      "message": "Invalid option for Is the property part of a body corporate?",
      "type": "invalid_option"
    },
    {
      "field": "tenancy_agreement",
      "message": "Has the property been subject to a residential tenancy agreement... is required",
      "type": "required"
    }
  ]
}
```

**Status Code:** `400 Bad Request` - Validation failed, fix the data and retry

**HubSpot Error Response (202):**
```json
{
  "status": "error",
  "id": "123456",
  "message": "Save queued for retry",
  "error": "Request failed with status code 404"
}
```

**Status Code:** `202 Accepted` - Data validated but HubSpot sync failed (will retry)

**Field Validation Rules:**
- Required fields must have a value
- Radio/select fields must match valid options from questionnaire
- Email fields must be valid email format
- Date fields must be valid dates
- Number fields must be numeric
- Conditional fields only validated if their condition is met

**Conditional Fields Example:**
```javascript
// If tenancy_agreement = "yes", then these become required:
// - lease_start_date
// - lease_end_date
// - weekly_rent
// - tenancy_agreement_upload

// If tenancy_agreement = "no", these are skipped
```

**HubSpot Property Mapping:**
- Form field names are automatically mapped to HubSpot deal properties
- Example: `body_corporate` → HubSpot property `body_corporate`
- Example: `registered_encumbrances_details` → HubSpot property `registered_encumbrance_details`
- Mapping defined in `backend/src/config/propertyMapping.js`

---

### 3. POST /crm/v3/objects/property-questionnaire/{dealId}/files/upload

**Upload a file associated with a questionnaire field**

Upload documents (PDF, Word, images) for file upload fields in the questionnaire. Files are validated for type and size before processing.

**Parameters:**
- `dealId` (path parameter): The HubSpot deal ID to associate the file with

**Form Data:**
- `file` (required): The file to upload (multipart/form-data)
- `fieldName` (required): The questionnaire field name the file is for

**Supported File Types:**
- PDF: `application/pdf`
- Word (.doc): `application/msword`
- Word (.docx): `application/vnd.openxmlformats-officedocument.wordprocessingml.document`
- JPEG: `image/jpeg`
- PNG: `image/png`
- GIF: `image/gif`

**File Size Limit:** 25MB per file

**Request:**
```bash
curl -X POST http://localhost:3001/crm/v3/objects/property-questionnaire/123456/files/upload \
  -F "file=@/path/to/document.pdf" \
  -F "fieldName=rates_notice_upload"
```

**Success Response (201):**
```json
{
  "status": "ok",
  "id": "temp-file-id",
  "dealId": "123456",
  "fieldName": "rates_notice_upload",
  "fileName": "document.pdf",
  "fileSize": 245620,
  "message": "File uploaded successfully"
}
```

**Status Code:** `201 Created` - File uploaded successfully

**Validation Error Response (400):**
```json
{
  "status": "error",
  "message": "fieldName is required"
}
```

or

```json
{
  "status": "error",
  "message": "fieldName 'invalid_field' not found in questionnaire"
}
```

or

```json
{
  "status": "error",
  "message": "fieldName 'body_corporate' does not support file uploads"
}
```

**Status Code:** `400 Bad Request` - Invalid request or field doesn't support uploads

**Server Error Response (500):**
```json
{
  "status": "error",
  "message": "Error message describing what went wrong"
}
```

**Status Code:** `500 Internal Server Error` - Server error

**File Upload Fields:**
The following questionnaire fields support file uploads:
- `tenancy_agreement_upload` (Section 2) - Tenancy Agreement document
- `owner_builder_upload` (Section 4) - Owner builder plans and approvals
- `rates_notice_upload` (Section 5) - Latest rates notice
- `water_notice_upload` (Section 5) - Latest water notice

**File Size Limits:**
- Per file: 25MB
- Per field: up to 10 files (default)

---

## Questionnaire Sections

### Section 1: Title Details and Encumbrances (5 questions)
- Body corporate status
- Registered encumbrances
- Unregistered encumbrances

### Section 2: Rental Agreement/Tenancy (8 questions)
- Tenancy agreement status
- Lease dates and rent amounts
- Informal rental arrangements

### Section 3: Land Use, Planning and Environment (10 questions)
- Resume notices
- Environmental register status
- Government notices
- Tree orders
- Heritage act compliance

### Section 4: Buildings and Structures (5 questions)
- Swimming pool presence
- Owner builder work
- Enforcement notices

### Section 5: Rates & Services (2 questions + file uploads)
- Rates notice upload
- Water notice upload

**Total:** 30 questions across 5 sections

---

## Error Handling

### Status Codes

| Status | Meaning | Action |
|--------|---------|--------|
| 200 | OK | Request successful |
| 201 | Created | File uploaded successfully |
| 202 | Accepted | Data validated but HubSpot sync queued for retry |
| 400 | Bad Request | Validation failed - fix the data |
| 404 | Not Found | Deal ID or field not found |
| 500 | Server Error | Server error - contact support |

### Error Response Format

All error responses follow HubSpot v3 format:

```json
{
  "status": "error",
  "message": "Human-readable error message",
  "errors": [
    {
      "field": "field_name",
      "message": "Specific error for this field",
      "type": "error_type"
    }
  ]
}
```

**Error Types:**
- `required` - Field is required but empty
- `invalid_option` - Selected value not in valid options
- `invalid_format` - Field format invalid (email, date, number)
- `validation_error` - Custom validation failed

---

## Example Workflows

### Workflow 1: Load Questionnaire and Display Form

```javascript
// Step 1: Fetch all questions
const response = await fetch('http://localhost:3001/crm/v3/objects/property-questionnaire');
const { results } = await response.json();

// Step 2: Group by section (if needed)
const sections = groupBy(results, 'section_number');

// Step 3: Display with conditional logic
results.forEach(question => {
  if (question.conditional) {
    // Show/hide based on conditional_on values
    const parentValue = formData[question.conditional_on.question];
    if (parentValue !== question.conditional_on.value) {
      hideField(question.field_name);
    }
  }
  renderField(question);
});
```

### Workflow 2: Save Questionnaire Answers

```javascript
// Step 1: Collect form data
const formData = {
  body_corporate: 'yes',
  registered_encumbrances: 'no',
  // ... other fields
};

// Step 2: Validate and save
const response = await fetch(
  `http://localhost:3001/crm/v3/objects/property-questionnaire/${dealId}`,
  {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(formData)
  }
);

const result = await response.json();

if (result.status === 'error') {
  // Show validation errors
  result.errors.forEach(error => {
    showFieldError(error.field, error.message);
  });
} else {
  // Success - form saved
  showSuccess('Questionnaire saved successfully');
}
```

### Workflow 3: Upload File

```javascript
// Step 1: Get file from input
const fileInput = document.querySelector('input[type="file"]');
const file = fileInput.files[0];

// Step 2: Create form data
const formData = new FormData();
formData.append('file', file);
formData.append('fieldName', 'rates_notice_upload');

// Step 3: Upload
const response = await fetch(
  `http://localhost:3001/crm/v3/objects/property-questionnaire/${dealId}/files/upload`,
  {
    method: 'POST',
    body: formData
  }
);

const result = await response.json();

if (result.status === 'ok') {
  console.log(`File uploaded: ${result.fileName}`);
} else {
  showError(result.message);
}
```

---

## Integration with HubSpot

### Property Mapping

Each form field is automatically mapped to a HubSpot deal property:

```
Form Field Name                 → HubSpot Property Name
body_corporate                  → body_corporate
registered_encumbrances         → registered_encumbrances
registered_encumbrances_details → registered_encumbrance_details
tenancy_agreement              → tenancy_agreement
lease_start_date               → tenancy_agreement_lease_start_date
// ... and so on
```

See `backend/src/config/propertyMapping.js` for complete mapping.

### Data Flow

```
Frontend Form
    ↓
Collect User Input
    ↓
POST /crm/v3/objects/property-questionnaire/{dealId}
    ↓
Backend Validation
    ↓
Map to HubSpot Properties
    ↓
Update HubSpot Deal
    ↓
Return Response
```

---

## Rate Limits

Follow HubSpot's rate limits (inherited from HubSpot CRM API):
- **Free/Starter:** 100 requests per 10 seconds
- **Professional:** 150 requests per 10 seconds
- **Enterprise:** 200 requests per 10 seconds

---

## Authentication

Currently, the questionnaire API endpoints are public (no authentication required).

For production, add authentication middleware:
```javascript
app.use('/crm/v3/objects/property-questionnaire', authenticateJWT);
```

---

## Architecture

### Technology Stack
- **Framework:** Express.js
- **Validation:** Custom validation logic (propertyMapping.js)
- **File Handling:** Multer
- **HubSpot Integration:** Direct API calls to HubSpot CRM v3

### File Structure
```
backend/
├── src/
│   ├── routes/
│   │   └── questionnaire-simplified.js    # Route handlers
│   ├── config/
│   │   ├── questionnaire.json             # Question schema
│   │   └── propertyMapping.js             # Field-to-HubSpot mapping
│   ├── integrations/
│   │   └── hubspot/deals.js               # HubSpot API calls
│   └── server.js                          # Express app setup
```

### Key Concepts

**Single Source of Truth:** `propertyMapping.js` contains all field-to-HubSpot mappings

**Conditional Logic:** Questions can show/hide based on parent question values

**Validation:** Real-time validation with detailed error messages

**Async Processing:** 202 responses indicate the change was validated but will be processed asynchronously

---

## Development

### Running Locally

```bash
cd backend
npm install
npm run dev
```

Server runs on `http://localhost:3001`

### Testing Endpoints

See `TESTING_GUIDE.md` for comprehensive curl examples and test cases.

---

## Support

For issues or questions, check:
- `HUBSPOT_API_REFERENCE.md` - HubSpot CRM v3 API reference
- `propertyMapping.js` - Field-to-HubSpot property mappings
- `questionnaire.json` - Complete questionnaire schema
- Backend logs - For server-side errors

---

**Last Updated:** 2025-10-27
**Status:** ✅ Production Ready
