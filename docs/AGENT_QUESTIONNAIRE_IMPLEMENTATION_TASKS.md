# Agent Portal - Full Property Questionnaire Implementation Tasks

## Executive Summary

**Current State:**
- Agent portal has a **simplified** questionnaire in CreateLeadStep2.jsx with only ~11 basic questions across 4 sections
- Missing 40+ questions, file uploads, dynamic schema loading, and conditional logic
- Hardcoded fields instead of schema-driven

**Target State:**
- Full 50+ question questionnaire matching client portal exactly
- 5 sections with dynamic schema loading
- File upload support with HubSpot integration
- Conditional field logic (nested conditionals)
- Progress tracking, validation, and save functionality
- Agent-specific UI (banner showing "completing on behalf of client")

**Gap Analysis:**
| Feature | Client Portal | Agent Portal (Current) | Status |
|---------|---------------|------------------------|--------|
| Questions | 50+ | 11 | ❌ Missing 40+ |
| Sections | 5 | 4 | ❌ Missing Section 5 |
| Dynamic Schema | ✅ | ❌ | ❌ Hardcoded |
| File Uploads | ✅ | ❌ | ❌ Not implemented |
| Conditional Logic | ✅ | ❌ | ❌ Basic only |
| Progress Tracking | ✅ | ❌ | ❌ Not implemented |
| Validation | ✅ | ❌ | ❌ Basic only |
| Save Progress | ✅ | ❌ | ❌ Not implemented |
| CSS Styling | property-questionnaire.css | agent-dashboard.css | ⚠️ Incomplete |
| useQuestionnaireSchema | ✅ | ❌ | ❌ Missing |

---

## Implementation Strategy

**Approach:** Adapt the client portal's PropertyQuestionnaire component for agent portal with minimal modifications

**Key Modifications Needed:**
1. Add agent-specific banner ("You're completing this for [Client Name]")
2. Adjust API endpoints (agent context instead of client)
3. Handle different authentication flow (agent JWT)
4. Remove client-specific navigation elements
5. Integrate with CreateLeadModal's 3-step wizard

**Files to Create/Modify:**
- ✅ Already exist in client portal (copy from)
- ❌ Don't exist in agent portal (need to create)
- ⚠️ Exist but need modifications

---

## Phase 1: Setup Infrastructure ⏱️ Est: 1-2 hours

### Task 1.1: Copy useQuestionnaireSchema Hook
**Priority:** HIGH
**Effort:** 15 mins
**Status:** ❌ Not started

**Description:**
Copy the useQuestionnaireSchema.js hook from client portal to agent portal to enable dynamic schema loading.

**Files:**
```
Source: frontend/client-portal/src/hooks/useQuestionnaireSchema.js
Target: frontend/agent-portal/src/hooks/useQuestionnaireSchema.js
```

**Changes Needed:**
- ✅ Copy as-is (no modifications needed)
- Hook fetches from `/api/questionnaire/schema` (backend endpoint, same for both portals)

**Acceptance Criteria:**
- [ ] File copied to agent portal hooks directory
- [ ] Import statement works in agent components
- [ ] Schema loads from backend successfully

---

### Task 1.2: Copy Property Questionnaire CSS
**Priority:** HIGH
**Effort:** 10 mins
**Status:** ❌ Not started

**Description:**
Copy the property questionnaire CSS from client portal to agent portal for consistent styling.

**Files:**
```
Source: frontend/client-portal/src/components/dashboard/property-questionnaire.css
Target: frontend/agent-portal/src/components/dashboard/property-questionnaire.css
```

**Changes Needed:**
- ✅ Copy as-is, then add agent-specific overrides:
  - `.agent-banner` styles for the "completing on behalf of" message
  - Modal-specific adjustments for wizard integration
  - Adjust colors to match agent portal theme if needed

**Acceptance Criteria:**
- [ ] CSS file copied to agent portal
- [ ] Questionnaire renders with proper styling
- [ ] Agent banner has distinct styling

---

### Task 1.3: Verify Backend API Endpoints
**Priority:** HIGH
**Effort:** 30 mins
**Status:** ⚠️ Needs verification

**Description:**
Ensure backend has agent-compatible endpoints for questionnaire operations.

