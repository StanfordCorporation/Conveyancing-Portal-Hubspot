# External Integrations

## Overview

The Conveyancing Portal integrates with four major external services to automate the property conveyancing workflow:

1. **HubSpot CRM** - Database and workflow management
2. **DocuSign** - Electronic document signing
3. **Stripe** - Payment processing
4. **Smokeball** - Legal practice management (Australian CRM)

---

## HubSpot CRM Integration

### Purpose

HubSpot serves as the primary database and workflow engine for the entire system.

### Authentication

**Method:** Private Access Token (PAT)  
**Scope:** `crm.objects.contacts.read`, `crm.objects.contacts.write`, `crm.objects.companies.read`, `crm.objects.companies.write`, `crm.objects.deals.read`, `crm.objects.deals.write`

```bash
# Environment Variable
HUBSPOT_ACCESS_TOKEN=pat-au-xxx
```

### API Client

```javascript
// backend/src/config/hubspot.js
import { Client } from '@hubspot/api-client';

const hubspotClient = new Client({
  accessToken: process.env.HUBSPOT_ACCESS_TOKEN
});

export default hubspotClient;
```

### Core Operations

#### 1. Contact Management

```javascript
// Create contact
await hubspotClient.crm.contacts.basicApi.create({
  properties: {
    firstname: 'John',
    lastname: 'Smith',
    email: 'john@example.com',
    phone: '0412345678',
    contact_type: 'Client'
  }
});

// Search contacts
await hubspotClient.crm.contacts.searchApi.doSearch({
  filterGroups: [{
    filters: [{
      propertyName: 'email',
      operator: 'EQ',
      value: 'john@example.com'
    }]
  }],
  properties: ['firstname', 'lastname', 'email']
});
```

#### 2. Deal Management

```javascript
// Create deal
await hubspotClient.crm.deals.basicApi.create({
  properties: {
    dealname: '123 Main St, Brisbane',
    dealstage: '1890970579', // Draft
    property_address: '123 Main St, Brisbane QLD 4000',
    property_type: 'House'
  }
});

// Update deal
await hubspotClient.crm.deals.basicApi.update(dealId, {
  properties: {
    dealstage: '1904359900', // Funds Provided
    payment_status: 'Paid',
    payment_amount: '175.48'
  }
});
```

#### 3. Associations

```javascript
// Associate contact with deal
await hubspotClient.crm.deals.associationsApi.create(
  dealId,
  'contacts',
  contactId,
  'deal_to_contact'
);

// Get deal contacts
await hubspotClient.crm.deals.associationsApi.getAll(
  dealId,
  'contacts'
);
```

### Custom Properties

**Deal Properties:**
```javascript
{
  // DocuSign Integration
  docusign_csa_json: 'string',  // JSON: envelope data
  
  // Smokeball Integration
  lead_uid: 'string',            // Smokeball matter UUID
  matter_uid: 'string',          // Smokeball matter number
  smokeball_sync_status: 'enum', // not_synced, synced, error
  smokeball_transaction_id: 'string',
  
  // Stripe Integration
  stripe_payment_intent_id: 'string',
  stripe_customer_id: 'string',
  payment_status: 'enum',        // Pending, Paid, Failed
  payment_amount: 'number',
  payment_date: 'date'
}
```

**Contact Properties:**
```javascript
{
  contact_type: 'enum',          // Client, Agent, Seller
  smokeball_contact_id: 'string',
  smokeball_sync_status: 'enum'
}
```

### Deal Stages (Pipeline)

```javascript
export const DEAL_STAGES = {
  DRAFT: { id: '1890970579', label: 'Draft' },
  CLIENT_DETAILS_REQUIRED: { id: '1890970580', label: 'Client Details Required' },
  QUOTE_PROVIDED: { id: '1923682791', label: 'Searches Quote Provided' },
  AWAITING_RETAINER: { id: '1923682792', label: 'Awaiting Signed Retainer' },
  FUNDS_REQUESTED: { id: '1923682793', label: 'Searches Funds Requested' },
  FUNDS_PROVIDED: { id: '1904359900', label: 'Funds Provided' },
  SEARCHES_ORDERED: { id: '1904359899', label: 'Searches Ordered' },
  SEARCHES_SENT: { id: '1904359898', label: 'Searches Sent' },
  SEARCHES_RETURNED: { id: '1904359901', label: 'Searches Returned' },
  FORM2_DRAFTING: { id: '1995356644', label: 'Form 2 - Drafting' },
  SETTLEMENT: { id: '1890970581', label: 'Settlement' }
};
```

---

## DocuSign Integration

### Purpose

