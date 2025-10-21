import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Request logging middleware
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`\n${'='.repeat(80)}`);
  console.log(`[${timestamp}] ${req.method} ${req.path}`);
  console.log(`[Request] IP: ${req.ip}`);

  if (Object.keys(req.query).length > 0) {
    console.log(`[Request] Query:`, req.query);
  }

  if (req.body && Object.keys(req.body).length > 0) {
    console.log(`[Request] Body:`, JSON.stringify(req.body, null, 2));
  }

  // Log response
  const originalSend = res.send;
  res.send = function(data) {
    console.log(`[Response] Status: ${res.statusCode}`);
    if (res.statusCode >= 400) {
      console.log(`[Response] Error:`, data);
    } else {
      console.log(`[Response] Success: ${res.statusCode}`);
    }
    console.log(`${'='.repeat(80)}\n`);
    originalSend.call(this, data);
  };

  next();
});

// Middleware
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true
}));
app.use(express.json());

// Import route handlers
import sendOtpHandler from './api/auth/send-otp.js';
import verifyOtpHandler from './api/auth/verify-otp.js';
import agentSendOtpHandler from './api/auth/agent/send-otp.js';
import agentVerifyOtpHandler from './api/auth/agent/verify-otp.js';
import clientDisclosureHandler from './api/workflows/client-disclosure.js';
import agentClientCreationHandler from './api/workflows/agent-client-creation.js';
import propertyIntakeHandler from './api/workflows/property-intake.js';
import searchAgenciesHandler from './api/agencies/search-agencies.js';
import createAgencyHandler from './api/agencies/create-agency.js';
import getAgentsHandler from './api/agencies/get-agents.js';
import createAgentHandler from './api/agencies/create-agent.js';
import searchAgentHandler from './api/agencies/search-agent.js';

// Auth Routes - Client Portal
app.post('/api/auth/send-otp', async (req, res) => {
  await sendOtpHandler(req, res);
});

app.post('/api/auth/verify-otp', async (req, res) => {
  await verifyOtpHandler(req, res);
});

// Auth Routes - Agent Portal
app.post('/api/auth/agent/send-otp', async (req, res) => {
  await agentSendOtpHandler(req, res);
});

app.post('/api/auth/agent/verify-otp', async (req, res) => {
  await agentVerifyOtpHandler(req, res);
});

// Workflow Routes
app.post('/api/workflows/client-disclosure', async (req, res) => {
  await clientDisclosureHandler(req, res);
});

app.post('/api/workflows/agent-client-creation', async (req, res) => {
  await agentClientCreationHandler(req, res);
});

app.post('/api/workflows/property-intake', async (req, res) => {
  await propertyIntakeHandler(req, res);
});

// Agencies Routes
app.post('/api/agencies/search', async (req, res) => {
  await searchAgenciesHandler(req, res);
});

app.post('/api/agencies/create', async (req, res) => {
  await createAgencyHandler(req, res);
});

app.get('/api/agencies/:agencyId/agents', async (req, res) => {
  await getAgentsHandler(req, res);
});

app.post('/api/agencies/:agencyId/agents/create', async (req, res) => {
  await createAgentHandler(req, res);
});

app.post('/api/agencies/search-agent', async (req, res) => {
  await searchAgentHandler(req, res);
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Conveyancing Portal API is running' });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'Conveyancing Portal API',
    version: '1.0.0',
    endpoints: {
      health: 'GET /api/health',
      auth: {
        client: {
          sendOtp: 'POST /api/auth/send-otp',
          verifyOtp: 'POST /api/auth/verify-otp'
        },
        agent: {
          sendOtp: 'POST /api/auth/agent/send-otp',
          verifyOtp: 'POST /api/auth/agent/verify-otp'
        }
      },
      workflows: {
        clientDisclosure: 'POST /api/workflows/client-disclosure',
        agentClientCreation: 'POST /api/workflows/agent-client-creation',
        propertyIntake: 'POST /api/workflows/property-intake'
      }
    }
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Backend API running on http://localhost:${PORT}`);
  console.log(`📡 CORS enabled for: ${process.env.CORS_ORIGIN || 'http://localhost:3000'}`);
  console.log(`🔐 HubSpot configured: ${!!process.env.HUBSPOT_ACCESS_TOKEN}`);
  console.log(`📱 Aircall configured: ${!!process.env.AIRCALL_API_ID}`);
});
