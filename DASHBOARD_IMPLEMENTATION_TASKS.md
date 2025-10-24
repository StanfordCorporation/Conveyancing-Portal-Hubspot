# Dashboard Implementation Tasks

## Sprint: Client Dashboard UI Integration
**Status**: Ready to Start
**Priority**: High
**Estimated Duration**: 4-6 hours across 5 phases

---

## Phase 1: Foundation & Layout

### Task 1.1: Create Dashboard CSS File
**File**: `frontend/client-portal/src/components/dashboard/dashboard.css`
**Effort**: 2 hours
**Acceptance Criteria**:
- [ ] File created with 850+ lines of CSS
- [ ] All CSS variables defined (:root selector)
- [ ] Layout grid system implemented
- [ ] No errors in CSS syntax
- [ ] All animations defined (@keyframes)

**Description**:
Create comprehensive CSS file with:
- Color variables (brand colors, grays)
- Layout variables (sizes, shadows)
- Base styles for all components
- Grid layout for app-container
- Header styling (logo, selector, search, buttons)
- Sidebar styling (property header, switcher, nav, footer)
- Main content styling (cards, forms, tabs)
- Questionnaire-specific styles
- Floating action buttons
- Media queries for responsive design
- Animations (pulse, slideDown, fadeInUp)

**Deliverable**: `dashboard.css` with ~850 lines

---

### Task 1.2: Update ClientDashboard Component - Part 1 (Imports & State)
**File**: `frontend/client-portal/src/components/dashboard/ClientDashboard.jsx`
**Effort**: 1 hour
**Acceptance Criteria**:
- [ ] Import statements updated (LogOut icon, dashboard.css)
- [ ] All state variables declared
- [ ] Properties array defined with 3 sample properties
- [ ] No console errors
- [ ] Component renders without crashing

**Description**:
Replace the existing ClientDashboard component with:
- Update imports (keep useLocation, useNavigate, LogOut from lucide-react)
- Add import for './dashboard.css'
- Define all useState hooks:
  - sidebarPropertySwitcherOpen
  - activeSection (default: 'questionnaire')
  - activeQuestionnaireTab (default: 'q-section1')
  - currentProperty
  - formData
  - conditionalFields
- Define properties array
- Define handler functions (stubs for now)

**Note**: Don't render JSX yet, just set up state

**Deliverable**: Component structure with state, no JSX

---

### Task 1.3: Implement Header Component JSX
**File**: `frontend/client-portal/src/components/dashboard/ClientDashboard.jsx`
**Effort**: 1.5 hours
**Acceptance Criteria**:
- [ ] Header renders with correct classNames
- [ ] Logo displays with icon and text
- [ ] Property selector dropdown works
- [ ] Search bar has correct placeholder
- [ ] Notification button has badge with count
- [ ] User menu shows avatar and info
- [ ] Logout button uses LogOut icon and triggers handler
- [ ] Header is sticky (always visible)

**Description**:
Implement header JSX with:
- `.header` container
- `.header-left` section: logo + property selector
- `.header-actions` section:
  - Search bar with SVG icon
  - Notification button with badge
  - User menu (clickable for property switcher)
  - Logout button
- Event handlers for click events
- Proper className binding

**Deliverable**: Functional header with event bindings

---

### Task 1.4: Implement Sidebar Component JSX - Part 1 (Property Header & Switcher)
**File**: `frontend/client-portal/src/components/dashboard/ClientDashboard.jsx`
**Effort**: 2 hours
**Acceptance Criteria**:
- [ ] Sidebar renders with correct structure
- [ ] Property header shows current property title and subtitle
- [ ] Toggle button changes property switcher visibility
- [ ] Property list renders from properties array
- [ ] Property items highlight when active (className binding)
- [ ] Add Property button is visible
- [ ] Status chip displays with pulsing animation
- [ ] Conditional rendering works (switcher shows/hides)

**Description**:
Implement sidebar property section:
- `.sidebar` container
- `.property-header` with:
  - `.property-title-row`: title + subtitle + toggle button
  - `.property-switcher` (conditional show/hide)
    - Toggle button
    - Property list (map over properties array)
    - Add Property button
  - `.property-status-chip` with pulsing dot animation
- Bind toggleSidebarPropertySwitcher to button clicks
- Bind switchProperty to property item clicks
- Use className ternary for active property item
- Use className ternary for property-switcher-open state

