# Project Structure - Conveyancing Portal HubSpot

Complete directory structure for the Conveyancing Portal with HubSpot integration.

## 📁 Current Project Structure

```
Conveyancing-Portal-Hubspot/
│
├── README.md                                      # Main project documentation
├── Database Overview.md                           # HubSpot database schema
├── Conveyancing Portal Hubspot - Project Overview.md
├── PROJECT-STRUCTURE.md                           # This file
│
├── frontend/                                      # React applications
│   ├── client-portal/                            # Client-facing portal
│   │   ├── public/
│   │   │   └── index.html                        # HTML entry point
│   │   ├── src/
│   │   │   ├── components/
│   │   │   │   ├── auth/
│   │   │   │   │   └── Login.jsx                 # ✅ OTP login component (CREATED)
│   │   │   │   ├── common/                       # Shared UI components
│   │   │   │   ├── disclosure/                   # 5-section forms
│   │   │   │   ├── dashboard/                    # Client dashboard
│   │   │   │   └── forms/                        # Form components
│   │   │   ├── services/                         # API services
│   │   │   ├── hooks/                            # Custom React hooks
│   │   │   ├── context/                          # Context providers
│   │   │   ├── utils/                            # Utilities
│   │   │   ├── App.jsx                           # ✅ Main app (CREATED)
│   │   │   ├── index.js                          # ✅ Entry point (CREATED)
│   │   │   └── index.css                         # ✅ Global styles (CREATED)
│   │   ├── package.json                          # ✅ Dependencies (CREATED)
│   │   ├── vite.config.js                        # ✅ Vite config (CREATED)
│   │   ├── tailwind.config.js                    # ✅ Tailwind config (CREATED)
│   │   ├── .env.example                          # ✅ Environment template (CREATED)
│   │   └── README.md                             # ✅ Client portal docs (CREATED)
│   │
│   └── agent-portal/                             # Agent-facing portal
│       ├── public/
│       ├── src/
│       │   ├── components/
│       │   │   ├── auth/                         # Agent auth
│       │   │   ├── common/                       # Shared components
│       │   │   ├── clients/                      # Client management
│       │   │   ├── intake/                       # Property intake wizard
│       │   │   ├── dashboard/                    # Agent dashboard
│       │   │   └── agencies/                     # Agency management
│       │   ├── services/
│       │   ├── hooks/
│       │   ├── context/
│       │   └── utils/
│       ├── package.json                          # ✅ Dependencies (CREATED)
│       └── .env.example
│
├── backend/                                       # Serverless functions
│   ├── api/
│   │   ├── contacts/                             # ✅ Created structure
│   │   │   ├── create.js                         # POST /api/contacts/create
│   │   │   ├── get.js                            # GET /api/contacts/:id
│   │   │   ├── update.js                         # PATCH /api/contacts/:id
│   │   │   └── search.js                         # GET /api/contacts/search
│   │   ├── companies/                            # ✅ Created structure
│   │   │   ├── create.js
│   │   │   ├── get.js
│   │   │   ├── update.js
│   │   │   └── fuzzy-match.js
│   │   ├── deals/                                # ✅ Created structure
│   │   │   ├── create.js
│   │   │   ├── get.js
│   │   │   ├── update.js
│   │   │   ├── update-stage.js
│   │   │   └── list.js
│   │   ├── associations/                         # ✅ Created structure
│   │   │   ├── create.js
│   │   │   └── delete.js
│   │   ├── files/                                # ✅ Created structure
│   │   │   ├── upload.js
│   │   │   ├── get.js
│   │   │   └── delete.js
│   │   ├── docusign/                             # ✅ Created structure
│   │   │   ├── send-retainer.js
│   │   │   ├── webhook.js
│   │   │   └── get-status.js
│   │   └── auth/                                 # ✅ Created structure
│   │       ├── login.js
│   │       ├── verify-token.js
│   │       └── refresh.js
│   ├── services/
│   │   ├── hubspot/                              # ✅ Created structure
│   │   │   ├── client.js
│   │   │   ├── contacts.service.js
│   │   │   ├── companies.service.js
│   │   │   ├── deals.service.js
│   │   │   ├── associations.service.js
│   │   │   └── files.service.js
│   │   ├── docusign/                             # ✅ Created structure
│   │   │   └── client.js
│   │   └── validation/                           # ✅ Created structure
│   │       ├── contact.validator.js
│   │       ├── deal.validator.js
│   │       └── company.validator.js
│   ├── utils/                                    # ✅ Created structure
│   ├── middleware/                               # ✅ Created structure
│   ├── config/                                   # ✅ Created structure
│   ├── package.json                              # ✅ Dependencies (CREATED)
│   ├── vercel.json                               # ✅ Vercel config (CREATED)
│   └── .env.example                              # ✅ Environment template (CREATED)
│
├── wordpress/                                     # WordPress integration
│   └── wp-content/
│       └── plugins/
│           └── conveyancing-portal-integration/  # ✅ Created structure
│               ├── conveyancing-portal.php       # ✅ Main plugin file (CREATED)
│               ├── includes/
│               │   ├── enqueue-scripts.php       # ✅ Script loader (CREATED)
│               │   └── shortcodes.php            # ✅ Shortcodes (CREATED)
│               ├── assets/
│               │   ├── client-portal/            # React build artifacts
│               │   │   └── (build files here)
│               │   └── agent-portal/             # React build artifacts
│               │       └── (build files here)
│               └── README.md
│
└── shared/                                        # Shared utilities
    ├── types/                                    # ✅ Created structure
    ├── constants/
    │   ├── dealStages.js                         # ✅ Pipeline stages (CREATED)
    │   ├── disclosureSections.js                 # ✅ Disclosure fields (CREATED)
    │   └── fileTypes.js
    └── utils/                                    # ✅ Created structure
```

