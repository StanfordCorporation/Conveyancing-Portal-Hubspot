# Automated Workflows

## Overview

The Conveyancing Portal features intelligent automation that progresses deals through stages based on external events (signing, payments) and triggers actions in integrated systems (Smokeball, HubSpot).

## Deal Pipeline Stages

```
┌─────────────────────────────────────────────────────────────┐
│                  Deal Pipeline (11 Stages)                   │
└─────────────────────────────────────────────────────────────┘

1. Draft (1890970579)
   ↓ [Agent sends to client]
   
2. Client Details Required (1890970580)
   ↓ [Client completes form]
   
3. Searches Quote Provided (1923682791)
   ↓ [Client accepts quote]
   
4. Awaiting Signed Retainer (1923682792)
   ↓ [DocuSign envelope created & sent]
   ↓ [Client signs document]
   ↓ [WEBHOOK: Signing completed]
   
5. Searches Funds Requested (1923682793)
   ↓ [Client makes payment]
   ↓ [WEBHOOK: Payment succeeded]
   
6. Funds Provided (1904359900)
   ↓ [Smokeball: Receipt payment]
   ↓ [Smokeball: Convert lead to matter]
   ↓ [Smokeball: Create tasks]
   
7. Searches Ordered (1904359899)
   ↓ [Searches ordered manually]
   
8. Searches Sent (1904359898)
   ↓ [Searches sent to client]
   
9. Searches Returned (1904359901)
   ↓ [Smokeball: Create Form 2 tasks]
   
10. Form 2 - Drafting (1995356644)
    ↓ [Form 2 completed]
    
11. Settlement (1890970581)
    ✓ [Deal complete]
```

## Automated Stage Progressions

### 1. DocuSign Signing Completion → Payment Request

**Trigger:** DocuSign envelope status becomes `completed`

**Method:** API Polling (Frontend polls every 5 seconds during signing)

**Endpoint:** `POST /api/docusign/envelope-status`

**File:** `backend/src/routes/docusign.js:407-450`

**Flow:**
```
1. Frontend polls envelope status while signing is active
   ↓
2. Backend calls DocuSign API to get current status
   ↓
3. Status stored in HubSpot (docusign_csa_json)
   ↓
4. IF status = "completed":
   - Update deal stage to FUNDS_REQUESTED (Step 5)
   - Clear cached signing URL
   - Client portal unlocks Payment section
```

**Code:**
```javascript
// Check envelope status
const envelopeData = await docusignClient.getEnvelope(envelopeId);

// Update HubSpot
const updatedData = {
  ...existingData,
  status: envelopeData.status,
  status_updated_at: new Date().toISOString()
};

await saveDocuSignData(dealId, updatedData);

// Progress stage if completed
if (envelopeData.status === 'completed') {
  await updateDeal(dealId, {
    dealstage: DEAL_STAGES.FUNDS_REQUESTED.id
  });
  
  console.log('[DocuSign] Signing completed - Deal progressed to: Searches Funds Requested');
  
  // Clear cached signing URL
  delete updatedData.signing_url;
  delete updatedData.signing_url_created_at;
  await saveDocuSignData(dealId, updatedData);
}
```

**HubSpot Data Stored:**
```json
{
  "envelope_id": "abc-123-def",
  "status": "completed",
  "created_at": "2025-11-05T10:30:00Z",
  "status_updated_at": "2025-11-05T11:45:00Z",
  "status_datetime": "2025-11-05T11:45:00Z",
  "signers": [
    {
      "contactId": "211849278910",
      "name": "John Smith",
      "email": "john@example.com",
      "status": "completed"
    }
  ]
}
```

**Logs:**
```
[DocuSign Route] ✅ Envelope status retrieved
[DocuSign Route] 💾 Updated envelope status in HubSpot: completed
[DocuSign Route] 🎯 Signing completed - Deal progressed to: Searches Funds Requested
[DocuSign Route] 🗑️ Cleared cached signing URL from HubSpot
```

---

### 2. Stripe Payment Success → Funds Provided

**Trigger:** Stripe webhook event `payment_intent.succeeded`

