# Database Overview

## Architecture Context

The Conveyancing Portal uses **HubSpot CRM** as its primary database, replacing the legacy MySQL database that consisted of 15 custom tables. This transition represents a complete architectural overhaul from a traditional relational database to a cloud-native CRM platform.

### Migration from Legacy System

**Previous Architecture:**
- PHP/WordPress backend with MySQL database
- 15 custom database tables (wp_agent_leads, wp_client_users, etc.)
- Manual data synchronization between systems
- Complex relationships and maintenance overhead

**Current Architecture:**
- HubSpot CRM as primary data layer
- API-first approach via HubSpot REST APIs
- Native CRM functionality with built-in reporting
- Enterprise-grade infrastructure with automated backups

---

## HubSpot Object Model

The portal utilizes three primary HubSpot CRM objects with defined associations:

### 1. Deals (Transaction Records)

**API Endpoint:** `POST https://api.hubapi.com/crm/v3/objects/deals`

Deals represent individual conveyancing transactions and serve as the central entity linking sellers, agents, and property information.

#### Core Properties

| Property | Type | Description |
|----------|------|-------------|
| `id` | String | HubSpot-generated unique identifier |
| `dealname` | String | Primary seller name |
| `dealstage` | String | Current pipeline stage (see Pipeline Stages) |
| `pipeline` | String | Pipeline identifier (default: "default") |
| `property_address` | String | Full property address |
| `number_of_owners` | Number | Count of property owners |

#### Section 1: Title Details & Encumbrances

| Property | Type | Description | Status |
|----------|------|-------------|--------|
| `body_corporate` | Boolean/String | Body corporate status verification | ✓ |
| `registered_encumbrances` | Boolean/String | Statutory encumbrances status | ✓ |
| `registered_encumbrance_details` | Text | Details of registered encumbrances | Needs Fix |
| `unregistered_encumbrances` | Boolean/String | Non-statutory encumbrances status | ✓ |
| `unregistered_encumbrance_details` | Text | Details of unregistered encumbrances | Needs Fix |

#### Section 2: Rental Agreement/Tenancy

| Property | Type | Description | Status |
|----------|------|-------------|--------|
| `tenancy_agreement` | Boolean/String | Residential tenancy agreement status | ✓ |
| `informal_rental` | Boolean/String | Informal rental arrangement disclosure | ✓ |
| `tenancy_agreement_last_rental_increase` | Date | Last rental rate increase date | Needs Fix |
| `tenancy_agreement_lease_start_date` | Date | Lease term start date | Needs Fix |
| `tenancy_agreement_lease_end_date` | Date | Lease term end date | Needs Fix |
| `tenancy_agreement_rent_and_bond_payable` | String | Rental rates and bond amounts | Needs Fix |
| `tenancy_agreement_upload` | File | Tenancy agreement document (public portal access) | ✓ |

#### Section 3: Land Use, Planning & Environment

| Property | Type | Description | Status |
|----------|------|-------------|--------|
| `resume_notice` | Boolean/String | Resume notices for infrastructure projects | ✓ |
| `environmental_register` | Boolean/String | Environmental register listing status | ✓ |
| `environmental_register_details` | Text | Details of environmental concerns | Needs Fix |
| `government_notice` | Boolean/String | Government notice compliance status | ✓ |
| `government_notice_details` | Text | Details of government notices | Needs Fix |
| `tree_order` | Boolean/String | Tree preservation order status | ✓ |
| `tree_order_details` | Text | Details of tree preservation orders | Needs Fix |
| `heritage_act` | Boolean/String | Heritage protection status | ✓ |
| `heritage_act_details` | Text | Details of heritage listings | Needs Fix |

#### Section 4: Buildings & Structures

| Property | Type | Description | Status |
|----------|------|-------------|--------|
| `swimming_pool` | Boolean/String | Swimming pool/spa presence | ✓ |
| `owner_builder` | Boolean/String | Owner-builder work documentation | ✓ |
| `owner_builder_uploads` | File | Owner-builder certificates/documents (public portal access) | ✓ |
| `enforcement_notice` | Boolean/String | Council enforcement notice status | ✓ |
| `enforcement_notice_details` | Text | Details of enforcement notices | Needs Fix |
| `enforcement_notice_uploads` | File | Enforcement notice documents (public portal access) | ✓ |

#### Section 5: Rates & Services (Future Fields)

| Property | Type | Description | Status |
|----------|------|-------------|--------|
| `rates_services_upload` | File | Current rates notice documentation | Optional Future |
| `water_rates_upload` | File | Water notice documentation | Optional Future |

#### Deal Creation with Associations

```json
{
  "properties": {
    "dealname": "Association Test",
    "dealstage": "appointmentscheduled",
    "pipeline": "default"
  },
  "associations": [
    {
      "to": { "id": "Contact_id_Primary_seller" },
      "types": [
        {
          "associationCategory": "USER_DEFINED",
          "associationTypeId": 1
        }
      ]
    },
    {
      "to": { "id": "Contact_ID_Additional_seller" },
      "types": [
        {
          "associationCategory": "HUBSPOT_DEFINED",
          "associationTypeId": 3
        }
      ]
    },
    {
      "to": { "id": "Agency_Record_ID" },
      "types": [
        {
          "associationCategory": "HUBSPOT_DEFINED",
          "associationTypeId": 341
        }
      ]
    }
  ]
}
```

