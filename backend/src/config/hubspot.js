import dotenv from 'dotenv';

dotenv.config();

export const hubspotConfig = {
  accessToken: process.env.HUBSPOT_ACCESS_TOKEN,
  apiBase: process.env.HUBSPOT_API_BASE || 'https://api.hubapi.com',
  portalId: process.env.HUBSPOT_PORTAL_ID,
  rateLimit: {
    maxRequests: 10,
    perSeconds: 1
  }
};

export default hubspotConfig;
