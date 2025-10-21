# Updated Agency & Agent Selection Flow

## Overview

The implementation has been corrected to follow the proper workflow:
1. **Agency Selection Phase** - User searches for and selects an agency
2. **Agent Selection Phase** - User selects an agent from the agency or creates new
3. **Form Submission** - User submits disclosure form with agency + agent

## Architecture Changes

### Previous (Incorrect)
- Agency Business Name + Email fields visible on form
- Listing Salesperson fields mixed with Agency fields
- All fields on single page

### Current (Corrected)
- **Agency Information Section** - Only Business Name + Suburb visible
- **Search Button** - Triggers modal for agency selection
- **Agent Selection Modal** - Shows after agency selected
- **Create Agent Option** - If no suitable agent found
- **Clean Form** - Only agency name displayed once selected

## User Flow

```
┌─────────────────────────────────────┐
│  Disclosure Form                    │
│  - Property Info                    │
│  - Seller Info                      │
│  - Agency Business Name + Suburb    │
│    [Search Button]                  │
└─────────────────────────────────────┘
                  ↓
         [User clicks Search]
                  ↓
┌─────────────────────────────────────┐
│  Agency Search Modal                │
│  - Shows matching agencies          │
│  - Score + ranking                  │
│  - Select or Create New             │
└─────────────────────────────────────┘
                  ↓
      [User selects agency]
                  ↓
┌─────────────────────────────────────┐
│  Agent Selection Modal              │
│  - Shows agency's agents            │
│  - Select or Create New             │
└─────────────────────────────────────┘
                  ↓
       [User selects agent]
                  ↓
┌─────────────────────────────────────┐
│  Back to Disclosure Form            │
│  - Agency: [Selected Agency Name]   │
│  - Ready to Submit                  │
└─────────────────────────────────────┘
                  ↓
      [Submit Disclosure Form]
```

## Component Structure

### Frontend Components

#### 1. **DisclosureForm.jsx** (UPDATED)
```javascript
State:
  - agencyInfo: { businessName, suburb }
  - selectedAgency: { id, name, email, agentId, agentEmail, ... }
  - showAgencySearch: boolean
  - showAgentSelection: boolean

Handlers:
  - handleAgencySearch() - Opens agency search modal
  - handleAgencySelect() - Receives agency, opens agent selection
  - handleAgentSelect() - Receives agency+agent, closes modals
  - handleBackFromAgent() - Returns to agency search
```

Agency Information Section (SIMPLIFIED):
- **Agency Business Name** field (required)
- **Agency Suburb** field (required)
- **Search** button
- **Selected Agency Display** (after selection)

#### 2. **AgencySearchModal.jsx** (NEW)
```
Functions:
  - searchAgencies(businessName, suburb)
  - displayScoredResults()
  - handleSelectAgency()
  - showCreateAgencyForm()

Sub-component:
  - CreateAgencyForm - Creates new agency if needed
```

#### 3. **AgentSelectionModal.jsx** (NEW)
```
Functions:
  - fetchAgents(agencyId)
  - displayAgentList()
  - handleSelectAgent()
  - showCreateAgentForm()

Sub-component:
  - CreateAgentForm - Creates new agent for agency
```

### Backend API Endpoints

#### 1. **POST /api/agencies/search**
```
Request:
{
  "businessName": "Stanford Legal",
  "suburb": "Melbourne"
}

Response:
{
  "results": [
    {
      "id": "company-123",
      "name": "Stanford Legal Group",
      "email": "info@stanford.com",
      "address": "Melbourne",
      "score": 0.92
    }
  ],
  "count": 1
}
```

#### 2. **POST /api/agencies/create**
```
Request:
{
  "name": "New Agency",
  "address": "Melbourne",
  "email": "info@newagency.com",
  "phone": "03 9999 9999"
}

Response:
{
  "id": "company-456",
  "name": "New Agency",
  "address": "Melbourne",
  "email": "info@newagency.com",
  "score": 1.0
}
```

#### 3. **GET /api/agencies/:agencyId/agents**
```
Request: /api/agencies/company-123/agents

Response:
{
  "agents": [
    {
      "id": "contact-789",
      "firstname": "John",
      "lastname": "Smith",
      "email": "john@stanford.com",
      "phone": "0412 345 678"
    }
  ]
}
```

#### 4. **POST /api/agencies/:agencyId/agents/create**
```
Request:
{
  "firstname": "Jane",
  "lastname": "Doe",
  "email": "jane@stanford.com",
  "phone": "0412 987 654"
}

Response:
{
  "id": "contact-999",
  "firstname": "Jane",
  "lastname": "Doe",
  "email": "jane@stanford.com",
  "phone": "0412 987 654"
}
```

## Data Flow

### Phase 1: Agency Selection
```
User Input
  ↓
Agency Search Modal
  ↓
API Call: POST /api/agencies/search
  ↓
Backend: searchCompaniesByTokens()
  ↓
HubSpot Query with scoring
  ↓
Return sorted results
  ↓
Display in modal with scores
  ↓
User selects agency
  ↓
Store in selectedAgency state
  ↓
Trigger Agent Selection Modal
```

