# Google Sheets payment backend

This Apps Script web app is the only payment backend needed by the static website. Razorpay processes payments; Apps Script creates orders, verifies the callback and provider records, and writes a private Google Sheets ledger. The website is still an HTML/CSS/JavaScript export in `out/`.

## Deploy

1. Create a **private Google spreadsheet** owned by the account that will deploy the script. Copy its ID from `https://docs.google.com/spreadsheets/d/SPREADSHEET_ID/edit`. Donors do not need access to this sheet.
2. From the sheet choose **Extensions → Apps Script**. Replace `Code.gs` with this directory's `Code.gs`. In **Project Settings**, enable **Show "appsscript.json" manifest file in editor**, then replace that manifest with this directory's `appsscript.json`.
3. In **Project Settings → Script Properties**, add:

   | Property | Value |
   | --- | --- |
   | `RAZORPAY_KEY_ID` | Razorpay Test Mode Key ID initially |
   | `RAZORPAY_KEY_SECRET` | The matching Test Mode Key Secret |
   | `SPREADSHEET_ID` | Spreadsheet ID from step 1 |

   Copy the existing matching credentials from your private `payment-api/.env` if needed. Do not put the Secret in frontend environment variables, JavaScript, the Sheet or this source file.

4. In the editor, select **`setup` → Run** and authorize the requested services. This creates the `Donations` tab without deleting existing rows. It does not create a Razorpay order or charge a payment. Keep the tab and its header columns unchanged; using filters is fine. Do not manually sort the tab while payments are being processed.
5. Run **`installReconciliationTrigger`** once. It installs an idempotent time trigger that calls `reconcilePendingPayments` every ten minutes. Install this as the same Google account that owns the deployment and Sheet. The editor's **Triggers/Executions** views let you monitor it.
6. Choose **Deploy → New deployment → Web app**. Set **Execute as: Me** and **Who has access: Anyone**, then deploy. This allows donors to use checkout without signing into Google; the spreadsheet remains private. Some Workspace administrators disallow anonymous web apps. In that case this account cannot host this backend until the administrator permits it.
7. Copy the deployed **`https://script.google.com/macros/s/DEPLOYMENT_ID/exec`** URL. Use `/exec`, not the editor's `/dev` test URL. Open `URL?action=config` in an incognito window: it must return `{"ok":true,"configured":true,"keyId":"rzp_test_..."}` without a login prompt.
8. Add the `/exec` URL to the website's public Apps Script URL setting described in the [website README](../README.md), then rebuild and redeploy the static site. Changing a frontend environment variable requires a rebuild. The legacy Node payment server does not need to run.
9. Enable **automatic capture** in the Razorpay dashboard. Run a complete Razorpay **Test Mode** payment from the deployed website. Confirm the website displays verification and the Sheet has one matching `captured` row. Test pending/failed/cancelled checkout and interrupted-browser recovery as well. Only after testing and account activation, replace both Script Properties with the matching Live Mode keys, and confirm the live checkout configuration.

After source changes, use **Deploy → Manage deployments → Edit → New version → Deploy** to update the existing deployment and preserve its URL. Saving code alone does not update an existing versioned web app. Script Property changes apply without embedding secrets in a static build.

## Request contract

All responses are JSON. Success contains `ok: true`. Errors contain `ok: false`, `error` and a visitor-safe `message`. Apps Script ContentService cannot select HTTP error codes, so clients must check `ok` even on HTTP 200.

| Request | Result |
| --- | --- |
| `GET /exec?action=config` | `{ok:true,configured:boolean,keyId?}`; checks properties and ledger access/header setup, without testing the credentials against Razorpay |
| `POST /exec`, JSON body `{action:"order",amount:1000,cause:"Animal Welfare"}` | `{ok:true,keyId,orderId,amount:100000,currency:"INR",orderToken}` |
| `POST /exec`, JSON body `{action:"verify",orderId,paymentId,signature,orderToken}` | Captured: `{ok:true,verified:true,status:"captured",orderId,paymentId,amount,currency:"INR",cause}`; authorized: `{ok:true,verified:false,status:"pending",orderId,paymentId}` |

