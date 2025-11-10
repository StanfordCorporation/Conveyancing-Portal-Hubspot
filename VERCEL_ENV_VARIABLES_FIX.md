# 🔧 Vercel Environment Variables - Complete Fix

## 🎯 Issue

Your Vercel backend has environment variables set to **localhost** instead of production URLs:
- ❌ `SMOKEBALL_REDIRECT_URI` = `http://localhost:3001/api/smokeball/oauth-callback`
- ❌ `CORS_ORIGIN` = `http://localhost:3000`

This causes:
- ❌ OAuth redirects to localhost instead of Vercel
- ❌ CORS errors when frontend calls backend

---

## ✅ Solution: Update Vercel Environment Variables

### Step 1: Open Vercel Dashboard

1. Go to: https://vercel.com/dashboard
2. Click: **conveyancing-portal-backend** (your backend project)
3. Click: **Settings** tab
4. Click: **Environment Variables** in left sidebar

---

### Step 2: Update These Variables

Find and update each variable (or add if missing):

#### 1. **SMOKEBALL_REDIRECT_URI**

**Current (Wrong):**
```
http://localhost:3001/api/smokeball/oauth-callback
```

**Change to:**
```
https://conveyancing-portal-backend.vercel.app/api/smokeball/oauth-callback
```

**Apply to:** ✅ Production, ✅ Preview, ✅ Development

---

#### 2. **CORS_ORIGIN** (if it exists)

**Current (Wrong):**
```
http://localhost:3000
```

**Change to:**
```
https://frontend-blue-sigma-57.vercel.app
```

**OR Better - Delete this variable entirely!**

Your code already has proper CORS configuration that allows:
- All `frontend-*.vercel.app` URLs ✅
- `localhost:3000` for development ✅
- Your production domain ✅

**Recommendation:** **DELETE** the `CORS_ORIGIN` environment variable - the code handles it better!

---

#### 3. **FRONTEND_URL** (if it exists)

**Should be:**
```
https://frontend-blue-sigma-57.vercel.app
```

---

### Step 3: Verify Other Environment Variables

While you're in environment variables, make sure these are set:

#### ✅ Smokeball (Should Already Exist):
```bash
SMOKEBALL_CLIENT_ID=3asf3pvru111mu6qv26k0co0s6
SMOKEBALL_CLIENT_SECRET=utofdalujr4520lqk7472q4u4rn2fkd236smfg1d69c53jm0v9s
SMOKEBALL_API_KEY=NO5glMfrqP5BuwxPgnqsp7hKzeU5p2Tw7jhPqjC2
SMOKEBALL_AUTH_BASE_URL=https://auth.smokeball.com.au
SMOKEBALL_API_BASE_URL=https://api.smokeball.com.au
```

#### ✅ Redis (Should Already Exist):
```bash
REDIS_URL=redis://default:L758ph0RUR7Rpo8dkFW1t2XOvEEAcKAt@redis-11437.c8.us-east-1-4.ec2.redns.redis-cloud.com:11437
```

#### ✅ HubSpot:
```bash
HUBSPOT_ACCESS_TOKEN=pat-au-...
```

#### ✅ Security:
```bash
JWT_SECRET=your-secure-random-secret
```

---

### Step 4: Save and Redeploy

1. **Click "Save"** for each variable you changed

2. **Redeploy the backend:**
   - Go to **Deployments** tab
   - Click "⋯" (three dots) on the **latest deployment**
   - Click **Redeploy**
   - ✅ Check "Use existing Build Cache" (faster)
   - Click **Redeploy**

3. **Wait ~1 minute** for deployment to complete

4. **Verify deployment succeeded:**
   - Look for ✅ green checkmark
   - Click on deployment to see logs

---

### Step 5: Update Smokeball Developer Portal

**Add the Vercel redirect URI to your Smokeball OAuth app:**

