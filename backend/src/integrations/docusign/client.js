/**
 * DocuSign Integration - Embedded Signing
 *
 * Handles creating envelopes and generating embedded signing URLs
 * Based on DocuSign Example 044: Focused View
 */

import docusign from 'docusign-esign';
import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';
import docusignConfig from '../../config/docusign.js';
import { getAccessToken, getAuthenticatedClient } from './jwtAuth.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Get DocuSign API Client with access token
 * 
 * @param {string} accessToken - DocuSign access token
 * @returns {docusign.ApiClient}
 */
export function getDocuSignClient(accessToken) {
  const dsApiClient = new docusign.ApiClient();
  dsApiClient.setBasePath(docusignConfig.basePath);
  dsApiClient.addDefaultHeader('Authorization', 'Bearer ' + accessToken);
  return dsApiClient;
}

/**
 * Get DocuSign API Client with JWT authentication (automatic token generation)
 * This is the preferred method - no need to manually provide access token
 * 
 * @param {boolean} forceRefresh - Force token refresh
 * @returns {Promise<docusign.ApiClient>}
 */
export async function getDocuSignClientJWT(forceRefresh = false) {
  return await getAuthenticatedClient(forceRefresh);
}

/**
 * Create envelope with document or template and return embedded signing URL
 *
 * Supports two modes:
 * 1. Single signer (legacy): Pass signerEmail, signerName, signerClientId
 * 2. Multiple signers (new): Pass signers array with routing order
 *
 * @param {Object} params
 * @param {string} [params.accessToken] - DocuSign access token (optional - will use JWT if not provided)
 * @param {string} [params.signerEmail] - Single signer's email (legacy mode)
 * @param {string} [params.signerName] - Single signer's full name (legacy mode)
 * @param {string} [params.signerClientId] - Single signer's unique client ID (legacy mode)
 * @param {Array} [params.signers] - Array of signers with routing order (new mode)
 *   @param {string} params.signers[].email - Signer's email
 *   @param {string} params.signers[].name - Signer's full name
 *   @param {string} params.signers[].clientUserId - Unique client ID (use contactId)
 *   @param {string} params.signers[].roleName - Template role name (e.g., "Client 1", "Client 2")
 *   @param {number} params.signers[].routingOrder - Signing order (1, 2, 3, etc.)
 * @param {string} [params.templateId] - DocuSign template ID (preferred)
 * @param {string} [params.documentPath] - Path to PDF document (alternative to template)
 * @param {string} params.documentName - Display name for document
 * @param {string} params.emailSubject - Email subject line
 * @param {boolean} [params.useJWT] - Use JWT authentication (default: true if no accessToken provided)
 * @returns {Promise<{envelopeId: string, redirectUrl: string}>}
 */
export async function createEmbeddedSigningSession(params) {
  const {
    accessToken,
    signerEmail,
    signerName,
    signerClientId,
    signers, // New: array of signers with routing order
    templateId,
    documentPath,
    documentName = 'Property Disclosure Form',
    emailSubject = 'Please sign this document',
    useJWT = !accessToken
  } = params;

  // Log appropriate message based on single vs multi-signer
  if (signers && signers.length > 0) {
    console.log(`[DocuSign] Creating embedded signing session for ${signers.length} signer(s)`);
  } else {
    console.log(`[DocuSign] Creating embedded signing session for ${signerEmail}`);
  }
  console.log(`[DocuSign] Using JWT: ${useJWT}`);

  try {
    // Initialize API client (use JWT if no access token provided)
    let dsApiClient;
    if (useJWT) {
      console.log(`[DocuSign] Authenticating with JWT...`);
      dsApiClient = await getDocuSignClientJWT();
    } else {
      dsApiClient = getDocuSignClient(accessToken);
    }

    const envelopesApi = new docusign.EnvelopesApi(dsApiClient);

    // Create the envelope (use template if provided, otherwise use document)
    let envelope;
    if (templateId) {
      envelope = makeEnvelopeFromTemplate({
        signerEmail,
        signerName,
        signerClientId,
        signers, // Pass signers array for multi-signer flow
        templateId,
        emailSubject
      });
    } else if (documentPath) {
      envelope = makeEnvelope({
        signerEmail,
        signerName,
        signerClientId,
        documentPath,
        documentName,
        emailSubject
      });
    } else {
      throw new Error('Either templateId or documentPath must be provided');
    }

    // Send the envelope
    console.log(`[DocuSign] Creating envelope...`);
    const envelopeResults = await envelopesApi.createEnvelope(docusignConfig.accountId, {
      envelopeDefinition: envelope
    });

    const envelopeId = envelopeResults.envelopeId;
    console.log(`[DocuSign] ✅ Envelope created: ${envelopeId}`);

    // Create the recipient view (embedded signing URL) for the first signer
    let viewRequest;
    if (signers && signers.length > 0) {
      // Multi-signer mode: use first signer (routingOrder 1)
      const firstSigner = signers[0];
      console.log(`[DocuSign] Generating signing URL for first signer: ${firstSigner.name}`);
      viewRequest = makeRecipientViewRequest({
        signerEmail: firstSigner.email,
        signerName: firstSigner.name,
        signerClientId: firstSigner.clientUserId
      });
    } else {
      // Single signer mode (legacy)
      viewRequest = makeRecipientViewRequest({
        signerEmail,
        signerName,
        signerClientId
      });
    }

    console.log(`[DocuSign] Generating embedded signing URL...`);
    const recipientViewResults = await envelopesApi.createRecipientView(
      docusignConfig.accountId,
      envelopeId,
      { recipientViewRequest: viewRequest }
    );

    console.log(`[DocuSign] ✅ Embedded signing URL generated`);

    return {
      envelopeId,
      redirectUrl: recipientViewResults.url
    };

  } catch (error) {
    console.error('[DocuSign] ❌ Error creating embedded signing session:', error);
    throw new Error(`DocuSign error: ${error.message}`);
  }
}

