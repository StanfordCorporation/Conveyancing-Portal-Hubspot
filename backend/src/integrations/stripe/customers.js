/**
 * Stripe Customers Integration
 * Handles creating and managing Stripe customers
 */

import stripe from '../../config/stripe.js';

/**
 * Create a Stripe customer
 * @param {Object} customerData - Customer information
 * @param {string} customerData.email - Customer email
 * @param {string} customerData.name - Customer full name
 * @param {string} customerData.phone - Customer phone (optional)
 * @param {Object} customerData.metadata - Additional metadata (e.g., dealId, contactId)
 * @returns {Promise<Object>} Stripe customer object
 */
export const createCustomer = async (customerData) => {
  try {
    console.log(`[Stripe Customers] 👤 Creating customer: ${customerData.email}`);

    const customer = await stripe.customers.create({
      email: customerData.email,
      name: customerData.name,
      phone: customerData.phone || undefined,
      metadata: customerData.metadata || {},
    });

    console.log(`[Stripe Customers] ✅ Customer created: ${customer.id}`);
    return customer;
  } catch (error) {
    console.error(`[Stripe Customers] ❌ Error creating customer:`, error.message);
    throw error;
  }
};

/**
 * Get a Stripe customer by ID
 * @param {string} customerId - Stripe customer ID
 * @returns {Promise<Object>} Stripe customer object
 */
export const getCustomer = async (customerId) => {
  try {
    const customer = await stripe.customers.retrieve(customerId);
    console.log(`[Stripe Customers] ✅ Retrieved customer: ${customer.id}`);
    return customer;
  } catch (error) {
    console.error(`[Stripe Customers] ❌ Error retrieving customer:`, error.message);
    throw error;
  }
};

/**
 * Search for a customer by email
 * @param {string} email - Customer email
 * @returns {Promise<Object|null>} Stripe customer object or null if not found
 */
export const findCustomerByEmail = async (email) => {
  try {
    const customers = await stripe.customers.list({
      email: email,
      limit: 1,
    });

    if (customers.data.length > 0) {
      console.log(`[Stripe Customers] ✅ Found existing customer: ${customers.data[0].id}`);
      return customers.data[0];
    }

    console.log(`[Stripe Customers] ℹ️ No customer found with email: ${email}`);
    return null;
  } catch (error) {
    console.error(`[Stripe Customers] ❌ Error searching customer:`, error.message);
    throw error;
  }
};

/**
 * Get or create a customer
 * Returns existing customer if found by email, otherwise creates new one
 * @param {Object} customerData - Customer information
 * @returns {Promise<Object>} Stripe customer object
 */
export const getOrCreateCustomer = async (customerData) => {
  try {
    // Try to find existing customer by email
    const existingCustomer = await findCustomerByEmail(customerData.email);

    if (existingCustomer) {
      return existingCustomer;
    }

    // Create new customer if not found
    return await createCustomer(customerData);
  } catch (error) {
    console.error(`[Stripe Customers] ❌ Error in getOrCreateCustomer:`, error.message);
    throw error;
  }
};