**Method:** Webhook (Stripe → Backend)

**Endpoint:** `POST /api/webhook/stripe`

**File:** `backend/src/routes/webhook.js:20-105`

**Flow:**
```
1. Client completes payment via Stripe payment form
   ↓
2. Stripe sends webhook to /api/webhook/stripe
   ↓
3. Backend verifies webhook signature (HMAC-SHA256)
   ↓
4. Extract payment data and deal ID from metadata
   ↓
5. Update HubSpot deal:
   - payment_status = "Paid"
   - payment_amount = amount in dollars
   - payment_date = today
   - stripe_payment_intent_id = PI ID
   - dealstage = FUNDS_PROVIDED (Step 6)
   ↓
6. Trigger Smokeball payment receipting workflow
```

**Code:**
```javascript
router.post('/stripe', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  
  // Verify signature
  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, STRIPE_CONFIG.webhookSecret);
  } catch (err) {
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }
  
  // Handle payment success
  if (event.type === 'payment_intent.succeeded') {
    const paymentIntent = event.data.object;
    const dealId = paymentIntent.metadata.dealId;
    
    // Update HubSpot
    await updateDeal(dealId, {
      payment_status: 'Paid',
      payment_amount: (paymentIntent.amount / 100).toFixed(2),
      payment_date: new Date().toISOString().split('T')[0],
      stripe_payment_intent_id: paymentIntent.id,
      stripe_customer_id: paymentIntent.customer,
      dealstage: DEAL_STAGES.FUNDS_PROVIDED.id
    });
    
    console.log(`[Webhook] 🎯 Deal ${dealId} progressed to: Funds Provided`);
    console.log(`[Webhook] 💰 Payment: $${(paymentIntent.amount / 100).toFixed(2)} AUD`);
    
    // Trigger Smokeball receipting
    await smokeballPaymentWorkflow.receiptPayment(dealId, paymentIntent);
  }
  
  res.json({ received: true });
});
```

**HubSpot Data Updated:**
- `payment_status`: "Paid"
- `payment_amount`: "175.48"
- `payment_date`: "2025-11-05"
- `stripe_payment_intent_id`: "pi_xxx"
- `stripe_customer_id`: "cus_xxx"
- `dealstage`: "1904359900" (FUNDS_PROVIDED)

**Logs:**
```
[Webhook] ✅ Verified webhook event: payment_intent.succeeded
[Webhook] 🎉 Payment succeeded!
[Webhook] 💳 Payment Intent ID: pi_xxx
[Webhook] 💰 Amount: $175.48 AUD
[Webhook] ✅ Deal xxx updated - marked as paid
[Webhook] 🎯 Deal stage progressed to: Funds Provided
```

---

## Smokeball Workflows

### 1. Lead Creation (Deal Created)

**Trigger:** New deal created in HubSpot (via agent portal or client form)

**File:** `backend/src/services/workflows/smokeball-lead-creation.js`

**Flow:**
```
1. New deal created in HubSpot
   ↓
2. Extract state from property address
   ↓
3. Get Smokeball matter type for state (Conveyancing > Sale)
   ↓
4. Create Smokeball contacts for all sellers
   ↓
5. Create referrer contact (agent)
   ↓
6. Create Smokeball lead (isLead: true)
   ↓
7. Store lead_uid in HubSpot deal
   ↓
8. Update property address in Smokeball
```

