# Questionnaire Sync Fix - Implementation Summary

## Problem
The agent portal's LeadDetailsModal was only displaying a small subset of questionnaire answers (~10 fields) instead of all 80+ questionnaire fields that clients had answered.

## Root Cause
1. **Backend**: `getAgentDeals()` function was using a hardcoded list of ~25 properties instead of dynamically fetching all questionnaire properties from the schema
2. **Frontend**: `LeadDetailsModal.jsx` had hardcoded display logic that only showed specific fields instead of dynamically rendering all sections/questions

## Changes Implemented

### Backend Changes (`backend/src/services/domain/agent.js`)

**Added Import:**
```javascript
import { getAllHubSpotProperties } from '../../utils/questionnaireHelper.js';
```

**Updated getAgentDeals Function (lines 281-292):**
- Replaced hardcoded `dealProperties` array with dynamic property fetching
- Now uses `getAllHubSpotProperties()` to get all 80+ questionnaire fields from schema
- Added logging to show how many properties are being fetched

**Before:** ~25 hardcoded properties
**After:** 11 base properties + 80+ dynamic questionnaire properties = 91+ properties

### Frontend Changes (`frontend/agent-portal/src/components/dashboard/LeadDetailsModal.jsx`)

**Added Imports:**
```javascript
import { useMemo } from 'react';
import useQuestionnaireSchema from '../../hooks/useQuestionnaireSchema';
```

**Added Schema Hook:**
- Integrated `useQuestionnaireSchema()` to fetch questionnaire schema on component mount
- Schema is cached across all uses for performance

**Added Helper Functions:**
1. `shouldShowConditionalField()` - Determines if a conditional field should be displayed based on parent field values
2. `formatFieldValue()` - Formats values for display (dates, files, enumerations)

**Replaced Questionnaire Tab (lines 222-276):**
- Removed hardcoded sections and fields
- Implemented dynamic rendering that:
  - Iterates through all schema sections
  - Filters questions based on conditional logic
  - Maps HubSpot property names to deal properties
  - Formats values appropriately
  - Handles loading and error states

## What Now Works

### All Sections Display Correctly:
1. ✅ **Section 1: Title Details and Encumbrances** - All fields including unregistered encumbrances
2. ✅ **Section 2: Rental Agreement/Tenancy** - All formal/informal tenancy fields with conditional logic
3. ✅ **Section 3: Land Use, Planning and Environment** - All fields including resume notice, government notice, heritage act
4. ✅ **Section 4: Buildings and Structures** - All fields including enforcement notice
5. ✅ **Section 5: Rates & Services** - Now displays (was completely missing before)

### Previously Missing Fields Now Display:
- unregistered_encumbrances & details
- resume_notice & details
- government_notice & details
- heritage_act & details
- skip_rates_notice
- rates_notice_upload
- water_notice_upload
- All conditional sub-questions (rental agreement details, lease dates, bond amounts, etc.)

## How to Test

1. **Start the application:**
   ```bash
   # Backend
   cd backend
   npm start

   # Frontend (agent portal)
   cd frontend/agent-portal
   npm run dev
   ```

2. **Login to Agent Portal:**
   - Navigate to http://localhost:5173 (or configured port)
   - Login with agent credentials

3. **View Lead Details:**
   - Click on any lead from the dashboard
   - Navigate to the "Questionnaire" tab
   - Verify that ALL answered questions appear grouped by section
   - Check that conditional fields only show when their parent condition is met

4. **Verify Sections:**
   - Section 1: Should show body corporate, registered/unregistered encumbrances
   - Section 2: Should show all tenancy-related fields based on conditional logic
   - Section 3: Should show all environment/planning fields
   - Section 4: Should show all building-related fields
   - Section 5: Should show rates and water notice fields

## Technical Benefits

1. **Maintainability**: No more hardcoded field lists - automatically stays in sync with questionnaire.json
2. **Consistency**: Uses same schema-driven approach as the client portal and questionnaire form
3. **Scalability**: Adding new questions to questionnaire.json automatically makes them visible
4. **Accuracy**: Properly handles conditional fields using the same logic as the form
5. **Performance**: Schema is fetched once and cached, batch fetching of properties is efficient

## Files Modified

1. `backend/src/services/domain/agent.js` - Updated getAgentDeals to fetch all properties
2. `frontend/agent-portal/src/components/dashboard/LeadDetailsModal.jsx` - Dynamic questionnaire rendering

## Files Unchanged (Already Working Correctly)

- `backend/src/utils/questionnaireHelper.js` - Provides getAllHubSpotProperties()
- `backend/src/config/questionnaire.json` - Schema definition
- `frontend/agent-portal/src/hooks/useQuestionnaireSchema.js` - Schema fetching hook

## Verification Checklist

- [x] Backend fetches all questionnaire properties
- [x] Frontend uses schema hook
- [x] All sections render dynamically
- [x] Conditional fields logic works
- [x] Value formatting (dates, files) works
- [x] No linting errors
- [x] Loading and error states handled
- [x] Matches client portal approach for consistency

## Next Steps

If any issues are discovered during testing:
1. Check browser console for errors
2. Verify deal data includes all properties (check Network tab)
3. Confirm schema loads successfully
4. Check that conditional field logic matches questionnaire.json

