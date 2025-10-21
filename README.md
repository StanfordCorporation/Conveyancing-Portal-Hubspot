# Conveyancing Portal - HubSpot Integration

A modern dual-interface conveyancing portal system built on serverless architecture with HubSpot CRM as the primary database backend.

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Project Structure](#project-structure)
- [WordPress Integration](#wordpress-integration)
- [Frontend Structure](#frontend-structure)
- [Backend Structure](#backend-structure)
- [Getting Started](#getting-started)
- [Documentation](#documentation)

---

## Overview

The Conveyancing Portal is a dual-interface application designed for Australian conveyancing law firms, providing separate portals for:

- **Client Portal** (`/client-portal`) - Property disclosure and transaction tracking
- **Agent Portal** (`/agent-portal`) - Client management and property intake workflows

### Key Features

- 5-section property disclosure framework
- Real-time bi-directional data synchronization
- HubSpot CRM native integration
- 10-stage deal pipeline management
- Document management with file uploads
- DocuSign integration for retainer agreements

### Technology Stack

| Layer | Technology |
|-------|-----------|
| **Frontend Hosting** | WordPress on WP-Engine |
| **Application Layer** | React SPAs (Single Page Applications) |
| **Backend** | Serverless Functions (Vercel/AWS Lambda) |
| **Database** | HubSpot CRM (Contacts, Companies, Deals) |
| **Authentication** | Token-based session management |

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    WordPress (WP-Engine)                     │
│  ┌────────────────────────┐  ┌────────────────────────┐    │
│  │   /client-portal       │  │   /agent-portal        │    │
│  │   (Static Entry Point) │  │   (Static Entry Point) │    │
│  └───────────┬────────────┘  └───────────┬────────────┘    │
└──────────────┼───────────────────────────┼─────────────────┘
               │                           │
               ▼                           ▼
    ┌──────────────────────────────────────────────┐
    │        React SPAs (Build Artifacts)          │
    │  ┌──────────────────┐  ┌──────────────────┐ │
    │  │  Client Portal   │  │  Agent Portal    │ │
    │  │  React App       │  │  React App       │ │
    │  └────────┬─────────┘  └────────┬─────────┘ │
    └───────────┼────────────────────┼─────────────┘
                │                    │
                │    API Calls       │
                ▼                    ▼
    ┌─────────────────────────────────────────────┐
    │    Serverless Functions (Vercel/Lambda)     │
    │  ┌─────────────────────────────────────┐   │
    │  │  • Contact Management               │   │
    │  │  • Deal CRUD Operations             │   │
    │  │  • Agency Resolution (Fuzzy Match)  │   │
    │  │  • File Upload Handler              │   │
    │  │  • DocuSign Integration             │   │
    │  └────────────────┬────────────────────┘   │
    └─────────────────────┼───────────────────────┘
                          │
                          ▼
              ┌───────────────────────┐
              │   HubSpot CRM APIs    │
              │  ┌─────────────────┐  │
              │  │ Contacts API    │  │
              │  │ Companies API   │  │
              │  │ Deals API       │  │
              │  │ Associations API│  │
              │  │ File Manager    │  │
              │  └─────────────────┘  │
              └───────────────────────┘
```

---

## Project Structure

```
conveyancing-portal-hubspot/
├── README.md
├── Database Overview.md
├── Conveyancing Portal Hubspot - Project Overview.md
│
├── wordpress/                          # WordPress integration files
│   ├── wp-content/
│   │   ├── themes/
│   │   │   └── custom-theme/           # Custom theme (if needed)
│   │   │       ├── header.php
│   │   │       ├── footer.php
│   │   │       ├── page-client-portal.php
│   │   │       └── page-agent-portal.php
│   │   │
│   │   ├── plugins/
│   │   │   └── conveyancing-portal-integration/
│   │   │       ├── conveyancing-portal.php    # Main plugin file
│   │   │       ├── includes/
│   │   │       │   ├── enqueue-scripts.php    # React app loader
│   │   │       │   ├── shortcodes.php         # Portal shortcodes
│   │   │       │   └── ajax-handlers.php      # AJAX endpoints
│   │   │       └── assets/
│   │   │           ├── client-portal/         # Client React build
│   │   │           │   ├── static/
│   │   │           │   │   ├── css/
│   │   │           │   │   └── js/
│   │   │           │   └── index.html
│   │   │           └── agent-portal/          # Agent React build
│   │   │               ├── static/
│   │   │               │   ├── css/
│   │   │               │   └── js/
│   │   │               └── index.html
│   │   │
│   │   └── uploads/                    # WordPress media library
│   │
│   └── README-WordPress.md             # WordPress setup instructions
│
├── frontend/                           # React applications
│   ├── client-portal/
│   │   ├── public/
│   │   │   ├── index.html
│   │   │   └── favicon.ico
│   │   ├── src/
│   │   │   ├── components/
│   │   │   │   ├── common/             # Shared components
│   │   │   │   │   ├── Header.jsx
│   │   │   │   │   ├── Footer.jsx
│   │   │   │   │   ├── FileUpload.jsx
│   │   │   │   │   └── ProgressBar.jsx
│   │   │   │   ├── auth/
│   │   │   │   │   ├── Login.jsx
│   │   │   │   │   └── PortalAccess.jsx
│   │   │   │   ├── disclosure/         # Property disclosure forms
│   │   │   │   │   ├── Section1TitleDetails.jsx
│   │   │   │   │   ├── Section2Tenancy.jsx
│   │   │   │   │   ├── Section3Planning.jsx
│   │   │   │   │   ├── Section4Buildings.jsx
│   │   │   │   │   ├── Section5RatesServices.jsx
│   │   │   │   │   └── ConditionalField.jsx
│   │   │   │   ├── dashboard/
│   │   │   │   │   ├── ClientDashboard.jsx
│   │   │   │   │   ├── DealTimeline.jsx
│   │   │   │   │   └── DocumentList.jsx
│   │   │   │   └── forms/
│   │   │   │       ├── InitialDisclosure.jsx
│   │   │   │       └── FormReview.jsx
│   │   │   ├── services/
│   │   │   │   ├── api.js              # API client configuration
│   │   │   │   ├── hubspotService.js   # HubSpot API wrapper
│   │   │   │   └── authService.js      # Authentication logic
│   │   │   ├── hooks/
│   │   │   │   ├── useAuth.js
│   │   │   │   ├── useDeal.js
│   │   │   │   └── useFileUpload.js
│   │   │   ├── context/
│   │   │   │   ├── AuthContext.jsx
│   │   │   │   └── DealContext.jsx
│   │   │   ├── utils/
│   │   │   │   ├── validation.js
│   │   │   │   ├── formatting.js
│   │   │   │   └── constants.js
│   │   │   ├── App.jsx
│   │   │   └── index.js
│   │   ├── package.json
│   │   ├── .env.example
│   │   └── README.md
│   │
│   └── agent-portal/
│       ├── public/
│       │   ├── index.html
│       │   └── favicon.ico
│       ├── src/
│       │   ├── components/
│       │   │   ├── common/             # Shared components (can symlink)
│       │   │   ├── auth/
│       │   │   │   └── AgentLogin.jsx
│       │   │   ├── clients/
│       │   │   │   ├── ClientList.jsx
│       │   │   │   ├── ClientCreate.jsx
│       │   │   │   └── ClientDetails.jsx
│       │   │   ├── intake/             # Property intake forms
│       │   │   │   ├── PropertyIntakeWizard.jsx
│       │   │   │   ├── Step1ClientInfo.jsx
│       │   │   │   ├── Step2PropertyDetails.jsx
│       │   │   │   ├── Step3Disclosure.jsx
│       │   │   │   ├── Step4Review.jsx
│       │   │   │   └── Step5Submit.jsx
│       │   │   ├── dashboard/
│       │   │   │   ├── AgentDashboard.jsx
│       │   │   │   ├── DealsOverview.jsx
│       │   │   │   └── PipelineView.jsx
│       │   │   └── agencies/
│       │   │       ├── AgencySearch.jsx
│       │   │       └── AgencyConfirmation.jsx
│       │   ├── services/
│       │   │   ├── api.js
│       │   │   ├── hubspotService.js
│       │   │   ├── agencyService.js    # Fuzzy matching logic
│       │   │   └── authService.js
│       │   ├── hooks/
│       │   │   ├── useAuth.js
│       │   │   ├── useDeal.js
│       │   │   ├── useAgency.js
│       │   │   └── useClients.js
│       │   ├── context/
│       │   │   ├── AuthContext.jsx
│       │   │   └── AgentContext.jsx
│       │   ├── utils/
│       │   │   ├── validation.js
│       │   │   ├── formatting.js
│       │   │   └── constants.js
│       │   ├── App.jsx
│       │   └── index.js
│       ├── package.json
│       ├── .env.example
│       └── README.md
│
├── backend/                            # Serverless functions
│   ├── api/
│   │   ├── contacts/
│   │   │   ├── create.js               # POST /api/contacts/create
│   │   │   ├── get.js                  # GET /api/contacts/:id
│   │   │   ├── update.js               # PATCH /api/contacts/:id
│   │   │   └── search.js               # GET /api/contacts/search?email=
│   │   ├── companies/
│   │   │   ├── create.js               # POST /api/companies/create
│   │   │   ├── get.js                  # GET /api/companies/:id
│   │   │   ├── update.js               # PATCH /api/companies/:id
│   │   │   └── fuzzy-match.js          # POST /api/companies/fuzzy-match
│   │   ├── deals/
│   │   │   ├── create.js               # POST /api/deals/create
│   │   │   ├── get.js                  # GET /api/deals/:id
│   │   │   ├── update.js               # PATCH /api/deals/:id
│   │   │   ├── update-stage.js         # PATCH /api/deals/:id/stage
│   │   │   └── list.js                 # GET /api/deals (with filters)
│   │   ├── associations/
│   │   │   ├── create.js               # POST /api/associations
│   │   │   └── delete.js               # DELETE /api/associations
│   │   ├── files/
│   │   │   ├── upload.js               # POST /api/files/upload
│   │   │   ├── get.js                  # GET /api/files/:id
│   │   │   └── delete.js               # DELETE /api/files/:id
│   │   ├── docusign/
│   │   │   ├── send-retainer.js        # POST /api/docusign/send-retainer
│   │   │   ├── webhook.js              # POST /api/docusign/webhook
│   │   │   └── get-status.js           # GET /api/docusign/status/:envelopeId
│   │   └── auth/
│   │       ├── login.js                # POST /api/auth/login
│   │       ├── verify-token.js         # POST /api/auth/verify
│   │       └── refresh.js              # POST /api/auth/refresh
│   │
│   ├── services/
│   │   ├── hubspot/
│   │   │   ├── client.js               # HubSpot API client
│   │   │   ├── contacts.service.js     # Contact operations
│   │   │   ├── companies.service.js    # Company operations
│   │   │   ├── deals.service.js        # Deal operations
│   │   │   ├── associations.service.js # Association operations
│   │   │   └── files.service.js        # File operations
│   │   ├── docusign/
│   │   │   └── client.js               # DocuSign API client
│   │   └── validation/
│   │       ├── contact.validator.js
│   │       ├── deal.validator.js
│   │       └── company.validator.js
│   │
│   ├── utils/
│   │   ├── logger.js                   # Logging utility
│   │   ├── error-handler.js            # Centralized error handling
│   │   ├── fuzzy-match.js              # Fuzzy matching algorithm
│   │   └── constants.js                # Shared constants
│   │
│   ├── middleware/
│   │   ├── auth.middleware.js          # JWT verification
│   │   ├── rate-limit.middleware.js    # Rate limiting
│   │   └── cors.middleware.js          # CORS configuration
│   │
│   ├── config/
│   │   ├── hubspot.config.js           # HubSpot configuration
│   │   ├── docusign.config.js          # DocuSign configuration
│   │   └── env.config.js               # Environment variables
│   │
│   ├── package.json
│   ├── vercel.json                     # Vercel deployment config
│   ├── .env.example
│   └── README.md
│
├── shared/                             # Shared code between frontend/backend
│   ├── types/
│   │   ├── Contact.ts
│   │   ├── Deal.ts
│   │   ├── Company.ts
│   │   └── Associations.ts
│   ├── constants/
│   │   ├── dealStages.js
│   │   ├── disclosureSections.js
│   │   └── fileTypes.js
│   └── utils/
│       └── validation.js
│
└── docs/                               # Additional documentation
    ├── api/
    │   ├── endpoints.md
    │   └── authentication.md
    ├── deployment/
    │   ├── wordpress-setup.md
    │   ├── vercel-setup.md
    │   └── environment-variables.md
    └── workflows/
        ├── client-disclosure-flow.md
        └── agent-intake-flow.md
```

---

## WordPress Integration

### 1. Files to Upload in `wp-content` Folder

#### A. Custom Plugin: `conveyancing-portal-integration/`

Upload to: `wp-content/plugins/`

**Plugin Structure:**
```
wp-content/plugins/conveyancing-portal-integration/
├── conveyancing-portal.php              # Main plugin file
├── includes/
│   ├── enqueue-scripts.php              # Enqueues React build files
│   ├── shortcodes.php                   # Shortcode: [client_portal], [agent_portal]
│   └── ajax-handlers.php                # WordPress AJAX endpoints (if needed)
├── assets/
│   ├── client-portal/                   # Built React app from frontend/client-portal/build
│   │   ├── static/
│   │   │   ├── css/
│   │   │   │   └── main.[hash].css
│   │   │   └── js/
│   │   │       ├── main.[hash].js
│   │   │       └── [chunk].[hash].js
│   │   ├── index.html
│   │   └── asset-manifest.json
│   └── agent-portal/                    # Built React app from frontend/agent-portal/build
│       ├── static/
│       │   ├── css/
│       │   │   └── main.[hash].css
│       │   └── js/
│       │       ├── main.[hash].js
│       │       └── [chunk].[hash].js
│       ├── index.html
│       └── asset-manifest.json
└── README.md
```

**Key Files:**

1. **`conveyancing-portal.php`** - Main plugin file with metadata:
```php
<?php
/**
 * Plugin Name: Conveyancing Portal Integration
 * Description: Integrates Client and Agent portals built with React
 * Version: 1.0.0
 * Author: Your Firm Name
 */

require_once plugin_dir_path(__FILE__) . 'includes/enqueue-scripts.php';
require_once plugin_dir_path(__FILE__) . 'includes/shortcodes.php';
```

2. **`includes/enqueue-scripts.php`** - Loads React build files:
```php
<?php
function cp_enqueue_client_portal_scripts() {
    if (is_page('client-portal')) {
        $manifest = json_decode(file_get_contents(
            plugin_dir_path(__DIR__) . 'assets/client-portal/asset-manifest.json'
        ), true);

        wp_enqueue_script('client-portal-js',
            plugins_url('assets/client-portal/' . $manifest['files']['main.js'], __DIR__),
            [], null, true
        );
        wp_enqueue_style('client-portal-css',
            plugins_url('assets/client-portal/' . $manifest['files']['main.css'], __DIR__)
        );
    }
}
add_action('wp_enqueue_scripts', 'cp_enqueue_client_portal_scripts');
```

3. **`includes/shortcodes.php`** - Portal shortcodes:
```php
<?php
function client_portal_shortcode() {
    return '<div id="client-portal-root"></div>';
}
add_shortcode('client_portal', 'client_portal_shortcode');

function agent_portal_shortcode() {
    return '<div id="agent-portal-root"></div>';
}
add_shortcode('agent_portal', 'agent_portal_shortcode');
```

#### B. Custom Theme (Optional)

Upload to: `wp-content/themes/custom-conveyancing-theme/`

**Only needed if you want custom page templates. Otherwise, use shortcodes in any theme.**

```
wp-content/themes/custom-conveyancing-theme/
├── style.css                           # Theme metadata
├── functions.php                       # Theme functions
├── header.php                          # Custom header
├── footer.php                          # Custom footer
├── page-client-portal.php              # Template for /client-portal
└── page-agent-portal.php               # Template for /agent-portal
```

#### C. Build Artifacts

**Source:** After running `npm run build` in frontend directories

**Upload Location:**
- `frontend/client-portal/build/*` → `wp-content/plugins/conveyancing-portal-integration/assets/client-portal/`
- `frontend/agent-portal/build/*` → `wp-content/plugins/conveyancing-portal-integration/assets/agent-portal/`

---

### 2. WordPress Pages to Create

Create the following pages in WordPress Admin (`Pages > Add New`):

#### Page 1: Client Portal

| Setting | Value |
|---------|-------|
| **Page Title** | Client Portal |
| **Permalink** | `/client-portal` |
| **Template** | Full Width (or custom template) |
| **Content** | `[client_portal]` shortcode |
| **Visibility** | Public (authentication handled by React app) |

**Page Content:**
```
[client_portal]
```

#### Page 2: Agent Portal

| Setting | Value |
|---------|-------|
| **Page Title** | Agent Portal |
| **Permalink** | `/agent-portal` |
| **Template** | Full Width (or custom template) |
| **Content** | `[agent_portal]` shortcode |
| **Visibility** | Public (authentication handled by React app) |

**Page Content:**
```
[agent_portal]
```

#### Optional Supporting Pages

| Page Title | Permalink | Purpose |
|------------|-----------|---------|
| Portal Help | `/portal-help` | User documentation |
| Privacy Policy | `/privacy-policy` | Data handling disclosure |
| Terms of Service | `/terms-of-service` | Portal usage terms |

---

### 3. WordPress Configuration

#### Plugin Activation
1. Upload `conveyancing-portal-integration` folder to `wp-content/plugins/`
2. Navigate to WordPress Admin > Plugins
3. Activate "Conveyancing Portal Integration"

#### Page Configuration
1. Create pages with shortcodes (see above)
2. Set permalinks to Plain or Post name structure
3. Ensure Full Width template is selected (removes sidebar)

#### .htaccess Configuration (for React Router)
```apache
<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /
  RewriteRule ^(client-portal|agent-portal)($|/) - [L]
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d
  RewriteRule ^(client-portal|agent-portal)/ /index.php [L]
</IfModule>
```

---

## Frontend Structure

### Client Portal (`frontend/client-portal/`)

```
src/
├── components/
│   ├── common/                      # Reusable UI components
│   │   ├── Header.jsx               # Portal header with navigation
│   │   ├── Footer.jsx               # Portal footer
│   │   ├── FileUpload.jsx           # File upload component (PDF, JPG, PNG)
│   │   ├── ProgressBar.jsx          # Section completion indicator
│   │   ├── Button.jsx               # Styled button component
│   │   └── LoadingSpinner.jsx       # Loading state indicator
│   │
│   ├── auth/                        # Authentication components
│   │   ├── Login.jsx                # Client login form
│   │   ├── PortalAccess.jsx         # Portal access provisioning
│   │   └── PrivateRoute.jsx         # Protected route wrapper
│   │
│   ├── disclosure/                  # Property disclosure forms
│   │   ├── Section1TitleDetails.jsx        # Body corporate, encumbrances
│   │   ├── Section2Tenancy.jsx             # Tenancy agreements, rental details
│   │   ├── Section3Planning.jsx            # Environmental, government notices
│   │   ├── Section4Buildings.jsx           # Swimming pool, owner-builder
│   │   ├── Section5RatesServices.jsx       # Rates and water notices
│   │   ├── ConditionalField.jsx            # Dynamic field visibility logic
│   │   └── DisclosureWizard.jsx            # Multi-step form container
│   │
│   ├── dashboard/                   # Client dashboard
│   │   ├── ClientDashboard.jsx      # Main dashboard view
│   │   ├── DealTimeline.jsx         # Pipeline stage visualization
│   │   ├── DocumentList.jsx         # Uploaded documents display
│   │   └── TaskList.jsx             # Outstanding tasks
│   │
│   └── forms/
│       ├── InitialDisclosure.jsx    # Initial seller information form
│       └── FormReview.jsx           # Pre-submission review screen
│
├── services/
│   ├── api.js                       # Axios instance with interceptors
│   ├── hubspotService.js            # HubSpot API wrapper functions
│   │   ├── getDeal()                # Fetch deal by ID
│   │   ├── updateDeal()             # Update deal properties
│   │   ├── uploadFile()             # Upload file to HubSpot
│   │   └── getContact()             # Fetch contact details
│   └── authService.js               # Authentication logic
│       ├── login()                  # Client login
│       ├── verifyToken()            # JWT verification
│       └── logout()                 # Session cleanup
│
├── hooks/                           # Custom React hooks
│   ├── useAuth.js                   # Authentication state management
│   ├── useDeal.js                   # Deal data fetching and updates
│   ├── useFileUpload.js             # File upload with progress tracking
│   └── useFormState.js              # Form state persistence
│
├── context/
│   ├── AuthContext.jsx              # Global authentication context
│   └── DealContext.jsx              # Global deal data context
│
├── utils/
│   ├── validation.js                # Form validation rules
│   ├── formatting.js                # Data formatting helpers
│   └── constants.js                 # Deal stages, section names, etc.
│
├── App.jsx                          # Main app component with routing
└── index.js                         # React DOM render
```

**Key Features:**
- **5-Section Disclosure Forms** with conditional field logic
- **Real-time Sync** with agent portal via HubSpot API polling
- **File Upload** for tenancy agreements, certificates, notices
- **Progress Tracking** across deal pipeline stages

---

### Agent Portal (`frontend/agent-portal/`)

```
src/
├── components/
│   ├── common/                      # Shared with client portal (symlink or copy)
│   │   ├── Header.jsx
│   │   ├── Footer.jsx
│   │   ├── FileUpload.jsx
│   │   └── Button.jsx
│   │
│   ├── auth/
│   │   ├── AgentLogin.jsx           # Agent authentication
│   │   └── PrivateRoute.jsx         # Protected route wrapper
│   │
│   ├── clients/                     # Client management
│   │   ├── ClientList.jsx           # All clients table view
│   │   ├── ClientCreate.jsx         # New client creation form
│   │   ├── ClientDetails.jsx        # Individual client details
│   │   └── ClientSearch.jsx         # Search/filter clients
│   │
│   ├── intake/                      # Property intake workflow
│   │   ├── PropertyIntakeWizard.jsx # 5-step wizard container
│   │   ├── Step1ClientInfo.jsx      # Seller information
│   │   ├── Step2PropertyDetails.jsx # Property address, owners
│   │   ├── Step3Disclosure.jsx      # 5-section disclosure (same as client)
│   │   ├── Step4Review.jsx          # Review before submission
│   │   └── Step5Submit.jsx          # Generate client portal access
│   │
│   ├── dashboard/
│   │   ├── AgentDashboard.jsx       # Agent overview dashboard
│   │   ├── DealsOverview.jsx        # All deals summary
│   │   ├── PipelineView.jsx         # Kanban-style pipeline view
│   │   └── RecentActivity.jsx       # Activity timeline
│   │
│   └── agencies/                    # Agency management
│       ├── AgencySearch.jsx         # Fuzzy search component
│       ├── AgencyConfirmation.jsx   # Match confirmation dialog
│       └── AgencyCreate.jsx         # New agency creation
│
├── services/
│   ├── api.js                       # Axios instance
│   ├── hubspotService.js            # HubSpot API wrapper
│   ├── agencyService.js             # Fuzzy matching logic
│   │   ├── searchAgencies()         # Search companies by name/email
│   │   ├── fuzzyMatch()             # Similarity scoring
│   │   └── createAgency()           # Create new company
│   └── authService.js               # Agent authentication
│
├── hooks/
│   ├── useAuth.js
│   ├── useDeal.js
│   ├── useAgency.js                 # Agency search and matching
│   └── useClients.js                # Client list management
│
├── context/
│   ├── AuthContext.jsx
│   └── AgentContext.jsx             # Agent-specific context
│
├── utils/
│   ├── validation.js
│   ├── formatting.js
│   └── constants.js
│
├── App.jsx
└── index.js
```

**Key Features:**
- **Client Creation** workflow with portal provisioning
- **Property Intake** 5-step wizard
- **Agency Fuzzy Matching** to prevent duplicates
- **Deal Oversight** with ability to review client submissions
- **Real-time Sync** with client portal changes

---

### Shared Components Strategy

To avoid code duplication:

```bash
# Option 1: Symlink (Linux/Mac)
cd frontend/agent-portal/src/components/
ln -s ../../client-portal/src/components/common common

# Option 2: Shared package (Monorepo)
shared/
└── components/
    ├── Header.jsx
    ├── Footer.jsx
    └── FileUpload.jsx

# Import in both portals
import { Header } from '@shared/components';
```

---

## Backend Structure

### Serverless Functions (`backend/`)

```
api/
├── contacts/
│   ├── create.js                    # POST /api/contacts/create
│   │   ├── Validates email, firstname, lastname
│   │   ├── Checks for existing contact (email search)
│   │   ├── Creates HubSpot Contact if new
│   │   └── Returns contact ID
│   │
│   ├── get.js                       # GET /api/contacts/:id
│   │   └── Fetches contact by HubSpot ID
│   │
│   ├── update.js                    # PATCH /api/contacts/:id
│   │   └── Updates contact properties
│   │
│   └── search.js                    # GET /api/contacts/search?email=
│       └── Searches contacts by email (idProperty)
│
├── companies/
│   ├── create.js                    # POST /api/companies/create
│   │   ├── Validates name, email
│   │   ├── Creates HubSpot Company
│   │   └── Returns company ID
│   │
│   ├── get.js                       # GET /api/companies/:id
│   │   └── Fetches company by ID
│   │
│   ├── update.js                    # PATCH /api/companies/:id
│   │   └── Updates company properties
│   │
│   └── fuzzy-match.js               # POST /api/companies/fuzzy-match
│       ├── Body: { name, email }
│       ├── Searches HubSpot Companies
│       ├── Implements Levenshtein distance algorithm
│       └── Returns matches with confidence score
│
├── deals/
│   ├── create.js                    # POST /api/deals/create
│   │   ├── Validates dealname, property_address
│   │   ├── Creates Deal with all disclosure properties
│   │   ├── Creates associations to contacts/companies
│   │   └── Returns deal ID
│   │
│   ├── get.js                       # GET /api/deals/:id
│   │   ├── Fetches deal with all properties
│   │   └── Includes associated contacts/companies
│   │
│   ├── update.js                    # PATCH /api/deals/:id
│   │   ├── Updates disclosure section properties
│   │   ├── Validates conditional field logic
│   │   └── Triggers webhooks for sync
│   │
│   ├── update-stage.js              # PATCH /api/deals/:id/stage
│   │   ├── Updates dealstage property
│   │   ├── Validates stage progression rules
│   │   └── Triggers automated workflows
│   │
│   └── list.js                      # GET /api/deals?agentId=&stage=
│       └── Lists deals with filters
│
├── associations/
│   ├── create.js                    # POST /api/associations
│   │   ├── Body: { fromId, toId, associationType }
│   │   └── Creates HubSpot association
│   │
│   └── delete.js                    # DELETE /api/associations
│       └── Removes association
│
├── files/
│   ├── upload.js                    # POST /api/files/upload
│   │   ├── Validates file type (PDF, JPG, PNG)
│   │   ├── Uploads to HubSpot File Manager
│   │   ├── Associates with Deal
│   │   └── Updates deal property (e.g., tenancy_agreement_upload)
│   │
│   ├── get.js                       # GET /api/files/:id
│   │   └── Returns file URL from HubSpot
│   │
│   └── delete.js                    # DELETE /api/files/:id
│       └── Removes file from HubSpot
│
├── docusign/
│   ├── send-retainer.js             # POST /api/docusign/send-retainer
│   │   ├── Body: { dealId, contactId }
│   │   ├── Generates retainer agreement
│   │   ├── Sends via DocuSign
│   │   └── Updates deal stage to "Awaiting Signed Retainer"
│   │
│   ├── webhook.js                   # POST /api/docusign/webhook
│   │   ├── Receives DocuSign events (signed, declined)
│   │   └── Updates deal stage accordingly
│   │
│   └── get-status.js                # GET /api/docusign/status/:envelopeId
│       └── Checks DocuSign envelope status
│
└── auth/
    ├── login.js                     # POST /api/auth/login
    │   ├── Body: { email, password } (or token)
    │   ├── Verifies credentials
    │   └── Returns JWT token
    │
    ├── verify-token.js              # POST /api/auth/verify
    │   └── Validates JWT token
    │
    └── refresh.js                   # POST /api/auth/refresh
        └── Issues new JWT token
```

### Service Layer (`backend/services/`)

```
services/
├── hubspot/
│   ├── client.js                    # HubSpot API client
│   │   ├── const hubspotClient = new Client({ accessToken })
│   │   └── Handles rate limiting (10 req/sec)
│   │
│   ├── contacts.service.js          # Contact operations
│   │   ├── createContact(properties)
│   │   ├── getContact(contactId)
│   │   ├── updateContact(contactId, properties)
│   │   └── searchContactByEmail(email)
│   │
│   ├── companies.service.js         # Company operations
│   │   ├── createCompany(properties)
│   │   ├── getCompany(companyId)
│   │   ├── updateCompany(companyId, properties)
│   │   └── searchCompanies(filters)
│   │
│   ├── deals.service.js             # Deal operations
│   │   ├── createDeal(properties, associations)
│   │   ├── getDeal(dealId)
│   │   ├── updateDeal(dealId, properties)
│   │   ├── updateDealStage(dealId, stage)
│   │   └── listDeals(filters)
│   │
│   ├── associations.service.js      # Association operations
│   │   ├── createAssociation(fromId, toId, typeId)
│   │   ├── getAssociations(objectId)
│   │   └── deleteAssociation(fromId, toId, typeId)
│   │
│   └── files.service.js             # File operations
│       ├── uploadFile(file, options)
│       ├── getFile(fileId)
│       └── deleteFile(fileId)
│
├── docusign/
│   └── client.js                    # DocuSign API client
│       ├── sendEnvelope(templateId, signers)
│       ├── getEnvelopeStatus(envelopeId)
│       └── downloadDocument(envelopeId)
│
└── validation/
    ├── contact.validator.js         # Contact schema validation
    ├── deal.validator.js            # Deal schema validation
    └── company.validator.js         # Company schema validation
```

### Utilities (`backend/utils/`)

```
utils/
├── logger.js                        # Winston/Pino logging
├── error-handler.js                 # Centralized error handling
│   ├── handleHubSpotError()         # Parse HubSpot API errors
│   ├── handleValidationError()      # Validation error formatting
│   └── sendErrorResponse()          # Consistent error JSON structure
├── fuzzy-match.js                   # Fuzzy matching algorithm
│   ├── levenshteinDistance()        # String similarity scoring
│   └── findBestMatches()            # Returns top N matches
└── constants.js                     # Shared constants
    ├── DEAL_STAGES                  # Pipeline stage enumeration
    ├── ASSOCIATION_TYPES            # HubSpot association type IDs
    └── FILE_TYPES                   # Allowed upload file types
```

### Middleware (`backend/middleware/`)

```
middleware/
├── auth.middleware.js               # JWT verification
│   └── verifyToken(req, res, next)
├── rate-limit.middleware.js         # Rate limiting
│   └── rateLimiter(req, res, next)
└── cors.middleware.js               # CORS configuration
    └── corsOptions { origin, methods, credentials }
```

### Configuration (`backend/config/`)

```
config/
├── hubspot.config.js
│   ├── HUBSPOT_ACCESS_TOKEN         # From env variable
│   ├── HUBSPOT_API_BASE             # https://api.hubapi.com
│   └── RATE_LIMIT                   # 10 requests/second
├── docusign.config.js
│   ├── DOCUSIGN_INTEGRATION_KEY
│   ├── DOCUSIGN_USER_ID
│   └── DOCUSIGN_ACCOUNT_ID
└── env.config.js
    └── Loads and validates environment variables
```

---

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- WordPress installation on WP-Engine
- HubSpot account with API access
- Vercel account (or AWS for Lambda deployment)
- DocuSign account (for retainer agreements)

### Environment Variables

#### Frontend (`.env`)
```env
REACT_APP_API_BASE_URL=https://your-backend.vercel.app/api
REACT_APP_WORDPRESS_URL=https://yoursite.com
```

#### Backend (`.env`)
```env
HUBSPOT_ACCESS_TOKEN=your_hubspot_access_token
DOCUSIGN_INTEGRATION_KEY=your_docusign_key
DOCUSIGN_USER_ID=your_docusign_user_id
DOCUSIGN_ACCOUNT_ID=your_docusign_account_id
JWT_SECRET=your_jwt_secret
NODE_ENV=production
```

### Installation

#### 1. Clone Repository
```bash
git clone <repository-url>
cd conveyancing-portal-hubspot
```

#### 2. Install Frontend Dependencies
```bash
# Client Portal
cd frontend/client-portal
npm install
cp .env.example .env
# Edit .env with your values

# Agent Portal
cd ../agent-portal
npm install
cp .env.example .env
# Edit .env with your values
```

#### 3. Install Backend Dependencies
```bash
cd ../../backend
npm install
cp .env.example .env
# Edit .env with your HubSpot/DocuSign credentials
```

### Development

#### Run Frontend Locally
```bash
# Client Portal (runs on http://localhost:3000)
cd frontend/client-portal
npm start

# Agent Portal (runs on http://localhost:3001)
cd frontend/agent-portal
npm start
```

#### Run Backend Locally
```bash
cd backend
npm run dev  # Uses Vercel CLI or serverless-offline
```

### Build for Production

#### Frontend
```bash
# Client Portal
cd frontend/client-portal
npm run build
# Output: build/

# Agent Portal
cd frontend/agent-portal
npm run build
# Output: build/
```

#### Backend (Vercel)
```bash
cd backend
vercel --prod
```

### WordPress Deployment

#### 1. Upload Plugin
```bash
# Zip the plugin folder
cd wordpress/wp-content/plugins
zip -r conveyancing-portal-integration.zip conveyancing-portal-integration/

# Upload via WordPress Admin > Plugins > Add New > Upload Plugin
# Or via FTP/SFTP to wp-content/plugins/
```

#### 2. Copy Build Artifacts
```bash
# Copy client portal build
cp -r frontend/client-portal/build/* \
  wordpress/wp-content/plugins/conveyancing-portal-integration/assets/client-portal/

# Copy agent portal build
cp -r frontend/agent-portal/build/* \
  wordpress/wp-content/plugins/conveyancing-portal-integration/assets/agent-portal/
```

#### 3. Activate Plugin
1. Login to WordPress Admin
2. Navigate to Plugins > Installed Plugins
3. Activate "Conveyancing Portal Integration"

#### 4. Create Pages
1. Pages > Add New
2. Title: "Client Portal", Content: `[client_portal]`, Permalink: `/client-portal`
3. Title: "Agent Portal", Content: `[agent_portal]`, Permalink: `/agent-portal`

---

## Documentation

| Document | Description |
|----------|-------------|
| [Database Overview.md](./Database%20Overview.md) | HubSpot object model, properties, associations |
| [Project Overview.md](./Conveyancing%20Portal%20Hubspot%20-%20Project%20Overview.md) | System architecture, workflows, migration rationale |
| API Documentation | API endpoints and authentication (TODO) |
| Deployment Guide | Step-by-step deployment instructions (TODO) |

---

## Key Workflows

### Client-Initiated Disclosure Flow

1. **Client submits initial disclosure form** → WordPress page `/client-portal`
2. **System processes data:**
   - Searches for existing Contact by email
   - If exists: Create Deal → Associate with Contact
   - If new: Create Contact → Create Deal → Associate
3. **Fuzzy match Agency:**
   - Search Companies by business name + email
   - Present confirmation dialog
   - Create agent Contact → Associate with Company + Deal
4. **Client gains portal access** → Deal stage: "Client Portal Sent"
5. **Client completes 5-section disclosure** → Real-time sync to HubSpot Deal properties
6. **Agent reviews in agent portal** → Can add/edit information
7. **DocuSign retainer sent** → Deal stage: "Awaiting Signed Retainer"
8. **Deal progresses through pipeline** → Automated stage updates

### Agent-Initiated Client Creation Flow

1. **Agent logs into agent portal** → WordPress page `/agent-portal`
2. **Agent creates client record:**
   - Inputs seller information (Contact)
   - Selects/creates Agency (Company)
   - Enters property details (Deal)
3. **Property intake 5-step wizard:**
   - Step 1: Client information
   - Step 2: Property details
   - Step 3: 5-section disclosure
   - Step 4: Review
   - Step 5: Submit → Create Contact + Deal + Associations
4. **System generates client portal access** → Email sent with login credentials
5. **Client completes disclosure in client portal** → Bi-directional sync
6. **Deal progresses through pipeline**

---

## HubSpot Objects Reference

### Deals (Transactions)
- **Properties:** `dealname`, `dealstage`, `property_address`, `number_of_owners`, + 30 disclosure fields
- **Associations:** Contact (Primary Seller, Additional Sellers), Company (Agency)

### Contacts (Sellers & Agents)
- **Properties:** `firstname`, `lastname`, `email`, `phone`, `address`, `contact_type`
- **Associations:** Deal, Company

### Companies (Agencies)
- **Properties:** `name`, `address`, `email`, `phone`
- **Associations:** Contact (Agents), Deal

See [Database Overview.md](./Database%20Overview.md) for complete property schemas.

---

## Support

For issues or questions:
- Review documentation in `/docs` folder
- Check HubSpot API status: https://status.hubspot.com
- Contact development team

---

## License

Proprietary - All rights reserved
# Conveyancing-Portal-Hubspot
