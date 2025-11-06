# HubSpot API Reference Guide

**Version:** v3 (Current)
**Base URL:** `https://api.hubapi.com`
**Authentication:** Bearer token in header: `Authorization: Bearer YOUR_ACCESS_TOKEN`

---

## Table of Contents

1. [Deals API](#deals-api)
2. [Contacts API](#contacts-api)
3. [Companies API](#companies-api)
4. [Line Items API](#line-items-api)
5. [Associations API](#associations-api)
6. [Association Types](#association-types)
7. [Common Patterns](#common-patterns)
8. [Error Handling](#error-handling)

---

## Deals API

### Base Endpoint
`/crm/v3/objects/deals`

### Create a Deal
**POST** `/crm/v3/objects/deals`

```json
{
  "properties": {
    "dealname": "New Deal",
    "amount": "10000",
    "dealstage": "appointmentscheduled",
    "pipeline": "default",
    "closedate": "2025-12-31T23:59:59.000Z"
  },
  "associations": [
    {
      "to": {
        "id": 12345
      },
      "types": [
        {
          "associationCategory": "HUBSPOT_DEFINED",
          "associationTypeId": 3
        }
      ]
    }
  ]
}
```

**Response:** Returns created deal with `id` and all properties

### Get a Deal by ID
**GET** `/crm/v3/objects/deals/{dealId}`

**Query Parameters:**
- `properties` - Comma-separated list of properties to return
- `associations` - Comma-separated list of object types to retrieve associated IDs for

**Example:**
```
GET /crm/v3/objects/deals/123456?properties=dealname,amount&associations=contacts,companies
```

### Update a Deal
**PATCH** `/crm/v3/objects/deals/{dealId}`

```json
{
  "properties": {
    "dealname": "Updated Deal Name",
    "amount": "15000"
  }
}
```

### Delete a Deal
**DELETE** `/crm/v3/objects/deals/{dealId}`

### Get All Deals (List)
**GET** `/crm/v3/objects/deals`

**Query Parameters:**
- `limit` - Number of results per page (max 100)
- `after` - Cursor for pagination
- `properties` - Comma-separated properties to return
- `associations` - Comma-separated associations to include

### Batch Operations - Deals

#### Batch Create
**POST** `/crm/v3/objects/deals/batch/create`

```json
{
  "inputs": [
    {
      "properties": {
        "dealname": "Deal 1",
        "amount": "5000"
      }
    },
    {
      "properties": {
        "dealname": "Deal 2",
        "amount": "10000"
      }
    }
  ]
}
```

#### Batch Read
**POST** `/crm/v3/objects/deals/batch/read`

```json
{
  "properties": ["dealname", "amount"],
  "inputs": [
    {"id": "123"},
    {"id": "456"}
  ]
}
```

#### Batch Update
**POST** `/crm/v3/objects/deals/batch/update`

```json
{
  "inputs": [
    {
      "id": "123",
      "properties": {
        "dealname": "Updated Deal 1"
      }
    }
  ]
}
```

#### Batch Delete
**POST** `/crm/v3/objects/deals/batch/archive`

```json
{
  "inputs": [
    {"id": "123"},
    {"id": "456"}
  ]
}
```

### Search Deals
**POST** `/crm/v3/objects/deals/search`

```json
{
  "filterGroups": [
    {
      "filters": [
        {
          "propertyName": "amount",
          "operator": "GT",
          "value": "5000"
        },
        {
          "propertyName": "dealstage",
          "operator": "EQ",
          "value": "closedwon"
        }
      ]
    }
  ],
  "properties": ["dealname", "amount", "closedate"],
  "sorts": [
    {
      "propertyName": "amount",
      "direction": "DESCENDING"
    }
  ],
  "limit": 10,
  "after": 0
}
```

**Search Operators:**
- `EQ` - Equal to
- `NEQ` - Not equal to
- `LT` - Less than
- `LTE` - Less than or equal to
- `GT` - Greater than
- `GTE` - Greater than or equal to
- `CONTAINS_TOKEN` - Contains token
- `NOT_CONTAINS_TOKEN` - Doesn't contain token
- `IN` - In list
- `NOT_IN` - Not in list
- `HAS_PROPERTY` - Has property
- `NOT_HAS_PROPERTY` - Doesn't have property

---

## Contacts API

### Base Endpoint
`/crm/v3/objects/contacts`

### Create a Contact
**POST** `/crm/v3/objects/contacts`

```json
{
  "properties": {
    "email": "contact@example.com",
    "firstname": "John",
    "lastname": "Doe",
    "phone": "+1234567890",
    "company": "Example Company",
    "website": "example.com",
    "lifecyclestage": "lead"
  },
  "associations": [
    {
      "to": {
        "id": 789
      },
      "types": [
        {
          "associationCategory": "HUBSPOT_DEFINED",
          "associationTypeId": 1
        }
      ]
    }
  ]
}
```

### Get a Contact by ID
**GET** `/crm/v3/objects/contacts/{contactId}`

**Query Parameters:**
- `properties` - Comma-separated list of properties
- `associations` - Comma-separated associations (e.g., `companies,deals`)

### Get Contact by Email
**GET** `/crm/v3/objects/contacts/{email}?idProperty=email`

### Update a Contact
**PATCH** `/crm/v3/objects/contacts/{contactId}`

```json
{
  "properties": {
    "firstname": "Jane",
    "lastname": "Smith",
    "phone": "+0987654321"
  }
}
```

### Delete a Contact
**DELETE** `/crm/v3/objects/contacts/{contactId}`

### Get All Contacts (List)
**GET** `/crm/v3/objects/contacts`

**Query Parameters:**
- `limit` - Max 100
- `after` - Pagination cursor
- `properties` - Comma-separated properties
- `associations` - Comma-separated associations

### Batch Operations - Contacts

#### Batch Create
**POST** `/crm/v3/objects/contacts/batch/create`

```json
{
  "inputs": [
    {
      "properties": {
        "email": "contact1@example.com",
        "firstname": "John",
        "lastname": "Doe"
      }
    },
    {
      "properties": {
        "email": "contact2@example.com",
        "firstname": "Jane",
        "lastname": "Smith"
      }
    }
  ]
}
```

#### Batch Read
**POST** `/crm/v3/objects/contacts/batch/read`

```json
{
  "properties": ["email", "firstname", "lastname"],
  "inputs": [
    {"id": "101"},
    {"id": "102"}
  ]
}
```

#### Batch Update
**POST** `/crm/v3/objects/contacts/batch/update`

```json
{
  "inputs": [
    {
      "id": "101",
      "properties": {
        "lifecyclestage": "customer"
      }
    }
  ]
}
```

#### Batch Delete
**POST** `/crm/v3/objects/contacts/batch/archive`

```json
{
  "inputs": [
    {"id": "101"},
    {"id": "102"}
  ]
}
```

### Search Contacts
**POST** `/crm/v3/objects/contacts/search`

```json
{
  "filterGroups": [
    {
      "filters": [
        {
          "propertyName": "email",
          "operator": "CONTAINS_TOKEN",
          "value": "@example.com"
        }
      ]
    }
  ],
  "properties": ["email", "firstname", "lastname"],
  "limit": 10
}
```

---

## Companies API

### Base Endpoint
`/crm/v3/objects/companies`

### Create a Company
**POST** `/crm/v3/objects/companies`

```json
{
  "properties": {
    "name": "Example Company",
    "domain": "example.com",
    "city": "Brisbane",
    "state": "Queensland",
    "industry": "Technology",
    "phone": "+61123456789",
    "numberofemployees": "50",
    "annualrevenue": "1000000"
  },
  "associations": [
    {
      "to": {
        "id": 12345
      },
      "types": [
        {
          "associationCategory": "HUBSPOT_DEFINED",
          "associationTypeId": 2
        }
      ]
    }
  ]
}
```

### Get a Company by ID
**GET** `/crm/v3/objects/companies/{companyId}`

**Query Parameters:**
- `properties` - Comma-separated properties
- `associations` - Comma-separated associations

### Get Company by Domain
**GET** `/crm/v3/objects/companies/{domain}?idProperty=domain`

### Update a Company
**PATCH** `/crm/v3/objects/companies/{companyId}`

```json
{
  "properties": {
    "name": "Updated Company Name",
    "numberofemployees": "75"
  }
}
```

### Delete a Company
**DELETE** `/crm/v3/objects/companies/{companyId}`

### Get All Companies (List)
**GET** `/crm/v3/objects/companies`

**Query Parameters:**
- `limit` - Max 100
- `after` - Pagination cursor
- `properties` - Comma-separated properties
- `associations` - Comma-separated associations

### Batch Operations - Companies

#### Batch Create
**POST** `/crm/v3/objects/companies/batch/create`

```json
{
  "inputs": [
    {
      "properties": {
        "name": "Company 1",
        "domain": "company1.com"
      }
    },
    {
      "properties": {
        "name": "Company 2",
        "domain": "company2.com"
      }
    }
  ]
}
```

#### Batch Read
**POST** `/crm/v3/objects/companies/batch/read`

```json
{
  "properties": ["name", "domain", "city"],
  "inputs": [
    {"id": "201"},
    {"id": "202"}
  ]
}
```

#### Batch Update
**POST** `/crm/v3/objects/companies/batch/update`

```json
{
  "inputs": [
    {
      "id": "201",
      "properties": {
        "city": "Sydney"
      }
    }
  ]
}
```

#### Batch Delete
**POST** `/crm/v3/objects/companies/batch/archive`

```json
{
  "inputs": [
    {"id": "201"},
    {"id": "202"}
  ]
}
```

### Search Companies
**POST** `/crm/v3/objects/companies/search`

```json
{
  "filterGroups": [
    {
      "filters": [
        {
          "propertyName": "city",
          "operator": "EQ",
          "value": "Brisbane"
        }
      ]
    }
  ],
  "properties": ["name", "domain", "city"],
  "limit": 10
}
```

---

## Line Items API

### Base Endpoint
`/crm/v3/objects/line_items`

### Create a Line Item
**POST** `/crm/v3/objects/line_items`

```json
{
  "properties": {
    "name": "Product Name",
    "quantity": "2",
    "price": "500.00",
    "amount": "1000.00",
    "hs_sku": "SKU-001",
    "description": "Product description"
  },
  "associations": [
    {
      "to": {
        "id": 12345
      },
      "types": [
        {
          "associationCategory": "HUBSPOT_DEFINED",
          "associationTypeId": 20
        }
      ]
    }
  ]
}
```

**Note:** Line items must be associated with a deal

### Get a Line Item by ID
**GET** `/crm/v3/objects/line_items/{lineItemId}`

**Query Parameters:**
- `properties` - Comma-separated properties
- `associations` - Comma-separated associations (e.g., `deals`)

### Update a Line Item
**PATCH** `/crm/v3/objects/line_items/{lineItemId}`

```json
{
  "properties": {
    "quantity": "5",
    "amount": "2500.00"
  }
}
```

### Delete a Line Item
**DELETE** `/crm/v3/objects/line_items/{lineItemId}`

### Get All Line Items (List)
**GET** `/crm/v3/objects/line_items`

**Query Parameters:**
- `limit` - Max 100
- `after` - Pagination cursor
- `properties` - Comma-separated properties
- `associations` - Comma-separated associations

### Batch Operations - Line Items

#### Batch Create
**POST** `/crm/v3/objects/line_items/batch/create`

```json
{
  "inputs": [
    {
      "properties": {
        "name": "Product 1",
        "quantity": "1",
        "price": "100.00"
      }
    },
    {
      "properties": {
        "name": "Product 2",
        "quantity": "2",
        "price": "200.00"
      }
    }
  ]
}
```

#### Batch Read
**POST** `/crm/v3/objects/line_items/batch/read`

```json
{
  "properties": ["name", "quantity", "price"],
  "inputs": [
    {"id": "301"},
    {"id": "302"}
  ]
}
```

#### Batch Update
**POST** `/crm/v3/objects/line_items/batch/update`

```json
{
  "inputs": [
    {
      "id": "301",
      "properties": {
        "quantity": "10"
      }
    }
  ]
}
```

#### Batch Delete
**POST** `/crm/v3/objects/line_items/batch/archive`

```json
{
  "inputs": [
    {"id": "301"},
    {"id": "302"}
  ]
}
```

### Search Line Items
**POST** `/crm/v3/objects/line_items/search`

```json
{
  "filterGroups": [
    {
      "filters": [
        {
          "propertyName": "quantity",
          "operator": "GT",
          "value": "1"
        }
      ]
    }
  ],
  "properties": ["name", "quantity", "price"],
  "limit": 10
}
```

---

## Associations API

### Base Endpoint
`/crm/v4/objects/{fromObjectType}/{fromObjectId}/associations/{toObjectType}`

**Note:** v4 is the latest associations API

### Create an Association
**PUT** `/crm/v4/objects/{fromObjectType}/{fromObjectId}/associations/{toObjectType}/{toObjectId}`

**Body:**
```json
[
  {
    "associationCategory": "HUBSPOT_DEFINED",
    "associationTypeId": 3
  }
]
```

**Example - Associate Contact to Company:**
```
PUT /crm/v4/objects/contacts/12345/associations/companies/67890
Body: [{"associationCategory": "HUBSPOT_DEFINED", "associationTypeId": 1}]
```

### Get Associations
**GET** `/crm/v4/objects/{fromObjectType}/{fromObjectId}/associations/{toObjectType}`

**Example - Get all companies for a contact:**
```
GET /crm/v4/objects/contacts/12345/associations/companies
```

**Response:**
```json
{
  "results": [
    {
      "toObjectId": 67890,
      "associationTypes": [
        {
          "category": "HUBSPOT_DEFINED",
          "typeId": 1,
          "label": "Primary"
        }
      ]
    }
  ]
}
```

### Delete an Association
**DELETE** `/crm/v4/objects/{fromObjectType}/{fromObjectId}/associations/{toObjectType}/{toObjectId}`

**Example - Remove contact-company association:**
```
DELETE /crm/v4/objects/contacts/12345/associations/companies/67890
```

### Batch Create Associations
**POST** `/crm/v4/associations/{fromObjectType}/{toObjectType}/batch/create`

```json
{
  "inputs": [
    {
      "from": {"id": "12345"},
      "to": {"id": "67890"},
      "types": [
        {
          "associationCategory": "HUBSPOT_DEFINED",
          "associationTypeId": 1
        }
      ]
    },
    {
      "from": {"id": "12346"},
      "to": {"id": "67891"},
      "types": [
        {
          "associationCategory": "HUBSPOT_DEFINED",
          "associationTypeId": 1
        }
      ]
    }
  ]
}
```

### Batch Read Associations
**POST** `/crm/v4/associations/{fromObjectType}/{toObjectType}/batch/read`

```json
{
  "inputs": [
    {"id": "12345"},
    {"id": "12346"}
  ]
}
```

### Batch Delete Associations
**POST** `/crm/v4/associations/{fromObjectType}/{toObjectType}/batch/archive`

```json
{
  "inputs": [
    {
      "from": {"id": "12345"},
      "to": {"id": "67890"}
    }
  ]
}
```

---

## Association Types

### HubSpot Defined Association Type IDs

#### Contact Associations
| To Object | Association Type | Type ID | Label |
|-----------|-----------------|---------|-------|
| Company | Contact to Company | 1 | Primary Company |
| Company | Company to Contact | 2 | Associated Contact |
| Deal | Contact to Deal | 3 | Contact to Deal |
| Deal | Deal to Contact | 4 | Deal to Contact |
| Ticket | Contact to Ticket | 15 | Contact to Ticket |
| Ticket | Ticket to Contact | 16 | Ticket to Contact |

#### Company Associations
| To Object | Association Type | Type ID | Label |
|-----------|-----------------|---------|-------|
| Contact | Company to Contact | 2 | Associated Contact |
| Contact | Contact to Company | 1 | Primary Company |
| Deal | Company to Deal | 6 | Company to Deal |
| Deal | Deal to Company | 5 | Deal to Company |
| Ticket | Company to Ticket | 26 | Company to Ticket |
| Ticket | Ticket to Company | 25 | Ticket to Company |

#### Deal Associations
| To Object | Association Type | Type ID | Label |
|-----------|-----------------|---------|-------|
| Contact | Deal to Contact | 4 | Deal to Contact |
| Contact | Contact to Deal | 3 | Contact to Deal |
| Company | Deal to Company | 5 | Deal to Company |
| Company | Company to Deal | 6 | Company to Deal |
| Line Item | Deal to Line Item | 20 | Deal to Line Item |
| Line Item | Line Item to Deal | 19 | Line Item to Deal |
| Ticket | Deal to Ticket | 28 | Deal to Ticket |
| Ticket | Ticket to Deal | 27 | Ticket to Deal |

#### Line Item Associations
| To Object | Association Type | Type ID | Label |
|-----------|-----------------|---------|-------|
| Deal | Line Item to Deal | 19 | Line Item to Deal |
| Deal | Deal to Line Item | 20 | Deal to Line Item |

#### Ticket Associations
| To Object | Association Type | Type ID | Label |
|-----------|-----------------|---------|-------|
| Contact | Ticket to Contact | 16 | Ticket to Contact |
| Contact | Contact to Ticket | 15 | Contact to Ticket |
| Company | Ticket to Company | 25 | Ticket to Company |
| Company | Company to Ticket | 26 | Company to Ticket |
| Deal | Ticket to Deal | 27 | Ticket to Deal |
| Deal | Deal to Ticket | 28 | Deal to Ticket |

### Custom Association Types

You can create custom association types for more specific relationships.

#### Get All Association Types
**GET** `/crm/v4/associations/{fromObjectType}/{toObjectType}/labels`

**Example:**
```
GET /crm/v4/associations/contacts/companies/labels
```

#### Create Custom Association Type
**POST** `/crm/v4/associations/{fromObjectType}/{toObjectType}/labels`

```json
{
  "label": "Partner Contact",
  "name": "partner_contact"
}
```

---

## Common Patterns

### Pattern 1: Create Deal with Associations

```json
POST /crm/v3/objects/deals
{
  "properties": {
    "dealname": "New Deal",
    "amount": "10000",
    "dealstage": "appointmentscheduled"
  },
  "associations": [
    {
      "to": {"id": 12345},
      "types": [
        {
          "associationCategory": "HUBSPOT_DEFINED",
          "associationTypeId": 3
        }
      ]
    },
    {
      "to": {"id": 67890},
      "types": [
        {
          "associationCategory": "HUBSPOT_DEFINED",
          "associationTypeId": 5
        }
      ]
    }
  ]
}
```

### Pattern 2: Get Deal with All Associations

```
GET /crm/v3/objects/deals/123456?properties=dealname,amount&associations=contacts,companies,line_items
```

### Pattern 3: Search and Retrieve Related Objects

```javascript
// Step 1: Search for deals
POST /crm/v3/objects/deals/search
{
  "filterGroups": [{
    "filters": [{
      "propertyName": "dealstage",
      "operator": "EQ",
      "value": "closedwon"
    }]
  }],
  "properties": ["dealname", "amount"]
}

// Step 2: For each deal, get associated contacts
GET /crm/v4/objects/deals/{dealId}/associations/contacts
```

### Pattern 4: Batch Create with Associations

```json
POST /crm/v3/objects/deals/batch/create
{
  "inputs": [
    {
      "properties": {
        "dealname": "Deal 1",
        "amount": "5000"
      },
      "associations": [
        {
          "to": {"id": 12345},
          "types": [
            {
              "associationCategory": "HUBSPOT_DEFINED",
              "associationTypeId": 3
            }
          ]
        }
      ]
    }
  ]
}
```

### Pattern 5: Update Deal and Add Line Items

```javascript
// Step 1: Update the deal
PATCH /crm/v3/objects/deals/123456
{
  "properties": {
    "amount": "15000"
  }
}

// Step 2: Create line items with association
POST /crm/v3/objects/line_items
{
  "properties": {
    "name": "Product",
    "quantity": "1",
    "price": "15000"
  },
  "associations": [
    {
      "to": {"id": 123456},
      "types": [
        {
          "associationCategory": "HUBSPOT_DEFINED",
          "associationTypeId": 19
        }
      ]
    }
  ]
}
```

---

## Error Handling

### Common HTTP Status Codes

- **200 OK** - Request successful
- **201 Created** - Resource created successfully
- **204 No Content** - Delete successful
- **400 Bad Request** - Invalid request body/parameters
- **401 Unauthorized** - Invalid or missing authentication
- **403 Forbidden** - No permission to access resource
- **404 Not Found** - Resource not found
- **409 Conflict** - Resource already exists (e.g., duplicate email)
- **429 Too Many Requests** - Rate limit exceeded
- **500 Internal Server Error** - HubSpot server error

### Rate Limits

- **Free/Starter**: 100 requests per 10 seconds
- **Professional**: 150 requests per 10 seconds
- **Enterprise**: 200 requests per 10 seconds

**Burst Limit:** 10 requests per second

### Error Response Format

```json
{
  "status": "error",
  "message": "Property values were not valid",
  "correlationId": "abc-123-def-456",
  "errors": [
    {
      "message": "Property 'amount' must be a number",
      "in": "properties.amount"
    }
  ]
}
```

### Retry Logic Best Practices

1. **429 Rate Limit**: Wait and retry after time specified in `Retry-After` header
2. **5xx Errors**: Exponential backoff (1s, 2s, 4s, 8s)
3. **Network Errors**: Retry up to 3 times with exponential backoff
4. **400 Errors**: Do not retry - fix the request

---

## Property Data Types

### String Properties
- Text values
- Max length varies by property
- Examples: `dealname`, `firstname`, `city`

### Number Properties
- Numeric values
- Can be integers or decimals
- Examples: `amount`, `quantity`, `numberofemployees`

### Date Properties
- ISO 8601 format: `YYYY-MM-DD` or `YYYY-MM-DDTHH:mm:ss.sssZ`
- Stored as Unix timestamp (milliseconds)
- Examples: `closedate`, `createdate`

### DateTime Properties
- Full timestamp with time
- Format: `YYYY-MM-DDTHH:mm:ss.sssZ`
- Examples: `hs_lastmodifieddate`, `createdate`

### Enumeration Properties
- Predefined list of values
- Single select
- Examples: `dealstage`, `lifecyclestage`, `hs_pipeline`

### Boolean Properties
- `true` or `false`
- Examples: Custom checkbox properties

---

## Pagination

All list endpoints support pagination:

**Request:**
```
GET /crm/v3/objects/deals?limit=50&after=12345
```

**Response:**
```json
{
  "results": [...],
  "paging": {
    "next": {
      "after": "67890",
      "link": "https://api.hubapi.com/crm/v3/objects/deals?after=67890"
    }
  }
}
```

To get next page, use the `after` value from the response.

---

## Search Tips

### AND Logic (within filterGroup)
```json
{
  "filterGroups": [
    {
      "filters": [
        {"propertyName": "amount", "operator": "GT", "value": "5000"},
        {"propertyName": "dealstage", "operator": "EQ", "value": "closedwon"}
      ]
    }
  ]
}
```
Both conditions must be true.

### OR Logic (multiple filterGroups)
```json
{
  "filterGroups": [
    {
      "filters": [{"propertyName": "dealstage", "operator": "EQ", "value": "closedwon"}]
    },
    {
      "filters": [{"propertyName": "dealstage", "operator": "EQ", "value": "closedlost"}]
    }
  ]
}
```
Either condition can be true.

### Sorting Results
```json
{
  "sorts": [
    {"propertyName": "amount", "direction": "DESCENDING"},
    {"propertyName": "closedate", "direction": "ASCENDING"}
  ]
}
```

---

## Quick Reference Summary

### Object Endpoints
- Deals: `/crm/v3/objects/deals`
- Contacts: `/crm/v3/objects/contacts`
- Companies: `/crm/v3/objects/companies`
- Line Items: `/crm/v3/objects/line_items`

### Association Endpoints (v4)
- Create: `PUT /crm/v4/objects/{from}/{fromId}/associations/{to}/{toId}`
- Read: `GET /crm/v4/objects/{from}/{fromId}/associations/{to}`
- Delete: `DELETE /crm/v4/objects/{from}/{fromId}/associations/{to}/{toId}`
- Batch: `POST /crm/v4/associations/{from}/{to}/batch/{operation}`

### Common Operations
- Create: `POST /crm/v3/objects/{objectType}`
- Read: `GET /crm/v3/objects/{objectType}/{id}`
- Update: `PATCH /crm/v3/objects/{objectType}/{id}`
- Delete: `DELETE /crm/v3/objects/{objectType}/{id}`
- Search: `POST /crm/v3/objects/{objectType}/search`
- Batch: `POST /crm/v3/objects/{objectType}/batch/{operation}`

---

**End of HubSpot API Reference**
