# Client Dashboard Implementation Plan

## Overview
This document outlines the implementation plan for integrating the professional client dashboard UI mock into the Conveyancing Portal. The dashboard features a sophisticated sidebar navigation, property questionnaire with dynamic form sections, and a clean content area with tabs.

## Design System & Architecture

### Color Palette (CSS Variables)
- Primary Blue: `#0E6DFF` (actions, active states)
- Primary Blue Light: `#E8F1FF` (backgrounds)
- Primary Blue Dark: `#0052CC` (hover states)
- Success: `#10B981` (completed items)
- Warning: `#F59E0B` (available items)
- Error: `#EF4444` (errors, locked items)
- Grays: 50-900 scale for text, backgrounds, borders

### Layout Structure
```
App Container (CSS Grid)
├── Header (Fixed 72px height)
│   ├── Logo + Property Selector
│   ├── Search Bar
│   ├── Notifications
│   ├── User Menu
│   └── Logout Button
├── Sidebar (320px width, collapsible to 80px)
│   ├── Property Header (Title + Toggle)
│   ├── Property Switcher (Collapsible accordion)
│   ├── Progress Ring (60% complete)
│   ├── Navigation (5 sections with status indicators)
│   └── Footer (Quick Actions + Metadata)
└── Main Content (Scrollable)
    ├── Content Header (Title + Subtitle)
    ├── Content Card (White background with shadow)
    ├── Section-specific Content
    └── Floating Action Buttons
```

## Key Features & Components

### 1. Header Component
- **Logo Section**: Icon + "Property Workspace" text
- **Property Selector**: Dropdown with current property (Sydney-based sample data)
- **Search Bar**: Global search for documents and questions
- **Notifications**: Bell icon with badge (3 notifications)
- **User Menu**: Avatar + name/role + logout button

### 2. Sidebar Navigation
#### Property Header (Collapsible)
- Current property title & location
- Toggle button to show/hide property switcher
- Status chip ("In Progress" with pulsing dot)

#### Property Switcher (Accordion)
- List of properties with radio-button-like selection
- Toggle button for hide/show
- "+ Add New Property" button
- Max 3 properties shown with pagination

#### Progress Ring (SVG Circle)
- Circular progress indicator
- 60% complete (configurable)
- Center shows percentage + "Complete" label

#### Navigation Items (5 sections)
1. **Property Information** - Status: Completed ✓
   - Gradient: Green background
   - Left border: Green
2. **Property Questionnaire** - Status: In Progress (8/13)
   - Gradient: Blue background
   - Left border: Blue
   - Active on load
3. **Quote Review** - Status: Available
   - Gradient: Orange/Warning background
   - Left border: Orange
4. **Documents** - Status: Available (badge: 5 items)
   - Gradient: Orange/Warning background
   - Left border: Orange
5. **Payment Instructions** - Status: Locked
   - Dimmed (50% opacity)
   - Locked icon

#### Sidebar Footer
- Quick Actions: "Contact Agent" + "View Timeline" buttons
- Metadata: Last Updated + Agent Name

### 3. Main Content Area

#### Property Information Section
- Tabs: Basic Information | Property Details | Additional Owners
- Form fields: Full Name, Email, Phone, Property Address
- Pre-filled with sample data
- CSS Grid layout (auto-fit, minmax 250px)

#### Property Questionnaire Section
- **Section Tabs**: 5 questionnaire categories
  1. Title & Encumbrances (3 questions)
  2. Rental Agreement (1 question)
  3. Land Use & Planning (4 questions)
  4. Buildings & Structures (4 questions)
  5. Rates & Services (5 questions)

- **Section 1 Details** (Title & Encumbrances):
  - Q1: Body corporate? (Radio: Yes/No)
  - Q2: Non-Statutory Encumbrances? (Radio: Yes/No/Unsure)
    - Conditional field if "Yes": textarea for details
  - Q3: Statutory Encumbrances? (Radio: Yes/No/Unsure)
    - Conditional field if "Yes": textarea for details

- **Other Sections**: Placeholder "Coming soon..." content

#### Quote Review Section
- Placeholder for quote details

#### Documents Section
- Placeholder for document upload/listing

### 4. Floating Action Buttons
- "💾 Save Progress" (Primary Blue background)
- "❓ Help" (Light background, secondary)
- Fixed position: bottom-right, sticky during scroll

## State Management

### React State Variables
```javascript
// Sidebar state
sidebarPropertySwitcherOpen: boolean
currentProperty: { index, title, subtitle }

// Content state
activeSection: 'information' | 'questionnaire' | 'quote' | 'documents'
activeQuestionnaireTab: 'q-section1' | 'q-section2' | ... | 'q-section5'

// Form data
formData: {
  q1_1: string,
  q1_2: string,
  q1_2_details: string,
  q1_3: string,
  q1_3_details: string
}

// UI state
conditionalFields: {
  q1_2_details: boolean,
  q1_3_details: boolean
}
```

