# Quick Start Guide: Agency Information Dynamic Search

## What's New?

The Agency Information section on the Disclosure Form now includes:
- ✅ **Agency Suburb field** - New required input
- ✅ **Dynamic Search** - Search button to find existing agencies
- ✅ **Smart Scoring** - Results ranked by relevance (0-100%)
- ✅ **Create New** - Option to create new agency if none match

## How It Works for Users

### Step 1: Fill in Agency Details
1. Enter **Agency Business Name** (e.g., "ABC Real Estate")
2. Enter **Agency Suburb** (e.g., "Melbourne")
3. Enter **Agency Email** (optional for search, required for submission)

### Step 2: Search for Existing Agencies
1. Click the **Search** button next to the suburb field
2. A modal opens showing "Searching agencies..."
3. Results appear showing:
   - Agency name
   - Email and address
   - Match score percentage (0-100%)

### Step 3: Choose Option

**Option A: Select an Agency**
1. Click on the agency name to select it
2. Click **Select Agency** button
3. Form auto-fills with selected agency email
4. Modal closes, form is ready to submit

**Option B: Create New Agency**
1. Click **Create New** button in modal
2. Form appears with pre-filled business name and suburb
3. Fill in required fields:
   - Agency Email
   - Listed Salesperson Name
   - Listed Salesperson Phone
4. Click **Create Agency**
5. New agency created, form closes, ready to submit

## Files You Need to Know

### Backend

| File | Purpose |
|------|---------|
| `backend/services/search/scoring.js` | Search scoring algorithm |
| `backend/api/agencies/search.js` | Agency search/create endpoints |
| `backend/services/hubspot/companies.service.js` | Updated with `searchCompaniesByTokens()` |
| `backend/server.js` | Routes registered at `/api/agencies` |

### Frontend

| File | Purpose |
|------|---------|
| `frontend/client-portal/src/components/ui/Dialog.jsx` | Reusable modal component |
| `frontend/client-portal/src/components/disclosure/AgencySearchModal.jsx` | Search modal & create form |
| `frontend/client-portal/src/components/disclosure/DisclosureForm.jsx` | Updated with suburb field & search |

## API Endpoints

### Search Agencies
```bash
POST http://localhost:3001/api/agencies/search

Request:
{
  "businessName": "Stanford Legal",
  "suburb": "Toorak"
}

Response:
{
  "results": [
    {
      "id": "company-123",
      "name": "Stanford Legal Group",
      "email": "info@stanford.com",
      "address": "Toorak",
      "phone": "03 9999 9999",
      "score": 0.92
    }
  ],
  "count": 1
}
```

### Create Agency
```bash
POST http://localhost:3001/api/agencies/create

Request:
{
  "name": "New Agency",
  "address": "Melbourne",
  "email": "contact@newagency.com",
  "phone": "03 1234 5678"
}

Response:
{
  "id": "company-456",
  "name": "New Agency",
  "address": "Melbourne",
  "email": "contact@newagency.com",
  "phone": "03 1234 5678",
  "score": 1.0
}
```

## How Search Scoring Works

Results are scored 0.0 to 1.0 based on how well they match your search:

| Score | Match Type | Example |
|-------|-----------|---------|
| 1.00 | Perfect match | "ABC Real Estate" = "ABC Real Estate" |
| 0.90 | Substring match | "ABC Real Estate" found in "ABC Real Estate Group" |
| 0.85 | All words match | "ABC Real" matches "ABC Real Estate Group" (2 of 2 words) |
| 0.60 | Fuzzy match | "Realty" matches "Real Estate" (similar but not exact) |
| <0.30 | Too different | Not shown in results |

**Length bonus**: Similar length names score higher

## Testing the Feature

### Test Case 1: Perfect Match
```
Search: "Melbourne Real Estate Agents, Collingwood"
Expected: Shows "Melbourne Real Estate Agents" with ~0.95 score
```

### Test Case 2: Partial Match
```
Search: "ABC Realty, Melbourne"
Expected: Shows "ABC Real Estate Group" with ~0.85 score
```

### Test Case 3: Create New
```
Search: "Brand New Agency, Sydney"
Expected: No results, allows create new agency
```

### Test Case 4: Form Submission
```
1. Search and select agency
2. Fill remaining form fields
3. Click Submit
4. Verify disclosure created with selected agency
```

## Common Questions

### Q: Does the search happen automatically?
**A:** No, the user must click the "Search" button after filling in both business name and suburb.

### Q: What if I modify the business name after searching?
**A:** The form remembers your selection. Click Search again to find new matches.

### Q: Can I search by just business name or just suburb?
**A:** No, both fields are required. This ensures more accurate matching.

### Q: How many results show?
**A:** Up to 10 results are displayed, sorted by relevance score. Results below 30% match are filtered out.

### Q: Can I edit the pre-filled agency email?
**A:** Yes, all fields can be edited before form submission.

### Q: Does the system remember my search?
**A:** No, searches are not cached. Each search queries HubSpot in real-time.

## Troubleshooting

### Search returns no results
- ✓ Check spelling of business name
- ✓ Try searching with fewer keywords (e.g., "ABC" instead of "ABC Real Estate Group")
- ✓ Try selecting a different suburb
- ✓ Create a new agency if the one you want doesn't exist

### Error message appears during search
- ✓ Check internet connection
- ✓ Verify backend API is running (`http://localhost:3001/api/health`)
- ✓ Check HubSpot access token in environment variables
- ✓ Try searching again

### Form validation fails on submit
- ✓ Agency Business Name must be filled
- ✓ Agency Suburb must be filled
- ✓ Agency Email must be filled and valid
- ✓ All other required fields must be filled

## Next Steps

1. **Test the feature** using the test cases above
2. **Deploy to staging** and get user feedback
3. **Monitor performance** - check API response times
4. **Gather feedback** - are users finding their agencies easily?
5. **Consider enhancements**:
   - Real-time search as you type
   - Search history / favorites
   - Advanced filters (by email, phone, etc.)

## Support

For issues or questions, refer to:
- Full documentation: `AGENCY_SEARCH_IMPLEMENTATION.md`
- Code comments in source files
- Backend logs (check server console for search details)
- Frontend network tab (check API response times)

---

**Version:** 1.0
**Last Updated:** 2025-10-21
**Implemented by:** Claude Code AI
