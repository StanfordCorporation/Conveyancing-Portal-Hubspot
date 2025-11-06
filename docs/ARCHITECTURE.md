# System Architecture

## Overview

The Conveyancing Portal is a modern, cloud-native application built with a microservices-inspired architecture, utilizing serverless functions and managed services for scalability and reliability.

## High-Level Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                  stanfordlegal.com.au (WordPress)                 │
│                       Main Website (WP Engine)                    │
└────────────────────────────┬──────────────────────────────────────┘
                             │
                             ↓ Link to Portal
┌──────────────────────────────────────────────────────────────────┐
│         portal.stanfordlegal.com.au (Cloudflare Pages)            │
│                    React Frontend (Vite Build)                    │
│  ┌──────────────────┐          ┌───────────────────────────┐    │
│  │  Client Portal   │          │      Agent Portal         │    │
│  │ - Property Info  │          │  - Lead Management        │    │
│  │ - Questionnaire  │          │  - Deal Tracking          │    │
│  │ - DocuSign       │          │  - Dashboard              │    │
│  │ - Payment        │          │                            │    │
│  └──────────────────┘          └───────────────────────────┘    │
└────────────────────────────┬──────────────────────────────────────┘
                             │
                             ↓ API Calls
┌──────────────────────────────────────────────────────────────────┐
│          api.stanfordlegal.com.au (Vercel Serverless)             │
│                      Node.js Backend API                          │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌───────────┐ │
│  │  HubSpot   │  │  DocuSign  │  │   Stripe   │  │ Smokeball │ │
│  │Integration │  │Integration │  │Integration │  │Integration│ │
│  └────────────┘  └────────────┘  └────────────┘  └───────────┘ │
└────────────────────────────┬──────────────────────────────────────┘
                             │
         ┌───────────────────┴─────────────────┐
         ↓                                      ↓
┌─────────────────────┐            ┌──────────────────────────┐
│   HubSpot CRM       │            │  webhooks.stanfordlegal  │
│  (Database Layer)   │            │   .com.au (Cloudflare)   │
│                     │            │                          │
│  - Contacts         │    ┌──────→│  Webhook Handlers:       │
│  - Companies        │    │       │  - DocuSign Webhook      │
│  - Deals            │    │       │  - Stripe Webhook        │
│  - Custom Props     │    │       │  - Smokeball Webhook     │
└─────────────────────┘    │       └──────────────────────────┘
                           │                    │
         ┌─────────────────┘                    │
         │                                      │
┌─────────────────┐                             │
│ External APIs   │◄────────────────────────────┘
│ - DocuSign      │
│ - Stripe        │
│ - Smokeball     │
└─────────────────┘
```

## Technology Stack

### Frontend Layer

**Framework:** React 18.2 with Vite 5.0
- Single Page Application (SPA) architecture
- Component-based UI with React Hooks
- Client-side routing with React Router 6.20
- State management using React Context API

**Styling:** Tailwind CSS 3.3
- Utility-first CSS framework
- Custom design system
- Responsive design (mobile-first)
- Dark mode support (future)

**Build Tool:** Vite
- Fast HMR (Hot Module Replacement)
- Optimized production builds
- Code splitting
- Tree shaking

**Key Libraries:**
- `axios` - HTTP client
- `@stripe/react-stripe-js` - Payment UI components
- `lucide-react` - Icon library

**Deployment:** Cloudflare Pages
- Global CDN distribution
- Automatic SSL certificates
- Edge caching
- Git-based deployments

### Backend Layer

**Runtime:** Node.js 18+ with Express 4.18
- RESTful API design
- Middleware-based architecture
- JWT authentication
- CORS enabled

**API Framework:** Express.js
- Route-based organization
- Middleware for auth, logging, error handling
- JSON request/response handling

**Authentication:**
- JWT tokens for client/agent sessions
- OAuth2 + PKCE for DocuSign
- OAuth2 with refresh tokens for Smokeball
- API key authentication for Stripe

**Key Integrations:**
- `@hubspot/api-client` 10.1 - CRM operations
- `docusign-esign` 8.5 - Document signing
- `stripe` 19.2 - Payment processing
- Custom Smokeball client (axios-based)

**Deployment:** Vercel Serverless Functions
- Auto-scaling
- Zero-downtime deployments
- Environment variable management
- Function-level logging

### Webhook Layer (Cloudflare Workers)

**Purpose:** High-availability webhook receivers

**Benefits:**
- 99.99% uptime SLA
- Edge computing (global distribution)
- Instant cold starts
- Cost-effective (100k requests/day free)

**Workers:**
1. **DocuSign Webhook** - Receives envelope events
2. **Stripe Webhook** - Receives payment events
3. **Smokeball Webhook** - Receives matter events

**Architecture:**
```javascript
// Cloudflare Worker Pattern
export default {
  async fetch(request, env, ctx) {
    // 1. Receive webhook from external service
    const payload = await request.json();
    
    // 2. Extract required data
    const dealId = extractDealId(payload);
    const status = extractStatus(payload);
    
    // 3. Update HubSpot directly
    await updateHubSpot(dealId, {
      property: status
    });
    
    // 4. Return 200 immediately
    return new Response(JSON.stringify({ received: true }), {
      status: 200
    });
  }
};
```

### Data Layer

**Primary Database:** HubSpot CRM (Cloud-based)
- Contacts (clients, agents, sellers)
- Companies (agencies)
- Deals (property transactions)
- Custom properties for integration data

**Why HubSpot as Database?**
- ✅ Already the system of record
- ✅ Built-in CRM features (pipelines, tasks, activities)
- ✅ No additional database infrastructure
- ✅ Powerful API and webhook support
- ✅ Automatic data backup and redundancy

**Custom Properties:**
```javascript
// Deal Properties (HubSpot)
{
  // DocuSign
  docusign_csa_json: JSON,           // Envelope data
  
  // Smokeball
  lead_uid: string,                  // Smokeball matter UUID
  matter_uid: string,                // Smokeball matter number
  smokeball_sync_status: enum,
  smokeball_transaction_id: string,
  
  // Stripe
  stripe_payment_intent_id: string,
  stripe_customer_id: string,
  payment_status: enum,
  payment_amount: number,
  payment_date: date,
  
  // Workflow
  dealstage: enum                    // Current pipeline stage
}
```

## Hosting Architecture

### Recommended Setup

```
DNS Configuration (via WP Engine or Cloudflare DNS):

