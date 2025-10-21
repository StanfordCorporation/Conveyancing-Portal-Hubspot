# Setup Guide - Conveyancing Portal with HubSpot Integration

Complete guide to set up and run the Conveyancing Portal with HubSpot authentication.

## 📋 Prerequisites

- Node.js 18+ and npm
- HubSpot account with API access
- Git (optional, for version control)

---

## 🚀 Quick Start

### 1. Install Dependencies

#### Frontend - Client Portal
```bash
cd frontend/client-portal
npm install
```

#### Backend - Serverless API
```bash
cd backend
npm install
```

---

## ⚙️ Configuration

### 1. HubSpot Setup

#### Get HubSpot Access Token
1. Go to [HubSpot Developer Portal](https://developers.hubspot.com/)
2. Navigate to **Apps** → Create new app
3. Generate **Private App Access Token**
4. Copy the access token (starts with `pat-...`)

#### Create Custom Properties in HubSpot

Go to **Settings** → **Properties** and create these custom properties:

**For Contacts:**
- `contact_type` (Single-line text) - Values: "Client" or "Agent"

**For Deals:**
- All properties listed in [Database Overview.md](./Database%20Overview.md) Section 1-5

### 2. Environment Variables

#### Backend Configuration

Edit `backend/.env`:

```env
# HubSpot Configuration (REQUIRED)
HUBSPOT_ACCESS_TOKEN=pat-na1-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
HUBSPOT_API_BASE=https://api.hubapi.com
HUBSPOT_PORTAL_ID=12345678

# JWT Authentication (REQUIRED)
JWT_SECRET=your-super-secret-random-string-here
JWT_EXPIRY=7d

# API Configuration (REQUIRED)
NODE_ENV=development
PORT=3001
CORS_ORIGIN=http://localhost:3000

# Email/SMS (Optional - for production OTP sending)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password
```

**⚠️ Important:**
- Replace `HUBSPOT_ACCESS_TOKEN` with your actual token
- Generate a strong `JWT_SECRET` (use: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`)

#### Frontend Configuration

The file `frontend/client-portal/.env` is already created with:

```env
VITE_API_BASE_URL=http://localhost:3001/api
VITE_WORDPRESS_URL=http://localhost
VITE_ENV=development
```

---

## 🏃 Running the Application

### Option 1: Development Mode (Recommended)

#### Step 1: Start Backend
```bash
cd backend
npm run dev
```

✅ Backend running at: `http://localhost:3001`

#### Step 2: Start Frontend (in new terminal)
```bash
cd frontend/client-portal
npm run dev
```

✅ Frontend running at: `http://localhost:3000`

### Option 2: Using Vercel CLI for Backend

```bash
cd backend
npm install -g vercel
vercel dev
```

---

## 🔐 Testing the Login Flow

### Step 1: Create a Test Contact in HubSpot

1. Go to HubSpot → **Contacts**
2. Click **Create Contact**
3. Fill in:
   - **Email**: `test@example.com`
   - **First Name**: `Test`
   - **Last Name**: `User`
   - **Contact Type**: `Client`
4. Save the contact

### Step 2: Test Login

1. Open browser: `http://localhost:3000/login`
2. Enter email: `test@example.com`
3. Click **"Send Verification Code"**
4. Check console for OTP (in development mode)
5. Enter the 6-digit OTP
6. Click **"Verify & Sign In"**

**Development Mode:** OTP is logged to browser console and backend terminal:
```
🔑 Development OTP: 123456
```

---

## 📁 Project URLs

| Service | URL | Purpose |
|---------|-----|---------|
| Client Portal | `http://localhost:3000` | Main application |
| Login Page | `http://localhost:3000/login` | Authentication |
| Backend API | `http://localhost:3001/api` | API endpoints |
| Send OTP | `http://localhost:3001/api/auth/send-otp` | OTP generation |
| Verify OTP | `http://localhost:3001/api/auth/verify-otp` | OTP verification |

---

## 🔧 API Endpoints

### Authentication

#### Send OTP
```bash
POST http://localhost:3001/api/auth/send-otp

Body:
{
  "identifier": "test@example.com",
  "method": "email"
}

Response:
{
  "success": true,
  "message": "OTP sent to test@example.com",
  "otp": "123456"  // Only in development
}
```

#### Verify OTP
```bash
POST http://localhost:3001/api/auth/verify-otp

Body:
{
  "identifier": "test@example.com",
  "otp": "123456",
  "method": "email"
}

Response:
{
  "success": true,
  "message": "Login successful",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "12345",
    "email": "test@example.com",
    "firstname": "Test",
    "lastname": "User",
    "contactType": "Client"
  }
}
```

### HubSpot Operations

#### Create Contact
```bash
POST http://localhost:3001/api/contacts/create

Body:
{
  "email": "newuser@example.com",
  "firstname": "New",
  "lastname": "User",
  "phone": "0412345678",
  "contact_type": "Client"
}
```

#### Create Deal
```bash
POST http://localhost:3001/api/deals/create

Body:
{
  "dealname": "Test Property Sale",
  "dealstage": "client_details_required",
  "property_address": "123 Test St, Sydney NSW 2000",
  "number_of_owners": 1
}
```

#### Create Company (Agency)
```bash
POST http://localhost:3001/api/companies/create

Body:
{
  "name": "Test Real Estate Agency",
  "email": "agency@example.com",
  "phone": "0298765432",
  "address": "456 Agency St, Sydney NSW 2000"
}
```

---

## 🧪 Testing with Postman/cURL

### Test Send OTP
```bash
curl -X POST http://localhost:3001/api/auth/send-otp \
  -H "Content-Type: application/json" \
  -d '{"identifier":"test@example.com","method":"email"}'
```

### Test Verify OTP
```bash
curl -X POST http://localhost:3001/api/auth/verify-otp \
  -H "Content-Type: application/json" \
  -d '{"identifier":"test@example.com","otp":"123456","method":"email"}'
```

### Test HubSpot Contact Search
```bash
curl -X GET "http://localhost:3001/api/contacts/search?email=test@example.com" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

## 🐛 Troubleshooting

### Issue: "Contact not found" error

**Solution:**
1. Verify contact exists in HubSpot with the exact email
2. Check HubSpot access token is correct
3. Ensure contact has `contact_type` property set

### Issue: CORS errors

**Solution:**
Update `backend/.env`:
```env
CORS_ORIGIN=http://localhost:3000
```

Restart backend server.

### Issue: OTP not working

**Solution:**
1. Check backend terminal for OTP (development mode)
2. Check browser console for OTP
3. Verify OTP is 6 digits and hasn't expired (5 min expiry)

### Issue: JWT token errors

**Solution:**
1. Ensure `JWT_SECRET` is set in backend/.env
2. Clear localStorage in browser (F12 → Application → Local Storage)
3. Login again

### Issue: HubSpot API errors

**Solution:**
1. Verify access token permissions (Contacts, Deals, Companies - Read/Write)
2. Check rate limits (10 requests/second)
3. View backend logs for detailed error messages

---

## 📊 Development Console Logs

### Backend Logs
```
[HubSpot] GET /crm/v3/objects/contacts/test@example.com
[OTP Email] Sending OTP 123456 to test@example.com
[Send OTP] Success: { success: true, otp: '123456' }
```

### Frontend Logs (Browser Console)
```
OTP sent successfully: { success: true, otp: '123456' }
🔑 Development OTP: 123456
Login successful: { token: 'eyJ...', user: {...} }
```

---

## 🏗️ Build for Production

### Frontend
```bash
cd frontend/client-portal
npm run build
```

Output: `frontend/client-portal/build/`

### Backend (Vercel)
```bash
cd backend
vercel --prod
```

---

## 📝 Next Steps

### 1. Create Dashboard Component
```bash
cd frontend/client-portal/src/components/dashboard
# Create ClientDashboard.jsx
```

### 2. Add to App.jsx
```javascript
import ClientDashboard from './components/dashboard/ClientDashboard';

// Add route
<Route path="/dashboard" element={<ClientDashboard />} />
```

### 3. Implement 5-Section Disclosure Forms
- Section 1: Title Details & Encumbrances
- Section 2: Rental Agreement/Tenancy
- Section 3: Land Use, Planning & Environment
- Section 4: Buildings & Structures
- Section 5: Rates & Services

### 4. Add File Upload Functionality
- Integrate with HubSpot File Manager
- Support PDF, JPG, PNG uploads

---

## 🔗 Useful Links

- [HubSpot API Documentation](https://developers.hubspot.com/docs/api/overview)
- [HubSpot CRM API](https://developers.hubspot.com/docs/api/crm/understanding-the-crm)
- [Vite Documentation](https://vitejs.dev/)
- [React Router](https://reactrouter.com/)
- [Vercel Documentation](https://vercel.com/docs)

---

## 📧 Support

For issues or questions:
- Check [Database Overview.md](./Database%20Overview.md) for HubSpot schema
- Review [README.md](./README.md) for project structure
- Check [PROJECT-STRUCTURE.md](./PROJECT-STRUCTURE.md) for file locations

---

## ✅ Verification Checklist

- [ ] HubSpot access token configured
- [ ] Backend .env file updated
- [ ] Frontend .env file verified
- [ ] Test contact created in HubSpot
- [ ] Backend running on port 3001
- [ ] Frontend running on port 3000
- [ ] Login flow tested successfully
- [ ] OTP received and verified
- [ ] JWT token stored in localStorage
- [ ] Dashboard redirect working

---

**🎉 Your Conveyancing Portal is now connected to HubSpot!**

The login page at `http://localhost:3000/login` is fully functional and integrated with:
- ✅ HubSpot Contact lookup
- ✅ OTP generation and verification
- ✅ JWT authentication
- ✅ User session management
