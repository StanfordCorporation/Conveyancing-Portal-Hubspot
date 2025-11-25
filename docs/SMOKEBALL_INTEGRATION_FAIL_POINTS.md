# Smokeball Integration Fail Points Analysis

## Overview

This document identifies all potential failure points in the Smokeball integration during lead creation and lead-to-matter conversion workflows.

---

## Integration Flow Summary

### Lead Creation Flow
1. **HubSpot Deal Created** → Client Disclosure or Agent Portal
2. **Smokeball Lead Creation Triggered** → `createSmokeballLeadFromDeal()`
3. **State Extraction** → From property address
4. **Matter Type Lookup** → From Smokeball API
5. **Contact Filtering** → Get deal contacts, filter out agents
6. **Contact Creation** → Create contacts in Smokeball
7. **Staff Assignment** → Get default staff (Sean, Laura)
8. **Lead Creation** → Create lead in Smokeball
9. **HubSpot Update** → Store `smokeball_lead_uid`

### Lead-to-Matter Conversion Flow
1. **Quote Accepted** → Deal stage updated to Step 4
2. **Primary Seller Address Update** → Update residential address in Smokeball
3. **Lead Conversion** → Convert lead to matter (hardcoded matter type)
4. **Webhook Processing** → `matter.converted` webhook captures matter number
5. **HubSpot Update** → Store `matter_uid`

---

## Fail Points by Workflow Phase

### PHASE 1: Lead Creation - HubSpot Deal Fetching

**Location:** `smokeball-lead-creation.js:42-46`

#### Fail Point 1.1: Deal Not Found
- **Error:** `404 Not Found` or deal doesn't exist
- **Impact:** Workflow fails completely
- **Current Handling:** Error thrown, caught in try-catch, HubSpot updated with `smokeball_sync_status: 'Failed'`
- **Risk Level:** 🔴 HIGH
- **Mitigation:** ✅ Error logged and status updated

#### Fail Point 1.2: Missing Required Properties
- **Error:** `property_address` is null/empty
- **Impact:** Cannot extract state, workflow fails
- **Current Handling:** State extraction throws error if address is null
- **Risk Level:** 🔴 HIGH
- **Mitigation:** ⚠️ No validation before state extraction

---

### PHASE 2: State Extraction

**Location:** `smokeball-lead-creation.js:56-60`, `stateExtractor.js:15-40`

#### Fail Point 2.1: State Not Found in Address
- **Error:** `extractStateFromAddress()` returns `null`
- **Impact:** Workflow fails - cannot lookup matter type
- **Current Handling:** Error thrown: `"Could not extract state from address"`
- **Risk Level:** 🔴 HIGH
- **Mitigation:** ⚠️ No fallback mechanism
- **Common Causes:**
  - Address format doesn't include state code (NSW, VIC, QLD, etc.)
  - Address format doesn't include full state name
  - International addresses (not Australian)
  - Malformed address strings

#### Fail Point 2.2: Invalid State Format
- **Error:** State extracted but not recognized by mapping
- **Impact:** Matter type lookup may fail
- **Current Handling:** State normalization may fail silently
- **Risk Level:** 🟡 MEDIUM
- **Mitigation:** ⚠️ Limited validation

---

### PHASE 3: Matter Type Lookup

**Location:** `smokeball-lead-creation.js:70-73`, `matter-types.js:80-145`

#### Fail Point 3.1: Matter Type Not Found
- **Error:** `findMatterType()` returns `null`
- **Impact:** Cannot create lead - workflow fails
- **Current Handling:** Error thrown: `"Could not find matter type for Conveyancing > Sale"`
- **Risk Level:** 🔴 HIGH
- **Mitigation:** ⚠️ No fallback matter type
- **Common Causes:**
  - Matter type doesn't exist in Smokeball for that state
  - Matter type deleted or disabled in Smokeball
  - State code mismatch (e.g., "NSW" vs "New South Wales")
  - API returns empty array

#### Fail Point 3.2: Matter Type API Failure
- **Error:** Smokeball API returns 4xx/5xx error
- **Impact:** Workflow fails
- **Current Handling:** Error propagated, caught in try-catch
- **Risk Level:** 🔴 HIGH
- **Mitigation:** ✅ Retry logic in client (3 retries with exponential backoff)

