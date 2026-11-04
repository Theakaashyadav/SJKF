/* Payment backend for the static Swabhiman Foundation website.
 * Configure secrets in Project Settings > Script Properties, never in this file.
 * Deploy as a web app: execute as yourself, access Anyone.
 */
var PAYMENT = Object.freeze({
  sheet: 'Donations',
  api: 'https://api.razorpay.com/v1',
  lifetime: 7 * 24 * 60 * 60 * 1000,
  recoveryWindow: 7 * 24 * 60 * 60 * 1000,
  batchSize: 20,
  causes: ['Animal Welfare', 'Education', 'Healthcare', 'Environmental Initiatives', 'Community Welfare', 'General Donation'],
  columns: ['CreatedAt', 'UpdatedAt', 'OrderId', 'PaymentId', 'AmountPaise', 'Currency', 'Cause', 'Status', 'Email', 'Contact', 'Method', 'KeyId', 'LastCheckedAt', 'LastError']
});

function doGet(e) {
  return respond_(function () {
    if (!e || !e.parameter || e.parameter.action !== 'config') throw invalid_();
    var auth = configuration_();
    if (!auth) return { configured: false };
    // Verify setup/permissions as well as the presence of properties. No Sheet
    // data, private credentials, or spreadsheet identifier is sent to visitors.
    try { withLock_(function () { sheet_(auth); }); }
    catch (error) { return { configured: false }; }
    return { configured: true, keyId: auth.keyId };
  });
}

function doPost(e) {
  return respond_(function () {
    var raw = e && e.postData && e.postData.contents;
    if (typeof raw !== 'string' || raw.length > 8192) throw invalid_();
    var body;
    try { body = JSON.parse(raw); } catch (error) { throw invalid_(); }
    if (!record_(body)) throw invalid_();
    var queryAction = e.parameter && e.parameter.action;
    if (queryAction && body.action && queryAction !== body.action) throw invalid_();
    var action = queryAction || body.action;
    delete body.action;
    if (action !== 'order' && action !== 'verify') throw invalid_();
    var auth = requireConfiguration_();
    if (action === 'order') return createOrder_(body, auth);
    return verifyPayment_(body, auth);
  });
}

function respond_(operation) {
  var result;
  try { result = Object.assign({ ok: true }, operation()); }
  catch (error) {
    result = { ok: false, error: error.paymentCode || 'PAYMENT_SERVICE_UNAVAILABLE', message: error.paymentCode ? error.message : 'Payment service is temporarily unavailable. Please try again or contact the foundation.' };
  }
  return ContentService.createTextOutput(JSON.stringify(result)).setMimeType(ContentService.MimeType.JSON);
}

function configuration_() {
  var props = PropertiesService.getScriptProperties().getProperties();
  var keyId = String(props.RAZORPAY_KEY_ID || '').trim();
  var secret = String(props.RAZORPAY_KEY_SECRET || '').trim();
  var spreadsheetId = String(props.SPREADSHEET_ID || '').trim();
  if (!/^rzp_(test|live)_[A-Za-z0-9]+$/.test(keyId) || !secret || secret.length > 256 || /\s/.test(secret) || !/^[A-Za-z0-9_-]{20,}$/.test(spreadsheetId)) return null;
  return { keyId: keyId, secret: secret, spreadsheetId: spreadsheetId };
}

function requireConfiguration_() {
  var auth = configuration_();
  if (!auth) throw paymentError_('PAYMENT_CONFIGURATION_MISSING', 'Online payment is not configured. Please use UPI or bank transfer.');
  return auth;
}

function paymentError_(code, message) {
  var error = new Error(message);
  error.paymentCode = code;
  return error;
}
function invalid_() { return paymentError_('INVALID_PAYMENT_REQUEST', 'Payment details are invalid. Please return to the donation form.'); }
function record_(value) { return value !== null && typeof value === 'object' && !Array.isArray(value); }
function keys_(value, keys) { return Object.keys(value).length === keys.length && keys.every(function (key) { return Object.prototype.hasOwnProperty.call(value, key); }); }
function orderId_(value) { return typeof value === 'string' && /^order_[A-Za-z0-9]{1,80}$/.test(value); }
function paymentId_(value) { return typeof value === 'string' && /^pay_[A-Za-z0-9]{1,80}$/.test(value); }
function validAmount_(value) { return typeof value === 'number' && Number.isSafeInteger(value) && value >= 10000 && value <= 50000000; }

function hmac_(value, secret) {
  return Utilities.computeHmacSha256Signature(value, secret, Utilities.Charset.UTF_8).map(function (part) { return ('0' + ((part + 256) % 256).toString(16)).slice(-2); }).join('');
}

