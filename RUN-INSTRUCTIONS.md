# 🚀 How to Run the Conveyancing Portal

## Quick Fix Applied

I've fixed both issues:
1. ✅ Backend now uses Express instead of Vercel CLI
2. ✅ Frontend routing fixed for Vite

---

## Step-by-Step Instructions

### 1. Backend Setup

```bash
# Open Terminal 1
cd backend

# Install dependencies (if not done)
npm install

# Run the server
npm run dev
```

**Expected Output:**
```
🚀 Backend API running on http://localhost:3001
📡 CORS enabled for: http://localhost:3000
🔐 HubSpot configured: false
📱 Aircall configured: true
```

✅ Backend running at: **http://localhost:3001**

---

### 2. Frontend Setup

```bash
# Open Terminal 2 (new terminal)
cd frontend/client-portal

# Install dependencies (if not done)
npm install

# Run the frontend
npm run dev
```

**Expected Output:**
```
VITE v5.4.20  ready in 213 ms

➜  Local:   http://localhost:3000/
```

✅ Frontend running at: **http://localhost:3000**

---

### 3. Access the Login Page

Open your browser and go to:
```
http://localhost:3000/login
```

You should see the beautiful login page!

---

## Test the Login (Development Mode)

### Option 1: Email OTP (Console Mode)

1. Click "Email" tab
2. Enter: `test@example.com`
3. Click "Send Verification Code"
4. Check **Backend Terminal** for OTP
5. You'll see: `🔑 Development OTP: 123456`
6. Enter the OTP and verify

### Option 2: Mobile OTP (Aircall SMS)

1. Click "Mobile" tab
2. Enter: `0412 345 678`
3. Click "Send Verification Code"
4. **SMS will be sent via Aircall!**
5. Check your phone for the OTP
6. Enter OTP and verify

---

## Important Notes

### Backend Configuration

**File:** `backend/.env`

```env
# HubSpot (REQUIRED - Add your token)
HUBSPOT_ACCESS_TOKEN=your_token_here

# Aircall (ALREADY CONFIGURED ✅)
AIRCALL_API_ID=35e9a8a3e5ed402e628598a30200e36f
AIRCALL_TOKEN=5b8eda50f7ec7cc267cc3dc3b81ac69e
AIRCALL_FROM_NUMBER=+61483980010
AIRCALL_LINE_ID=846163

# JWT (REQUIRED - Generate a secret)
JWT_SECRET=your_random_secret_key_here

# API
NODE_ENV=development
PORT=3001
CORS_ORIGIN=http://localhost:3000
```

**Action Required:**
1. Add your **HubSpot Access Token**
2. Generate a **JWT Secret** (random string)

---

## Troubleshooting

### Backend Issues

**Error: "Module not found"**
```bash
cd backend
npm install
npm run dev
```

**Port 3001 already in use:**
```bash
# Windows
netstat -ano | findstr :3001
taskkill /PID <PID> /F

# Or change PORT in .env
PORT=3002
```

### Frontend Issues

**404 on /login**
- Make sure you go to `http://localhost:3000/login` (not just `http://localhost:3000`)
- The root `/` redirects to `/login`

**Blank page:**
```bash
cd frontend/client-portal
rm -rf node_modules
npm install
npm run dev
```

**CJS Deprecation Warning (ignore it):**
```
The CJS build of Vite's Node API is deprecated...
```
This is just a warning, everything works fine!

---

## Testing API Endpoints

### Test Backend Health
```bash
curl http://localhost:3001/api/health
```

**Expected:**
```json
{
  "status": "ok",
  "message": "Conveyancing Portal API is running"
}
```

### Test Send OTP
```bash
curl -X POST http://localhost:3001/api/auth/send-otp \
  -H "Content-Type: application/json" \
  -d '{"identifier":"test@example.com","method":"email"}'
```

---

## Files Modified

1. ✅ `backend/server.js` - Created Express server
2. ✅ `backend/package.json` - Updated dev script to use nodemon
3. ✅ `frontend/client-portal/index.html` - Created Vite entry point
4. ✅ `frontend/client-portal/src/index.js` - Fixed root div ID

---

## Next Steps

1. **Add HubSpot Token** to `backend/.env`
2. **Generate JWT Secret** and add to `backend/.env`
3. **Create Test Contact** in HubSpot
4. **Test the login flow** at http://localhost:3000/login

---

## Success Checklist

- [ ] Backend running on port 3001
- [ ] Frontend running on port 3000
- [ ] Can access http://localhost:3000/login
- [ ] Login page loads correctly
- [ ] Can send OTP (check backend console)
- [ ] Can verify OTP

---

**You're all set! 🎉**

Go to **http://localhost:3000/login** and test the login!
