# Proper API Endpoints - Done Right

## What Changed

Replaced thin wrapper routers with **proper action handler endpoints** following your existing pattern (`client-disclosure.js`, `property-intake.js`, etc).

## New Real API Endpoints

All endpoints follow the same pattern as your existing `/api/workflows/*` endpoints.

### 1. Search Agencies
**POST** `/api/agencies/search`

**File:** `backend/api/agencies/search-agencies.js`

**Request:**
```json
{
  "businessName": "Stanford Legal",
  "suburb": "Toorak"
}
```

**Response:**
```json
{
  "success": true,
  "results": [
    {
      "id": "123",
      "name": "Stanford Legal - Toorak",
      "email": "info@stanford.com",
      "address": "Toorak",
      "phone": "03 9999 9999",
      "score": 0.95
    }
  ],
  "count": 1
}
```

### 2. Create Agency
**POST** `/api/agencies/create`

**File:** `backend/api/agencies/create-agency.js`

**Request:**
```json
{
  "name": "New Agency",
  "address": "Melbourne",
  "email": "info@newagency.com",
  "phone": "03 1234 5678",
  "agentFirstName": "John",
  "agentLastName": "Smith",
  "agentEmail": "john@newagency.com",
  "agentPhone": "0412 345 678"
}
```

**Response:**
```json
{
  "success": true,
  "id": "456",
  "name": "New Agency - Melbourne",
  "address": "Melbourne",
  "email": "info@newagency.com",
  "phone": "03 1234 5678",
  "score": 1.0,
  "agent": {
    "id": "789",
    "firstname": "John",
    "lastname": "Smith",
    "email": "john@newagency.com",
    "phone": "0412 345 678"
  }
}
```

### 3. Get Agents for Agency
**GET** `/api/agencies/:agencyId/agents`

**File:** `backend/api/agencies/get-agents.js`

**Request:**
```
GET /api/agencies/456/agents
```

**Response:**
```json
{
  "success": true,
  "agents": [
    {
      "id": "789",
      "firstname": "John",
      "lastname": "Smith",
      "email": "john@newagency.com",
      "phone": "0412 345 678",
      "contact_type": "Agent"
    }
  ]
}
```

### 4. Create Agent
**POST** `/api/agencies/:agencyId/agents/create`

**File:** `backend/api/agencies/create-agent.js`

**Request:**
```json
{
  "firstname": "Jane",
  "lastname": "Doe",
  "email": "jane@newagency.com",
  "phone": "0412 987 654"
}
```

**Response:**
```json
{
  "success": true,
  "id": "999",
  "firstname": "Jane",
  "lastname": "Doe",
  "email": "jane@newagency.com",
  "phone": "0412 987 654"
}
```

## File Structure

```
backend/api/agencies/
├── search-agencies.js      ← POST /api/agencies/search
├── create-agency.js        ← POST /api/agencies/create
├── get-agents.js           ← GET /api/agencies/:agencyId/agents
└── create-agent.js         ← POST /api/agencies/:agencyId/agents/create
```

## Pattern Followed

Each file follows your existing endpoint pattern:

1. ✅ Import service functions from `services/hubspot/`
2. ✅ Export default async handler function
3. ✅ CORS headers for frontend compatibility
4. ✅ OPTIONS method handling
5. ✅ Request validation with helpful error messages
6. ✅ Console logging with consistent formatting
7. ✅ Proper HTTP status codes
8. ✅ Structured JSON responses with `success` flag

## How It Works

### Frontend Flow

```javascript
// Search
const searchRes = await api.post('/api/agencies/search', {
  businessName: 'Stanford',
  suburb: 'Toorak'
});

// Create
const createRes = await api.post('/api/agencies/create', {
  name: 'New Agency',
  address: 'Melbourne',
  email: 'info@agency.com',
  agentFirstName: 'John',
  agentLastName: 'Smith',
  agentEmail: 'john@agency.com',
  agentPhone: '0412 345 678'
});

// Get Agents
const agentsRes = await api.get(`/api/agencies/${createRes.id}/agents`);

// Create Agent
const agentRes = await api.post(`/api/agencies/${createRes.id}/agents/create`, {
  firstname: 'Jane',
  lastname: 'Doe',
  email: 'jane@agency.com',
  phone: '0412 987 654'
});
```

### Backend Flow

Each endpoint:
1. Receives request in handler
2. Validates input
3. Calls appropriate service function from `services/hubspot/`
4. Returns structured JSON response
5. Logs with consistent format

## Service Functions Called

- **search-agencies.js** → `searchCompaniesByTokens(businessName, suburb)`
- **create-agency.js** → `createCompany(agencyData)` + `createContact(agentData)`
- **get-agents.js** → `searchContactsByCompany(agencyId)`
- **create-agent.js** → `createContact(agentData)`

## Endpoint Registration

All registered in `backend/server.js`:

```javascript
app.post('/api/agencies/search', searchAgenciesHandler);
app.post('/api/agencies/create', createAgencyHandler);
app.get('/api/agencies/:agencyId/agents', getAgentsHandler);
app.post('/api/agencies/:agencyId/agents/create', createAgentHandler);
```

## Error Handling

Each endpoint returns:
- **200** - Success with data
- **400** - Validation error (missing fields, invalid format)
- **405** - Method not allowed
- **500** - Server error

Example error response:
```json
{
  "error": "Validation error",
  "message": "Invalid email format"
}
```

## Key Features

✅ **Real API endpoints** - Not thin wrappers
✅ **Follows existing pattern** - Consistent with `/api/workflows/*`
✅ **Full validation** - Input and email format checks
✅ **Inline associations** - Agent created with company association in one call
✅ **Proper logging** - Consistent format across all endpoints
✅ **CORS enabled** - Works with frontend
✅ **Error handling** - Clear error messages
✅ **Structured responses** - Always `{ success, data }`

---

**Status:** ✅ Ready to use
**Date:** 2025-10-21
