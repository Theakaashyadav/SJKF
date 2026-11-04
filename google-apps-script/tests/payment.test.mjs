import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';

const code = readFileSync(new URL('../Code.gs', import.meta.url), 'utf8');
const secret = 'mock_secret_never_a_real_credential';
const keyId = 'rzp_test_mock123';
const orderId = 'order_mock123';
const paymentId = 'pay_mock123';
const created = { id: orderId, amount: 100000, currency: 'INR', status: 'created' };
const paid = { ...created, status: 'paid', amount_paid: 100000, amount_due: 0 };
const captured = { id: paymentId, order_id: orderId, amount: 100000, currency: 'INR', status: 'captured', captured: true, amount_refunded: 0, email: 'donor@example.test', contact: '+919999999999', method: 'upi' };
const digest = (input, key = secret) => createHmac('sha256', key).update(input).digest('hex');
const signature = digest(`${orderId}|${paymentId}`);
const clone = (value) => JSON.parse(JSON.stringify(value));

function harness() {
  const state = {
    time: 1800000000000,
    props: { RAZORPAY_KEY_ID: keyId, RAZORPAY_KEY_SECRET: secret, SPREADSHEET_ID: 'mock_spreadsheet_id_for_tests_12345' },
    rows: [], exists: false, calls: [], cache: new Map(), lock: false, storageFailure: false, triggers: [],
    order: clone(paid), payment: clone(captured), handler: null,
  };
  const range = (row, col, height = 1, width = 1) => ({
    getValues() { return Array.from({ length: height }, (_, y) => Array.from({ length: width }, (_, x) => state.rows[row - 1 + y]?.[col - 1 + x] ?? '')); },
    setValues(values) {
      if (state.storageFailure) throw new Error('private Sheet failure');
      values.forEach((items, y) => {
        const target = state.rows[row - 1 + y] ||= [];
        items.forEach((value, x) => { target[col - 1 + x] = value; });
      });
      return this;
    },
    createTextFinder(needle) { return { matchEntireCell() { return this; }, useRegularExpression() { return this; }, findNext() {
      const index = state.rows.findIndex((items, i) => i >= row - 1 && i < row - 1 + height && items[col - 1] === needle);
      return index < 0 ? null : { getRow: () => index + 1 };
    } }; },
  });
  const sheet = { getLastRow: () => state.rows.length, getRange: range, setFrozenRows() {} };
  const book = { getSheetByName: () => state.exists ? sheet : null, insertSheet() { state.exists = true; return sheet; } };
  const response = (body, status = 200) => ({ getResponseCode: () => status, getContentText: () => JSON.stringify(body) });
  const context = vm.createContext({
    Date: class extends Date { static now() { return state.time; } },
    PropertiesService: { getScriptProperties: () => ({ getProperties: () => ({ ...state.props }) }) },
    ContentService: { MimeType: { JSON: 'application/json' }, createTextOutput: (text) => ({ text, setMimeType() { return this; } }) },
    Utilities: {
      Charset: { UTF_8: 'UTF-8' },
      computeHmacSha256Signature: (input, key) => [...createHmac('sha256', key).update(input).digest()].map((byte) => byte > 127 ? byte - 256 : byte),
      base64Encode: (input) => Buffer.from(input).toString('base64'),
      base64EncodeWebSafe: (input) => Buffer.from(input).toString('base64url'),
      base64DecodeWebSafe: (input) => [...Buffer.from(input, 'base64url')],
      newBlob: (bytes) => ({ getDataAsString: () => Buffer.from(bytes).toString('utf8') }),
      getUuid: () => '12345678-1234-1234-1234-123456789012',
    },
    LockService: { getScriptLock: () => ({ tryLock() { assert.equal(state.lock, false, 'unexpected nested lock'); state.lock = true; return true; }, releaseLock() { state.lock = false; } }) },
    CacheService: { getScriptCache: () => ({ get: (key) => state.cache.get(key) ?? null, put: (key, value) => state.cache.set(key, value) }) },
    SpreadsheetApp: { openById: () => book, flush() {} },
    ScriptApp: {
      getProjectTriggers: () => state.triggers,
      newTrigger(name) { return { timeBased() { return this; }, everyMinutes(value) { assert.equal(value, 10); return this; }, create() { state.triggers.push({ getHandlerFunction: () => name }); } }; },
    },
    UrlFetchApp: { fetch(url, options) {
      assert.equal(state.lock, false, 'network calls must release sheet lock');
      state.calls.push({ url, options });
      if (state.handler) return state.handler(url, options, response);
      if (url.endsWith('/orders') && options.method === 'post') return response(created);
      if (url.endsWith('/payments/' + paymentId)) return response(state.payment);
      if (url.endsWith('/orders/' + orderId)) return response(state.order);
      if (url.endsWith('/orders/' + orderId + '/payments')) return response({ count: 1, items: [state.payment] });
      throw new Error('Unexpected provider request: ' + url);
    } },
  });
  vm.runInContext(code, context, { filename: 'Code.gs' });
  const get = (action = 'config') => JSON.parse(context.doGet({ parameter: { action } }).text);
  const post = (body, query = {}) => JSON.parse(context.doPost({ parameter: query, postData: { contents: typeof body === 'string' ? body : JSON.stringify(body) } }).text);
  const setup = () => context.setup();
  const order = () => post({ action: 'order', amount: 1000, cause: 'Animal Welfare' });
  const verify = (token, changes = {}) => post({ action: 'verify', orderId, paymentId, signature, orderToken: token, ...changes });
  const row = () => Object.fromEntries(clone(context.PAYMENT.columns).map((column, i) => [column, state.rows[1]?.[i]]));
  return { state, context, get, post, setup, order, verify, row };
}

