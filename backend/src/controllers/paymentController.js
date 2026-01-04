const { query, transaction } = require('../config/database');
const { asyncHandler } = require('../middleware/errorHandler');
const SslcommerzService = require('../services/sslcommerz.service');

const getBackendBaseUrl = () => process.env.BACKEND_URL || 'http://localhost:5050';
const getFrontendBaseUrl = () => process.env.FRONTEND_URL || 'http://localhost:3000';

const normalizeAmount = (amount) => {
  const n = Number(amount);
  if (Number.isNaN(n) || n <= 0) return null;
  return n.toFixed(2);
};

// @desc    Initiate bKash payment
// @route   POST /api/payments/bkash/create
// @access  Private (User)
const createBkashPayment = asyncHandler(async (req, res) => {
  const { booking_id, amount, points_to_redeem } = req.body;

  if (!booking_id || !amount) {
    return res.status(400).json({
      success: false,
      message: 'Booking ID and amount are required'
    });
  }

  // Verify booking belongs to user
  const bookingResult = await query(
    'SELECT * FROM bookings WHERE id = $1 AND user_id = $2',
    [booking_id, req.user.id]
  );

  if (bookingResult.rows.length === 0) {
    return res.status(404).json({
      success: false,
      message: 'Booking not found'
    });
  }

  const booking = bookingResult.rows[0];

  if (booking.payment_status === 'paid') {
    return res.status(400).json({
      success: false,
      message: 'This booking has already been paid'
    });
  }

  // Calculate discount if loyalty points are being redeemed
  let paymentAmount = parseFloat(amount);
  if (points_to_redeem && points_to_redeem > 0) {
    const userResult = await query(
      'SELECT loyalty_points FROM users WHERE id = $1',
      [req.user.id]
    );
    const availablePoints = userResult.rows[0]?.loyalty_points || 0;

    if (points_to_redeem <= availablePoints) {
      // Calculate discount: 10 points = 50 BDT
      const discountAmount = (points_to_redeem / 10) * 50;
      const maxDiscount = paymentAmount * 0.20; // 20% max discount
      const finalDiscount = Math.min(discountAmount, maxDiscount);
      paymentAmount = Math.max(0, paymentAmount - finalDiscount);
    }
  }

  try {
    const BkashService = require('../services/bkash.service');
    const formattedAmount = parseFloat(paymentAmount).toFixed(2);
    
    console.log('💳 Creating bKash payment:', {
      booking_id,
      amount: formattedAmount,
      booking_number: booking.booking_number,
      user_id: req.user.id
    });
    
    const payment = await BkashService.createPayment(formattedAmount, booking.booking_number);

    console.log('✅ bKash payment created:', {
      paymentID: payment?.paymentID,
      hasBkashURL: !!payment?.bkashURL
    });

    if (!payment || !payment.paymentID || !payment.bkashURL) {
      console.error('❌ Invalid payment response from bKash service:', payment);
      return res.status(500).json({
        success: false,
        message: 'Invalid response from payment gateway. Please try again.',
        error: 'Missing paymentID or bkashURL in response'
      });
    }

    res.json({
      success: true,
      data: {
        paymentID: payment.paymentID,
        bkashURL: payment.bkashURL,
        callbackURL: `${process.env.BACKEND_URL || 'http://localhost:5050'}/api/payments/bkash/callback`,
        amount: formattedAmount,
        booking_id: booking_id
      }
    });

  } catch (error) {
    console.error('❌ bKash payment error:', {
      message: error.message,
      stack: error.stack,
      status: error.status || error.response?.status,
      statusText: error.response?.statusText,
      responseData: error.response?.data,
      errorDetails: error.data || error.details,
      config: error.config ? {
        url: error.config.url,
        method: error.config.method,
        timeout: error.config.timeout
      } : null
    });
    
    const statusCode = error.status || error.response?.status || 500;
    let errorMessage = 'Failed to create bKash payment';
    
    // Try to extract meaningful error message
    if (error.response?.data) {
      errorMessage = error.response.data.errorMessage || 
                    error.response.data.message || 
                    error.response.data.statusMessage ||
                    errorMessage;
    } else if (error.message) {
      errorMessage = error.message;
    }
    
    res.status(statusCode).json({
      success: false,
      message: errorMessage,
      error: errorMessage
    });
  }
});