#### Fail Point 3.3: Matter Type Cache Issues
- **Error:** Stale cache returns incorrect matter types
- **Impact:** Wrong matter type used
- **Current Handling:** 30-minute cache, no invalidation on errors
- **Risk Level:** 🟡 MEDIUM
- **Mitigation:** ⚠️ Cache may be stale if matter types change

#### Fail Point 3.4: Client Role Not Found
- **Error:** Matter type found but `representativeOptions` is empty
- **Impact:** Defaults to "Client" role (may be incorrect)
- **Current Handling:** Falls back to `clientRole = 'Client'`
- **Risk Level:** 🟡 MEDIUM
- **Mitigation:** ⚠️ May use wrong role

---

### PHASE 4: Contact Fetching and Filtering

**Location:** `smokeball-lead-creation.js:87-144`, `associations.js:140-204`

#### Fail Point 4.1: No Contacts Associated with Deal
- **Error:** `getDealContacts()` returns empty array
- **Impact:** Cannot create lead - no clients
- **Current Handling:** Error thrown: `"Failed to create any contacts in Smokeball"`
- **Risk Level:** 🔴 HIGH
- **Mitigation:** ⚠️ No validation before contact creation loop

#### Fail Point 4.2: Association API Failure
- **Error:** HubSpot v4 associations API fails (4xx/5xx)
- **Impact:** Cannot fetch contacts, workflow fails
- **Current Handling:** Error propagated
- **Risk Level:** 🔴 HIGH
- **Mitigation:** ⚠️ No retry logic for HubSpot API calls

#### Fail Point 4.3: Contact Filtering Logic Error
- **Error:** Agents incorrectly included or clients incorrectly excluded
- **Impact:** Wrong contacts synced to Smokeball
- **Current Handling:** Complex filtering logic with multiple fallbacks
- **Risk Level:** 🟡 MEDIUM
- **Mitigation:** ⚠️ Logic is complex and may have edge cases
- **Filtering Logic:**
  1. Check for Primary Seller (type 1) or Additional Seller (type 4) → INCLUDE
  2. Check for Agent (type 6/7) → EXCLUDE
  3. Fallback to `contact_type` property → May be incorrect

#### Fail Point 4.4: Batch Contact Fetch Failure
- **Error:** Batch read API fails for contact properties
- **Impact:** Contacts fetched but missing properties
- **Current Handling:** Error propagated
- **Risk Level:** 🟡 MEDIUM
- **Mitigation:** ⚠️ Partial data may be used

---

### PHASE 5: Contact Creation in Smokeball

**Location:** `smokeball-lead-creation.js:151-176`, `contacts.js:183-203`

#### Fail Point 5.1: Contact Creation API Failure
- **Error:** Smokeball contact creation fails (4xx/5xx)
- **Impact:** Contact not created, but workflow continues
- **Current Handling:** Error caught, logged, continues with next contact
- **Risk Level:** 🟡 MEDIUM
- **Mitigation:** ✅ Non-blocking - continues with other contacts

#### Fail Point 5.2: All Contacts Fail to Create
- **Error:** All contacts fail creation
- **Impact:** Workflow fails - no clients for lead
- **Current Handling:** Error thrown: `"Failed to create any contacts in Smokeball"`
- **Risk Level:** 🔴 HIGH
- **Mitigation:** ✅ Checked after loop completes

#### Fail Point 5.3: Contact Deduplication Failure
- **Error:** `findContactByEmail()` fails or returns wrong contact
- **Impact:** Duplicate contacts created or wrong contact used
- **Current Handling:** Email-based deduplication, but may fail if email missing
- **Risk Level:** 🟡 MEDIUM
- **Mitigation:** ⚠️ No fallback if email is null

#### Fail Point 5.4: Contact Data Mapping Error
- **Error:** HubSpot contact properties don't map correctly to Smokeball format
- **Impact:** Contact created with incorrect/missing data
- **Current Handling:** `buildContactFromHubSpot()` may return incomplete data
- **Risk Level:** 🟡 MEDIUM
- **Mitigation:** ⚠️ No validation of required fields

#### Fail Point 5.5: HubSpot Contact Update Failure
- **Error:** Cannot update HubSpot contact with `smokeball_contact_id`
- **Impact:** Contact created in Smokeball but not linked in HubSpot
- **Current Handling:** Error logged but doesn't fail workflow
- **Risk Level:** 🟡 MEDIUM
- **Mitigation:** ⚠️ Silent failure - no retry

