/**
 * Force Smokeball Token Refresh
 * Clears existing token and forces a new OAuth flow
 */

import dotenv from 'dotenv';
import * as tokenStorage from '../src/services/storage/token-storage.js';
import * as auth from '../src/integrations/smokeball/auth.js';

dotenv.config();

async function forceRefresh() {
  console.log('🔄 Forcing token refresh to get new scopes...\n');
  
  try {
    // Load existing tokens
    const oldTokens = await tokenStorage.loadTokens();
    
    if (!oldTokens || !oldTokens.refresh_token) {
      console.log('❌ No refresh token available. You need to re-authenticate.');
      console.log('   Visit: http://localhost:3001/api/smokeball/oauth-login');
      return;
    }
    
    console.log('✅ Found existing refresh token');
    console.log(`   Old token expires: ${new Date(oldTokens.expires_at).toISOString()}`);
    
    // Refresh the token (this will get new scopes)
    console.log('\n🔄 Refreshing token with updated scopes...');
    const newTokens = await auth.refreshAccessToken(oldTokens.refresh_token);
    
    console.log('\n✅ Token refreshed successfully!');
    console.log(`   New token expires: ${new Date(newTokens.expires_at).toISOString()}`);
    console.log(`   Token preview: ${newTokens.access_token.substring(0, 30)}...`);
    
    console.log('\n✅ New token with updated scopes has been saved!');
    console.log('   You can now run the bank accounts test again.');
    
  } catch (error) {
    console.error('\n❌ Error refreshing token:', error.message);
    console.error(error);
  }
  
  process.exit(0);
}

forceRefresh();