// @desc    Initiate SSLCommerz payment
// @route   POST /api/payments/sslcommerz/create
// @access  Private (User)
const createSslcommerzPayment = asyncHandler(async (req, res) => {
  const { booking_id, amount, points_to_redeem } = req.body;

  if (!booking_id || !amount) {
    return res.status(400).json({
      success: false,
      message: 'Booking ID and amount are required'
    });
  }

  // Verify booking belongs to user
  const bookingResult = await query(
    'SELECT * FROM bookings WHERE id = $1 AND user_id = $2',
    [booking_id, req.user.id]
  );

  if (bookingResult.rows.length === 0) {
    return res.status(404).json({
      success: false,
      message: 'Booking not found'
    });
  }

  const booking = bookingResult.rows[0];

  if (booking.payment_status === 'paid') {
    return res.status(400).json({
      success: false,
      message: 'This booking has already been paid'
    });
  }

  // Calculate discount if loyalty points are being redeemed
  let paymentAmount = parseFloat(amount);
  if (points_to_redeem && points_to_redeem > 0) {
    const userResult = await query(
      'SELECT loyalty_points FROM users WHERE id = $1',
      [req.user.id]
    );
    const availablePoints = userResult.rows[0]?.loyalty_points || 0;

    if (points_to_redeem <= availablePoints) {
      // Calculate discount: 10 points = 50 BDT
      const discountAmount = (points_to_redeem / 10) * 50;
      const maxDiscount = paymentAmount * 0.20; // 20% max discount
      const finalDiscount = Math.min(discountAmount, maxDiscount);
      paymentAmount = Math.max(0, paymentAmount - finalDiscount);
    }
  }

  const formattedAmount = normalizeAmount(paymentAmount);
  if (!formattedAmount) {
    return res.status(400).json({
      success: false,
      message: 'Invalid amount'
    });
  }

  // Check if SSLCommerz credentials are configured
  const hasStoreId = !!process.env.SSLC_STORE_ID || !!process.env.SSLCOMMERZ_STORE_ID || !!process.env.SSL_STORE_ID;
  const hasStorePassword = !!process.env.SSLC_STORE_PASSWORD || !!process.env.SSLCOMMERZ_STORE_PASSWORD || !!process.env.SSL_STORE_PASSWORD;
  
  if (!hasStoreId || !hasStorePassword) {
    console.error('❌ SSLCommerz credentials not configured');
    return res.status(500).json({
      success: false,
      message: 'Payment gateway is not configured. Please contact administrator.',
      error: 'SSLCommerz credentials missing'
    });
  }

  const tran_id = `SSL-${booking.booking_number}-${Date.now()}`;

  const backend = getBackendBaseUrl();
  const frontend = getFrontendBaseUrl();

  // Use explicit env URLs if provided (your .env uses SSLC_* keys)
  const success_url = (process.env.SSLC_SUCCESS_URL || '').trim() || `${backend}/api/payments/sslcommerz/success`;
  const fail_url = (process.env.SSLC_FAIL_URL || '').trim() || `${backend}/api/payments/sslcommerz/fail`;
  const cancel_url = (process.env.SSLC_CANCEL_URL || '').trim() || `${backend}/api/payments/sslcommerz/cancel`;
  const ipn_url = (process.env.SSLC_IPN_URL || '').trim() || `${backend}/api/payments/sslcommerz/ipn`;

  const customerName = req.user?.full_name || 'Customer';
  const customerEmail = req.user?.email || 'customer@example.com';
  const customerPhone = req.user?.phone || '01700000000';

  const initPayload = {
    total_amount: formattedAmount,
    currency: 'BDT',
    tran_id,
    success_url,
    fail_url,
    cancel_url,
    ipn_url,
    shipping_method: 'NO',
    product_name: `Booking ${booking.booking_number}`,
    product_category: 'Service',
    product_profile: 'general',
    cus_name: customerName,
    cus_email: customerEmail,
    cus_add1: 'Dhaka',
    cus_city: 'Dhaka',
    cus_state: 'Dhaka',
    cus_postcode: '1200',
    cus_country: 'Bangladesh',
    cus_phone: customerPhone,
    value_a: String(booking_id), // pass booking_id through SSLCommerz flow
    value_b: String(req.user.id)
  };

  try {
    const result = await SslcommerzService.initPayment(initPayload);

    // SSLCommerz returns status: SUCCESS/FAILED
    const sslStatus = String(result?.status || '').toUpperCase();

    if (sslStatus !== 'SUCCESS' || !result?.GatewayPageURL) {
      console.error('⚠️ SSLCommerz init failed:', {
        status: result?.status,
        failedreason: result?.failedreason,
        store_name: result?.store_name,
        desc: result?.desc
      });
      return res.status(400).json({
        success: false,
        message: result?.failedreason || 'Failed to initiate SSLCommerz payment',
        data: result
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        gateway: 'sslcommerz',
        GatewayPageURL: result.GatewayPageURL,
        tran_id,
        booking_id,
        amount: formattedAmount,
        callbackURL: `${frontend}/payment/success?gateway=ssl`
      }
    });
  } catch (err) {
    console.error('❌ SSLCommerz create error:', {
      message: err.message,
      status: err.status || err.response?.status,
      url: err.url,
      details: err.details || err.response?.data,
      env: {
        hasStoreId: !!process.env.SSLC_STORE_ID,
        hasStorePassword: !!process.env.SSLC_STORE_PASSWORD,
        ssclBaseUrl: process.env.SSLC_BASE_URL || null,
        successUrl: process.env.SSLC_SUCCESS_URL || null,
        failUrl: process.env.SSLC_FAIL_URL || null,
        cancelUrl: process.env.SSLC_CANCEL_URL || null
      }
    });
    return res.status(500).json({
      success: false,
      message: err.message || 'Failed to initiate SSLCommerz payment',
      error: err.details || err.response?.data || null
    });
  }
});

// Public callback: SSLCommerz will redirect/POST here
const sslcommerzSuccessCallback = asyncHandler(async (req, res) => {
  const val_id = req.body?.val_id || req.query?.val_id;
  const tran_id = req.body?.tran_id || req.query?.tran_id;

  // booking_id might come via value_a on some flows, but we rely on frontend localStorage as well
  const frontend = getFrontendBaseUrl();
  const qs = new URLSearchParams({
    gateway: 'ssl',
    status: 'success',
    ...(val_id ? { val_id } : {}),
    ...(tran_id ? { tran_id } : {})
  });

  return res.redirect(`${frontend}/payment/success?${qs.toString()}`);
});

