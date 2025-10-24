# Dashboard Visual Reference Guide

## Color Palette Reference

### Primary Colors
```
Primary Blue:        #0E6DFF  (RGB: 14, 109, 255)
Primary Blue Light:  #E8F1FF  (RGB: 232, 241, 255) - for backgrounds
Primary Blue Dark:   #0052CC  (RGB: 0, 82, 204) - for hover states
```
Usage: Active elements, primary actions, focus states

### Status Colors
```
Success Green:       #10B981  (RGB: 16, 185, 129)
Success Green Light: #D1FAE5  (RGB: 209, 250, 229) - backgrounds
```
Usage: Completed states, success messages

### Warning/Availability
```
Warning Orange:      #F59E0B  (RGB: 245, 158, 11)
Warning Orange Light: #FEF3C7  (RGB: 254, 243, 199) - backgrounds
```
Usage: Available items, pending actions

### Error/Locked
```
Error Red:           #EF4444  (RGB: 239, 68, 68)
Error Red Light:     #FEE2E2  (RGB: 254, 226, 226) - backgrounds
```
Usage: Errors, locked items, badges

### Gray Scale (Text & Backgrounds)
```
Gray-50:   #F9FAFB  (almost white, use for subtle backgrounds)
Gray-100:  #F3F4F6  (light gray, input backgrounds)
Gray-200:  #E5E7EB  (light borders)
Gray-300:  #D1D5DB  (mid borders)
Gray-400:  #9CA3AF  (disabled text)
Gray-500:  #6B7280  (secondary text)
Gray-600:  #4B5563  (secondary text, darker)
Gray-700:  #374151  (body text)
Gray-800:  #1F2937  (headings)
Gray-900:  #111827  (primary text, very dark)
```

## Component Styling Reference

### Header
```
Background: rgba(255, 255, 255, 0.95) + backdrop-filter blur(20px)
Border:     1px solid var(--gray-200)
Height:     72px (fixed)
Shadow:     None (clean)
Padding:    0 32px (horizontal)
```

### Sidebar
```
Width:      320px (desktop) / 80px (collapsed)
Background: rgba(255, 255, 255, 0.95) + backdrop-filter blur(20px)
Border:     1px solid var(--gray-200) (right side)
Height:     100% (full height minus header)
Overflow:   Auto (scrollable)
Shadow:     None (flat design)
```

### Navigation Item (Default)
```
Padding:        16px
Border:         None
Background:     transparent
Border-radius:  12px (var(--border-radius))
Font-size:      14px
Font-weight:    500
Transition:     all 0.2s ease
Left indicator: 4px transparent border
```

### Navigation Item (Completed - Green)
```
Background:     linear-gradient(135deg, var(--success-light), rgba(209, 250, 229, 0.5))
Left border:    4px var(--success)
Text color:     var(--gray-900)
Icon color:     default
```

### Navigation Item (In Progress - Blue)
```
Background:     linear-gradient(135deg, var(--primary-blue-light), rgba(232, 241, 255, 0.5))
Left border:    4px var(--primary-blue)
Text color:     var(--gray-900)
Icon color:     default
```

### Navigation Item (Active)
```
Background:     linear-gradient(135deg, var(--primary-blue-light), rgba(232, 241, 255, 0.8))
Left border:    4px var(--primary-blue)
Box-shadow:     var(--shadow-lg)
Transform:      none (no hover effect)
```

### Navigation Item (Available - Orange)
```
Background:     linear-gradient(135deg, var(--warning-light), rgba(254, 243, 199, 0.5))
Left border:    4px var(--warning)
Text color:     var(--gray-900)
Icon color:     default
```

### Navigation Item (Locked - Dimmed)
```
Background:     transparent
Opacity:        0.5 (makes everything dim)
Cursor:         not-allowed
Hover:          No transform
Text color:     var(--gray-900) (but dimmed)
```

### Navigation Item (Hover)
```
Background:     var(--gray-50)
Transform:      translateX(4px)
Transition:     all 0.2s ease
```

### Form Input
```
Padding:        12px 16px
Border:         2px solid var(--gray-200)
Border-radius:  8px
Font-size:      14px
Background:     white
Transition:     all 0.2s ease
Font-family:    inherit
```