test('configuration requires properties, authorized access and initialized ledger; never returns secrets', () => {
  const h = harness();
  assert.deepEqual(h.get(), { ok: true, configured: false });
  h.setup();
  assert.deepEqual(h.get(), { ok: true, configured: true, keyId });
  assert.equal(JSON.stringify(h.get()).includes(secret), false);
  delete h.state.props.RAZORPAY_KEY_SECRET;
  assert.deepEqual(h.get(), { ok: true, configured: false });
  assert.equal(h.state.calls.length, 0);
});

test('setup preserves rows and installs only one reconciliation trigger without provider calls', () => {
  const h = harness();
  h.setup(); h.setup();
  h.context.installReconciliationTrigger(); h.context.installReconciliationTrigger();
  assert.equal(h.state.rows.length, 1);
  assert.equal(h.state.triggers.length, 1);
  assert.equal(h.state.calls.length, 0);
});

test('HMAC handles signed Apps Script bytes and matches known SHA256 vector', () => {
  const h = harness();
  assert.equal(h.context.hmac_('The quick brown fox jumps over the lazy dog', 'key'), 'f7bc83f430538424b13298e6aa6fb143ef4d59a14946175997479dbc2d1a3cd8');
  assert.equal(h.context.equalHex_(signature, signature.toUpperCase()), true);
  assert.equal(h.context.equalHex_(signature, 'x'.repeat(64)), false);
});

test('create order uses paise, provider Basic auth, no redirects, signed token and one durable row', () => {
  const h = harness(); h.setup();
  const order = h.order();
  assert.equal(order.ok, true);
  assert.equal(order.orderId, orderId);
  assert.equal(order.amount, 100000);
  const call = h.state.calls[0];
  assert.equal(call.url, 'https://api.razorpay.com/v1/orders');
  assert.equal(call.options.followRedirects, false);
  assert.equal(call.options.headers.Authorization, `Basic ${Buffer.from(`${keyId}:${secret}`).toString('base64')}`);
  const body = JSON.parse(call.options.payload);
  assert.equal(body.partial_payment, false);
  assert.equal(body.amount, 100000);
  assert.ok(body.receipt.length <= 40);
  const [payload, mac] = order.orderToken.split('.');
  assert.equal(mac, digest('sjkf:razorpay:order:v1:' + payload));
  const claims = JSON.parse(Buffer.from(payload, 'base64url'));
  assert.equal(claims.expiresAt, h.state.time + 7 * 86400000);
  assert.equal(h.state.rows.length, 2);
  assert.equal(h.row().Status, 'created');
  assert.equal(JSON.stringify(order).includes(secret), false);
});

