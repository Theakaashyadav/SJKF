# Legacy Node payment API

This directory is retained as a reference for the previous payment integration. The static website now uses **Google Apps Script and Google Sheets**; this Node service is not required or included in `render.yaml`.

Follow the setup in the [website README](../README.md) and use `google-apps-script/Code.gs`. Set `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET` and `SPREADSHEET_ID` in **Apps Script Project Settings > Script Properties**. Values in this directory's `.env` do not configure Apps Script or the website.

The public website setting is now `NEXT_PUBLIC_GOOGLE_APPS_SCRIPT_URL`, containing the deployed web app URL ending in `/exec`. Rebuild the static website after setting it. Keep all actual credentials out of Git, browser code and `NEXT_PUBLIC_` variables.

The source and its tests remain available for reference. Running this legacy service or deploying a separate payment Web Service is unnecessary for the current website. After validating the Apps Script deployment in Razorpay Test Mode, an existing `sjkf-payments` service can be retired separately.
