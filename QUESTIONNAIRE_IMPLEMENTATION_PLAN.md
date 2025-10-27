# QUESTIONNAIRE IMPLEMENTATION PLAN
## Staged Form with HubSpot Integration

**Last Updated:** 2024-10-24
**Scope:** 5-Section Property Questionnaire with HubSpot Sync
**Priority:** High - Core Feature

---

## TABLE OF CONTENTS
1. [System Architecture Overview](#system-architecture-overview)
2. [Data Flow Diagram](#data-flow-diagram)
3. [Implementation Phases](#implementation-phases)
4. [Backend Implementation Plan](#backend-implementation-plan)
5. [Frontend Implementation Plan](#frontend-implementation-plan)
6. [HubSpot Integration Plan](#hubspot-integration-plan)
7. [Database/State Management](#databasestate-management)
8. [Error Handling & Resilience](#error-handling--resilience)
9. [Testing Strategy](#testing-strategy)
10. [Timeline & Milestones](#timeline--milestones)

---

## SYSTEM ARCHITECTURE OVERVIEW

### High-Level Components

```
┌─────────────────────────────────────────────────────────────────┐
│                      FRONTEND (React)                            │
├─────────────────────────────────────────────────────────────────┤
│  • QuestionnaireForm (5 sections, staged)                        │
│  • SectionRenderer (handles conditional logic)                   │
│  • FormStateManager (tracks changes & unsaved state)             │
│  • FileUploadManager (handles HubSpot file API)                  │
│  • ValidationEngine (real-time validation)                       │
└──────────────────────┬──────────────────────────────────────────┘
                       │
          (HTTP/REST API with JWT)
                       │
┌──────────────────────▼──────────────────────────────────────────┐
│                    BACKEND (Express.js)                          │
├─────────────────────────────────────────────────────────────────┤
│  • QuestionnaireService (form logic, validation)                 │
│  • QuestionnaireRepository (data persistence)                    │
│  • HubSpotSyncQueue (queue failed updates)                       │
│  • FileUploadService (HubSpot Files API integration)             │
│  • QuestionnaireRoutes (API endpoints)                           │
└──────────────────────┬──────────────────────────────────────────┘
                       │
          (HubSpot API, Queue/Cache)
                       │
┌──────────────────────▼──────────────────────────────────────────┐
│                  EXTERNAL SERVICES                               │
├─────────────────────────────────────────────────────────────────┤
│  • HubSpot API (Deals, Files, Properties)                        │
│  • Redis (optional: queue for failed syncs)                      │
│  • Local Storage/Session (unsaved changes warning)               │
└─────────────────────────────────────────────────────────────────┘
```

---

## DATA FLOW DIAGRAM

### 1. LOAD QUESTIONNAIRE
```
User Clicks "Property Questionnaire" (Stage 2)
    ↓
Frontend: GET /api/client/questionnaire/config
    ↓
Backend: Load questionnaire.json (or from config service)
    ↓
Frontend: GET /api/client/questionnaire/:dealId
    ↓
Backend: Fetch existing answers from HubSpot deal properties
    ↓
Frontend: Render Form with pre-filled data
```

### 2. EDIT & SAVE SECTION
```
User fills Section 1 questions
    ↓
Frontend: Real-time validation (show error messages)
    ↓
User clicks "Save & Continue"
    ↓
Frontend: POST /api/client/questionnaire/:dealId/section/1
    Body: { section: 1, formData: {...} }
    ↓
Backend: Validate all required fields
    ↓
Backend: Extract non-empty fields only
    ↓
Backend: Map form field names → HubSpot property names
    ↓
Backend: Prepare file uploads separately
    ↓
Backend: Upload files to HubSpot Files API (if any)
    ↓
Backend: Update deal properties with HubSpot API
    ↓
(If HubSpot API fails: Queue for retry)
    ↓
Frontend: Show success message
    ↓
Frontend: Enable next section button
```

### 3. HANDLE FILE UPLOAD
```
User selects file in browser
    ↓
Frontend: Validate file (size: 25MB, count: max 10)
    ↓
User clicks "Save & Continue"
    ↓
Frontend: Create FormData with file + section data
    ↓
POST /api/client/questionnaire/:dealId/upload
    ↓
Backend: Receive file stream
    ↓
Backend: Upload to HubSpot Files API
    ↓
HubSpot: Returns file ID
    ↓
Backend: Store file ID in deal property
    ↓
(If HubSpot Files API fails: Queue for retry)
```

### 4. UNSAVED CHANGES WARNING
```
User fills form → Don't click save
    ↓
User clicks "Close" or tries to navigate away
    ↓
Frontend: Detects unsaved changes
    ↓
Show Modal: "You have unsaved changes. Save, Discard, or Cancel?"
    ↓
If "Save": POST section data → close
If "Discard": Discard changes → close
If "Cancel": Stay on page
```

---

## IMPLEMENTATION PHASES

### PHASE 1: Backend Foundation (Week 1)
- [ ] Create questionnaire configuration service
- [ ] Create questionnaire routes & controllers
- [ ] Create HubSpot file upload service
- [ ] Create HubSpot sync queue/retry logic
- [ ] API endpoint testing (Postman)

### PHASE 2: Frontend Foundation (Week 1-2)
- [ ] Create QuestionnaireForm component structure
- [ ] Create SectionRenderer component
- [ ] Create FormStateManager hook
- [ ] Create real-time validation engine
- [ ] Create unsaved changes detection

### PHASE 3: Integration (Week 2)
- [ ] Connect frontend to backend APIs
- [ ] Implement file upload to HubSpot
- [ ] Test HubSpot property updates
- [ ] Test error handling & retries
- [ ] End-to-end testing

### PHASE 4: Polish & Optimization (Week 3)
- [ ] Mobile responsiveness testing
- [ ] Performance optimization
- [ ] Error message UX improvements
- [ ] Documentation
- [ ] Deployment

---

## BACKEND IMPLEMENTATION PLAN

### 1. QUESTIONNAIRE CONFIGURATION SERVICE

**File:** `/backend/src/services/questionnaire/configService.js`

**Responsibilities:**
- Load questionnaire.json (the JSON you provided)
- Cache it in memory
- Hot-reload on file changes
- Provide questionnaire structure to frontend

**Key Functions:**
```javascript
getQuestionnaireConfig()          // Returns full config
getSection(sectionNumber)         // Returns specific section
getQuestion(sectionNumber, qId)   // Returns specific question
getConditionalDependencies(qId)   // Returns what fields affect this field
```

### 2. QUESTIONNAIRE SERVICE

**File:** `/backend/src/services/domain/questionnaire.js`

**Responsibilities:**
- Validate form data against config
- Map frontend field names to HubSpot property names
- Filter empty fields
- Handle conditional field logic
- Track section completion

**Key Functions:**
```javascript
// Save section answers
saveSectionAnswers(dealId, sectionNumber, formData)
  → Validate required fields
  → Map to HubSpot properties
  → Return mapped data for sync

// Get existing answers
getExistingAnswers(dealId)
  → Fetch from HubSpot deal properties
  → Reverse-map HubSpot properties to form fields
  → Return filled form state

// Validate section
validateSection(sectionNumber, formData)
  → Check all required fields present
  → Validate field types & formats
  → Return validation errors

// Get completion percentage
getCompletionPercentage(dealId)
  → Count answered questions
  → Calculate per section
  → Return { totalQuestions, answered, percentage }
```

### 3. FILE UPLOAD SERVICE

**File:** `/backend/src/services/integrations/hubspot/fileService.js`

**Responsibilities:**
- Handle file uploads to HubSpot Files API
- Validate file size & type
- Handle errors with retry logic

**Key Functions:**
```javascript
// Upload file to HubSpot
uploadFile(file, dealId, questionField)
  → Validate file (size, type, count)
  → Upload to HubSpot Files API
  → Return file ID
  → Handle errors with queue

// Get file details
getFile(fileId)
  → Fetch file metadata from HubSpot

// Delete file
deleteFile(fileId)
  → Remove file from HubSpot
```

### 4. HUBSPOT SYNC QUEUE SERVICE

**File:** `/backend/src/services/integrations/hubspot/syncQueueService.js`

**Responsibilities:**
- Queue failed HubSpot updates
- Auto-retry with exponential backoff
- Track retry attempts
- Provide queue status

**Key Functions:**
```javascript
// Queue update for retry
queueUpdate(dealId, properties, retryCount = 0)
  → Store in cache/memory
  → If retryCount < 3: Schedule retry

// Process queue
processQueue()
  → Runs every 30 seconds
  → Retries all queued updates
  → Moves to error state if 3 retries exceeded

// Get queue status
getQueueStatus(dealId)
  → Returns pending, failed, successful updates
```

**Data Structure:**
```javascript
{
  id: 'uuid',
  dealId: 'xxx',
  properties: { body_corporate: 'Yes', ... },
  timestamp: Date,
  retryCount: 0,
  maxRetries: 3,
  status: 'pending' | 'failed' | 'success',
  error: 'error message'
}
```

### 5. QUESTIONNAIRE ROUTES

**File:** `/backend/src/routes/questionnaires.js`

**Endpoints:**

```
GET /api/client/questionnaire/config
  → Return full questionnaire configuration
  → Response: { sections: [...], questions: [...] }

POST /api/client/questionnaire/:dealId/section/:section
  → Save section answers
  → Body: { formData: { q1_1: 'Yes', q1_2: 'No', ... } }
  → Validates & syncs to HubSpot
  → Response: { success: true, completion: 45, errors: [] }

GET /api/client/questionnaire/:dealId
  → Get existing answers (prefill form)
  → Response: { section1: {...}, section2: {...}, ... }

POST /api/client/questionnaire/:dealId/upload
  → Upload file to HubSpot
  → Body: FormData { file, questionField }
  → Response: { fileId: 'xxx', fileName: '...' }

GET /api/client/questionnaire/:dealId/completion
  → Get completion status
  → Response: { totalQuestions: 50, answered: 23, percentage: 46 }
```

### 6. DATABASE SCHEMA (Optional - If Using DB)

**Note:** Can use HubSpot as source of truth, but optional local cache:

```sql
CREATE TABLE questionnaire_answers (
  id UUID PRIMARY KEY,
  deal_id VARCHAR(255) NOT NULL,
  contact_id VARCHAR(255) NOT NULL,
  section_number INT NOT NULL,
  form_data JSONB NOT NULL,
  hubspot_sync_status ENUM('pending', 'synced', 'failed'),
  synced_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(deal_id, section_number)
);

CREATE TABLE sync_queue (
  id UUID PRIMARY KEY,
  deal_id VARCHAR(255) NOT NULL,
  properties JSONB NOT NULL,
  retry_count INT DEFAULT 0,
  max_retries INT DEFAULT 3,
  status ENUM('pending', 'failed', 'success'),
  error_message TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

## FRONTEND IMPLEMENTATION PLAN

### 1. QUESTIONNAIRE FORM COMPONENT

**File:** `/frontend/client-portal/src/components/dashboard/QuestionnaireForm.jsx`

**Responsibilities:**
- Main form container
- Manage form state for all sections
- Track unsaved changes
- Handle save & continue flow
- Show progress indicator

**Structure:**
```jsx
<QuestionnaireForm dealId={dealId}>
  <SectionNavigator currentSection={section} />
  <SectionRenderer section={currentSection} />
  <FormActions onSave={handleSave} onNext={handleNext} />
  <UnsavedChangesModal />
</QuestionnaireForm>
```

### 2. SECTION RENDERER COMPONENT

**File:** `/frontend/client-portal/src/components/dashboard/SectionRenderer.jsx`

**Responsibilities:**
- Render all questions in a section
- Handle conditional field visibility
- Render appropriate input types
- Show validation errors in real-time

**Renders:**
```jsx
{section.questions.map(question => (
  <QuestionField
    key={question.form_field_name}
    question={question}
    value={formData[question.form_field_name]}
    onChange={handleChange}
    onBlur={handleBlur}
    error={validationErrors[question.form_field_name]}
    isVisible={shouldShowQuestion(question, formData)}
  />
))}
```

### 3. QUESTION FIELD COMPONENT

**File:** `/frontend/client-portal/src/components/dashboard/QuestionField.jsx`

**Renders Different Input Types:**
- Radio buttons (yes/no/unsure)
- Text input
- Textarea
- Date picker
- Number input (with 2 decimal validation)
- File upload (with HubSpot integration)

**Features:**
- Real-time validation
- Show error message below field
- Show help text
- Show required indicator

### 4. FORM STATE MANAGER HOOK

**File:** `/frontend/client-portal/src/hooks/useQuestionnaireForm.js`

**Responsibilities:**
- Initialize form state from HubSpot data
- Track unsaved changes
- Handle form changes
- Validate on blur/change
- Prepare data for submission

**Interface:**
```javascript
const {
  formData,
  validationErrors,
  hasUnsavedChanges,
  isLoading,
  isSaving,
  handleChange,
  handleBlur,
  handleSave,
  resetForm,
  setFormData
} = useQuestionnaireForm(dealId);
```

### 5. VALIDATION ENGINE

**File:** `/frontend/client-portal/src/utils/validationEngine.js`

**Responsibilities:**
- Define field-level validators
- Provide real-time validation
- Return validation errors

**Validators:**
```javascript
validators = {
  required: (value) => value ? null : 'This field is required',
  radio: (value, options) => {
    const valid = options.some(o => o.value === value);
    return valid ? null : 'Please select an option';
  },
  number: (value, { maxDecimals = 2 }) => {
    const decimals = (value.split('.')[1] || '').length;
    return decimals > maxDecimals ? `Max ${maxDecimals} decimals` : null;
  },
  date: (value) => {
    return new Date(value).getTime() ? null : 'Invalid date';
  },
  file: (file, { maxSize = 25 * 1024 * 1024, maxCount = 10 }) => {
    if (file.size > maxSize) return `Max 25MB per file`;
    return null;
  }
}
```

### 6. FILE UPLOAD MANAGER

**File:** `/frontend/client-portal/src/services/fileUploadService.js`

**Responsibilities:**
- Handle file selection
- Validate file before upload
- Upload to HubSpot via backend
- Show upload progress
- Handle errors

**Functions:**
```javascript
uploadFile(file, dealId, questionField)
  → Validate file
  → Create FormData
  → POST /api/client/questionnaire/:dealId/upload
  → Return file ID or error

validateFile(file)
  → Check size (25MB max)
  → Check type (pdf, doc, docx, jpg, png, gif)
  → Check total count
```

### 7. CONDITIONAL LOGIC ENGINE

**File:** `/frontend/client-portal/src/utils/conditionalLogic.js`

**Responsibilities:**
- Determine which questions/fields to show
- Handle nested conditionals (any depth)
- Evaluate conditional expressions

**Functions:**
```javascript
shouldShowQuestion(question, formData)
  → If question.conditional === false: return true
  → If conditional: evaluate conditional_on
  → Return boolean

evaluateConditional(conditional, formData)
  → If conditional.question exists:
    - Get parent question value from formData
    - Compare to conditional.value
    - Return true/false
  → Handle nested: check parent's conditional first
```

**Example Nested Conditional:**
```javascript
// Question 1: "Body corporate?"
// Question 1a: "Details?" (shows if Q1 = yes)
// Question 1a-i: "Date?" (shows if Q1a has value)

shouldShowQuestion(q1a, { body_corporate: 'yes' })
  → true (parent condition met)

shouldShowQuestion(q1ai, { body_corporate: 'yes', body_corporate_details: 'xxx' })
  → true (parent has value)
```

### 8. UNSAVED CHANGES DETECTION

**File:** `/frontend/client-portal/src/hooks/useUnsavedChanges.js`

**Responsibilities:**
- Track if form has unsaved changes
- Warn on page/tab close
- Warn on navigation

**Features:**
```javascript
// Track changes
const hasUnsavedChanges = useMemo(() => {
  return JSON.stringify(formData) !== JSON.stringify(initialData);
}, [formData, initialData]);

// Warn on browser close/refresh
useEffect(() => {
  const handleBeforeUnload = (e) => {
    if (hasUnsavedChanges) {
      e.preventDefault();
      e.returnValue = 'You have unsaved changes...';
    }
  };
  window.addEventListener('beforeunload', handleBeforeUnload);
  return () => window.removeEventListener('beforeunload', handleBeforeUnload);
}, [hasUnsavedChanges]);

// Warn on navigation
useEffect(() => {
  const handleBlockedNavigation = (location) => {
    if (hasUnsavedChanges) {
      return 'You have unsaved changes...';
    }
  };
  return navigate.block(handleBlockedNavigation);
}, [hasUnsavedChanges, navigate]);
```

---

## HUBSPOT INTEGRATION PLAN

### 1. PROPERTY MAPPING

**File:** `/backend/src/config/questionnairePropertyMap.js`

**Mapping Structure:**
```javascript
const propertyMap = {
  'body_corporate': {
    hsProperty: 'body_corporate',
    hsType: 'enumeration',
    required: true
  },
  'registered_encumbrances': {
    hsProperty: 'registered_encumbrances',
    hsType: 'enumeration',
    required: true
  },
  'registered_encumbrances_details': {
    hsProperty: 'registered_encumbrance_details',
    hsType: 'string',
    required: false
  },
  // ... all 50+ properties
};
```

### 2. FILE UPLOAD TO HUBSPOT

**Process:**
1. Frontend sends file to backend
2. Backend uploads to HubSpot Files API
3. HubSpot returns file ID
4. Backend stores file ID in deal property
5. If HubSpot API fails: queue for retry

**HubSpot Files API:**
```javascript
// Upload file
POST https://api.hubapi.com/files/v3/files
Headers:
  - Authorization: Bearer {API_KEY}
  - Content-Type: {file.type}
Body: file stream

// Response
{
  id: 'xxx',
  name: 'document.pdf',
  size: 1024,
  created: '2024-01-01T00:00:00Z',
  url: 'https://cdn.hubapi.com/...'
}
```

### 3. DEAL PROPERTY UPDATE

**Process:**
1. Collect all section answers
2. Map to HubSpot property names
3. Filter empty fields
4. Handle file IDs (from Files API)
5. Batch update deal

**HubSpot CRM API:**
```javascript
// Update deal properties
PATCH https://api.hubapi.com/crm/v3/objects/deals/{dealId}
Headers:
  - Authorization: Bearer {API_KEY}
Body:
{
  properties: {
    body_corporate: 'Yes',
    registered_encumbrances: 'No',
    registered_encumbrance_details: '',  // excluded from actual update
    tenancy_agreement: 'Yes',
    weekly_rent: '500.00',
    tenancy_agreement_upload: 'file-id-xxx',
    ...
  }
}

// Response
{
  id: 'deal-id',
  properties: {
    body_corporate: { value: 'Yes', timestamp: ... },
    ...
  },
  associations: { ... }
}
```

### 4. SYNC QUEUE RETRY LOGIC

**Auto-Retry Strategy:**
```javascript
// Attempt 1: Immediate on save
// If fails → Queue for retry

// Attempt 2: After 30 seconds
// If fails → Queue for retry

// Attempt 3: After 5 minutes
// If fails → Queue for retry

// After 3 failed attempts:
// → Show error to user: "Network error. Please try again in a few minutes."
// → Store error in sync queue for manual review
// → Expose sync queue in admin panel (for retry)
```

---

## DATABASE/STATE MANAGEMENT

### FRONTEND STATE MANAGEMENT

**Use:** React Context + Hooks (no Redux needed for simplicity)

**State Structure:**
```javascript
{
  // Form data
  formData: {
    section_1: { body_corporate: 'Yes', ... },
    section_2: { tenancy_agreement: 'No', ... },
    ...
  },

  // Validation errors
  validationErrors: {
    body_corporate: 'This field is required',
    ...
  },

  // UI state
  currentSection: 1,
  isLoading: false,
  isSaving: false,
  hasUnsavedChanges: false,
  saveError: null,

  // Completion tracking
  completionPercentage: 0,
  sectionCompletion: { 1: 100, 2: 50, 3: 0, ... }
}
```

### BACKEND STATE MANAGEMENT

**Option 1: HubSpot as Source of Truth (Recommended)**
- No database needed
- All answers stored in deal properties
- Fetch from HubSpot on form load
- Update HubSpot on save

**Option 2: Local DB Cache**
- Store answers in PostgreSQL
- Sync to HubSpot asynchronously
- Allows offline/draft mode
- More complex to maintain

**Recommendation:** Use Option 1 (HubSpot as truth) for MVP

---

## ERROR HANDLING & RESILIENCE

### 1. NETWORK ERROR HANDLING

**Auto-Retry on Failed Section Save:**
```javascript
const handleSave = async () => {
  let lastError = null;

  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      await api.post(`/client/questionnaire/${dealId}/section/${section}`, formData);
      showSuccess('Section saved successfully');
      return;
    } catch (error) {
      lastError = error;
      if (attempt < 3) {
        // Exponential backoff: 1s, 5s, 30s
        await sleep([1000, 5000, 30000][attempt - 1]);
      }
    }
  }

  // After 3 failed attempts
  showError('Network error. Please try again in a few minutes.');
};
```

### 2. VALIDATION ERROR HANDLING

**Frontend:**
```javascript
// Real-time validation
const handleBlur = (field) => {
  const error = validateField(field, formData[field]);
  if (error) {
    setValidationErrors(prev => ({ ...prev, [field]: error }));
  }
};

// On save, prevent if errors exist
const handleSave = () => {
  const sectionErrors = validateSection(currentSection, formData);
  if (Object.keys(sectionErrors).length > 0) {
    setValidationErrors(sectionErrors);
    showError('Please fix errors before saving');
    return;
  }
  // Proceed with save
};
```

**Backend:**
```javascript
// Validate before HubSpot sync
const saveSectionAnswers = (dealId, section, formData) => {
  const errors = questionnaireService.validateSection(section, formData);
  if (Object.keys(errors).length > 0) {
    return { success: false, errors };
  }

  // Proceed with HubSpot update
  return syncToHubSpot(dealId, formData);
};
```

### 3. FILE UPLOAD ERROR HANDLING

**Frontend:**
```javascript
const handleFileUpload = async (file) => {
  // Validate before upload
  const fileError = validateFile(file);
  if (fileError) {
    showError(fileError);
    return;
  }

  // Upload with retry
  const fileId = await fileUploadService.uploadFile(file, dealId, questionField);
  if (!fileId) {
    showError('File upload failed. Please try again.');
    return;
  }

  // Store file ID in form data
  setFormData(prev => ({
    ...prev,
    [questionField]: fileId
  }));
};
```

### 4. HUBSPOT SYNC ERROR HANDLING

**Backend:**
```javascript
// Queue failed updates
const syncToHubSpot = async (dealId, properties) => {
  try {
    return await hubspotAPI.updateDeal(dealId, properties);
  } catch (error) {
    // Queue for retry
    syncQueueService.queueUpdate(dealId, properties, 0);
    throw error;
  }
};

// Process queue every 30 seconds
setInterval(async () => {
  const queue = syncQueueService.getPendingUpdates();
  for (const item of queue) {
    try {
      await hubspotAPI.updateDeal(item.dealId, item.properties);
      syncQueueService.markSuccess(item.id);
    } catch (error) {
      item.retryCount++;
      if (item.retryCount >= 3) {
        syncQueueService.markFailed(item.id, error.message);
      } else {
        syncQueueService.queueUpdate(item.dealId, item.properties, item.retryCount);
      }
    }
  }
}, 30000);
```

---

## TESTING STRATEGY

### UNIT TESTS

**Frontend:**
- [ ] Validation Engine
  - Test each validator (required, radio, number, date, file)
  - Test with valid & invalid inputs
- [ ] Conditional Logic Engine
  - Test nested conditionals
  - Test all dependency paths
- [ ] Form State Manager
  - Test form initialization
  - Test form changes
  - Test unsaved changes detection

**Backend:**
- [ ] Questionnaire Service
  - Test validateSection()
  - Test property mapping
  - Test field filtering
- [ ] File Upload Service
  - Test file validation
  - Test HubSpot API integration
- [ ] Sync Queue Service
  - Test queue operations
  - Test retry logic

### INTEGRATION TESTS

- [ ] Frontend → Backend
  - Test /api/client/questionnaire/:dealId/section/:section
  - Test file upload endpoint
  - Test completion endpoint
- [ ] Backend → HubSpot
  - Test deal property updates
  - Test file upload to HubSpot
  - Test retry queue processing
- [ ] E2E Flow
  - Fill section → Save → Verify HubSpot update
  - Upload file → Verify in HubSpot

### MANUAL TESTS

- [ ] Mobile responsiveness
  - Test on iPhone, Android
  - Test file upload from phone camera
- [ ] Error scenarios
  - Network disconnect during save
  - Invalid file upload
  - HubSpot API down
- [ ] Edge cases
  - Very long text input
  - Multiple rapid saves
  - Switch sections during save

---

## TIMELINE & MILESTONES

### WEEK 1
- **Day 1-2:** Backend setup (questionnaire config, validation service)
- **Day 3-4:** File upload service, HubSpot sync queue
- **Day 5:** API routes, testing with Postman

### WEEK 2
- **Day 1-2:** Frontend components (QuestionnaireForm, SectionRenderer)
- **Day 3-4:** Validation engine, conditional logic
- **Day 5:** File upload integration

### WEEK 3
- **Day 1-2:** Testing, bug fixes
- **Day 3-4:** Mobile responsiveness, optimization
- **Day 5:** Documentation, deployment prep

### WEEK 4
- **Day 1-2:** Staging environment testing
- **Day 3-4:** Production deployment
- **Day 5:** Monitoring, post-launch support

---

## KEY FILES TO CREATE

### Backend
- `/backend/src/services/questionnaire/configService.js`
- `/backend/src/services/domain/questionnaire.js`
- `/backend/src/services/integrations/hubspot/fileService.js`
- `/backend/src/services/integrations/hubspot/syncQueueService.js`
- `/backend/src/routes/questionnaires.js`
- `/backend/src/config/questionnairePropertyMap.js`
- `/backend/src/config/questionnaire.json` (or load from file)

### Frontend
- `/frontend/client-portal/src/components/dashboard/QuestionnaireForm.jsx`
- `/frontend/client-portal/src/components/dashboard/SectionRenderer.jsx`
- `/frontend/client-portal/src/components/dashboard/QuestionField.jsx`
- `/frontend/client-portal/src/hooks/useQuestionnaireForm.js`
- `/frontend/client-portal/src/hooks/useUnsavedChanges.js`
- `/frontend/client-portal/src/utils/validationEngine.js`
- `/frontend/client-portal/src/utils/conditionalLogic.js`
- `/frontend/client-portal/src/services/fileUploadService.js`
- `/frontend/client-portal/src/styles/questionnaire.css`

---

## DEPENDENCIES TO ADD

### Backend
```bash
npm install --save-dev @types/multer multer-s3  # For file handling
npm install dotenv                               # For env config
# Note: axios already installed for HubSpot API calls
```

### Frontend
```bash
npm install date-fns                             # Date formatting/validation
npm install uuid                                 # For unique IDs
# Note: React already available
```

---

## NEXT STEPS

1. **Review this plan** with team
2. **Clarify any ambiguities**
3. **Break down into GitHub Issues** with acceptance criteria
4. **Assign to developers**
5. **Start Phase 1 (Backend Foundation)**

---

## QUESTIONS FOR CLARIFICATION

1. Should questionnaire be accessible from Stage 2 only, or all stages?
2. Should completion percentage be visible to users?
3. Should there be a "Save Draft" button separate from "Save & Continue"?
4. Do you want email notifications when all sections are completed?
5. Should admins see sync queue status in admin panel?