const sslcommerzFailCallback = asyncHandler(async (req, res) => {
  const frontend = getFrontendBaseUrl();
  const qs = new URLSearchParams({ gateway: 'ssl', status: 'failed' });
  return res.redirect(`${frontend}/payment/success?${qs.toString()}`);
});

const sslcommerzCancelCallback = asyncHandler(async (req, res) => {
  const frontend = getFrontendBaseUrl();
  const qs = new URLSearchParams({ gateway: 'ssl', status: 'cancelled' });
  return res.redirect(`${frontend}/payment/success?${qs.toString()}`);
});

// Optional IPN endpoint (SSLCommerz server-to-server notification)
const sslcommerzIpnCallback = asyncHandler(async (req, res) => {
  // You can validate here similarly, but we keep it lightweight.
  return res.status(200).json({ success: true });
});

// @desc    Validate SSLCommerz payment and mark booking paid
// @route   POST /api/payments/sslcommerz/validate
// @access  Private (User)
const validateSslcommerzPayment = asyncHandler(async (req, res) => {
  const { val_id, booking_id, points_to_redeem } = req.body;

  console.log('🔍 validateSslcommerzPayment received:', {
    val_id,
    booking_id,
    points_to_redeem,
    points_to_redeem_type: typeof points_to_redeem
  });

  if (!val_id || !booking_id) {
    return res.status(400).json({
      success: false,
      message: 'val_id and booking_id are required'
    });
  }

  // Verify booking belongs to user
  const bookingResult = await query(
    'SELECT * FROM bookings WHERE id = $1 AND user_id = $2',
    [booking_id, req.user.id]
  );

  if (bookingResult.rows.length === 0) {
    return res.status(404).json({
      success: false,
      message: 'Booking not found'
    });
  }

  const booking = bookingResult.rows[0];
  if (booking.payment_status === 'paid') {
    return res.status(200).json({
      success: true,
      message: 'Payment already processed',
      data: { booking_id, payment_status: 'paid' }
    });
  }

  const validation = await SslcommerzService.validatePayment(val_id);
  const status = String(validation?.status || '').toUpperCase();
  const isValid = status === 'VALID' || status === 'VALIDATED';

  if (!isValid) {
    return res.status(400).json({
      success: false,
      message: 'Payment validation failed',
      data: validation
    });
  }

  const transactionId = validation?.tran_id || booking.payment_transaction_id || 'SSLCOMMERZ';

  await transaction(async (client) => {
    // Get worker's final_price (this is what worker asked for when completing the job)
    // This is the base amount that discount will be calculated from
    const workerFinalPrice = booking.final_price || booking.estimated_price || 0;
    let discountedPrice = workerFinalPrice;

    // Handle loyalty points redemption if requested - DO THIS FIRST
    // Wrap in try-catch so payment doesn't fail if loyalty points have issues
    try {
      // Convert to number and ensure it's valid
      const pointsToRedeemNum = parseInt(points_to_redeem) || 0;
      console.log('🔍 SSL Loyalty Points Redemption Check:', {
        points_to_redeem,
        pointsToRedeemNum,
        booking_id,
        user_id: booking.user_id,
        workerFinalPrice: workerFinalPrice,
        isNumber: typeof pointsToRedeemNum === 'number',
        isGreaterThanZero: pointsToRedeemNum > 0
      });

      if (pointsToRedeemNum > 0 && workerFinalPrice > 0) {
        const userResult = await client.query(
          'SELECT loyalty_points FROM users WHERE id = $1',
          [booking.user_id]
        );
        const availablePoints = userResult.rows[0]?.loyalty_points || 0;

        console.log('💰 SSL Available Points:', availablePoints, 'Requested:', pointsToRedeemNum, 'Worker Final Price:', workerFinalPrice);

        if (pointsToRedeemNum <= availablePoints) {
          // Calculate discount based on worker's final_price: 10 points = 50 BDT
          const discountAmount = (pointsToRedeemNum / 10) * 50;
          const maxDiscount = workerFinalPrice * 0.20; // 20% max discount of worker's final price
          const finalDiscount = Math.min(discountAmount, maxDiscount);
          const actualPointsNeeded = Math.floor((finalDiscount / 50) * 10);

          console.log('💸 SSL Discount Calculation:', {
            discountAmount,
            maxDiscount,
            finalDiscount,
            actualPointsNeeded,
            workerFinalPrice
          });

          if (actualPointsNeeded > 0 && actualPointsNeeded <= availablePoints) {
            console.log('✅ SSL Deducting points:', actualPointsNeeded, 'from user:', booking.user_id);
            
            // Deduct points FIRST
            const deductResult = await client.query(
              `UPDATE users 
               SET loyalty_points = GREATEST(0, loyalty_points - $1),
                   loyalty_tier = CASE
                     WHEN GREATEST(0, loyalty_points - $1) >= 150 THEN 'Gold'
                     WHEN GREATEST(0, loyalty_points - $1) >= 50 THEN 'Silver'
                     ELSE 'Bronze'
                   END
               WHERE id = $2
               RETURNING loyalty_points, loyalty_tier`,
              [actualPointsNeeded, booking.user_id]
            );

            console.log('✅ SSL Points deducted. New balance:', deductResult.rows[0]);

            // Record redemption in history (with error handling - don't fail payment if this fails)
            try {
              await client.query(
                `INSERT INTO loyalty_points_history (user_id, booking_id, points_earned, points_used, description)
                 VALUES ($1, $2, $3, $4, $5)`,
                [booking.user_id, booking_id, 0, actualPointsNeeded, `Redeemed ${actualPointsNeeded} points for ৳${finalDiscount.toFixed(2)} discount on ৳${workerFinalPrice} booking`]
              );
            } catch (loyaltyError) {
              console.error('❌ Error recording loyalty points redemption (payment will still succeed):', loyaltyError);
              // Don't throw - payment should still succeed even if loyalty points history fails
            }

            // Calculate discounted price - this is what worker will receive
            discountedPrice = Math.max(0, workerFinalPrice - finalDiscount);
            console.log('💰 SSL Price updated - Worker receives:', workerFinalPrice, '→', discountedPrice, '(Discount: ৳' + finalDiscount.toFixed(2) + ')');
          } else {
            console.log('❌ SSL Cannot deduct points:', { actualPointsNeeded, availablePoints });
          }
        } else {
          console.log('❌ SSL Insufficient points:', { requested: pointsToRedeemNum, available: availablePoints });
        }
      } else {
        console.log('ℹ️ SSL No points to redeem or worker final price not set');
      }
    } catch (loyaltyRedemptionError) {
      console.error('❌ Error processing loyalty points redemption (payment will proceed without discount):', loyaltyRedemptionError);
      // Don't throw - payment should still succeed even if loyalty points redemption fails
      // Keep discountedPrice = workerFinalPrice (no discount applied)
    }

    // Now update booking with discounted price AND mark as paid
    await client.query(
      `UPDATE bookings
       SET payment_status = 'paid',
           payment_transaction_id = $1,
           final_price = $2,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $3`,
      [transactionId, discountedPrice, booking_id]
    );

    // Get updated booking to check status
    const updatedBookingResult = await client.query(
      'SELECT status, payment_status, final_price FROM bookings WHERE id = $1',
      [booking_id]
    );
    const updatedBooking = updatedBookingResult.rows[0];

    // Re-fetch booking to get updated final_price after discount (if applied)
    const finalBookingResult = await client.query(
      'SELECT * FROM bookings WHERE id = $1',
      [booking_id]
    );
    const finalBooking = finalBookingResult.rows[0] || updatedBooking;

    // Award loyalty points only if booking is COMPLETED and PAID (use discounted price)
    if (finalBooking.status === 'completed' && finalBooking.payment_status === 'paid' && finalBooking.final_price) {
      const points = Math.floor(finalBooking.final_price / 100); // 1 point per 100 BDT (based on discounted price)
      if (points > 0) {
        // Check if points were already awarded (prevent duplicate awards)
        const existingPointsCheck = await client.query(
          'SELECT id FROM loyalty_points_history WHERE booking_id = $1 AND points_earned > 0',
          [booking_id]
        );

        if (existingPointsCheck.rows.length === 0) {
          // Record in history (with error handling - don't fail payment if this fails)
          try {
            await client.query(
              `INSERT INTO loyalty_points_history (user_id, booking_id, points_earned, description)
               VALUES ($1, $2, $3, $4)`,
              [booking.user_id, booking_id, points, 'Booking completed and paid']
            );

            // Update user points (tier will be auto-updated by trigger)
            await client.query(
              `UPDATE users 
               SET loyalty_points = loyalty_points + $1,
                   loyalty_tier = CASE
                     WHEN loyalty_points + $1 >= 150 THEN 'Gold'
                     WHEN loyalty_points + $1 >= 50 THEN 'Silver'
                     ELSE 'Bronze'
                   END
               WHERE id = $2`,
              [points, booking.user_id]
            );
          } catch (loyaltyError) {
            console.error('❌ Error awarding loyalty points (payment will still succeed):', loyaltyError);
            // Don't throw - payment should still succeed even if loyalty points fail
          }
        }
      }
    }

    // Update Worker Stats
    await client.query(
      `UPDATE worker_profiles
       SET total_jobs_completed = total_jobs_completed + 1,
           updated_at = CURRENT_TIMESTAMP
       WHERE user_id = $1`,
      [booking.worker_id]
    );

    // Notification to worker
    await client.query(
      `INSERT INTO notifications (user_id, title, message, type, reference_id)
       VALUES ($1, $2, $3, $4, $5)`,
      [
        booking.worker_id,
        'Payment Received!',
        `Payment received for booking #${booking.booking_number}`,
        'payment',
        booking_id
      ]
    );
  });

  return res.status(200).json({
    success: true,
    message: 'Payment validated and booking marked as paid',
    data: {
      transactionID: transactionId,
      amount: validation?.amount || null,
      currency: validation?.currency || 'BDT',
      validation
    }
  });
});

