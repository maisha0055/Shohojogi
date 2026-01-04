// test-bkash-payment.js
const axios = require('axios');
const config = {
  baseURL: 'https://tokenized.sandbox.bka.sh/v1.2.0-beta/tokenized',
  appKey: '4f6o0cjiki2rfm34kfdadl1eqq',
  username: 'sandboxTokenizedUser02',
  password: 'sandboxTokenizedUser02@12345'
};
let authToken = '';
async function getAuthToken() {
  try {
    console.log('🔑 Getting auth token...');
    const response = await axios.post(
      `${config.baseURL}/checkout/token/grant`,
      {
        app_key: config.appKey,
        app_secret: '2is7hdktrekvrbljjh44ll3d9l1dtjo4pasmjvs5vl5qr3fug4b'
      },
      {
        headers: {
          'Content-Type': 'application/json',
          username: config.username,
          password: config.password
        }
      }
    );
    authToken = response.data.id_token;
    console.log('✅ Auth token received');
    return authToken;
  } catch (error) {
    console.error('❌ Failed to get auth token:');
    console.error(error.response?.data || error.message);
    throw error;
  }
}
async function createPayment(amount = '100.00') {
  try {
    console.log('\n💳 Creating payment...');
    const merchantInvoiceNumber = `INV-${Date.now()}`;
    
    const response = await axios.post(
      `${config.baseURL}/checkout/create`,
      {
        mode: '0000',
        payerReference: ' ',
        callbackURL: 'http://localhost:5050/api/payment/bkash/callback',
        amount: amount,
        currency: 'BDT',
        merchantInvoiceNumber: merchantInvoiceNumber,
        intent: 'sale'
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': authToken,
          'X-APP-Key': config.appKey
        }
      }
    );
    console.log('✅ Payment created successfully!');
    console.log('Payment ID:', response.data.paymentID);
    console.log('bKash URL:', response.data.bkashURL);
    return response.data;
  } catch (error) {
    console.error('❌ Payment creation failed:');
    console.error('Status:', error.response?.status);
    console.error('Response:', error.response?.data);
    console.error('Error:', error.message);
    throw error;
  }
}
// Run the test
async function runTest() {
  try {
    await getAuthToken();
    await createPayment('100.00');
    console.log('\n🎉 Test completed successfully!');
  } catch (error) {
    console.error('\n❌ Test failed!');
    process.exit(1);
  }
}
runTest();