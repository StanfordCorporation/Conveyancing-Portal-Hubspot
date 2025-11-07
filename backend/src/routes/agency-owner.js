/**
 * Agency Owner Routes
 * Routes for agency owner/admin features
 * - Permission management (promote/demote agents)
 * - Agency-wide dashboard
 * - Deal reassignment
 * Protected by agentAuth and permission middleware
 */

import express from 'express';
import { agentAuth } from '../middleware/agentAuth.js';
import { requireAdmin, requireViewAll, requireAgency } from '../middleware/permissions.js';
import * as agencyOwnerService from '../services/domain/agency-owner.js';

const router = express.Router();

// All routes require agent authentication
router.use(agentAuth);

/**
 * GET /api/agency-owner/dashboard
 * Get complete agency dashboard
 * Permission: View All or Admin
 */
router.get('/dashboard', requireViewAll, requireAgency, async (req, res) => {
  try {
    const { id: userId, agencyId } = req.user;

    console.log(`[Agency Owner Routes] Dashboard requested by user ${userId} for agency ${agencyId}`);

    const data = await agencyOwnerService.getAgencyDashboardData(userId, agencyId);

    return res.json({
      success: true,
      ...data
    });
  } catch (error) {
    console.error('[Agency Owner Routes] Dashboard error:', error);
    return res.status(500).json({
      error: 'Server Error',
      message: error.message
    });
  }
});

/**
 * GET /api/agency-owner/agents
 * Get all agents with permission levels
 * Permission: View All or Admin
 */
router.get('/agents', requireViewAll, requireAgency, async (req, res) => {
  try {
    const { agencyId } = req.user;

    console.log(`[Agency Owner Routes] Agents list requested for agency ${agencyId}`);

    const agents = await agencyOwnerService.getAgentsWithPermissions(agencyId);

    return res.json({
      success: true,
      count: agents.length,
      agents
    });
  } catch (error) {
    console.error('[Agency Owner Routes] Get agents error:', error);
    return res.status(500).json({
      error: 'Server Error',
      message: error.message
    });
  }
});

/**
 * POST /api/agency-owner/agents/:agentId/promote
 * Promote agent to Admin
 * Permission: Admin only
 */
router.post('/agents/:agentId/promote', requireAdmin, requireAgency, async (req, res) => {
  try {
    const { id: adminId, agencyId } = req.user;
    const { agentId } = req.params;

    console.log(`[Agency Owner Routes] Promote agent ${agentId} requested by admin ${adminId}`);

    const result = await agencyOwnerService.promoteAgentToAdmin(adminId, agencyId, agentId);

    return res.json({
      success: true,
      message: result.alreadyAdmin
        ? 'Agent already has Admin privileges'
        : 'Agent promoted to Admin successfully'
    });
  } catch (error) {
    console.error('[Agency Owner Routes] Promote error:', error);
    return res.status(500).json({
      error: 'Server Error',
      message: error.message
    });
  }
});

/**
 * POST /api/agency-owner/agents/:agentId/demote
 * Demote agent to View All or Standard
 * Permission: Admin only
 * Body: { permissionLevel: "view_all" | "standard" }
 */
router.post('/agents/:agentId/demote', requireAdmin, requireAgency, async (req, res) => {
  try {
    const { id: adminId, agencyId } = req.user;
    const { agentId } = req.params;
    const { permissionLevel } = req.body;

    if (!['view_all', 'standard'].includes(permissionLevel)) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'permissionLevel must be "view_all" or "standard"'
      });
    }

    console.log(`[Agency Owner Routes] Demote agent ${agentId} to ${permissionLevel} requested by admin ${adminId}`);

    const result = await agencyOwnerService.demoteAgent(adminId, agencyId, agentId, permissionLevel);

    return res.json({
      success: true,
      message: result.alreadyAtLevel
        ? `Agent already has ${permissionLevel} permission`
        : `Agent demoted to ${permissionLevel} successfully`
    });
  } catch (error) {
    console.error('[Agency Owner Routes] Demote error:', error);

    if (error.message.includes('last admin')) {
      return res.status(400).json({
        error: 'Business Rule Violation',
        message: error.message
      });
    }

    return res.status(500).json({
      error: 'Server Error',
      message: error.message
    });
  }
});

/**
 * PATCH /api/agency-owner/deals/:dealId/reassign
 * Reassign deal to different agent
 * Permission: Admin only
 * Body: { newAgentId: "contact_id" }
 */
router.patch('/deals/:dealId/reassign', requireAdmin, requireAgency, async (req, res) => {
  try {
    const { id: adminId, agencyId } = req.user;
    const { dealId } = req.params;
    const { newAgentId } = req.body;

    if (!newAgentId) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'newAgentId is required'
      });
    }

    console.log(`[Agency Owner Routes] Reassign deal ${dealId} to agent ${newAgentId} requested by admin ${adminId}`);

    const result = await agencyOwnerService.reassignDeal(adminId, agencyId, dealId, newAgentId);

    return res.json({
      success: true,
      message: 'Deal reassigned successfully',
      previousAgentId: result.previousAgentId
    });
  } catch (error) {
    console.error('[Agency Owner Routes] Reassign deal error:', error);
    return res.status(500).json({
      error: 'Server Error',
      message: error.message
    });
  }
});

export default router;
