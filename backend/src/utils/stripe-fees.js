/**
 * Stripe Fee Calculator
 * Calculates the total amount to charge including Stripe processing fees
 * so that you receive the full intended amount after fees are deducted
 */

/**
 * Stripe fee structure for Australian businesses
 * Source: https://stripe.com/au/pricing
 * 
 * Standard Australian Stripe pricing:
 * - Percentage fee: 1.7% (0.017) - includes GST in headline rate
 * - Fixed fee: $0.30 (30 cents)
 */
export const STRIPE_FEES = {
  // Domestic Australian cards (standard pricing)
  DOMESTIC: {
    percentage: 0.017, // 1.7% (standard Australian Stripe rate)
    fixed: 30, // A$0.30 in cents
  },
  // International cards
  INTERNATIONAL: {
    percentage: 0.035, // 3.5%
    fixed: 30, // A$0.30 in cents
  },
};

/**
 * Calculate gross charge amount including Stripe fees
 * Formula: G = (N + F) / (1 - R)
 * Where:
 *   G = gross amount (total charged to card)
 *   N = net amount (what you want to receive)
 *   F = fixed fee
 *   R = rate (percentage fee)
 * 
 * All calculations done in cents to avoid floating point rounding issues
 *
 * @param {number} netAmountInCents - Amount you want to receive in cents (e.g., 10000 = $100.00)
 * @param {number} feePercent - Fee percentage as decimal (e.g., 0.017 for 1.7%)
 * @param {number} fixedFeeInCents - Fixed fee in cents (e.g., 30 = $0.30)
 * @returns {number} Gross amount to charge in cents
 */
function calculateGrossAmountInCents(netAmountInCents, feePercent, fixedFeeInCents) {
  // G = (N + F) / (1 - R), all in cents
  const grossCents = Math.round((netAmountInCents + fixedFeeInCents) / (1 - feePercent));
  return grossCents;
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
 * // result.grossAmountInCents = 10204 (A$102.04)
 * // result.stripeFeeInCents = 204 (A$2.04)
 * // result.netAmountInCents = 10000 (A$100.00)
 */
export const calculateAmountWithFees = (netAmountInCents, options = {}) => {
  const { useDomestic = true } = options;
  const feeStructure = useDomestic ? STRIPE_FEES.DOMESTIC : STRIPE_FEES.INTERNATIONAL;

  const { percentage: feePercent, fixed: fixedFeeInCents } = feeStructure;

  // Calculate gross amount entirely in cents to avoid floating point rounding issues
  // Formula: G = (N + F) / (1 - R)
  const grossAmountInCents = calculateGrossAmountInCents(netAmountInCents, feePercent, fixedFeeInCents);

  // Calculate actual Stripe fee (what the client pays in fees)
  const stripeFeeInCents = grossAmountInCents - netAmountInCents;

  return {
    netAmountInCents: netAmountInCents,
    grossAmountInCents: grossAmountInCents,
    stripeFeeInCents: stripeFeeInCents,
    feePercent: feePercent,
    fixedFee: fixedFeeInCents, // Now in cents
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