**Deliverable**: Interactive property switcher and header

---

### Task 1.5: Implement Sidebar Component JSX - Part 2 (Progress Ring & Navigation)
**File**: `frontend/client-portal/src/components/dashboard/ClientDashboard.jsx`
**Effort**: 1.5 hours
**Acceptance Criteria**:
- [ ] Progress ring SVG renders correctly
- [ ] Percentage (60%) displays in center
- [ ] "Complete" label displays below percentage
- [ ] Navigation items render with correct icons
- [ ] Navigation items have correct status indicators
- [ ] Active state styling applied to current section
- [ ] Each nav item has correct status text
- [ ] Badge renders for Documents item
- [ ] Locked styling applied to Payment item
- [ ] Click handlers work for section switching

**Description**:
Implement progress ring and navigation:
- `.progress-overview` with:
  - `.progress-ring` containing SVG
  - Two circles (background + fill with stroke-dasharray)
  - `.progress-center` with percentage + label
- `.sidebar-navigation` with:
  - 5 `.nav-section` items
  - Each with: icon + content + indicator
  - Property Information (completed, green)
  - Property Questionnaire (in-progress, blue, active by default)
  - Quote Review (available, orange)
  - Documents (available, orange, badge)
  - Payment Instructions (locked, gray, dimmed)
- Bind switchSection handler to nav item clicks
- Use className ternary for active state
- Use className for status colors (completed, in-progress, available, locked)

**Deliverable**: Interactive navigation with correct styling

---

### Task 1.6: Implement Sidebar Footer JSX
**File**: `frontend/client-portal/src/components/dashboard/ClientDashboard.jsx`
**Effort**: 45 minutes
**Acceptance Criteria**:
- [ ] Quick actions buttons render
- [ ] "Contact Agent" button has chat icon
- [ ] "View Timeline" button has chart icon
- [ ] Property meta information displays
- [ ] Last Updated and Agent info shown
- [ ] Footer styling matches design

**Description**:
Implement sidebar footer:
- `.sidebar-footer` container
- `.quick-actions` with 2 buttons:
  - "Contact Agent" with 💬 emoji
  - "View Timeline" with 📊 emoji
- `.property-meta` with:
  - Last Updated: 2 hours ago
  - Agent: Stanford Legal
- Use correct className for button styling (primary/secondary)

**Deliverable**: Complete sidebar with all sections

---

## Phase 2: Main Content - Information Section

### Task 2.1: Implement Information Section JSX
**File**: `frontend/client-portal/src/components/dashboard/ClientDashboard.jsx`
**Effort**: 1 hour
**Acceptance Criteria**:
- [ ] Section renders only when activeSection === 'information'
- [ ] Content header displays with title and subtitle
- [ ] Content card styling applied
- [ ] Section tabs render (Basic, Details, Owners)
- [ ] Form grid displays 4 input fields
- [ ] All form inputs are filled with sample data
- [ ] Property address field updates when property changes

**Description**:
Implement Property Information section:
- Conditional rendering: `{activeSection === 'information' && (...)}`
- `.content-header` with title and subtitle
- `.content-card` with:
  - `.section-tabs` with 3 buttons
  - `.form-grid` with 4 form groups:
    - Full Name (Donna Michelle Andrews)
    - Email (3568andrews@gmail.com)
    - Phone (0422 885 855)
    - Property Address (dynamic from currentProperty)
  - Each form group has label and input
  - Active tab styling for "Basic Information"

**Deliverable**: Visible information section with form fields

---

## Phase 3: Main Content - Questionnaire Section

### Task 3.1: Implement Questionnaire Tabs & Section 1 JSX
**File**: `frontend/client-portal/src/components/dashboard/ClientDashboard.jsx`
**Effort**: 2 hours
**Acceptance Criteria**:
- [ ] Questionnaire section renders when activeSection === 'questionnaire'
- [ ] 5 questionnaire tabs render with labels and question counts
- [ ] Active tab styling applied to current tab
- [ ] Tab switching changes activeQuestionnaireTab state
- [ ] Section 1 "Title & Encumbrances" displays
- [ ] 3 questions render with correct labels
- [ ] Radio inputs for Q1 work (Yes/No)
- [ ] Radio inputs for Q2 work (Yes/No/Unsure)
- [ ] Radio inputs for Q3 work (Yes/No/Unsure)
- [ ] Form data state updates on radio change

