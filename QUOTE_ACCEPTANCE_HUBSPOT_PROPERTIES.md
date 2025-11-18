# Quote Acceptance Workflow - HubSpot Properties Modified

## Overview
When a quote is accepted (Step 3 → Step 4), the system updates several HubSpot deal properties. This document details all properties that are modified during the quote acceptance workflow.

## Workflow Trigger
- **Route:** `PATCH /api/client/property/:dealId/stage`
- **Trigger:** When `stepNumber === 4` (Quote Accepted - Awaiting Retainer)
- **File:** `backend/src/routes/client.js` (lines 1347-1534)
- **Workflow File:** `backend/src/services/workflows/smokeball-quote-accepted.js`

---

## HubSpot Deal Properties Modified

### 1. Deal Stage Property
**Property:** `dealstage`
- **Value:** `'1923682792'` (Step 4: Awaiting Retainer)
- **Location:** `backend/src/routes/client.js:1380`
- **Purpose:** Updates the deal stage to indicate quote has been accepted

```javascript
const updatePayload = { dealstage };
```

---

### 2. Search Properties (Based on Quote Calculation)

These properties are set based on the quote breakdown calculation. Only searches that are **included** in the quote have their main property set to "Yes".

#### Search Properties Set to "Yes" (if included):
- `title_search` → "Yes"
- `plan_image_search` → "Yes"
- `information_certificate` → "Yes"
- `cms_and_dealing_certificate` → "Yes"
- `tmr_search` → "Yes"
- `des_contaminated_land_search` → "Yes"
- `des_heritage_search` → "Yes"

**Location:** `backend/src/routes/client.js:1457-1473`

#### Search Status Properties (Always Set):
All searches (both included and excluded) have their status property set to "Not Ordered":
- `title_search_status` → "Not Ordered"
- `plan_image_search_status` → "Not Ordered"
- `information_certificate_status` → "Not Ordered"
- `cms_and_dealing_certificate_status` → "Not Ordered"
- `tmr_search_status` → "Not Ordered"
- `des_contaminated_land_search_status` → "Not Ordered"
- `des_heritage_search_status` → "Not Ordered"

**Logic:**
- **Included searches:** Main property = "Yes", Status = "Not Ordered"
- **Excluded searches:** Main property = not set, Status = "Not Ordered"

**Location:** `backend/src/routes/client.js:1457-1473`

---

### 3. Quote SMS Property

**Property:** `searches_quote_sms`
- **Format:** Rich text containing quote amount and required searches list
- **Location:** `backend/src/routes/client.js:1478-1488`
- **Purpose:** Stores formatted quote information for SMS/communication purposes

**Format Example:**
```
Quote Amount : $175.48

Required Searches :

- Title Search
- Plan Image Search
- Information Certificate
```

**Implementation:**
- Extracts `grandTotal` from calculated quote
- Filters `quote.breakdown` to get only included searches
- Formats as plain text with newlines and bullet points

---

### 4. Smokeball Integration Properties

These properties are updated by the `smokeball-quote-accepted.js` workflow:

#### On Successful Conversion:
**Properties:**
- `smokeball_sync_status` → `"Successful"`
- `smokeball_last_sync` → `new Date().toISOString()` (current timestamp)

**Location:** `backend/src/services/workflows/smokeball-quote-accepted.js:191-194`

#### If Already Converted:
**Properties:**
- `matter_uid` → Matter number from Smokeball (if available)
- `smokeball_sync_status` → `"Successful"`

**Location:** `backend/src/services/workflows/smokeball-quote-accepted.js:171-174`

#### On Error:
**Properties:**
- `smokeball_sync_status` → `"Failed"`
- `smokeball_sync_error` → Error message

**Location:** `backend/src/services/workflows/smokeball-quote-accepted.js:220-223`

---

## Summary Table

| Property | Value | Condition | Location |
|----------|-------|-----------|----------|
| `dealstage` | `'1923682792'` | Always | `client.js:1380` |
| `title_search` | `"Yes"` | If included in quote | `client.js:1464` |
| `title_search_status` | `"Not Ordered"` | Always | `client.js:1465, 1470` |
| `plan_image_search` | `"Yes"` | If included in quote | `client.js:1464` |
| `plan_image_search_status` | `"Not Ordered"` | Always | `client.js:1465, 1470` |
| `information_certificate` | `"Yes"` | If included in quote | `client.js:1464` |
| `information_certificate_status` | `"Not Ordered"` | Always | `client.js:1465, 1470` |
| `cms_and_dealing_certificate` | `"Yes"` | If included in quote | `client.js:1464` |
| `cms_and_dealing_certificate_status` | `"Not Ordered"` | Always | `client.js:1465, 1470` |
| `tmr_search` | `"Yes"` | If included in quote | `client.js:1464` |
| `tmr_search_status` | `"Not Ordered"` | Always | `client.js:1465, 1470` |
| `des_contaminated_land_search` | `"Yes"` | If included in quote | `client.js:1464` |
| `des_contaminated_land_search_status` | `"Not Ordered"` | Always | `client.js:1465, 1470` |
| `des_heritage_search` | `"Yes"` | If included in quote | `client.js:1464` |
| `des_heritage_search_status` | `"Not Ordered"` | Always | `client.js:1465, 1470` |
| `searches_quote_sms` | Formatted quote text | Always (Step 4) | `client.js:1486` |
| `smokeball_sync_status` | `"Successful"` or `"Failed"` | After Smokeball workflow | `smokeball-quote-accepted.js:191, 220` |
| `smokeball_last_sync` | ISO timestamp | On success | `smokeball-quote-accepted.js:193` |
| `matter_uid` | Matter number | If already converted | `smokeball-quote-accepted.js:172` |
| `smokeball_sync_error` | Error message | On error | `smokeball-quote-accepted.js:222` |

---

## Notes

1. **No Contact Properties Modified:** The workflow only **reads** contact properties (e.g., `address`, `firstname`, `lastname`) to update Smokeball, but does not modify any HubSpot contact properties.

2. **Quote Calculation:** The search properties are determined by the `calculateQuote()` function which considers:
   - Deal questionnaire properties
   - Contact `title_search_done` property (excludes Title Search if already done)
   - Deal `agent_title_search` property (excludes Title Search if agent already did it)

3. **Smokeball Updates:** The workflow updates Smokeball contact residential address, but these are Smokeball API calls, not HubSpot property updates.

4. **Error Handling:** If the Smokeball conversion fails, the deal properties are still updated (stage, searches), but `smokeball_sync_status` is set to "Failed".

---

## Related Files

- `backend/src/routes/client.js` - Main route handler for quote acceptance
- `backend/src/services/workflows/smokeball-quote-accepted.js` - Smokeball conversion workflow
- `backend/src/integrations/hubspot/deals.js` - Deal update functions
- `backend/src/services/quote/calculator.js` - Quote calculation logic

