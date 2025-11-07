# Conveyancing Portal - HubSpot Integration

## 🎉 Project Overview

A modern, cloud-native conveyancing portal that automates property transaction workflows for Australian law firms. Integrates seamlessly with HubSpot CRM, DocuSign, Stripe, and Smokeball.

### ✨ Key Features

- **Client Portal** - Multi-step property disclosure form with real-time validation
- **Agent Portal** - Dashboard for real estate agents to submit and track leads
- **DocuSign Integration** - Embedded document signing with JWT authentication
- **Stripe Payments** - Secure payment processing with automatic receipting
- **Smokeball Integration** - Australian legal CRM synchronization
- **Automated Workflows** - Stage-based deal progression with webhook automation
- **CI/CD Pipeline** - Automated deployments to Vercel and Cloudflare

---

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- npm or yarn
- HubSpot Developer Account
- DocuSign Developer Account
- Stripe Account
- Smokeball Account (optional)

### Installation

```bash
# Clone repository
git clone https://github.com/your-org/conveyancing-portal-hubspot.git
cd conveyancing-portal-hubspot

# Install backend dependencies
cd backend
npm install
cp .env.example .env
# Edit .env with your credentials

# Install frontend dependencies
cd ../frontend
npm install
cp .env.example .env
# Edit .env with your API URL

# Start development servers
cd ../backend && npm run dev  # Backend on http://localhost:3001
cd ../frontend && npm run dev  # Frontend on http://localhost:3000
```

---

## 📁 Project Structure

```
conveyancing-portal-hubspot/
├── .github/workflows/          # CI/CD pipelines
│   ├── deploy-backend.yml      # Vercel deployment
│   ├── deploy-frontend.yml     # Cloudflare Pages deployment
│   └── deploy-webhooks.yml     # Cloudflare Workers deployment
│
├── backend/                    # Node.js/Express API
│   ├── src/
│   │   ├── config/            # Configuration files
│   │   ├── integrations/      # External API clients
│   │   ├── routes/            # API endpoints
│   │   ├── services/          # Business logic & workflows
│   │   └── utils/             # Helper functions
│   ├── package.json
│   └── vercel.json
│
├── frontend/                   # React/Vite SPA
│   ├── src/
│   │   ├── components/        # React components
│   │   ├── context/           # React Context providers
│   │   ├── hooks/             # Custom React hooks
│   │   └── utils/             # Frontend utilities
│   ├── package.json
│   └── vite.config.js
│
├── workers/                    # Cloudflare Workers (Webhooks)
│   ├── docusign-webhook/      # DocuSign event handler
│   ├── stripe-webhook/        # Stripe payment handler
│   └── smokeball-webhook/     # Smokeball matter handler
│
├── docs/                       # Comprehensive documentation
│   ├── README.md              # Documentation index
│   ├── ARCHITECTURE.md        # System architecture
│   ├── INTEGRATIONS.md        # API integrations guide
│   ├── WORKFLOWS.md           # Automated workflows
│   ├── DEPLOYMENT.md          # Deployment guide
│   └── CHANGELOG.md           # Version history
│
├── archive/                    # Old documentation (archived)
├── .gitignore
└── README.md                   # This file
```

---

## 📚 Documentation

### Core Documentation

- **[Architecture Guide](./docs/ARCHITECTURE.md)** - System design, tech stack, hosting strategy
- **[Integrations Guide](./docs/INTEGRATIONS.md)** - HubSpot, DocuSign, Stripe, Smokeball APIs
- **[Workflows Guide](./docs/WORKFLOWS.md)** - Automated stage progressions and webhooks
- **[Deployment Guide](./docs/DEPLOYMENT.md)** - Production setup and CI/CD pipeline
- **[Changelog](./docs/CHANGELOG.md)** - Version history and bug fixes

### Quick Links