**Endpoints Needed:**
```javascript
// Schema (already exists, shared endpoint)
GET /api/questionnaire/schema

// Save questionnaire (agent context)
POST /api/agent/leads/:dealId/questionnaire
Body: { questionnaireData: {...} }

// Upload files (agent context)
POST /api/agent/leads/:dealId/upload
Body: FormData with files + fieldName

// Delete files (agent context)
DELETE /api/agent/leads/:dealId/file/:fileId?fieldName=...

// Get file metadata (agent context)
GET /api/agent/leads/:dealId/file/:fileId/metadata
```

**Changes Needed:**
- [ ] Check if `/api/agent/leads/:dealId/questionnaire` exists (likely needs to be created)
- [ ] Check if file upload endpoints exist for agent context
- [ ] May need to create agent-specific routes or add agent auth to existing routes

**Backend Files to Check/Modify:**
```
backend/src/routes/agent.js (or create new routes/leads.js)
backend/src/routes/questionnaire.js (may need agent auth middleware)
```

**Acceptance Criteria:**
- [ ] All required endpoints exist and accept agent JWT tokens
- [ ] Agent can save questionnaire data to deals they're associated with
- [ ] Agent can upload/delete files on behalf of clients
- [ ] Proper authorization (agent can only access their own leads)

---

## Phase 2: Create Agent Questionnaire Component ⏱️ Est: 3-4 hours

### Task 2.1: Create PropertyQuestionnaireAgent Component
**Priority:** HIGH
**Effort:** 2 hours
**Status:** ❌ Not started

**Description:**
Create a new component that wraps/extends the client portal's PropertyQuestionnaire logic for agent use.

**Files:**
```
New file: frontend/agent-portal/src/components/dashboard/PropertyQuestionnaireAgent.jsx
```

**Implementation Approach:**

**Option A: Copy and Adapt (RECOMMENDED)**
- Copy PropertyQuestionnaire.jsx from client portal
- Modify for agent context
- Keep all functionality (50+ questions, conditional logic, file uploads)

**Option B: Wrapper Component**
- Import client portal's PropertyQuestionnaire
- Add agent-specific wrapper
- More code reuse but may have import issues

**Key Modifications Needed:**
```jsx
// 1. Add agent context prop
export default function PropertyQuestionnaireAgent({
  dealId,
  clientName,        // NEW: for banner
  isAgentContext,    // NEW: flag for agent-specific behavior
  initialData,
  initialFiles,
  onSubmitSuccess,
  onDataUpdate
}) {

// 2. Add agent banner at top
<div className="agent-banner">
  <AlertCircle size={20} />
  <span>
    You're completing this questionnaire on behalf of <strong>{clientName}</strong>
  </span>
</div>

// 3. Update API endpoints
// Instead of: /api/client/property/${dealId}/questionnaire
// Use: /api/agent/leads/${dealId}/questionnaire

// 4. Update file upload endpoints
// Instead of: /api/client/property/${dealId}/upload
// Use: /api/agent/leads/${dealId}/upload

// 5. Keep ALL features:
// - 5 sections (not 4)
// - 50+ questions from schema
// - Conditional fields (nested)
// - File uploads with HubSpot
// - Progress tracking
// - Validation
// - Save progress button
```

**Acceptance Criteria:**
- [ ] Component renders all 5 sections from schema
- [ ] All 50+ questions display correctly
- [ ] Conditional logic works (fields show/hide based on answers)
- [ ] File upload works with agent endpoints
- [ ] Progress bar shows completion percentage
- [ ] Validation prevents submission with missing required fields
- [ ] Save progress button works
- [ ] Agent banner displays client name

---

### Task 2.2: Replace CreateLeadStep2 with Full Questionnaire
**Priority:** HIGH
**Effort:** 1 hour
**Status:** ❌ Not started

**Description:**
Replace the simplified CreateLeadStep2.jsx with the full PropertyQuestionnaireAgent component.

**Files:**
```
Modify: frontend/agent-portal/src/components/dashboard/CreateLeadStep2.jsx
```

