# Client Portal Dashboard - Dynamic Implementation Plan

## Key Insight
The client's contact details are **already retrieved during login**. We just need to:
1. Store the contact data in localStorage/session after login
2. Use that data to pre-populate the dashboard
3. Fetch associated deals (using the 4 associations we already create)
4. Use batch API to get deal details

---

## Current Data Flow at Login

```
Login → OTP Verification → Contact retrieved & stored
                             ↓
Contact ID: 211026834900
Contact properties: firstname, lastname, email, phone
                             ↓
                   Can use immediately in dashboard!
```

**What we get from disclosure workflow:**
- Primary seller contact ID + details
- Additional sellers contact IDs + details
- Associated deal ID + agency + agent + listing contact
- **4 associations created:** Contact1, Company(Agency), Contact2(Agent), Contact3(AdditionalSeller)

---

## Phase 1: Optimize Login Flow - Store Contact Data

### 1.1 Update Login Response
**File:** `backend/src/routes/auth.js` (verify-otp endpoint)

**Current:** Returns only `{ token, user: { email, phone } }`

**Enhanced:**
```javascript
const response = await api.post('/auth/verify-otp', {
  identifier: cleanIdentifier,
  otp: otpCode,
  method: loginMethod
});

// Store enhanced user data
localStorage.setItem('authToken', response.data.token);
localStorage.setItem('user', JSON.stringify({
  email: response.data.user.email,
  phone: response.data.user.phone,
  contactId: response.data.user.contactId,        // Add this
  firstname: response.data.user.firstname,         // Add this
  lastname: response.data.user.lastname            // Add this
}));
```

**Backend verify-otp should return:**
```json
{
  "token": "jwt_token_here",
  "user": {
    "email": "pmanocha@stanford.au",
    "phone": "0434681036",
    "contactId": "211026834900",
    "firstname": "John",
    "lastname": "Smith"
  }
}
```

---

## Phase 2: Backend Enhancement - Fetch Associated Deals

### 2.1 New Integration Method: Get Contact Deals with Batch Properties

**File:** `backend/src/integrations/hubspot/associations.js`

**Add Method:**
```javascript
/**
 * Get deals associated with a contact (association type 4)
 * Association Type 4 = contact_to_deal
 */
export const getContactDeals = async (contactId) => {
  try {
    console.log(`[HubSpot Associations] 🔗 Fetching deals for contact: ${contactId}`);

    const response = await hubspotClient.get(
      `/crm/v3/objects/contacts/${contactId}/associations/deals`,
      {
        params: { limit: 100 }
      }
    );

    const dealIds = response.data.results?.map(result => result.id) || [];
    console.log(`[HubSpot Associations] ✅ Found ${dealIds.length} associated deals`);
    return dealIds;
  } catch (error) {
    if (error.response?.status === 404) {
      console.log(`[HubSpot Associations] ℹ️ No deals found for contact`);
      return [];
    }
    throw error;
  }
};

/**
 * Batch fetch properties for multiple deals
 * Fetches all properties for up to 100 deals in a single API call
 */
export const batchGetDealProperties = async (dealIds, properties = []) => {
  try {
    if (!dealIds || dealIds.length === 0) {
      console.log(`[HubSpot Associations] ℹ️ No deal IDs provided for batch fetch`);
      return [];
    }

    console.log(`[HubSpot Associations] 📦 Batch fetching ${dealIds.length} deals`);

    const requestBody = {
      inputs: dealIds.map(id => ({ id })),
      properties: properties.length > 0 ? properties : [
        'dealname',
        'property_address',
        'dealstage',
        'number_of_owners'
      ]
    };

    const response = await hubspotClient.post(
      `/crm/v3/objects/deals/batch/read`,
      requestBody
    );

    const deals = response.data.results || [];
    console.log(`[HubSpot Associations] ✅ Batch fetch returned ${deals.length} deals`);
    return deals;
  } catch (error) {
    console.error(`[HubSpot Associations] ❌ Batch fetch error:`, error.message);
    throw error;
  }
};
```

---

### 2.2 New Route: Get Client Dashboard Data

**File:** `backend/src/routes/client.js` (create new file)

**Endpoint:** `GET /api/client/dashboard-data`

