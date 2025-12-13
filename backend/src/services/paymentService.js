const axios = require('axios');

// Payment Service - Handles bKash, Nagad, and Stripe integrations

/**
 * bKash Payment Integration
 */

// Get bKash authentication token
const getBkashToken = async () => {
  try {
    const response = await axios.post(
      `${process.env.BKASH_BASE_URL}/token/grant`,
      {
        app_key: process.env.BKASH_APP_KEY,
        app_secret: process.env.BKASH_APP_SECRET,
      },
      {
        headers: {
          'Content-Type': 'application/json',
          username: process.env.BKASH_USERNAME,
          password: process.env.BKASH_PASSWORD,
        },
      }
    );
    return response.data.id_token;
  } catch (error) {
    console.error('bKash token error:', error.response?.data || error.message);
    throw new Error('Failed to get bKash token');
  }
};

// Create bKash payment
const createBkashPayment = async (amount, invoiceNumber) => {
  try {
    const token = await getBkashToken();

    const response = await axios.post(
      `${process.env.BKASH_BASE_URL}/checkout/payment/create`,
      {
        amount: amount.toString(),
        currency: 'BDT',
        intent: 'sale',
        merchantInvoiceNumber: invoiceNumber,
      },
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: token,
          'X-APP-Key': process.env.BKASH_APP_KEY,
        },
      }
    );

    return {
      success: true,
      paymentID: response.data.paymentID,
      bkashURL: response.data.bkashURL,
      callbackURL: response.data.callbackURL,
    };
  } catch (error) {
    console.error('bKash create payment error:', error.response?.data || error.message);
    return {
      success: false,
      error: error.response?.data?.errorMessage || 'Failed to create bKash payment',
    };
  }
};

// Execute bKash payment
const executeBkashPayment = async (paymentID) => {
  try {
    const token = await getBkashToken();

    const response = await axios.post(
      `${process.env.BKASH_BASE_URL}/checkout/payment/execute/${paymentID}`,
      {},
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: token,
          'X-APP-Key': process.env.BKASH_APP_KEY,
        },
      }
    );

    if (response.data.transactionStatus === 'Completed') {
      return {
        success: true,
        transactionID: response.data.trxID,
        amount: response.data.amount,
        paymentExecuteTime: response.data.paymentExecuteTime,
      };
    } else {
      return {
        success: false,
        error: 'Payment not completed',
        data: response.data,
      };
    }
  } catch (error) {
    console.error('bKash execute payment error:', error.response?.data || error.message);
    return {
      success: false,
      error: error.response?.data?.errorMessage || 'Failed to execute payment',
    };
  }
};

// Query bKash payment status
const queryBkashPayment = async (paymentID) => {
  try {
    const token = await getBkashToken();

    const response = await axios.get(
      `${process.env.BKASH_BASE_URL}/checkout/payment/query/${paymentID}`,
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: token,
          'X-APP-Key': process.env.BKASH_APP_KEY,
        },
      }
    );

    return {
      success: true,
      data: response.data,
    };
  } catch (error) {
    console.error('bKash query error:', error.response?.data || error.message);
    return {
      success: false,
      error: 'Failed to query payment status',
    };
  }
};

/**
 * Nagad Payment Integration
 */

const createNagadPayment = async (amount, invoiceNumber, customerPhone) => {
  try {
    // Nagad payment creation logic here
    // This is a placeholder - implement according to Nagad's API documentation
    console.log('Nagad payment not fully implemented');
    return {
      success: false,
      error: 'Nagad payment not configured',
    };
  } catch (error) {
    console.error('Nagad payment error:', error.message);
    return {
      success: false,
      error: 'Failed to create Nagad payment',
    };
  }
};

/**
 * Stripe Payment Integration
 */

let stripe;
if (process.env.STRIPE_SECRET_KEY) {
  stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
}

const createStripePaymentIntent = async (amount, currency = 'bdt') => {
  try {
    if (!stripe) {
      throw new Error('Stripe not configured');
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // Stripe uses smallest currency unit
      currency: currency,
      automatic_payment_methods: {
        enabled: true,
      },
    });

    return {
      success: true,
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
    };
  } catch (error) {
    console.error('Stripe payment intent error:', error.message);
    return {
      success: false,
      error: error.message || 'Failed to create payment intent',
    };
  }
};

const confirmStripePayment = async (paymentIntentId) => {
  try {
    if (!stripe) {
      throw new Error('Stripe not configured');
    }

    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    return {
      success: paymentIntent.status === 'succeeded',
      status: paymentIntent.status,
      amount: paymentIntent.amount / 100,
      transactionId: paymentIntent.id,
    };
  } catch (error) {
    console.error('Stripe confirm error:', error.message);
    return {
      success: false,
      error: error.message,
    };
  }
};

/**
 * Refund Payment
 */

const processRefund = async (paymentMethod, transactionId, amount) => {
  try {
    if (paymentMethod === 'bkash') {
      // bKash refund logic
      const token = await getBkashToken();
      
      const response = await axios.post(
        `${process.env.BKASH_BASE_URL}/checkout/payment/refund`,
        {
          paymentID: transactionId,
          amount: amount.toString(),
          trxID: transactionId,
          sku: 'refund',
          reason: 'Service cancellation',
        },
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: token,
            'X-APP-Key': process.env.BKASH_APP_KEY,
          },
        }
      );

      return {
        success: response.data.transactionStatus === 'Completed',
        refundTrxID: response.data.refundTrxID,
      };
    } else if (paymentMethod === 'stripe') {
      if (!stripe) {
        throw new Error('Stripe not configured');
      }

      const refund = await stripe.refunds.create({
        payment_intent: transactionId,
      });

      return {
        success: refund.status === 'succeeded',
        refundId: refund.id,
      };
    } else {
      return {
        success: false,
        error: 'Refund not supported for this payment method',
      };
    }
  } catch (error) {
    console.error('Refund error:', error.message);
    return {
      success: false,
      error: error.message || 'Failed to process refund',
    };
  }
};

/**
 * Calculate platform commission
 */

const calculateCommission = (amount, commissionRate = 15) => {
  const commission = (amount * commissionRate) / 100;
  const workerEarnings = amount - commission;
  
  return {
    totalAmount: amount,
    commission: Math.round(commission),
    workerEarnings: Math.round(workerEarnings),
    commissionRate,
  };
};

/**
 * Validate payment amount
 */

const validatePaymentAmount = (amount) => {
  const minAmount = 50; // Minimum 50 BDT
  const maxAmount = 50000; // Maximum 50,000 BDT

  if (!amount || isNaN(amount)) {
    return { valid: false, error: 'Invalid amount' };
  }

  if (amount < minAmount) {
    return { valid: false, error: `Minimum amount is ৳${minAmount}` };
  }

  if (amount > maxAmount) {
    return { valid: false, error: `Maximum amount is ৳${maxAmount}` };
  }

  return { valid: true };
};

module.exports = {
  // bKash
  createBkashPayment,
  executeBkashPayment,
  queryBkashPayment,
  
  // Nagad
  createNagadPayment,
  
  // Stripe
  createStripePaymentIntent,
  confirmStripePayment,
  
  // Common
  processRefund,
  calculateCommission,
  validatePaymentAmount,
};