**Implementation:**
```jsx
// OLD: Simplified questionnaire (DELETE)
// NEW: Import and use full component

import React from 'react';
import PropertyQuestionnaireAgent from './PropertyQuestionnaireAgent';

export default function CreateLeadStep2({ formData, updateFormData }) {
  const handleQuestionnaireUpdate = (dealId, questionnaireData) => {
    updateFormData({
      questionnaireData
    });
  };

  return (
    <div className="step-content questionnaire-step">
      <PropertyQuestionnaireAgent
        dealId={null} // No dealId yet (creating new lead)
        clientName={formData.primarySeller.fullName || 'the client'}
        isAgentContext={true}
        initialData={formData.questionnaireData || {}}
        initialFiles={{}}
        onDataUpdate={handleQuestionnaireUpdate}
        // No onSubmitSuccess - wizard handles submission
      />
    </div>
  );
}
```

**Special Considerations:**
- Deal doesn't exist yet (creating new lead), so `dealId` is null
- Need to handle "save progress" differently (save to parent form state, not backend)
- File uploads might need to be deferred until deal is created
  - **Option A:** Disable file uploads until Step 3 (after deal creation)
  - **Option B:** Store files locally, upload after deal creation
  - **Recommendation:** Option A for simplicity

**Acceptance Criteria:**
- [ ] CreateLeadStep2 now shows full 50+ question questionnaire
- [ ] Data flows correctly to parent CreateLeadModal
- [ ] Progress saves to modal form state
- [ ] No errors when navigating between wizard steps

---

### Task 2.3: Handle File Uploads in Wizard Context
**Priority:** MEDIUM
**Effort:** 1 hour
**Status:** ❌ Not started