**Purpose:** Fetch all deals associated with authenticated client

**Implementation:**
```javascript
import express from 'express';
import { authMiddleware } from '../middleware/auth.js';
import * as associationsIntegration from '../integrations/hubspot/associations.js';

const router = express.Router();

/**
 * GET /api/client/dashboard-data
 * Returns all deals associated with the authenticated client
 * Client ID comes from auth token
 */
router.get('/dashboard-data', authMiddleware, async (req, res) => {
  try {
    const contactId = req.user.contactId;

    if (!contactId) {
      return res.status(400).json({ error: 'Contact ID not found in session' });
    }

    console.log(`[Client Dashboard] 📊 Fetching deals for contact: ${contactId}`);

    // Step 1: Get associated deal IDs
    const dealIds = await associationsIntegration.getContactDeals(contactId);

    if (dealIds.length === 0) {
      console.log(`[Client Dashboard] ℹ️ No deals found, returning empty array`);
      return res.json({ deals: [] });
    }

    // Step 2: Batch fetch deal properties
    const deals = await associationsIntegration.batchGetDealProperties(
      dealIds,
      ['dealname', 'property_address', 'dealstage', 'number_of_owners']
    );

    // Step 3: Transform deals for frontend
    const transformedDeals = deals.map((deal, index) => ({
      id: deal.id,
      index: index,
      title: deal.properties.property_address || deal.properties.dealname || 'Untitled',
      // Extract address parts from "5 Windsor Court, Deebing Heights, QLD 4306"
      subtitle: extractSubtitle(deal.properties.property_address),
      status: deal.properties.dealstage || 'Unknown',
      questionsAnswered: 0,  // TODO: implement questionnaire tracking
      totalQuestions: 13,
      progressPercentage: 0
    }));

    console.log(`[Client Dashboard] ✅ Returning ${transformedDeals.length} deals`);
    res.json({ deals: transformedDeals });

  } catch (error) {
    console.error(`[Client Dashboard] ❌ Error:`, error.message);
    res.status(500).json({ error: 'Failed to fetch dashboard data' });
  }
});

/**
 * Extract subtitle from full address
 * "5 Windsor Court, Deebing Heights, QLD 4306" → "Deebing Heights, QLD 4306"
 */
function extractSubtitle(fullAddress) {
  if (!fullAddress) return 'Location TBD';

  const parts = fullAddress.split(',');
  if (parts.length > 1) {
    return parts.slice(1).map(p => p.trim()).join(', ');
  }
  return fullAddress;
}

export default router;
```

**Register route in main app:**
```javascript
// server.js
import clientRoutes from './routes/client.js';
app.use('/api/client', clientRoutes);
```

---

## Phase 3: Frontend Enhancement - Use Stored Data

### 3.1 Update ClientDashboard Component

**File:** `frontend/client-portal/src/components/dashboard/ClientDashboard.jsx`

**Key Changes:**

1. **Use localStorage user data:**
   ```javascript
   const storedUser = JSON.parse(localStorage.getItem('user'));

   const [clientData, setClientData] = useState({
     fullName: storedUser?.firstname + ' ' + storedUser?.lastname,
     email: storedUser?.email,
     phone: storedUser?.phone
   });
   ```

2. **Fetch properties on mount:**
   ```javascript
   useEffect(() => {
     const fetchProperties = async () => {
       try {
         const response = await api.get('/client/dashboard-data');

         if (response.data.deals && response.data.deals.length > 0) {
           // Use real deals instead of hardcoded
           const deals = response.data.deals.map(deal => ({
             index: deal.index,
             id: deal.id,
             title: deal.title,
             subtitle: deal.subtitle
           }));

           setProperties(deals);
           setCurrentProperty(deals[0]); // Auto-select first property
         }
       } catch (error) {
         console.error('Failed to fetch properties:', error);
         // Fallback to empty or default properties
       }
     };

     fetchProperties();
   }, []);
   ```

3. **Update user display:**
   ```javascript
   // Replace hardcoded "Donna Andrews" with dynamic name
   <div className="user-info">
     <h4>{clientData.fullName}</h4>
     <p>Client Account</p>
   </div>

   // Replace hardcoded "DA" avatar with initials
   <div className="user-avatar">
     {clientData.fullName?.split(' ').map(n => n[0]).join('').toUpperCase()}
   </div>
   ```

