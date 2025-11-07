/**
 * Agent Authentication Middleware
 * JWT authentication specifically for agent routes
 * Verifies token and ensures contact_type is 'Agent'
 */

import jwt from 'jsonwebtoken';
import hubspotClient from '../integrations/hubspot/client.js';
import { HUBSPOT } from '../config/constants.js';

export const agentAuth = async (req, res, next) => {
  try {
    // Extract token from Authorization header
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      console.log('[Agent Auth] ⚠️ No token provided');
      return res.status(401).json({ error: 'No token provided' });
    }
    
    // Verify and decode JWT
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    const agentId = decoded.userId;
    
    console.log(`[Agent Auth] Verifying agent: ${agentId}`);
    
    // Verify agent exists and is type 'Agent'
    const agentResponse = await hubspotClient.get(
      `/crm/v3/objects/contacts/${agentId}?properties=contact_type,email,firstname,lastname`
    );
    
    // Handle multiple contact types separated by semicolon (e.g., "Client;Agent")
    const contactTypes = agentResponse.data.properties.contact_type || '';
    const isAgent = contactTypes.includes('Agent');
    
    if (!isAgent) {
      console.log(`[Agent Auth] ❌ Contact ${agentId} is not an agent (contact_type: ${contactTypes})`);
      return res.status(403).json({ error: 'Not an agent' });
    }
    
    console.log(`[Agent Auth] ✅ Agent verified: ${agentResponse.data.properties.email}`);

    // Get agent's company association to determine agency and permission level
    let agencyId = null;
    let permissionLevel = 'standard'; // Default to standard

    try {
      // Step 1: Get company associations (v3 endpoint for basic company association)
      const companyAssocResponse = await hubspotClient.get(
        `/crm/v3/objects/contacts/${agentId}/associations/companies`
      );

      agencyId = companyAssocResponse.data.results[0]?.id || null;

      // Step 2: Get association types (v4 endpoint for permission level)
      if (agencyId) {
        const associationTypesResponse = await hubspotClient.get(
          `/crm/v4/objects/contacts/${agentId}/associations/companies`
        );

        // Find the association for this specific company
        const companyAssoc = associationTypesResponse.data.results.find(
          r => r.toObjectId === agencyId
        );
        const types = companyAssoc?.associationTypes || [];

        // Determine permission level based on association type
        // Priority: Admin (7) > View All (9) > Standard (279)
        if (types.some(t => t.typeId === HUBSPOT.PERMISSION_TYPES.ADMIN)) {
          permissionLevel = 'admin';
        } else if (types.some(t => t.typeId === HUBSPOT.PERMISSION_TYPES.VIEW_ALL)) {
          permissionLevel = 'view_all';
        } else {
          permissionLevel = 'standard';
        }

        console.log(`[Agent Auth] Permission level: ${permissionLevel} for agency ${agencyId}`);
      } else {
        console.log('[Agent Auth] ⚠️ Agent has no agency association');
      }
    } catch (error) {
      console.warn('[Agent Auth] Could not fetch association types:', error.message);
      // Default to 'standard' if fetch fails - don't block authentication
    }

    // Add user info to request
    req.user = {
      id: agentId,
      email: agentResponse.data.properties.email,
      role: 'agent',
      permissionLevel: permissionLevel,  // NEW: admin | view_all | standard
      agencyId: agencyId                  // NEW: agency company ID
    };

    next();
  } catch (error) {
    console.error('[Agent Auth] ❌ Authentication failed:', error.message);
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token has expired' });
    }
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Invalid token' });
    }
    
    // HubSpot API error
    if (error.response?.status === 404) {
      return res.status(404).json({ error: 'Agent not found' });
    }
    
    return res.status(401).json({ error: 'Invalid token' });
  }
};

export default agentAuth;