**Code:**
```javascript
export async function createSmokeballLeadFromDeal(dealId) {
  // 1. Fetch deal from HubSpot
  const deal = await getDeal(dealId, ['dealname', 'property_address']);
  
  // Skip if already synced
  if (deal.properties.lead_uid) {
    console.log('[Smokeball] Deal already synced');
    return { skipped: true };
  }
  
  // 2. Extract state
  const state = extractState(deal.properties.property_address);
  if (!state) throw new Error('Cannot determine state from address');
  
  // 3. Get matter type
  const matterTypes = await smokeballMatters.getMatterTypes(state, 'Conveyancing');
  const saleType = matterTypes.find(t => t.name.includes('Sale'));
  
  // 4. Get staff IDs
  const seanStaffId = await smokeballStaff.getStaffId('Sean', 'Kerswill');
  const lauraStaffId = await smokeballStaff.getStaffId('Laura', 'Stuart');
  
  // 5. Fetch and create contacts
  const dealContacts = await getDealContacts(dealId);
  const sellers = dealContacts.filter(c => c.properties.contact_type === 'Client');
  
  const sellerContactIds = [];
  for (const seller of sellers) {
    if (seller.properties.smokeball_contact_id) {
      sellerContactIds.push(seller.properties.smokeball_contact_id);
      continue;
    }
    
    const smokeballContact = await smokeballContacts.createContact({
      person: {
        firstName: seller.properties.firstname,
        lastName: seller.properties.lastname,
        email: seller.properties.email,
        phone: { number: formatPhoneNumber(seller.properties.phone) }
      }
    });
    
    sellerContactIds.push(smokeballContact.id);
    
    await updateContact(seller.id, {
      smokeball_contact_id: smokeballContact.id,
      smokeball_sync_status: 'synced'
    });
  }
  
  // 6. Create lead in Smokeball
  const lead = await smokeballMatters.createMatter({
    isLead: true,
    matterTypeId: saleType.id,
    responsibleStaffId: seanStaffId,
    propertyAddress: deal.properties.property_address,
    clientIds: sellerContactIds
  });
  
  console.log(`[Smokeball] ✅ Lead created: ${lead.id}`);
  
  // 7. Update property address
  await smokeballMatters.updateMatter(lead.id, {
    propertyAddress: deal.properties.property_address
  });
  
  // 8. Update HubSpot
  await updateDeal(dealId, {
    lead_uid: lead.id,
    matter_uid: null,
    smokeball_sync_status: 'synced',
    smokeball_last_sync: new Date().toISOString()
  });
  
  return { success: true, leadId: lead.id };
}
```

---

### 2. Quote Accepted (Stage 3 → Funds Requested)

**Trigger:** Deal reaches Stage 3 (Searches Quote Provided/Accepted)

**File:** `backend/src/services/workflows/smokeball-quote-accepted.js`

**Flow:**
```
1. Deal moves to Stage 3 (Quote Accepted)
   ↓
2. Fetch HubSpot deal and verify lead_uid exists
   ↓
3. Get associated contacts from HubSpot
   ↓
4. Update contact residential addresses in Smokeball
   ↓
5. Convert lead to matter (isLead: false)
   ↓
6. Find Laura (staff member)
   ↓
7. Create 3 welcome tasks for Laura:
   - Review Client Details
   - Prepare Welcome Package
   - Schedule Initial Call
   ↓
8. Update HubSpot sync status to 'pending'
   ↓
9. Wait for matter.converted webhook
   ↓
10. Webhook updates matter_uid in HubSpot
```

**Code:**
```javascript
export async function handleQuoteAccepted(dealId) {
  const deal = await getDeal(dealId, ['lead_uid', 'property_address']);
  
  if (!deal.properties.lead_uid) {
    throw new Error('No Smokeball lead ID found');
  }
  
  // 1. Update contact addresses
  const contacts = await getDealContacts(dealId);
  for (const contact of contacts) {
    if (contact.properties.smokeball_contact_id && contact.properties.address) {
      await smokeballContacts.updateContact(
        contact.properties.smokeball_contact_id,
        {
          person: {
            homeAddress: { address: contact.properties.address }
          }
        }
      );
    }
  }
  
  // 2. Convert lead to matter
  const matterId = deal.properties.lead_uid;
  await smokeballMatters.updateMatter(matterId, { isLead: false });
  
  // 3. Find Laura
  const lauraStaffId = await smokeballStaff.getStaffId('Laura', 'Stuart');
  
  // 4. Create welcome tasks
  const tasks = [
    {
      subject: 'Review Client Details',
      note: `Review client information for ${deal.properties.property_address}`,
      priority: 'High',
      dueDate: addBusinessDays(new Date(), 1).toISOString()
    },
    {
      subject: 'Prepare Welcome Package',
      note: 'Prepare welcome package for new client',
      priority: 'Normal',
      dueDate: addBusinessDays(new Date(), 2).toISOString()
    },
    {
      subject: 'Schedule Initial Call',
      note: 'Schedule initial call with client',
      priority: 'Normal',
      dueDate: addBusinessDays(new Date(), 3).toISOString()
    }
  ];
  
  for (const taskData of tasks) {
    await smokeballTasks.createTask({
      matterId: matterId,
      staffId: lauraStaffId,
      ...taskData
    });
  }
  
  // 5. Update HubSpot
  await updateDeal(dealId, {
    smokeball_sync_status: 'pending' // Awaiting matter.converted webhook
  });
  
  console.log('[Smokeball] ✅ Quote accepted workflow complete');
}
```