`?action=order` or `?action=verify` can also select a POST action. If both the body and query specify it, they must agree. Amounts must be whole rupees from ₹100 through ₹5,00,000. Only the website's six defined causes are accepted. Provider amount fields and ledger amounts are **paise**.

The browser sends JSON as **`Content-Type: text/plain;charset=UTF-8`**, omits credentials and follows redirects. This avoids a CORS preflight, which Apps Script web apps do not implement. Google serves ContentService results through a redirect to `script.googleusercontent.com`; keep that redirect enabled. Do not use `mode: "no-cors"`, since an opaque response cannot prove payment verification.

## Verification and recovery

Each order is saved before it is returned for checkout. The signed order token binds the order ID, amount, currency and cause and expires after seven days. Verification checks the signed token, the Razorpay HMAC signature using the server-created order ID, both provider records, the expected amount/currency, zero refunds, the payment's captured state and the order's fully paid state. Authorized payments remain pending. A Sheet write must succeed before the browser receives a captured confirmation.

The Sheet has one row per order. Script locks protect writes and repeated verification updates that row. A stale pending result cannot replace a captured status. Only limited provider contact information and references are saved; no card number, CVV, UPI PIN, checkout signature, order token or API Secret is written to the ledger. Provider text is sanitized against spreadsheet formula execution.

When the donor closes the browser or verification loses its connection, the installed trigger fetches Razorpay's order/payment records and can confirm payment in the Sheet without a callback signature. It processes at most twenty open orders per run, prioritizing the least recently checked, with a four-minute processing budget. It retries open orders for seven days; older rows become `review_needed` and require manual provider reconciliation. The trigger never captures or charges a payment. You can also run `reconcilePendingPayments` from the editor.

Captured rows are skipped by the recovery trigger. The Sheet records capture confirmation, **not a current refunds/disputes/settlements register**. Use the Razorpay dashboard for those records, direct UPI/bank transfer reconciliation and manual reviews. Changing the configured Key ID means existing orders under the old key/mode are no longer polled; reconcile those before rotating keys or switching Test/Live modes. No automatic receipt email or tax certificate is generated.

The anonymous endpoint is public. Apps Script does not expose the caller's IP or request Origin/header values to `doPost`, so this is not an origin-restricted server and public frontend settings are not authentication. Creation has a best-effort global limit of thirty orders per minute using Script Cache. Google can evict that cache; this limit does not prevent all abuse or guarantee availability. Monitor [Apps Script quotas](https://developers.google.com/apps-script/guides/services/quotas) and trigger executions. This setup is intended for a modest-volume donation site.

Do not add a Razorpay webhook to this URL: Apps Script event objects do not expose the signature header needed to authenticate Razorpay webhooks. Recovery deliberately polls authenticated provider APIs instead.

## Local checks

From `website/`:

```powershell
node --experimental-test-isolation=none --test google-apps-script/tests/payment.test.mjs
```

The tests execute the actual `Code.gs` in a Node VM with mocked Google services and Razorpay responses. They do not load private environment files, access Google or make payments. They cover HMAC, token expiry/tampering, provider mismatches, pending/captured handling, ledger failures, repeat verification, recovery and request validation. An authenticated deployment and a real Test Mode checkout are still needed to verify Google authorization, browser CORS/redirect behavior and your Razorpay account settings.

Official references: [Apps Script web apps](https://developers.google.com/apps-script/guides/web), [ContentService redirects](https://developers.google.com/apps-script/guides/content), [Script Properties](https://developers.google.com/apps-script/guides/properties), [Razorpay Standard Checkout](https://razorpay.com/docs/payments/payment-gateway/web-integration/standard/integration-steps) and [payment capture settings](https://razorpay.com/docs/payments/payments/capture-settings).