/**
 * Create envelope definition with document
 * @private
 */
function makeEnvelope(args) {
  const {
    signerEmail,
    signerName,
    signerClientId,
    documentPath,
    documentName,
    emailSubject
  } = args;

  console.log(`[DocuSign] Loading document: ${documentPath}`);

  // Read document file
  let docPdfBytes;
  try {
    docPdfBytes = fs.readFileSync(documentPath);
  } catch (error) {
    throw new Error(`Failed to read document: ${error.message}`);
  }

  // Create envelope definition
  const env = new docusign.EnvelopeDefinition();
  env.emailSubject = emailSubject;

  // Add document
  const doc1 = new docusign.Document();
  doc1.documentBase64 = Buffer.from(docPdfBytes).toString('base64');
  doc1.name = documentName;
  doc1.fileExtension = 'pdf';
  doc1.documentId = '1';

  env.documents = [doc1];

  // Create signer recipient (embedded signing)
  const signer1 = docusign.Signer.constructFromObject({
    email: signerEmail,
    name: signerName,
    clientUserId: signerClientId, // This enables embedded signing
    recipientId: '1'
  });

  // Add signature field (using anchor text /sn1/ in the PDF)
  // If your PDF doesn't have anchor text, use absolute positioning instead
  const signHere1 = docusign.SignHere.constructFromObject({
    anchorString: '/sn1/',
    anchorYOffset: '10',
    anchorUnits: 'pixels',
    anchorXOffset: '20'
  });

  // Alternative: Absolute positioning (if no anchor text in PDF)
  // const signHere1 = docusign.SignHere.constructFromObject({
  //   documentId: '1',
  //   pageNumber: '1',
  //   xPosition: '100',
  //   yPosition: '200'
  // });

  const signer1Tabs = docusign.Tabs.constructFromObject({
    signHereTabs: [signHere1]
  });
  signer1.tabs = signer1Tabs;

  // Add recipients
  const recipients = docusign.Recipients.constructFromObject({
    signers: [signer1]
  });
  env.recipients = recipients;

  // Send the envelope (use "created" for draft)
  env.status = 'sent';

  return env;
}

/**
 * Create envelope definition from template
 * @private
 *
 * Supports single signer (legacy) or multiple signers with routing order
 *
 * IMPORTANT: Multi-Signer Email Workflow
 * - Signer 1 (routingOrder: 1): Uses embedded signing (signs in portal via clientUserId)
 * - Signer 2+ (routingOrder: 2+): Remote signing (receives email from DocuSign automatically)
 * - When Signer 1 completes, DocuSign automatically emails Signer 2 with the signing link
 * - Signer 2 receives partially-signed document and can complete via email link
 *
 * @param {Object} args
 * @param {string} [args.signerEmail] - Single signer email (legacy)
 * @param {string} [args.signerName] - Single signer name (legacy)
 * @param {string} [args.signerClientId] - Single signer client ID (legacy)
 * @param {Array} [args.signers] - Multiple signers with routing order (new)
 * @param {string} args.templateId - DocuSign template ID
 * @param {string} args.emailSubject - Email subject line
 */