// @desc    Execute bKash payment
// @route   POST /api/payments/bkash/execute
// @access  Private (User)
const executeBkashPayment = asyncHandler(async (req, res) => {
  const { paymentID, booking_id, points_to_redeem } = req.body;

  console.log('🔍 executeBkashPayment received:', {
    paymentID,
    booking_id,
    points_to_redeem,
    points_to_redeem_type: typeof points_to_redeem
  });

  if (!paymentID) {
    return res.status(400).json({ success: false, message: 'Payment ID is required' });
  }

  const trimmedPaymentID = String(paymentID).trim();
  const bookingId = booking_id;

  try {
    const BkashService = require('../services/bkash.service');
    let executeResult;
    
    // 1. Try to execute payment
    try {
      console.log('🔄 Executing Payment:', trimmedPaymentID);
      executeResult = await BkashService.executePayment(trimmedPaymentID);
    } catch (executeError) {
      console.log('⚠️ Execution failed, checking status...');
      // Check if it was actually successful despite the error (common in bKash)
      try {
        const paymentStatus = await BkashService.queryPayment(trimmedPaymentID);
        if (paymentStatus.transactionStatus === 'Completed' || paymentStatus.statusCode === '0000') {
            console.log('✅ Payment was actually successful (recovered via query)');
            executeResult = paymentStatus;
        } else {
            throw executeError;
        }
      } catch (e) {
        throw executeError;
      }
    }

    // Safety check: ensure executeResult exists
    if (!executeResult) {
      console.error("❌ executeResult is null/undefined");
      return res.status(400).json({
        success: false,
        message: 'No payment result received from bKash',
        data: null
      });
    }
    
    console.log("bKash Result:", JSON.stringify(executeResult, null, 2));
    console.log("bKash Result Keys:", Object.keys(executeResult || {}));
    console.log("Checking success conditions:", {
      transactionStatus: executeResult?.transactionStatus,
      statusCode: executeResult?.statusCode,
      statusMessage: executeResult?.statusMessage,
      errorMessage: executeResult?.errorMessage,
      hasTrxID: !!executeResult?.trxID
    });
    
    // EARLY SUCCESS CHECK: If response contains '0000' or 'Successful', treat as success immediately
    const responseStrEarly = JSON.stringify(executeResult || {}).toLowerCase();
    if (responseStrEarly.includes('0000') || responseStrEarly.includes('successful')) {
      console.log("✅ EARLY SUCCESS DETECTED: Response contains '0000' or 'Successful'");
    }

    // =========================================================
    // ✅ CRITICAL FIX: Accept '0000' and 'Successful' as valid
    // Handle both statusMessage and errorMessage fields
    // Check statusCode as both string and number
    // Also check nested properties in case response is wrapped
    // =========================================================
    // Check both top-level and nested properties
    const statusCode = String(
      executeResult?.statusCode || 
      executeResult?.data?.statusCode || 
      executeResult?.response?.statusCode || 
      ''
    ).trim();
    
    const transactionStatus = String(
      executeResult?.transactionStatus || 
      executeResult?.data?.transactionStatus || 
      executeResult?.response?.transactionStatus || 
      ''
    ).trim();
    
    const statusMessage = String(
      executeResult?.statusMessage || 
      executeResult?.data?.statusMessage || 
      executeResult?.response?.statusMessage || 
      ''
    ).trim();
    
    const errorMessage = String(
      executeResult?.errorMessage || 
      executeResult?.data?.errorMessage || 
      executeResult?.response?.errorMessage || 
      ''
    ).trim();
    
    // Check if we have a trxID (strong indicator of success)
    const hasTrxID = !!(executeResult?.trxID || executeResult?.data?.trxID || executeResult?.response?.trxID);
    
    // PRIMARY SUCCESS INDICATORS (bKash specific):
    // 1. statusCode === '0000' (bKash success code)
    // 2. errorMessage === 'Successful' (bKash sometimes returns success in errorMessage)
    // 3. transactionStatus === 'Completed'
    // 4. statusMessage === 'Successful'
    
    // Convert entire response to string for comprehensive checking
    const responseStr = JSON.stringify(executeResult || {}).toLowerCase();
    
    // SIMPLE RULE: If response contains '0000' OR 'Successful', it's a success
    // This handles all bKash success scenarios regardless of field names
    const has0000 = responseStr.includes('0000');
    const hasSuccessful = responseStr.includes('successful');
    const hasSuccessIndicator = has0000 || hasSuccessful;
    
    // Also check explicit field values
    const hasSuccessCode = statusCode === '0000' || statusCode === '0' || statusCode === 0;
    const hasSuccessMessage = errorMessage.toLowerCase() === 'successful' || statusMessage.toLowerCase() === 'successful';
    const isCompleted = transactionStatus.toLowerCase() === 'completed';
    
    // PRIMARY SUCCESS CHECK: If response contains '0000' OR 'Successful', it's success
    // This is the most reliable check for bKash responses
    let isSuccess = false;
    
    if (has0000 || hasSuccessful) {
      console.log("✅ SUCCESS DETECTED: Response contains '0000' or 'Successful'");
      isSuccess = true;
    } else if (isCompleted || hasSuccessCode || hasSuccessMessage || (hasTrxID && hasSuccessCode)) {
      // Fallback checks for other success indicators
      console.log("✅ SUCCESS DETECTED: Other success indicators found");
      isSuccess = true;
    } else {
      console.log("❌ NO SUCCESS INDICATORS FOUND");
      isSuccess = false;
    }
    
    console.log("🔍 SUCCESS CHECK DEBUG:", {
      isSuccess,
      has0000,
      hasSuccessful,
      hasSuccessIndicator,
      isCompleted,
      hasSuccessCode,
      hasSuccessMessage,
      hasTrxID,
      statusCode: `"${statusCode}"`,
      errorMessage: `"${errorMessage}"`,
      statusMessage: `"${statusMessage}"`,
      transactionStatus: `"${transactionStatus}"`,
      responseStrPreview: responseStr.substring(0, 200)
    });

    console.log(`🎯 FINAL DECISION: isSuccess = ${isSuccess}, will return ${isSuccess ? '200 SUCCESS' : '400 FAILURE'}`);

    if (isSuccess) {
      console.log("✅ PROCEEDING WITH SUCCESS PATH - Returning 200");
      // Use trxID if available, otherwise use paymentID as fallback
      const transactionId = executeResult.trxID || executeResult.paymentID || trimmedPaymentID;
      
      await transaction(async (client) => {
        const bookingResult = await client.query(
          'SELECT * FROM bookings WHERE id = $1',
          [bookingId]
        );

        if (bookingResult.rows.length === 0) return;
        const booking = bookingResult.rows[0];

        if (booking.payment_status === 'paid') {
            console.log('⚠️ Booking already paid. Skipping DB update.');
            return;
        }

        // Get worker's final_price (this is what worker asked for when completing the job)
        // This is the base amount that discount will be calculated from
        const workerFinalPrice = booking.final_price || booking.estimated_price || 0;
        let discountedPrice = workerFinalPrice;

        // Handle loyalty points redemption if requested - DO THIS FIRST
        // Wrap in try-catch so payment doesn't fail if loyalty points have issues
        try {
          // Convert to number and ensure it's valid
          const pointsToRedeemNum = parseInt(points_to_redeem) || 0;
          console.log('🔍 bKash Loyalty Points Redemption Check:', {
            points_to_redeem,
            pointsToRedeemNum,
            bookingId,
            user_id: booking.user_id,
            workerFinalPrice: workerFinalPrice,
            isNumber: typeof pointsToRedeemNum === 'number',
            isGreaterThanZero: pointsToRedeemNum > 0
          });

          if (pointsToRedeemNum > 0 && workerFinalPrice > 0) {
            const userResult = await client.query(
              'SELECT loyalty_points FROM users WHERE id = $1',
              [booking.user_id]
            );
            const availablePoints = userResult.rows[0]?.loyalty_points || 0;

            console.log('💰 bKash Available Points:', availablePoints, 'Requested:', pointsToRedeemNum, 'Worker Final Price:', workerFinalPrice);

            if (pointsToRedeemNum <= availablePoints) {
              // Calculate discount based on worker's final_price: 10 points = 50 BDT
              const discountAmount = (pointsToRedeemNum / 10) * 50;
              const maxDiscount = workerFinalPrice * 0.20; // 20% max discount of worker's final price
              const finalDiscount = Math.min(discountAmount, maxDiscount);
              const actualPointsNeeded = Math.floor((finalDiscount / 50) * 10);

              console.log('💸 bKash Discount Calculation:', {
                discountAmount,
                maxDiscount,
                finalDiscount,
                actualPointsNeeded,
                workerFinalPrice
              });

              if (actualPointsNeeded > 0 && actualPointsNeeded <= availablePoints) {
                console.log('✅ bKash Deducting points:', actualPointsNeeded, 'from user:', booking.user_id);
                
                // Deduct points FIRST
                const deductResult = await client.query(
                  `UPDATE users 
                   SET loyalty_points = GREATEST(0, loyalty_points - $1),
                       loyalty_tier = CASE
                         WHEN GREATEST(0, loyalty_points - $1) >= 150 THEN 'Gold'
                         WHEN GREATEST(0, loyalty_points - $1) >= 50 THEN 'Silver'
                         ELSE 'Bronze'
                       END
                   WHERE id = $2
                   RETURNING loyalty_points, loyalty_tier`,
                  [actualPointsNeeded, booking.user_id]
                );

                console.log('✅ bKash Points deducted. New balance:', deductResult.rows[0]);

                // Record redemption in history (with error handling - don't fail payment if this fails)
                try {
                  await client.query(
                    `INSERT INTO loyalty_points_history (user_id, booking_id, points_earned, points_used, description)
                     VALUES ($1, $2, $3, $4, $5)`,
                    [booking.user_id, bookingId, 0, actualPointsNeeded, `Redeemed ${actualPointsNeeded} points for ৳${finalDiscount.toFixed(2)} discount on ৳${workerFinalPrice} booking`]
                  );
                } catch (loyaltyError) {
                  console.error('❌ Error recording loyalty points redemption (payment will still succeed):', loyaltyError);
                  // Don't throw - payment should still succeed even if loyalty points history fails
                }

                // Calculate discounted price - this is what worker will receive
                discountedPrice = Math.max(0, workerFinalPrice - finalDiscount);
                console.log('💰 bKash Price updated - Worker receives:', workerFinalPrice, '→', discountedPrice, '(Discount: ৳' + finalDiscount.toFixed(2) + ')');
              } else {
                console.log('❌ bKash Cannot deduct points:', { actualPointsNeeded, availablePoints });
              }
            } else {
              console.log('❌ bKash Insufficient points:', { requested: pointsToRedeemNum, available: availablePoints });
            }
          } else {
            console.log('ℹ️ bKash No points to redeem or worker final price not set');
          }
        } catch (loyaltyRedemptionError) {
          console.error('❌ Error processing loyalty points redemption (payment will proceed without discount):', loyaltyRedemptionError);
          // Don't throw - payment should still succeed even if loyalty points redemption fails
          // Keep discountedPrice = workerFinalPrice (no discount applied)
        }

        // Now update booking with discounted price AND mark as paid
        await client.query(
          `UPDATE bookings 
           SET payment_status = 'paid', 
               payment_transaction_id = $1, 
               final_price = $2,
               updated_at = CURRENT_TIMESTAMP 
           WHERE id = $3`,
          [transactionId, discountedPrice, bookingId]
        );

        // Get updated booking to check status
        const updatedBookingResult = await client.query(
          'SELECT status, payment_status, final_price FROM bookings WHERE id = $1',
          [bookingId]
        );
        const updatedBooking = updatedBookingResult.rows[0];

        // Re-fetch booking to get updated final_price after discount (if applied)
        const finalBookingResult = await client.query(
          'SELECT * FROM bookings WHERE id = $1',
          [bookingId]
        );
        const finalBooking = finalBookingResult.rows[0] || updatedBooking;

        // Award loyalty points only if booking is COMPLETED and PAID (use discounted price)
        if (finalBooking.status === 'completed' && finalBooking.payment_status === 'paid' && finalBooking.final_price) {
          const points = Math.floor(finalBooking.final_price / 100); // 1 point per 100 BDT (based on discounted price)
          if (points > 0) {
            // Check if points were already awarded (prevent duplicate awards)
            const existingPointsCheck = await client.query(
              'SELECT id FROM loyalty_points_history WHERE booking_id = $1 AND points_earned > 0',
              [bookingId]
            );

            if (existingPointsCheck.rows.length === 0) {
              // Record in history
              await client.query(
                `INSERT INTO loyalty_points_history (user_id, booking_id, points_earned, description)
                 VALUES ($1, $2, $3, $4)`,
                [booking.user_id, bookingId, points, 'Booking completed and paid']
              );

              // Update user points (tier will be auto-updated by trigger)
              await client.query(
                `UPDATE users 
                 SET loyalty_points = loyalty_points + $1,
                     loyalty_tier = CASE
                       WHEN loyalty_points + $1 >= 150 THEN 'Gold'
                       WHEN loyalty_points + $1 >= 50 THEN 'Silver'
                       ELSE 'Bronze'
                     END
                 WHERE id = $2`,
                [points, booking.user_id]
              );
            }
          }
        }

        // Update Worker Stats
        await client.query(
          `UPDATE worker_profiles SET total_jobs_completed = total_jobs_completed + 1, updated_at = CURRENT_TIMESTAMP WHERE user_id = $1`,
          [booking.worker_id]
        );

        // Notification
        await client.query(
          `INSERT INTO notifications (user_id, title, message, type, reference_id) VALUES ($1, $2, $3, $4, $5)`,
          [booking.worker_id, 'Payment Received! 💰', `Payment received for booking #${booking.booking_number}`, 'payment', bookingId]
        );
      });

      // Explicitly return 200 status for successful payment
      return res.status(200).json({
        success: true,
        message: 'Payment successful',
        data: {
          transactionID: transactionId,
          amount: executeResult.amount || null
        }
      });
    } else {
      console.error("❌ Payment Failed Logic Triggered:", executeResult);
      const errorMsg = executeResult?.statusMessage || executeResult?.errorMessage || 'Payment failed';
      return res.status(400).json({
        success: false,
        message: errorMsg,
        statusCode: executeResult?.statusCode,
        data: executeResult
      });
    }

  } catch (error) {
    console.error('❌ bKash execute error:', error.message);
    const statusCode = error.status || error.response?.status || 500;
    res.status(statusCode).json({
      success: false,
      message: error.message || 'Failed to execute payment',
      error: error.message
    });
  }
});