## ✅ Files Created

### Frontend - Client Portal
1. **[Login.jsx](frontend/client-portal/src/components/auth/Login.jsx)** - Complete OTP authentication component
2. **[App.jsx](frontend/client-portal/src/App.jsx)** - Main app with routing
3. **[index.js](frontend/client-portal/src/index.js)** - React entry point
4. **[index.css](frontend/client-portal/src/index.css)** - Global styles with Tailwind
5. **[package.json](frontend/client-portal/package.json)** - Dependencies and scripts
6. **[vite.config.js](frontend/client-portal/vite.config.js)** - Vite build configuration
7. **[tailwind.config.js](frontend/client-portal/tailwind.config.js)** - Tailwind CSS config
8. **[.env.example](frontend/client-portal/.env.example)** - Environment variables template
9. **[README.md](frontend/client-portal/README.md)** - Client portal documentation
10. **[index.html](frontend/client-portal/public/index.html)** - HTML entry point

### Frontend - Agent Portal
11. **[package.json](frontend/agent-portal/package.json)** - Dependencies with agent-specific packages

### Backend
12. **[package.json](backend/package.json)** - Serverless functions dependencies
13. **[vercel.json](backend/vercel.json)** - Vercel deployment configuration
14. **[.env.example](backend/.env.example)** - Complete environment variables template

### WordPress Plugin
15. **[conveyancing-portal.php](wordpress/wp-content/plugins/conveyancing-portal-integration/conveyancing-portal.php)** - Main plugin file
16. **[enqueue-scripts.php](wordpress/wp-content/plugins/conveyancing-portal-integration/includes/enqueue-scripts.php)** - Script/style loader
17. **[shortcodes.php](wordpress/wp-content/plugins/conveyancing-portal-integration/includes/shortcodes.php)** - Shortcode definitions

### Shared Constants
18. **[dealStages.js](shared/constants/dealStages.js)** - 10-stage pipeline constants
19. **[disclosureSections.js](shared/constants/disclosureSections.js)** - 5-section disclosure framework

## 🚀 Getting Started

### 1. Install Client Portal
```bash
cd frontend/client-portal
npm install
cp .env.example .env
npm run dev
```

### 2. Install Agent Portal
```bash
cd frontend/agent-portal
npm install
cp .env.example .env
npm run dev
```

### 3. Install Backend
```bash
cd backend
npm install
cp .env.example .env
npm run dev
```