**Description**:
Implement questionnaire tabs and first section:
- Conditional rendering: `{activeSection === 'questionnaire' && (...)}`
- `.questionnaire-tabs` with 5 buttons:
  - Tab 1: "Title & Encumbrances (3)"
  - Tab 2: "Rental Agreement (1)"
  - Tab 3: "Land Use & Planning (4)"
  - Tab 4: "Buildings & Structures (4)"
  - Tab 5: "Rates & Services (5)"
- Tab click handlers call switchQuestionnaireTab
- Section 1 conditional rendering: `{activeQuestionnaireTab === 'q-section1' && (...)}`
- Section 1 contains 3 form groups:
  - Q1: Body corporate? (Radio: Yes/No)
  - Q2: Non-Statutory Encumbrances? (Radio: Yes/No/Unsure)
  - Q3: Statutory Encumbrances? (Radio: Yes/No/Unsure)
- Radio inputs bind to formData.q1_1, q1_2, q1_3
- onChange calls handleFormChange

**Deliverable**: Interactive questionnaire tabs and section 1

---

### Task 3.2: Implement Conditional Fields & Other Sections
**File**: `frontend/client-portal/src/components/dashboard/ClientDashboard.jsx`
**Effort**: 1.5 hours
**Acceptance Criteria**:
- [ ] Q2 conditional field shows when "Yes" is selected
- [ ] Q3 conditional field shows when "Yes" is selected
- [ ] Conditional fields hide when other options selected
- [ ] Textarea inputs in conditional fields capture data
- [ ] Sections 2-5 render with placeholder content
- [ ] Placeholder sections have "Coming soon..." text
- [ ] All tabs can be switched to and from

**Description**:
Implement conditional fields and placeholder sections:
- For Q2: Add conditional field with textarea
  - Shows when formData.q1_2 === 'yes'
  - Uses toggleConditional handler
  - Textarea binds to formData.q1_2_details
- For Q3: Add conditional field with textarea
  - Shows when formData.q1_3 === 'yes'
  - Uses toggleConditional handler
  - Textarea binds to formData.q1_3_details
- Sections 2-5: Placeholder JSX
  - Show only when their tab is active
  - Display section title
  - Display "Coming soon..." placeholder text
- Update toggleConditional and handleFormChange handlers

**Deliverable**: Complete questionnaire with dynamic fields

---

## Phase 4: Remaining Content Sections & FABs

### Task 4.1: Implement Quote Review & Documents Sections
**File**: `frontend/client-portal/src/components/dashboard/ClientDashboard.jsx`
**Effort**: 45 minutes
**Acceptance Criteria**:
- [ ] Quote section renders when activeSection === 'quote'
- [ ] Documents section renders when activeSection === 'documents'
- [ ] Both have proper content headers
- [ ] Both have content cards with placeholder text
- [ ] Sections hide when not active
- [ ] Navigation to these sections works

**Description**:
Implement remaining content sections:
- Quote Review section:
  - Conditional rendering: `{activeSection === 'quote' && (...)}`
  - `.content-header` with title and subtitle
  - `.content-card` with placeholder text
- Documents section:
  - Conditional rendering: `{activeSection === 'documents' && (...)}`
  - `.content-header` with title and subtitle
  - `.content-card` with placeholder text

**Deliverable**: All main content sections implemented

---

### Task 4.2: Implement Floating Action Buttons
**File**: `frontend/client-portal/src/components/dashboard/ClientDashboard.jsx`
**Effort**: 30 minutes
**Acceptance Criteria**:
- [ ] FAB container renders outside main-content
- [ ] "Save Progress" FAB displays with primary styling
- [ ] "Help" FAB displays with secondary styling
- [ ] FABs have proper icons (💾 and ❓)
- [ ] FABs are fixed position (bottom-right)
- [ ] FABs are always accessible (z-index 1000)

**Description**:
Implement floating action buttons:
- `.floating-actions` container (fixed position)
- 2 buttons with `.fab` class:
  - Primary: "💾 Save Progress"
  - Secondary: "❓ Help"
- Proper styling for fixed positioning
- Buttons remain visible during scroll

**Deliverable**: Complete responsive dashboard

---

## Phase 5: Integration & Polish

