const BkashService = require('../services/bkash.service');
const { v4: uuidv4 } = require('uuid');

class PaymentController {
    // Create a payment request
    async createPayment(req, res) {
        try {
            const { amount } = req.body;
            
            if (!amount || isNaN(amount) || amount <= 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid amount provided'
                });
            }

            console.log('Received payment request:', { 
                amount, 
                body: req.body,
                headers: req.headers,
                user: req.user // If you have user authentication
            });

            // Generate a unique invoice number
            const merchantInvoiceNumber = `INV-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
            
            try {
                // Ensure amount is a string with 2 decimal places (bKash requirement)
                const formattedAmount = parseFloat(amount).toFixed(2);
                
                // Create payment in bKash
                const payment = await BkashService.createPayment(formattedAmount, merchantInvoiceNumber);
                
                console.log('Payment created successfully:', { 
                    paymentID: payment.paymentID,
                    merchantInvoiceNumber,
                    amount: formattedAmount
                });
                
                // In a real application, you would save this payment info to your database
                // await PaymentModel.create({
                //     paymentId: payment.paymentID,
                //     amount,
                //     merchantInvoiceNumber,
                //     status: 'PENDING',
                //     userId: req.user?.id // If you have user authentication
                // });

                return res.status(200).json({
                    success: true,
                    paymentID: payment.paymentID,
                    bkashURL: payment.bkashURL,
                    merchantInvoiceNumber,
                    amount: formattedAmount
                });
            } catch (error) {
                console.error('Error in bKash payment creation:', {
                    error: error.message,
                    stack: error.stack,
                    response: error.response?.data,
                    status: error.response?.status
                });
                
                // If it's a bKash API error, forward the status code and details
                if (error.response?.status) {
                    const errorData = error.response.data;
                    return res.status(error.response.status).json({
                        success: false,
                        message: errorData?.errorMessage || errorData?.message || 'Payment processing failed',
                        error: errorData || error.message,
                        details: errorData
                    });
                }
                
                throw error; // Let the outer catch handle it
            }
        } catch (error) {
            console.error('Unexpected error in createPayment:', {
                error: error.message,
                stack: error.stack
            });
            
            res.status(500).json({
                success: false,
                message: 'Failed to create payment',
                error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
            });
        }
    }

    // Execute payment after user completes the bKash payment process
    async executePayment(req, res) {
        try {
            const { paymentID } = req.body;
            
            if (!paymentID) {
                return res.status(400).json({
                    success: false,
                    message: 'Payment ID is required'
                });
            }

            // Execute the payment in bKash
            const result = await BkashService.executePayment(paymentID);
            
            // ✅ FIX: bKash success can come back in several shapes
            const statusCode = String(result?.statusCode || '').trim();
            const transactionStatus = String(result?.transactionStatus || '').trim().toLowerCase();
            const statusMessage = String(result?.statusMessage || '').trim().toLowerCase();
            const errorMessage = String(result?.errorMessage || '').trim().toLowerCase();

            const isSuccess =
                transactionStatus === 'completed' ||
                statusCode === '0000' ||
                statusMessage === 'successful' ||
                errorMessage === 'successful';

            if (isSuccess) {
                // Update payment status in your database
                // await PaymentModel.updateOne(
                //     { paymentId: paymentID },
                //     { 
                //         status: 'COMPLETED',
                //         transactionId: result.trxID,
                //         paymentDetails: result
                //     }
                // );
                
                return res.status(200).json({
                    success: true,
                    message: 'Payment successful',
                    transactionId: result.trxID,
                    amount: result.amount,
                    currency: result.currency,
                    paymentDetails: result
                });
            } else {
                // Update payment status as failed in your database
                // await PaymentModel.updateOne(
                //     { paymentId: paymentID },
                //     { 
                //         status: 'FAILED',
                //         paymentDetails: result
                //     }
                // );
                
                // Log why it failed to help debugging
                console.error("Payment Execution Failed Logic:", result);

                return res.status(400).json({
                    success: false,
                    message: result.statusMessage || 'Payment was not successful',
                    details: result
                });
            }
        } catch (error) {
            console.error('Error executing payment:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to execute payment',
                error: error.message
            });
        }
    }

    // Callback URL that bKash will call after payment
    async paymentCallback(req, res) {
        try {
            const { paymentID, status } = req.query;
            
            console.log('📞 bKash callback received:', { paymentID, status, query: req.query });
            
            if (!paymentID) {
                console.error('❌ No paymentID in callback');
                return res.redirect(`${process.env.FRONTEND_URL}/payment/error?message=No payment ID`);
            }
            
            if (status === 'success' && paymentID) {
                // Just redirect to success page - let frontend handle execution
                // This prevents double execution (callback + frontend)
                console.log('✅ Payment callback success, redirecting to frontend with paymentID:', paymentID);
                return res.redirect(`${process.env.FRONTEND_URL}/payment/success?paymentID=${encodeURIComponent(paymentID)}`);
            } else if (status === 'cancel') {
                // Handle cancelled payment
                return res.redirect(`${process.env.FRONTEND_URL}/payment/cancelled`);
            } else if (status === 'failure') {
                // Handle failed payment
                return res.redirect(`${process.env.FRONTEND_URL}/payment/failed`);
            } else {
                // Invalid status
                return res.redirect(`${process.env.FRONTEND_URL}/payment/error`);
            }
        } catch (error) {
            console.error('Error in payment callback:', error);
            return res.redirect(`${process.env.FRONTEND_URL}/payment/error`);
        }
    }

    // Query payment status
    async paymentStatus(req, res) {
        try {
            const { paymentID } = req.params;
            
            if (!paymentID) {
                return res.status(400).json({
                    success: false,
                    message: 'Payment ID is required'
                });
            }

            const paymentStatus = await BkashService.queryPayment(paymentID);
            
            res.status(200).json({
                success: true,
                paymentStatus
            });
        } catch (error) {
            console.error('Error getting payment status:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to get payment status',
                error: error.message
            });
        }
    }
}

module.exports = new PaymentController();