Embedded electronic signing for client authorization and retainer agreements.

### Authentication

**Method:** JWT Grant (Service Integration)  
**Flow:** RSA key pair + impersonation consent

```bash
# Environment Variables
DOCUSIGN_INTEGRATION_KEY=34d08817-3cbe-43ea-922f-348ae0dcd358
DOCUSIGN_USER_ID=9bdab216-34d5-4f33-ab31-a72f850fde78
DOCUSIGN_ACCOUNT_ID=af8995ad-b134-4144-acc0-5ca58db8f759
DOCUSIGN_KEYPAIR_ID=69fb5ec8-a1e3-4b06-bdd4-0fb5c154a800
DOCUSIGN_PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----\n..."
```

### JWT Token Generation

```javascript
// backend/src/integrations/docusign/jwtAuth.js
import docusign from 'docusign-esign';
import fs from 'fs';

export async function getJWTToken() {
  const jwtLifeSec = 3600; // 1 hour
  const dsApi = new docusign.ApiClient();
  dsApi.setOAuthBasePath(DOCUSIGN_CONFIG.oAuthBasePath);

  const results = await dsApi.requestJWTUserToken(
    DOCUSIGN_CONFIG.integrationKey,
    DOCUSIGN_CONFIG.userId,
    'signature impersonation',
    DOCUSIGN_CONFIG.privateKey,
    jwtLifeSec
  );

  return results.body.access_token;
}
```

### Embedded Signing Flow

**1. Create Envelope with Template:**

```javascript
// backend/src/integrations/docusign/client.js
export async function createEmbeddedSigningSession(params) {
  const { dealId, contactId, signers, templateId, returnUrl } = params;
  
  const accessToken = await getJWTToken();
  const dsApiClient = new docusign.ApiClient();
  dsApiClient.setBasePath(DOCUSIGN_CONFIG.basePath);
  dsApiClient.addDefaultHeader('Authorization', `Bearer ${accessToken}`);
  
  const envelopesApi = new docusign.EnvelopesApi(dsApiClient);
  
  // Create envelope from template
  const envelope = {
    templateId: DOCUSIGN_CONFIG.templateId,
    templateRoles: signers.map((signer, index) => ({
      email: signer.email,
      name: signer.name,
      roleName: signer.roleName,
      routingOrder: signer.routingOrder,
      clientUserId: index === 0 ? signer.clientUserId : undefined, // Only first signer embedded
      tabs: {
        textTabs: [
          { tabLabel: 'property_address', value: params.propertyAddress }
        ]
      }
    })),
    status: 'sent'
  };
  
  const result = await envelopesApi.createEnvelope(
    DOCUSIGN_CONFIG.accountId,
    { envelopeDefinition: envelope }
  );
  
  // Generate signing URL for first signer
  const viewRequest = {
    returnUrl: returnUrl,
    authenticationMethod: 'none',
    email: signers[0].email,
    userName: signers[0].name,
    clientUserId: signers[0].clientUserId
  };
  
  const recipientView = await envelopesApi.createRecipientView(
    DOCUSIGN_CONFIG.accountId,
    result.envelopeId,
    { recipientViewRequest: viewRequest }
  );
  
  return {
    envelopeId: result.envelopeId,
    signingUrl: recipientView.url
  };
}
```

**2. Check Envelope Status:**

```javascript
export async function getEnvelopeStatus(envelopeId) {
  const accessToken = await getJWTToken();
  const dsApiClient = new docusign.ApiClient();
  dsApiClient.setBasePath(DOCUSIGN_CONFIG.basePath);
  dsApiClient.addDefaultHeader('Authorization', `Bearer ${accessToken}`);
  
  const envelopesApi = new docusign.EnvelopesApi(dsApiClient);
  
  const envelope = await envelopesApi.getEnvelope(
    DOCUSIGN_CONFIG.accountId,
    envelopeId
  );
  
  const recipients = await envelopesApi.listRecipients(
    DOCUSIGN_CONFIG.accountId,
    envelopeId
  );
  
  return {
    status: envelope.status,
    statusDateTime: envelope.statusChangedDateTime,
    signers: recipients.signers.map(s => ({
      name: s.name,
      email: s.email,
      status: s.status,
      signedDateTime: s.signedDateTime
    }))
  };
}
```

### Multi-Signer Workflow

**Sequential Signing (Routing Order):**

```
Signer 1 (Embedded in Portal):
  clientUserId: "contact-id-123"
  routingOrder: 1
  → Signs in portal iframe

Signer 2 (Email):
  clientUserId: null
  routingOrder: 2
  → Receives email from DocuSign after Signer 1 completes
```

