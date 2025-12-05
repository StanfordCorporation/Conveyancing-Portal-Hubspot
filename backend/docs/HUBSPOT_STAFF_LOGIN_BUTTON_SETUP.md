# HubSpot Staff Login Button Setup

This document explains how to configure a HubSpot custom button that allows staff to login to the Agent Portal as any agent contact.

## Overview

The staff login feature allows authorized staff members to access the Agent Portal on behalf of any agent. This is useful for:
- Customer support
- Account management
- Testing
- Data correction

## Environment Setup

Add the following to your backend `.env` file:

```
STAFF_PASSWORD=your-secure-password-here
AGENT_PORTAL_URL=https://portal.stanfordlegal.com.au
```

## API Endpoint

**POST** `/api/auth/staff-login-as-agent`

### Request

**Query Parameters:**
- `contactId` (optional) - HubSpot contact ID

**Body:**
```json
{
  "staffPassword": "your-staff-password",
  "contactId": "123456789"
}
```

Note: `contactId` can be passed as either query parameter or in the body.

### Response (Success)

```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "agent": {
    "id": "123456789",
    "email": "agent@example.com",
    "firstname": "John",
    "lastname": "Doe",
    "permissionLevel": "admin",
    "agencyId": "987654321"
  },
  "loginUrl": "https://portal.stanfordlegal.com.au/agent/dashboard?token=eyJhbG..."
}
```

### Response (Error)

```json
{
  "error": "Unauthorized",
  "message": "Invalid staff password"
}
```

## HubSpot Custom Button Configuration

### Option 1: Using HubSpot Workflows (Recommended)

1. Go to **Automation > Workflows** in HubSpot
2. Create a new workflow triggered by a contact-based manual enrollment
3. Add a **Webhook** action with:
   - **Method:** POST
   - **URL:** `https://api.stanfordlegal.com.au/api/auth/staff-login-as-agent?contactId={{contact.id}}`
   - **Request body:**
     ```json
     {
       "staffPassword": "your-staff-password"
     }
     ```

### Option 2: Using HubSpot Custom Card (CRM Extension)

Create a custom card that displays a "Login as Agent" button:

1. Go to **Settings > Integrations > Private Apps**
2. Create or edit your private app
3. Add a CRM card with an iframe or button that calls the endpoint

### Option 3: External Tool / Bookmark

Create a bookmarklet or internal tool that staff can use:

```javascript
javascript:(function(){
  const contactId = prompt('Enter Contact ID:');
  if(contactId) {
    fetch('https://api.stanfordlegal.com.au/api/auth/staff-login-as-agent?contactId=' + contactId, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ staffPassword: 'your-password' })
    })
    .then(r => r.json())
    .then(data => {
      if(data.loginUrl) window.open(data.loginUrl, '_blank');
      else alert('Error: ' + data.message);
    });
  }
})();
```

## Security Notes

1. **Password Protection**: The `STAFF_PASSWORD` environment variable must be kept secure
2. **Token Expiration**: Staff tokens expire after 24 hours (shorter than regular 7-day tokens)
3. **Staff Access Flag**: The JWT includes `staffAccess: true` to identify staff-initiated sessions
4. **HTTPS Only**: Always use HTTPS in production to protect the password in transit

## Testing

Test the endpoint using curl:

```bash
curl -X POST "https://api.stanfordlegal.com.au/api/auth/staff-login-as-agent?contactId=123456789" \
  -H "Content-Type: application/json" \
  -d '{"staffPassword": "your-password"}'
```

## Troubleshooting

| Error | Cause | Solution |
|-------|-------|----------|
| "Staff password is required" | Missing `staffPassword` in body | Add staffPassword to request body |
| "Invalid staff password" | Wrong password | Check STAFF_PASSWORD env var |
| "Configuration Error" | STAFF_PASSWORD not set | Set STAFF_PASSWORD in .env |
| "Contact Not Found" | Invalid contactId | Verify contact exists in HubSpot |
| "Contact is not configured as an agent" | Contact isn't an agent | Check contact_type property |
