/**
 * Find Credit Account ID
 * Lists all bank accounts to find a Credit account
 */

import dotenv from 'dotenv';
import * as smokeballBankAccounts from '../src/integrations/smokeball/bankAccounts.js';

dotenv.config();

async function findCreditAccount() {
  console.log('\n🔍 Finding Credit Account...\n');
  
  try {
    const accounts = await smokeballBankAccounts.getAllBankAccounts();
    
    console.log(`✅ Found ${accounts.length} bank account(s):\n`);
    
    accounts.forEach((account, index) => {
      console.log(`${index + 1}. ${account.name || account.accountName || 'Unknown'}`);
      console.log(`   ID: ${account.id}`);
      console.log(`   Type: ${account.type || account.accountType || 'N/A'}`);
      console.log(`   Bank: ${account.bankName || 'N/A'}`);
      console.log('');
    });
    
    // Find Credit accounts (accountType = 2)
    const creditAccounts = accounts.filter(acc => 
      acc.accountType === 2 || // Credit = 2
      acc.accountType === '2' ||
      (acc.type && acc.type.toLowerCase().includes('credit')) ||
      (acc.accountType && acc.accountType.toString().includes('2')) ||
      (acc.name && acc.name.toLowerCase().includes('credit'))
    );
    
    console.log('\n📊 Account Types Found:\n');
    accounts.forEach((account, index) => {
      const accountType = account.accountType;
      let typeName = 'Unknown';
      if (accountType === 0) typeName = 'Operating';
      else if (accountType === 1) typeName = 'Trust';
      else if (accountType === 2) typeName = 'Credit ✅';
      else if (accountType === 3) typeName = 'ControlledMoney';
      
      console.log(`${index + 1}. ${account.name || account.accountName || 'Unknown'}`);
      console.log(`   ID: ${account.id}`);
      console.log(`   Type: ${typeName} (${accountType})`);
      console.log(`   Bank: ${account.bankName || 'N/A'}`);
      console.log('');
    });
    
    if (creditAccounts.length > 0) {
      console.log('✅ Credit Account(s) found (accountType = 2):\n');
      creditAccounts.forEach((account, index) => {
        console.log(`${index + 1}. ${account.name || account.accountName}`);
        console.log(`   ID: ${account.id}`);
        console.log(`   Use this ID for receipting!`);
        console.log('');
      });
    } else {
      console.log('⚠️  No Credit accounts (accountType = 2) found in the list');
      console.log('   You may need to check Smokeball directly for the Credit account ID');
      console.log('   Or verify the account ID format (may not have _Trust suffix)');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.responseData) {
      console.error(JSON.stringify(error.responseData, null, 2));
    }
  }
}

findCreditAccount();