### Data Storage in HubSpot

```javascript
// Stored in docusign_csa_json field
{
  envelope_id: "49842ffa-2f6f-4518-94bb-40d08251ec42",
  status: "completed",
  created_at: "2025-11-05T10:30:00Z",
  status_updated_at: "2025-11-05T11:45:00Z",
  signing_url: "https://demo.docusign.net/Signing/...", // Cached for 5 min
  signing_url_created_at: "2025-11-05T10:30:00Z",
  signers: [
    {
      contactId: "211849278910",
      name: "John Smith",
      email: "john@example.com",
      routingOrder: 1,
      roleName: "Client 1",
      status: "completed"
    }
  ]
}
```

### DocuSign Webhooks (Event Notification)

**Setup:**

```javascript
// Add to envelope creation
eventNotification: {
  url: 'https://webhooks.stanfordlegal.com.au/docusign',
  loggingEnabled: true,
  requireAcknowledgment: true,
  envelopeEvents: [
    { envelopeEventStatusCode: 'sent' },
    { envelopeEventStatusCode: 'delivered' },
    { envelopeEventStatusCode: 'completed' },
    { envelopeEventStatusCode: 'declined' },
    { envelopeEventStatusCode: 'voided' }
  ],
  recipientEvents: [
    { recipientEventStatusCode: 'Sent' },
    { recipientEventStatusCode: 'Delivered' },
    { recipientEventStatusCode: 'Completed' },
    { recipientEventStatusCode: 'Declined' }
  ],
  customFields: {
    textCustomFields: [
      { name: 'hs_deal_id', value: dealId }
    ]
  }
}
```

**Webhook Handler (Cloudflare Worker):**

```javascript
export default {
  async fetch(request, env, ctx) {
    const payload = await request.json();
    
    const envelopeStatus = payload.data.envelopeSummary.status;
    const dealId = payload.data.envelopeSummary.customFields
      .textCustomFields.find(f => f.name === "hs_deal_id").value;
    const recipients = payload.data.envelopeSummary.recipients.signers
      .map(({ email, status }) => ({ email, status }));
    
    const hubspotToken = await env.hs_api_token.get();
    
    await fetch(`https://api.hubapi.com/crm/v3/objects/deals/${dealId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${hubspotToken}`
      },
      body: JSON.stringify({
        properties: {
          envelope_status: envelopeStatus,
          recipient_status: JSON.stringify(recipients)
        }
      })
    });
    
    return new Response(JSON.stringify({ received: true }), {
      status: 200
    });
  }
};
```

---

## Stripe Integration

### Purpose

Payment processing for search fees and other charges.

### Authentication

```bash
# Environment Variables
STRIPE_SECRET_KEY=sk_test_xxx
STRIPE_PUBLISHABLE_KEY=pk_test_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
```

### Payment Flow

**1. Create Payment Intent:**

```javascript
// backend/src/routes/payment.js
import stripe from '../config/stripe.js';

router.post('/create-payment-intent', async (req, res) => {
  const { dealId, amount, contactEmail } = req.body;
  
  const paymentIntent = await stripe.paymentIntents.create({
    amount: Math.round(amount * 100), // Convert to cents
    currency: 'aud',
    receipt_email: contactEmail,
    metadata: {
      dealId: dealId
    }
  });
  
  res.json({
    clientSecret: paymentIntent.client_secret
  });
});
```

**2. Frontend Payment Form:**

```javascript
// frontend/src/components/PaymentForm.jsx
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);

