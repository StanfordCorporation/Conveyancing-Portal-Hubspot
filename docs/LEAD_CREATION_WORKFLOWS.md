# Lead Creation Workflows - HubSpot API Call Locations

This document identifies the two main lead creation workflows and where they call the HubSpot API, so you know where to add properties.

## Overview

There are **two main lead creation workflows**:

1. **Disclosure Page Creation Workflow** - Client-initiated disclosure form submission
2. **Agent Lead Creation Workflow** - Agent-initiated lead creation from agent portal

---

## 1. Disclosure Page Creation Workflow

**File:** `backend/src/services/workflows/client-disclosure.js`  
**Entry Point:** `processClientDisclosure()`  
**Route:** `POST /api/workflows/client-disclosure`

### HubSpot API Calls:

#### Step 1: Find/Create Primary Seller Contact
- **Function:** `searchContactByEmailOrPhone()` → `findOrCreateContact()`
- **Location:** `backend/src/integrations/hubspot/contacts.js`
- **API Calls:**
  - `POST /crm/v3/objects/contacts/search` - Search by email or phone
  - `POST /crm/v3/objects/contacts` - Create contact if not found
- **Properties Set:** `email`, `firstname`, `lastname`, `phone`, `address`, `contact_type: 'Client'`
- **Line:** `client-disclosure.js:50-70`

#### Step 2: Find/Create Additional Sellers
- **Function:** `searchContactByEmailOrPhone()` → `findOrCreateContact()`
- **Location:** `backend/src/integrations/hubspot/contacts.js`
- **API Calls:**
  - `POST /crm/v3/objects/contacts/search` - Search by email or phone (for each seller)
  - `POST /crm/v3/objects/contacts` - Create contact if not found
- **Properties Set:** `email`, `firstname`, `lastname`, `phone`, `address`, `contact_type: 'Client'`
- **Line:** `client-disclosure.js:78-105`

#### Step 3: Find/Create Agency (Company)
- **Function:** `searchCompaniesByNameAndEmail()` → `searchCompaniesByName()` → `createCompany()`
- **Location:** `backend/src/integrations/hubspot/companies.js`
- **API Calls:**
  - `POST /crm/v3/objects/companies/search` - Search by name and email
  - `POST /crm/v3/objects/companies/search` - Search by name only (fallback)
  - `POST /crm/v3/objects/companies` - Create company if not found
- **Properties Set:** `name`, `email`, `address`
- **Line:** `client-disclosure.js:110-141`

#### Step 4: Find/Create Listing Salesperson (Agent)
- **Function:** `searchContactByEmailOrPhone()` → `findOrCreateContact()`
- **Location:** `backend/src/integrations/hubspot/contacts.js`
- **API Calls:**
  - `POST /crm/v3/objects/contacts/search` - Search by email or phone
  - `POST /crm/v3/objects/contacts` - Create contact if not found
- **Properties Set:** `email`, `firstname`, `lastname`, `phone`, `contact_type: 'Agent'`
- **Line:** `client-disclosure.js:146-167`

#### Step 5: Associate Agent to Agency
- **Direct API Call:** `hubspotClient.put()`
- **API Call:**
  - `PUT /crm/v3/objects/contact/{agentId}/associations/company/{agencyId}/1`
- **Line:** `client-disclosure.js:176`

#### Step 6: Create Deal with Associations
- **Function:** `createDealWithAssociations()` → `createDeal()`
- **Location:** `backend/src/integrations/hubspot/deals.js`
- **API Call:**
  - `POST /crm/v3/objects/deals` - Create deal with inline associations
- **Properties Set:** 
  - `dealname`, `dealstage`, `pipeline`, `property_address`, `transaction_type`, `number_of_owners`, `lead_source: 'Disclosure_Page'`
  - Plus all disclosure fields initialized via `initializeDisclosureFields()`
- **Line:** `client-disclosure.js:187-239`