---

### PHASE 6: Staff Assignment

**Location:** `smokeball-lead-creation.js:187`, `staff.js:133-178`

#### Fail Point 6.1: Sean Kerswill Not Found
- **Error:** `findSean()` returns `null`
- **Impact:** Workflow fails - no responsible staff
- **Current Handling:** Error thrown, falls back to first available staff
- **Risk Level:** 🟡 MEDIUM
- **Mitigation:** ✅ Fallback mechanism exists

#### Fail Point 6.2: Laura Stuart Not Found
- **Error:** `findLaura()` returns `null`
- **Impact:** No assistant staff assigned
- **Current Handling:** Warning logged, continues without assistant
- **Risk Level:** 🟢 LOW
- **Mitigation:** ✅ Non-critical, workflow continues

#### Fail Point 6.3: Staff API Failure
- **Error:** Smokeball staff API fails (4xx/5xx)
- **Impact:** Cannot get staff assignments
- **Current Handling:** Falls back to first available staff if error
- **Risk Level:** 🟡 MEDIUM
- **Mitigation:** ✅ Fallback mechanism

#### Fail Point 6.4: No Staff Members in Smokeball
- **Error:** Staff list is empty
- **Impact:** Workflow fails - no staff to assign
- **Current Handling:** Error thrown: `"No staff members found in Smokeball"`
- **Risk Level:** 🔴 HIGH
- **Mitigation:** ⚠️ No recovery mechanism

#### Fail Point 6.5: Staff Cache Stale
- **Error:** Staff member removed but cache still has old data
- **Impact:** Wrong staff assigned
- **Current Handling:** 5-minute cache, no invalidation
- **Risk Level:** 🟢 LOW
- **Mitigation:** ⚠️ Cache may be stale

---

### PHASE 7: Lead Creation in Smokeball

**Location:** `smokeball-lead-creation.js:194-204`, `matters.js:29-80`

#### Fail Point 7.1: Lead Creation API Failure
- **Error:** Smokeball lead creation fails (4xx/5xx)
- **Impact:** Lead not created, workflow fails
- **Current Handling:** Error propagated, caught in try-catch
- **Risk Level:** 🔴 HIGH
- **Mitigation:** ✅ Retry logic (3 retries), error logged

#### Fail Point 7.2: Invalid Lead Payload
- **Error:** Payload validation fails in Smokeball
- **Impact:** Lead not created, 400 Bad Request
- **Current Handling:** Error logged with API response details
- **Risk Level:** 🔴 HIGH
- **Mitigation:** ⚠️ No payload validation before API call
- **Common Causes:**
  - Empty `clientIds` array
  - Invalid `matterTypeId` format
  - Invalid `clientRole` value
  - Missing required fields

#### Fail Point 7.3: Lead Created But No ID Returned
- **Error:** API succeeds but response missing `id` field
- **Impact:** Cannot update HubSpot with lead UID
- **Current Handling:** May throw error when accessing `smokeballLead.id`
- **Risk Level:** 🟡 MEDIUM
- **Mitigation:** ⚠️ No validation of response structure

---

### PHASE 8: HubSpot Deal Update

**Location:** `smokeball-lead-creation.js:213-218`

#### Fail Point 8.1: Deal Update API Failure
- **Error:** HubSpot deal update fails (4xx/5xx)
- **Impact:** Lead created in Smokeball but not linked in HubSpot
- **Current Handling:** Error caught in try-catch, logged
- **Risk Level:** 🔴 HIGH
- **Mitigation:** ⚠️ Silent failure - lead exists but not tracked
- **Impact:** Manual intervention required to link lead

#### Fail Point 8.2: Error Status Update Failure
- **Error:** Cannot update error status when workflow fails
- **Impact:** Deal shows no sync status, unclear if sync attempted
- **Current Handling:** Error logged but doesn't fail
- **Risk Level:** 🟡 MEDIUM
- **Mitigation:** ⚠️ Nested try-catch may fail silently

---

### PHASE 9: Lead-to-Matter Conversion - Quote Accepted

**Location:** `smokeball-quote-accepted.js:25-230`, `client.js:1347-1546`

