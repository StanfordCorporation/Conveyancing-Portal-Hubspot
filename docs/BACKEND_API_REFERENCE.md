# Backend API Reference & Function Flows

**Conveyancing Portal - HubSpot Integration**
**Architecture:** Clean Architecture with SOLID Principles
**Last Updated:** 2025-10-30

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [API Routes](#api-routes)
3. [Domain Services](#domain-services)
4. [HubSpot Integrations](#hubspot-integrations)
5. [Function Flows](#function-flows)
6. [HubSpot API Endpoints](#hubspot-api-endpoints)

---

## Architecture Overview

```
┌─────────────────┐
│   HTTP Routes   │  ← Express routes (thin handlers)
└────────┬────────┘
         │
         ↓
┌─────────────────┐
│ Domain Services │  ← Business logic layer
└────────┬────────┘
         │
         ↓
┌─────────────────┐
│   HubSpot API   │  ← Raw API wrappers
│   Integrations  │
└─────────────────┘
```

### Layer Responsibilities

- **Routes**: HTTP request/response handling, validation
- **Domain Services**: Business logic, orchestration
- **Integrations**: Direct HubSpot API calls, data transformation

---

## API Routes

### 1. Authentication Routes (`/api/auth`)

#### POST `/api/auth/send-otp`
**Description:** Send OTP to email or phone
**Query Params:** `type=client|agent` (default: client)
**Body:**
```json
{
  "identifier": "email@example.com",
  "method": "email|sms"
}
```
**Function Flow:**
```
sendOTP (auth.js)
  → Generate 6-digit OTP
  → Store in memory (5 min expiry)
  → Send via EmailJS API
  → Return success
```

#### POST `/api/auth/verify-otp`
**Description:** Verify OTP and generate JWT
**Query Params:** `type=client|agent`
**Body:**
```json
{
  "identifier": "email@example.com",
  "otp": "123456"
}
```
**Function Flow:**
```
verifyOTP (auth.js)
  → Validate OTP from memory
  → Find contact by email/phone
    → contactsIntegration.searchContactByEmail()
      → HubSpot: GET /crm/v3/objects/contacts/search
  → Generate JWT token
  → Return token + user data
```

---

### 2. Agency Routes (`/api/agencies`)

#### POST `/api/agencies/search`
**Description:** Search agencies by business name and suburb
**Body:**
```json
{
  "businessName": "Ray White",
  "suburb": "Brisbane"
}
```
**Function Flow:**
```
searchAgencies (agencies.js)
  → agencyService.search(businessName, suburb)
    → companiesIntegration.searchCompaniesByTokens()
      → HubSpot: POST /crm/v3/objects/companies/search
        ↳ Filters: name CONTAINS tokens, suburb CONTAINS suburb
      → Apply fuzzy matching and scoring
      → Sort by relevance score
    → Return ranked results
```

#### POST `/api/agencies/create`
**Description:** Create new agency with optional agent
**Body:**
```json
{
  "name": "Ray White Brisbane",
  "address": "123 Queen St, Brisbane",
  "email": "info@raywhite.com",
  "phone": "0712345678",
  "agentFirstName": "John",
  "agentLastName": "Doe",
  "agentEmail": "john@raywhite.com",
  "agentPhone": "0412345678"
}
```
**Function Flow:**
```
createAgency (agencies.js)
  → agencyService.createWithAgent()
    → companiesIntegration.createCompany()
      → HubSpot: POST /crm/v3/objects/companies
    → If agent data provided:
      → contactsIntegration.createAgentContact()
        → HubSpot: POST /crm/v3/objects/contacts
      → associationsIntegration.createAssociation()
        → HubSpot: PUT /crm/v4/objects/company/{id}/associations/contact/{id}
    → Return company + agent IDs
```

#### GET `/api/agencies/:agencyId/agents`
**Description:** Get all agents for an agency
**Function Flow:**
```
getAgents (agencies.js)
  → agencyService.getAgents(agencyId)
    → contactsIntegration.searchContactsByCompany()
      → HubSpot: GET /crm/v3/objects/companies/{id}/associations/contacts
      → Filter by contact_type = "Agent"
    → Return agent list
```

#### POST `/api/agencies/:agencyId/agents/create`
**Description:** Create agent for specific agency
**Body:**
```json
{
  "firstname": "John",
  "lastname": "Doe",
  "email": "john@raywhite.com",
  "phone": "0412345678"
}
```
**Function Flow:**
```
createAgent (agencies.js)
  → agentService.createForAgency(agencyId, ...)
    → contactsIntegration.createAgentContact()
      → HubSpot: POST /crm/v3/objects/contacts
    → associationsIntegration.createAssociation()
      → HubSpot: PUT /crm/v4/objects/company/{id}/associations/contact/{id}
    → Return agent ID
```

#### POST `/api/agencies/search-agent`
**Description:** Search for agent by email or phone
**Body:**
```json
{
  "email": "john@raywhite.com",
  "phone": "0412345678"
}
```
**Function Flow:**
```
searchAgent (agencies.js)
  → agentService.findByEmailOrPhone()
    → contactsIntegration.searchContactByEmailOrPhone()
      → HubSpot: POST /crm/v3/objects/contacts/search
        ↳ Filter: email EQ OR phone EQ
    → Return agent or null
```

---

### 3. Client Routes (`/api/client`)

**Authentication Required:** All routes require JWT token

#### GET `/api/client/dashboard-data`
**Description:** Get all deals for authenticated client (lightweight)
**Auth:** JWT token → contactId
**Function Flow:**
```
GET /api/client/dashboard-data
  → associationsIntegration.getContactDeals(contactId)
    → HubSpot: GET /crm/v3/objects/contacts/{id}/associations/deals
  → associationsIntegration.batchGetDealProperties(dealIds)
    → HubSpot: POST /crm/v3/objects/deals/batch/read
      ↳ Properties: dealname, property_address, dealstage, all questionnaire fields
  → Transform and return deals with progress %
```

#### GET `/api/client/dashboard-complete`
**Description:** Get all deals with full property details (one API call for entire session)
**Function Flow:**
```
GET /api/client/dashboard-complete
  → associationsIntegration.getContactDeals(contactId)
    → HubSpot: GET /crm/v3/objects/contacts/{id}/associations/deals
  → associationsIntegration.batchGetDealProperties(dealIds, properties)
    → HubSpot: POST /crm/v3/objects/deals/batch/read
  → For each deal:
    → associationsIntegration.getDealContacts(dealId)
      → HubSpot: GET /crm/v3/objects/deals/{id}/associations/contacts
      → HubSpot: POST /crm/v3/objects/contacts/batch/read
    → associationsIntegration.getDealCompanies(dealId)
      → HubSpot: GET /crm/v3/objects/deals/{id}/associations/companies
      → HubSpot: POST /crm/v3/objects/companies/batch/read
    → filesIntegration.getQuestionnaireFiles(dealId, properties)
      → Extract file IDs from deal properties
      → HubSpot: GET /files/v3/files/{fileId}/signed-url (for each file)
  → Return complete deal data with relationships
```

#### GET `/api/client/property/:dealId`
**Description:** Get single property with full details
**Function Flow:**
```
GET /api/client/property/:dealId
  → associationsIntegration.batchGetDealProperties([dealId])
    → HubSpot: POST /crm/v3/objects/deals/batch/read
  → associationsIntegration.getDealContacts(dealId)
    → HubSpot: GET /crm/v3/objects/deals/{id}/associations/contacts
    → HubSpot: POST /crm/v3/objects/contacts/batch/read
  → associationsIntegration.getDealCompanies(dealId)
    → HubSpot: GET /crm/v3/objects/deals/{id}/associations/companies
    → HubSpot: POST /crm/v3/objects/companies/batch/read
  → Return property with seller, agent, agency info
```

#### POST `/api/client/property/:dealId/questionnaire`
**Description:** Save questionnaire data (partial or complete)
**Body:** Form data (field names from questionnaire.json)
**Function Flow:**
```
POST /api/client/property/:dealId/questionnaire
  → Load schema via questionnaireHelper.getAllMappings()
  → Transform form field names → HubSpot property names
  → Capitalize enumeration values (yes → Yes)
  → dealsIntegration.updateDeal(dealId, properties)
    → HubSpot: PATCH /crm/v3/objects/deals/{dealId}
  → Return success
```

#### POST `/api/client/property/:dealId/questionnaire/submit`
**Description:** Submit complete questionnaire with validation
**Function Flow:**
```
POST /api/client/property/:dealId/questionnaire/submit
  → Validate all required fields from schema
  → Check conditional field visibility
  → Transform and save (same as above)
  → Return success or validation errors
```

#### POST `/api/client/property/:dealId/upload`
**Description:** Upload files for questionnaire fields
**Body:** FormData with files
**Function Flow:**
```
POST /api/client/property/:dealId/upload (multipart/form-data)
  → filesIntegration.uploadMultipleFiles(files)
    → For each file:
      → HubSpot: POST /files/v3/files
        ↳ Body: multipart/form-data
        ↳ Options: folderPath, access=PRIVATE
      → Return file IDs
  → filesIntegration.updateDealFileProperty(dealId, hsPropertyName, fileIds)
    → Get existing file IDs from deal
    → Append new file IDs (comma-separated)
    → HubSpot: PATCH /crm/v3/objects/deals/{dealId}
  → Return file IDs
```

#### GET `/api/client/property/:dealId/file/:fileId/metadata`
**Description:** Get file metadata with signed download URL
**Function Flow:**
```
GET /api/client/property/:dealId/file/:fileId/metadata
  → filesIntegration.getFileSignedUrl(fileId)
    → HubSpot: GET /files/v3/files/{fileId}/signed-url
  → Return metadata + signed URL (15 min expiry)
```

#### DELETE `/api/client/property/:dealId/file/:fileId`
**Description:** Delete file from HubSpot and remove from deal
**Query:** `fieldName=tenancy_agreement_upload`
**Function Flow:**
```
DELETE /api/client/property/:dealId/file/:fileId
  → filesIntegration.deleteFile(fileId)
    → HubSpot: DELETE /files/v3/files/{fileId}
  → filesIntegration.removeFileFromDealProperty(dealId, hsPropertyName, fileId)
    → Get current file IDs from deal
    → Remove deleted file ID
    → HubSpot: PATCH /crm/v3/objects/deals/{dealId}
  → Return success
```

---

### 4. Questionnaire Routes

#### GET `/api/questionnaire/schema`
**Description:** Get questionnaire schema (single source of truth)
**Caching:** Frontend caches in localStorage for 24 hours
**Function Flow:**
```
GET /api/questionnaire/schema
  → questionnaireHelper.getQuestionnaireSchema()
    → Read questionnaire.json from disk (cached)
    → Add schema_version: "1.0.0"
  → Return complete schema
```

**Response Structure:**
```json
{
  "sections": [
    {
      "section_number": "1",
      "section_title": "Title Details and Encumbrances",
      "questions": [
        {
          "form_question": "Is the property part of a body corporate?",
          "form_field_name": "body_corporate",
          "HubSpot_Property_Name": "body_corporate",
          "form_field_type": "radio",
          "required": true,
          "conditional": false,
          "options": [
            {"value": "yes", "label": "Yes", "hs_property_value": "Yes"},
            {"value": "no", "label": "No", "hs_property_value": "No"}
          ]
        }
      ]
    }
  ],
  "schema_version": "1.0.0"
}
```

#### GET `/crm/v3/objects/property-questionnaire`
**Description:** Returns questionnaire metadata (mimics HubSpot API pattern)
**Function Flow:**
```
GET /crm/v3/objects/property-questionnaire
  → Return static metadata about questionnaire object
```

#### PATCH `/crm/v3/objects/property-questionnaire/:dealId`
**Description:** Update questionnaire answers for a deal
**Function Flow:**
```
PATCH /crm/v3/objects/property-questionnaire/:dealId
  → Transform form data using questionnaireHelper
  → dealsIntegration.updateDeal(dealId, properties)
    → HubSpot: PATCH /crm/v3/objects/deals/{dealId}
  → Return success
```

#### POST `/crm/v3/objects/property-questionnaire/:dealId/files/upload`
**Description:** Upload files for questionnaire
**Function Flow:**
```
POST /crm/v3/objects/property-questionnaire/:dealId/files/upload
  → filesIntegration.uploadMultipleFiles()
  → Update deal with file IDs
  → Return file IDs
```

---

### 5. Workflow Routes (`/api/workflows`)

#### POST `/api/workflows/agent-client-creation`
**Description:** Complete workflow for agent creating a new client deal
**Body:**
```json
{
  "agentEmail": "john@raywhite.com",
  "agentPhone": "0412345678",
  "clientFirstName": "Jane",
  "clientLastName": "Smith",
  "clientEmail": "jane@example.com",
  "clientPhone": "0423456789",
  "propertyAddress": "123 Main St, Brisbane QLD 4000",
  "numberOfOwners": 1,
  "agencyId": "123456789",
  "agencyName": "Ray White Brisbane"
}
```
**Function Flow:**
```
POST /api/workflows/agent-client-creation
  → 1. Find or create client contact
    → clientService.findOrCreate()
      → contactsIntegration.searchContactByEmail()
        → HubSpot: POST /crm/v3/objects/contacts/search
      → If not found: contactsIntegration.createContact()
        → HubSpot: POST /crm/v3/objects/contacts

  → 2. Find or create agent
    → agentService.findByEmailOrPhone()
      → contactsIntegration.searchContactByEmailOrPhone()
        → HubSpot: POST /crm/v3/objects/contacts/search
      → If not found: contactsIntegration.createAgentContact()
        → HubSpot: POST /crm/v3/objects/contacts

  → 3. Find or create agency
    → agencyService.findByEmail()
      → companiesIntegration.searchCompanyByEmail()
        → HubSpot: POST /crm/v3/objects/companies/search
      → If not found: companiesIntegration.createCompany()
        → HubSpot: POST /crm/v3/objects/companies

  → 4. Associate agent with agency
    → associationsIntegration.createAssociation()
      → HubSpot: PUT /crm/v4/objects/company/{id}/associations/contact/{id}

  → 5. Create deal with associations
    → dealService.createWithAssociations()
      → dealsIntegration.createDealWithAssociations()
        → HubSpot: POST /crm/v3/objects/deals
          ↳ With associations: [client, agent, agency]

  → Return: dealId, clientId, agentId, agencyId
```

#### POST `/api/workflows/client-disclosure`
**Description:** Client disclosure workflow (legacy)
**Function Flow:**
```
POST /api/workflows/client-disclosure
  → Find client by email
  → Find or create deal
  → Update deal with disclosure data
  → Return deal ID
```

#### POST `/api/workflows/property-intake`
**Description:** Property intake workflow (legacy)
**Function Flow:**
```
POST /api/workflows/property-intake
  → Find deal by ID
  → Update deal with property intake data
  → Return success
```

---

## Domain Services

### Agency Service (`services/domain/agency.js`)

| Function | Description | HubSpot Integration |
|----------|-------------|---------------------|
| `search(businessName, suburb)` | Search agencies with fuzzy matching | `searchCompaniesByTokens()` |
| `findByEmail(email)` | Find agency by exact email | `searchCompanyByEmail()` |
| `createWithAgent(name, email, phone, agentData)` | Create agency + agent | `createCompany()`, `createAgentContact()`, `createAssociation()` |
| `getAgents(agencyId)` | Get all agents for agency | `searchContactsByCompany()` |
| `getById(agencyId)` | Get agency details | `getCompany()` |

### Agent Service (`services/domain/agent.js`)

| Function | Description | HubSpot Integration |
|----------|-------------|---------------------|
| `findByEmail(email)` | Find agent by email | `searchContactByEmail()` |
| `findByEmailOrPhone(email, phone)` | Find agent by email OR phone | `searchContactByEmailOrPhone()` |
| `create(firstname, lastname, email, phone)` | Create standalone agent | `createAgentContact()` |
| `createForAgency(agencyId, ...)` | Create agent linked to agency | `createAgentContact()`, `createAssociation()` |
| `getById(agentId)` | Get agent details | `getContact()` |
| `update(agentId, updates)` | Update agent properties | `updateContact()` |

### Client Service (`services/domain/client.js`)

| Function | Description | HubSpot Integration |
|----------|-------------|---------------------|
| `findByEmail(email)` | Find client by email | `searchContactByEmail()` |
| `findOrCreate(firstname, lastname, email, phone)` | Find or create client | `searchContactByEmail()`, `createContact()` |
| `create(firstname, lastname, email, phone)` | Create client contact | `createContact()` |
| `getById(clientId)` | Get client details | `getContact()` |
| `update(clientId, updates)` | Update client properties | `updateContact()` |

### Deal Service (`services/domain/deal.js`)

| Function | Description | HubSpot Integration |
|----------|-------------|---------------------|
| `create(dealData, associations)` | Create deal with associations | `createDeal()` |
| `createWithAssociations(dealData, contactIdOrAssociations, agencyId)` | Create deal with flexible associations | `createDealWithAssociations()` |
| `getById(dealId)` | Get deal details | `getDeal()` |
| `update(dealId, updates)` | Update deal properties | `updateDeal()` |
| `updateStage(dealId, stage)` | Update deal pipeline stage | `updateDealStage()` |
| `updatePropertyIntake(dealId, intakeData)` | Bulk update property data | `updateDeal()` |

---

## HubSpot Integrations

### Associations (`integrations/hubspot/associations.js`)

| Function | HubSpot API Endpoint |
|----------|---------------------|
| `getContactDeals(contactId)` | `GET /crm/v3/objects/contacts/{id}/associations/deals` |
| `getDealContacts(dealId)` | `GET /crm/v3/objects/deals/{id}/associations/contacts` |
| `getDealCompanies(dealId)` | `GET /crm/v3/objects/deals/{id}/associations/companies` |
| `batchGetDealProperties(dealIds, properties)` | `POST /crm/v3/objects/deals/batch/read` |
| `createAssociation(fromId, toId, type)` | `PUT /crm/v4/objects/{from}/{fromId}/associations/{to}/{toId}` |

### Companies (`integrations/hubspot/companies.js`)

| Function | HubSpot API Endpoint |
|----------|---------------------|
| `createCompany(companyData)` | `POST /crm/v3/objects/companies` |
| `getCompany(companyId)` | `GET /crm/v3/objects/companies/{id}` |
| `updateCompany(companyId, updates)` | `PATCH /crm/v3/objects/companies/{id}` |
| `searchCompaniesByName(name)` | `POST /crm/v3/objects/companies/search` |
| `searchCompaniesByTokens(businessName, suburb)` | `POST /crm/v3/objects/companies/search` (with scoring) |
| `searchCompanyByEmail(email)` | `POST /crm/v3/objects/companies/search` |

### Contacts (`integrations/hubspot/contacts.js`)

| Function | HubSpot API Endpoint |
|----------|---------------------|
| `createContact(contactData)` | `POST /crm/v3/objects/contacts` |
| `getContact(contactId)` | `GET /crm/v3/objects/contacts/{id}` |
| `updateContact(contactId, updates)` | `PATCH /crm/v3/objects/contacts/{id}` |
| `searchContactByEmail(email)` | `POST /crm/v3/objects/contacts/search` |
| `searchContactByEmailOrPhone(email, phone)` | `POST /crm/v3/objects/contacts/search` |
| `searchContactsByCompany(companyId)` | `GET /crm/v3/objects/companies/{id}/associations/contacts` |
| `createAgentContact(contactData)` | `POST /crm/v3/objects/contacts` (with contact_type=Agent) |

### Deals (`integrations/hubspot/deals.js`)

| Function | HubSpot API Endpoint |
|----------|---------------------|
| `createDeal(dealData, associations)` | `POST /crm/v3/objects/deals` |
| `getDeal(dealId)` | `GET /crm/v3/objects/deals/{id}` |
| `updateDeal(dealId, updates)` | `PATCH /crm/v3/objects/deals/{id}` |
| `updateDealStage(dealId, stage)` | `PATCH /crm/v3/objects/deals/{id}` |
| `createDealWithAssociations(dealData, contactId, agencyId)` | `POST /crm/v3/objects/deals` |

### Files (`integrations/hubspot/files.js`)

| Function | HubSpot API Endpoint |
|----------|---------------------|
| `uploadFile(fileBuffer, fileName, options)` | `POST /files/v3/files` |
| `uploadMultipleFiles(files, options)` | `POST /files/v3/files` (multiple calls) |
| `getFileSignedUrl(fileId)` | `GET /files/v3/files/{fileId}/signed-url` |
| `getMultipleFileSignedUrls(fileIds)` | `GET /files/v3/files/{fileId}/signed-url` (multiple) |
| `deleteFile(fileId)` | `DELETE /files/v3/files/{fileId}` |
| `updateDealFileProperty(dealId, propertyName, fileId)` | `PATCH /crm/v3/objects/deals/{id}` |
| `removeFileFromDealProperty(dealId, propertyName, fileId)` | `PATCH /crm/v3/objects/deals/{id}` |
| `getQuestionnaireFiles(dealId, dealProperties)` | Multiple `GET /files/v3/files/{fileId}/signed-url` |

---

## Function Flows

### Flow 1: Client Login & Dashboard Load

```
┌──────────────────────────────────────────────────────────────┐
│ 1. CLIENT LOGIN                                              │
└──────────────────────────────────────────────────────────────┘

User enters email → POST /api/auth/send-otp?type=client
                    ↓
                    Generate OTP → Store in memory (5 min)
                    ↓
                    Send via EmailJS
                    ↓
User enters OTP  → POST /api/auth/verify-otp?type=client
                    ↓
                    Validate OTP
                    ↓
                    HubSpot: Search contact by email
                    ↓
                    Generate JWT (contains contactId)
                    ↓
                    Return token + user data

┌──────────────────────────────────────────────────────────────┐
│ 2. DASHBOARD DATA LOAD (OPTIMIZED - ONE CALL)               │
└──────────────────────────────────────────────────────────────┘

GET /api/client/dashboard-complete
Authorization: Bearer JWT_TOKEN
  ↓
  Extract contactId from JWT
  ↓
  HubSpot: GET /crm/v3/objects/contacts/{contactId}/associations/deals
  → Returns: [dealId1, dealId2, ...]
  ↓
  HubSpot: POST /crm/v3/objects/deals/batch/read
  → Input: [dealId1, dealId2]
  → Properties: [dealname, property_address, dealstage, all_questionnaire_fields]
  → Returns: Full deal data for all deals
  ↓
  For EACH deal in parallel:
    ├─ HubSpot: GET /crm/v3/objects/deals/{dealId}/associations/contacts
    │  → Returns: [contactId1, contactId2]
    │  ↓
    │  HubSpot: POST /crm/v3/objects/contacts/batch/read
    │  → Returns: Contact details (primary seller, additional seller, agent)
    │
    ├─ HubSpot: GET /crm/v3/objects/deals/{dealId}/associations/companies
    │  → Returns: [companyId]
    │  ↓
    │  HubSpot: POST /crm/v3/objects/companies/batch/read
    │  → Returns: Agency details
    │
    └─ Extract file IDs from deal properties
       ↓
       HubSpot: GET /files/v3/files/{fileId}/signed-url (for each file)
       → Returns: Signed URLs (15 min expiry)
  ↓
  Combine all data → Return complete deals array with:
    - Deal details
    - Questionnaire progress
    - Property information
    - Seller details
    - Agent details
    - Agency details
    - File metadata with download URLs
```

### Flow 2: Property Questionnaire Submission

```
┌──────────────────────────────────────────────────────────────┐
│ PROPERTY QUESTIONNAIRE FLOW                                  │
└──────────────────────────────────────────────────────────────┘

1. LOAD SCHEMA (ONCE PER SESSION)
   ↓
   GET /api/questionnaire/schema
   ↓
   Frontend: Check localStorage cache
   ├─ Cache valid? → Use cached schema
   └─ Cache invalid? → Fetch from API → Cache for 24 hours
   ↓
   Schema includes:
   - All sections (5)
   - All questions (34)
   - Field types (radio, textarea, date, number, file)
   - Validation rules (required, conditional)
   - Options for radio fields
   - HubSpot property mappings

2. RENDER QUESTIONNAIRE
   ↓
   Frontend dynamically renders:
   - Section tabs (1-5)
   - Questions in correct order (parent + conditional sub-questions)
   - Radio buttons from schema options
   - Conditional visibility based on answers
   ↓
   User fills form → Auto-save on change

3. AUTO-SAVE (ON FIELD CHANGE)
   ↓
   POST /api/client/property/{dealId}/questionnaire
   Body: { field_name: value, ... }
   ↓
   Transform form field names → HubSpot property names
   (using questionnaireHelper.getAllMappings())
   ↓
   Capitalize enumeration values: yes → Yes
   ↓
   HubSpot: PATCH /crm/v3/objects/deals/{dealId}
   → Update deal properties
   ↓
   Return success

4. FILE UPLOAD
   ↓
   POST /api/client/property/{dealId}/upload
   Body: FormData with files
   ↓
   For each file:
     → HubSpot: POST /files/v3/files
       ↳ Upload to: /questionnaire-uploads/{dealId}/
       ↳ Access: PRIVATE
     → Returns: fileId
   ↓
   Get current file IDs from deal property
   ↓
   Append new file IDs (comma-separated)
   ↓
   HubSpot: PATCH /crm/v3/objects/deals/{dealId}
   → Update file property: "fileId1,fileId2,fileId3"
   ↓
   Return file IDs

5. FINAL SUBMIT (WITH VALIDATION)
   ↓
   POST /api/client/property/{dealId}/questionnaire/submit
   ↓
   Validate all required fields from schema
   ├─ Check required: true
   ├─ Skip hidden conditional fields
   └─ Return validation errors if any
   ↓
   Transform and save (same as auto-save)
   ↓
   Mark questionnaire as complete
   ↓
   Return success
```

### Flow 3: Agency Search with Agent Creation

```
┌──────────────────────────────────────────────────────────────┐
│ AGENT CREATES NEW CLIENT DEAL                                │
└──────────────────────────────────────────────────────────────┘

1. AGENT PORTAL LOGIN
   ↓
   POST /api/auth/send-otp?type=agent
   POST /api/auth/verify-otp?type=agent
   ↓
   Returns: JWT with agentContactId

2. SEARCH FOR AGENCY
   ↓
   POST /api/agencies/search
   Body: { businessName: "Ray White", suburb: "Brisbane" }
   ↓
   HubSpot: POST /crm/v3/objects/companies/search
   Filters:
     - name CONTAINS_TOKEN "Ray"
     - name CONTAINS_TOKEN "White"
     - suburb CONTAINS "Brisbane"
   ↓
   Apply fuzzy matching algorithm:
     1. Extract tokens from company name
     2. Match against search tokens
     3. Calculate match score (0-100)
     4. Bonus for suburb match (+20)
   ↓
   Sort by score (desc)
   ↓
   Return: [
     { id, name, suburb, score: 95 },
     { id, name, suburb, score: 87 },
     ...
   ]

3. SELECT AGENCY → CREATE DEAL
   ↓
   POST /api/workflows/agent-client-creation
   Body: {
     agentEmail: "john@raywhite.com",
     clientFirstName: "Jane",
     clientLastName: "Smith",
     clientEmail: "jane@example.com",
     propertyAddress: "123 Main St",
     agencyId: "12345",
     agencyName: "Ray White Brisbane"
   }
   ↓
   Step 1: Find/Create Client
     → HubSpot: POST /crm/v3/objects/contacts/search
       ↳ Filter: email EQ "jane@example.com"
     → If not found:
       → HubSpot: POST /crm/v3/objects/contacts
         ↳ Properties: firstname, lastname, email, phone, contact_type=Client
   ↓
   Step 2: Find/Create Agent
     → HubSpot: POST /crm/v3/objects/contacts/search
       ↳ Filter: email EQ "john@raywhite.com"
     → If not found:
       → HubSpot: POST /crm/v3/objects/contacts
         ↳ Properties: firstname, lastname, email, phone, contact_type=Agent
   ↓
   Step 3: Find/Create Agency
     → HubSpot: POST /crm/v3/objects/companies/search
       ↳ Filter: email EQ agency email
     → If not found:
       → HubSpot: POST /crm/v3/objects/companies
   ↓
   Step 4: Associate Agent with Agency
     → HubSpot: PUT /crm/v4/objects/company/{agencyId}/associations/contact/{agentId}
       ↳ Association Type: 2 (Company to Contact)
   ↓
   Step 5: Create Deal with All Associations
     → HubSpot: POST /crm/v3/objects/deals
       Body: {
         properties: {
           dealname: "123 Main St - Jane Smith",
           property_address: "123 Main St",
           dealstage: "1923713518" (first stage)
         },
         associations: [
           { to: { id: clientId }, types: [{ associationTypeId: 3 }] },  // Deal to Contact
           { to: { id: agentId }, types: [{ associationTypeId: 3 }] },   // Deal to Contact (Agent)
           { to: { id: agencyId }, types: [{ associationTypeId: 6 }] }   // Deal to Company
         ]
       }
   ↓
   Return: {
     dealId,
     clientId,
     agentId,
     agencyId,
     success: true
   }
```

---

## HubSpot API Endpoints

### Complete List of API Calls

#### Companies (Agencies)
```
POST   /crm/v3/objects/companies              - Create company
GET    /crm/v3/objects/companies/{id}         - Get company
PATCH  /crm/v3/objects/companies/{id}         - Update company
POST   /crm/v3/objects/companies/search       - Search companies
POST   /crm/v3/objects/companies/batch/read   - Batch get companies
GET    /crm/v3/objects/companies/{id}/associations/contacts - Get associated contacts
```

#### Contacts (Clients, Agents)
```
POST   /crm/v3/objects/contacts               - Create contact
GET    /crm/v3/objects/contacts/{id}          - Get contact
PATCH  /crm/v3/objects/contacts/{id}          - Update contact
POST   /crm/v3/objects/contacts/search        - Search contacts
POST   /crm/v3/objects/contacts/batch/read    - Batch get contacts
GET    /crm/v3/objects/contacts/{id}/associations/deals - Get associated deals
```

#### Deals (Properties)
```
POST   /crm/v3/objects/deals                  - Create deal
GET    /crm/v3/objects/deals/{id}             - Get deal
PATCH  /crm/v3/objects/deals/{id}             - Update deal
POST   /crm/v3/objects/deals/search           - Search deals
POST   /crm/v3/objects/deals/batch/read       - Batch get deals
GET    /crm/v3/objects/deals/{id}/associations/contacts  - Get associated contacts
GET    /crm/v3/objects/deals/{id}/associations/companies - Get associated companies
```

#### Associations (v4 API)
```
PUT    /crm/v4/objects/{from}/{fromId}/associations/{to}/{toId}  - Create association
DELETE /crm/v4/objects/{from}/{fromId}/associations/{to}/{toId}  - Remove association
GET    /crm/v4/associations/{from}/{to}/labels                   - Get association types
```

#### Files
```
POST   /files/v3/files                        - Upload file
GET    /files/v3/files/{id}                   - Get file metadata
GET    /files/v3/files/{id}/signed-url        - Get signed download URL (15 min)
DELETE /files/v3/files/{id}                   - Delete file
```

### HubSpot Association Type IDs

```javascript
// Contact ↔ Deal
3 = Contact to Deal (Deal associated with contact)
4 = Deal to Contact (Contact associated with deal)

// Company ↔ Contact
1 = Company to Contact (Primary company)
2 = Contact to Company (Primary contact)

// Company ↔ Deal
5 = Company to Deal (Company associated with deal)
6 = Deal to Company (Deal associated with company)

// Line Items ↔ Deal
19 = Line Item to Deal
20 = Deal to Line Item
```

### HubSpot Deal Stages (Pipeline IDs)

```javascript
// Conveyancing Pipeline Stages
"1923713518" = "New Lead"           // Default for new deals
"1923713520" = "Qualified"
"1923682791" = "Contract Sent"
"1923682792" = "Contract Signed"
"1924069846" = "Due Diligence"
"1904359900" = "Settlement Pending"
"1904359901" = "Settlement Complete"
"1904359902" = "Post Settlement"
"closedwon"  = "Closed Won"
"closedlost" = "Closed Lost"
```

---

## Questionnaire Field Mappings

**Source:** `backend/src/config/questionnaire.json`

### Section 1: Title Details & Encumbrances (5 questions)
- body_corporate → HubSpot: body_corporate
- registered_encumbrances → HubSpot: registered_encumbrances
- registered_encumbrances_details → HubSpot: registered_encumbrance_details (conditional)
- unregistered_encumbrances → HubSpot: unregistered_encumbrances
- unregistered_encumbrances_details → HubSpot: unregistered_encumbrance_details (conditional)

### Section 2: Rental Agreement/Tenancy (8 questions)
- tenancy_agreement → HubSpot: tenancy_agreement
- rent_increase_date → HubSpot: tenancy_agreement_last_rental_increase (conditional)
- lease_start_date → HubSpot: tenancy_agreement_start_date (conditional)
- lease_end_date → HubSpot: tenancy_agreement_end_date (conditional)
- weekly_rent → HubSpot: weekly_rent (conditional)
- bond_amount → HubSpot: bond_amount (conditional)
- tenancy_agreement_upload → HubSpot: tenancy_agreement_upload (conditional, file)
- informal_rental → HubSpot: informal_rental

### Section 3: Land Use, Planning & Environment (10 questions)
- resume_notice → HubSpot: resume_notice
- resume_notice_details → HubSpot: resume_notice_details (conditional)
- environmental_register → HubSpot: environmental_register
- environmental_register_details → HubSpot: environmental_register_details (conditional)
- government_notice → HubSpot: government_notice
- government_notice_details → HubSpot: government_notice_details (conditional)
- tree_order → HubSpot: tree_order
- tree_order_details → HubSpot: tree_order_details (conditional)
- heritage_act → HubSpot: heritage_act
- heritage_act_details → HubSpot: heritage_act_details (conditional)

### Section 4: Buildings & Structures (5 questions)
- swimming_pool → HubSpot: swimming_pool
- owner_builder → HubSpot: owner_builder
- owner_builder_upload → HubSpot: owner_builder_uploads (conditional, file)
- enforcement_notice → HubSpot: enforcement_notice
- enforcement_notice_details → HubSpot: enforcement_notice_details (conditional)

### Section 5: Rates & Services (2 questions)
- rates_notice_upload → HubSpot: most_recent_rates_notice (required, file)
- water_notice_upload → HubSpot: file_upload_water_notice (required, file)

**Total:** 30 questions (34 fields including conditional sub-questions)

---

## Performance Optimizations

### 1. Batch API Calls
Instead of fetching deals one-by-one, use batch endpoints:
```javascript
// ❌ Bad: N API calls
for (const dealId of dealIds) {
  await getDeal(dealId);
}

// ✅ Good: 1 API call
await batchGetDealProperties(dealIds, properties);
```

### 2. Parallel Processing
Fetch independent data in parallel:
```javascript
// ✅ Parallel execution
const [deals, contacts, companies] = await Promise.all([
  getDealDetails(dealId),
  getDealContacts(dealId),
  getDealCompanies(dealId)
]);
```

### 3. Property Selection
Only request needed properties:
```javascript
// ❌ Bad: Fetch all properties
await getDeal(dealId);

// ✅ Good: Specify properties
await getDeal(dealId, {
  properties: ['dealname', 'dealstage', 'property_address']
});
```

### 4. Frontend Caching
Cache questionnaire schema in localStorage:
- Cache duration: 24 hours
- Version tracking: Invalidate on schema_version change
- Fallback: Use cached data if API fails

---

## Error Handling Patterns

### HubSpot API Errors
```javascript
try {
  const response = await hubspotClient.post('/crm/v3/objects/deals', data);
  return response.data;
} catch (error) {
  if (error.response) {
    // HubSpot API error
    console.error('HubSpot API Error:', error.response.data);
    throw new Error(error.response.data.message);
  } else {
    // Network or other error
    console.error('Request failed:', error.message);
    throw error;
  }
}
```

### Validation Errors
```javascript
if (!requiredField) {
  return res.status(400).json({
    error: 'Validation Error',
    message: 'Required field is missing',
    field: 'fieldName'
  });
}
```

### Authentication Errors
```javascript
if (!token) {
  return res.status(401).json({
    error: 'Unauthorized',
    message: 'Authentication token required'
  });
}
```

---

## Development & Testing

### Environment Variables
```bash
HUBSPOT_ACCESS_TOKEN=your_token_here
AIRCALL_API_ID=your_api_id
AIRCALL_API_TOKEN=your_api_token
EMAILJS_SERVICE_ID=your_service_id
EMAILJS_TEMPLATE_ID=your_template_id
EMAILJS_PUBLIC_KEY=your_public_key
PORT=3001
CORS_ORIGIN=http://localhost:3000
```

### Test Endpoints
```bash
# Health check
curl http://localhost:3001/api/health

# Get questionnaire schema
curl http://localhost:3001/api/questionnaire/schema

# Search agencies
curl -X POST http://localhost:3001/api/agencies/search \
  -H "Content-Type: application/json" \
  -d '{"businessName":"Ray White","suburb":"Brisbane"}'
```

---

## Architecture Principles

### 1. Single Responsibility
Each layer has one responsibility:
- Routes: HTTP handling
- Services: Business logic
- Integrations: HubSpot API calls

### 2. Dependency Injection
Services depend on integrations (not vice versa):
```javascript
// ✅ Good
import * as contactsIntegration from '../integrations/hubspot/contacts.js';

export const findByEmail = async (email) => {
  return await contactsIntegration.searchContactByEmail(email);
};
```

### 3. Single Source of Truth
Questionnaire configuration lives in ONE place:
- Schema: `backend/src/config/questionnaire.json`
- API: `GET /api/questionnaire/schema`
- Helper: `backend/src/utils/questionnaireHelper.js`

### 4. Separation of Concerns
- Frontend: UI rendering (dynamic from schema)
- Backend: Business logic + validation
- HubSpot: Data storage

---

## Future Enhancements

1. **Caching Layer**: Redis for HubSpot data
2. **Webhook Integration**: Real-time updates from HubSpot
3. **Bulk Operations**: Upload multiple properties via CSV
4. **Advanced Search**: Full-text search with Elasticsearch
5. **Analytics Dashboard**: Track completion rates, time-to-complete
6. **Email Notifications**: Auto-send reminders for incomplete questionnaires
7. **Document Generation**: Auto-generate PDFs from questionnaire data
8. **Audit Trail**: Track all changes to deals/properties

---

**Last Updated:** 2025-10-30
**Version:** 2.0.0
**Architecture:** SOLID Principles + Clean Architecture
