const axios = require('axios');
const crypto = require('crypto');

class BkashService {
    constructor() {
        // Use the correct base URL format from test-bkash.js
        this.baseURL = process.env.BKASH_BASE_URL || 'https://tokenized.sandbox.bka.sh/v1.2.0-beta/tokenized';
        // If baseURL doesn't end with /tokenized, append it
        if (!this.baseURL.endsWith('/tokenized')) {
            this.baseURL = this.baseURL.replace(/\/$/, '') + '/tokenized';
        }
        this.appKey = process.env.BKASH_APP_KEY || '4f6o0cjiki2rfm34kfdadl1eqq';
        this.appSecret = process.env.BKASH_APP_SECRET || '2is7hdktrekvrbljjh44ll3d9l1dtjo4pasmjvs5vl5qr3fug4b';
        this.username = process.env.BKASH_USERNAME || 'sandboxTokenizedUser02';
        this.password = process.env.BKASH_PASSWORD || 'sandboxTokenizedUser02@12345';
        this.token = null;
        this.tokenExpires = null;
    }

    async getAuthToken() {
        try {
            // Check if token exists and is not expired
            if (this.token && this.tokenExpires > Date.now()) {
                console.log('Using cached bKash token');
                return this.token;
            }

            console.log('🔑 Attempting to get bKash auth token...');
            console.log('Config:', {
                baseURL: this.baseURL,
                endpoint: `${this.baseURL}/checkout/token/grant`,
                appKey: this.appKey ? `${this.appKey.substring(0, 10)}...` : 'MISSING',
                username: this.username ? '***' : 'MISSING',
                hasAppSecret: !!this.appSecret,
                hasPassword: !!this.password
            });

            const response = await axios.post(
                `${this.baseURL}/checkout/token/grant`,
                {
                    app_key: this.appKey,
                    app_secret: this.appSecret
                },
                {
                    headers: {
                        'Content-Type': 'application/json',
                        username: this.username,
                        password: this.password
                    },
                    timeout: 20000 // 20 seconds timeout (increased for reliability)
                }
            );

            console.log('✅ bKash auth response:', {
                status: response.status,
                statusText: response.statusText,
                hasToken: !!response.data?.id_token
            });

            if (!response.data || !response.data.id_token) {
                console.error('❌ Invalid response from bKash:', response.data);
                throw new Error('Invalid response from bKash: Missing id_token');
            }

            this.token = response.data.id_token;
            // Set token to expire 50 minutes from now (tokens typically last 1 hour)
            this.tokenExpires = Date.now() + 50 * 60 * 1000;
            
            console.log('✅ Token received and cached');
            return this.token;
        } catch (error) {
            console.error('❌ Error getting bKash auth token:', {
                message: error.message,
                status: error.response?.status,
                statusText: error.response?.statusText,
                data: error.response?.data,
                config: {
                    url: error.config?.url,
                    method: error.config?.method,
                    headers: error.config?.headers ? Object.keys(error.config.headers) : null
                }
            });
            
            // Reset token on error so we try fresh next time
            this.token = null;
            this.tokenExpires = null;
            
            throw new Error(`Failed to authenticate with bKash: ${error.response?.data?.errorMessage || error.message}`);
        }
    }

    async createPayment(amount, merchantInvoiceNumber) {
        try {
            const token = await this.getAuthToken();
            
            if (!token) {
                throw new Error('Failed to get authentication token');
            }
            
            const callbackURL = `${process.env.BACKEND_URL || 'http://localhost:5050'}/api/payments/bkash/callback`;
            
            console.log('💳 Creating bKash payment with:', {
                amount,
                merchantInvoiceNumber,
                callbackURL: callbackURL,
                tokenLength: token ? token.length : 0,
                baseURL: this.baseURL
            });

            const payload = {
                mode: '0000', // 0000 for sandbox, 0011 for live
                payerReference: ' ',
                callbackURL: callbackURL,
                amount: amount.toString(), // Ensure amount is a string
                currency: 'BDT',
                merchantInvoiceNumber: merchantInvoiceNumber,
                intent: 'sale'
            };

            console.log('📤 Sending payment request to bKash:', {
                url: `${this.baseURL}/checkout/create`,
                payload: { ...payload, amount: payload.amount },
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': token ? `${token.substring(0, 20)}...` : 'MISSING',
                    'X-APP-Key': this.appKey ? `${this.appKey.substring(0, 10)}...` : 'MISSING'
                }
            });
            
            const response = await axios.post(
                `${this.baseURL}/checkout/create`,
                payload,
                {
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': token, // Just the token, not "Bearer token"
                        'X-APP-Key': this.appKey
                    },
                    timeout: 20000 // 20 seconds timeout (increased for reliability)
                }
            );

