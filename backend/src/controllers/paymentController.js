const { query, transaction } = require('../config/database');
const { asyncHandler } = require('../middleware/errorHandler');
const axios = require('axios');

// @desc    Initiate bKash payment
// @route   POST /api/payments/bkash/create
// @access  Private (User)
const createBkashPayment = asyncHandler(async (req, res) => {
  const { booking_id, amount } = req.body;

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

  try {
    // Get bKash token
    const tokenResponse = await axios.post(
      `${process.env.BKASH_BASE_URL}/token/grant`,
      {
        app_key: process.env.BKASH_APP_KEY,
        app_secret: process.env.BKASH_APP_SECRET
      },
      {
        headers: {
          'Content-Type': 'application/json',
          username: process.env.BKASH_USERNAME,
          password: process.env.BKASH_PASSWORD
        }
      }
    );

    const token = tokenResponse.data.id_token;

    // Create payment
    const paymentResponse = await axios.post(
      `${process.env.BKASH_BASE_URL}/checkout/payment/create`,
      {
        amount: amount.toString(),
        currency: 'BDT',
        intent: 'sale',
        merchantInvoiceNumber: booking.booking_number
      },
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: token,
          'X-APP-Key': process.env.BKASH_APP_KEY
        }
      }
    );

    res.json({
      success: true,
      data: {
        paymentID: paymentResponse.data.paymentID,
        bkashURL: paymentResponse.data.bkashURL,
        callbackURL: paymentResponse.data.callbackURL,
        amount: amount,
        booking_id: booking_id
      }
    });

  } catch (error) {
    console.error('bKash payment error:', error.response?.data || error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to create bKash payment',
      error: error.response?.data?.errorMessage || error.message
    });
  }
});

// @desc    Execute bKash payment
// @route   POST /api/payments/bkash/execute
// @access  Private (User)
const executeBkashPayment = asyncHandler(async (req, res) => {
  const { paymentID, booking_id } = req.body;

  if (!paymentID || !booking_id) {
    return res.status(400).json({
      success: false,
      message: 'Payment ID and Booking ID are required'
    });
  }

  try {
    // Get token
    const tokenResponse = await axios.post(
      `${process.env.BKASH_BASE_URL}/token/grant`,
      {
        app_key: process.env.BKASH_APP_KEY,
        app_secret: process.env.BKASH_APP_SECRET
      },
      {
        headers: {
          'Content-Type': 'application/json',
          username: process.env.BKASH_USERNAME,
          password: process.env.BKASH_PASSWORD
        }
      }
    );

    const token = tokenResponse.data.id_token;

    // Execute payment
    const executeResponse = await axios.post(
      `${process.env.BKASH_BASE_URL}/checkout/payment/execute/${paymentID}`,
      {},
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: token,
          'X-APP-Key': process.env.BKASH_APP_KEY
        }
      }
    );

    if (executeResponse.data.transactionStatus === 'Completed') {
      // Update booking payment status
      await transaction(async (client) => {
        await client.query(
          `UPDATE bookings 
           SET payment_status = 'paid',
               payment_transaction_id = $1,
               updated_at = CURRENT_TIMESTAMP
           WHERE id = $2`,
          [executeResponse.data.trxID, booking_id]
        );

        // Get booking details
        const bookingResult = await client.query(
          'SELECT * FROM bookings WHERE id = $1',
          [booking_id]
        );

        const booking = bookingResult.rows[0];

        // Notify worker
        await client.query(
          `INSERT INTO notifications (user_id, title, message, type, reference_id)
           VALUES ($1, $2, $3, $4, $5)`,
          [
            booking.worker_id,
            'Payment Received',
            'Payment has been received for your booking',
            'payment',
            booking_id
          ]
        );
      });

      res.json({
        success: true,
        message: 'Payment successful',
        data: {
          transactionID: executeResponse.data.trxID,
          amount: executeResponse.data.amount,
          paymentExecuteTime: executeResponse.data.paymentExecuteTime
        }
      });
    } else {
      res.status(400).json({
        success: false,
        message: 'Payment failed',
        data: executeResponse.data
      });
    }

  } catch (error) {
    console.error('bKash execute error:', error.response?.data || error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to execute payment',
      error: error.response?.data?.errorMessage || error.message
    });
  }
});

