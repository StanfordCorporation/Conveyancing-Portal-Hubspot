# Agency Information Dynamic Search Implementation

## Overview
This document describes the implementation of dynamic agency search functionality in the Disclosure Form. The system allows users to search for existing agencies by Business Name and Suburb, view results ranked by relevance score, and create new agencies if no suitable matches are found.

## Files Created/Modified

### Backend Implementation

#### 1. **Search Scoring Module** (NEW)
**File:** `backend/services/search/scoring.js`

Implements the Sneesby Search Scoring Algorithm with the following functions:

- **`levenshteinDistance(str1, str2)`** - Calculates edit distance between strings
- **`norm(s)`** - Normalizes strings for comparison (lowercase, trim)
- **`words(s)`** - Splits strings into word tokens
- **`scoreMatch(searchTerm, candidate)`** - Scores how well a candidate matches search term (0-1)
  - Returns 1.0 for perfect matches
  - Returns 0.9 for exact substring matches
  - Returns up to 0.85 for word token matches
  - Returns up to 0.6 for fuzzy matches using Levenshtein distance
  - Applies length similarity bonus/penalty

- **`searchAndScore(apiResults, searchTerm)`** - Processes API results and returns sorted by relevance
  - Filters results with score > 0.3 threshold
  - Includes scoring information in results

- **`generateTokenFilterGroups(tokens)`** - Creates HubSpot API filter groups
  - Each token gets its own filter group with CONTAINS_TOKEN operator
  - Enables OR logic for multi-token searches

- **`extractTokens(input)`** - Extracts unique tokens from input string
  - Splits on whitespace
  - Removes duplicates
  - Filters empty tokens

#### 2. **Companies Service Update** (MODIFIED)
**File:** `backend/services/hubspot/companies.service.js`

**New Function:** `searchCompaniesByTokens(businessName, suburb)`
- Extracts tokens from both business name and suburb inputs
- Combines all tokens for comprehensive search
- Generates filter groups for HubSpot API (OR logic)
- Retrieves up to 50 results for scoring
- Scores and sorts results by relevance
- Filters to top matches above threshold
- Logs all matching agencies with scores

**Import:** Added `scoring.js` module functions

#### 3. **Agencies API Endpoint** (NEW)
**File:** `backend/api/agencies/search.js`

Two main endpoints:

**POST `/api/agencies/search`**
- **Request:**
  ```json
  {
    "businessName": "Stanford Legal",
    "suburb": "Melbourne"
  }
  ```
- **Response:**
  ```json
  {
    "results": [
      {
        "id": "hubspot-id",
        "name": "Stanford Legal Group",
        "email": "info@stanfordlegal.com",
        "address": "Melbourne",
        "phone": "03 9999 9999",
        "score": 0.95
      }
    ],
    "count": 1
  }
  ```

**POST `/api/agencies/create`**
- **Request:**
  ```json
  {
    "name": "New Agency",
    "address": "Melbourne",
    "email": "contact@newagency.com",
    "phone": "03 1234 5678",
    "salespersonName": "John Smith",
    "salespersonPhone": "0412 345 678"
  }
  ```
- **Response:**
  ```json
  {
    "id": "hubspot-id",
    "name": "New Agency",
    "address": "Melbourne",
    "email": "contact@newagency.com",
    "phone": "03 1234 5678",
    "score": 1.0
  }
  ```

#### 4. **Server Configuration** (MODIFIED)
**File:** `backend/server.js`

- Imported `agenciesRouter` from `api/agencies/search.js`
- Registered agencies routes at `/api/agencies`
- Now handles:
  - `POST /api/agencies/search`
  - `POST /api/agencies/create`

### Frontend Implementation

#### 1. **Dialog Component** (NEW)
**File:** `frontend/client-portal/src/components/ui/Dialog.jsx`