            console.log('✅ bKash payment response:', {
                status: response.status,
                statusText: response.statusText,
                hasPaymentID: !!response.data?.paymentID,
                hasBkashURL: !!response.data?.bkashURL,
                fullResponse: response.data
            });

            if (!response.data) {
                console.error('❌ Invalid response from bKash: No data in response');
                throw new Error('Invalid response from bKash: No data received');
            }

            if (!response.data.paymentID) {
                console.error('❌ Invalid response from bKash: Missing paymentID. Response:', JSON.stringify(response.data, null, 2));
                throw new Error('Invalid response from bKash: Missing paymentID');
            }

            if (!response.data.bkashURL) {
                console.error('❌ Invalid response from bKash: Missing bkashURL. Response:', JSON.stringify(response.data, null, 2));
                throw new Error('Invalid response from bKash: Missing bkashURL');
            }

            return response.data;
        } catch (error) {
            console.error('❌ Error creating bKash payment:', {
                message: error.message,
                status: error.response?.status,
                statusText: error.response?.statusText,
                data: error.response?.data,
                config: {
                    url: error.config?.url,
                    method: error.config?.method,
                    headers: error.config?.headers ? {
                        'Content-Type': error.config.headers['Content-Type'],
                        'Authorization': error.config.headers['Authorization'] ? '***' : 'MISSING',
                        'X-APP-Key': error.config.headers['X-APP-Key'] ? '***' : 'MISSING'
                    } : null
                }
            });
            
            // If we get a 403, the token might be invalid - clear it and try once more
            if (error.response?.status === 403) {
                console.log('⚠️  Got 403 Forbidden - clearing token cache and retrying...');
                this.token = null;
                this.tokenExpires = null;
                
                // Try once more with a fresh token
                try {
                    const freshToken = await this.getAuthToken();
                    console.log('🔄 Retrying payment creation with fresh token...');
                    
                    const retryResponse = await axios.post(
                        `${this.baseURL}/checkout/create`,
                        payload,
                        {
                            headers: {
                                'Content-Type': 'application/json',
                                'Authorization': freshToken,
                                'X-APP-Key': this.appKey
                            },
                            timeout: 20000
                        }
                    );
                    
                    if (retryResponse.data?.paymentID) {
                        console.log('✅ Payment created successfully on retry');
                        return retryResponse.data;
                    }
                } catch (retryError) {
                    console.error('❌ Retry also failed:', retryError.response?.data || retryError.message);
                }
            }
            
            // Preserve the original error for better debugging
            if (error.response?.data) {
                const err = new Error(error.response.data.errorMessage || error.response.data.message || 'Failed to create bKash payment');
                err.status = error.response.status;
                err.data = error.response.data;
                throw err;
            }
            
            throw error;
        }
    }

    async executePayment(paymentID) {
        try {
            console.log('🔄 Executing bKash payment:', { paymentID, baseURL: this.baseURL });
            const token = await this.getAuthToken();
            
            const response = await axios.post(
                `${this.baseURL}/checkout/execute`,
                { paymentID },
                {
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': token,
                        'X-APP-Key': this.appKey
                    },
                    timeout: 15000
                }
            );

            console.log('✅ Payment execution response:', {
                status: response.status,
                transactionStatus: response.data?.transactionStatus,
                hasTrxID: !!response.data?.trxID
            });

            return response.data;
        } catch (error) {
            console.error('❌ Error executing bKash payment:', {
                message: error.message,
                status: error.response?.status,
                statusText: error.response?.statusText,
                data: error.response?.data,
                paymentID
            });

            // Handle 403 Forbidden - token expired, retry with fresh token
            if (error.response?.status === 403) {
                console.log('⚠️  Got 403 Forbidden - clearing token cache and retrying...');
                this.token = null;
                this.tokenExpires = null;
                
                // Try once more with a fresh token
                try {
                    const freshToken = await this.getAuthToken();
                    console.log('🔄 Retrying payment execution with fresh token...');
                    
                    const retryResponse = await axios.post(
                        `${this.baseURL}/checkout/execute`,
                        { paymentID },
                        {
                            headers: {
                                'Content-Type': 'application/json',
                                'Authorization': freshToken,
                                'X-APP-Key': this.appKey
                            },
                            timeout: 20000
                        }
                    );
                    
                    if (retryResponse.data) {
                        console.log('✅ Payment executed successfully on retry');
                        return retryResponse.data;
                    } else {
                        console.error('❌ Retry response missing data:', retryResponse);
                        throw new Error('Retry response missing data');
                    }
                } catch (retryError) {
                    console.error('❌ Retry also failed:', {
                        message: retryError.message,
                        status: retryError.response?.status,
                        data: retryError.response?.data
                    });
                    // If retry fails, throw the retry error instead of original
                    if (retryError.response?.data) {
                        const err = new Error(retryError.response.data.errorMessage || retryError.response.data.message || 'Failed to execute bKash payment (retry failed)');
                        err.status = retryError.response.status;
                        err.data = retryError.response.data;
                        throw err;
                    }
                    throw retryError;
                }
            }
            
            // Preserve the original error details (only if not a 403 that we tried to retry)
            if (error.response?.data) {
                const err = new Error(error.response.data.errorMessage || error.response.data.message || 'Failed to execute bKash payment');
                err.status = error.response.status;
                err.data = error.response.data;
                throw err;
            }
            
            throw error;
        }
    }

    async queryPayment(paymentID) {
        try {
            console.log('🔍 Querying bKash payment status:', { paymentID });
            const token = await this.getAuthToken();
            
            const response = await axios.post(
                `${this.baseURL}/checkout/payment/status`,
                { paymentID },
                {
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': token,
                        'X-APP-Key': this.appKey
                    },
                    timeout: 15000
                }
            );

            console.log('✅ Payment query response:', {
                status: response.status,
                transactionStatus: response.data?.transactionStatus,
                hasTrxID: !!response.data?.trxID
            });

            return response.data;
        } catch (error) {
            console.error('❌ Error querying bKash payment:', {
                message: error.message,
                status: error.response?.status,
                data: error.response?.data
            });

            // Handle 403 Forbidden - token expired, retry with fresh token
            if (error.response?.status === 403) {
                console.log('⚠️  Got 403 on query - clearing token cache and retrying...');
                this.token = null;
                this.tokenExpires = null;
                
                try {
                    const freshToken = await this.getAuthToken();
                    console.log('🔄 Retrying payment query with fresh token...');
                    
                    const retryResponse = await axios.post(
                        `${this.baseURL}/checkout/payment/status`,
                        { paymentID },
                        {
                            headers: {
                                'Content-Type': 'application/json',
                                'Authorization': freshToken,
                                'X-APP-Key': this.appKey
                            },
                            timeout: 20000
                        }
                    );
                    
                    if (retryResponse.data) {
                        console.log('✅ Payment queried successfully on retry');
                        return retryResponse.data;
                    }
                } catch (retryError) {
                    console.error('❌ Query retry also failed:', retryError.response?.data || retryError.message);
                    // If query fails, we'll just proceed with execution
                    throw new Error('Failed to query payment status');
                }
            }
            
            // For other errors, throw a generic error (we'll try execution anyway)
            throw new Error('Failed to query bKash payment');
        }
    }

    verifyCallback(data) {
        try {
            const { paymentID, status, amount, msisdn, trxID, reference, merchantInvoiceNumber } = data;
            
            // Verify the payment with bKash
            return this.queryPayment(paymentID)
                .then(paymentInfo => {
                    if (paymentInfo.transactionStatus === 'Completed' && 
                        paymentInfo.amount === amount && 
                        paymentInfo.merchantInvoiceNumber === merchantInvoiceNumber) {
                        return {
                            success: true,
                            paymentID,
                            trxID,
                            amount,
                            msisdn,
                            merchantInvoiceNumber,
                            paymentInfo
                        };
                    }
                    return { success: false, error: 'Payment verification failed' };
                });
        } catch (error) {
            console.error('Error in bKash callback verification:', error);
            return { success: false, error: error.message };
        }
    }
}

module.exports = new BkashService();