### Event Handlers
```javascript
toggleSidebarPropertySwitcher()
switchProperty(index, title, subtitle)
switchSection(section)
switchQuestionnaireTab(tabId)
toggleConditional(fieldId, value)
handleFormChange(e)
handleLogout()
```

## Responsive Design

### Breakpoints
- **Desktop (> 768px)**: Full sidebar + content
- **Mobile (≤ 768px)**:
  - Sidebar becomes fixed overlay (slides in from left)
  - Header items: simplified search, smaller icons
  - Content: full width
  - FABs: smaller, bottom-left positioned

## CSS Architecture

### File Structure
```
dashboard.css
├── :root (CSS variables)
├── Base styles (* selector, body)
├── Layout (.app-container, .header, .sidebar, .main-content)
├── Header styles (.logo, .property-selector, .search-bar, etc.)
├── Sidebar styles (.sidebar, .property-header, .progress-ring, etc.)
├── Navigation styles (.nav-item, .nav-icon, .nav-status, etc.)
├── Content styles (.content-card, .section-tabs, .form-*, etc.)
├── Form styles (.form-group, .form-input, .radio-item, etc.)
├── Animations (@keyframes pulse, slideDown, fadeInUp)
├── Floating actions (.floating-actions, .fab)
└── Media queries (responsive design)
```

### Key CSS Classes
- Layout: `.app-container`, `.header`, `.sidebar`, `.main-content`
- Navigation: `.nav-item`, `.nav-item.active`, `.nav-item.completed`, `.nav-item.locked`
- Forms: `.form-group`, `.form-input`, `.radio-group`, `.radio-item`, `.conditional-field`
- Status: `.nav-status.completed`, `.nav-status.in-progress`, `.nav-status.locked`
- State: `.active`, `.show`, `.property-switcher-open`

## Integration Points

### API Integration (Future)
- Property data: Fetch from `/api/properties`
- Form submission: POST to `/api/questionnaire/submit`
- Conditional field visibility based on previous answers
- Auto-save functionality on form changes

### Authentication
- Maintain existing JWT-based authentication
- Show authenticated user info in header
- Preserve logout functionality

### Navigation
- Integrate with React Router (already in place)
- Route to `/dashboard` after successful disclosure form submission
- Pass deal ID through route state if needed

## Implementation Phases

### Phase 1: Foundation
- Create `dashboard.css` with all styling
- Create basic `ClientDashboard.jsx` component
- Implement layout grid and header
- Implement sidebar with navigation
- CSS variables and color system

### Phase 2: Interactive Features
- Property switcher toggle functionality
- Section navigation (info → questionnaire → quote → documents)
- Questionnaire tab switching
- Form data state management
- Conditional field visibility

### Phase 3: Forms & Validation
- Radio input handling
- Textarea for conditional fields
- Form validation logic
- Data binding and change handlers

### Phase 4: Polish & Testing
- Responsive design testing
- Animation refinements
- Cross-browser compatibility
- Performance optimization
- Accessibility audit

### Phase 5: Integration
- Connect to backend APIs
- Real data loading
- Form submission flow
- State persistence (optional)

## Testing Checklist

### Functional Testing
- [ ] Property switcher opens/closes
- [ ] Clicking properties updates sidebar title
- [ ] Section navigation switches content
- [ ] Questionnaire tabs switch sections
- [ ] Radio buttons toggle conditional fields
- [ ] Form inputs capture data
- [ ] Logout clears auth and redirects

### UI/UX Testing
- [ ] Header is always visible
- [ ] Sidebar scrolls with content
- [ ] Animations are smooth
- [ ] Focus states are visible
- [ ] Hover effects work
- [ ] FABs are always accessible

### Responsive Testing
- [ ] Mobile: Sidebar slides in/out
- [ ] Tablet: Layout adapts
- [ ] Desktop: Full layout
- [ ] Touch targets are adequate
- [ ] Text is readable on mobile

### Accessibility Testing
- [ ] Keyboard navigation works
- [ ] Screen reader friendly
- [ ] Color contrast meets WCAG AA
- [ ] Form labels are associated
- [ ] Semantic HTML is used

## Files to Create/Modify

### New Files
- `/frontend/client-portal/src/components/dashboard/dashboard.css` - All styling
- `/frontend/client-portal/src/components/dashboard/ClientDashboard.jsx` - Main component (updated)

### Modified Files
- None (component only imports the CSS)

## Success Criteria

1. ✅ Dashboard displays with correct layout
2. ✅ All interactive features work
3. ✅ Form data is captured
4. ✅ Responsive design works on mobile
5. ✅ Styling matches mockup
6. ✅ No console errors
7. ✅ Performance is acceptable
8. ✅ Accessible to screen readers

## Notes

- Sample data is hardcoded (properties array, form values)
- Will be replaced with API calls in Phase 5
- Placeholder content for questionnaire sections 2-5
- FAB buttons have no actual functionality yet
- Save functionality requires backend integration