function equalHex_(expected, candidate) {
  if (typeof candidate !== 'string' || !/^[a-fA-F0-9]{64}$/.test(candidate)) return false;
  candidate = candidate.toLowerCase();
  var mismatch = 0;
  for (var index = 0; index < 64; index++) mismatch |= expected.charCodeAt(index) ^ candidate.charCodeAt(index);
  return mismatch === 0;
}

function signOrder_(claims, secret) {
  var payload = Utilities.base64EncodeWebSafe(JSON.stringify(claims), Utilities.Charset.UTF_8).replace(/=+$/, '');
  return payload + '.' + hmac_('sjkf:razorpay:order:v1:' + payload, secret);
}

function readOrder_(token, secret, now) {
  if (typeof token !== 'string' || token.length > 1024) throw invalid_();
  var parts = token.split('.');
  if (parts.length !== 2 || !/^[A-Za-z0-9_-]+$/.test(parts[0]) || !equalHex_(hmac_('sjkf:razorpay:order:v1:' + parts[0], secret), parts[1])) throw invalid_();
  var claims;
  try { claims = JSON.parse(Utilities.newBlob(Utilities.base64DecodeWebSafe(parts[0])).getDataAsString('UTF-8')); }
  catch (error) { throw invalid_(); }
  if (!record_(claims) || !keys_(claims, ['version', 'orderId', 'amount', 'currency', 'cause', 'expiresAt']) || claims.version !== 1 || !orderId_(claims.orderId) || !validAmount_(claims.amount) || claims.currency !== 'INR' || PAYMENT.causes.indexOf(claims.cause) < 0 || !Number.isSafeInteger(claims.expiresAt)) throw invalid_();
  if (claims.expiresAt <= now || claims.expiresAt > now + PAYMENT.lifetime) throw paymentError_('PAYMENT_SESSION_EXPIRED', 'This checkout session has expired. Do not pay again if debited; contact the foundation with your payment reference.');
  return claims;
}

function provider_(path, auth, body) {
  var options = {
    method: body === undefined ? 'get' : 'post',
    headers: { Authorization: 'Basic ' + Utilities.base64Encode(auth.keyId + ':' + auth.secret, Utilities.Charset.UTF_8), Accept: 'application/json' },
    muteHttpExceptions: true,
    followRedirects: false,
    validateHttpsCertificates: true
  };
  if (body !== undefined) { options.contentType = 'application/json'; options.payload = JSON.stringify(body); }
  var response = UrlFetchApp.fetch(PAYMENT.api + path, options);
  if (response.getResponseCode() < 200 || response.getResponseCode() >= 300) throw new Error('Payment provider request failed');
  var value = JSON.parse(response.getContentText());
  if (!record_(value)) throw new Error('Invalid payment provider response');
  return value;
}

function createOrder_(body, auth) {
  if (!keys_(body, ['amount', 'cause']) || typeof body.amount !== 'number' || !Number.isSafeInteger(body.amount) || body.amount < 100 || body.amount > 500000 || PAYMENT.causes.indexOf(body.cause) < 0) throw invalid_();
  // Check storage and a global best-effort order budget before using provider
  // quota. Apps Script does not expose trustworthy caller IP/Origin headers.
  withLock_(function () {
    sheet_(auth);
    var cache = CacheService.getScriptCache();
    var bucket = 'orders:' + Math.floor(Date.now() / 60000);
    var count = Number(cache.get(bucket) || 0);
    if (count >= 30) throw paymentError_('PAYMENT_BUSY', 'Checkout is busy. Please wait a minute and try again.');
    cache.put(bucket, String(count + 1), 120);
  });
  var amount = body.amount * 100;
  var order = provider_('/orders', auth, {
    amount: amount, currency: 'INR', receipt: 'sjkf_' + Utilities.getUuid().replace(/-/g, ''), partial_payment: false,
    notes: { cause: body.cause, source: 'swabhiman-foundation' }
  });
  if (!orderId_(order.id) || order.amount !== amount || order.currency !== 'INR' || order.status !== 'created') throw new Error('Invalid payment provider order');
  var now = Date.now();
  saveOrder_(auth, { CreatedAt: now, UpdatedAt: now, OrderId: order.id, PaymentId: '', AmountPaise: amount, Currency: 'INR', Cause: body.cause, Status: 'created', Email: '', Contact: '', Method: '', KeyId: auth.keyId, LastCheckedAt: now, LastError: '' }, true);
  return { keyId: auth.keyId, orderId: order.id, amount: amount, currency: 'INR', orderToken: signOrder_({ version: 1, orderId: order.id, amount: amount, currency: 'INR', cause: body.cause, expiresAt: now + PAYMENT.lifetime }, auth.secret) };
}