- [Local Development Setup](./docs/DEPLOYMENT.md#local-development-setup)
- [Environment Variables](./docs/DEPLOYMENT.md#configuration)
- [CI/CD Setup](./docs/DEPLOYMENT.md#cicd-setup-with-github-actions)
- [Troubleshooting](./docs/DEPLOYMENT.md#troubleshooting)

---

## 🏗️ Architecture

```
┌──────────────────────────────────────────────────────────┐
│         portal.stanfordlegal.com.au (Cloudflare)         │
│                    React Frontend                        │
└────────────────────┬──────────────────────────────────────┘
                     │
                     ↓ API Calls
┌──────────────────────────────────────────────────────────┐
│          api.stanfordlegal.com.au (Vercel)               │
│                  Node.js Backend                         │
│  ┌───────────┐  ┌───────────┐  ┌───────────┐  ┌──────┐ │
│  │  HubSpot  │  │ DocuSign  │  │  Stripe   │  │Smoke-││
│  │Integration│  │Integration│  │Integration│  │ ball ││
│  └───────────┘  └───────────┘  └───────────┘  └──────┘ │
└────────────────────┬──────────────────────────────────────┘
                     │
         ┌───────────┴──────────┐
         ↓                       ↓
┌──────────────────┐  ┌────────────────────────┐
│   HubSpot CRM    │  │  webhooks.stanford     │
│   (Database)     │  │   legal.com.au         │
│                  │  │  (Cloudflare Workers)  │
│  - Contacts      │  │  - DocuSign Webhook    │
│  - Companies     │  │  - Stripe Webhook      │
│  - Deals         │  │  - Smokeball Webhook   │
└──────────────────┘  └────────────────────────┘
```

---

## 🔄 Automated Workflows

### 1. DocuSign Signing → Payment Request

```
Client signs document → Status polling → Completed
    ↓
Update HubSpot → Progress to "Funds Requested"
    ↓
Unlock payment section in portal
```

### 2. Stripe Payment → Funds Provided

```
Payment submitted → Stripe webhook → Verified
    ↓
Update HubSpot → Progress to "Funds Provided"
    ↓
Receipt to Smokeball trust account
    ↓
Create tasks for conveyancer
```

### 3. Smokeball Synchronization

```
Deal created → Create Smokeball lead
    ↓
Quote accepted → Convert to matter + Create tasks
    ↓
Payment received → Receipt to trust account
```

---

## 🚀 Deployment

### Development

```bash
# Backend
cd backend
npm run dev  # http://localhost:3001

# Frontend
cd frontend
npm run dev  # http://localhost:3000
```

### Production

The project uses GitHub Actions for automated CI/CD:

1. **Push to main branch** triggers automatic deployment
2. **Backend** deploys to Vercel Serverless Functions
3. **Frontend** deploys to Cloudflare Pages
4. **Webhooks** deploy to Cloudflare Workers

**Required GitHub Secrets:**
```
VERCEL_TOKEN
VERCEL_ORG_ID
VERCEL_PROJECT_ID
CLOUDFLARE_API_TOKEN
CLOUDFLARE_ACCOUNT_ID
HUBSPOT_ACCESS_TOKEN
STRIPE_PUBLISHABLE_KEY
STRIPE_WEBHOOK_SECRET
```

See [Deployment Guide](./docs/DEPLOYMENT.md) for detailed instructions.

---

## 🔐 Security

- ✅ All environment variables encrypted
- ✅ HTTPS enforced on all domains
- ✅ Webhook signature verification
- ✅ JWT authentication for sessions
- ✅ No sensitive data in repository
- ✅ Private keys excluded from git

---

## 🧪 Testing

### Manual Testing

```bash
# Test backend API
curl http://localhost:3001/api/health

# Test Stripe webhook (requires Stripe CLI)
stripe listen --forward-to localhost:3001/api/webhook/stripe
```

### Webhook Testing

Use [webhook.site](https://webhook.site) to inspect webhook payloads:

1. Get unique URL from webhook.site
2. Set as `DOCUSIGN_WEBHOOK_URL` in environment
3. Trigger event (e.g., sign document)
4. View received payload in webhook.site

---

## 📈 Current Status

**Version:** 2.0 (Production Ready)

### ✅ Completed Features

- Client Portal with multi-step form
- Agent Portal with dashboard
- HubSpot CRM integration
- DocuSign JWT authentication & embedded signing
- Stripe payment processing
- Smokeball CRM integration
- Automated stage progressions
- Webhook handlers (Stripe, Smokeball)
- CI/CD pipeline setup

### 🔄 In Progress

- DocuSign webhooks (EventNotification configured, pending testing)
- DNS configuration for production domains
- End-to-end webhook testing

### 📅 Roadmap

- Real-time status updates (WebSocket)
- Email notifications
- SMS notifications (Twilio)
- Advanced analytics dashboard
- Multi-region deployment

---

## 🤝 Contributing

This is a proprietary project for Stanford Legal. All contributions should follow the established coding standards and be thoroughly tested before merging to main.

### Code Standards

- **Linting:** ESLint configured for backend and frontend
- **Formatting:** Prettier for consistent code style
- **Documentation:** JSDoc comments for all functions
- **Error Handling:** Comprehensive try-catch blocks
- **Logging:** Structured logging with context

---

## 📞 Support

For technical issues or questions:

- **Documentation:** See `docs/` folder
- **API Reference:** See `docs/INTEGRATIONS.md`
- **Deployment Help:** See `docs/DEPLOYMENT.md`
- **Troubleshooting:** See `docs/DEPLOYMENT.md#troubleshooting`

---

## 📝 License

Proprietary - Stanford Legal © 2025

All rights reserved. Unauthorized copying, distribution, or use of this software is strictly prohibited.

---

## Acknowledgments

- **Development:** Pratham Manocha (Head of Tech)
- **HubSpot Integration:** Corey Sneesby (Head of CRM)
- **Testing & Feedback:** Corey Sneesby & Logan Stanford (Managing Director) 
- **Project Management:** Stanford Legal

---

**🎯 Ready to deploy? See the [Deployment Guide](./docs/DEPLOYMENT.md) to get started!**