#### Step 6B: Add Custom Association Labels
- **Direct API Calls:** `hubspotClient.put()`
- **API Calls:**
  - `PUT /crm/v4/objects/deal/{dealId}/associations/contact/{primarySellerId}` - Label as Primary Seller (type 1)
  - `PUT /crm/v4/objects/deal/{dealId}/associations/contact/{agentId}` - Label as Agent (type 6)
  - `PUT /crm/v4/objects/deal/{dealId}/associations/contact/{additionalSellerId}` - Label as Additional Seller (type 4, for each)
- **Line:** `client-disclosure.js:244-283`

---

## 2. Agent Lead Creation Workflow

**File:** `backend/src/services/workflows/agent-lead-creation.js`  
**Entry Point:** `processAgentLeadCreation()`  
**Route:** `POST /api/agent/leads/create` (protected by `agentAuth` middleware)

### HubSpot API Calls:

#### Step 1: Find/Create Primary Seller Contact
- **Function:** `searchContactByEmailOrPhone()` → `findOrCreateContact()`
- **Location:** `backend/src/integrations/hubspot/contacts.js`
- **API Calls:**
  - `POST /crm/v3/objects/contacts/search` - Search by email or phone
  - `POST /crm/v3/objects/contacts` - Create contact if not found
- **Properties Set:** `email`, `firstname`, `lastname`, `phone`, `address`, `contact_type: 'Client'`
- **Line:** `agent-lead-creation.js:51-71`

#### Step 2: Find/Create Additional Sellers
- **Function:** `searchContactByEmailOrPhone()` → `findOrCreateContact()`
- **Location:** `backend/src/integrations/hubspot/contacts.js`
- **API Calls:**
  - `POST /crm/v3/objects/contacts/search` - Search by email or phone (for each seller)
  - `POST /crm/v3/objects/contacts` - Create contact if not found
- **Properties Set:** `email`, `firstname`, `lastname`, `phone`, `address`, `contact_type: 'Client'`
- **Line:** `agent-lead-creation.js:82-110`

#### Step 3: Get Agent's Agency
- **Direct API Call:** `hubspotClient.get()`
- **API Call:**
  - `GET /crm/v3/objects/contacts/{agentId}/associations/company` - Get agent's associated agency
- **Line:** `agent-lead-creation.js:119-131`

#### Step 4: Create Deal with Associations
- **Function:** `createDealWithAssociations()` → `createDeal()`
- **Location:** `backend/src/integrations/hubspot/deals.js`
- **API Call:**
  - `POST /crm/v3/objects/deals` - Create deal with inline associations
- **Properties Set:**
  - `dealname`, `dealstage`, `pipeline`, `property_address`, `number_of_owners`, `lead_source: 'Agent_Portal'`
  - `is_draft`, `agent_title_search`, `agent_title_search_file`
  - Plus transformed questionnaire data (if provided)
- **Line:** `agent-lead-creation.js:159-217`

#### Step 4B: Add Custom Association Labels
- **Direct API Calls:** `hubspotClient.put()`
- **API Calls:**
  - `PUT /crm/v4/objects/deal/{dealId}/associations/contact/{primarySellerId}` - Label as Primary Seller (type 1)
  - `PUT /crm/v4/objects/deal/{dealId}/associations/contact/{agentId}` - Label as Agent (type 6)
  - `PUT /crm/v4/objects/deal/{dealId}/associations/contact/{additionalSellerId}` - Label as Additional Seller (type 4, for each)
- **Line:** `agent-lead-creation.js:224-263`

---

## Detailed HubSpot API Call Flow

This section documents the exact HubSpot API endpoints, HTTP methods, and payloads used by each workflow.

### Contact Creation API Calls

#### Search Contact by Email
- **Endpoint:** `GET /crm/v3/objects/contacts/{email}`
- **Method:** GET
- **Query Parameters:**
  ```javascript
  {
    properties: 'firstname,lastname,email,phone,address,contact_type',
    idProperty: 'email'
  }
  ```
- **Response:** Contact object with properties, or 404 if not found
- **Used by:** `findOrCreateContact()` → `searchContactByEmail()`