function makeEnvelopeFromTemplate(args) {
  const {
    signerEmail,
    signerName,
    signerClientId,
    signers,
    templateId,
    emailSubject
  } = args;

  console.log(`[DocuSign] Using template: ${templateId}`);

  // Create envelope definition
  const env = new docusign.EnvelopeDefinition();
  env.emailSubject = emailSubject;

  // Use template
  env.templateId = templateId;

  // Add EventNotification for webhooks (if dealId provided in args)
  if (args.dealId) {
    // Use environment variable or fall back to backend URL
    const webhookUrl = process.env.DOCUSIGN_WEBHOOK_URL;
    
    if (!webhookUrl) {
      console.warn('[DocuSign] ⚠️ DOCUSIGN_WEBHOOK_URL not set in environment variables!');
      console.warn('[DocuSign] ⚠️ Webhooks will use DocuSign Connect settings instead.');
      console.warn('[DocuSign] ⚠️ Set DOCUSIGN_WEBHOOK_URL=https://conveyancing-portal-backend.vercel.app/api/webhook/docusign');
    }
    
    // Only add EventNotification if webhook URL is configured
    // Otherwise, DocuSign Connect settings will be used
    if (webhookUrl) {
      env.eventNotification = docusign.EventNotification.constructFromObject({
        url: webhookUrl,
        loggingEnabled: true,
        requireAcknowledgment: true,
        useSoapInterface: false,
        includeCertificateWithSoap: false,
        signMessageWithX509Cert: false,
        includeDocuments: false,
        includeEnvelopeVoidReason: true,
        includeTimeZone: true,
        includeSenderAccountAsCustomField: true,
        includeDocumentFields: true,
        includeCertificateOfCompletion: false,
        envelopeEvents: [
          { envelopeEventStatusCode: 'sent' },
          { envelopeEventStatusCode: 'delivered' },
          { envelopeEventStatusCode: 'completed' },
          { envelopeEventStatusCode: 'declined' },
          { envelopeEventStatusCode: 'voided' }
        ],
        recipientEvents: [
          { recipientEventStatusCode: 'Sent' },
          { recipientEventStatusCode: 'Delivered' },
          { recipientEventStatusCode: 'Completed' },
          { recipientEventStatusCode: 'Declined' },
          { recipientEventStatusCode: 'AutoResponded' }
        ]
      });
      
      console.log(`[DocuSign] ✅ EventNotification configured for deal ${args.dealId} → ${webhookUrl}`);
    } else {
      console.log(`[DocuSign] ℹ️ Using DocuSign Connect settings for webhooks (no EventNotification override)`);
    }
    
    // Add custom field with HubSpot deal ID for webhook (essential for linking webhook to deal)
    env.customFields = docusign.CustomFields.constructFromObject({
      textCustomFields: [
        {
          name: 'hs_deal_id',
          value: args.dealId,
          show: 'false',
          required: 'false'
        }
      ]
    });
  }

  // Create template roles (signers)
  let templateRoles;

  if (signers && Array.isArray(signers) && signers.length > 0) {
    // New multi-signer flow with routing order
    console.log(`[DocuSign] Creating envelope with ${signers.length} signers (routing order enabled)`);

    templateRoles = signers.map((signer, index) => {
      // All signers get embedded signing capability (clientUserId)
      // Signers receive email from DocuSign AND can sign in portal (hybrid approach)
      const isFirstSigner = signer.routingOrder === 1;
      const signingMethod = 'Hybrid (Portal OR Email)';
      
      console.log(`[DocuSign]   Signer ${index + 1}: ${signer.name} (${signer.email}) - Role: ${signer.roleName}, Order: ${signer.routingOrder}, Method: ${signingMethod}`);

      const role = {
        email: signer.email,
        name: signer.name,
        roleName: signer.roleName, // Must match role name in template (e.g., "Client 1", "Client 2")
        routingOrder: signer.routingOrder.toString() // "1", "2", etc. - defines signing order
      };

      // Set clientUserId for ALL signers (enables hybrid: portal OR email)
      // DocuSign will still send email notifications due to envelope event configuration
      // This allows signers to choose: sign via portal (embedded) OR via email link
      // Routing order is still enforced by DocuSign (sequential signing)
      role.clientUserId = signer.clientUserId;

      return docusign.TemplateRole.constructFromObject(role);
    });
  } else {
    // Legacy single-signer flow (backward compatible)
    console.log(`[DocuSign] Creating envelope with single signer (legacy mode)`);

    templateRoles = [
      docusign.TemplateRole.constructFromObject({
        email: signerEmail,
        name: signerName,
        clientUserId: signerClientId,
        roleName: 'Seller' // Default role name
      })
    ];
  }

  // Add template roles (signers)
  env.templateRoles = templateRoles;

  // Send the envelope (use "created" for draft)
  env.status = 'sent';

  return env;
}

/**
 * Create recipient view request (embedded signing URL)
 * @private
 */
