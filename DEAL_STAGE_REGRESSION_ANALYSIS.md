# Deal Stage Regression Analysis: FUNDS_PROVIDED → FUNDS_REQUESTED

## 🐛 Problem Statement

**Issue**: Deals paid through Stripe are moved to "Funds Provided" (Step 6) by HubSpot workflow or Stripe webhook, but then something in the code moves them **back** to "Searches Funds Requested" (Step 5).

**Result**: Deal appears as unpaid even though payment was successful.

---

## 🔍 Root Cause Identified

### **Location**: [backend/src/routes/webhook.js:407](c:\Users\PrathamManochaStanfo\OneDrive - The Stanford Corporation\Desktop\Conveyancing-Portal-Hubspot\backend\src\routes\webhook.js#L407)

```javascript
// Form 2 CSA: Progress deal when FIRST signer (routing order 1) completes
const firstSigner = signers.find(signer => signer.routingOrder === '1' || signer.routingOrder === 1);

if (firstSigner && firstSigner.status === 'completed') {
  hubspotUpdateData.dealstage = DEAL_STAGES.FUNDS_REQUESTED.id; // ❌ PROBLEM HERE
  console.log(`[DocuSign Webhook] 🎉 First signer completed - progressing deal to Funds Requested`);
}
```

**Problem**: DocuSign webhook **ALWAYS** moves deal to FUNDS_REQUESTED when first signer completes, **without checking** if payment has already been received.

---

## 📊 Sequence of Events (Bug Scenario)

### Scenario 1: Fast Payment (Common Case)
```
1. User signs DocuSign retainer → DocuSign webhook fires
   → Deal moves to FUNDS_REQUESTED (Step 5) ✅

2. User pays with Stripe → Stripe webhook fires
   → Deal moves to FUNDS_PROVIDED (Step 6) ✅

3. DocuSign fires delayed/duplicate webhook (envelope update)
   → First signer still shows as "completed"
   → Deal moves BACK to FUNDS_REQUESTED (Step 5) ❌❌❌

Result: Deal appears unpaid despite successful payment
```

### Scenario 2: Multiple Signers
```
1. First signer completes → DocuSign webhook fires
   → Deal moves to FUNDS_REQUESTED (Step 5) ✅

2. User pays with Stripe
   → Deal moves to FUNDS_PROVIDED (Step 6) ✅

3. Second signer completes → DocuSign webhook fires again
   → First signer STILL shows as "completed" (hasn't changed)
   → Deal moves BACK to FUNDS_REQUESTED (Step 5) ❌❌❌

Result: Deal regresses despite payment
```

### Scenario 3: Webhook Order Race Condition
```
1. User signs AND pays almost simultaneously

2. Stripe webhook processes first
   → Deal moves to FUNDS_PROVIDED (Step 6) ✅

3. DocuSign webhook processes second (delayed in queue)
   → First signer status is "completed"
   → Deal moves BACK to FUNDS_REQUESTED (Step 5) ❌❌❌

Result: Payment succeeded but deal shows as unpaid
```

---

## 🧩 Deal Stage Flow (Expected)

```
Step 1: Client Details Required (1923713518)
    ↓
Step 2: Awaiting Questionnaire (1923713520)
    ↓
Step 3: Quote Provided (1923682791)
    ↓
Step 4: Awaiting Retainer (1923682792) ← DocuSign sent here
    ↓
Step 5: Funds Requested (1924069846) ← DocuSign completion moves here
    ↓
Step 6: Funds Provided (1904359900) ← Stripe payment moves here
    ↓
Step 7+: Searches Started, etc.
```

**Issue**: DocuSign webhook can fire **multiple times** and moves deal to Step 5 even if already at Step 6+

---

## 📋 Current Code Analysis

### 1. Stripe Payment Success Handler ([webhook.js:123-134](c:\Users\PrathamManochaStanfo\OneDrive - The Stanford Corporation\Desktop\Conveyancing-Portal-Hubspot\backend\src\routes\webhook.js#L123-L134))

```javascript
await dealsIntegration.updateDeal(dealId, {
  payment_method: 'Stripe',
  payment_status: 'Pending',
  payment_amount: (paymentIntent.amount / 100).toString(),
  // ...
  dealstage: DEAL_STAGES.FUNDS_PROVIDED.id, // ✅ Correctly moves to Step 6
});
```

**Behavior**: ✅ Correctly moves deal forward to FUNDS_PROVIDED

### 2. DocuSign First Signer Handler ([webhook.js:401-422](c:\Users\PrathamManochaStanfo\OneDrive - The Stanford Corporation\Desktop\Conveyancing-Portal-Hubspot\backend\src\routes\webhook.js#L401-L422))

```javascript
if (hsFormProperty === "docusign_csa_json") {
  const firstSigner = signers.find(signer => signer.routingOrder === '1' || signer.routingOrder === 1);

  if (firstSigner && firstSigner.status === 'completed') {
    hubspotUpdateData.dealstage = DEAL_STAGES.FUNDS_REQUESTED.id; // ❌ NO CHECK FOR EXISTING STAGE
    console.log(`[DocuSign Webhook] 🎉 First signer completed - progressing deal to Funds Requested`);
  }
}

await dealsIntegration.updateDeal(dealId, hubspotUpdateData);
```