#### Search Contact by Email or Phone
- **Endpoint:** `POST /crm/v3/objects/contacts/search`
- **Method:** POST
- **Request Body:**
  ```javascript
  {
    filterGroups: [
      {
        filters: [
          {
            propertyName: 'email',
            operator: 'EQ',
            value: 'user@example.com'
          }
        ]
      },
      {
        filters: [
          {
            propertyName: 'phone',
            operator: 'EQ',
            value: '+61400000000'
          }
        ]
      }
    ],
    limit: 10,
    properties: ['firstname', 'lastname', 'email', 'phone', 'address', 'contact_type']
  }
  ```
- **Response:** `{ results: [contact1, contact2, ...] }`
- **Used by:** `searchContactByEmailOrPhone()` - Returns first matching contact

#### Create Contact
- **Endpoint:** `POST /crm/v3/objects/contacts`
- **Method:** POST
- **Request Body:**
  ```javascript
  {
    properties: {
      email: 'user@example.com',
      firstname: 'John',
      lastname: 'Doe',
      phone: '+61400000000',  // Normalized to international format
      address: '123 Main St',
      contact_type: 'Client'  // or 'Agent'
    },
    associations: [  // Optional: inline association to company
      {
        to: { id: 'companyId123' },
        types: [{
          associationCategory: 'HUBSPOT_DEFINED',
          associationTypeId: 279  // Standard association (or 7 for Admin)
        }]
      }
    ]
  }
  ```
- **Response:** `{ id: 'contactId123', properties: {...} }`
- **Used by:** `createContact()` - Creates new contact, optionally associates to company inline

### Company Creation API Calls

#### Search Company by Name
- **Endpoint:** `POST /crm/v3/objects/companies/search`
- **Method:** POST
- **Request Body:**
  ```javascript
  {
    filterGroups: [
      {
        filters: [
          {
            propertyName: 'name',
            operator: 'CONTAINS_TOKEN',
            value: 'Ray White'
          }
        ]
      }
    ],
    properties: ['name', 'address', 'email', 'phone'],
    limit: 10
  }
  ```
- **Response:** `{ results: [company1, company2, ...] }`
- **Used by:** `searchCompaniesByName()`

#### Search Company by Name and Email
- **Endpoint:** `POST /crm/v3/objects/companies/search`
- **Method:** POST
- **Request Body:**
  ```javascript
  {
    filterGroups: [
      {
        filters: [
          {
            propertyName: 'name',
            operator: 'CONTAINS_TOKEN',
            value: 'Ray White'
          }
        ]
      },
      {
        filters: [
          {
            propertyName: 'email',
            operator: 'EQ',
            value: 'info@raywhite.com'
          }
        ]
      }
    ],
    properties: ['name', 'address', 'email', 'phone'],
    limit: 10
  }
  ```
- **Response:** `{ results: [company1, company2, ...] }`
- **Used by:** `searchCompaniesByNameAndEmail()` - Uses OR logic between filter groups

#### Create Company
- **Endpoint:** `POST /crm/v3/objects/companies`
- **Method:** POST
- **Request Body:**
  ```javascript
  {
    properties: {
      name: 'Ray White Brisbane',
      address: '123 Main St',
      email: 'info@raywhite.com',
      phone: '+61400000000'  // Normalized to international format
    },
    associations: [  // Optional: inline association to contact
      {
        to: { id: 'contactId123' },
        types: [{
          associationCategory: 'HUBSPOT_DEFINED',
          associationTypeId: 280  // Company to Contact
        }]
      }
    ]
  }
  ```
- **Response:** `{ id: 'companyId123', properties: {...} }`
- **Used by:** `createCompany()` - Creates new company, optionally associates to contact inline

### Deal Creation API Calls