function makeRecipientViewRequest(args) {
  const { signerEmail, signerName, signerClientId } = args;

  const viewRequest = new docusign.RecipientViewRequest();

  // Return URL (where user goes after signing)
  viewRequest.returnUrl = docusignConfig.returnUrl;

  // Authentication method
  viewRequest.authenticationMethod = 'none';

  // Recipient information (must match envelope)
  viewRequest.email = signerEmail;
  viewRequest.userName = signerName;
  viewRequest.clientUserId = signerClientId;

  // Ping settings (keep session alive)
  viewRequest.pingFrequency = '600'; // seconds
  viewRequest.pingUrl = docusignConfig.pingUrl;

  // Frame settings (for embedded iframe)
  viewRequest.frameAncestors = docusignConfig.frameAncestors;
  viewRequest.messageOrigins = docusignConfig.messageOrigins;

  return viewRequest;
}

/**
 * Get recipient signing URL for an existing envelope
 * This is used when you have multiple signers and need to generate a signing URL
 * for a specific recipient after the envelope has been created
 *
 * @param {Object} params
 * @param {string} params.envelopeId - Envelope ID
 * @param {string} params.recipientEmail - Recipient's email (must match envelope)
 * @param {string} params.recipientName - Recipient's name (must match envelope)
 * @param {string} params.recipientClientId - Client user ID (must match envelope)
 * @param {string} [params.accessToken] - DocuSign access token (optional - will use JWT if not provided)
 * @param {boolean} [params.useJWT] - Use JWT authentication (default: true if no accessToken provided)
 * @returns {Promise<string>} Signing URL
 */
export async function getRecipientSigningUrl(params) {
  const {
    envelopeId,
    recipientEmail,
    recipientName,
    recipientClientId,
    accessToken,
    useJWT = !accessToken
  } = params;

  console.log(`[DocuSign] Getting recipient signing URL for: ${recipientEmail} (Envelope: ${envelopeId})`);

  try {
    // Initialize API client (use JWT if no access token provided)
    let dsApiClient;
    if (useJWT) {
      dsApiClient = await getDocuSignClientJWT();
    } else {
      dsApiClient = getDocuSignClient(accessToken);
    }

    const envelopesApi = new docusign.EnvelopesApi(dsApiClient);

    // Create the recipient view request
    const viewRequest = makeRecipientViewRequest({
      signerEmail: recipientEmail,
      signerName: recipientName,
      signerClientId: recipientClientId
    });

    console.log(`[DocuSign] Generating embedded signing URL...`);
    const recipientViewResults = await envelopesApi.createRecipientView(
      docusignConfig.accountId,
      envelopeId,
      { recipientViewRequest: viewRequest }
    );

    console.log(`[DocuSign] ✅ Embedded signing URL generated`);
    return recipientViewResults.url;

  } catch (error) {
    console.error('[DocuSign] ❌ Error getting recipient signing URL:', error);
    throw new Error(`DocuSign error: ${error.message}`);
  }
}

/**
 * Get envelope status
 *
 * @param {string} [accessToken] - DocuSign access token (optional - will use JWT if not provided)
 * @param {string} envelopeId
 * @param {boolean} [useJWT] - Use JWT authentication (default: true if no accessToken provided)
 * @returns {Promise<Object>} Envelope status
 */
export async function getEnvelopeStatus(accessToken, envelopeId, useJWT = !accessToken) {
  console.log(`[DocuSign] Getting envelope status: ${envelopeId}`);
  console.log(`[DocuSign] Using JWT: ${useJWT}`);

  try {
    // Use JWT if no access token provided
    let dsApiClient;
    if (useJWT) {
      dsApiClient = await getDocuSignClientJWT();
    } else {
      dsApiClient = getDocuSignClient(accessToken);
    }
    
    const envelopesApi = new docusign.EnvelopesApi(dsApiClient);

    const envelope = await envelopesApi.getEnvelope(
      docusignConfig.accountId,
      envelopeId
    );

    // Also fetch recipients to check signer status
    const recipients = await envelopesApi.listRecipients(
      docusignConfig.accountId,
      envelopeId
    );

    return {
      envelopeId: envelope.envelopeId,
      status: envelope.status,
      statusDateTime: envelope.statusDateTime,
      createdDateTime: envelope.createdDateTime,
      sentDateTime: envelope.sentDateTime,
      completedDateTime: envelope.completedDateTime,
      recipients: {
        signers: recipients.signers || []
      }
    };

  } catch (error) {
    console.error('[DocuSign] ❌ Error getting envelope status:', error);
    throw new Error(`DocuSign error: ${error.message}`);
  }
}

export default {
  createEmbeddedSigningSession,
  getRecipientSigningUrl,
  getEnvelopeStatus,
  getDocuSignClient,
  getDocuSignClientJWT
};