### Task 5.1: Event Handler Implementation
**File**: `frontend/client-portal/src/components/dashboard/ClientDashboard.jsx`
**Effort**: 1 hour
**Acceptance Criteria**:
- [ ] All handler functions are fully implemented
- [ ] No stub functions remain
- [ ] State updates work correctly
- [ ] Event propagation doesn't cause issues
- [ ] Form inputs properly capture and display data

**Description**:
Implement all event handlers:
- handleLogout: Clear auth tokens, navigate to login
- toggleSidebarPropertySwitcher: Toggle boolean state
- switchProperty: Update currentProperty, close switcher
- switchSection: Update activeSection
- switchQuestionnaireTab: Update activeQuestionnaireTab
- toggleConditional: Update conditionalFields for specific field
- handleFormChange: Update formData for form inputs

**Deliverable**: Fully functional event handling

---

### Task 5.2: Responsive Design Testing & Fixes
**File**: `frontend/client-portal/src/components/dashboard/dashboard.css`
**Effort**: 1.5 hours
**Acceptance Criteria**:
- [ ] Desktop layout works (> 768px)
- [ ] Tablet layout works (500-768px)
- [ ] Mobile layout works (< 500px)
- [ ] Header is responsive
- [ ] Sidebar works on mobile
- [ ] Content is readable on mobile
- [ ] Forms are usable on touch devices
- [ ] No horizontal scrolling

**Description**:
Test and refine responsive design:
- Desktop: Full sidebar + content
- Mobile: Sidebar overlay, simplified header
- Tablet: Adjusted layout, smaller sidebar
- Touch target sizes ≥ 44px
- Text readable without zoom
- No layout shifts

**Deliverable**: Mobile-friendly dashboard

---

### Task 5.3: Styling Refinements & Polish
**File**: `frontend/client-portal/src/components/dashboard/dashboard.css` & `.jsx`
**Effort**: 1 hour
**Acceptance Criteria**:
- [ ] All hover states work smoothly
- [ ] All focus states are visible
- [ ] Animations are smooth (no jank)
- [ ] Color contrast meets WCAG AA
- [ ] Font sizes are readable
- [ ] Spacing/padding is consistent
- [ ] Shadows are subtle and professional
- [ ] No CSS conflicts with existing styles

**Description**:
Polish the dashboard:
- Refine animations (timing, easing)
- Ensure hover states are clear
- Check color contrast ratios
- Verify font hierarchy
- Adjust spacing if needed
- Test with different screen sizes
- Check for conflicts with Tailwind CSS

**Deliverable**: Production-ready styling

---

### Task 5.4: Testing & QA
**File**: All files
**Effort**: 1 hour
**Acceptance Criteria**:
- [ ] No console errors or warnings
- [ ] No visual glitches
- [ ] All interactive features work
- [ ] Form data is captured correctly
- [ ] Navigation works smoothly
- [ ] Page loads quickly
- [ ] Logout works properly
- [ ] Authenticated user info displays

**Description**:
Comprehensive testing:
- Browser console check (no errors)
- Visual regression check
- Interactive feature testing
- Form submission simulation
- Navigation flow testing
- Performance check (Lighthouse)
- Cross-browser testing (Chrome, Firefox, Safari)

**Deliverable**: Tested, production-ready dashboard

---

## Summary

| Phase | Tasks | Hours | Status |
|-------|-------|-------|--------|
| 1: Foundation | 1.1-1.6 | 8.5 | Pending |
| 2: Information | 2.1 | 1 | Pending |
| 3: Questionnaire | 3.1-3.2 | 3.5 | Pending |
| 4: Sections & FABs | 4.1-4.2 | 1.25 | Pending |
| 5: Integration | 5.1-5.4 | 4.25 | Pending |
| **Total** | **18 tasks** | **18.5 hours** | **Ready** |

---

## Implementation Order

Start with Phase 1 (Foundation) to establish layout and styling. Each task builds on previous ones. Once Phase 1 is complete, can work on Phases 2-4 in parallel.

---

## Notes for Developer

- Keep component file size manageable (consider extracting sections later)
- Use className ternary for conditional classes
- Test responsive design early (don't leave for end)
- Use React DevTools to monitor state changes
- Comment complex logic (handlers, conditional renders)
- Test form inputs with actual typing (not just props)
- Verify all animations are smooth (60fps)