#### Create Deal with Associations
- **Endpoint:** `POST /crm/v3/objects/deals`
- **Method:** POST
- **Request Body:**
  ```javascript
  {
    properties: {
      dealname: '123 Main St - John Doe',
      dealstage: '1923713518',  // First stage ID
      pipeline: 'default',  // Form 2s pipeline (from HUBSPOT.PIPELINES.FORM_2S)
      property_address: '123 Main St',
      number_of_owners: '1',
      lead_source: 'Disclosure_Page',  // or 'Agent_Portal'
      is_draft: null,  // or 'Yes' for drafts
      agent_title_search: null,
      agent_title_search_file: null,
      // All disclosure/questionnaire fields...
      body_corporate: '',
      registered_encumbrances: '',
      // ... (see deals.js for full list)
    },
    associations: [  // Only HUBSPOT_DEFINED associations allowed during creation
      {
        to: { id: 'contactId123' },
        types: [{
          associationCategory: 'HUBSPOT_DEFINED',
          associationTypeId: 3  // Deal to Contact
        }]
      },
      {
        to: { id: 'companyId123' },
        types: [{
          associationCategory: 'HUBSPOT_DEFINED',
          associationTypeId: 341  // Deal to Company
        }]
      }
    ]
  }
  ```
- **Response:** `{ id: 'dealId123', properties: {...} }`
- **Used by:** `createDeal()` → `createDealWithAssociations()`
- **Note:** USER_DEFINED associations are added separately after deal creation

#### Add Custom Association Labels (USER_DEFINED)
- **Endpoint:** `PUT /crm/v4/objects/deal/{dealId}/associations/contact/{contactId}`
- **Method:** PUT
- **Request Body:**
  ```javascript
  [
    {
      associationCategory: 'USER_DEFINED',
      associationTypeId: 1  // Primary Seller (or 4 for Additional Seller, 6 for Agent)
    }
  ]
  ```
- **Response:** Association created
- **Used by:** Both workflows after deal creation to label contact roles
- **Association Types:**
  - Type 1: Primary Seller
  - Type 4: Additional Seller
  - Type 6: Agent

#### Associate Agent to Agency
- **Endpoint:** `PUT /crm/v3/objects/contact/{agentId}/associations/company/{agencyId}/1`
- **Method:** PUT
- **Request Body:** `{}`
- **Response:** Association created
- **Used by:** Disclosure workflow (Step 5) to link agent to their agency

#### Get Agent's Agency Association
- **Endpoint:** `GET /crm/v3/objects/contacts/{agentId}/associations/company`
- **Method:** GET
- **Response:** `{ results: [{ id: 'companyId123', type: '...' }] }`
- **Used by:** Agent Lead Creation workflow (Step 3) to find agent's agency

---

## Workflow Execution Flow

### Disclosure Page Creation Workflow Flow

```
1. POST /crm/v3/objects/contacts/search
   └─ Search for primary seller by email/phone
   └─ If found → use existing contact
   └─ If not found → continue to step 2

2. POST /crm/v3/objects/contacts
   └─ Create primary seller contact
   └─ Properties: email, firstname, lastname, phone, address, contact_type='Client'

3. POST /crm/v3/objects/contacts/search (for each additional seller)
   └─ Search for additional seller by email/phone
   └─ If found → use existing contact
   └─ If not found → POST /crm/v3/objects/contacts (create)

4. POST /crm/v3/objects/companies/search
   └─ Search for agency by name AND email (OR logic)
   └─ If found → use existing company
   └─ If not found → POST /crm/v3/objects/companies/search (by name only)
   └─ If still not found → POST /crm/v3/objects/companies (create)

5. POST /crm/v3/objects/contacts/search
   └─ Search for agent by email/phone
   └─ If found → use existing contact
   └─ If not found → POST /crm/v3/objects/contacts (create with contact_type='Agent')

6. PUT /crm/v3/objects/contact/{agentId}/associations/company/{agencyId}/1
   └─ Associate agent to agency

7. POST /crm/v3/objects/deals
   └─ Create deal with inline HUBSPOT_DEFINED associations:
      • Primary seller (type 3: Deal to Contact)
      • Agency (type 341: Deal to Company)
      • Agent (type 3: Deal to Contact)
      • Additional sellers (type 3: Deal to Contact, for each)
   └─ Properties: dealname, dealstage, pipeline, property_address, 
                   transaction_type, number_of_owners, lead_source='Disclosure_Page',
                   plus all disclosure fields

8. PUT /crm/v4/objects/deal/{dealId}/associations/contact/{primarySellerId}
   └─ Label primary seller (USER_DEFINED type 1)

9. PUT /crm/v4/objects/deal/{dealId}/associations/contact/{agentId}
   └─ Label agent (USER_DEFINED type 6)

10. PUT /crm/v4/objects/deal/{dealId}/associations/contact/{additionalSellerId} (for each)
    └─ Label additional seller (USER_DEFINED type 4)
```