**Problem**: ❌ NO validation to prevent moving deal backwards

---

## ✅ Solution: Add Stage Progression Guard

### Approach: Check Current Stage Before Moving Backwards

```javascript
// Form 2 CSA: Progress deal when FIRST signer (routing order 1) completes
const firstSigner = signers.find(signer => signer.routingOrder === '1' || signer.routingOrder === 1);

if (firstSigner && firstSigner.status === 'completed') {
  // ✅ NEW: Fetch current deal stage to prevent regression
  const currentDeal = await dealsIntegration.getDeal(dealId, ['dealstage', 'payment_status']);
  const currentStage = currentDeal.properties.dealstage;
  const paymentStatus = currentDeal.properties.payment_status;

  console.log(`[DocuSign Webhook] 📊 Current deal state:`);
  console.log(`[DocuSign Webhook]   - Stage: ${currentStage}`);
  console.log(`[DocuSign Webhook]   - Payment Status: ${paymentStatus || 'Not set'}`);

  // ✅ NEW: Only move to FUNDS_REQUESTED if not already past it
  const STAGE_ORDER = [
    '1923713518', // Step 1: Client Details Required
    '1923713520', // Step 2: Awaiting Questionnaire
    '1923682791', // Step 3: Quote Provided
    '1923682792', // Step 4: Awaiting Retainer
    '1924069846', // Step 5: Funds Requested ← Target stage
    '1904359900', // Step 6: Funds Provided
    '1995278804', // Step 7+: Further stages
  ];

  const currentIndex = STAGE_ORDER.indexOf(currentStage);
  const targetIndex = STAGE_ORDER.indexOf(DEAL_STAGES.FUNDS_REQUESTED.id); // Step 5

  if (currentIndex < targetIndex) {
    // ✅ SAFE: Deal is before FUNDS_REQUESTED, safe to progress
    hubspotUpdateData.dealstage = DEAL_STAGES.FUNDS_REQUESTED.id;
    console.log(`[DocuSign Webhook] ✅ Progressing deal from Step ${currentIndex + 1} to Step ${targetIndex + 1} (Funds Requested)`);
  } else {
    // ⚠️ PREVENTED: Deal is already at or past FUNDS_REQUESTED
    console.log(`[DocuSign Webhook] ⚠️ Deal already at Step ${currentIndex + 1} - NOT moving backwards to Funds Requested`);
    console.log(`[DocuSign Webhook] ⚠️ Skipping stage update (payment may have already been made)`);
  }

  console.log(`[DocuSign Webhook] 👤 First signer: ${firstSigner.name} (${firstSigner.email})`);
}
```

---

## 🛡️ Alternative Solution: Payment Status Guard (Simpler)

### Approach: Check if payment already made before moving to FUNDS_REQUESTED

```javascript
if (firstSigner && firstSigner.status === 'completed') {
  // ✅ Fetch current payment status
  const currentDeal = await dealsIntegration.getDeal(dealId, ['payment_status', 'dealstage']);
  const paymentStatus = currentDeal.properties.payment_status;
  const currentStage = currentDeal.properties.dealstage;

  console.log(`[DocuSign Webhook] 📊 Payment status: ${paymentStatus || 'Not set'}`);
  console.log(`[DocuSign Webhook] 📊 Current stage: ${currentStage}`);

  // ✅ Only request funds if payment NOT already made
  if (paymentStatus !== 'Pending' && paymentStatus !== 'Paid') {
    hubspotUpdateData.dealstage = DEAL_STAGES.FUNDS_REQUESTED.id;
    console.log(`[DocuSign Webhook] ✅ First signer completed - requesting funds`);
  } else {
    console.log(`[DocuSign Webhook] ⚠️ Payment already ${paymentStatus} - NOT requesting funds again`);
  }
}
```

**Pros**:
- ✅ Simpler logic
- ✅ Directly checks payment state
- ✅ Prevents regression when payment made

**Cons**:
- ⚠️ Relies on `payment_status` being set correctly
- ⚠️ Could have edge cases if status not updated

---

## 🎯 Recommended Solution: Combination Approach