---

### 2. Companies (Agency Records)

**API Endpoint:** `POST https://api.hubapi.com/crm/v3/objects/companies`

Companies represent real estate agencies managing conveyancing transactions.

#### Properties

| Property | Type | Description | Required |
|----------|------|-------------|----------|
| `name` | String | Agency business name | Yes |
| `address` | String | Agency physical address | No |
| `email` | String | Agency contact email | Yes |
| `phone` | String | Agency phone number | No |

#### Example Request

```json
{
  "properties": {
    "name": "Test Agency 2",
    "address": "abced",
    "email": "er@er.com",
    "phone": "12230002"
  }
}
```

#### Company Resolution Logic

The system implements **fuzzy matching** to prevent duplicate agency records:

1. Query Companies API using business name and email
2. Present match confirmation to user interface
3. Handle agent contact association:
   - Search for existing agent contact within company
   - Create new agent contact if not found
   - Associate agent with both Company and Deal objects

---

### 3. Contacts (Sellers & Agents)

**API Endpoint:** `POST https://api.hubapi.com/crm/v3/objects/contacts`

Contacts represent individual people including property sellers and real estate agents.

#### Properties

| Property | Type | Description | Required |
|----------|------|-------------|----------|
| `id` | String | HubSpot-generated unique identifier | Auto |
| `firstname` | String | Contact first name | Yes |
| `lastname` | String | Contact last name | Yes |
| `email` | String | Contact email address | Yes |
| `phone` | String | Contact phone number | No |
| `address` | String | Residential address | No |
| `contact_type` | Enum | "Client" or "Agent" | Yes |

#### Example Request

```json
{
  "properties": {
    "firstname": "Brian",
    "lastname": "Halligan (Sample Contact)",
    "email": "bh1@hubspot.com",
    "address": "31 Jeffrey Avenue, Saint Clair New South Wales 2759",
    "phone": null,
    "contact_type": "Client"
  }
}
```

#### Contact Resolution Logic

The system prevents duplicate contact records through the following workflow:

1. **Query Phase:** Search HubSpot Contacts API using email address
2. **Matching Logic:**
   - If contact exists: Create new Deal and associate with existing Contact
   - If contact doesn't exist: Create new Contact and associated Deal
3. **Association Phase:** Link Contact to Deal using appropriate association type

#### Retrieving Contacts

**GET by Email (ID Property):**
```
GET /crm/v3/objects/contacts/:contactId?properties=firstname,lastname,address,phone&idProperty=email
```

---

## Object Relationships

### Association Types

| Association | Category | Type ID | Description |
|-------------|----------|---------|-------------|
| Deal → Primary Seller | USER_DEFINED | 1 | Primary property owner contact |
| Deal → Additional Seller | HUBSPOT_DEFINED | 3 | Secondary/co-owner contacts |
| Deal → Agency | HUBSPOT_DEFINED | 341 | Agency managing transaction |
| Company → Agent Contact | HUBSPOT_DEFINED | Default | Agent employed by agency |

### Entity Relationship Diagram

```
┌─────────────────┐
│    COMPANY      │
│   (Agency)      │
│                 │
│ • name          │
│ • address       │
│ • email         │
│ • phone         │
└────────┬────────┘
         │
         │ Associated With (341)
         │
         ▼
┌─────────────────┐         ┌─────────────────┐
│    CONTACT      │         │      DEAL       │
│  (Seller/Agent) │◄────────┤  (Transaction)  │
│                 │         │                 │
│ • firstname     │         │ • dealname      │
│ • lastname      │  (1,3)  │ • dealstage     │
│ • email         │         │ • property_*    │
│ • phone         │         │ • section_1-5_* │
│ • address       │         │                 │
│ • contact_type  │         │                 │
└─────────────────┘         └─────────────────┘
```

---

## Deal Pipeline Stages

Deals progress through a standardized 10-stage pipeline tracking the conveyancing lifecycle:

| Stage # | Stage Name | Description |
|---------|------------|-------------|
| 1 | Client Details Required | Initial lead creation stage |
| 2 | Client Portal Sent | Portal access provisioned to client |
| 3 | Searches Quote Provided | Cost estimate generated and presented |
| 4 | Awaiting Signed Retainer | Legal agreement pending signature |
| 5 | Searches Funds Requested | Payment instructions provided |
| 6 | Funds Provided | Payment received and confirmed |
| 7 | Searches Returned | Search results delivered to client |
| 8 | Form 2 with Client | Final documentation stage |
| 9 | Form 2 Complete (Closed/Won) | Successful transaction completion |
| 10 | Closed/Lost | Unsuccessful transaction termination |

### Stage Progression Triggers