### Agent Lead Creation Workflow Flow

```
1. POST /crm/v3/objects/contacts/search
   └─ Search for primary seller by email/phone
   └─ If found → use existing contact
   └─ If not found → continue to step 2

2. POST /crm/v3/objects/contacts
   └─ Create primary seller contact
   └─ Properties: email, firstname, lastname, phone, address, contact_type='Client'

3. POST /crm/v3/objects/contacts/search (for each additional seller)
   └─ Search for additional seller by email/phone
   └─ If found → use existing contact
   └─ If not found → POST /crm/v3/objects/contacts (create)

4. GET /crm/v3/objects/contacts/{agentId}/associations/company
   └─ Get agent's associated agency
   └─ Extract agencyId from results[0].id

5. POST /crm/v3/objects/deals
   └─ Create deal with inline HUBSPOT_DEFINED associations:
      • Primary seller (type 3: Deal to Contact)
      • Agent (type 3: Deal to Contact)
      • Agency (type 341: Deal to Company, if found)
      • Additional sellers (type 3: Deal to Contact, for each)
   └─ Properties: dealname, dealstage, pipeline, property_address,
                   number_of_owners, lead_source='Agent_Portal',
                   is_draft, agent_title_search, agent_title_search_file,
                   plus transformed questionnaire data

6. PUT /crm/v4/objects/deal/{dealId}/associations/contact/{primarySellerId}
   └─ Label primary seller (USER_DEFINED type 1)

7. PUT /crm/v4/objects/deal/{dealId}/associations/contact/{agentId}
   └─ Label agent (USER_DEFINED type 6)

8. PUT /crm/v4/objects/deal/{dealId}/associations/contact/{additionalSellerId} (for each)
   └─ Label additional seller (USER_DEFINED type 4)
```

---

## Summary: Where to Add Properties

### For Contact Properties:
1. **`backend/src/integrations/hubspot/contacts.js`**
   - `createContact()` function (line 44-93)
   - `findOrCreateContact()` function (line 130-145)
   - Add properties to the `properties` object in the payload

### For Deal Properties:
1. **`backend/src/integrations/hubspot/deals.js`**
   - `createDeal()` function (line 9-132)
   - Add properties to the `properties` object in the payload (line 30-81)

### For Company Properties:
1. **`backend/src/integrations/hubspot/companies.js`**
   - `createCompany()` function (line 14-54)
   - Add properties to the `properties` object in the payload (line 22-27)

### Workflow-Specific Property Additions:

#### Disclosure Workflow:
- **Deal properties:** `client-disclosure.js:187-196` - Add to `dealData` object
- **Contact properties:** Already handled in integration functions
- **Company properties:** Already handled in integration functions

#### Agent Lead Creation:
- **Deal properties:** `agent-lead-creation.js:159-171` - Add to `dealData` object
- **Contact properties:** Already handled in integration functions

---

## Key Integration Files

All HubSpot API calls go through these integration files:

1. **`backend/src/integrations/hubspot/contacts.js`** - Contact operations
2. **`backend/src/integrations/hubspot/deals.js`** - Deal operations
3. **`backend/src/integrations/hubspot/companies.js`** - Company operations
4. **`backend/src/integrations/hubspot/client.js`** - HubSpot API client (used for direct API calls)

---

## Notes

- All workflows use the **Form 2s pipeline** (`HUBSPOT.PIPELINES.FORM_2S`)
- Deal stage defaults to `'1923713518'` (first stage)
- Association labels are added after deal creation using `PUT /crm/v4/objects/deal/{dealId}/associations/...`
- Custom association types:
  - Type 1: Primary Seller
  - Type 4: Additional Seller
  - Type 6: Agent
  - Type 341: Deal to Company
