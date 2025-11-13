/**
 * Test script for Stripe fee calculation
 * Run: node test-stripe-fees.js
 */

import { calculateAmountWithFees, getFeeBreakdown } from './src/utils/stripe-fees.js';

console.log('🧪 Testing Stripe Fee Calculator\n');
console.log('='.repeat(60));

// Test cases
const testAmounts = [
  { label: 'Small payment', amount: 5000 }, // $50
  { label: 'Medium payment', amount: 10000 }, // $100
  { label: 'Large payment', amount: 50000 }, // $500
  { label: 'Very large payment', amount: 100000 }, // $1000
];

console.log('\n📊 DOMESTIC CARD FEES (1.75% + A$0.30)\n');

testAmounts.forEach(({ label, amount }) => {
  const result = calculateAmountWithFees(amount, { useDomestic: true });

  console.log(`${label}:`);
  console.log(`  Net Amount (what you want):     ${result.breakdown.netAmount}`);
  console.log(`  Stripe Fee:                     ${result.breakdown.stripeFee}`);
  console.log(`  Total Charge to Customer:       ${result.breakdown.grossAmount}`);
  console.log(`  Verification (gross - fee):     A$${(result.grossAmountInCents - result.stripeFeeInCents) / 100}`);
  console.log(`  ✅ Matches desired amount: ${result.netAmountInCents === (result.grossAmountInCents - result.stripeFeeInCents) ? 'YES' : 'NO'}`);
  console.log('');
});

console.log('='.repeat(60));
console.log('\n💳 INTERNATIONAL CARD FEES (2.9% + A$0.30)\n');

testAmounts.forEach(({ label, amount }) => {
  const result = calculateAmountWithFees(amount, { useDomestic: false });

  console.log(`${label}:`);
  console.log(`  Net Amount (what you want):     ${result.breakdown.netAmount}`);
  console.log(`  Stripe Fee:                     ${result.breakdown.stripeFee}`);
  console.log(`  Total Charge to Customer:       ${result.breakdown.grossAmount}`);
  console.log(`  Verification (gross - fee):     A$${(result.grossAmountInCents - result.stripeFeeInCents) / 100}`);
  console.log(`  ✅ Matches desired amount: ${result.netAmountInCents === (result.grossAmountInCents - result.stripeFeeInCents) ? 'YES' : 'NO'}`);
  console.log('');
});

console.log('='.repeat(60));
console.log('\n📋 EXAMPLE API RESPONSE FOR $100 PAYMENT:\n');

const exampleResult = calculateAmountWithFees(10000, { useDomestic: true });
console.log(JSON.stringify({
  clientSecret: 'pi_xxx_secret_xxx',
  paymentIntentId: 'pi_xxx',
  customerId: 'cus_xxx',
  feeBreakdown: {
    baseAmount: exampleResult.breakdown.netAmount,
    stripeFee: exampleResult.breakdown.stripeFee,
    totalAmount: exampleResult.breakdown.grossAmount,
    feePercentage: exampleResult.breakdown.feePercentage,
    baseAmountCents: exampleResult.netAmountInCents,
    stripeFeeInCents: exampleResult.stripeFeeInCents,
    totalAmountCents: exampleResult.grossAmountInCents,
  },
}, null, 2));

console.log('\n✅ All tests complete!\n');