### 4. WordPress Plugin Setup
1. Copy `wordpress/wp-content/plugins/conveyancing-portal-integration/` to your WordPress installation
2. Activate the plugin in WordPress Admin
3. Build frontend apps: `npm run build`
4. Copy build artifacts to plugin assets folder

## 📋 Next Steps

### Client Portal
- [ ] Create dashboard components
- [ ] Build 5-section disclosure forms
- [ ] Implement file upload functionality
- [ ] Add deal timeline visualization
- [ ] Integrate authentication service

### Agent Portal
- [ ] Build client management UI
- [ ] Create property intake wizard
- [ ] Implement agency fuzzy matching
- [ ] Add deal pipeline view
- [ ] Create agent dashboard

### Backend
- [ ] Implement HubSpot API endpoints
- [ ] Create authentication middleware
- [ ] Add DocuSign integration
- [ ] Build file upload service
- [ ] Add rate limiting

### WordPress
- [ ] Test plugin activation
- [ ] Configure custom page templates
- [ ] Add .htaccess rules for React Router
- [ ] Test shortcode rendering
- [ ] Configure CORS settings

## 🔗 Key Files Reference

| File | Purpose | Location |
|------|---------|----------|
| Login Component | OTP authentication UI | [frontend/client-portal/src/components/auth/Login.jsx](frontend/client-portal/src/components/auth/Login.jsx) |
| Main Plugin File | WordPress plugin entry | [wordpress/wp-content/plugins/conveyancing-portal-integration/conveyancing-portal.php](wordpress/wp-content/plugins/conveyancing-portal-integration/conveyancing-portal.php) |
| Deal Stages | Pipeline constants | [shared/constants/dealStages.js](shared/constants/dealStages.js) |
| Disclosure Sections | Form field definitions | [shared/constants/disclosureSections.js](shared/constants/disclosureSections.js) |
| Vercel Config | Serverless deployment | [backend/vercel.json](backend/vercel.json) |

## 📚 Documentation

- **[README.md](./README.md)** - Main project overview and setup
- **[Database Overview.md](./Database%20Overview.md)** - HubSpot object schemas
- **[Project Overview.md](./Conveyancing%20Portal%20Hubspot%20-%20Project%20Overview.md)** - System architecture
- **[Client Portal README](./frontend/client-portal/README.md)** - Client portal specific docs

## 🛠️ Technology Stack Summary

### Frontend
- **React 18** with Hooks
- **React Router 6** for navigation
- **Vite** for fast builds
- **Tailwind CSS** for styling
- **Lucide React** for icons
- **Axios** for API calls

### Backend
- **Vercel Serverless Functions**
- **HubSpot API Client**
- **JWT** for authentication
- **Express** middleware
- **Joi** for validation
- **Winston** for logging

### WordPress
- **Custom Plugin** architecture
- **Shortcode** system
- **Asset Manifest** parsing
- **React SPA** integration

### Database
- **HubSpot CRM** (Contacts, Companies, Deals)
- **File Manager** for documents
- **Associations API** for relationships

## ✨ Key Features Implemented

1. ✅ **Login Component** - Beautiful OTP authentication with animated UI
2. ✅ **Project Structure** - Complete directory scaffolding
3. ✅ **WordPress Plugin** - Full integration with React apps
4. ✅ **Configuration Files** - All package.json, env templates, configs
5. ✅ **Shared Constants** - Deal stages and disclosure sections
6. ✅ **Build System** - Vite for frontend, Vercel for backend

## 📝 Environment Variables Required

### Frontend
- `VITE_API_BASE_URL` - Backend API URL
- `VITE_WORDPRESS_URL` - WordPress site URL

### Backend
- `HUBSPOT_ACCESS_TOKEN` - HubSpot API token
- `JWT_SECRET` - JWT signing secret
- `DOCUSIGN_INTEGRATION_KEY` - DocuSign credentials
- `SMTP_*` - Email configuration for OTP
- `TWILIO_*` - SMS configuration for OTP

---

**Project Status**: ✅ Structure Complete | 🚧 Implementation In Progress

For detailed implementation guides, see the respective README files in each directory.
