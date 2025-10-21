# Agency Information Dynamic Search - Testing Checklist

## Pre-Testing Setup

- [ ] Backend server running on `http://localhost:3001`
- [ ] Frontend dev server running on `http://localhost:3000`
- [ ] HubSpot API token configured in `.env`
- [ ] Sample agencies created in HubSpot for testing
- [ ] Network tab open in browser DevTools
- [ ] Backend console visible (check for logs)

## Unit Tests

### Search Scoring Algorithm
- [ ] `levenshteinDistance()` correctly calculates edit distance
- [ ] `scoreMatch()` returns 1.0 for perfect matches
- [ ] `scoreMatch()` returns 0.9 for substrings
- [ ] `scoreMatch()` returns lower scores for partial matches
- [ ] `extractTokens()` splits on whitespace
- [ ] `extractTokens()` removes duplicates
- [ ] `generateTokenFilterGroups()` creates correct filter structure
- [ ] `searchAndScore()` filters results below 0.3 threshold
- [ ] `searchAndScore()` sorts by score descending

### API Endpoints
- [ ] `POST /api/agencies/search` returns 200 with valid results
- [ ] `POST /api/agencies/search` returns 400 without required fields
- [ ] `POST /api/agencies/create` returns 201/200 with new agency
- [ ] `POST /api/agencies/create` returns 400 without required fields
- [ ] Both endpoints include descriptive error messages
- [ ] Response structure matches documented format

## Component Tests

### Dialog Component
- [ ] Dialog opens and closes correctly
- [ ] Backdrop click closes dialog
- [ ] Close button closes dialog
- [ ] Animation plays on open
- [ ] Content scrollable if long
- [ ] Footer buttons aligned correctly
- [ ] Dialog content visible and readable

### Agency Search Modal
- [ ] Modal opens on "Search" button click
- [ ] Shows loading spinner while searching
- [ ] Displays search results after API response
- [ ] Shows error message if no results
- [ ] Shows error message if API fails
- [ ] Radio buttons work for selection
- [ ] Score bar displays percentage correctly
- [ ] Selected agency highlights in blue
- [ ] "Select Agency" button disabled without selection
- [ ] "Create New" button shows creation form
- [ ] "Back" button returns to search results
- [ ] Modal closes after agency selection
- [ ] Modal closes after agency creation

### Create Agency Form
- [ ] All 5 required fields display
- [ ] Business name and suburb pre-populated from search
- [ ] Fields can be edited
- [ ] Submit button disabled if fields empty
- [ ] Shows loading state during submission
- [ ] Shows error message if creation fails
- [ ] Success closes modal and populates form
- [ ] "Back" button returns to search

### Disclosure Form Updates
- [ ] "Agency Suburb" field appears after "Agency Business Name"
- [ ] "Search" button appears next to suburb field
- [ ] "Search" button disabled without both fields filled
- [ ] Form validation requires suburb field
- [ ] Form validation requires business name + suburb for search
- [ ] Agency email auto-fills after selection
- [ ] Business name stays updated after selection
- [ ] Form can be submitted after agency selection

## Integration Tests

### Full User Flow - Select Existing Agency
1. [ ] Navigate to Disclosure Form
2. [ ] Fill Property Information
3. [ ] Fill Seller Information
4. [ ] Enter "Agency Business Name": "Test Agency"
5. [ ] Enter "Agency Suburb": "Melbourne"
6. [ ] Click "Search" button
7. [ ] Wait for modal to appear and load results
8. [ ] Verify results display agencies with scores
9. [ ] Click on first agency to select
10. [ ] Click "Select Agency" button
11. [ ] Modal closes
12. [ ] Agency Email field populates
13. [ ] Business Name field unchanged
14. [ ] Fill Listing Salesperson and Mobile (optional)
15. [ ] Click "Submit Disclosure Form"
16. [ ] Verify submission succeeds
17. [ ] Verify redirect to login page

### Full User Flow - Create New Agency
1. [ ] Navigate to Disclosure Form
2. [ ] Fill Property Information
3. [ ] Fill Seller Information
4. [ ] Enter "Agency Business Name": "Completely New Agency"
5. [ ] Enter "Agency Suburb": "UnknownSuburb"
6. [ ] Click "Search" button
7. [ ] Wait for modal to appear
8. [ ] Verify "No agencies found" message
9. [ ] Click "Create New" button
10. [ ] Verify creation form appears
11. [ ] Verify business name and suburb pre-filled
12. [ ] Enter Email: "newagency@test.com"
13. [ ] Enter Salesperson Name: "John Doe"
14. [ ] Enter Salesperson Phone: "0412 345 678"
15. [ ] Click "Create Agency"
16. [ ] Verify creation succeeds
17. [ ] Modal closes
18. [ ] Form populates with new agency details
19. [ ] Fill remaining form fields
20. [ ] Click "Submit Disclosure Form"
21. [ ] Verify submission succeeds