#### Fail Point 9.1: No Lead UID Found
- **Error:** `smokeball_lead_uid` is null/empty
- **Impact:** Cannot convert lead - workflow fails
- **Current Handling:** Error thrown: `"No smokeball_lead_uid found"`
- **Risk Level:** 🔴 HIGH
- **Mitigation:** ⚠️ No validation before conversion attempt

#### Fail Point 9.2: Lead Already Converted
- **Error:** `matter_uid` already exists
- **Impact:** Duplicate conversion attempt
- **Current Handling:** ✅ Checked early, returns success
- **Risk Level:** 🟢 LOW
- **Mitigation:** ✅ Proper validation

#### Fail Point 9.3: Primary Seller Not Found
- **Error:** No contact with association type 1 (Primary Seller)
- **Impact:** Cannot update residential address
- **Current Handling:** Warning logged, workflow continues
- **Risk Level:** 🟡 MEDIUM
- **Mitigation:** ✅ Non-blocking

#### Fail Point 9.4: Primary Seller Has No Smokeball Contact ID
- **Error:** `smokeball_contact_id` is null/empty
- **Impact:** Cannot update address in Smokeball
- **Current Handling:** Warning logged, workflow continues
- **Risk Level:** 🟡 MEDIUM
- **Mitigation:** ⚠️ Address update skipped silently

#### Fail Point 9.5: Residential Address Update Failure
- **Error:** Smokeball contact update fails
- **Impact:** Address not updated, but conversion continues
- **Current Handling:** Error caught, logged, workflow continues
- **Risk Level:** 🟡 MEDIUM
- **Mitigation:** ✅ Non-blocking

#### Fail Point 9.6: Address Parsing Failure
- **Error:** `buildResidentialAddress()` cannot parse address format
- **Impact:** Address not updated
- **Current Handling:** Returns `null`, update skipped
- **Risk Level:** 🟡 MEDIUM
- **Mitigation:** ⚠️ No validation of parsed address

---

### PHASE 10: Lead-to-Matter Conversion API Call

**Location:** `smokeball-quote-accepted.js:185`, `matters.js:119-153`

#### Fail Point 10.1: Conversion API Failure
- **Error:** Smokeball conversion API fails (4xx/5xx)
- **Impact:** Lead not converted, workflow fails
- **Current Handling:** Error propagated, caught in try-catch
- **Risk Level:** 🔴 HIGH
- **Mitigation:** ✅ Retry logic (3 retries)

#### Fail Point 10.2: Lead Already Converted (API Check)
- **Error:** Lead already converted (isLead: false)
- **Impact:** Duplicate conversion attempt
- **Current Handling:** ✅ Checked before conversion, returns success
- **Risk Level:** 🟢 LOW
- **Mitigation:** ✅ Proper validation

#### Fail Point 10.3: Hardcoded Matter Type Mismatch
- **Error:** Hardcoded matter type ID doesn't match lead's matter type
- **Impact:** Conversion may fail or create incorrect matter
- **Current Handling:** Uses hardcoded `0623643a-48a4-41d7-8c91-d35915b291cd_QLD`
- **Risk Level:** 🟡 MEDIUM
- **Mitigation:** ⚠️ Assumes all leads are Queensland Sale
- **Note:** This is intentional per `LEAD_CONVERSION_UPDATE.md` to match legacy PHP

#### Fail Point 10.4: Conversion Returns 202 But Fails Asynchronously
- **Error:** API returns 202 Accepted but async processing fails
- **Impact:** Conversion appears successful but matter never created
- **Current Handling:** No async status check
- **Risk Level:** 🟡 MEDIUM
- **Mitigation:** ⚠️ Relies on webhook for confirmation

---

### PHASE 11: Webhook Processing

**Location:** `smokeball-webhook.js:33-93`, `smokeball-webhook.js:237-290`

#### Fail Point 11.1: Webhook Not Received
- **Error:** `matter.converted` webhook never arrives
- **Impact:** Matter number never synced to HubSpot
- **Current Handling:** No timeout or retry mechanism
- **Risk Level:** 🔴 HIGH
- **Mitigation:** ⚠️ Manual intervention required

