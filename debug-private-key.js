/**
 * Debug Private Key Format
 * This will show you EXACTLY what your private key looks like in the environment
 */

import dotenv from 'dotenv';
dotenv.config({ path: '.env.docusign' });

const privateKey = process.env.DOCUSIGN_PRIVATE_KEY;

console.log('\n🔍 PRIVATE KEY DEBUG\n');
console.log('==========================================\n');

if (!privateKey) {
  console.error('❌ DOCUSIGN_PRIVATE_KEY is not set in .env.docusign!');
  process.exit(1);
}

console.log('✅ Private key exists');
console.log('Length:', privateKey.length, 'characters');
console.log('');

// Check format
const checks = {
  'Has BEGIN header': privateKey.includes('-----BEGIN'),
  'Has END footer': privateKey.includes('-----END'),
  'Has BEGIN RSA PRIVATE KEY': privateKey.includes('-----BEGIN RSA PRIVATE KEY-----'),
  'Has END RSA PRIVATE KEY': privateKey.includes('-----END RSA PRIVATE KEY-----'),
  'Has newlines (\\n)': privateKey.includes('\\n'),
  'Has actual newlines': privateKey.includes('\n'),
  'Starts with -----': privateKey.trim().startsWith('-----'),
  'Ends with -----': privateKey.trim().endsWith('-----')
};

console.log('Format Checks:');
Object.entries(checks).forEach(([check, result]) => {
  console.log(`  ${result ? '✅' : '❌'} ${check}`);
});
console.log('');

// Show the structure
console.log('First 100 characters:');
console.log(privateKey.substring(0, 100));
console.log('');

console.log('Last 100 characters:');
console.log(privateKey.substring(privateKey.length - 100));
console.log('');

// Check for common issues
console.log('Common Issues:');
if (privateKey.includes('\\n') && !privateKey.includes('\n')) {
  console.log('  ⚠️  WARNING: Your key has literal \\n instead of actual newlines');
  console.log('     This is usually CORRECT for .env files!');
} else if (privateKey.includes('\n') && !privateKey.includes('\\n')) {
  console.log('  ⚠️  WARNING: Your key has actual newlines instead of \\n');
  console.log('     This might cause issues in .env files!');
}

if (!privateKey.trim().startsWith('-----BEGIN')) {
  console.log('  ❌ ERROR: Key does not start with -----BEGIN');
  console.log('     Your key might have extra whitespace or quotes');
}

if (!privateKey.trim().endsWith('-----')) {
  console.log('  ❌ ERROR: Key does not end with -----');
  console.log('     Your key might be truncated or have extra characters');
}

// Try to parse it like DocuSign SDK does
console.log('\n==========================================');
console.log('Attempting to use this key with DocuSign SDK...\n');

import docusign from 'docusign-esign';

try {
  const dsApiClient = new docusign.ApiClient();
  dsApiClient.setOAuthBasePath('account.docusign.com');
  
  const integrationKey = process.env.DOCUSIGN_INTEGRATION_KEY;
  const userId = process.env.DOCUSIGN_USER_ID;
  
  console.log('Integration Key:', integrationKey);
  console.log('User ID:', userId);
  console.log('Keypair ID:', process.env.DOCUSIGN_KEYPAIR_ID);
  console.log('');
  
  console.log('Sending JWT request to DocuSign...');
  
  const results = await dsApiClient.requestJWTUserToken(
    integrationKey,
    userId,
    ['signature', 'impersonation'],
    privateKey,
    3600
  );
  
  console.log('\n✅✅✅ SUCCESS! ✅✅✅');
  console.log('Your private key is VALID and working!');
  console.log('Token received:', results.body.access_token.substring(0, 30) + '...');
  
} catch (error) {
  console.log('\n❌ FAILED to get JWT token');
  console.log('Error:', error.message);
  
  if (error.response?.data) {
    console.log('DocuSign Error:', JSON.stringify(error.response.data, null, 2));
    
    if (error.response.data.error === 'invalid_grant') {
      console.log('\n🔧 TROUBLESHOOTING:');
      console.log('');
      console.log('1. The private key format looks OK, but DocuSign says it\'s invalid');
      console.log('   This means:');
      console.log('   - The private key doesn\'t match the Keypair ID in DocuSign');
      console.log('   - OR the keypair was deleted/regenerated in DocuSign');
      console.log('   - OR the Integration Key or User ID is wrong');
      console.log('');
      console.log('2. Go to DocuSign Admin Console:');
      console.log('   https://admin.docusign.com/apps-and-keys');
      console.log('');
      console.log('3. Find your app: ' + integrationKey);
      console.log('');
      console.log('4. Check "Service Integration" section:');
      console.log('   - Does Keypair ID ' + process.env.DOCUSIGN_KEYPAIR_ID + ' exist?');
      console.log('   - If NO: Generate a NEW keypair and update .env.docusign');
      console.log('   - If YES: You might have the wrong private key - regenerate it');
      console.log('');
      console.log('5. When you generate a keypair, you can ONLY see the private key ONCE');
      console.log('   If you lost it, you MUST delete and create a new one');
    }
  }
}