4. **Update form fields:**
   ```javascript
   // Replace hardcoded form values
   <input type="text" className="form-input" value={clientData.fullName} readOnly />
   <input type="email" className="form-input" value={clientData.email} readOnly />
   <input type="tel" className="form-input" value={clientData.phone} readOnly />
   <input
     type="text"
     className="form-input"
     value={`${currentProperty.title}, ${currentProperty.subtitle}`}
     readOnly
   />
   ```

---

## Phase 4: Implementation Checklist

### Backend Tasks:
- [ ] Add `getContactDeals()` to associations.js
- [ ] Add `batchGetDealProperties()` to associations.js
- [ ] Create new `routes/client.js` file
- [ ] Implement `GET /api/client/dashboard-data` endpoint
- [ ] Test endpoint with Postman/curl with valid contact ID
- [ ] Verify 4 associations are being retrieved

### Frontend Tasks:
- [ ] Read stored user data from localStorage in ClientDashboard
- [ ] Add state for dynamically loaded properties
- [ ] Add useEffect to fetch `/api/client/dashboard-data`
- [ ] Replace hardcoded user name with localStorage data
- [ ] Replace hardcoded properties array with fetched data
- [ ] Update avatar with user initials
- [ ] Update form fields to use dynamic data
- [ ] Test with authenticated login

### Testing Tasks:
- [ ] Login with test account (pmanocha@stanford.au / Pratham Manocha)
- [ ] Verify user name displays correctly
- [ ] Verify properties list loads dynamically
- [ ] Verify each property shows correct address
- [ ] Verify form fields are pre-filled
- [ ] Test with account that has multiple deals (if available)

---

## Data Transformation Reference

**From HubSpot Deal Properties:**
```json
{
  "id": "168359414202",
  "properties": {
    "dealname": "143 Sinnathamby - Pratham Manocha Smokeball Integration Test 1",
    "property_address": "143 Sinnathamby, South Brisbane, QLD 4101",
    "dealstage": "1923713518",
    "number_of_owners": "1"
  }
}
```

**Transform to Frontend Property Object:**
```javascript
{
  index: 0,
  id: "168359414202",
  title: "143 Sinnathamby",          // Extracted from property_address
  subtitle: "South Brisbane, QLD 4101" // Extracted from property_address
}
```

---

## API Call Sequence

```
1. User logs in successfully
   ↓
2. Frontend stores user data: { contactId, firstname, lastname, email, phone }
   ↓
3. Dashboard component mounts
   ↓
4. Frontend calls GET /api/client/dashboard-data
   ↓
5. Backend:
   - Gets contactId from auth middleware
   - Calls getContactDeals(contactId) → returns [dealId1, dealId2, dealId3, dealId4]
   - Calls batchGetDealProperties([...]) → HubSpot batch API
   - HubSpot returns deal properties
   - Transform and return to frontend
   ↓
6. Frontend:
   - Receives deals array
   - Sets properties state
   - Renders dynamic property list
```

---

## Key Differences from Initial Plan

✅ **Simplified approach:**
- ❌ Don't create new `getFullProfile()` or `getSellerInformation()` methods
- ✅ Use data already in localStorage from login
- ✅ Just add 2 new integration methods for associations
- ✅ Create 1 new route for fetching deals

✅ **Leverages existing architecture:**
- ✅ Contact data retrieved at login (already done)
- ✅ 4 associations already created (primary, agency, agent, additional seller)
- ✅ Use association type 4 (contact_to_deal) to get deals

✅ **Practical & minimal:**
- Only 1 new API endpoint needed
- 2 new integration methods
- Minimal frontend changes
- No new database/caching needed initially

---

## Notes

1. **Association Type 4 = contact_to_deal** - This is what we need to query
2. **Batch API endpoint:** `POST /crm/v3/objects/deals/batch/read`
3. **Max 100 deals per batch request** - Should be sufficient for client portals
4. **Questionnaire tracking** - Currently placeholder (0%), implement later by tracking form submissions
5. **Progress percentage** - Can be calculated when questionnaire submission is tracked