#### Fail Point 11.2: Webhook Authentication Failure
- **Error:** Webhook signature verification fails
- **Impact:** Webhook rejected, matter number not synced
- **Current Handling:** ⚠️ **VERIFICATION DISABLED** (line 46-54)
- **Risk Level:** 🔴 HIGH
- **Mitigation:** ⚠️ Security risk - accepts unverified webhooks

#### Fail Point 11.3: Deal Not Found by Lead UID
- **Error:** `findDealByLeadUid()` returns `null`
- **Impact:** Matter number not synced
- **Current Handling:** Returns success but doesn't sync
- **Risk Level:** 🟡 MEDIUM
- **Mitigation:** ⚠️ Silent failure

#### Fail Point 11.4: Matter Number Missing in Webhook
- **Error:** `matter.converted` webhook doesn't include `number` field
- **Impact:** Matter converted but number not stored
- **Current Handling:** Warning logged, sync status updated
- **Risk Level:** 🟡 MEDIUM
- **Mitigation:** ⚠️ May need manual update

#### Fail Point 11.5: HubSpot Update Failure in Webhook
- **Error:** Cannot update HubSpot deal with matter number
- **Impact:** Matter number not stored
- **Current Handling:** Error propagated, webhook may retry
- **Risk Level:** 🟡 MEDIUM
- **Mitigation:** ⚠️ Smokeball may retry webhook

#### Fail Point 11.6: Webhook Payload Format Mismatch
- **Error:** Webhook payload structure doesn't match expected format
- **Impact:** Cannot extract matter data
- **Current Handling:** May throw error accessing `payload.payload` or `payload.data`
- **Risk Level:** 🟡 MEDIUM
- **Mitigation:** ⚠️ Tries both formats but may fail

---

## Authentication & API Failures

### Fail Point AUTH.1: OAuth Token Expired
- **Location:** `client.js:50-66`, `auth.js` (referenced)
- **Error:** Access token expired or invalid
- **Impact:** All Smokeball API calls fail with 401
- **Current Handling:** ✅ Auto-refresh in `getCurrentAccessToken()`
- **Risk Level:** 🟡 MEDIUM
- **Mitigation:** ✅ Token refresh implemented

### Fail Point AUTH.2: Token Refresh Failure
- **Error:** Refresh token expired or invalid
- **Impact:** Cannot authenticate, all API calls fail
- **Current Handling:** Error propagated
- **Risk Level:** 🔴 HIGH
- **Mitigation:** ⚠️ Manual re-authentication required

### Fail Point AUTH.3: Rate Limiting
- **Error:** Smokeball API returns 429 Too Many Requests
- **Impact:** API calls fail temporarily
- **Current Handling:** ✅ Retry logic with exponential backoff
- **Risk Level:** 🟡 MEDIUM
- **Mitigation:** ✅ Retries after delay

### Fail Point AUTH.4: Network Timeout
- **Error:** Request timeout (30 seconds)
- **Impact:** API call fails
- **Current Handling:** ✅ Retry logic
- **Risk Level:** 🟡 MEDIUM
- **Mitigation:** ✅ 3 retries with exponential backoff

---

## Configuration Failures

### Fail Point CONFIG.1: SMOKEBALL_ENABLED Flag
- **Location:** `client-disclosure.js:298`, `agent-lead-creation.js:276`
- **Error:** Integration disabled but workflow expects it
- **Impact:** Smokeball sync skipped silently
- **Current Handling:** ✅ Checked before calling workflow
- **Risk Level:** 🟢 LOW
- **Mitigation:** ✅ Proper flag check

### Fail Point CONFIG.2: Missing Environment Variables
- **Error:** Required env vars not set (API keys, URLs, etc.)
- **Impact:** Integration fails at startup or runtime
- **Current Handling:** May fail silently or throw errors
- **Risk Level:** 🔴 HIGH
- **Mitigation:** ⚠️ No validation at startup

---

## Data Integrity Failures

### Fail Point DATA.1: Partial Workflow Completion
- **Error:** Workflow fails mid-execution (e.g., after contacts created but before lead)
- **Impact:** Orphaned data in Smokeball
- **Current Handling:** No rollback mechanism
- **Risk Level:** 🟡 MEDIUM
- **Mitigation:** ⚠️ Manual cleanup required

### Fail Point DATA.2: Duplicate Lead Creation
- **Error:** Workflow called twice for same deal
- **Impact:** Duplicate leads in Smokeball
- **Current Handling:** ⚠️ No check for existing lead
- **Risk Level:** 🟡 MEDIUM
- **Mitigation:** ⚠️ Should check `smokeball_lead_uid` before creating

