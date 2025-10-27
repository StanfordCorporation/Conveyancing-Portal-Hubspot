/**
 * Express Server Entry Point
 * Routes configured using new src/ structure
 */

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

// Middleware
import requestLogger from './middleware/logging.js';
import errorHandler from './middleware/errorHandler.js';
import { authenticateJWT, authorizeRole } from './middleware/auth.js';

// Routes
import * as authRoutes from './routes/auth.js';
import * as agenciesRoutes from './routes/agencies.js';
import * as workflowsRoutes from './routes/workflows.js';
import clientRoutes from './routes/client.js';
import * as questionnaireRoutes from './routes/questionnaire-simplified.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// ============================================================================
// MIDDLEWARE
// ============================================================================

// CORS - MUST be first before logging to handle preflight
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Request logging
app.use(requestLogger);

// Body parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ============================================================================
// PUBLIC ROUTES (No Authentication)
// ============================================================================

/**
 * Auth Routes - Unified OTP for client and agent
 * Query param: type=client|agent (default: client)
 */
app.post('/api/auth/send-otp', authRoutes.sendOTP);
app.post('/api/auth/verify-otp', authRoutes.verifyOTP);

// Legacy routes (for backward compatibility during transition)
app.post('/api/auth/agent/send-otp', async (req, res) => {
  req.query.type = 'agent';
  authRoutes.sendOTP(req, res);
});

app.post('/api/auth/agent/verify-otp', async (req, res) => {
  req.query.type = 'agent';
  authRoutes.verifyOTP(req, res);
});

/**
 * Agencies Routes
 */
app.post('/api/agencies/search', agenciesRoutes.searchAgencies);
app.post('/api/agencies/create', agenciesRoutes.createAgency);
app.get('/api/agencies/:agencyId/agents', agenciesRoutes.getAgents);
app.post('/api/agencies/:agencyId/agents/create', agenciesRoutes.createAgent);
app.post('/api/agencies/search-agent', agenciesRoutes.searchAgent);

/**
 * Workflow Routes
 */
app.post('/api/workflows/agent-client-creation', workflowsRoutes.agentClientCreation);
app.post('/api/workflows/client-disclosure', workflowsRoutes.clientDisclosure);
app.post('/api/workflows/property-intake', workflowsRoutes.propertyIntake);

/**
 * Property Questionnaire Routes (HubSpot v3 API Pattern)
 * Public - accessible to all
 */
app.get('/crm/v3/objects/property-questionnaire', questionnaireRoutes.getPropertyQuestionnaire);
app.patch('/crm/v3/objects/property-questionnaire/:dealId', questionnaireRoutes.updatePropertyQuestionnaire);
app.post('/crm/v3/objects/property-questionnaire/:dealId/files/upload', questionnaireRoutes.uploadPropertyQuestionnaireFile);

/**
 * Client Portal Routes (Protected)
 */
app.use('/api/client', clientRoutes);

// ============================================================================
// HEALTH CHECK & INFO ROUTES
// ============================================================================

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    message: 'Conveyancing Portal API is running',
    timestamp: new Date().toISOString()
  });
});

app.get('/', (req, res) => {
  res.json({
    message: 'Conveyancing Portal API',
    version: '2.0.0',
    structure: 'src/ (SOLID principles)',
    endpoints: {
      health: 'GET /api/health',
      auth: {
        unified: {
          sendOtp: 'POST /api/auth/send-otp?type=client|agent',
          verifyOtp: 'POST /api/auth/verify-otp?type=client|agent'
        },
        legacy: {
          clientSendOtp: 'POST /api/auth/send-otp',
          clientVerifyOtp: 'POST /api/auth/verify-otp',
          agentSendOtp: 'POST /api/auth/agent/send-otp',
          agentVerifyOtp: 'POST /api/auth/agent/verify-otp'
        }
      },
      agencies: {
        search: 'POST /api/agencies/search',
        create: 'POST /api/agencies/create',
        getAgents: 'GET /api/agencies/:agencyId/agents',
        createAgent: 'POST /api/agencies/:agencyId/agents/create',
        searchAgent: 'POST /api/agencies/search-agent'
      },
      workflows: {
        clientDisclosure: 'POST /api/workflows/client-disclosure',
        agentClientCreation: 'POST /api/workflows/agent-client-creation',
        propertyIntake: 'POST /api/workflows/property-intake'
      },
      propertyQuestionnaire: {
        description: 'Property intake questionnaire (HubSpot v3 API pattern)',
        getAll: 'GET /crm/v3/objects/property-questionnaire',
        update: 'PATCH /crm/v3/objects/property-questionnaire/{dealId}',
        uploadFile: 'POST /crm/v3/objects/property-questionnaire/{dealId}/files/upload'
      }
    }
  });
});

// ============================================================================
// ERROR HANDLING
// ============================================================================

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Endpoint ${req.method} ${req.path} does not exist`
  });
});

// Global error handler (must be last)
app.use(errorHandler);

// ============================================================================
// SERVER START
// ============================================================================

app.listen(PORT, () => {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`🚀 Backend API running on http://localhost:${PORT}`);
  console.log(`📁 Structure: src/ (SOLID principles, clean architecture)`);
  console.log(`🔗 CORS enabled for: ${process.env.CORS_ORIGIN || 'http://localhost:3000'}`);
  console.log(`🔐 HubSpot configured: ${!!process.env.HUBSPOT_ACCESS_TOKEN}`);
  console.log(`📱 Aircall configured: ${!!process.env.AIRCALL_API_ID}`);
  console.log(`${'='.repeat(80)}\n`);
});

export default app;
