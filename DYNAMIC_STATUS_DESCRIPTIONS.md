# Dynamic Status Descriptions Implementation

## Overview

Added comprehensive, dynamic status descriptions that display contextual information to clients based on their current deal stage. These descriptions provide clear guidance on what's happening and what actions (if any) are required from the client.

## Changes Made

### 1. Updated Constants (`frontend/client-portal/src/constants/dealStages.js`)

#### New Exports

**`STAGE_NAMES`** - Comprehensive mapping of all stage IDs to friendly names:
```javascript
{
  // Workflow Stages (Steps 1-5)
  '1923713518': 'Client Details Required',
  '1923713520': 'Awaiting Search Questionnaire',
  '1923682791': 'Searches Quote Provided',
  '1923682792': 'Awaiting Signed Retainer',
  '1924069846': 'Searches Funds Requested',
  
  // Post-Workflow Stages (Step 6)
  '1904359900': 'Funds Provided',
  '1995278804': 'Searches Started',
  '1995278821': 'Searches Returned - Awaiting Clients Rates & Water',
  '1904359901': 'Searches Returned',
  '1995356644': 'Form 2 Drafting',
  '1995278813': 'Form 2 With Conveyancer For Review',
  '1904359902': 'Form 2 With Client',
  'closedwon': 'Form 2 Complete'
}
```

**`STAGE_DESCRIPTIONS`** - Detailed client-facing descriptions for each stage:
```javascript
{
  // Workflow Stages
  '1923713518': 'Please provide the necessary client details to proceed.',
  '1923713520': 'Please complete and return the search questionnaire to proceed.',
  '1923682791': 'The searches quote has been provided, please review and sign the retainer to proceed.',
  '1923682792': 'Please sign the embedded DocuSign to proceed.',
  '1924069846': 'Please review and accept the quote to proceed with the searches.',
  
  // Post-Workflow Stages
  '1904359900': 'Funds have been provided. We will now initiate the searches.',
  '1995278804': 'Searches have been initiated. We will update you once they are returned.',
  '1995278821': 'Searches have been returned. Please provide your rates and water information to proceed with Form 2 drafting.',
  '1904359901': 'All searches have been returned. We will now proceed with Form 2 drafting. No action is required from you at this time.',
  '1995356644': 'The team is currently drafting the Form 2. No action is required from you at this time.',
  '1995278813': 'The conveyancer is reviewing the Form 2. No action is required from you at this time.',
  '1904359902': 'The Form 2 DocuSign has been sent to your allocated email for review and signature.',
  'closedwon': 'The Form 2 has been completed and signed by all parties. A copy has been sent to both your inbox and the agent\'s inbox.'
}
```

#### New Helper Function

**`getStageDescription(stageId)`** - Returns detailed description for any stage:
```javascript
export const getStageDescription = (stageId) => {
  return STAGE_DESCRIPTIONS[stageId] || 'Please wait for updates from our team.';
};
```

#### Updated Functions

**`getStageName(stageId)`** - Now uses `STAGE_NAMES` instead of `POST_WORKFLOW_STAGE_NAMES`:
- Supports both workflow and post-workflow stages
- Returns friendly stage name for any stage ID

**`getClientNextStep(stageId)`** - Now returns full description:
- Calls `getStageDescription()` internally
- Provides detailed, actionable information
- Maintains backward compatibility

### 2. Updated Status Tracking Component (`frontend/client-portal/src/components/dashboard/StatusTracking.jsx`)

#### Display Changes

- **Header Changed**: "What's Next?" → "Next Steps" (more aligned with user terminology)
- **Content Updated**: Now displays full `stageDescription` instead of short next step
- **Timeline Extended**: Added "Form 2 Complete" (closedwon) as final stage

#### Code Changes

```javascript
// Before
const nextStep = getClientNextStep(deal.status);
<h4>What's Next?</h4>
<p className="next-step-text">{nextStep}</p>

// After
const stageDescription = getClientNextStep(deal.status); // Returns full description now
<h4>Next Steps</h4>
<p className="next-step-text">{stageDescription}</p>
```

#### Timeline Stages

Added 8th stage to timeline visualization:
```javascript
{ id: 'closedwon', label: 'Form 2 Complete', icon: CheckCircle }
```

## Status Descriptions by Stage

### Workflow Stages (Steps 1-5)

| Stage ID | Stage Name | Description | Action Required |
|----------|-----------|-------------|-----------------|
| 1923713518 | Client Details Required | Please provide the necessary client details to proceed. | ✅ Yes |
| 1923713520 | Awaiting Search Questionnaire | Please complete and return the search questionnaire to proceed. | ✅ Yes |
| 1923682791 | Searches Quote Provided | The searches quote has been provided, please review and sign the retainer to proceed. | ✅ Yes |
| 1923682792 | Awaiting Signed Retainer | Please sign the embedded DocuSign to proceed. | ✅ Yes |
| 1924069846 | Searches Funds Requested | Please review and accept the quote to proceed with the searches. | ✅ Yes |

### Post-Workflow Stages (Step 6)

