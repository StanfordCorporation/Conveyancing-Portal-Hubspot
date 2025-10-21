# Quick Start - Run the Conveyancing Portal

## 🚀 Start Development Servers

### Terminal 1: Backend API
```bash
cd backend
npm install
npm run dev
```
✅ Backend API: http://localhost:3001

### Terminal 2: Frontend Client Portal
```bash
cd frontend/client-portal
npm install
npm run dev
```
✅ Client Portal: http://localhost:3000

---

## 🔑 First Time Setup

### 1. Configure HubSpot Token
Edit `backend/.env`:
```env
HUBSPOT_ACCESS_TOKEN=pat-na1-your-token-here
JWT_SECRET=your-secret-key-here
```

### 2. Create Test Contact in HubSpot
- Email: `test@example.com`
- First Name: `Test`
- Last Name: `User`
- Contact Type: `Client`

---

## 🧪 Test Login

1. **Open:** http://localhost:3000/login
2. **Enter:** test@example.com
3. **Click:** "Send Verification Code"
4. **Check Console** for OTP (development mode shows: `🔑 Development OTP: 123456`)
5. **Enter** the 6-digit OTP
6. **Click:** "Verify & Sign In"

---

## 📂 Access URLs

| URL | Description |
|-----|-------------|
| http://localhost:3000 | Main App |
| http://localhost:3000/login | Login Page |
| http://localhost:3001/api | Backend API |
| http://localhost:3001/api/auth/send-otp | Send OTP Endpoint |
| http://localhost:3001/api/auth/verify-otp | Verify OTP Endpoint |

---

## 🔧 Common Commands

### Install Dependencies
```bash
# Backend
cd backend && npm install

# Frontend
cd frontend/client-portal && npm install
```

### Run Development Servers
```bash
# Backend (Port 3001)
cd backend && npm run dev

# Frontend (Port 3000)
cd frontend/client-portal && npm run dev
```

### Build for Production
```bash
# Frontend
cd frontend/client-portal && npm run build

# Backend (Vercel)
cd backend && vercel --prod
```

---

## 🐛 Quick Troubleshooting

| Issue | Solution |
|-------|----------|
| "Contact not found" | Create contact in HubSpot with exact email |
| CORS errors | Check `CORS_ORIGIN=http://localhost:3000` in backend/.env |
| No OTP in development | Check backend terminal and browser console |
| JWT errors | Set `JWT_SECRET` in backend/.env |

---

## 📋 Development Checklist

- [ ] Node.js 18+ installed
- [ ] HubSpot access token obtained
- [ ] `backend/.env` configured
- [ ] Test contact created in HubSpot
- [ ] Dependencies installed (backend & frontend)
- [ ] Backend running on port 3001
- [ ] Frontend running on port 3000
- [ ] Login tested successfully

---

## 📚 Full Documentation

- **Complete Setup:** [SETUP-GUIDE.md](./SETUP-GUIDE.md)
- **Project Structure:** [README.md](./README.md)
- **Database Schema:** [Database Overview.md](./Database%20Overview.md)
- **API Endpoints:** [SETUP-GUIDE.md](./SETUP-GUIDE.md#-api-endpoints)

---

**🎉 You're Ready to Go!**

Your login page is now connected to HubSpot and fully functional.
