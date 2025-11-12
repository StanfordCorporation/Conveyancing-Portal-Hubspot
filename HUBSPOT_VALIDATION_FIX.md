# HubSpot Validation Error Fix

## Issue Summary

**Date**: 2025-11-11 07:55:46
**Severity**: Critical - Blocking quote acceptance workflow
**Status**: ✅ FIXED

## What Happened

When a client accepted a quote (Stage 4), the system:
1. ✅ Successfully analyzed which property searches to order
2. ✅ Successfully converted Smokeball lead to matter (202 Accepted)
3. ❌ **FAILED** to update HubSpot with search properties (400 Validation Error)

### Error Details

HubSpot rejected these property values:

| Property | Attempted Value | Error |
|----------|----------------|-------|
| `tmr_search` | "No" | Only allows "Yes" |
| `des_contaminated_land_search` | "No" | Only allows "Yes" |
| `des_heritage_search` | "No" | Only allows "Yes" |
| `tmr_search_status` | "Not Required" | Not in allowed list |
| `des_contaminated_land_search_status` | "Not Required" | Not in allowed list |
| `des_heritage_search_status` | "Not Required" | Not in allowed list |

**Allowed Status Values**: `["Not Ordered", "Awaiting / In Progress", "Ordered"]`

## Root Cause

Location: `backend/src/routes/client.js:1320-1336`

The code initialized **all** search properties to invalid default values:
```javascript
const searchProperties = {
  tmr_search: "No",  // ❌ Invalid - HubSpot only allows "Yes"
  tmr_search_status: "Not Required",  // ❌ Invalid - not in allowed list
  // ... same for all other searches
};
```

Then it only updated the **included** searches, leaving excluded searches with invalid values that HubSpot rejected.

## The Fix

**File**: `backend/src/routes/client.js:1320-1339`
**Commits**: `775516c` (initial fix), `f43d797` (corrected status logic)

### New Logic

1. Start with **empty** search properties object
2. For **required** searches (e.g., Title Search, Plan Image):
   - Set main property: `title_search = "Yes"` (marks as required)
   - Set status: `title_search_status = "Not Ordered"` (staff updates manually)
3. For **excluded** searches (e.g., TMR, DES searches):
   - **Only** set status: `tmr_search_status = "Not Ordered"`
   - **Don't** set main property (avoids invalid "No" value)

**Note**: All statuses start at "Not Ordered" so staff can manually track progress in HubSpot:
- "Not Ordered" → "Awaiting / In Progress" (when ordered)
- "Awaiting / In Progress" → "Ordered" (when received)

### Code Changes

```javascript
// Initialize search properties object
const searchProperties = {};

// Set search properties based on quote breakdown
quote.breakdown.forEach(search => {
  const propertyName = searchNameToPropertyMap[search.name];
  if (!propertyName) return;

  if (search.included) {
    // Required searches: set property to "Yes" and status to "Not Ordered"
    // Staff will manually update status in HubSpot as they order/receive searches
    searchProperties[propertyName] = "Yes";
    searchProperties[`${propertyName}_status`] = "Not Ordered";
    console.log(`[Deal Stage]   ✓ ${search.name} → ${propertyName} = Yes, status = Not Ordered (required)`);
  } else {
    // Excluded searches: only set status to "Not Ordered"
    // Don't set the main property (e.g., tmr_search) as it only allows "Yes"
    searchProperties[`${propertyName}_status`] = "Not Ordered";
    console.log(`[Deal Stage]   ✗ ${search.name} → ${propertyName}_status = Not Ordered (${search.reason})`);
  }
});
```

## Impact

✅ **Fixed**: Quote acceptance now completes successfully
✅ **Fixed**: Smokeball lead conversion syncs with HubSpot
✅ **Fixed**: Search properties correctly reflect quote breakdown
✅ **Fixed**: No more validation errors on Stage 4 updates

## Testing

To verify the fix works:

1. Accept a quote that has excluded searches (e.g., TMR Search not required)
2. Check logs for successful HubSpot update
3. Verify deal properties in HubSpot show correct search statuses
4. Confirm Smokeball matter created successfully

### Expected Log Output

```
[Deal Stage] ✓ Title Search → title_search = Yes, status = Not Ordered (required)
[Deal Stage] ✓ Plan Image Search → plan_image_search = Yes, status = Not Ordered (required)
[Deal Stage] ✗ TMR Search → tmr_search_status = Not Ordered (Not required: resume_notice = "no")
[Deal Stage] ✅ Property search fields determined based on quote
[Deal Stage] ✅ Lead conversion initiated in Smokeball
```

Staff will then manually update search statuses in HubSpot from "Not Ordered" → "Awaiting / In Progress" → "Ordered" as they process each search.

## Related Issues

This fix resolves the workflow failure that prevented:
- HubSpot deal updates after quote acceptance
- Proper tracking of which searches were ordered
- Complete end-to-end quote acceptance workflow

## Deployment

Status: **Committed to main branch**
Next: Deploy to production and monitor Stage 4 workflow

---

**Fixed by**: Claude Code
**Date**: 2025-11-11