portal.stanfordlegal.com.au      → Cloudflare Pages
    CNAME → stanford-portal.pages.dev
    SSL: Auto (Cloudflare)
    
api.stanfordlegal.com.au         → Vercel
    CNAME → stanford-backend.vercel.app
    SSL: Auto (Vercel)
    
webhooks.stanfordlegal.com.au    → Cloudflare Workers
    CNAME → stanford-webhooks.workers.dev
    SSL: Auto (Cloudflare)
```

### Why This Architecture?

**Subdomain Approach:**
- ✅ Clean separation of concerns
- ✅ Independent deployment cycles
- ✅ Easy to configure DNS (WP Engine supports CNAME)
- ✅ No reverse proxy configuration needed
- ✅ Better performance (CDN per service)

**Cloudflare Pages (Frontend):**
- ✅ 99.99% uptime
- ✅ Global CDN (300+ locations)
- ✅ Automatic builds from Git
- ✅ Preview deployments
- ✅ Free tier generous (unlimited bandwidth)

**Vercel (Backend API):**
- ✅ Optimized for Node.js/Express
- ✅ Automatic scaling
- ✅ Zero config deployment
- ✅ Environment variables management
- ✅ Function logs and monitoring
- ✅ Free tier (100GB bandwidth/month)

**Cloudflare Workers (Webhooks):**
- ✅ 99.99% uptime (critical for webhooks)
- ✅ Sub-millisecond response times
- ✅ No cold starts
- ✅ Cheaper than running dedicated servers
- ✅ Free tier (100k requests/day)

## Security Architecture

### Authentication & Authorization

**Client/Agent Sessions:**
```
1. User logs in with contact ID
2. Backend generates JWT token
3. Token includes: contactId, dealId, expiresAt
4. Frontend stores token in localStorage
5. All API calls include token in Authorization header
6. Backend validates JWT on each request
```

**DocuSign Authentication:**
- JWT Grant (Service Integration)
- RSA-2048 key pair
- Auto-refresh tokens (1 hour expiry)
- Impersonation consent granted once

**Stripe Authentication:**
- API keys (publishable & secret)
- Webhook signing secrets (HMAC-SHA256)
- PCI DSS compliant (Stripe hosted)

**Smokeball Authentication:**
- OAuth2 Authorization Code + PKCE
- Token refresh mechanism
- Auto-refresh 5 minutes before expiry

### Data Security

**In Transit:**
- All connections use TLS 1.2+
- HTTPS enforced on all domains
- Strict Content Security Policy

**At Rest:**
- HubSpot encryption (managed by HubSpot)
- Environment variables encrypted (Vercel/Cloudflare)
- No sensitive data in frontend code

**Secrets Management:**
```bash
# Development (.env - not committed)
DOCUSIGN_PRIVATE_KEY=...
STRIPE_SECRET_KEY=...
HUBSPOT_ACCESS_TOKEN=...