| Stage ID | Stage Name | Description | Action Required |
|----------|-----------|-------------|-----------------|
| 1904359900 | Funds Provided | Funds have been provided. We will now initiate the searches. | ❌ No |
| 1995278804 | Searches Started | Searches have been initiated. We will update you once they are returned. | ❌ No |
| 1995278821 | Searches Returned - Awaiting Clients Rates & Water | Searches have been returned. Please provide your rates and water information to proceed with Form 2 drafting. | ✅ Yes |
| 1904359901 | Searches Returned | All searches have been returned. We will now proceed with Form 2 drafting. No action is required from you at this time. | ❌ No |
| 1995356644 | Form 2 Drafting | The team is currently drafting the Form 2. No action is required from you at this time. | ❌ No |
| 1995278813 | Form 2 With Conveyancer For Review | The conveyancer is reviewing the Form 2. No action is required from you at this time. | ❌ No |
| 1904359902 | Form 2 With Client | The Form 2 DocuSign has been sent to your allocated email for review and signature. | ✅ Yes |
| closedwon | Form 2 Complete | The Form 2 has been completed and signed by all parties. A copy has been sent to both your inbox and the agent's inbox. | ❌ No |

## User Experience

### Before Payment (Steps 1-5)
Clients see action-oriented descriptions guiding them through the portal:
- Clear instructions on what needs to be done
- Direct calls-to-action
- Stage-specific guidance

### After Payment (Step 6 - Status Tracking)

The Status Tracking page displays:

1. **Current Stage Card**
   - Large icon
   - Stage name (e.g., "Funds Provided")

2. **Next Steps Card** ⭐ NEW
   - Detailed description of current status
   - Clear indication if action is required
   - Professional, reassuring tone

3. **Visual Timeline**
   - 8 stages from "Funds Provided" to "Form 2 Complete"
   - Progress indicators (checkmarks, current, upcoming)
   - Stage-specific icons

4. **Property Details**
   - Address and location

5. **Contact Support**
   - Easy access to help

## Example Flow

### Stage: Funds Provided (1904359900)
```
┌─────────────────────────────────────────┐
│  Current Stage                          │
│  ✅ Funds Provided                      │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│  ⏰ Next Steps                          │
│                                          │
│  Funds have been provided. We will now  │
│  initiate the searches.                 │
└─────────────────────────────────────────┘
```

### Stage: Awaiting Rates & Water (1995278821)
```
┌─────────────────────────────────────────┐
│  Current Stage                          │
│  ✅ Searches Returned - Awaiting        │
│     Clients Rates & Water               │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│  ⏰ Next Steps                          │
│                                          │
│  Searches have been returned. Please    │
│  provide your rates and water           │
│  information to proceed with Form 2     │
│  drafting.                              │
└─────────────────────────────────────────┘
```

### Stage: Form 2 Complete (closedwon)
```
┌─────────────────────────────────────────┐
│  Current Stage                          │
│  ✅ Form 2 Complete                     │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│  ⏰ Next Steps                          │
│                                          │
│  The Form 2 has been completed and      │
│  signed by all parties. A copy has been │
│  sent to both your inbox and the        │
│  agent's inbox.                         │
└─────────────────────────────────────────┘
```

## Benefits

✅ **Clear Communication**: Clients know exactly what's happening
✅ **Action Clarity**: Clear indication when client action is required
✅ **Reduced Confusion**: No more wondering "what happens next?"
✅ **Professional Tone**: Reassuring and informative language
✅ **Comprehensive Coverage**: All 13 stages covered (5 workflow + 8 post-workflow)
✅ **Consistent Experience**: Same quality messaging across all stages
✅ **Scalable**: Easy to update descriptions without changing code

## Files Modified

1. `frontend/client-portal/src/constants/dealStages.js`
   - Added `STAGE_NAMES` mapping
   - Added `STAGE_DESCRIPTIONS` mapping
   - Added `getStageDescription()` function
   - Updated `getStageName()` to support all stages
   - Updated `getClientNextStep()` to return full descriptions
   - Added `closedwon` stage support

2. `frontend/client-portal/src/components/dashboard/StatusTracking.jsx`
   - Updated to use `stageDescription` instead of `nextStep`
   - Changed header from "What's Next?" to "Next Steps"
   - Added "Form 2 Complete" to timeline visualization

## Testing Checklist

- [ ] Test each workflow stage (1-5) displays correct description
- [ ] Test each post-workflow stage (6-13) displays correct description
- [ ] Verify "Next Steps" card shows full description
- [ ] Verify timeline includes all 8 post-workflow stages
- [ ] Test closedwon stage displays "Form 2 Complete"
- [ ] Verify fallback message for unknown stages
- [ ] Check responsive design on mobile devices
- [ ] Verify no console errors

## Future Enhancements

1. **Conditional Descriptions**: Different messages based on client role (primary vs additional seller)
2. **Personalization**: Include property address or client name in descriptions
3. **Rich Content**: Add links, buttons, or expandable sections for more details
4. **Multi-language**: Support for translations
5. **Email Templates**: Use same descriptions in email notifications
6. **Admin Override**: Allow conveyancers to add custom notes/messages per deal

