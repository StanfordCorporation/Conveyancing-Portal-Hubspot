/**
 * DocuSign Configuration
 *
 * IMPORTANT: In production, move these credentials to environment variables!
 * Add to .env file:
 * DOCUSIGN_INTEGRATION_KEY=34d08817-3cbe-43ea-922f-348ae0dcd358
 * DOCUSIGN_USER_ID=9bdab216-34d5-4f33-ab31-a72f850fde78
 * DOCUSIGN_ACCOUNT_ID=af8995ad-b134-4144-acc0-5ca58db8f759
 * DOCUSIGN_BASE_PATH=https://demo.docusign.net/restapi (or production URL)
 * DOCUSIGN_OAUTH_BASE_PATH=https://account-d.docusign.com
 */

import dotenv from 'dotenv';
dotenv.config();

const docusignConfig = {
  // Integration Key (also called Client ID)
  integrationKey: process.env.DOCUSIGN_INTEGRATION_KEY || '34d08817-3cbe-43ea-922f-348ae0dcd358',

  // User ID (Impersonated User GUID)
  userId: process.env.DOCUSIGN_USER_ID || '9bdab216-34d5-4f33-ab31-a72f850fde78',

  // Account ID
  accountId: process.env.DOCUSIGN_ACCOUNT_ID || 'af8995ad-b134-4144-acc0-5ca58db8f759',

  // Base Path (Demo environment - change to production when ready)
  basePath: process.env.DOCUSIGN_BASE_PATH || 'https://demo.docusign.net/restapi',

  // OAuth Base Path
  oAuthBasePath: process.env.DOCUSIGN_OAUTH_BASE_PATH || 'https://account-d.docusign.com',

  // RSA Key Pair ID (from DocuSign Admin Console)
  keypairId: process.env.DOCUSIGN_KEYPAIR_ID || '69fb5ec8-a1e3-4b06-bdd4-0fb5c154a800',

  // RSA Private Key for JWT Authentication
  // In production, store this in environment variable or secure vault
  privateKey: process.env.DOCUSIGN_PRIVATE_KEY || `-----BEGIN RSA PRIVATE KEY-----
MIIEpQIBAAKCAQEAuwa6rRXGRtikIQ7PlRx3V8qkRNri7x17jjhnxBp7LQmsIoSv
RrbVixNYWV0qRm4dlpC/TkHbIliEiOeDceeONyGJYyuKRf7z+w6h5PaK5ebbl/Qa
papYgzjtteNIGanAhuHbfJzPX2cOJYHK4WUJC4AzojFslophwlGKRiOFBm3Vemou
uSnRv1Ez8DN8+G2tLaFD+R6abyO0dGvePyMjy6CwuF+8gpMPFv+zxRfg2/QadeRA
cRKfaz3zZ5/lgFHdDJ55hT6YpA+LcAB01wl2lWlF5iTxj7W1yny/F1fVnv+I4KsY
nXhYnUVgRAO4pLBruRICQT6l/faaJn1wOCOFYQIDAQABAoIBAATeNs4E3ZLVgRF9
NbOqDdnX+UZI3j70E6sO1nXubIYDv5psaArdUm9FcyIXAIqHGOJk5R3agqOBDf4U
Qexykas8sRCcPwP1ursDqqdvhWEDjR6w6LVRhZlGH5CBmHcBNJ+DfHeLYK3D3G88
fXU4Gy//R8NxKY7njjDad3to4ZsFBcakvUd+i3SE+bQlZx8pmt3yM+lJ2gtdR6+p
Lg0hacdr61xQbpbEO8rWuIDb1+wf0CUtFrt9JJZ8IMjYshkQm8WX+Cm+qnVwv6eb
udpY3yUUK6ptBKFJmxtjX9xyQfna1/qp7d0bd1WwgBwULxsL4CtyQeYxFvqyBSuZ
X+YaNtsCgYEA5nYUciqRFneXjOyFMHmpkPjQ/HvrdsmTbAVTxcDSP6WgYeihdc0a
pzO0/TfUJeYNOBe5UlqkxaLqPZBKvIevQfLg4jG209N14QDbI3ioZBCIJJY0Idvm
1eb1icOM/A3319APv3KFPmE2ntz2wp8K+7D4GsIesURM1Dv2t0uCVOsCgYEAz8Bz
D/zaEjAfxM+KF0jOQr4R9SzYmFinAu8Tov1O7ccmbyRqbL9m3QjCGFZvjz56HZ+W
6+Zf1RYIVUXW7odS6pvq//H7vrInfujMTiGQ2Mxd9FNqL+2zc7Y72++AJmmDRuMM
X9cvKl5/ynHv2BkO+1OMiI7PJA46w5jayek8a+MCgYEA4LjpbP3G5lKNS9Rid4da
6ktFdb3cN8ONZjq3mlBQc9GsV2yA7J6oS7wm0ve6fY4a+8ReaEiM/U7D/G4UAkyI
f9U2pjn13g4HlvS/upHwGUrphkuU4CNOrut8J+6wLiPstdtjT7p65P3kRfqO/+4X
xp+k/mqlhRNlm1oxVEBkASsCgYEAmueiY89jQqCDb5pYGth8gyN5/Fe+AIpJrVRa
TfOWQJF3xPNgL0ngBvuazc7VS/eH0kLGo4qY9ieBeyOiCST53Fj5tnHWBfCMpoIq
pC8+84genij8SlRws9yzcWB5KysNaXOuLGAkmPDxVB/0eCrnEtrPNJtXNEkv49w7
dsXj+YUCgYEAyz3pqRE83AOk8wPNcfZUS4LbaemsswTUFomQbadP4+O0hjhYdbLY
sRrwlCaK+Kma2ZzEZcZZtBTK6dSOJvb1rYUBJavuBQFWdAFXTsoK9rD1tfNizCQP
s3DTk5lh9m/S1D/k3SUPNYQcXSsJ2iKtwZ38ZXHaJT6L7SM1f0CAdtQ=
-----END RSA PRIVATE KEY-----`,

  // RSA Public Key (for reference, not used in JWT flow)
  publicKey: process.env.DOCUSIGN_PUBLIC_KEY || `-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAuwa6rRXGRtikIQ7PlRx3
V8qkRNri7x17jjhnxBp7LQmsIoSvRrbVixNYWV0qRm4dlpC/TkHbIliEiOeDceeO
NyGJYyuKRf7z+w6h5PaK5ebbl/QapapYgzjtteNIGanAhuHbfJzPX2cOJYHK4WUJ
C4AzojFslophwlGKRiOFBm3VemouuSnRv1Ez8DN8+G2tLaFD+R6abyO0dGvePyMj
y6CwuF+8gpMPFv+zxRfg2/QadeRAcRKfaz3zZ5/lgFHdDJ55hT6YpA+LcAB01wl2
lWlF5iTxj7W1yny/F1fVnv+I4KsYnXhYnUVgRAO4pLBruRICQT6l/faaJn1wOCOF
YQIDAQAB
-----END PUBLIC KEY-----`,

  // Return URL after signing (where user is redirected after completing signature)
  // Uses dedicated completion handler that detects iframe and redirects parent window
  returnUrl: process.env.DOCUSIGN_RETURN_URL || 'http://localhost:3000/signing-complete',

  // Ping URL for keeping session alive during signing
  pingUrl: process.env.DOCUSIGN_PING_URL || 'http://localhost:3001/api/docusign/ping',

  // Token expiration in seconds (1 hour)
  tokenExpirationInSeconds: 3600,

  // Allowed frame ancestors (for embedded signing)
  frameAncestors: [
    'http://localhost:3000',
    'https://apps-d.docusign.com',
    'https://demo.docusign.net'
  ],

  // Allowed message origins (for embedded signing) - DocuSign only allows 1
  messageOrigins: [
    'https://apps-d.docusign.com'
  ],

  // Template ID for Property Disclosure Form (multiple signers with routing order)
  templateId: process.env.DOCUSIGN_TEMPLATE_ID || '10e6d4c1-196d-4751-8f6e-f77f8b271c1a'
};

export default docusignConfig;