function verifyPayment_(body, auth) {
  if (!keys_(body, ['orderId', 'paymentId', 'signature', 'orderToken']) || !orderId_(body.orderId) || !paymentId_(body.paymentId) || typeof body.signature !== 'string' || !/^[a-fA-F0-9]{64}$/.test(body.signature)) throw invalid_();
  var claims = readOrder_(body.orderToken, auth.secret, Date.now());
  if (claims.orderId !== body.orderId || !equalHex_(hmac_(claims.orderId + '|' + body.paymentId, auth.secret), body.signature)) throw paymentError_('PAYMENT_VERIFICATION_FAILED', 'Payment verification failed. Contact the foundation with your payment reference.');
  var row = withLock_(function () { return findOrder_(sheet_(auth), claims.orderId); });
  if (!row || row.KeyId !== auth.keyId || row.AmountPaise !== claims.amount || row.Currency !== claims.currency || row.Cause !== claims.cause) throw invalid_();
  var payment = provider_('/payments/' + body.paymentId, auth);
  var order = provider_('/orders/' + claims.orderId, auth);
  var status = paymentStatus_(payment, order, row, body.paymentId);
  var saved = saveOrder_(auth, paymentPatch_(row.OrderId, payment, status), false);
  // Save succeeds before confirmation is returned. A stale concurrent pending
  // response cannot downgrade a captured row, but is never itself confirmed.
  if (status !== 'captured') return { verified: false, status: 'pending', paymentId: body.paymentId, orderId: claims.orderId };
  if (saved.Status !== 'captured') throw new Error('Payment record not saved');
  return { verified: true, status: 'captured', paymentId: body.paymentId, orderId: claims.orderId, amount: claims.amount, currency: 'INR', cause: claims.cause };
}

function paymentStatus_(payment, order, row, expectedPaymentId) {
  if (!record_(payment) || !paymentId_(payment.id) || (expectedPaymentId && payment.id !== expectedPaymentId) || payment.order_id !== row.OrderId || payment.amount !== row.AmountPaise || payment.currency !== 'INR' || !record_(order) || order.id !== row.OrderId || order.amount !== row.AmountPaise || order.currency !== 'INR') throw paymentError_('PAYMENT_VERIFICATION_FAILED', 'Payment details do not match the donation order. Contact the foundation.');
  if (payment.status === 'captured' && payment.captured === true && order.status === 'paid' && order.amount_paid === row.AmountPaise && order.amount_due === 0 && payment.amount_refunded === 0) return 'captured';
  if (payment.status === 'authorized' && payment.captured === false && (order.status === 'attempted' || order.status === 'created')) return 'pending';
  throw paymentError_('PAYMENT_NOT_CAPTURED', 'Payment is not confirmed as received. Check your payment reference with the foundation.');
}

function paymentPatch_(orderId, payment, status) {
  return { OrderId: orderId, PaymentId: payment.id, Status: status, UpdatedAt: Date.now(), LastCheckedAt: Date.now(), LastError: '', Email: safeText_(payment.email), Contact: safeText_(payment.contact), Method: safeText_(payment.method) };
}

function safeText_(value) {
  var text = typeof value === 'string' ? value.slice(0, 250).replace(/[\u0000-\u001f\u007f]/g, '') : '';
  return /^\s*[=+@-]/.test(text) ? "'" + text : text;
}

function withLock_(operation) {
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(10000)) throw paymentError_('PAYMENT_BUSY', 'Payment service is busy. Please try again shortly.');
  try { return operation(); } finally { lock.releaseLock(); }
}

function sheet_(auth) {
  var spreadsheet = SpreadsheetApp.openById(auth.spreadsheetId);
  var sheet = spreadsheet.getSheetByName(PAYMENT.sheet);
  if (!sheet || sheet.getLastRow() < 1) throw new Error('Run setup before deploying');
  var header = sheet.getRange(1, 1, 1, PAYMENT.columns.length).getValues()[0];
  if (header.join('|') !== PAYMENT.columns.join('|')) throw new Error('Donation sheet headers were changed');
  return sheet;
}

function rowRecord_(values, rowNumber) {
  var result = { rowNumber: rowNumber };
  PAYMENT.columns.forEach(function (column, index) { result[column] = values[index]; });
  return result;
}

function findOrder_(sheet, orderId) {
  if (sheet.getLastRow() < 2) return null;
  var match = sheet.getRange(2, 3, sheet.getLastRow() - 1, 1).createTextFinder(orderId).matchEntireCell(true).useRegularExpression(false).findNext();
  return match ? rowRecord_(sheet.getRange(match.getRow(), 1, 1, PAYMENT.columns.length).getValues()[0], match.getRow()) : null;
}