---

### 3. Payment Receipting (Stripe → Smokeball)

**Trigger:** Stripe payment_intent.succeeded webhook

**File:** `backend/src/services/workflows/smokeball-payment-receipting.js`

**Flow:**
```
1. Stripe payment succeeds
   ↓
2. Get deal and matter info from HubSpot
   ↓
3. Get Smokeball contact ID for payor
   ↓
4. Get trust account ID
   ↓
5. Receipt payment to Smokeball trust account
   ↓
6. Update HubSpot with transaction ID
   ↓
7. Create "Order Searches" task for Sean
```

**Code:**
```javascript
export async function receiptPayment(dealId, paymentIntent) {
  const deal = await getDeal(dealId, ['lead_uid', 'property_address']);
  const matterId = deal.properties.lead_uid;
  
  // Get payor contact
  const contacts = await getDealContacts(dealId);
  const primaryClient = contacts.find(c => c.properties.contact_type === 'Client');
  const payorId = primaryClient.properties.smokeball_contact_id;
  
  // Get trust account
  const trustAccountId = await smokeballBankAccounts.getTrustAccountId();
  
  // Receipt payment
  const transaction = await smokeballBankAccounts.createTransaction(
    trustAccountId,
    {
      matterId: matterId,
      payorId: payorId,
      type: 'Deposit',
      amount: paymentIntent.amount / 100,
      reference: paymentIntent.id,
      reason: 'Search Fees',
      description: `Payment for ${deal.properties.property_address}`,
      note: 'Received via Stripe',
      effectiveDate: new Date().toISOString()
    }
  );
  
  console.log(`[Smokeball] ✅ Payment receipted: ${transaction.id}`);
  
  // Update HubSpot
  await updateDeal(dealId, {
    smokeball_transaction_id: transaction.id
  });
  
  // Create task for Sean
  const seanStaffId = await smokeballStaff.getStaffId('Sean', 'Kerswill');
  await smokeballTasks.createTask({
    matterId: matterId,
    staffId: seanStaffId,
    subject: 'Order Searches',
    note: `Payment received: $${(paymentIntent.amount / 100).toFixed(2)}. Order searches for ${deal.properties.property_address}`,
    dueDate: addBusinessDays(new Date(), 1).toISOString(),
    priority: 'High'
  });
}
```

---

## Webhook Handlers

### Stripe Webhooks

**Endpoint:** `POST /api/webhook/stripe`

**Events Handled:**
- `payment_intent.succeeded` - Payment completed successfully
- `payment_intent.payment_failed` - Payment failed
- `payment_intent.canceled` - Payment canceled

**Security:** HMAC-SHA256 signature verification

**Response Time:** < 2 seconds (required by Stripe)

---

### Smokeball Webhooks

**Endpoint:** `POST /api/webhook/smokeball`

**Events Handled:**
- `matter.created` - Matter/lead created (update sync timestamp)
- `matter.converted` - Lead converted to matter (store matter number)
- `matter.updated` - Matter updated (optional sync)