Reusable modal component with:
- **Dialog** - Main container with backdrop and animation
- **DialogHeader** - Header section with close button
- **DialogTitle** - Title text
- **DialogDescription** - Subtitle/description text
- **DialogContent** - Scrollable content area
- **DialogFooter** - Footer with action buttons

Features:
- Click-outside-to-close functionality
- Smooth scale-in animation
- Tailwind CSS styling
- Accessible with semantic HTML

#### 2. **Agency Search Modal Component** (NEW)
**File:** `frontend/client-portal/src/components/disclosure/AgencySearchModal.jsx`

**Main Component:** `AgencySearchModal`
- Displays search results in a modal dialog
- Shows agency results with match score visualization
- Allows selection of matching agency
- Includes "Create New" button to show creation form
- Features:
  - Loading spinner while searching
  - Error message display
  - Score bar showing relevance percentage
  - Click to select agency
  - Radio button UI for selection

**Sub-Component:** `CreateAgencyForm`
- Form for creating new agency with fields:
  - Agency Business Name (required)
  - Agency Suburb (required)
  - Agency Email (required)
  - Listed Salesperson Name (required)
  - Listed Salesperson Phone (required)
- Pre-populates with search input values
- Loading state during submission
- Error handling and display
- Back button to return to search results

#### 3. **Disclosure Form Update** (MODIFIED)
**File:** `frontend/client-portal/src/components/disclosure/DisclosureForm.jsx`

**Changes:**
1. Added import for `AgencySearchModal` component
2. Added `MapPin` icon from lucide-react
3. **State updates:**
   - Added `suburb` field to `agencyInfo` state
   - Added `showAgencySearch` state for modal visibility

4. **New functions:**
   - `handleAgencySelect(selectedAgency)` - Updates form with selected agency
   - `handleAgencySearch()` - Triggers modal when search fields filled

5. **UI changes:**
   - Added "Agency Suburb" field with MapPin icon
   - Added "Search" button next to suburb field
   - Added helper text explaining search functionality
   - Updated form validation to require suburb

6. **Modal integration:**
   - `<AgencySearchModal />` component added before closing div
   - Passes business name, suburb, and callbacks to modal

## User Flow

### 1. User Fills Agency Information
```
1. User enters "Agency Business Name" (e.g., "Stanford Legal")
2. User enters "Agency Suburb" (e.g., "Melbourne")
3. User clicks "Search" button
```

### 2. Search Modal Opens
```
1. Modal displays with "Searching agencies..." message
2. Frontend calls POST /api/agencies/search
3. Backend:
   - Extracts tokens: ["stanford", "legal", "melbourne"]
   - Creates filter groups for each token
   - Queries HubSpot with OR logic
   - Scores results: stanford legal group (0.95), stanford law office (0.87)
   - Sorts by score
   - Returns top matches
4. Modal displays results with:
   - Agency name
   - Email and address
   - Match score percentage
   - Selection radio button
```

### 3. User Selects Agency or Creates New
```
Option A: Select Existing Agency
  1. User clicks on agency in list
  2. User clicks "Select Agency" button
  3. Form populates with agency details
  4. Modal closes
  5. User can submit form

Option B: Create New Agency
  1. User clicks "Create New" button
  2. Form appears with pre-filled search terms
  3. User fills remaining required fields
  4. User clicks "Create Agency"
  5. Form submits to POST /api/agencies/create
  6. Agency created in HubSpot
  7. Form populates with new agency
  8. Modal closes
```

## API Flow Diagram

```
Frontend                          Backend
  |                                 |
  |-- POST /api/agencies/search ------>|
  |  {businessName, suburb}          |
  |                              Extract tokens
  |                              Generate filter groups
  |                              Query HubSpot API
  |                              Score results
  |                              Sort by score
  |<---- JSON results --------------|
  |                                 |
  | Display modal with results      |
  |                                 |
  |-- POST /api/agencies/create ----->|
  |  {name, address, email, phone}  |
  |                              Create company
  |                              in HubSpot
  |<---- New agency JSON ------------|
```