### Fail Point DATA.3: HubSpot-Smokeball Data Mismatch
- **Error:** Data in HubSpot doesn't match Smokeball
- **Impact:** Inconsistent state between systems
- **Current Handling:** No reconciliation mechanism
- **Risk Level:** 🟡 MEDIUM
- **Mitigation:** ⚠️ Manual verification required

---

## Critical Fail Points Summary

### 🔴 HIGH RISK (Immediate Action Required)

1. **State extraction failure** - No fallback if state not found
2. **Matter type not found** - Workflow fails completely
3. **No contacts associated** - Cannot create lead
4. **Lead creation API failure** - Lead not created
5. **HubSpot deal update failure** - Lead created but not tracked
6. **Webhook not received** - Matter number never synced
7. **Webhook authentication disabled** - Security risk

### 🟡 MEDIUM RISK (Monitor and Improve)

1. **Contact filtering logic** - May incorrectly include/exclude contacts
2. **Contact creation failures** - Partial failures may go unnoticed
3. **Staff assignment failures** - Fallback exists but may assign wrong staff
4. **Address parsing failures** - Address updates may fail silently
5. **Hardcoded matter type** - Assumes all conversions are QLD Sale
6. **Partial workflow completion** - Orphaned data possible

### 🟢 LOW RISK (Acceptable)

1. **Laura Stuart not found** - Non-critical, workflow continues
2. **Already converted check** - Properly handled
3. **Configuration flags** - Properly checked

---

## Recommendations

### Immediate Fixes

1. **Enable webhook authentication** - Security critical
2. **Add duplicate lead check** - Check `smokeball_lead_uid` before creating
3. **Add state extraction fallback** - Use property address parsing or default state
4. **Add payload validation** - Validate lead payload before API call
5. **Add retry for HubSpot API calls** - Currently no retry logic

### Improvements

1. **Add workflow idempotency** - Check if lead already exists before creating
2. **Add reconciliation job** - Periodically check HubSpot-Smokeball sync status
3. **Add address validation** - Validate parsed addresses before updating
4. **Add matter type fallback** - Use default matter type if lookup fails
5. **Add comprehensive logging** - Log all failure points with context
6. **Add monitoring/alerting** - Alert on critical failures

### Testing Recommendations

1. **Test state extraction** - Various address formats
2. **Test matter type lookup** - All Australian states
3. **Test contact filtering** - Edge cases with association types
4. **Test partial failures** - What happens if contacts fail but lead succeeds
5. **Test webhook processing** - Various payload formats
6. **Test duplicate prevention** - Multiple calls for same deal

---

## Workflow Error Handling Summary

### Lead Creation Workflow (`createSmokeballLeadFromDeal`)

- ✅ **Top-level try-catch** - Catches all errors
- ✅ **HubSpot error status update** - Updates deal on failure
- ⚠️ **Partial error handling** - Some errors logged but don't fail workflow
- ⚠️ **No rollback** - Created resources not cleaned up on failure

### Lead-to-Matter Conversion (`handleQuoteAccepted`)

- ✅ **Top-level try-catch** - Catches all errors
- ✅ **HubSpot error status update** - Updates deal on failure
- ✅ **Already converted check** - Prevents duplicate conversion
- ⚠️ **Address update non-blocking** - Failures don't stop conversion
- ⚠️ **No conversion status check** - Relies on webhook for confirmation

### Webhook Handler (`smokeball-webhook.js`)

- ✅ **Top-level try-catch** - Catches all errors
- ⚠️ **Authentication disabled** - Security risk
- ⚠️ **Silent failures** - Returns success even if deal not found
- ⚠️ **No retry mechanism** - Failed webhooks not retried

---

## Conclusion

The Smokeball integration has **robust error handling** in most areas but has several **critical fail points** that need immediate attention:

1. **Webhook authentication is disabled** - Security risk
2. **No duplicate lead prevention** - May create duplicate leads
3. **State extraction has no fallback** - Workflow fails completely
4. **HubSpot update failures are silent** - Lead created but not tracked

Most failures are properly logged and status is updated in HubSpot, but **manual intervention** may be required for recovery in many scenarios.

