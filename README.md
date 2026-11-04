# Swabhiman Jan Evam Pashu Kalyan Foundation website

A fully static NGO website built with Next.js, React, TypeScript and Tailwind CSS. `npm run build` exports HTML, CSS, JavaScript and assets to `out`. Upload that directory to a static host; the deployed website needs no Node server or Next.js API routes.

Razorpay Standard Checkout handles payment entry. A Google Apps Script web app creates and verifies Razorpay orders, and a private Google Sheet records the transactions. The previous `payment-api/` Node service is retained only as a reference and is not required.

The foundation's deployed Apps Script URL is configured in [lib/payments/config.ts](lib/payments/config.ts), `.env.example` and the Render Blueprint. Local `.env.local` also uses this URL. A non-empty `NEXT_PUBLIC_GOOGLE_APPS_SCRIPT_URL` overrides the default for another deployment; an unset or blank setting uses the foundation's URL. Public URLs are safe to include in the static website; private credentials stay in Apps Script.

## Set up Google Sheets and Apps Script

1. Create a Google Sheet owned by the foundation's Google account. Keep sharing restricted; donors do not need access. Copy the spreadsheet ID from the portion between `/d/` and `/edit` in its URL.
2. In that Sheet, select **Extensions > Apps Script**. Replace `Code.gs` with [google-apps-script/Code.gs](google-apps-script/Code.gs).
3. In **Project Settings**, enable **Show appsscript.json manifest file in editor**. Replace that manifest with [google-apps-script/appsscript.json](google-apps-script/appsscript.json).
4. In **Project Settings > Script Properties**, add the following properties. Start with the matching Razorpay **Test Mode** key pair.

   | Property | Value |
   | --- | --- |
   | `RAZORPAY_KEY_ID` | Razorpay Key ID, such as `rzp_test_...` |
   | `RAZORPAY_KEY_SECRET` | Matching private Razorpay Key Secret |
   | `SPREADSHEET_ID` | ID of the private Google Sheet |

5. Save the project. Select and run `setup()` in the Apps Script editor, then authorize the requested permissions using the account that owns the Sheet. Run `installReconciliationTrigger()` once to install the periodic reconciliation job. It checks provider records for payments whose browser session was interrupted.
6. Choose **Deploy > New deployment > Web app**. Set **Execute as: Me** and **Who has access: Anyone**, then deploy. If an organization policy prevents anonymous web apps, the administrator must allow this deployment before public checkout can work.
7. Copy the deployed **Web app URL** ending in `/exec`. Use this public URL in the website setting below. Do not use a `/dev` test URL or a redirected `script.googleusercontent.com` URL.

The Sheet and Script Properties remain private even though the payment web app is publicly callable. Restrict script-editor access to trusted maintainers: script editors can access its properties. Google's [web app guide](https://developers.google.com/apps-script/guides/web), [properties guide](https://developers.google.com/apps-script/guides/properties) and [installable trigger guide](https://developers.google.com/apps-script/guides/triggers/installable) describe these controls.

After code changes, update the existing deployment through **Deploy > Manage deployments > Edit > New version > Deploy**. Saving code alone does not update the deployed version. Monitor Apps Script **Executions** and trigger failures when operating the integration.

## Local development and static export

From the `website` directory:

```bash
npm ci
```

Copy `.env.example` to `.env.local`. On PowerShell:

```powershell
Copy-Item .env.example .env.local
```

Set the public Apps Script URL in `.env.local`:

```dotenv
NEXT_PUBLIC_GOOGLE_APPS_SCRIPT_URL=https://script.google.com/macros/s/AKfycbyMpvILMYxYnw1dz0UxqBg4Jb9TTO6X85a4JghIkwfNdvrWXkl60Upuv0k4oaslW16o/exec
```

Then run `npm run dev` and open `http://localhost:3000`. Apps Script is hosted by Google and does not require a local payment server. Restart development after changing the public setting.

To produce and preview the exact static files:

```bash
npm run build
npm run preview
```

`npm start` also serves the static export for local preview. Node is used for development, builds and preview only. Production serves the contents of `out` directly. A changed public setting requires a fresh build and upload.

## Render deployment