// @desc    Mark cash payment (worker confirms cash received)
// @route   POST /api/payments/cash
// @access  Private (Worker)
const markCashPayment = asyncHandler(async (req, res) => {
  const { booking_id } = req.body;

  if (!booking_id) {
    return res.status(400).json({
      success: false,
      message: 'Booking ID is required'
    });
  }

  const result = await transaction(async (client) => {
    const bookingRes = await client.query(
      'SELECT * FROM bookings WHERE id = $1 AND worker_id = $2',
      [booking_id, req.user.id]
    );

    if (bookingRes.rows.length === 0) {
      return null;
    }

    const booking = bookingRes.rows[0];

    // Idempotent: if already paid, just return booking
    if (booking.payment_status === 'paid') {
      return booking;
    }

    const transactionId = 'CASH';

    const updated = await client.query(
      `UPDATE bookings
       SET payment_status = 'paid',
           payment_transaction_id = $1,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $2
       RETURNING *`,
      [transactionId, booking_id]
    );

    // Update Worker Stats
    await client.query(
      `UPDATE worker_profiles
       SET total_jobs_completed = total_jobs_completed + 1,
           updated_at = CURRENT_TIMESTAMP
       WHERE user_id = $1`,
      [booking.worker_id]
    );

    // Get updated booking to check status
    const updatedBookingResult = await client.query(
      'SELECT status, payment_status, final_price FROM bookings WHERE id = $1',
      [booking_id]
    );
    const updatedBooking = updatedBookingResult.rows[0];

    // Award loyalty points only if booking is COMPLETED and PAID
    if (updatedBooking.status === 'completed' && updatedBooking.payment_status === 'paid' && updatedBooking.final_price) {
      const points = Math.floor(updatedBooking.final_price / 100); // 1 point per 100 BDT
      if (points > 0) {
        // Check if points were already awarded (prevent duplicate awards)
        const existingPointsCheck = await client.query(
          'SELECT id FROM loyalty_points_history WHERE booking_id = $1 AND points_earned > 0',
          [booking_id]
        );

        if (existingPointsCheck.rows.length === 0) {
          // Record in history (with error handling - don't fail payment if this fails)
          try {
            await client.query(
              `INSERT INTO loyalty_points_history (user_id, booking_id, points_earned, description)
               VALUES ($1, $2, $3, $4)`,
              [booking.user_id, booking_id, points, 'Booking completed and paid']
            );

            // Update user points (tier will be auto-updated by trigger)
            await client.query(
              `UPDATE users 
               SET loyalty_points = loyalty_points + $1,
                   loyalty_tier = CASE
                     WHEN loyalty_points + $1 >= 150 THEN 'Gold'
                     WHEN loyalty_points + $1 >= 50 THEN 'Silver'
                     ELSE 'Bronze'
                   END
               WHERE id = $2`,
              [points, booking.user_id]
            );
          } catch (loyaltyError) {
            console.error('❌ Error awarding loyalty points (payment will still succeed):', loyaltyError);
            // Don't throw - payment should still succeed even if loyalty points fail
          }
        }
      }
    }

    // Notify user that cash payment was confirmed
    await client.query(
      `INSERT INTO notifications (user_id, title, message, type, reference_id)
       VALUES ($1, $2, $3, $4, $5)`,
      [
        booking.user_id,
        'Cash Payment Confirmed',
        `Cash payment confirmed for booking #${booking.booking_number}`,
        'payment',
        booking_id
      ]
    );

    return updated.rows[0];
  });

  if (!result) {
    return res.status(404).json({
      success: false,
      message: 'Booking not found'
    });
  }

  return res.status(200).json({
    success: true,
    message: 'Cash payment marked as paid',
    data: result
  });
});

