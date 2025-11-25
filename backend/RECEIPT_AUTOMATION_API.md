# Smokeball Receipt Automation API

This API endpoint triggers the Python Playwright automation script to create receipts in Smokeball via web automation.

## Endpoint

```
POST /api/smokeball/receipt/create
```

## Authentication

Requires Smokeball integration to be enabled and authenticated.

## Request Body

### Option 1: Direct Parameters

```json
{
  "matterId": "ce2582fe-b415-4f95-b9b9-c79c903a4654",
  "amount": 81.70,
  "lastname": "Stanford",
  "firstname": "Logan",
  "reason": "On account of test search fees",
  "date": "21/11/2025",
  "testMode": false
}
```

### Option 2: Using Deal ID (Recommended)

```json
{
  "dealId": "123456789",
  "amount": 81.70,
  "reason": "On account of search fees",
  "date": "21/11/2025",
  "testMode": false
}
```

When using `dealId`, the system will:
- Fetch the deal from HubSpot
- Extract `matter_uid` or `smokeball_lead_uid` from the deal
- Fetch associated contacts (prefers Primary Seller)
- Extract contact name (lastname, firstname)
- Use deal amount if `amount` is not provided

## Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `matterId` | string | Yes* | Smokeball matter/lead ID |
| `dealId` | string | Yes* | HubSpot deal ID (alternative to matterId) |
| `amount` | number | No | Amount to receipt (default: from deal or 81.70) |
| `lastname` | string | No* | Contact lastname (required if using matterId) |
| `firstname` | string | No* | Contact firstname (required if using matterId) |
| `reason` | string | No | Reason for receipt (default: "On account of search fees") |
| `date` | string | No | Date deposited in DD/MM/YYYY format (default: today) |
| `testMode` | boolean | No | If true, fills form but doesn't submit (default: false) |

*Either `matterId` (with lastname/firstname) OR `dealId` is required.

## Response

### Success Response

```json
{
  "success": true,
  "message": "Receipt created successfully",
  "result": {
    "exitCode": 0,
    "testMode": false,
    "output": "Python script output..."
  }
}
```

### Error Response

```json
{
  "success": false,
  "error": "Error message",
  "message": "Receipt automation failed - check logs for details",
  "troubleshooting": {
    "python": "Make sure Python is installed and in PATH",
    "playwright": "Run: playwright install chromium",
    "dependencies": "Install: pip install -r requirements-automation.txt",
    "script": "Verify smokeball_receipt_automation.py exists in backend/ directory"
  }
}
```

## Examples

### Example 1: Create Receipt for Deal (Recommended)

```bash
curl -X POST http://localhost:3001/api/smokeball/receipt/create \
  -H "Content-Type: application/json" \
  -d '{
    "dealId": "123456789",
    "amount": 81.70,
    "reason": "On account of search fees",
    "testMode": false
  }'
```

### Example 2: Test Mode (Fill Form But Don't Submit)

```bash
curl -X POST http://localhost:3001/api/smokeball/receipt/create \
  -H "Content-Type: application/json" \
  -d '{
    "dealId": "123456789",
    "testMode": true
  }'
```

### Example 3: Direct Matter ID

```bash
curl -X POST http://localhost:3001/api/smokeball/receipt/create \
  -H "Content-Type: application/json" \
  -d '{
    "matterId": "ce2582fe-b415-4f95-b9b9-c79c903a4654",
    "amount": 81.70,
    "lastname": "Stanford",
    "firstname": "Logan",
    "reason": "On account of test search fees",
    "date": "21/11/2025"
  }'
```

## Frontend Integration

### React Example

```javascript
const createReceipt = async (dealId, amount, testMode = false) => {
  try {
    const response = await fetch('/api/smokeball/receipt/create', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        dealId,
        amount,
        testMode
      })
    });

    const result = await response.json();
    
    if (result.success) {
      console.log('Receipt created successfully!');
      return result;
    } else {
      throw new Error(result.error);
    }
  } catch (error) {
    console.error('Failed to create receipt:', error);
    throw error;
  }
};

// Usage
await createReceipt('123456789', 81.70, false);
```

### Button Click Handler

```javascript
const handleCreateReceipt = async () => {
  try {
    setLoading(true);
    const result = await createReceipt(dealId, amount);
    alert('Receipt created successfully!');
  } catch (error) {
    alert(`Failed to create receipt: ${error.message}`);
  } finally {
    setLoading(false);
  }
};

<button onClick={handleCreateReceipt} disabled={loading}>
  {loading ? 'Creating Receipt...' : 'Create Receipt'}
</button>
```

## Prerequisites

1. **Python** installed and in PATH
2. **Playwright** installed: `playwright install chromium`
3. **Python dependencies**: `pip install -r requirements-automation.txt`
4. **Python script**: `smokeball_receipt_automation.py` in `backend/` directory
5. **Environment variables** in `.env`:
   - `SMOKEBALL_USERNAME`
   - `SMOKEBALL_PASSWORD`
   - `SMOKEBALL_2FA_SECRET` (optional, for automatic 2FA)

## How It Works

1. API receives request with deal/matter info
2. If `dealId` provided, fetches deal and contact info from HubSpot
3. Spawns Python subprocess with Playwright script
4. Python script:
   - Logs into Smokeball (with 2FA if needed)
   - Navigates to matter's transactions page
   - Clicks "Deposit Funds" button
   - Fills form fields:
     - Date Deposited
     - Received From (Lastname, Firstname)
     - Reason
     - Amount
   - Clicks "Process/Open Receipt" (unless testMode)
5. Returns result to API
6. API returns JSON response

## Test Mode

When `testMode: true`:
- Form is filled completely
- Script stops before clicking "Process/Open Receipt"
- Browser stays open for 30 seconds for inspection
- Useful for testing without creating actual receipts

## Troubleshooting

### Python Not Found
- Ensure Python is installed: `python --version`
- Add Python to system PATH

### Playwright Not Installed
```bash
playwright install chromium
```

### Dependencies Missing
```bash
pip install -r requirements-automation.txt
```

### Script Not Found
- Verify `smokeball_receipt_automation.py` exists in `backend/` directory
- Check file permissions

### 2FA Issues
- Configure `SMOKEBALL_2FA_SECRET` in `.env` for automatic 2FA
- Or script will prompt for manual 2FA code

### Contact Not Found
- Ensure deal has associated contacts in HubSpot
- Check that contact has `firstname` and `lastname` properties

## Notes

- The automation runs synchronously (blocks until complete)
- Typical execution time: 30-60 seconds
- Browser window opens visibly (headless: false) for debugging
- Screenshots are saved to `backend/screenshots/` directory
- Logs are output to console and included in API response

