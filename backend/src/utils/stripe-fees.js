/**
 * Stripe Fee Calculator
 * Calculates the total amount to charge including Stripe processing fees
 * so that you receive the full intended amount after fees are deducted
 */

/**
 * Stripe fee structure for Australian businesses
 * Source: https://stripe.com/au/pricing
 */
export const STRIPE_FEES = {
  // Domestic Australian cards
  DOMESTIC: {
    percentage: 0.0175, // 1.75%
    fixed: 0.30, // A$0.30 (in dollars)
  },
  // International cards
  INTERNATIONAL: {
    percentage: 0.029, // 2.9%
    fixed: 0.30, // A$0.30 (in dollars)
  },
};

/**
 * Calculate gross charge amount including Stripe fees
 * Formula: gross_amount = (net_amount + fixed_fee) / (1 - percentage_fee)
 *
 * @param {number} netAmount - Amount you want to receive in dollars (e.g., 100.00)
 * @param {number} feePercent - Fee percentage as decimal (e.g., 0.0175 for 1.75%)
 * @param {number} fixedFee - Fixed fee in dollars (e.g., 0.30)
 * @returns {number} Gross amount to charge (in dollars)
 */
function calculateGrossAmount(netAmount, feePercent, fixedFee) {
  return (netAmount + fixedFee) / (1 - feePercent);
}

/**
 * Calculate the total amount to charge including Stripe fees
 *
 * @param {number} netAmountInCents - Amount you want to receive in cents (after fees)
 * @param {Object} options - Configuration options
 * @param {boolean} options.useDomestic - Use domestic rates (default: true)
 * @returns {Object} Calculation breakdown
 *
 * @example
 * // You want to receive $100.00 after fees
 * const result = calculateAmountWithFees(10000);
 * // result.grossAmountInCents = 10210 (A$102.10)
 * // result.stripeFeeInCents = 210 (A$2.10)
 * // result.netAmountInCents = 10000 (A$100.00)
 */
export const calculateAmountWithFees = (netAmountInCents, options = {}) => {
  const { useDomestic = true } = options;
  const feeStructure = useDomestic ? STRIPE_FEES.DOMESTIC : STRIPE_FEES.INTERNATIONAL;

  const { percentage: feePercent, fixed: fixedFee } = feeStructure;

  // Convert cents to dollars for calculation
  const netAmount = netAmountInCents / 100;

  // Calculate gross amount
  const grossAmount = calculateGrossAmount(netAmount, feePercent, fixedFee);
  const grossAmountInCents = Math.round(grossAmount * 100);

  // Calculate actual Stripe fee
  const stripeFeeInCents = grossAmountInCents - netAmountInCents;

  return {
    netAmountInCents: netAmountInCents,
    grossAmountInCents: grossAmountInCents,
    stripeFeeInCents: stripeFeeInCents,
    feePercent: feePercent,
    fixedFee: fixedFee,
    breakdown: {
      netAmount: `A$${(netAmountInCents / 100).toFixed(2)}`,
      grossAmount: `A$${(grossAmountInCents / 100).toFixed(2)}`,
      stripeFee: `A$${(stripeFeeInCents / 100).toFixed(2)}`,
      feePercentage: `${(feePercent * 100).toFixed(2)}%`,
    },
  };
};

/**
 * Get fee breakdown for display to customers
 *
 * @param {number} netAmountInCents - Amount you want to receive
 * @param {Object} options - Configuration options
 * @returns {Object} User-friendly breakdown
 */
export const getFeeBreakdown = (netAmountInCents, options = {}) => {
  const calculation = calculateAmountWithFees(netAmountInCents, options);

  return {
    baseAmount: calculation.breakdown.netAmount,
    surcharge: calculation.breakdown.stripeFee,
    totalAmount: calculation.breakdown.grossAmount,
    surchargeRate: calculation.breakdown.feePercentage,
    description: `A ${calculation.breakdown.feePercentage} card processing surcharge applies`,
  };
};