1. **Find your Smokeball Developer Portal** (or contact support)
2. **Locate your OAuth app** (Client ID: `3asf3pvru111mu6qv26k0co0s6`)
3. **Add redirect URI:**
   ```
   https://conveyancing-portal-backend.vercel.app/api/smokeball/oauth-callback
   ```
4. **Keep localhost too** (for local dev):
   ```
   http://localhost:3001/api/smokeball/oauth-callback
   ```
5. **Save**

**Can't find developer portal?**
- Email: support@smokeball.com.au
- Subject: "Add redirect URI to OAuth app"
- Message: "Please add this redirect URI to my OAuth app (Client ID: 3asf3pvru111mu6qv26k0co0s6): https://conveyancing-portal-backend.vercel.app/api/smokeball/oauth-callback"

---

## 🧪 Step 6: Test OAuth Flow Again

After redeployment completes:

1. **Clear browser cache/cookies** (or use incognito window)

2. **Visit:**
   ```
   https://conveyancing-portal-backend.vercel.app/api/smokeball/authorize
   ```

3. **Log in to Smokeball**

4. **You should be redirected to:**
   ```
   https://conveyancing-portal-backend.vercel.app/api/smokeball/oauth-callback
   ```
   (NOT localhost!)

5. **Success response should appear:**
   ```json
   {
     "success": true,
     "message": "Smokeball integration authenticated successfully",
     ...
   }
   ```

---

## 📋 Quick Checklist

### In Vercel Dashboard:
- [ ] Update `SMOKEBALL_REDIRECT_URI` to Vercel URL
- [ ] Delete or update `CORS_ORIGIN` (or delete it entirely)
- [ ] Update `FRONTEND_URL` to Vercel frontend URL
- [ ] Save changes
- [ ] Redeploy backend

### In Smokeball Developer Portal:
- [ ] Add Vercel redirect URI to OAuth app
- [ ] Keep localhost redirect URI (for dev)
- [ ] Save

### Test:
- [ ] Visit `/api/smokeball/authorize` on Vercel
- [ ] Log in to Smokeball
- [ ] Redirected to Vercel (not localhost)
- [ ] See success message
- [ ] Visit `/api/smokeball/status` shows authenticated

---

## 🎯 After This Fix

Once environment variables are updated and you complete OAuth:

### Then Register Webhook:
```
https://conveyancing-portal-backend.vercel.app/api/smokeball/webhook/register
```

### Then You're Done! ✅
- ✅ OAuth working on Vercel
- ✅ CORS working for your frontend
- ✅ Webhook registered with Smokeball
- ✅ Full integration live!

---

## 💡 Pro Tip: Environment-Specific Variables

You can set different values for Production vs Preview vs Development:

**Example:**
- **Production:** `SMOKEBALL_REDIRECT_URI` = Vercel URL
- **Preview:** `SMOKEBALL_REDIRECT_URI` = Vercel preview URL
- **Development:** `SMOKEBALL_REDIRECT_URI` = localhost URL

But for simplicity, just set **all environments** to the Vercel production URL.

---

## 🚨 Common Mistakes to Avoid

❌ **Don't forget the `https://`** - Smokeball requires HTTPS  
❌ **Don't add trailing slash** - Use `/oauth-callback` not `/oauth-callback/`  
❌ **Don't skip redeployment** - Changes require redeploy to take effect  
❌ **Don't forget Smokeball developer portal** - Must whitelist URL there too

---

## 📞 Need Help?

**Can't find Smokeball Developer Portal?**
- Check your Smokeball account settings
- Email support@smokeball.com.au
- They can add the redirect URI for you

**Deployment not working?**
- Check Vercel deployment logs
- Look for environment variable errors
- Verify all required vars are set

---

## ✅ Once Fixed

You'll be able to:
1. ✅ Complete OAuth on Vercel production
2. ✅ Register webhook with Smokeball
3. ✅ Frontend can call backend (no CORS errors)
4. ✅ Full integration working on Vercel!

**Total time:** ~10 minutes

**Let me know once you've updated the Vercel environment variables and I'll help you test!** 🚀

