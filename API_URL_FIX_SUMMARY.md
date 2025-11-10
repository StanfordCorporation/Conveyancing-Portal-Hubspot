# API URL Fix Summary

## Problem
The deployed frontend was getting 404 errors with double `/api/api/` in the URLs:
- `conveyancing-portal-backend-19tozhe0u.vercel.app/api/api/questionnaire/schema` ❌
- `conveyancing-portal-backend-19tozhe0u.vercel.app/api/api/quote/calculate` ❌

## Root Cause
There was an inconsistency in how `VITE_API_BASE_URL` was being defined across different files:
- Some files used: `http://localhost:3001` (without `/api`)
- Other files used: `http://localhost:3001/api` (with `/api`)

When deployed to Vercel, the environment variable `VITE_API_BASE_URL` is set to include `/api`:
```
https://conveyancing-portal-backend-19tozhe0u.vercel.app/api
```

Files that had the old pattern would then append `/api/...` to endpoint paths, resulting in `/api/api/...`

## Files Fixed

### ✅ Updated to use consistent pattern:

1. **frontend/client-portal/src/hooks/useQuestionnaireSchema.js**
   - Changed: `API_BASE_URL = ... || 'http://localhost:3001'` → `'http://localhost:3001/api'`
   - Changed: `${API_BASE_URL}/api/questionnaire/schema` → `${API_BASE_URL}/questionnaire/schema`

2. **frontend/agent-portal/src/hooks/useQuestionnaireSchema.js**
   - Changed: `API_BASE_URL = ... || 'http://localhost:3001'` → `'http://localhost:3001/api'`
   - Changed: `${API_BASE_URL}/api/questionnaire/schema` → `${API_BASE_URL}/questionnaire/schema`

3. **frontend/client-portal/src/components/dashboard/DynamicQuote.jsx**
   - Changed: `API_BASE_URL = ... || 'http://localhost:3001'` → `'http://localhost:3001/api'`
   - Changed: `${API_BASE_URL}/api/quote/calculate` → `${API_BASE_URL}/quote/calculate`

4. **frontend/client-portal/src/components/dashboard/EmbeddedSigning.jsx**
   - Changed: `API_BASE_URL = ... || 'http://localhost:3001'` → `'http://localhost:3001/api'`
   - Changed: `${API_BASE_URL}/api/docusign/create-signing-session` → `${API_BASE_URL}/docusign/create-signing-session`

5. **frontend/client-portal/src/components/dashboard/PaymentInstructions.jsx**
   - Changed: `API_BASE_URL = ... || 'http://localhost:3001'` → `'http://localhost:3001/api'`
   - Changed: `${API_BASE_URL}/api/quote/calculate` → `${API_BASE_URL}/quote/calculate`

6. **frontend/client-portal/src/components/dashboard/SigningStatus.jsx**
   - Changed: `API_BASE_URL = ... || 'http://localhost:3001'` → `'http://localhost:3001/api'`
   - Changed: `${API_BASE_URL}/api/docusign/check-envelope/...` → `${API_BASE_URL}/docusign/check-envelope/...`
   - Changed: `${API_BASE_URL}/api/docusign/create-signing-session` → `${API_BASE_URL}/docusign/create-signing-session`
   - Changed: `${API_BASE_URL}/api/docusign/envelope-status` → `${API_BASE_URL}/docusign/envelope-status`

7. **frontend/client-portal/src/components/dashboard/PropertyDetails.jsx**
   - Changed: `${... || 'http://localhost:3001'}/files/...` → `${... || 'http://localhost:3001/api'}/files/...`

8. **frontend/client-portal/src/components/dashboard/PropertyInformation.jsx**
   - Changed: `API_BASE_URL = ... || 'http://localhost:3001'` → `'http://localhost:3001/api'`
   - (For consistency, even though this variable wasn't being used)

## Result
Now all URLs will be correctly formed:
- **Local**: `http://localhost:3001/api/questionnaire/schema` ✅
- **Production**: `https://conveyancing-portal-backend-19tozhe0u.vercel.app/api/questionnaire/schema` ✅

## Next Steps

### 🚀 Deploy the Fix

You need to redeploy the frontend for the changes to take effect:

```bash
# Navigate to frontend directory
cd frontend/client-portal

# Commit the changes (if not already committed)
git add .
git commit -m "Fix: Remove double /api/api/ in API URLs"

# Push to trigger Vercel deployment
git push
```

Or if you have Vercel CLI:
```bash
cd frontend/client-portal
vercel --prod
```

### ✅ Verify the Fix

After deployment, the errors should be resolved:
- ✅ Questionnaire schema should load
- ✅ Quote calculation should work
- ✅ DocuSign signing should work
- ✅ All API calls should succeed

### 📝 Environment Variables (Already Set Correctly)

Your Vercel environment variable is already configured correctly:
```
VITE_API_BASE_URL=https://conveyancing-portal-backend-19tozhe0u.vercel.app/api
```

No changes needed to environment variables!

## Prevention

Going forward, always use this pattern:
```javascript
// ✅ CORRECT: Include /api in the default
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api';

// Then use without /api prefix:
axios.get(`${API_BASE_URL}/endpoint`)  // Results in: /api/endpoint ✅

// ❌ WRONG: Don't do this
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';
axios.get(`${API_BASE_URL}/api/endpoint`)  // Results in: /api/api/endpoint ❌
```