// @desc    Mark payment as cash (when job is completed)
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

  // Verify booking belongs to worker and is completed
  const bookingResult = await query(
    `SELECT * FROM bookings 
     WHERE id = $1 AND worker_id = $2 AND status = 'completed'`,
    [booking_id, req.user.id]
  );

  if (bookingResult.rows.length === 0) {
    return res.status(404).json({
      success: false,
      message: 'Booking not found or not authorized'
    });
  }

  const booking = bookingResult.rows[0];

  if (booking.payment_method !== 'cash') {
    return res.status(400).json({
      success: false,
      message: 'This booking was not set for cash payment'
    });
  }

  // Update payment status
  await query(
    `UPDATE bookings 
     SET payment_status = 'paid',
         payment_transaction_id = $1,
         updated_at = CURRENT_TIMESTAMP
     WHERE id = $2`,
    [`CASH-${Date.now()}`, booking_id]
  );

  // Notify user
  await query(
    `INSERT INTO notifications (user_id, title, message, type, reference_id)
     VALUES ($1, $2, $3, $4, $5)`,
    [
      booking.user_id,
      'Payment Confirmed',
      'Cash payment has been confirmed for your booking',
      'payment',
      booking_id
    ]
  );

  res.json({
    success: true,
    message: 'Cash payment marked as received'
  });
});

// @desc    Get payment history
// @route   GET /api/payments/history
// @access  Private
const getPaymentHistory = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20 } = req.query;
  const offset = (page - 1) * limit;

  let queryText = `
    SELECT 
      b.id,
      b.booking_number,
      b.final_price as amount,
      b.payment_method,
      b.payment_status,
      b.payment_transaction_id,
      b.completed_at as payment_date,
      b.service_description
  `;

  if (req.user.role === 'user') {
    queryText += `,
      w.full_name as worker_name,
      w.profile_photo as worker_photo
    FROM bookings b
    INNER JOIN users w ON b.worker_id = w.id
    WHERE b.user_id = $1 AND b.payment_status = 'paid'
    ORDER BY b.completed_at DESC
    LIMIT $2 OFFSET $3`;
  } else {
    queryText += `,
      u.full_name as user_name,
      u.profile_photo as user_photo
    FROM bookings b
    INNER JOIN users u ON b.user_id = u.id
    WHERE b.worker_id = $1 AND b.payment_status = 'paid'
    ORDER BY b.completed_at DESC
    LIMIT $2 OFFSET $3`;
  }

  const result = await query(queryText, [req.user.id, limit, offset]);

  res.json({
    success: true,
    data: result.rows
  });
});

// @desc    Refund payment (Admin only)
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

  const bookingResult = await query(
    'SELECT * FROM bookings WHERE id = $1',
    [booking_id]
  );

  if (bookingResult.rows.length === 0) {
    return res.status(404).json({
      success: false,
      message: 'Booking not found'
    });
  }

  const booking = bookingResult.rows[0];

  if (booking.payment_status !== 'paid') {
    return res.status(400).json({
      success: false,
      message: 'Cannot refund unpaid booking'
    });
  }

  // Update booking
  await transaction(async (client) => {
    await client.query(
      `UPDATE bookings 
       SET payment_status = 'refunded',
           status = 'cancelled',
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $1`,
      [booking_id]
    );

    // Notify both parties
    await client.query(
      `INSERT INTO notifications (user_id, title, message, type, reference_id)
       VALUES 
         ($1, $2, $3, $4, $5),
         ($6, $2, $3, $4, $5)`,
      [
        booking.user_id,
        'Payment Refunded',
        `Your payment has been refunded. Reason: ${reason || 'Booking cancelled'}`,
        'payment',
        booking_id,
        booking.worker_id
      ]
    );
  });

  res.json({
    success: true,
    message: 'Payment refunded successfully'
  });
});

module.exports = {
  createBkashPayment,
  executeBkashPayment,
  markCashPayment,
  getPaymentHistory,
  refundPayment
};