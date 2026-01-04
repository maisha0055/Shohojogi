const axios = require('axios');

function boolFromEnv(val) {
  return ['true', '1', 'yes', 'y', 'on'].includes(String(val || '').toLowerCase().trim());
}

function getSslConfig() {
  const store_id =
    process.env.SSLCOMMERZ_STORE_ID ||
    process.env.SSL_STORE_ID ||
    process.env.SSLC_STORE_ID;

  const store_passwd =
    process.env.SSLCOMMERZ_STORE_PASS ||
    process.env.SSLCOMMERZ_STORE_PASSWORD ||
    process.env.SSL_STORE_PASS ||
    process.env.SSL_STORE_PASSWORD ||
    process.env.SSLC_STORE_PASS ||
    process.env.SSLC_STORE_PASSWORD; // exact key user provided

  // Explicit base URL override (user-provided)
  const envBaseUrl =
    process.env.SSLC_BASE_URL ||
    process.env.SSLCOMMERZ_BASE_URL ||
    process.env.SSL_BASE_URL;

  const is_live = boolFromEnv(
    process.env.SSLCOMMERZ_IS_LIVE ||
      process.env.SSL_IS_LIVE ||
      process.env.SSLC_IS_LIVE ||
      process.env.SSLC_LIVE
  );

  if (!store_id || !store_passwd) {
    throw new Error('SSLCommerz store credentials are missing (STORE_ID / STORE_PASS)');
  }

  const baseURLRaw =
    envBaseUrl || (is_live ? 'https://securepay.sslcommerz.com' : 'https://sandbox.sslcommerz.com');
  const baseURL = String(baseURLRaw).replace(/\/+$/, '');

  // Derive origin so even if a full API URL is provided, we can still build correct endpoints.
  let origin = baseURL;
  try {
    origin = new URL(baseURL).origin;
  } catch (_) {
    // If baseURL is not a valid absolute URL, keep as-is.
  }

  return { store_id, store_passwd, is_live, baseURL, origin };
}

async function initPayment(payload) {
  const { store_id, store_passwd, baseURL, origin } = getSslConfig();

  // If SSLC_BASE_URL is a full endpoint, use it directly; otherwise use origin-based standard endpoint.
  const initUrl =
    baseURL.toLowerCase().includes('api.php') ? baseURL : `${origin}/gwprocess/v4/api.php`;

  try {
    // SSLCommerz expects x-www-form-urlencoded (not JSON)
    const form = new URLSearchParams();
    form.set('store_id', store_id);
    form.set('store_passwd', store_passwd);
    Object.entries(payload || {}).forEach(([k, v]) => {
      if (v === undefined || v === null) return;
      form.set(k, String(v));
    });

    const res = await axios.post(initUrl, form.toString(), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      timeout: 15000
    });
    return res.data;
  } catch (error) {
    const status = error.response?.status;
    const data = error.response?.data;
    const msg =
      (typeof data === 'string' && data) ||
      data?.failedreason ||
      data?.message ||
      error.message ||
      'SSLCommerz initPayment failed';

    const err = new Error(msg);
    err.status = status;
    err.details = data;
    err.url = initUrl;
    throw err;
  }
}

async function validatePayment(val_id) {
  const { store_id, store_passwd, baseURL, origin } = getSslConfig();

  const validatorBase =
    baseURL.toLowerCase().includes('validationserverapi.php')
      ? baseURL
      : `${origin}/validator/api/validationserverAPI.php`;

  const url =
    `${validatorBase}` +
    `?val_id=${encodeURIComponent(val_id)}` +
    `&store_id=${encodeURIComponent(store_id)}` +
    `&store_passwd=${encodeURIComponent(store_passwd)}` +
    `&v=1&format=json`;

  try {
    const res = await axios.get(url);
    return res.data;
  } catch (error) {
    const status = error.response?.status;
    const data = error.response?.data;
    const msg =
      (typeof data === 'string' && data) ||
      data?.message ||
      error.message ||
      'SSLCommerz validatePayment failed';

    const err = new Error(msg);
    err.status = status;
    err.details = data;
    err.url = url;
    throw err;
  }
}

module.exports = {
  initPayment,
  validatePayment
};