function saveOrder_(auth, patch, isNew) {
  return withLock_(function () {
    var sheet = sheet_(auth);
    var existing = findOrder_(sheet, patch.OrderId);
    if (isNew && existing) throw new Error('Duplicate provider order');
    if (!isNew && !existing) throw new Error('Order is not in donation ledger');
    if (existing && existing.Status === 'captured' && patch.Status !== 'captured') return existing;
    if (existing && existing.Status === 'captured' && patch.PaymentId && existing.PaymentId !== patch.PaymentId) throw invalid_();
    var result = Object.assign({}, existing || {}, patch);
    var values = PAYMENT.columns.map(function (column) { var value = result[column]; return value === undefined ? '' : value; });
    sheet.getRange(existing ? existing.rowNumber : sheet.getLastRow() + 1, 1, 1, PAYMENT.columns.length).setValues([values]);
    SpreadsheetApp.flush();
    return result;
  });
}

// Run once from the Apps Script editor to authorize services and create the
// ledger. This never creates a Razorpay order or charges a payment.
function setup() {
  var auth = requireConfiguration_();
  return withLock_(function () {
    var spreadsheet = SpreadsheetApp.openById(auth.spreadsheetId);
    var sheet = spreadsheet.getSheetByName(PAYMENT.sheet) || spreadsheet.insertSheet(PAYMENT.sheet);
    if (sheet.getLastRow() === 0) {
      sheet.getRange(1, 1, 1, PAYMENT.columns.length).setValues([PAYMENT.columns]);
      sheet.setFrozenRows(1);
      SpreadsheetApp.flush();
    }
    sheet_(auth);
    return 'Donation ledger is ready. Deploy the web app and install the reconciliation trigger.';
  });
}

function installReconciliationTrigger() {
  setup();
  var exists = ScriptApp.getProjectTriggers().some(function (trigger) { return trigger.getHandlerFunction() === 'reconcilePendingPayments'; });
  if (!exists) ScriptApp.newTrigger('reconcilePendingPayments').timeBased().everyMinutes(10).create();
  return 'Reconciliation trigger is installed.';
}

// Poll provider records for interrupted checkouts. This requires no public
// webhook, and no donor browser session/signature. Only ledger-owned orders are
// inspected. At most 20 orders per run; oldest checks go first to avoid starvation.
function reconcilePendingPayments() {
  var auth = requireConfiguration_();
  var startedAt = Date.now();
  var rows = withLock_(function () {
    var sheet = sheet_(auth);
    if (sheet.getLastRow() < 2) return [];
    return sheet.getRange(2, 1, sheet.getLastRow() - 1, PAYMENT.columns.length).getValues().map(function (values, index) { return rowRecord_(values, index + 2); });
  }).filter(function (row) { return row.KeyId === auth.keyId && row.Status !== 'captured' && row.Status !== 'review_needed' && orderId_(row.OrderId) && validAmount_(row.AmountPaise) && row.Currency === 'INR' && PAYMENT.causes.indexOf(row.Cause) >= 0; });
  rows.sort(function (a, b) { return Number(a.LastCheckedAt || 0) - Number(b.LastCheckedAt || 0); });
  var checked = 0;
  for (var index = 0; index < rows.length && checked < PAYMENT.batchSize && Date.now() - startedAt < 240000; index++) {
    var row = rows[index];
    checked++;
    if (startedAt - Number(row.CreatedAt) > PAYMENT.recoveryWindow) {
      saveOrder_(auth, { OrderId: row.OrderId, Status: 'review_needed', UpdatedAt: Date.now(), LastCheckedAt: Date.now(), LastError: 'RECOVERY_WINDOW_ELAPSED' }, false);
      continue;
    }
    try {
      var order = provider_('/orders/' + row.OrderId, auth);
      if (order.id !== row.OrderId || order.amount !== row.AmountPaise || order.currency !== 'INR') throw invalid_();
      var collection = provider_('/orders/' + row.OrderId + '/payments', auth);
      if (!Array.isArray(collection.items) || !Number.isSafeInteger(collection.count) || collection.count !== collection.items.length) throw new Error('Invalid payment collection');
      var payments = collection.items.filter(function (payment) { return record_(payment) && (payment.status === 'captured' || payment.status === 'authorized'); });
      payments.sort(function (a, b) { return (b.status === 'captured' ? 1 : 0) - (a.status === 'captured' ? 1 : 0); });
      if (payments.length) {
        var payment = payments[0];
        saveOrder_(auth, paymentPatch_(row.OrderId, payment, paymentStatus_(payment, order, row)), false);
      } else {
        saveOrder_(auth, { OrderId: row.OrderId, UpdatedAt: Date.now(), LastCheckedAt: Date.now(), LastError: '' }, false);
      }
    } catch (error) {
      // Codes only: provider response bodies and credentials never enter logs or
      // the ledger. Other orders can still be reconciled if one fetch fails.
      saveOrder_(auth, { OrderId: row.OrderId, UpdatedAt: Date.now(), LastCheckedAt: Date.now(), LastError: error.paymentCode || 'PROVIDER_UNAVAILABLE' }, false);
    }
  }
  return { checked: checked };
}
