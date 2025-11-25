# GitHub Actions Receipt Automation Setup Guide

This guide will help you set up GitHub Actions to run Smokeball receipt automation when bank transfer payments are confirmed.

---

## 📋 Prerequisites

- GitHub account with admin access to your repository
- Vercel backend already deployed
- Smokeball credentials (username, password, TOTP secret)

---

## 🚀 Setup Steps

### Step 1: Create GitHub Personal Access Token

1. Go to GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic)
   - Or visit: https://github.com/settings/tokens

2. Click **"Generate new token"** → **"Generate new token (classic)"**

3. Token settings:
   - **Note:** `Receipt Automation Workflow Trigger`
   - **Expiration:** `No expiration` (or 90 days for security)
   - **Scopes:** Check these boxes:
     - ✅ `repo` (Full control of private repositories)
     - ✅ `workflow` (Update GitHub Action workflows)

4. Click **"Generate token"**

5. **⚠️ IMPORTANT:** Copy the token immediately (starts with `ghp_`)
   - You won't be able to see it again!
   - Save it securely - you'll need it in Step 3

---

### Step 2: Add GitHub Secrets to Repository

1. Go to your GitHub repository
   - Example: `https://github.com/StanfordCorporation/Conveyancing-Portal-Hubspot`

2. Navigate to: **Settings** → **Secrets and variables** → **Actions**

3. Click **"New repository secret"** and add these three secrets:

   **Secret 1: `SMOKEBALL_USERNAME`**
   - Name: `SMOKEBALL_USERNAME`
   - Value: Your Smokeball login username
   - Click "Add secret"

   **Secret 2: `SMOKEBALL_PASSWORD`**
   - Name: `SMOKEBALL_PASSWORD`
   - Value: Your Smokeball login password
   - Click "Add secret"

   **Secret 3: `SMOKEBALL_TOTP_SECRET`**
   - Name: `SMOKEBALL_TOTP_SECRET`
   - Value: Your Smokeball TOTP/2FA secret key
   - Click "Add secret"

---

### Step 3: Add Environment Variables to Vercel

1. Go to your Vercel project dashboard
   - Example: `https://vercel.com/stanford-corporations-projects/conveyancing-portal-backend`

2. Navigate to: **Settings** → **Environment Variables**

3. Add these three variables:

   **Variable 1: `GITHUB_OWNER`**
   - Name: `GITHUB_OWNER`
   - Value: Your GitHub username or organization name
   - Example: `StanfordCorporation`
   - Environments: ✅ Production, ✅ Preview, ✅ Development

   **Variable 2: `GITHUB_REPO`**
   - Name: `GITHUB_REPO`
   - Value: Your repository name
   - Example: `Conveyancing-Portal-Hubspot`
   - Environments: ✅ Production, ✅ Preview, ✅ Development

   **Variable 3: `GITHUB_TOKEN`**
   - Name: `GITHUB_TOKEN`
   - Value: The Personal Access Token you created in Step 1 (starts with `ghp_`)
   - Environments: ✅ Production, ✅ Preview, ✅ Development

4. Click **"Save"** for each variable

---

### Step 4: Push Code to GitHub

1. Commit the new files to your repository:

```bash
cd backend
git add .github/workflows/receipt-automation.yml
git add src/services/github-actions-trigger.js
git add src/routes/webhook.js
git commit -m "feat: Add GitHub Actions receipt automation

- Created workflow for receipt automation via repository_dispatch
- Added GitHub Actions trigger service
- Updated webhook to support GitHub Actions
- Includes fallback to direct automation if GitHub Actions not configured"
git push
```

---

### Step 5: Redeploy Vercel Backend

After pushing to GitHub, redeploy your Vercel backend to pick up the new environment variables:

```bash
vercel --prod
```

Or redeploy from Vercel dashboard:
- Go to your deployment
- Click "Redeploy" → "Use existing Build Cache" → "Redeploy"

---

### Step 6: Enable GitHub Actions (if disabled)

1. Go to your repository → **Settings** → **Actions** → **General**

2. Under **"Actions permissions"**:
   - Select: ✅ **"Allow all actions and reusable workflows"**

