## SSLCommerz Setup

### Environment variables
Add these to your backend `.env` (names supported by the code):

- **`SSLC_STORE_ID`** (supported)
- **`SSLC_STORE_PASSWORD`** (supported)
- **`SSLC_BASE_URL`** (optional override, e.g. `https://sandbox.sslcommerz.com`)
- **`SSLC_SUCCESS_URL`** (optional override)
- **`SSLC_FAIL_URL`** (optional override)
- **`SSLC_CANCEL_URL`** (optional override)
- **`SSLCOMMERZ_STORE_ID`** (or `SSL_STORE_ID`)
- **`SSLCOMMERZ_STORE_PASS`** (or `SSLCOMMERZ_STORE_PASSWORD`, `SSL_STORE_PASS`, `SSL_STORE_PASSWORD`)
- **`SSLCOMMERZ_IS_LIVE`**: `true` for live, otherwise sandbox (or `SSL_IS_LIVE`)
- **`BACKEND_URL`**: e.g. `http://localhost:5050`
- **`FRONTEND_URL`**: e.g. `http://localhost:3000`

### Callback URLs (set in SSLCommerz panel)
The backend exposes these public callback endpoints:

- **Success**: `BACKEND_URL/api/payments/sslcommerz/success`
- **Fail**: `BACKEND_URL/api/payments/sslcommerz/fail`
- **Cancel**: `BACKEND_URL/api/payments/sslcommerz/cancel`
- **IPN (optional)**: `BACKEND_URL/api/payments/sslcommerz/ipn`

### How the flow works
- Frontend calls: `POST /api/payments/sslcommerz/create` → backend returns `GatewayPageURL`
- Frontend redirects user to `GatewayPageURL`
- SSLCommerz redirects back to frontend: `/payment/success?gateway=ssl&status=success&val_id=...&tran_id=...`
- Frontend calls: `POST /api/payments/sslcommerz/validate` with `val_id` + `booking_id`
- Backend validates via SSLCommerz validator API and marks the booking `paid`