```javascript
if (firstSigner && firstSigner.status === 'completed') {
  // Fetch current deal state
  const currentDeal = await dealsIntegration.getDeal(dealId, ['dealstage', 'payment_status']);
  const currentStage = currentDeal.properties.dealstage;
  const paymentStatus = currentDeal.properties.payment_status;

  console.log(`[DocuSign Webhook] 📊 Current state: Stage=${currentStage}, Payment=${paymentStatus || 'Not set'}`);

  // ✅ GUARD 1: Check if payment already made
  const paymentAlreadyMade = (paymentStatus === 'Pending' || paymentStatus === 'Paid');

  // ✅ GUARD 2: Check if stage already past FUNDS_REQUESTED
  const FUNDS_PROVIDED_ID = '1904359900';
  const alreadyAtFundsProvided = (currentStage === FUNDS_PROVIDED_ID);

  // Only move to FUNDS_REQUESTED if both guards pass
  if (!paymentAlreadyMade && !alreadyAtFundsProvided) {
    hubspotUpdateData.dealstage = DEAL_STAGES.FUNDS_REQUESTED.id;
    console.log(`[DocuSign Webhook] ✅ Progressing to Funds Requested (first signer completed)`);
  } else {
    console.log(`[DocuSign Webhook] ⚠️ Skipping stage update:`);
    if (paymentAlreadyMade) {
      console.log(`[DocuSign Webhook]    - Payment status is "${paymentStatus}" (funds already provided)`);
    }
    if (alreadyAtFundsProvided) {
      console.log(`[DocuSign Webhook]    - Deal already at Funds Provided stage`);
    }
  }
}
```

**Benefits**:
- ✅ Two layers of protection
- ✅ Clear logging for debugging
- ✅ Handles all edge cases
- ✅ Prevents any backward progression

---

## 🧪 Test Cases

### Test 1: Normal Flow (No Regression)
**Steps**:
1. Sign DocuSign → Deal moves to FUNDS_REQUESTED ✅
2. Pay with Stripe → Deal moves to FUNDS_PROVIDED ✅
3. DocuSign webhook fires again → Deal STAYS at FUNDS_PROVIDED ✅

**Expected**: Deal remains at FUNDS_PROVIDED

### Test 2: Fast Payment Before DocuSign Completion
**Steps**:
1. Send DocuSign
2. User pays before signing
3. User signs after paying

**Expected**: Deal should stay at FUNDS_PROVIDED (not regress)

### Test 3: Multiple Signers
**Steps**:
1. First signer completes → FUNDS_REQUESTED
2. Payment made → FUNDS_PROVIDED
3. Second signer completes → DocuSign webhook fires

**Expected**: Deal stays at FUNDS_PROVIDED

### Test 4: DocuSign Webhook Delays
**Steps**:
1. Sign DocuSign at 10:00 AM
2. Pay at 10:05 AM → FUNDS_PROVIDED
3. DocuSign webhook finally processes at 10:30 AM

**Expected**: Deal stays at FUNDS_PROVIDED

---

## 📝 Implementation Steps

1. ✅ **Identify root cause** (DONE - webhook.js:407)
2. **Update DocuSign webhook handler**:
   - Add check for current `payment_status`
   - Add check for current `dealstage`
   - Only move to FUNDS_REQUESTED if guards pass
3. **Add logging**:
   - Log current stage before update
   - Log reason for skipping stage update
   - Log when guards prevent regression
4. **Test thoroughly**:
   - Test normal flow
   - Test payment before signing
   - Test multiple signers
   - Test webhook delays
5. **Deploy**:
   - Deploy to staging
   - Monitor logs
   - Deploy to production

---

## 🔍 Additional Findings

### Other Places That Move to FUNDS_REQUESTED:

1. **DocuSign Route** ([docusign.js:513](c:\Users\PrathamManochaStanfo\OneDrive - The Stanford Corporation\Desktop\Conveyancing-Portal-Hubspot\backend\src\routes\docusign.js#L513)):
   ```javascript
   if (envelopeData.status === 'completed') {
     await updateDeal(dealId, {
       dealstage: DEAL_STAGES.FUNDS_REQUESTED.id
     });
   }
   ```
   **Action**: Apply same guard logic here

---

## ✅ Expected Outcome After Fix

- ✅ Deals will NOT regress from FUNDS_PROVIDED to FUNDS_REQUESTED
- ✅ Payment status will be accurately reflected
- ✅ Multiple DocuSign webhooks will not cause issues
- ✅ Clear logging will help debug any edge cases
- ✅ All test cases will pass

---

## 📊 Success Criteria

After implementation, verify:
1. ✅ Stripe payment moves deal to FUNDS_PROVIDED
2. ✅ DocuSign webhooks after payment do NOT move deal back
3. ✅ Logs show guard preventing regression
4. ✅ No deals stuck in wrong stage
5. ✅ Payment status matches deal stage

---

## 🚨 Rollback Plan

If issues arise:
1. Revert webhook.js to previous version
2. Document any failed test cases
3. Investigate and fix offline
4. Redeploy with additional guards

---

## 📚 Files to Modify

1. **backend/src/routes/webhook.js** (Line 401-422) - Primary fix
2. **backend/src/routes/docusign.js** (Line 508-517) - Secondary fix
3. Add logging throughout for debugging

---

## 🎯 Summary

**Root Cause**: DocuSign webhook moves deal to FUNDS_REQUESTED without checking if payment already made

**Solution**: Add guards to prevent backward stage progression:
- Check if `payment_status` is "Pending" or "Paid"
- Check if `dealstage` is already at FUNDS_PROVIDED or later
- Only move to FUNDS_REQUESTED if both checks pass

**Impact**: Prevents deals from appearing unpaid after successful Stripe payment
