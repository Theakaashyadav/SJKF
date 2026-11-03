# Payment API

This independent Node 22 service creates and verifies Razorpay orders for the foundation's static donation page. It serves no website pages and has no Next.js or third-party package dependency. The existing website continues to export to `out` and stays on its Render Static Site.

For local use, copy `.env.example` to `.env` in this directory and enter `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET` there. Keep real values out of Git and out of all `NEXT_PUBLIC_` settings. Run `npm ci`, then `npm start`; the API listens on port 4000 by default. Set the static website's public `NEXT_PUBLIC_RAZORPAY_API_URL` to `http://localhost:4000` and rebuild or restart its development server.

Deploy this directory as a separate Node Web Service with build command `npm ci` and start command `npm start`. Add the two private credential variables and `PAYMENT_ALLOWED_ORIGINS` to that service's environment. The allowlist is a comma-separated list of exact website origins, such as `https://your-static-site.onrender.com,https://www.your-domain.org`; list each domain visitors use. Production origins require HTTPS. Local HTTP is accepted only for localhost and loopback addresses. Set the static website's `NEXT_PUBLIC_RAZORPAY_API_URL` to this API's HTTPS origin and rebuild the static site.

Endpoints:

- `GET /health`: health check with no account details.
- `GET /api/payments/config/`: availability and public Key ID only.
- `POST /api/payments/order/`: integer rupee amount and supported cause; returns a provider order and signed two-hour checkout token.
- `POST /api/payments/verify/`: checkout token, order ID, payment ID and provider signature. Confirmation requires a matching captured payment, fully paid order and no refund. Authorization alone returns a pending result.

CORS permits only the configured exact origins, JSON requests, GET/POST and their preflights. Order/verify requests require an approved browser Origin. The service bounds request bodies, applies provider timeouts and uses bounded process-local request throttles. Throttles do not provide distributed protection across multiple instances.

Enable automatic capture in the Razorpay dashboard. Razorpay retains the transaction records; this service has no local payment ledger or webhooks. Reconcile interrupted browser sessions using the payment reference. Test with Razorpay test keys before switching to live keys.

`npm test` runs provider-mocked unit and local HTTP integration tests. Tests never load `.env`, call Razorpay or charge money.