- **Stage 1 → 2:** Deal created via client disclosure form or agent portal
- **Stage 2 → 3:** Client completes initial portal registration
- **Stage 3 → 4:** Quote accepted by client
- **Stage 4 → 5:** Retainer agreement signed (DocuSign integration)
- **Stage 5 → 6:** Payment instructions delivered
- **Stage 6 → 7:** Payment confirmed and reconciled
- **Stage 7 → 8:** Search results uploaded and shared
- **Stage 8 → 9:** Form 2 completed and submitted
- **Stage 9 or 10:** Final transaction outcome recorded

---

## Data Synchronization

### Cross-Portal Synchronization

The portal implements **real-time bi-directional synchronization** between agent and client portals:

- **Property Disclosure Data:** All 5 sections sync automatically between portals
- **Conditional Field States:** Dynamic form logic preserved across sessions
- **File Attachments:** Documents uploaded in agent portal visible in client portal
- **Progress Tracking:** Deal stage updates reflected immediately in both interfaces

### Session Management

- **Lead-Specific Isolation:** Session data segregated by Deal ID
- **Automatic Cleanup:** Cross-contaminated session data automatically cleared
- **Form State Persistence:** Partial completions saved during navigation
- **Multi-Section Validation:** Section-specific error handling and recovery

---

## File Management

### Supported File Types

- PDF documents
- JPG/JPEG images
- PNG images

### File Properties (Deal Object)

| Field | Public Portal Access | Description |
|-------|---------------------|-------------|
| `tenancy_agreement_upload` | Yes | Tenancy agreement documents |
| `owner_builder_uploads` | Yes | Owner-builder certificates |
| `enforcement_notice_uploads` | Yes | Enforcement notice documents |
| `rates_services_upload` | Yes (Future) | Rates notices |
| `water_rates_upload` | Yes (Future) | Water notices |

### File Storage Architecture

- **Storage Backend:** HubSpot file manager
- **Access Control:** Public portal access for designated fields
- **Size Validation:** Enforced at application layer
- **Type Verification:** MIME type checking before upload
- **Cross-Portal Visibility:** Agent-uploaded files accessible in client portal

---

## API Integration Patterns

### HubSpot API Endpoints

| API | Purpose | Methods |
|-----|---------|---------|
| Contacts API | Seller and agent contact management | GET, POST, PATCH |
| Companies API | Agency relationship management | GET, POST, PATCH |
| Deals API | Transaction lifecycle tracking | GET, POST, PATCH |
| Associations API | Linking contacts, companies, deals | POST, DELETE |

### Authentication

All API requests require HubSpot API key or OAuth token:

```
Authorization: Bearer {access_token}
```

### Error Handling

- **Duplicate Detection:** Fuzzy matching prevents duplicate records
- **Validation Errors:** Field-level validation before API submission
- **Rate Limiting:** Respect HubSpot API rate limits (10 requests/second)
- **Retry Logic:** Exponential backoff for transient failures

---

## Data Migration Considerations

### Legacy to HubSpot Mapping

| Legacy MySQL Table | HubSpot Object | Mapping Notes |
|-------------------|----------------|---------------|
| wp_agent_leads | Deals | Primary transaction record |
| wp_client_users | Contacts (contact_type: Client) | Seller information |
| wp_agents | Contacts (contact_type: Agent) | Agent information |
| wp_agencies | Companies | Agency business records |
| wp_property_details | Deal Properties | Embedded in Deal object |
| wp_disclosure_sections_1-5 | Deal Properties | Section-specific custom properties |
| wp_file_uploads | HubSpot File Manager | Files associated with Deal |

### Migration Benefits

1. **Simplified Schema:** 3 HubSpot objects vs. 15 MySQL tables
2. **Native Relationships:** Built-in association management
3. **Automated Backups:** Enterprise-grade data protection
4. **Audit Trails:** Native change tracking and history
5. **Reporting:** Built-in analytics and dashboards
6. **Scalability:** Cloud-native infrastructure

---

## Known Issues & Improvements Needed

### Fields Requiring Fixes

The following Deal properties are marked as "needs fix" in the current implementation:

**Section 1:**
- `registered_encumbrance_details`
- `unregistered_encumbrance_details`

**Section 2:**
- `tenancy_agreement_last_rental_increase`
- `tenancy_agreement_lease_start_date`
- `tenancy_agreement_lease_end_date`
- `tenancy_agreement_rent_and_bond_payable`

**Section 3:**
- `environmental_register_details`
- `government_notice_details`
- `tree_order_details`
- `heritage_act_details`

**Section 4:**
- `enforcement_notice_details`

### Recommended Improvements

1. **Data Type Standardization:** Ensure date fields use ISO 8601 format
2. **Validation Rules:** Implement server-side validation for all detail fields
3. **Conditional Logic:** Define clear show/hide rules for detail fields
4. **File Field Enhancement:** Complete implementation of Section 5 file uploads
5. **API Documentation:** Document all custom property field IDs and internal names

---

## Additional Resources

- [HubSpot CRM API Documentation](https://developers.hubspot.com/docs/api/crm/understanding-the-crm)
- [HubSpot Associations Guide](https://developers.hubspot.com/docs/api/crm/associations)
- [Project Overview](./Conveyancing%20Portal%20Hubspot%20-%20Project%20Overview.md)