Deploy the website as a single Render **Static Site** from `Theakaashyadav/SJKF`, branch `main`. The repository's `render.yaml` Blueprint configures the static service with the foundation's deployed public Apps Script URL.

- Service name: `sjkf`
- Root Directory: leave blank when this website is the repository root
- Build Command: `npm ci && npm run build`
- Publish Directory: `out`
- Environment: `NEXT_PUBLIC_GOOGLE_APPS_SCRIPT_URL=https://script.google.com/macros/s/AKfycbyMpvILMYxYnw1dz0UxqBg4Jb9TTO6X85a4JghIkwfNdvrWXkl60Upuv0k4oaslW16o/exec`

The static service needs no Start Command or `PORT` setting. For a manually configured service, add the environment variable and choose **Save, rebuild, and deploy**. Sync the Blueprint to apply `render.yaml` settings; merely pushing a commit does not configure an unrelated manually created service.

For another static host, use the same build command and publish the same `out` directory. Preserve trailing-slash directory routing and static assets under `_next`.

### Migrating from the Node payment API

Deploy and test Apps Script first, then replace `NEXT_PUBLIC_RAZORPAY_API_URL` with `NEXT_PUBLIC_GOOGLE_APPS_SCRIPT_URL` in the Static Site's environment and rebuild. The file `payment-api/.env` is no longer used by the website; copy the matching Razorpay credentials privately into Apps Script Script Properties. Remove old Razorpay secrets from the Static Site's environment. After the new checkout works in Test Mode, retire the old payment Web Service separately if it exists.

## Public build settings

| Setting | Purpose |
| --- | --- |
| `NEXT_PUBLIC_GOOGLE_APPS_SCRIPT_URL` | Deployed Apps Script web app URL ending in `/exec` |
| `NEXT_PUBLIC_SITE_URL` | Canonical website origin; when empty on Render, the build uses `RENDER_EXTERNAL_URL` |
| `NEXT_PUBLIC_CONTACT_EMAIL` | Optional override for `swabhimanfoundation2026@gmail.com` |
| `NEXT_PUBLIC_CONTACT_PHONE` | Optional override for `+91 9528547505` |
| `NEXT_PUBLIC_CONTACT_FORM_ENDPOINT` | HTTPS endpoint from a static-form provider, such as Formspree or Basin |
| `NEXT_PUBLIC_FACEBOOK_URL`, `NEXT_PUBLIC_INSTAGRAM_URL`, `NEXT_PUBLIC_LINKEDIN_URL` | Optional social profile URLs |

Every `NEXT_PUBLIC_` value is visible to visitors. Store the Razorpay Key Secret only in Apps Script Script Properties, never in these settings, frontend JavaScript, the Sheet, source control or the Static Site build environment. The public Key ID returned for Razorpay Checkout is expected to be visible.

## Payment flow and testing

The donation form checks `GET /exec?action=config` for backend availability. The donor selects a cause and a whole-rupee amount from ₹100 to ₹5,00,000. The static browser code sends JSON using a `text/plain` POST to Apps Script with the `order` action. Apps Script validates the amount and cause, creates an INR order through Razorpay, records the order in Sheets and returns the public checkout details with a signed order token. Browser requests follow Google's ContentService redirect; no separate payment API origin or custom CORS server is required.

After checkout, the `verify` action checks the token, Razorpay payment signature and provider records. Confirmation requires the correct order, amount and currency, a captured payment and a fully paid order. The verified state is saved to Sheets before success is returned. Pending payments remain unconfirmed, and a failed request cannot produce a success message. Repeated checks update the existing order record. The browser keeps pending verification details in session storage for up to seven days and rechecks them after a reload without opening another checkout.

The reconciliation trigger independently checks up to twenty open orders every ten minutes, with a four-minute execution budget and a seven-day recovery window. Older orders are marked `review_needed` for manual reconciliation. Captured rows are not continuously checked for refunds or disputes; use the Razorpay dashboard for those records. See the [backend operations guide](google-apps-script/README.md) for recovery and key-rotation limits.

