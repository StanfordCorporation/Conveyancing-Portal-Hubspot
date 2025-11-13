/**
 * Direct test of JWT authentication with current backend configuration
 * Run this to test JWT auth without needing to make API calls
 */

import { testJWTAuth, clearTokenCache } from './src/integrations/docusign/jwtAuth.js';

console.log('\n🧪 Testing DocuSign JWT Authentication\n');
console.log('This will test your JWT configuration and show detailed debug output.\n');

// Clear any cached tokens first
clearTokenCache();
console.log('✅ Token cache cleared\n');

// Run the test
testJWTAuth()
  .then(result => {
    if (result.success) {
      console.log('\n✅ SUCCESS! JWT authentication is working correctly.');
      console.log('\nToken Info:');
      console.log('  - Length:', result.token.accessToken.length, 'characters');
      console.log('  - Expires in:', result.token.expiresIn, 'seconds');
      console.log('  - Type:', result.token.tokenType);
      console.log('\nUser Info:');
      console.log('  - Name:', result.userInfo.name);
      console.log('  - Email:', result.userInfo.email);
      console.log('  - Accounts:', result.userInfo.accounts.length);
      console.log('\nYou can now use DocuSign signing sessions.');
      process.exit(0);
    } else {
      console.error('\n❌ FAILED! JWT authentication is not working.');
      console.error('Error:', result.error);
      console.error('\nPlease check:');
      console.error('1. Environment variables are set correctly');
      console.error('2. Private key format is correct');
      console.error('3. JWT consent has been granted');
      console.error('4. Integration key and user ID match DocuSign admin console');
      process.exit(1);
    }
  })
  .catch(error => {
    console.error('\n❌ UNEXPECTED ERROR:', error.message);
    console.error(error.stack);
    process.exit(1);
  });