function CheckoutForm({ clientSecret }) {
  const stripe = useStripe();
  const elements = useElements();
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const { error, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
      payment_method: {
        card: elements.getElement(CardElement)
      }
    });
    
    if (error) {
      console.error(error);
    } else if (paymentIntent.status === 'succeeded') {
      // Payment successful - webhook will update HubSpot
    }
  };
  
  return (
    <form onSubmit={handleSubmit}>
      <CardElement />
      <button type="submit">Pay Now</button>
    </form>
  );
}
```

### Webhook Handler

```javascript
// backend/src/routes/webhook.js
router.post('/stripe', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  
  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, STRIPE_CONFIG.webhookSecret);
  } catch (err) {
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }
  
  switch (event.type) {
    case 'payment_intent.succeeded':
      const paymentIntent = event.data.object;
      const dealId = paymentIntent.metadata.dealId;
      
      // Update HubSpot
      await hubspotClient.crm.deals.basicApi.update(dealId, {
        properties: {
          payment_status: 'Paid',
          payment_amount: (paymentIntent.amount / 100).toFixed(2),
          payment_date: new Date().toISOString().split('T')[0],
          stripe_payment_intent_id: paymentIntent.id,
          dealstage: DEAL_STAGES.FUNDS_PROVIDED.id
        }
      });
      
      // Trigger Smokeball workflow
      await smokeballPaymentWorkflow.receiptPayment(dealId, paymentIntent);
      
      break;
  }
  
  res.json({ received: true });
});
```

---

## Smokeball Integration

### Purpose

Australian legal practice management CRM integration for matter management, contacts, and trust accounting.

### Authentication

**Method:** OAuth2 Authorization Code + PKCE (S256)

```bash
# Environment Variables
SMOKEBALL_CLIENT_ID=3asf3pvru111mu6qv26k0co0s6
SMOKEBALL_CLIENT_SECRET=utofdalujr4520lqk7472q4u4rn2fkd236smfg1d69c53jm0v9s
SMOKEBALL_API_KEY=NO5glMfrqP5BuwxPgnqsp7hKzeU5p2Tw7jhPqjC2
SMOKEBALL_REDIRECT_URI=http://localhost:3001/api/smokeball/oauth-callback
```

### OAuth Flow

**1. Get Authorization URL:**

```javascript
// backend/src/integrations/smokeball/auth.js
import crypto from 'crypto';
import { generatePKCEPair } from './pkce.js';