**Description:**
Decide how to handle file uploads when creating a new lead (deal doesn't exist yet in HubSpot).

**Options:**

**Option A: Disable File Uploads Until Deal Creation (RECOMMENDED)**
```jsx
// In PropertyQuestionnaireAgent
const canUploadFiles = dealId !== null;

{config.formFieldType === 'file' && (
  canUploadFiles ? (
    <input type="file" ... />
  ) : (
    <div className="file-upload-disabled">
      <p>File uploads will be available after creating the lead.</p>
      <p>You can add files later from the lead details view.</p>
    </div>
  )
)}
```

**Option B: Store Files Locally, Upload After Deal Creation**
- Store files in memory/state during wizard
- Upload all files after deal is created in Step 3
- More complex but better UX

**Option C: Allow File Uploads for Existing Leads Only**
- Questionnaire in wizard: no file uploads
- Questionnaire in edit mode (existing lead): file uploads enabled
- Requires two modes of operation

**Recommendation:** Option A
- Simplest implementation
- Clear user expectation
- Can add files later from lead details view

**Acceptance Criteria:**
- [ ] File upload fields show appropriate message when dealId is null
- [ ] File upload works when editing existing leads
- [ ] No errors thrown when file fields are rendered without dealId

---

## Phase 3: Integration with CreateLeadModal ⏱️ Est: 2-3 hours

### Task 3.1: Update CreateLeadModal Data Flow
**Priority:** HIGH
**Effort:** 1 hour
**Status:** ❌ Not started

**Description:**
Update the CreateLeadModal to properly handle the full questionnaire data structure.

**Files:**
```
Modify: frontend/agent-portal/src/components/dashboard/CreateLeadModal.jsx
```

**Changes Needed:**

```jsx
// 1. Expand questionnaireData in formData state
const [formData, setFormData] = useState({
  propertyAddress: '',
  numberOfOwners: '1',
  primarySeller: { fullName: '', email: '', mobile: '', address: '' },
  additionalSellers: [],

  // EXPAND THIS: Should hold all 50+ fields
  questionnaireData: {
    // Section 1 fields
    body_corporate: '',
    registered_encumbrances: '',
    // ... all 50+ fields from schema
  },

  sendInvitation: true
});

// 2. Update validation to check questionnaire completion
const handleNext = () => {
  if (currentStep === 2) {
    // Check if required questionnaire fields are filled
    const missingFields = validateQuestionnaireFields(formData.questionnaireData);
    if (missingFields.length > 0) {
      setError(`Please complete required fields: ${missingFields.join(', ')}`);
      return;
    }
  }
  // ... rest of validation
};
```

**Acceptance Criteria:**
- [ ] formData.questionnaireData stores all 50+ fields
- [ ] Data persists when navigating between wizard steps
- [ ] Step 3 (Review) can access and display questionnaire data
- [ ] Validation works before allowing Step 2 → Step 3

---

### Task 3.2: Update CreateLeadStep3 (Review Screen)
**Priority:** MEDIUM
**Effort:** 1.5 hours
**Status:** ❌ Not started

**Description:**
Update the review screen to display questionnaire completion summary.

**Files:**
```
Modify: frontend/agent-portal/src/components/dashboard/CreateLeadStep3.jsx
```

**Implementation:**
```jsx
// Calculate questionnaire completion
const totalFields = Object.keys(propertyMapping).length; // Need to import propertyMapping
const filledFields = Object.keys(formData.questionnaireData).filter(
  key => formData.questionnaireData[key] && formData.questionnaireData[key] !== ''
).length;
const completionPercentage = Math.round((filledFields / totalFields) * 100);

// Display summary
<div className="questionnaire-summary-card">
  <h3>Property Questionnaire</h3>
  <div className="progress-bar">
    <div className="progress-fill" style={{ width: `${completionPercentage}%` }} />
  </div>
  <p>{completionPercentage}% Complete ({filledFields} of {totalFields} fields)</p>

  {completionPercentage < 100 && (
    <div className="warning-message">
      <AlertCircle size={16} />
      <span>Some optional fields are not completed. Client can fill these later.</span>
    </div>
  )}

  {completionPercentage === 100 && (
    <div className="success-message">
      <CheckCircle size={16} />
      <span>All questionnaire fields completed!</span>
    </div>
  )}

  <button className="btn-link" onClick={() => setCurrentStep(2)}>
    Edit Questionnaire
  </button>
</div>
```

**Acceptance Criteria:**
- [ ] Review screen shows questionnaire completion percentage
- [ ] Shows count of filled vs total fields
- [ ] Warning shown if incomplete
- [ ] "Edit Questionnaire" button navigates back to Step 2
- [ ] Visual indicator (progress bar) for completion

---

### Task 3.3: Update Backend Lead Creation Endpoint
**Priority:** HIGH
**Effort:** 1 hour
**Status:** ❌ Not started

**Description:**
Ensure the backend lead creation endpoint properly saves all 50+ questionnaire fields to HubSpot deal properties.

**Files:**
```
Modify/Create: backend/src/routes/agent.js
Modify/Create: backend/src/services/workflows/agent-lead-creation.js
```

**Implementation:**
```javascript
// POST /api/agent/leads/create
router.post('/leads/create', agentAuth, async (req, res) => {
  const {
    client,
    additionalSellers,
    property,
    questionnaireData,  // This now contains 50+ fields
    sendInvitation,
    isDraft
  } = req.body;

  // ... create contacts, get agency ...

  // Create deal with ALL questionnaire data
  const dealData = {
    dealname: `${property.address} - ${client.firstname} ${client.lastname}`,
    dealstage: isDraft ? 'draft' : '1923713518',
    pipeline: 'default',
    property_address: property.address,
    number_of_owners: property.number_of_owners || '1',

    // IMPORTANT: Spread all questionnaire data (50+ fields)
    ...questionnaireData
  };

  // Map form field names to HubSpot property names
  const mappedData = mapFormFieldsToHubSpot(questionnaireData);
  const finalDealData = { ...dealData, ...mappedData };

  const deal = await createDealWithAssociations(finalDealData, associations);

  // ... rest of endpoint
});

// Helper function to map form fields to HubSpot properties
function mapFormFieldsToHubSpot(questionnaireData) {
  const propertyMapping = require('../config/propertyMapping'); // or load from schema
  const mappedData = {};

  Object.entries(questionnaireData).forEach(([formFieldName, value]) => {
    const config = propertyMapping[formFieldName];
    if (config && config.hsPropertyName) {
      mappedData[config.hsPropertyName] = value;
    }
  });

  return mappedData;
}
```

**Acceptance Criteria:**
- [ ] Backend accepts all 50+ questionnaire fields
- [ ] Fields are correctly mapped to HubSpot property names
- [ ] Deal is created with all data in HubSpot
- [ ] Agent can see the data in HubSpot after creation
- [ ] Client can see the pre-filled data when they log in

---

## Phase 4: Testing & Polish ⏱️ Est: 2-3 hours

### Task 4.1: Test Full Questionnaire Flow
**Priority:** HIGH
**Effort:** 1.5 hours
**Status:** ❌ Not started

**Test Cases:**

| Test Case | Description | Expected Result | Status |
|-----------|-------------|-----------------|--------|
| TC-1 | Agent opens Create Lead modal | Modal opens, Step 1 visible | ⬜ |
| TC-2 | Fill Step 1, click Next | Step 2 shows full questionnaire (5 sections) | ⬜ |
| TC-3 | Fill required fields in Section 1 | Fields save to form state | ⬜ |
| TC-4 | Answer question with conditional follow-up | Conditional field appears | ⬜ |
| TC-5 | Navigate to Section 2, 3, 4, 5 | All sections render correctly | ⬜ |
| TC-6 | Click Back to Step 1 | Data persists in questionnaire | ⬜ |
| TC-7 | Return to Step 2, continue | All filled data still present | ⬜ |
| TC-8 | Navigate to Step 3 (Review) | Shows completion percentage | ⬜ |
| TC-9 | Submit with 50% completion | Warning shown but allows submission | ⬜ |
| TC-10 | Submit with 100% completion | Success, deal created in HubSpot | ⬜ |
| TC-11 | Check HubSpot deal properties | All 50+ fields saved correctly | ⬜ |
| TC-12 | Client logs in to portal | Sees pre-filled questionnaire data | ⬜ |

**Acceptance Criteria:**
- [ ] All test cases pass
- [ ] No console errors during flow
- [ ] Data persists correctly across steps
- [ ] HubSpot receives all fields

---

### Task 4.2: Test Conditional Logic (Nested)
**Priority:** HIGH
**Effort:** 1 hour
**Status:** ❌ Not started

**Description:**
Test that nested conditional fields work correctly (e.g., Section 2 tenancy conditionals).

**Test Scenarios:**
```
Scenario 1: Simple Conditional
1. Is there a tenancy agreement? → Select "No"
2. Lease date fields should NOT appear
3. Select "Yes"
4. Lease date fields should appear

Scenario 2: Nested Conditional (if exists)
1. Parent question → Select trigger value
2. Child question appears
3. Child question → Select trigger value
4. Grandchild question appears
5. Change parent to non-trigger value
6. Both child and grandchild should disappear
7. Check that cleared fields don't submit to backend

Scenario 3: Multiple Conditionals in Same Section
1. Answer Question A → triggers Field B
2. Answer Question C → triggers Field D
3. Both Field B and D should be visible
4. Change Question A → Field B disappears, Field D still visible
```

**Acceptance Criteria:**
- [ ] All conditional fields show/hide correctly
- [ ] Nested conditionals work (3+ levels deep)
- [ ] Hidden fields are cleared from form data
- [ ] No orphaned data submitted to backend

---

### Task 4.3: Styling and UX Polish
**Priority:** MEDIUM
**Effort:** 30 mins
**Status:** ❌ Not started

**Description:**
Polish the UI to match agent portal theme and ensure good UX.

**Checklist:**
- [ ] Agent banner has distinctive styling (color, icon)
- [ ] Questionnaire fits well in modal (no overflow issues)
- [ ] Section tabs are visible and clickable
- [ ] Progress bar animates smoothly
- [ ] Validation errors are clearly visible
- [ ] Save progress button has visual feedback
- [ ] Loading states during API calls
- [ ] Responsive design (works on laptop screens)

**Color Scheme Adjustments:**
```css
/* Agent-specific overrides in property-questionnaire.css */
.agent-banner {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 16px;
  border-radius: 8px;
  margin-bottom: 24px;
  display: flex;
  align-items: center;
  gap: 12px;
}

.property-questionnaire-container.agent-context {
  /* Adjust for modal */
  max-height: 600px;
  overflow-y: auto;
}
```

**Acceptance Criteria:**
- [ ] UI looks professional and polished
- [ ] No visual bugs or layout issues
- [ ] Colors match agent portal theme
- [ ] Typography consistent with rest of portal

---

## Phase 5: Documentation & Handoff ⏱️ Est: 1 hour

### Task 5.1: Update Implementation Plan
**Priority:** LOW
**Effort:** 30 mins
**Status:** ❌ Not started

**Description:**
Update the AGENT_DASHBOARD_IMPLEMENTATION_PLAN.md to reflect completed implementation.

**Changes:**
- [x] Mark Step 2 implementation as complete
- [x] Update "Next Steps" checklist
- [x] Add notes about file upload limitations in wizard

**Acceptance Criteria:**
- [ ] Documentation is up to date
- [ ] Reflects actual implementation
- [ ] Notes any deviations from original plan

---

### Task 5.2: Create Testing Guide
**Priority:** LOW
**Effort:** 30 mins
**Status:** ❌ Not started

**Description:**
Document how to test the agent questionnaire feature end-to-end.

**Guide Should Include:**
- Environment setup (API base URL, auth)
- Step-by-step test flow
- Screenshots of expected UI
- Known limitations (file uploads)
- Troubleshooting common issues

**Acceptance Criteria:**
- [ ] Testing guide created
- [ ] Anyone can follow guide to test feature
- [ ] Covers both happy path and edge cases

---

## Summary Checklist

### Critical Path (Must Complete)
- [ ] Copy useQuestionnaireSchema hook
- [ ] Copy property-questionnaire.css
- [ ] Create PropertyQuestionnaireAgent component (50+ questions, 5 sections)
- [ ] Replace CreateLeadStep2 with full questionnaire
- [ ] Update CreateLeadModal data flow
- [ ] Update backend lead creation endpoint
- [ ] Test full flow end-to-end

### Important (Should Complete)
- [ ] Handle file uploads in wizard context
- [ ] Update CreateLeadStep3 review screen
- [ ] Test conditional logic (nested)
- [ ] Verify backend API endpoints for agent context

### Nice to Have (Optional)
- [ ] Styling and UX polish
- [ ] Update documentation
- [ ] Create testing guide

---

## Estimated Timeline

| Phase | Tasks | Estimated Time | Dependencies |
|-------|-------|----------------|--------------|
| Phase 1: Setup | 3 tasks | 1-2 hours | None |
| Phase 2: Component | 3 tasks | 3-4 hours | Phase 1 |
| Phase 3: Integration | 3 tasks | 2-3 hours | Phase 2 |
| Phase 4: Testing | 3 tasks | 2-3 hours | Phase 3 |
| Phase 5: Docs | 2 tasks | 1 hour | Phase 4 |
| **Total** | **14 tasks** | **9-13 hours** | - |

**Realistic Timeline:** 2-3 days (accounting for testing, debugging, and polish)

---

## Risk Assessment

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| File upload complexity in wizard | High | Medium | Disable file uploads until after deal creation |
| Backend endpoints don't exist for agent context | High | Low | Create new agent routes, reuse existing logic |
| Conditional logic breaks in agent context | Medium | Low | Copy exact logic from client portal |
| Modal overflow/scroll issues | Low | Medium | Add max-height and scrolling to questionnaire container |
| Performance with 50+ fields in modal | Low | Low | React handles this fine, use same approach as client portal |

---

## Success Criteria

**Feature is complete when:**
1. ✅ Agent can create a new lead and fill out the **full 50+ question questionnaire** (not simplified)
2. ✅ All 5 sections are accessible and functional
3. ✅ Conditional fields work correctly (including nested conditionals)
4. ✅ Data saves to HubSpot deal properties when lead is created
5. ✅ Client can log in and see pre-filled questionnaire data
6. ✅ Progress bar shows accurate completion percentage
7. ✅ Validation prevents submission with missing required fields
8. ✅ UI is polished and matches agent portal theme
9. ✅ No console errors or warnings
10. ✅ End-to-end test passes all test cases

---

## Questions for Stakeholder

Before starting implementation, clarify:

1. **File Uploads:** Should agents be able to upload files during lead creation, or only after the deal is created?
   - **Recommendation:** Only after deal creation (simpler)

2. **Validation:** Should Step 2 → Step 3 require 100% completion, or allow partial completion?
   - **Current client portal:** Allows partial, validates on final submit
   - **Recommendation:** Allow partial (agent can fill basics, client completes rest)

3. **Save Progress:** Should "Save as Draft" in modal save questionnaire data to backend?
   - **Current:** Modal only saves locally, submits on "Send to Client Portal"
   - **Recommendation:** Keep current behavior (no backend save until final submit)

4. **Questionnaire Schema:** Is the backend schema endpoint working and accessible to agents?
   - **Need to verify:** GET /api/questionnaire/schema with agent JWT

---

## Next Steps

1. Review this task plan with team
2. Clarify questions above
3. Start with Phase 1 (Setup Infrastructure)
4. Implement incrementally, testing after each phase
5. Deploy and monitor for issues

**Ready to start?** Begin with Task 1.1 (Copy useQuestionnaireSchema Hook)