### API Integration
- [ ] Backend successfully queries HubSpot API
- [ ] Search results properly scored and sorted
- [ ] New agencies created in HubSpot
- [ ] API response times acceptable (<2 seconds)
- [ ] Error handling catches HubSpot failures
- [ ] Logging shows search terms and results

### Error Scenarios

#### Search Errors
- [ ] Display error if API unavailable
- [ ] Display error if invalid tokens
- [ ] Display error if network timeout
- [ ] Allow retry after error
- [ ] Show helpful error message

#### Creation Errors
- [ ] Display error if required fields missing
- [ ] Display error if invalid email
- [ ] Display error if API fails
- [ ] Allow retry after error

#### Validation Errors
- [ ] Disable "Select" without selection
- [ ] Disable "Create" with missing fields
- [ ] Show field validation messages
- [ ] Highlight required fields

## Performance Tests

- [ ] Search completes within 2 seconds
- [ ] No memory leaks after multiple searches
- [ ] Modal animations smooth (60fps)
- [ ] No lag when typing in fields
- [ ] Network requests optimized
- [ ] API response gzipped (if applicable)

## Browser Compatibility

- [ ] Chrome latest
- [ ] Firefox latest
- [ ] Safari latest
- [ ] Edge latest
- [ ] Mobile Safari (iOS)
- [ ] Chrome Mobile (Android)

## Accessibility Tests

- [ ] Modal has focus management
- [ ] Keyboard navigation works (Tab, Enter, Escape)
- [ ] Screen reader can read all content
- [ ] Color contrast meets WCAG AA standard
- [ ] Required fields marked with asterisk
- [ ] Error messages announce to screen readers
- [ ] Loading state announced clearly

## Visual/UX Tests

### Desktop
- [ ] Modal centered on screen
- [ ] Modal responsive within viewport
- [ ] Buttons hover states visible
- [ ] Selected agency highlights clearly
- [ ] Score bar fills correctly
- [ ] Icons display properly
- [ ] Text alignment consistent

### Mobile
- [ ] Modal full-width on small screens
- [ ] Buttons easily tappable (44px+ height)
- [ ] Scrolling smooth
- [ ] Text readable without zoom
- [ ] Modal closes on mobile correctly
- [ ] Keyboard appears/disappears correctly

## Edge Cases

- [ ] Search with single character
- [ ] Search with special characters (!@#$%)
- [ ] Search with very long string
- [ ] Search with numbers only
- [ ] Search with spaces only
- [ ] Create agency with all same fields
- [ ] Create agency with very long names
- [ ] Very large API response (50+ results)
- [ ] Rapid consecutive searches
- [ ] Rapid form submissions

## Regression Tests

### Existing Functionality
- [ ] Disclosure form still works without search
- [ ] Other form sections unaffected
- [ ] Form submission works as before
- [ ] Seller information still working
- [ ] Property information still working
- [ ] Additional sellers feature still working
- [ ] Redirect after submission working

## Documentation Tests

- [ ] README accurate
- [ ] Code comments helpful
- [ ] API documentation complete
- [ ] Examples work as described
- [ ] Error handling documented
- [ ] Scoring algorithm documented
- [ ] File paths correct in docs

## Deployment Tests

- [ ] All files deployed to backend
- [ ] All files deployed to frontend
- [ ] Environment variables configured
- [ ] Routes registered correctly
- [ ] API endpoints accessible
- [ ] Frontend can reach backend
- [ ] HubSpot integration working
- [ ] Database connections working
- [ ] Monitoring/logging in place

## Sign-Off

| Role | Name | Date | Status |
|------|------|------|--------|
| Developer | | | ✅ Ready for QA |
| QA Lead | | | ✅ Ready for Staging |
| Product Owner | | | ✅ Ready for Production |

## Notes

```
[Space for tester notes, issues found, and sign-offs]
```

---

**Last Updated:** 2025-10-21
**Version:** 1.0
**Total Checks:** 150+