for (const amount of [99, 500001, 100.5, '1000', null, -1]) {
  test(`rejects invalid amount ${String(amount)} before provider access`, () => {
    const h = harness(); h.setup();
    assert.equal(h.post({ action: 'order', amount, cause: 'Animal Welfare' }).ok, false);
    assert.equal(h.state.calls.length, 0);
  });
}

test('unknown actions, bad JSON, arrays, extra keys, query conflicts and oversized requests are rejected', () => {
  const h = harness(); h.setup();
  for (const body of ['{', '[]', 'null', 'x'.repeat(8193), { action: 'reset' }, { action: 'order', amount: 1000, cause: 'fake' }, { action: 'order', amount: 1000, cause: 'Animal Welfare', currency: 'USD' }]) assert.equal(h.post(body).ok, false);
  assert.equal(h.post({ action: 'order', amount: 1000, cause: 'Animal Welfare' }, { action: 'verify' }).ok, false);
  assert.equal(h.get('order').ok, false);
  assert.equal(h.state.calls.length, 0);
  assert.equal(h.post({ amount: 1000, cause: 'Animal Welfare' }, { action: 'order' }).ok, true);
});

test('tampered signatures and signed order claims never reach provider verification', () => {
  const h = harness(); h.setup(); const order = h.order();
  const calls = h.state.calls.length;
  for (const changes of [{ signature: '0'.repeat(64) }, { orderToken: 'x' + order.orderToken }, { orderId: 'order_other' }, { paymentId: 'pay_other' }]) assert.equal(h.verify(order.orderToken, changes).ok, false);
  assert.equal(h.state.calls.length, calls);
});

test('expired tokens fail safely and remain available for scheduled reconciliation', () => {
  const h = harness(); h.setup(); const order = h.order();
  h.state.time += 7 * 86400000;
  const result = h.verify(order.orderToken);
  assert.equal(result.error, 'PAYMENT_SESSION_EXPIRED');
  assert.equal(h.row().Status, 'created');
});

test('captured donation is verified and saved idempotently with sanitized contact fields', () => {
  const h = harness(); h.setup(); const order = h.order();
  h.state.payment.email = '=IMPORTDATA("https://example.test")';
  const first = h.verify(order.orderToken);
  assert.deepEqual(first, { ok: true, verified: true, status: 'captured', orderId, paymentId, amount: 100000, currency: 'INR', cause: 'Animal Welfare' });
  assert.equal(h.row().Email[0], "'");
  assert.equal(h.row().Contact[0], "'");
  assert.equal(h.row().Status, 'captured');
  assert.equal(h.verify(order.orderToken).verified, true);
  assert.equal(h.state.rows.length, 2);
});

test('authorized payment stays pending, then capture can be checked again', () => {
  const h = harness(); h.setup(); const order = h.order();
  h.state.payment = { ...captured, status: 'authorized', captured: false };
  h.state.order = { ...created, status: 'attempted' };
  assert.deepEqual(h.verify(order.orderToken), { ok: true, verified: false, status: 'pending', orderId, paymentId });
  assert.equal(h.row().Status, 'pending');
  h.state.payment = clone(captured); h.state.order = clone(paid);
  assert.equal(h.verify(order.orderToken).verified, true);
  assert.equal(h.row().Status, 'captured');
});

