# Implementation Plan: Interactive Primary Seller Information Review Tour

## Overview
Replace alert prompts with an interactive Shepherd.js tour that guides users through each Primary Seller field, allows editing, requires confirmation before proceeding, and finally guides them to the "Information Reviewed" button.

---

## Phase 1: Install Dependencies

### 1.1 Install Shepherd.js
```bash
cd frontend
npm install shepherd.js
```

### 1.2 Verify Installation
Check `frontend/package.json` to confirm `shepherd.js` is added to dependencies.

---

## Phase 2: Remove Alert Prompts

### 2.1 Update PropertyInformation.jsx
**File:** `frontend/client-portal/src/components/dashboard/PropertyInformation.jsx`

**Remove lines 108-122** (alert validation logic):
- Remove Client Residential Address validation alert
- Remove Middle Name prompt alert
- Keep only the try-catch block for stage progression

---

## Phase 3: Make Fields Editable by Default

### 3.1 Update PropertyInformation.jsx State
- Change `editMode` default from `false` to `true` (line 23)
- Initialize `editedData` in useEffect when `propertyData` loads
- Remove `handleEdit` function (no longer needed)
- Remove "Edit" button from UI

### 3.2 Update Button UI
- Remove conditional rendering based on `editMode`
- Always show "Save Changes" and "Information Reviewed ✓" buttons
- Remove "Cancel" button (or keep it but remove edit mode toggle)

---

## Phase 4: Create Interactive Tour Component

### 4.1 Create Tour File
**File:** `frontend/client-portal/src/components/dashboard/PrimarySellerTour.js`

**Key Features:**
- Each step highlights one field
- One-line explanation for legal/compliance reason
- "Confirm" button to proceed (only enabled after user can edit)
- "Skip" option available
- Final step guides to "Information Reviewed" button

**Tour Steps:**
1. Welcome step
2. First Name field
3. Last Name field
4. Middle Name field (critical)
5. Email Address field
6. Mobile Phone field
7. Client Residential Address field (critical)
8. Final step - guide to "Information Reviewed" button

---

## Phase 5: Add Data Attributes to Fields

### 5.1 Update SellerInformation.jsx
Add `data-tour-target` attributes to all Primary Seller input fields:
- `data-tour-target="first-name"`
- `data-tour-target="last-name"`
- `data-tour-target="middle-name"`
- `data-tour-target="email"`
- `data-tour-target="mobile"`

### 5.2 Update PropertyDetails.jsx
Add `data-tour-target="residential-address"` to Client Residential Address field.

---

## Phase 6: Integrate Tour into PropertyInformation

### 6.1 Add Tour State Management
- Add `tourRef` using `useRef`
- Add `tourStarted` state
- Add `confirmedFields` state to track which fields have been confirmed

### 6.2 Auto-start Logic
- Check if critical fields (middle name, residential address) are missing
- Check localStorage for tour completion flag
- Auto-start tour if conditions met
- Store completion flag after tour finishes

### 6.3 Tour Event Handlers
- Handle tour completion
- Handle tour cancellation
- Track field confirmations
- Enable "Confirm" button only when field is editable

---

## Phase 7: Custom Styling

### 7.1 Create CSS File
**File:** `frontend/client-portal/src/components/dashboard/primary-seller-tour.css`

**Styling Requirements:**
- Compact design (one-line messages)
- Highlight active field
- Clear "Confirm" button styling
- Smooth transitions

---

## Phase 8: Field Confirmation Logic

### 8.1 Confirmation Flow
For each field step:
1. Tour highlights field
2. User can edit field value
3. "Confirm" button becomes enabled
4. User clicks "Confirm" → moves to next field
5. Track confirmed fields in state

### 8.2 Final Step
- After all fields confirmed, highlight "Information Reviewed ✓" button
- Explain that they can now proceed
- Tour completes when button is clicked

---

## Detailed Implementation Steps

### Step 1: Install Shepherd.js
```bash
cd frontend
npm install shepherd.js
```

### Step 2: Remove Alerts from PropertyInformation.jsx
- Delete lines 108-122
- Keep only the try-catch block starting at line 124

### Step 3: Update PropertyInformation.jsx - Make Editable by Default
- Line 23: `const [editMode, setEditMode] = useState(true);`
- Add useEffect to initialize editedData when propertyData loads
- Remove handleEdit function
- Update button rendering (remove Edit button, always show Save + Review buttons)

### Step 4: Create PrimarySellerTour.js
- Import Shepherd
- Create tour with 8 steps (welcome + 6 fields + final)
- Each step has one-line explanation
- "Confirm" button for each field step
- Final step highlights "Information Reviewed" button

### Step 5: Add Data Attributes
- SellerInformation.jsx: Add data-tour-target to all Primary Seller inputs
- PropertyDetails.jsx: Add data-tour-target to residential address

### Step 6: Integrate Tour
- Import tour in PropertyInformation.jsx
- Add tour state management
- Add auto-start logic
- Add event handlers

### Step 7: Add Styling
- Create CSS file
- Import in PropertyInformation.jsx

### Step 8: Test
- Test tour auto-start
- Test field editing during tour
- Test confirmation flow
- Test final step guidance

---

## File Structure

```
frontend/client-portal/src/components/dashboard/
├── PropertyInformation.jsx (MODIFY)
├── SellerInformation.jsx (MODIFY)
├── PropertyDetails.jsx (MODIFY)
├── PrimarySellerTour.js (CREATE)
└── primary-seller-tour.css (CREATE)
```

---

## Tour Step Messages (One-Line Each)

1. **Welcome:** "Let's review your primary seller information. We'll guide you through each field and explain why accurate information is crucial for legal compliance."

2. **First Name:** "Your first name must match exactly with your ID documents to ensure smooth settlement."

3. **Last Name:** "Your last name must match your identification documents for title verification."

4. **Middle Name:** "Your full legal name including middle name must match your ID and property title to avoid settlement delays."

5. **Email:** "A valid email is required for electronic service of legally binding documents."

6. **Mobile:** "Your mobile number is needed for urgent settlement notifications and AML compliance verification."

7. **Residential Address:** "Your residential address is mandatory for legal document service and must match your ID for AML compliance."

8. **Final:** "All fields reviewed! Click 'Information Reviewed ✓' to proceed to the next step."

---

## Testing Checklist

- [ ] Shepherd.js installed successfully
- [ ] Alerts removed from handleInformationReviewed
- [ ] Fields editable by default (no Edit button needed)
- [ ] Tour auto-starts when critical fields missing
- [ ] Each field step highlights correct input
- [ ] User can edit field during tour
- [ ] "Confirm" button works for each field
- [ ] Tour progresses through all fields
- [ ] Final step highlights "Information Reviewed" button
- [ ] Tour completion stored in localStorage
- [ ] Tour doesn't auto-start again after completion
- [ ] Fields remain editable during tour
- [ ] No alert prompts appear

---

## Estimated Time
- Phase 1-2: 30 minutes
- Phase 3: 1 hour
- Phase 4: 2 hours
- Phase 5: 30 minutes
- Phase 6: 2 hours
- Phase 7: 1 hour
- Phase 8: 1 hour
- **Total: ~8 hours**

---

## Notes
- Tour should be skippable at any point
- Confirmation is per field, not per section
- Final step should clearly indicate completion
- Store tour completion per deal ID in localStorage
- Ensure tour works on mobile devices