Enable automatic capture in the Razorpay dashboard. Using the deployed web app and matching Test Mode credentials, check successful, failed, cancelled and pending checkout, confirm the Sheet's order/payment records, and verify repeated status checks do not duplicate a donation. Check the site in an incognito window to confirm the Apps Script deployment works without Google sign-in. Do not make real donations to test the integration. Replace both Script Properties with a matching Live Mode pair only after account activation and successful testing; keep pending Test Mode orders reconciled before switching the pair. See [Razorpay's integration steps](https://razorpay.com/docs/payments/payment-gateway/web-integration/standard/integration-steps) and [capture settings](https://razorpay.com/docs/payments/payments/capture-settings).

The integration does not automatically email a receipt. Direct UPI and bank transfers still require foundation reconciliation. Keep payment references for acknowledgement requests. Visiting `/payment-success/` or `/payment-failed/` does not verify a transaction. Apps Script and Sheets quotas apply; monitor execution failures and the Razorpay dashboard as part of reconciliation.

### Checkout is unavailable

Confirm the built website contains the exact deployed `/exec` URL. Open that URL with `?action=config` in an incognito window: it must return JSON rather than a Google sign-in or error page. The configuration check validates properties and Sheet access; a complete Test Mode checkout is needed to verify the Razorpay credentials. If configuration is missing, check Script Property names, the matching Razorpay key pair, spreadsheet ID, Sheet access and `setup()` authorization. If code changed, deploy a new version. Rebuild the static site after changing its URL. The donation form offers a retry, with direct UPI and bank details available during setup or an outage.

## Website languages

The header switches between English and Hindi. First visits use English; the browser remembers the visitor's choice across pages and visits. Navigation, content and form controls translate together. Original PDFs, logos and bank account details retain their supplied content.

Hindi copy is maintained in `lib/translations-common.ts`, `lib/translations-pages.ts` and `lib/translations-forms.ts`. Use `T` or `useLanguage().t` for new visible copy. After building and starting the preview, run `npm run audit:language`. Browser audits use Microsoft Edge by default; `AUDIT_BROWSER_PATH` and `AUDIT_BASE_URL` override the browser executable and preview URL.

## Contact delivery

Contact messages submit directly from the validated form to the configured HTTPS form provider. The form includes required-field validation, mobile/email patterns and a provider-compatible honeypot. Use a provider with server-side validation and spam protection. Until an endpoint is configured, the form reports that delivery is unavailable instead of showing a false success.

## Static website routes

- `/`
- `/about`
- `/our-work`
- `/gallery`
- `/documents`
- `/donate`
- `/contact`
- `/payment-success`
- `/payment-failed`
- `/privacy-policy`
- `/terms`
- `/donation-policy`
- `/refund-policy`

All website routes are exported with trailing slashes. Render serves the static files and security headers from `render.yaml`. Apps Script payment requests are external to `out`; the export contains no payment server or API routes.

## Content and image integrity

Organization facts were cross-checked against the supplied MCA and DARPAN records. The supplied 149Q ISO 9001 PDF is available in the document library; the earlier draft ISO document is not published. The site makes no 80G claim.

The Documents page previews the ISO 9001 document, registration and governance PDFs in `public/documents/`. Titles, descriptions and file sizes are in `lib/documents.ts`. Update the PDF and its corresponding entry, then rebuild. Drafts, tax cards and individual DIN letters are excluded from the public library.

The homepage and gallery share four photographs supplied in `Images/Gallery`; duplicates appear only once. Both offer an enlarged photo viewer. Captions describe visible content without inferring event dates or locations. Other illustrative photographs are licensed Pexels stock images. Provenance is recorded in `public/images/README.md`.

## Verification

```bash
npm run typecheck
npm run test:payments
npm run build
npm run preview
```

With the static preview running, use a second terminal:

```bash
npm run audit:language
npm run audit:payment
```

The payment browser audit mocks Google and Razorpay, including Google's response redirects. A configured build exercises checkout, pending-payment reloads, cancellation, failure and retry scenarios, including the UPI/bank fallback when the backend is unavailable or its Script Properties are missing. Set `AUDIT_REQUIRE_CONFIGURED=1` to require the full mocked checkout audit. The mocked browser audit does not contact the actual payment provider.

The build verifies exported pages' CSS, JavaScript, fonts, images and PDFs. Automated payment checks use mocked Apps Script/provider responses and do not charge money. They do not replace a complete Test Mode payment against the foundation's deployed Apps Script and Razorpay account. No live payment has been verified merely by building or running these checks.