### Form Input (Focus)
```
Border:         2px solid var(--primary-blue)
Box-shadow:     0 0 0 3px var(--primary-blue-light)
Background:     white
Outline:        none
```

### Radio Item
```
Padding:        12px
Border:         2px solid var(--gray-200)
Border-radius:  8px
Background:     transparent
Cursor:         pointer
Transition:     all 0.2s ease
Display:        flex
Gap:            12px
Align-items:    center
```

### Radio Item (Hover)
```
Border:         2px solid var(--primary-blue)
Background:     var(--primary-blue-light)
```

### Radio Input
```
Width:          18px
Height:         18px
Cursor:         pointer
Accent-color:   var(--primary-blue)
```

### Conditional Field (Hidden)
```
Display:        none
```

### Conditional Field (Show)
```
Display:        block
Margin-top:     16px
Padding:        16px
Background:     var(--gray-50)
Border-radius:  8px
Border-left:    4px solid var(--primary-blue)
Animation:      slideDown 0.3s ease
```

### Content Card
```
Background:     white
Border:         1px solid var(--gray-200)
Border-radius:  12px (var(--border-radius))
Padding:        32px
Box-shadow:     var(--shadow-lg)
Margin-bottom:  24px
```

### Tab (Inactive)
```
Background:     transparent
Color:          var(--gray-600)
Padding:        10px 16px
Border:         none
Border-radius:  8px
Font-size:      14px
Font-weight:    500
Transition:     all 0.2s ease
Cursor:         pointer
```

### Tab (Active)
```
Background:     white
Color:          var(--primary-blue)
Box-shadow:     var(--shadow-lg)
```

### Floating Action Button (Primary)
```
Background:     var(--primary-blue)
Color:          white
Padding:        12px 20px
Border:         none
Border-radius:  24px
Font-size:      14px
Font-weight:    500
Cursor:         pointer
Box-shadow:     var(--shadow-xl)
Transition:     all 0.3s cubic-bezier(0.4, 0, 0.2, 1)
```

### Floating Action Button (Secondary)
```
Background:     rgba(255, 255, 255, 0.9)
Color:          var(--gray-700)
Border:         1px solid var(--gray-200)
Padding:        12px 20px
Border-radius:  24px
Font-size:      14px
Font-weight:    500
Cursor:         pointer
Box-shadow:     var(--shadow-xl)
Transition:     all 0.3s cubic-bezier(0.4, 0, 0.2, 1)
```

### FAB (Hover)
```
Transform:      translateY(-2px) scale(1.02)
```

## Spacing Reference

### Padding
```
Header:         0 32px
Sidebar:        24px (sections), 16px (items), 0 16px (nav)
Main Content:   32px
Forms:          12px-16px
Cards:          32px
```

### Gaps/Margins
```
Header sections:    20px (large), 16px (medium)
Sidebar sections:   16px, 12px, 8px (decreasing sizes)
Form groups:        20px
Radio items:        12px gap between items
Tabs:               4px between tabs
```

### Key Sizes
```
Header height:      72px
Sidebar width:      320px (desktop)
Sidebar collapsed:  80px
Border-radius:      12px (primary), 8px (secondary)
Icon size:          18px, 20px, 40px
Avatar size:        32px
Progress ring:      120px
```

## Typography Reference

### Font Family
```
System stack: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Inter', sans-serif
```

### Font Sizes
```
Logo text:          20px, bold
Page title:         28px, bold (700)
Section title:      18px, bold (700)
Heading 4:          14px, bold (600)
Body text:          14px, medium (500)
Secondary text:     12px, medium (500)
Label text:         14px, medium (500)
Caption:            12px, regular (400)
```

### Font Weights
```
Bold:           700
Semibold:       600
Medium:         500
Regular:        400
```

### Line Heights
```
Default:        1.6
Headings:       1.4
Tight:          1.2
```

## Shadow Reference

### Shadow Levels
```
Shadow Small (md):  0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1)
Shadow Large (lg):  0 10px 25px rgba(14, 109, 255, 0.1)  ← Primary blue tint
Shadow XLarge (xl): 0 20px 40px rgba(14, 109, 255, 0.15) ← Primary blue tint
```