**Code:**
```javascript
router.post('/smokeball', express.json(), async (req, res) => {
  const event = req.body;
  
  switch (event.eventType) {
    case 'matter.created':
      await handleMatterCreated(event.data);
      break;
      
    case 'matter.converted':
      await handleMatterConverted(event.data);
      break;
      
    case 'matter.updated':
      console.log('[Smokeball Webhook] Matter updated:', event.data.id);
      break;
  }
  
  res.json({ received: true });
});

async function handleMatterConverted(matterData) {
  const deal = await findDealByLeadUid(matterData.id);
  
  if (deal) {
    await updateDeal(deal.id, {
      lead_uid: matterData.id,
      matter_uid: matterData.number, // Matter number after conversion
      smokeball_sync_status: 'synced',
      smokeball_last_sync: new Date().toISOString()
    });
    
    console.log('[Smokeball Webhook] ✅ Matter number synced to HubSpot');
  }
}
```

---

### DocuSign Webhooks (Future - EventNotification)

**Endpoint:** `https://webhooks.stanfordlegal.com.au/docusign`

**Events to Subscribe:**
- `envelope-sent`
- `envelope-delivered`
- `envelope-completed`
- `envelope-declined`
- `envelope-voided`
- `recipient-completed` (per signer)

**Implementation:**
```javascript
// Cloudflare Worker
export default {
  async fetch(request, env, ctx) {
    const payload = await request.json();
    
    const envelopeStatus = payload.data.envelopeSummary.status;
    const dealId = payload.data.envelopeSummary.customFields
      .textCustomFields.find(f => f.name === "hs_deal_id").value;
    const recipients = payload.data.envelopeSummary.recipients.signers;
    
    // Update HubSpot
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
          recipient_status: JSON.stringify(recipients.map(r => ({
            email: r.email,
            status: r.status
          })))
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

## Workflow Testing

### Test DocuSign Automation

```bash
# 1. Create deal at Stage 4 (AWAITING_RETAINER)
# 2. Sign document via DocuSign
# 3. Observe logs:

[DocuSign Route] ✅ Envelope status retrieved
[DocuSign Route] 💾 Updated envelope status in HubSpot: completed
[DocuSign Route] 🎯 Signing completed - Deal progressed to: Searches Funds Requested

# 4. Verify in client portal: Payment section unlocked
```

### Test Stripe Automation

```bash
# 1. Trigger Stripe payment
# 2. Observe logs:

[Webhook] ✅ Verified webhook event: payment_intent.succeeded
[Webhook] 🎉 Payment succeeded!
[Webhook] 💰 Amount: $175.48 AUD
[Webhook] ✅ Deal xxx updated - marked as paid
[Webhook] 🎯 Deal stage progressed to: Funds Provided

# 3. Verify in Smokeball: Payment receipted to trust account
```

### Test Smokeball Automation

```bash
# 1. Move deal to Stage 3 (Quote Accepted)
# 2. Observe logs:

[Smokeball Workflow] ✅ Contact addresses updated
[Smokeball Workflow] ✅ Lead converted to matter
[Smokeball Workflow] ✅ Welcome tasks created for Laura

# 3. Wait for matter.converted webhook
# 4. Verify in HubSpot: matter_uid populated
```

---

## Workflow Summary

| Workflow | Trigger | Actions | Stage Change |
|----------|---------|---------|--------------|
| **DocuSign Completion** | Envelope status = completed | Update HubSpot, clear cache | 4 → 5 |
| **Stripe Payment** | payment_intent.succeeded | Update HubSpot, receipt Smokeball | 5 → 6 |
| **Smokeball Lead** | Deal created | Create lead, contacts, store IDs | N/A |
| **Smokeball Quote** | Stage 3 reached | Convert to matter, create tasks | N/A |
| **Smokeball Payment** | Stripe payment | Receipt to trust, create task | N/A |

---

## Future Enhancements

1. **Real-time Updates:**
   - WebSocket connection for live status updates
   - Eliminate polling for DocuSign status

2. **Retry Logic:**
   - Automatic retry for failed webhook deliveries
   - Dead letter queue for manual intervention

3. **Workflow Builder:**
   - UI for creating custom workflows
   - Conditional logic based on deal properties

4. **Email Notifications:**
   - Automated emails to clients on stage changes
   - Task reminders for staff

5. **Analytics:**
   - Workflow execution metrics
   - Stage progression analytics
   - Bottleneck identification