## Search Scoring Algorithm

The Sneesby scoring function evaluates matches on multiple criteria:

1. **Perfect Match (100%)**
   - Search term exactly equals candidate name
   - Score: 1.0

2. **Substring Match (90%)**
   - Entire search term found in candidate
   - Score: 0.9

3. **Word Token Match (up to 85%)**
   - Individual words from search term match candidate words
   - Score: (matched_words / total_search_words) × 0.85
   - Example: "Stanford Legal" searching "Stanford Legal Group" = (2/2) × 0.85 = 0.85

4. **Fuzzy Match (up to 60%)**
   - Uses Levenshtein distance for similar but not exact words
   - Score: (1 - normalized_distance) × 0.6
   - Example: "Standford" vs "Stanford" = 0.54

5. **Length Penalty**
   - Penalizes results with significantly different lengths
   - Penalty: min(length_difference × 0.01, 0.2)
   - Example: "ABC" vs "ABC Real Estate Group" = 0.7 (before penalty)

6. **Final Score**
   - Combination of above with length adjustment
   - Range: 0 to 1.0
   - Threshold: Only results > 0.3 are returned

## Example Scenarios

### Scenario 1: Perfect Match
```
Search: "Melbourne Real Estate Agents, Toorak"
HubSpot DB:
  - "Melbourne Real Estate Agents" (score: 0.92)
  - "Toorak Realty" (score: 0.78)
  - "Melbourne Properties" (score: 0.65)

Results shown in descending score order
```

### Scenario 2: Fuzzy Match
```
Search: "ABC Realty, Collingwood"
HubSpot DB:
  - "ABC Reality Group" (fuzzy match on "Realty"/"Reality", score: 0.58)
  - No exact matches

Result displayed with fuzzy match explanation
```

### Scenario 3: No Matches
```
Search: "XYZ New Agency, Sydney"
Results: Empty list
Actions: User can create new agency with filled form
```

## Error Handling

### Backend Errors
- **400 Bad Request** - Missing required fields
- **500 Server Error** - HubSpot API failure, network issues
- All errors include descriptive message

### Frontend Errors
- **Search failures** - Display error message in modal
- **Creation failures** - Display error message in form
- **Validation** - Disable submit if required fields missing

## Performance Considerations

1. **Query Limit** - Retrieves up to 50 results from HubSpot (before scoring)
2. **Scoring Filter** - Only returns results with score > 0.3 (typically 5-10 results)
3. **Search Terms** - Splitting into tokens can generate multiple filter groups
4. **Caching** - Consider caching common agencies for frequently searched suburbs

## Testing Checklist

- [ ] Search returns agencies ranked by relevance
- [ ] Perfect match scores highest
- [ ] Fuzzy matches work correctly
- [ ] Create new agency form populates with search terms
- [ ] Form validation requires all fields
- [ ] Selected agency populates form correctly
- [ ] Submit form with selected agency
- [ ] Submit form with created agency
- [ ] Error handling displays correctly
- [ ] Modal closes on backdrop click
- [ ] Loading spinner shows during search

## Future Enhancements

1. **Real-time Search** - Auto-trigger search as user types
2. **Caching** - Cache search results to reduce API calls
3. **Favorites** - Allow users to favorite frequently used agencies
4. **Agency Details** - Show more details (phone, address, salesperson)
5. **Bulk Upload** - Import agencies from CSV
6. **Advanced Filters** - Filter by email, phone, address
7. **Search History** - Recently searched agencies

## Deployment Notes

1. Ensure `backend/services/search/scoring.js` is deployed
2. Ensure new API endpoints are available at `/api/agencies/*`
3. Frontend components require React 17+ and Tailwind CSS
4. Dialog component uses `lucide-react` icons
5. Test API connectivity before deploying to production