### Phase 2: Agent Selection
```
Agent Selection Modal Opens
  ↓
API Call: GET /api/agencies/{agencyId}/agents
  ↓
Backend: getAssociations(agencyId)
  ↓
HubSpot Query for associated contacts
  ↓
Return agent list
  ↓
Display agents in modal
  ↓
User selects or creates agent
  ↓
Store in selectedAgency.agent* fields
  ↓
Close modals, return to form
```

### Phase 3: Form Submission
```
Form with agency selected
  ↓
User fills remaining fields
  ↓
Click Submit
  ↓
Validation passes (has selectedAgency)
  ↓
Extract agency + agent data
  ↓
API Call: POST /api/workflows/client-disclosure
  ↓
Backend creates disclosure workflow
  ↓
Success redirect to login
```

## Files Modified/Created

### New Files
- ✅ `frontend/.../disclosure/AgentSelectionModal.jsx`
- ✅ `backend/api/agencies/agents.js`
- ✅ `backend/services/hubspot/associations.service.js`

### Updated Files
- ✅ `frontend/.../disclosure/DisclosureForm.jsx`
  - Removed email, listing salesperson fields
  - Added agent selection flow
  - Simplified to modal-based UX

- ✅ `backend/api/agencies/search.js`
  - Mounted agents router
  - Added nested routes

- ✅ `backend/server.js`
  - Already configured with /api/agencies routes

## Form State Management

### Before Selection
```javascript
{
  businessName: '',
  suburb: ''
}
```

### After Agency Selection
```javascript
{
  businessName: 'Stanford Legal',
  suburb: 'Melbourne',
  id: 'company-123',
  name: 'Stanford Legal Group',
  email: 'info@stanford.com',
  address: 'Melbourne',
  score: 0.92
}
```

### After Agent Selection
```javascript
{
  businessName: 'Stanford Legal',
  suburb: 'Melbourne',
  id: 'company-123',
  name: 'Stanford Legal Group',
  email: 'info@stanford.com',
  address: 'Melbourne',
  score: 0.92,
  agentId: 'contact-789',
  agentEmail: 'john@stanford.com',
  agentFirstName: 'John',
  agentLastName: 'Smith',
  agentPhone: '0412 345 678'
}
```

## Form Submission Data

```javascript
{
  seller: { ... },
  additionalSellers: [ ... ],
  agency: {
    name: 'Stanford Legal Group',
    email: 'info@stanford.com'
  },
  agent: {
    email: 'john@stanford.com',
    firstname: 'John',
    lastname: 'Smith',
    phone: '0412 345 678'
  },
  property: { ... }
}
```

## Validation

### Agency Information Section
- ✓ Agency Business Name required (non-empty)
- ✓ Agency Suburb required (non-empty)
- ✓ Search button disabled until both filled
- ✓ Form can't submit without selectedAgency

### Agent Selection
- ✓ Agents list fetched automatically
- ✓ User must select or create agent
- ✓ Agent data included in form submission

## Error Handling

### No Agencies Found
- Show error message
- Option to create new agency
- Pre-fill with search terms

### No Agents for Agency
- Show error message
- Force user to create new agent
- Pre-fill agency context

### API Failures
- Display user-friendly error
- Allow retry
- Logging for debugging

## UX Enhancements

### Modal Flow
- Smooth transitions between modals
- Back button to return to previous
- Agency name displayed in agent selection header
- Clear selected states

### Loading States
- Spinner during searches
- Disabled buttons during requests
- Progress indicators

### Visual Feedback
- Selected agency highlighted
- Selected agent highlighted
- Score visualization in agency modal
- Contact info display

## Testing Scenarios

### Scenario 1: Happy Path
1. Enter "Stanford Legal" and "Melbourne"
2. Click Search
3. See matching agencies with scores
4. Select top agency
5. See agency's agents
6. Select agent
7. Agent shown in form
8. Submit form

### Scenario 2: Create Agency
1. Search for non-existent agency
2. No results shown
3. Click "Create New Agency"
4. Fill agency form
5. Agency created
6. Proceed to agent selection
7. No agents, create new
8. Agent created
9. Submit form

### Scenario 3: New Agent
1. Select agency
2. See existing agents
3. Click "Create New Agent"
4. Fill agent form
5. Agent created and associated
6. Agent selected
7. Submit form

## Performance Considerations

### API Calls
1. **Agency Search** - Scores on backend, ~1-2s
2. **Agent Fetch** - Gets associations, ~500ms
3. **Agent Creation** - Creates contact, ~500ms
4. **Agency Creation** - Creates company, ~500ms

### Caching Opportunities
- Cache agency list per search term
- Cache agent list per agency
- Cache recently used agencies

## Future Enhancements

1. **Agent Search** - Search agents by name within selected agency
2. **Favorites** - Save frequently used agency-agent pairs
3. **Quick Select** - Remember last used agency-agent
4. **Bulk Create** - Import agencies/agents from CSV
5. **Agency Details** - Show more info (address, logo, etc.)
6. **Agent Availability** - Show agent availability calendar

## Migration Notes

### Breaking Changes
- Form structure changed (email fields removed)
- Data submitted differently (agent selection added)
- Workflow flow changed (two-step selection process)

### Backward Compatibility
- Old form data won't work
- API responses different format
- Need to update form submission handler

### Database Changes
- No schema changes needed
- HubSpot associations used
- Same contact/company objects

---

**Version:** 2.0 (Corrected)
**Last Updated:** 2025-10-21
**Status:** Ready for Implementation