for (const [entity, changes] of [
  ['payment', { amount: 50000 }], ['payment', { currency: 'USD' }], ['payment', { order_id: 'order_other' }],
  ['payment', { id: 'pay_other' }], ['payment', { amount_refunded: 100 }], ['payment', { captured: false }],
  ['payment', { status: 'failed' }], ['order', { status: 'attempted' }], ['order', { amount_paid: 99999 }],
  ['order', { amount_due: 1 }], ['order', { amount: 99999 }], ['order', { id: 'order_other' }],
]) {
  test(`never confirms ${entity} mismatch ${JSON.stringify(changes)}`, () => {
    const h = harness(); h.setup(); const order = h.order();
    Object.assign(h.state[entity], changes);
    const result = h.verify(order.orderToken);
    assert.equal(result.ok, false);
    assert.notEqual(h.row().Status, 'captured');
  });
}

test('provider errors are redacted and failed ledger writes cannot display success', () => {
  const h = harness(); h.setup(); const order = h.order();
  h.state.handler = (url, options, response) => response({ error: { description: secret } }, 401);
  const failed = h.verify(order.orderToken);
  assert.equal(failed.ok, false);
  assert.equal(JSON.stringify(failed).includes(secret), false);
  h.state.handler = null;
  h.state.storageFailure = true;
  assert.equal(h.verify(order.orderToken).ok, false);
  assert.notEqual(h.row().Status, 'captured');
});

test('ledger and key-mode changes reject otherwise signed requests', () => {
  const h = harness(); h.setup(); const order = h.order();
  h.state.props.RAZORPAY_KEY_ID = 'rzp_live_other';
  assert.equal(h.verify(order.orderToken).ok, false);
  h.state.props.RAZORPAY_KEY_ID = keyId;
  h.state.rows[1][4] = 99999;
  assert.equal(h.verify(order.orderToken).ok, false);
  h.state.rows[0][0] = 'changed';
  assert.equal(h.get().configured, false);
});

test('scheduled reconciliation recovers captured payments without a browser callback', () => {
  const h = harness(); h.setup(); h.order();
  assert.deepEqual(clone(h.context.reconcilePendingPayments()), { checked: 1 });
  assert.equal(h.row().Status, 'captured');
  assert.equal(h.row().PaymentId, paymentId);
  const calls = h.state.calls.length;
  assert.equal(h.context.reconcilePendingPayments().checked, 0);
  assert.equal(h.state.calls.length, calls);
  assert.equal(h.state.rows.length, 2);
});

test('reconciliation never confirms mismatches and records redacted errors for later retry', () => {
  const h = harness(); h.setup(); h.order();
  h.state.payment.amount = 10;
  h.context.reconcilePendingPayments();
  assert.equal(h.row().LastError, 'PAYMENT_VERIFICATION_FAILED');
  assert.notEqual(h.row().Status, 'captured');
  h.state.payment = clone(captured);
  h.context.reconcilePendingPayments();
  assert.equal(h.row().Status, 'captured');
});

test('stale pending data cannot downgrade a captured record', () => {
  const h = harness(); h.setup(); const order = h.order(); h.verify(order.orderToken);
  h.context.saveOrder_(h.context.requireConfiguration_(), { OrderId: orderId, Status: 'pending', PaymentId: paymentId }, false);
  assert.equal(h.row().Status, 'captured');
});

test('old unreconciled records are marked for manual review without provider calls', () => {
  const h = harness(); h.setup(); h.order();
  h.state.time += 7 * 86400000 + 1;
  const calls = h.state.calls.length;
  h.context.reconcilePendingPayments();
  assert.equal(h.row().Status, 'review_needed');
  assert.equal(h.row().LastError, 'RECOVERY_WINDOW_ELAPSED');
  assert.equal(h.state.calls.length, calls);
});

test('global creation budget blocks excessive anonymous orders before provider calls', () => {
  const h = harness(); h.setup();
  const bucket = 'orders:' + Math.floor(h.state.time / 60000);
  h.state.cache.set(bucket, '30');
  assert.equal(h.order().error, 'PAYMENT_BUSY');
  assert.equal(h.state.calls.length, 0);
});