# Production (Platform secrets)
Vercel Environment Variables (encrypted)
Cloudflare Workers Secrets (KV storage)
```

### Webhook Security

**Stripe Webhooks:**
```javascript
// Signature verification (HMAC-SHA256)
const sig = request.headers['stripe-signature'];
const event = stripe.webhooks.constructEvent(
  rawBody,
  sig,
  webhookSecret
);
```

**DocuSign Webhooks:**
```javascript
// HMAC signature verification
const signature = request.headers['x-docusign-signature-1'];
const verified = verifyHMAC(rawBody, signature, webhookKey);
```

**Smokeball Webhooks:**
```javascript
// API key validation
const apiKey = request.headers['x-api-key'];
if (apiKey !== SMOKEBALL_API_KEY) {
  return 401;
}
```

## Workflow Architecture

### Stage-Based Automation

```
Deal Pipeline (11 Stages):

1. Draft → 2. Client Details → 3. Quote → 4. Awaiting Retainer
                                              ↓
                                       [DocuSign Signing]
                                              ↓
5. Funds Requested ← [Signing Complete Webhook]
        ↓
   [Stripe Payment]
        ↓
6. Funds Provided ← [Payment Success Webhook]
        ↓
   [Smokeball Automation]
        ↓
7. Searches Ordered → 8. Searches Sent → 9. Searches Returned
        ↓
10. Form 2 Drafting → 11. Settlement
```

### Webhook-Driven Workflows

**Pattern:**
```
External Event (DocuSign/Stripe/Smokeball)
    ↓
Webhook Received (Cloudflare Worker or Vercel)
    ↓
Update HubSpot Deal Properties
    ↓
Check Conditions (stage, status)
    ↓
Trigger Actions (progress stage, create tasks, send emails)
```

**Example: Payment Success Flow**
```javascript
// 1. Stripe sends webhook
POST webhooks.stanfordlegal.com.au/stripe
{
  type: "payment_intent.succeeded",
  data: { amount: 17548, metadata: { dealId: "123" } }
}

// 2. Worker updates HubSpot
PATCH api.hubapi.com/crm/v3/objects/deals/123
{
  payment_status: "Paid",
  payment_amount: "175.48",
  dealstage: "1904359900" // FUNDS_PROVIDED
}

// 3. HubSpot webhook triggers Smokeball (future)
POST api.stanfordlegal.com.au/workflows/funds-provided
{
  dealId: "123"
}

// 4. Smokeball workflow executes
- Receipt payment to trust account
- Convert lead to matter
- Create welcome tasks
```

## Performance Optimizations

### Frontend
- Code splitting by route
- Lazy loading components
- Image optimization (WebP)
- CDN caching (Cloudflare)
- Gzip compression

### Backend
- API response caching (in-memory)
- Connection pooling (HTTP keep-alive)
- Retry logic with exponential backoff
- Rate limiting (per integration)

### Database
- Batch operations where possible
- Selective property fetching
- Caching frequently accessed data

## Monitoring & Logging

### Application Logs
- Vercel Function Logs
- Cloudflare Workers Analytics
- Console logging (structured JSON)

### Error Tracking (Future)
- Sentry integration
- Custom error boundaries
- Webhook failure notifications

### Performance Monitoring (Future)
- Vercel Analytics
- Cloudflare Web Analytics
- API response time tracking

## Scalability Considerations

**Current Capacity:**
- Frontend: Unlimited (Cloudflare CDN)
- Backend: Auto-scaling (Vercel serverless)
- Webhooks: 100k requests/day (Cloudflare free tier)

**Growth Path:**
- Upgrade to Cloudflare Workers paid tier ($5/month for 10M requests)
- Upgrade to Vercel Pro ($20/month for 1TB bandwidth)
- Consider dedicated webhook infrastructure if volume exceeds 10M/month

## Disaster Recovery

**Backup Strategy:**
- HubSpot: Automatic backups (managed by HubSpot)
- Code: Git repository (GitHub)
- Environment variables: Documented in `.env.example`

**Recovery Procedures:**
1. Frontend: Redeploy from Git (Cloudflare Pages)
2. Backend: Redeploy from Git (Vercel)
3. Webhooks: Redeploy workers (Cloudflare CLI)

**RPO (Recovery Point Objective):** < 1 hour (Git commits)  
**RTO (Recovery Time Objective):** < 15 minutes (re-deployment)

## Future Architecture Enhancements

1. **Real-time Updates:**
   - WebSocket server for live status updates
   - Server-Sent Events (SSE) for notifications

2. **Caching Layer:**
   - Redis for session management
   - API response caching

3. **Message Queue:**
   - Background job processing (email, reports)
   - Retry failed webhook deliveries

4. **Multi-Region Deployment:**
   - Australia East (primary)
   - Australia Southeast (failover)

## Summary

The architecture prioritizes:
- ✅ **Simplicity** - Minimal infrastructure, managed services
- ✅ **Reliability** - Redundancy, auto-scaling, webhook resilience
- ✅ **Security** - TLS, authentication, secret management
- ✅ **Performance** - CDN, serverless, caching
- ✅ **Maintainability** - Clean separation, documented APIs
- ✅ **Cost-effectiveness** - Free/low-cost tiers, pay-per-use

