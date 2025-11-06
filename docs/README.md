# Conveyancing Portal - HubSpot Integration

## Project Overview

A comprehensive conveyancing portal that integrates with HubSpot CRM, DocuSign, Stripe, and Smokeball to automate the property conveyancing process for Australian law firms.

### Key Features

- **Client Portal**: Multi-step property disclosure form with dynamic quote generation
- **Agent Portal**: Dashboard for real estate agents to submit leads and track progress
- **DocuSign Integration**: Embedded document signing with JWT authentication
- **Stripe Payments**: Automated payment processing and trust account receipting
- **Smokeball Integration**: CRM synchronization for legal practice management
- **Automated Workflows**: Stage-based deal progression with webhook automation

### Architecture

```
┌──────────────────────────────────────────────────────────┐
│                    Frontend (React/Vite)                  │
│  ┌─────────────────┐  ┌──────────────────────────────┐  │
│  │  Client Portal  │  │     Agent Portal             │  │
│  │  - Property Info│  │  - Lead Management           │  │
│  │  - Questionnaire│  │  - Deal Tracking             │  │
│  │  - Signing      │  │  - Task Management           │  │
│  │  - Payment      │  │                               │  │
│  └─────────────────┘  └──────────────────────────────┘  │
└─────────────────────────┬────────────────────────────────┘
                          │
                          ↓
┌──────────────────────────────────────────────────────────┐
│              Backend API (Node.js/Express)                │
│  ┌──────────┐  ┌──────────┐  ┌───────────┐  ┌─────────┐│
│  │ HubSpot  │  │ DocuSign │  │  Stripe   │  │Smokeball││
│  │Integration│  │Integration│  │Integration│  │  Int.   ││
│  └──────────┘  └──────────┘  └───────────┘  └─────────┘│
└─────────────────────────┬────────────────────────────────┘
                          │
             ┌────────────┴────────────┐
             ↓                         ↓
┌──────────────────────┐  ┌──────────────────────┐
│   HubSpot CRM        │  │  External Services    │
│  - Contacts          │  │  - DocuSign          │
│  - Companies         │  │  - Stripe            │
│  - Deals             │  │  - Smokeball         │
└──────────────────────┘  └──────────────────────┘
```

### Technology Stack

**Frontend:**
- React 18.2
- Vite 5.0
- React Router 6.20
- Tailwind CSS 3.3
- Axios
- Stripe.js / React Stripe

**Backend:**
- Node.js 18+
- Express 4.18
- DocuSign eSign SDK 8.5
- Stripe SDK 19.2
- HubSpot API Client 10.1
- JWT/OAuth2 Authentication

**Deployment:**
- Frontend: Cloudflare Pages (planned)
- Backend: Vercel (planned)
- Webhooks: Cloudflare Workers (planned)

### Quick Start

#### Prerequisites
- Node.js 18+
- npm or yarn
- HubSpot Developer Account
- DocuSign Developer Account
- Stripe Account
- Smokeball Account (optional)

#### Installation

```bash
# Clone repository
git clone https://github.com/your-org/conveyancing-portal-hubspot.git
cd conveyancing-portal-hubspot

# Install backend dependencies
cd backend
npm install

# Install frontend dependencies  
cd ../frontend
npm install
```

#### Configuration

1. **Backend Environment Variables** (`backend/.env`):
```bash
# HubSpot
HUBSPOT_ACCESS_TOKEN=your_hubspot_token

# DocuSign
DOCUSIGN_INTEGRATION_KEY=your_integration_key
DOCUSIGN_USER_ID=your_user_id
DOCUSIGN_ACCOUNT_ID=your_account_id
DOCUSIGN_PRIVATE_KEY=your_rsa_private_key
DOCUSIGN_KEYPAIR_ID=your_keypair_id

# Stripe
STRIPE_SECRET_KEY=your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=your_webhook_secret

# Smokeball (Optional)
SMOKEBALL_CLIENT_ID=your_client_id
SMOKEBALL_CLIENT_SECRET=your_client_secret
SMOKEBALL_API_KEY=your_api_key

# JWT
JWT_SECRET=your_jwt_secret
```

2. **Frontend Environment Variables** (`frontend/.env`):
```bash
VITE_API_BASE_URL=http://localhost:3001
VITE_STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key
```

#### Running Locally

```bash
# Start backend (port 3001)
cd backend
npm run dev

# Start frontend (port 3000)
cd frontend
npm run dev
```

Visit:
- Client Portal: http://localhost:3000
- Agent Portal: http://localhost:3000/agent
- Backend API: http://localhost:3001/api

### Documentation

- [Architecture](./ARCHITECTURE.md) - System architecture and design decisions
- [Integrations](./INTEGRATIONS.md) - HubSpot, DocuSign, Stripe, Smokeball integrations
- [Workflows](./WORKFLOWS.md) - Automated stage progressions and webhooks
- [Features](./FEATURES.md) - Client portal, agent portal, and feature implementations
- [Deployment](./DEPLOYMENT.md) - Production deployment guide
- [Changelog](./CHANGELOG.md) - Version history and bug fixes

### Project Status

**Current Version**: 2.0  
**Status**: Production Ready

#### Completed Features
- ✅ Client Portal (Multi-step form)
- ✅ Agent Portal (Dashboard & lead management)
- ✅ HubSpot CRM Integration
- ✅ DocuSign Embedded Signing (JWT Auth)
- ✅ Stripe Payment Processing
- ✅ Smokeball CRM Integration
- ✅ Automated Stage Progressions
- ✅ Webhook Handlers (Stripe, Smokeball)

#### In Progress
- 🔄 DocuSign Webhooks (Event Notification)
- 🔄 CI/CD Pipeline Setup
- 🔄 Production Deployment

### Support

For issues or questions:
- Technical Documentation: See `docs/` folder
- API Reference: `docs/INTEGRATIONS.md`
- Troubleshooting: `docs/DEPLOYMENT.md`

### License

Proprietary - Stanford Legal © 2025