export function getAuthorizationUrl() {
  const state = crypto.randomBytes(16).toString('hex');
  const { verifier, challenge } = generatePKCEPair();
  
  // Store verifier for callback
  pkceStates.set(state, { verifier, timestamp: Date.now() + 3600000 });
  
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: SMOKEBALL_CONFIG.clientId,
    redirect_uri: SMOKEBALL_CONFIG.redirectUri,
    state: state,
    code_challenge_method: 'S256',
    code_challenge: challenge
  });
  
  const authUrl = `${SMOKEBALL_CONFIG.authBaseUrl}/oauth2/authorize?${params}`;
  
  return { authUrl, state };
}
```

**2. Exchange Code for Tokens:**

```javascript
export async function exchangeCodeForTokens(code, state) {
  const pkceData = pkceStates.get(state);
  if (!pkceData) throw new Error('Invalid state');
  
  const { verifier } = pkceData;
  pkceStates.delete(state);
  
  const authHeader = Buffer.from(
    `${SMOKEBALL_CONFIG.clientId}:${SMOKEBALL_CONFIG.clientSecret}`
  ).toString('base64');
  
  const response = await axios.post(
    `${SMOKEBALL_CONFIG.authBaseUrl}/oauth2/token`,
    new URLSearchParams({
      grant_type: 'authorization_code',
      code: code,
      redirect_uri: SMOKEBALL_CONFIG.redirectUri,
      client_id: SMOKEBALL_CONFIG.clientId,
      code_verifier: verifier
    }),
    {
      headers: {
        'Authorization': `Basic ${authHeader}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    }
  );
  
  const { access_token, refresh_token, expires_in } = response.data;
  
  // Store tokens (replace with database in production)
  tokenStore = {
    accessToken: access_token,
    refreshToken: refresh_token,
    expiresAt: Date.now() + (expires_in * 1000)
  };
  
  return { accessToken: access_token, refreshToken: refresh_token };
}
```

### Core Operations

**1. Create Matter/Lead:**

```javascript
// backend/src/integrations/smokeball/matters.js
export async function createLead(data) {
  const response = await makeApiCall('/matters', 'POST', {
    isLead: true,
    matterTypeId: data.matterTypeId,
    responsibleStaffId: data.responsibleStaffId,
    assistingStaffId: data.assistingStaffId,
    propertyAddress: data.propertyAddress,
    description: data.description
  });
  
  return response; // { id: "uuid", number: null }
}
```

**2. Create Contact:**

```javascript
export async function createContact(data) {
  const response = await makeApiCall('/contacts', 'POST', {
    person: {
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email,
      phone: { number: data.phone }
    }
  });
  
  return response; // { id: "uuid" }
}
```

**3. Create Task:**

```javascript
export async function createTask(data) {
  const response = await makeApiCall('/tasks', 'POST', {
    matterId: data.matterId,
    staffId: data.staffId,
    subject: data.subject,
    note: data.note,
    dueDate: data.dueDate,
    priority: data.priority
  });
  
  return response;
}
```

**4. Receipt Payment:**

```javascript
export async function receiptPayment(matterId, payorId, amount, reference) {
  const trustAccountId = await getTrustAccountId();
  
  const response = await makeApiCall(
    `/bankaccounts/${trustAccountId}/transactions`,
    'POST',
    {
      matterId: matterId,
      payorId: payorId,
      type: 'Deposit',
      amount: amount,
      reference: reference,
      reason: 'Search Fees',
      description: `Payment received via Stripe`,
      effectiveDate: new Date().toISOString()
    }
  );
  
  return response; // { id: "transaction-uuid" }
}
```

### Workflows

**Lead Creation (Deal Created):**

```javascript
// backend/src/services/workflows/smokeball-lead-creation.js
export async function createSmokeballLeadFromDeal(dealId) {
  // 1. Fetch deal and contacts from HubSpot
  const deal = await hubspotClient.crm.deals.basicApi.getById(dealId);
  const contacts = await getDealContacts(dealId);
  
  // 2. Extract state from property address
  const state = extractState(deal.properties.property_address);
  
  // 3. Get Smokeball matter type
  const matterTypes = await smokeballMatters.getMatterTypes(state);
  const saleType = matterTypes.find(t => t.name.includes('Sale'));
  
  // 4. Create contacts in Smokeball
  const sellerIds = [];
  for (const contact of contacts) {
    const smokeballContact = await smokeballContacts.createContact({
      firstName: contact.properties.firstname,
      lastName: contact.properties.lastname,
      email: contact.properties.email,
      phone: contact.properties.phone
    });
    sellerIds.push(smokeballContact.id);
    
    // Update HubSpot contact
    await hubspotClient.crm.contacts.basicApi.update(contact.id, {
      properties: {
        smokeball_contact_id: smokeballContact.id,
        smokeball_sync_status: 'synced'
      }
    });
  }
  
  // 5. Create lead in Smokeball
  const lead = await smokeballMatters.createLead({
    matterTypeId: saleType.id,
    responsibleStaffId: await getStaffId('Sean', 'Kerswill'),
    assistingStaffId: await getStaffId('Laura', 'Stuart'),
    propertyAddress: deal.properties.property_address,
    clientIds: sellerIds
  });
  
  // 6. Update HubSpot deal
  await hubspotClient.crm.deals.basicApi.update(dealId, {
    properties: {
      lead_uid: lead.id,
      matter_uid: null,
      smokeball_sync_status: 'synced',
      smokeball_last_sync: new Date().toISOString()
    }
  });
  
  return { success: true, leadId: lead.id };
}
```

### Webhooks

```javascript
// backend/src/routes/webhook.js
router.post('/smokeball', express.json(), async (req, res) => {
  const event = req.body;
  
  switch (event.eventType) {
    case 'matter.converted':
      // Lead converted to matter - update HubSpot with matter number
      const deal = await findDealByLeadUid(event.data.id);
      await hubspotClient.crm.deals.basicApi.update(deal.id, {
        properties: {
          matter_uid: event.data.number,
          smokeball_sync_status: 'synced'
        }
      });
      break;
      
    case 'matter.created':
      // Matter created - update sync timestamp
      const dealCreated = await findDealByLeadUid(event.data.id);
      await hubspotClient.crm.deals.basicApi.update(dealCreated.id, {
        properties: {
          smokeball_last_sync: new Date().toISOString()
        }
      });
      break;
  }
  
  res.json({ received: true });
});
```

---

## Integration Summary

| Integration | Auth Method | Primary Use | Status |
|-------------|-------------|-------------|--------|
| **HubSpot** | Private Access Token | Database & CRM | ✅ Production |
| **DocuSign** | JWT Grant | Document Signing | ✅ Production |
| **Stripe** | API Keys | Payment Processing | ✅ Production |
| **Smokeball** | OAuth2 + PKCE | Legal CRM | ✅ Production |

## Troubleshooting

### HubSpot
- **Rate Limits:** 100 requests/10 seconds (burst), 150,000/day
- **Common Errors:** 401 (Invalid token), 404 (Object not found)

### DocuSign
- **Consent Required:** One-time admin consent for JWT
- **Token Expiry:** Tokens expire after 1 hour, auto-refresh implemented
- **Signing URL Expiry:** Cached for 5 minutes

### Stripe
- **Webhook Testing:** Use Stripe CLI for local testing
- **Signature Verification:** Must use raw body (express.raw middleware)

### Smokeball
- **Token Refresh:** Auto-refresh 5 minutes before expiry
- **API Rate Limits:** Not officially documented, implement retry logic
- **Contact Updates:** Require `application/json-patch+json` header

---

## Next Steps

1. ✅ All integrations implemented and tested
2. 🔄 Add DocuSign webhooks (EventNotification)
3. 🔄 Migrate webhooks to Cloudflare Workers
4. 🔄 Add error monitoring (Sentry)
5. 🔄 Implement webhook retry logic