// @desc    Get payment history (paid bookings)
// @route   GET /api/payments/history
// @access  Private
const getPaymentHistory = asyncHandler(async (req, res) => {
  const page = Math.max(parseInt(req.query.page || '1', 10), 1);
  const limit = Math.min(Math.max(parseInt(req.query.limit || '20', 10), 1), 100);
  const offset = (page - 1) * limit;

  let whereClause = `WHERE payment_status = 'paid'`;
  const params = [];

  if (req.user.role === 'user') {
    params.push(req.user.id);
    whereClause += ` AND user_id = $${params.length}`;
  } else if (req.user.role === 'worker') {
    params.push(req.user.id);
    whereClause += ` AND worker_id = $${params.length}`;
  }

  const countRes = await query(
    `SELECT COUNT(*)::int AS count FROM bookings ${whereClause}`,
    params
  );

  const listRes = await query(
    `SELECT *
     FROM bookings
     ${whereClause}
     ORDER BY updated_at DESC NULLS LAST, created_at DESC
     LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
    [...params, limit, offset]
  );

  return res.status(200).json({
    success: true,
    data: listRes.rows,
    pagination: {
      page,
      limit,
      total: countRes.rows[0]?.count || 0
    }
  });
});

// @desc    Refund payment (admin marks booking as refunded)
// @route   POST /api/payments/refund
// @access  Private (Admin)
const refundPayment = asyncHandler(async (req, res) => {
  const { booking_id, reason } = req.body;

  if (!booking_id) {
    return res.status(400).json({
      success: false,
      message: 'Booking ID is required'
    });
  }

  const refunded = await transaction(async (client) => {
    const bookingRes = await client.query(
      'SELECT * FROM bookings WHERE id = $1',
      [booking_id]
    );

    if (bookingRes.rows.length === 0) return null;

    const booking = bookingRes.rows[0];

    const updated = await client.query(
      `UPDATE bookings
       SET payment_status = 'refunded',
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $1
       RETURNING *`,
      [booking_id]
    );

    // Notify user & worker
    const msg = reason
      ? `Payment refunded for booking #${booking.booking_number}. Reason: ${reason}`
      : `Payment refunded for booking #${booking.booking_number}.`;

    await client.query(
      `INSERT INTO notifications (user_id, title, message, type, reference_id)
       VALUES ($1, $2, $3, $4, $5)`,
      [booking.user_id, 'Payment Refunded', msg, 'payment', booking_id]
    );

    if (booking.worker_id) {
      await client.query(
        `INSERT INTO notifications (user_id, title, message, type, reference_id)
         VALUES ($1, $2, $3, $4, $5)`,
        [booking.worker_id, 'Payment Refunded', msg, 'payment', booking_id]
      );
    }

    return updated.rows[0];
  });

  if (!refunded) {
    return res.status(404).json({
      success: false,
      message: 'Booking not found'
    });
  }

  return res.status(200).json({
    success: true,
    message: 'Payment refunded',
    data: refunded
  });
});

module.exports = {
  createBkashPayment,
  executeBkashPayment,
  createSslcommerzPayment,
  validateSslcommerzPayment,
  sslcommerzSuccessCallback,
  sslcommerzFailCallback,
  sslcommerzCancelCallback,
  sslcommerzIpnCallback,
  markCashPayment,
  getPaymentHistory,
  refundPayment
};