Usage:
- Cards and elevated elements: shadow-lg
- Buttons and interactive: shadow-md
- Floating action buttons: shadow-xl
- Selected/active states: shadow-lg

## Animation Reference

### Keyframe: Pulse (status dot)
```css
@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}
Duration: 2s infinite
```
Used on: Status indicator dot

### Keyframe: SlideDown (conditional fields)
```css
@keyframes slideDown {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
Duration: 0.3s ease
```
Used on: Conditional fields appearing

### Keyframe: FadeInUp (section switching)
```css
@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
Duration: 0.3s ease
```
Used on: Content sections appearing

### Transitions
```
Default transition:     all 0.2s ease
UI elements:            0.2s ease (hover, focus)
State changes:          0.3s ease (show/hide)
Sliding animations:     0.3s cubic-bezier(0.4, 0, 0.2, 1)
Transforms (FABs):      0.3s cubic-bezier(0.4, 0, 0.2, 1)
```

## Responsive Breakpoints

### Desktop (> 768px)
```
Layout:         2-column (sidebar + content)
Sidebar:        Fixed, 320px width
Header:         Full width
Content:        Full width
Search bar:     280px width
Forms:          Multiple columns (auto-fit, minmax 250px)
```

### Tablet (500px - 768px)
```
Layout:         2-column (adjusted)
Sidebar:        Same (320px)
Search bar:     200px width
Forms:          2 columns or less
```

### Mobile (< 500px)
```
Layout:         1-column (overlay)
Sidebar:        Position fixed, left: -100% (slides in)
Sidebar open:   left: 0
Header:         Full width, simplified
Content:        Full width
Search bar:     100% width or hidden
Forms:          Single column
```

## Interactive States

### Button States
```
Default:        Solid background, normal text
Hover:          Darker background, translateY(-1px)
Focus:          Border outline, visible focus ring
Active:         Pressed appearance, no transform
Disabled:       Opacity 0.5, cursor not-allowed
```

### Form Input States
```
Default:        Gray border, white background
Hover:          Gray border (no change)
Focus:          Blue border, blue shadow ring
Filled:         Same as default
Error:          Red border, red shadow ring
Disabled:       Gray background, cursor not-allowed
```

### Navigation States
```
Default:        Background per status (green/blue/orange)
Hover:          Lighter background, translateX(4px)
Focus:          Same as hover
Active:         Darker background, shadow, no transform
Disabled:       Opacity 0.5, no transform
```

## CSS Class Naming Convention

### Structure: `[component]-[element]-[modifier]`

Examples:
```
.nav-item (component)
.nav-item.active (component + modifier)
.nav-item.completed (component + status modifier)
.nav-item.locked (component + state modifier)
.nav-content (component-element)
.nav-status (component-element)
.nav-status.completed (component-element + modifier)
```

### BEM-like Approach
```
.app-container (block)
  .header (element)
    .header-left (sub-element)
      .logo (sub-element)
        .logo-icon (sub-element)
        .logo-text (sub-element)

.nav-item (block)
  .nav-item.active (modifier)
  .nav-item.completed (state)
  .nav-content (element)
    h4 (child element)
```

## Progressive Enhancement

### Level 1: HTML Only
- All content displays
- Forms are functional
- Navigation works
- No animations, no advanced styling

### Level 2: CSS
- Layout renders
- Colors and typography
- Shadows and spacing
- Basic transitions

### Level 3: JavaScript
- Interactive state management
- Conditional field visibility
- Smooth animations
- Real-time feedback

## Browser Support

### Target Browsers
```
Chrome:     Latest 2 versions
Firefox:    Latest 2 versions
Safari:     Latest 2 versions
Edge:       Latest 2 versions
Mobile:     iOS Safari 12+, Chrome Android
```

### CSS Feature Support
```
CSS Grid:           Fully supported (not IE11)
Flexbox:            Fully supported
CSS Variables:      Fully supported
Backdrop-filter:    Supported (with -webkit prefix for safari)
Transform:          Fully supported
Transitions:        Fully supported
```

---

**Note**: This is a visual reference guide. For implementation details, refer to DASHBOARD_IMPLEMENTATION_PLAN.md and DASHBOARD_IMPLEMENTATION_TASKS.md
