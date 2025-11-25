/**
 * GitHub Actions Trigger Service
 * Triggers GitHub Actions workflows via repository_dispatch
 */

import axios from 'axios';

/**
 * Trigger receipt automation GitHub Action
 *
 * @param {Object} params - Receipt parameters
 * @param {string} params.deal_id - HubSpot deal ID
 * @param {string} params.matter_id - Smokeball matter ID
 * @param {number} params.amount - Amount to receipt
 * @param {string} params.lastname - Contact lastname
 * @param {string} params.firstname - Contact firstname
 * @param {string} params.date - Date deposited (DD/MM/YYYY HH:MM:SS)
 * @param {boolean} params.test_mode - If true, fills form but doesn't submit
 * @returns {Promise<Object>} Result with success status
 */
export async function triggerReceiptAutomation(params) {
  const {
    deal_id,
    matter_id,
    amount,
    lastname,
    firstname,
    date,
    test_mode = false
  } = params;

  // GitHub repository details
  const GITHUB_OWNER = process.env.GITHUB_OWNER; // e.g., "StanfordCorporation"
  const GITHUB_REPO = process.env.GITHUB_REPO;   // e.g., "Conveyancing-Portal-Hubspot"
  const GITHUB_TOKEN = process.env.GITHUB_TOKEN; // Personal Access Token with repo scope

  if (!GITHUB_OWNER || !GITHUB_REPO || !GITHUB_TOKEN) {
    throw new Error('GitHub configuration missing: GITHUB_OWNER, GITHUB_REPO, or GITHUB_TOKEN not set');
  }

  console.log(`[GitHub Actions] 🚀 Triggering receipt automation workflow...`);
  console.log(`[GitHub Actions]    Deal ID: ${deal_id}`);
  console.log(`[GitHub Actions]    Matter ID: ${matter_id}`);
  console.log(`[GitHub Actions]    Amount: $${amount}`);
  console.log(`[GitHub Actions]    Contact: ${lastname}, ${firstname}`);

  try {
    // Trigger repository_dispatch event
    const response = await axios.post(
      `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/dispatches`,
      {
        event_type: 'receipt-automation',
        client_payload: {
          deal_id,
          matter_id,
          amount,
          lastname,
          firstname,
          date,
          test_mode
        }
      },
      {
        headers: {
          'Authorization': `token ${GITHUB_TOKEN}`,
          'Accept': 'application/vnd.github.v3+json',
          'Content-Type': 'application/json'
        }
      }
    );

    if (response.status === 204) {
      console.log(`[GitHub Actions] ✅ Workflow triggered successfully`);
      console.log(`[GitHub Actions] 📊 Check status at: https://github.com/${GITHUB_OWNER}/${GITHUB_REPO}/actions`);

      return {
        success: true,
        message: 'GitHub Action triggered successfully',
        actions_url: `https://github.com/${GITHUB_OWNER}/${GITHUB_REPO}/actions`
      };
    } else {
      throw new Error(`Unexpected response status: ${response.status}`);
    }
  } catch (error) {
    console.error(`[GitHub Actions] ❌ Failed to trigger workflow:`, error.message);

    if (error.response) {
      console.error(`[GitHub Actions]    Status: ${error.response.status}`);
      console.error(`[GitHub Actions]    Data:`, error.response.data);
    }

    throw new Error(`Failed to trigger GitHub Action: ${error.message}`);
  }
}

/**
 * Check if GitHub Actions is configured
 * @returns {boolean} True if all required environment variables are set
 */
export function isGitHubActionsConfigured() {
  return !!(
    process.env.GITHUB_OWNER &&
    process.env.GITHUB_REPO &&
    process.env.GITHUB_TOKEN
  );
}
