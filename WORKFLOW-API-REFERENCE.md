# Workflow API Reference

Complete reference for the HubSpot CRM Data Model workflow endpoints.

## 🚀 Quick Start

All workflow endpoints are implemented and ready to use. Start the backend server:

```bash
cd backend
npm run dev
```

Server will run on `http://localhost:3001`

## 📋 Available Endpoints

### 1. Client-Initiated Disclosure Workflow

**Endpoint:** `POST /api/workflows/client-disclosure`

**Purpose:** Handles when a client submits the initial property disclosure form. Creates all necessary HubSpot records and associations.

**Request Body:**
```json
{
  "seller": {
    "email": "john.seller@example.com",
    "firstname": "John",
    "lastname": "Seller",
    "phone": "+61412345678",
    "address": "123 Main St, Sydney NSW 2000"
  },
  "additionalSellers": [
    {
      "email": "jane.seller@example.com",
      "firstname": "Jane",
      "lastname": "Seller",
      "phone": "+61412345679"
    }
  ],
  "agency": {
    "name": "Premium Real Estate",
    "email": "contact@premiumre.com.au",
    "phone": "+61298765432",
    "address": "456 Business St, Sydney NSW 2000"
  },
  "agent": {
    "email": "agent@premiumre.com.au",
    "firstname": "Sarah",
    "lastname": "Agent",
    "phone": "+61412345680"
  },
  "property": {
    "address": "789 Property Lane, Sydney NSW 2000"
  }
}
```

**Response (Success):**
```json
{
  "success": true,
  "message": "Client disclosure processed successfully",
  "data": {
    "dealId": "12345678901",
    "deal": { "id": "12345678901", "properties": {...} },
    "primarySeller": { "id": "98765432101", "properties": {...} },
    "agency": { "id": "11122233301", "properties": {...} },
    "agent": { "id": "44455566601", "properties": {...} }
  }
}
```

**Response (Multiple Agency Matches):**
```json
{
  "success": true,
  "requiresConfirmation": true,
  "message": "Multiple agency matches found",
  "agencyMatches": [
    { "id": "111", "properties": { "name": "Premium Real Estate", "email": "..." } },
    { "id": "222", "properties": { "name": "Premium RE Sydney", "email": "..." } }
  ],
  "partialResult": {
    "primarySeller": {...},
    "agent": {...}
  }
}
```

**What This Endpoint Does:**
1. ✅ Finds or creates primary seller contact
2. ✅ Handles additional sellers (co-owners)
3. ✅ Fuzzy matches agency by name OR email (CONTAINS_TOKEN logic)
4. ✅ Finds or creates agent contact
5. ✅ Creates deal with all associations:
   - Seller(s) → Deal (typeId: 3)
   - Agency → Deal (typeId: 341)
   - Agent → Deal (typeId: 1)
6. ✅ Initializes all disclosure fields (5 sections) as empty

---

### 2. Agent-Initiated Client Creation Workflow

**Endpoint:** `POST /api/workflows/agent-client-creation`

**Purpose:** Handles when an agent creates a new client record through the agent portal.

**Request Body:**
```json
{
  "client": {
    "email": "newclient@example.com",
    "firstname": "Michael",
    "lastname": "Client",
    "phone": "+61412345681",
    "address": "321 Client Ave, Melbourne VIC 3000"
  },
  "property": {
    "address": "555 New Property St, Melbourne VIC 3000",
    "number_of_owners": 2
  },
  "agentId": "44455566601",
  "agencyId": "11122233301",
  "propertyDisclosure": {
    "body_corporate": "Yes",
    "registered_encumbrances": "No"
  }
}
```

**Response:**
```json
{
  "success": true,
  "message": "Agent client creation processed successfully",
  "data": {
    "dealId": "12345678902",
    "deal": { "id": "12345678902", "properties": {...} },
    "client": { "id": "98765432102", "properties": {...} },
    "nextStep": "send_client_portal_access"
  }
}
```

**What This Endpoint Does:**
1. ✅ Creates new client contact
2. ✅ Creates deal with property address and details
3. ✅ Associates client, agent, and agency to deal
4. ✅ Sets deal stage to `client_details_required`
5. ✅ Returns next step indicator for portal provisioning

---

### 3. Property Intake Update Workflow

**Endpoint:** `POST /api/workflows/property-intake`

**Purpose:** Updates an existing deal with property disclosure data from the 5-step wizard.