3. Under **"Workflow permissions"**:
   - Select: ✅ **"Read and write permissions"**
   - Check: ✅ **"Allow GitHub Actions to create and approve pull requests"**

4. Click **"Save"**

---

## 🧪 Testing the Setup

### Test 1: Trigger from HubSpot

1. Go to HubSpot
2. Find a test deal with bank transfer payment
3. Change `payment_status` from "Pending" to "Paid"
4. Check GitHub Actions:
   - Go to your repository → **Actions** tab
   - You should see a new workflow run: "Smokeball Receipt Automation"
   - Click on it to view logs

### Test 2: Check Vercel Logs

```bash
vercel logs conveyancing-portal-backend-7bmgb9ndy.vercel.app --follow
```

Look for these log messages:
```
[HubSpot Webhook] 🚀 Using GitHub Actions for receipt automation
[GitHub Actions] ✅ Workflow triggered successfully
```

---

## 📊 Monitoring

### View GitHub Actions Runs

- **Actions Tab:** https://github.com/YOUR_ORG/YOUR_REPO/actions
- **Direct Link Format:** `https://github.com/{GITHUB_OWNER}/{GITHUB_REPO}/actions/workflows/receipt-automation.yml`

### Check Individual Run

1. Click on any workflow run to see details
2. Expand "Run Smokeball Receipt Automation" to see execution logs
3. If failed, download artifacts (screenshots) from the run summary

---

## 🔧 Troubleshooting

### Issue: "Workflow not triggering"

**Check:**
1. Verify `GITHUB_OWNER`, `GITHUB_REPO`, `GITHUB_TOKEN` are set in Vercel
2. Check Vercel logs for error messages
3. Verify GitHub token has `repo` and `workflow` scopes

**Fix:**
```bash
# Test GitHub API access
curl -H "Authorization: token YOUR_GITHUB_TOKEN" \
  https://api.github.com/repos/YOUR_OWNER/YOUR_REPO
```

---

### Issue: "Workflow fails immediately"

**Check:**
1. Verify GitHub Secrets are set correctly:
   - `SMOKEBALL_USERNAME`
   - `SMOKEBALL_PASSWORD`
   - `SMOKEBALL_TOTP_SECRET`

2. Check workflow logs in GitHub Actions tab

**Fix:** Update secrets in GitHub repository settings

---

### Issue: "Browser launch fails"

**This shouldn't happen with GitHub Actions** (unlike Vercel), but if it does:

**Check workflow logs for:**
```
❌ browserType.launch: Executable doesn't exist
```

**Fix:** The workflow includes `npx playwright install chromium --with-deps` which should install everything needed. If this fails, the Ubuntu environment may be misconfigured.

---

## 💰 Cost & Usage Limits

**GitHub Actions Free Tier:**
- ✅ 2,000 minutes/month for private repositories
- ✅ Unlimited for public repositories

**Typical usage:**
- Each receipt automation: ~2-3 minutes
- Monthly capacity: ~600-1000 receipts
- **Cost: $0/month** (on free tier)

**If you exceed limits:**
- Additional minutes: $0.008/minute ($0.48/hour)
- 100 receipts/month ≈ 300 minutes ≈ $2.40

---

## 🔄 Fallback to Direct Automation

The system automatically falls back to direct Vercel automation if GitHub Actions is not configured:

1. If `GITHUB_OWNER`, `GITHUB_REPO`, or `GITHUB_TOKEN` is not set
2. Vercel will run receipt automation directly (will fail due to browser limitations)
3. Logs will show: `[HubSpot Webhook] 🔧 Using direct automation (GitHub Actions not configured)`

**To disable GitHub Actions:**
- Remove the three environment variables from Vercel
- System will attempt direct automation (not recommended)

---

## ✅ Setup Complete!

Your GitHub Actions receipt automation is now configured. When a bank transfer payment is confirmed in HubSpot:

1. HubSpot webhook → Vercel
2. Vercel triggers GitHub Action
3. GitHub Action runs Playwright automation
4. Receipt created in Smokeball
5. Results logged in GitHub Actions tab

**Next steps:**
- Test with a real payment confirmation
- Monitor GitHub Actions runs
- Check Smokeball for created receipts