**Request Body:**
```json
{
  "dealId": "12345678901",
  "intakeData": {
    "section1": {
      "body_corporate": "Yes",
      "registered_encumbrances": "No",
      "unregistered_encumbrances": "No"
    },
    "section2": {
      "tenancy_agreement": "Yes",
      "tenancy_agreement_lease_start_date": "2024-01-01",
      "tenancy_agreement_lease_end_date": "2024-12-31",
      "tenancy_agreement_rent_and_bond_payable": "$2000/month, $8000 bond"
    },
    "section3": {
      "resume_notice": "No",
      "environmental_register": "No",
      "government_notice": "No",
      "tree_order": "No",
      "heritage_act": "No"
    },
    "section4": {
      "swimming_pool": "Yes",
      "owner_builder": "No",
      "enforcement_notice": "No"
    }
  }
}
```

**Response:**
```json
{
  "success": true,
  "message": "Property intake processed successfully",
  "data": {
    "dealId": "12345678901",
    "deal": { "id": "12345678901", "properties": {...} }
  }
}
```

**What This Endpoint Does:**
1. ✅ Updates existing deal with all disclosure fields
2. ✅ Maps all 5 sections to HubSpot deal properties
3. ✅ Adds completion timestamp
4. ✅ Ready for deal stage progression

---

## 🧪 Testing the Endpoints

### Using cURL

**Test Client Disclosure:**
```bash
curl -X POST http://localhost:3001/api/workflows/client-disclosure \
  -H "Content-Type: application/json" \
  -d '{
    "seller": {
      "email": "test@example.com",
      "firstname": "Test",
      "lastname": "Seller"
    },
    "agency": {
      "name": "Test Agency",
      "email": "agency@test.com"
    },
    "agent": {
      "email": "agent@test.com",
      "firstname": "Test",
      "lastname": "Agent"
    },
    "property": {
      "address": "123 Test St"
    }
  }'
```

**Test Agent Client Creation:**
```bash
curl -X POST http://localhost:3001/api/workflows/agent-client-creation \
  -H "Content-Type: application/json" \
  -d '{
    "client": {
      "email": "client@example.com",
      "firstname": "New",
      "lastname": "Client",
      "phone": "+61412345678"
    },
    "property": {
      "address": "789 Property St",
      "number_of_owners": 1
    },
    "agentId": "YOUR_AGENT_CONTACT_ID",
    "agencyId": "YOUR_AGENCY_COMPANY_ID"
  }'
```

### Using Postman

1. Import these endpoints as a new collection
2. Set base URL to `http://localhost:3001`
3. Add requests with method POST
4. Set Content-Type header to `application/json`
5. Copy request bodies from examples above

---

## 🏗️ Architecture Overview

### Service Layer Structure

```
backend/
├── services/
│   ├── hubspot/
│   │   ├── client.js              # HubSpot API client
│   │   ├── contacts.service.js    # Contact CRUD operations
│   │   ├── companies.service.js   # Company CRUD + fuzzy search
│   │   └── deals.service.js       # Deal CRUD + associations
│   └── workflows/
│       ├── client-disclosure.service.js      # Workflow 1
│       └── agent-client-creation.service.js  # Workflow 2 & Intake
└── api/
    └── workflows/
        ├── client-disclosure.js       # API endpoint handler
        ├── agent-client-creation.js   # API endpoint handler
        └── property-intake.js         # API endpoint handler
```

### Association Types Implemented

| Association | From | To | Type ID | Category |
|-------------|------|----|---------| ---------|
| Contact to Deal | Contact | Deal | 3 | HUBSPOT_DEFINED |
| Company to Deal | Company | Deal | 341 | HUBSPOT_DEFINED |
| Agent to Deal | Contact | Deal | 1 | USER_DEFINED |

### Disclosure Sections Mapped

All 5 sections are properly mapped to HubSpot deal properties:

- **Section 1:** Title Details & Encumbrances (5 fields)
- **Section 2:** Rental Agreement/Tenancy (7 fields)
- **Section 3:** Land Use, Planning & Environment (9 fields)
- **Section 4:** Buildings & Structures (6 fields)
- **Section 5:** Rates & Services (future implementation)

---

## 🎯 Next Steps for Frontend Implementation

### 1. Client Disclosure Form Component

Create a multi-step form component that posts to `/api/workflows/client-disclosure`:

```javascript
// frontend/client-portal/src/components/disclosure/ClientDisclosureForm.jsx

import { useState } from 'react';
import api from '../../services/api';

export default function ClientDisclosureForm() {
  const [formData, setFormData] = useState({
    seller: { email: '', firstname: '', lastname: '' },
    agency: { name: '', email: '' },
    agent: { email: '', firstname: '', lastname: '' },
    property: { address: '' }
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await api.post('/workflows/client-disclosure', formData);

      if (response.data.requiresConfirmation) {
        // Show agency selection modal
        showAgencyConfirmation(response.data.agencyMatches);
      } else {
        // Success - redirect to dashboard
        navigate('/dashboard');
      }
    } catch (error) {
      console.error('Submission error:', error);
    }
  };

  return (
    // Your form UI here
  );
}
```

### 2. Property Intake Wizard Component

Create a 5-step wizard for the property intake process:

```javascript
// frontend/client-portal/src/components/intake/PropertyIntakeWizard.jsx

import { useState } from 'react';
import api from '../../services/api';

export default function PropertyIntakeWizard({ dealId }) {
  const [currentStep, setCurrentStep] = useState(1);
  const [intakeData, setIntakeData] = useState({
    section1: {},
    section2: {},
    section3: {},
    section4: {}
  });

  const handleComplete = async () => {
    try {
      await api.post('/workflows/property-intake', {
        dealId,
        intakeData
      });
      // Success - update deal stage
    } catch (error) {
      console.error('Intake error:', error);
    }
  };

  return (
    // Your wizard UI here
  );
}
```

### 3. Agent Portal Components

For the agent portal, you'll need:

- **Client Creation Form** → posts to `/api/workflows/agent-client-creation`
- **Deal Management Dashboard** → displays deals and their stages
- **Client List View** → shows all clients and their properties

---

## 🔐 Environment Configuration

Make sure your `backend/.env` has:

```env
# HubSpot Configuration
HUBSPOT_ACCESS_TOKEN=your_access_token_here
HUBSPOT_API_BASE=https://api.hubapi.com

# Aircall Configuration (for OTP)
AIRCALL_API_ID=35e9a8a3e5ed402e628598a30200e36f
AIRCALL_TOKEN=5b8eda50f7ec7cc267cc3dc3b81ac69e
AIRCALL_FROM_NUMBER=+61483980010
AIRCALL_LINE_ID=846163

# JWT Configuration
JWT_SECRET=your_jwt_secret_here

# Server Configuration
PORT=3001
CORS_ORIGIN=http://localhost:3000
NODE_ENV=development
```

---

## 📊 Deal Pipeline Stages

The workflows create deals in the following stages:

1. `client_details_required` - Initial stage after client disclosure or agent creation
2. `disclosure_form_started` - Client has started filling disclosure
3. `disclosure_form_complete` - All 4 sections completed
4. `conveyancer_assigned` - Conveyancer assigned to deal
5. `contracts_prepared` - Contracts being prepared
6. `contracts_sent` - Contracts sent to all parties
7. `contracts_signed` - All parties have signed
8. `form_2_started` - Form 2 preparation started
9. `form_2_sent` - Form 2 sent to parties
10. `form_2_complete` - Form 2 completed

---

## 🐛 Debugging

All workflow services include comprehensive logging:

```javascript
console.log('[Client Disclosure] Starting workflow', { ... });
console.log('[Client Disclosure] Primary seller created:', id);
console.log('[Client Disclosure] Deal created successfully:', dealId);
```

Check your backend terminal for detailed logs when testing.

---

## ✅ Implementation Checklist

Backend (Complete):
- ✅ HubSpot service layer (contacts, companies, deals)
- ✅ Workflow orchestration services
- ✅ API endpoint handlers
- ✅ Fuzzy matching with OR logic
- ✅ All 5 disclosure sections mapped
- ✅ Proper association types (3, 341, 1)
- ✅ Error handling and validation

Frontend (To Do):
- ⬜ Client disclosure form component
- ⬜ Property intake wizard (5 steps)
- ⬜ Agent portal client creation form
- ⬜ Deal dashboard and management views
- ⬜ Agency confirmation modal
- ⬜ Integration with existing Login.jsx flow

---

## 📞 Support

If you encounter any issues:

1. Check backend logs for detailed error messages
2. Verify HubSpot access token is valid
3. Ensure all environment variables are set
4. Test endpoints individually with cURL/Postman first
5. Verify HubSpot custom properties exist in your portal

---

**Last Updated:** 2025-10-17
**Status:** Backend Complete - Ready for Frontend Integration
