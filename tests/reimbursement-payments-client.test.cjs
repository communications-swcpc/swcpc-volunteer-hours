const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createPaymentClient } = require(process.env.PAYMENT_CLIENT_PATH);
const limits = { checkNumber: 50, note: 2000, reason: 500 };
const command = { command_id: 'fixture-command-0001', expected_revision: 0, details: { check_number: '00123' } };
const record = { request_id: 'fixture-request', contact_id: 'fixture-contact', email: 'fixture@example.org',
  amount: '25', description: '', receipt_url: 'https://example.org/receipt', year: '2026', status: 'APPROVED',
  submitted_at: '', approved_by: '', approved_at: '', completed_by: '', completed_at: '', payment_revision: 1, check_number: '00123' };
const receipt = { command_id: command.command_id, event_id: 'fixture-event', revision: 1, reimbursement: record };
const make = (transport, email = 'treasurer@corridorpark.org') => createPaymentClient({ baseURL: 'https://fixture.invalid', limits,
  getClaimedEmail: async () => email, transport });
test('missing claimed email does not call transport', async () => {
  let called = false;
  await assert.rejects(make(async () => { called = true; }, null).mutate(record.request_id, 'SAVE', command), error => error.code === 'UNAUTHORIZED');
  assert.equal(called, false);
});
test('uses original email header without a bearer credential and validates receipt', async () => {
  let captured;
  const result = await make(async (url, options) => { captured = { url, options }; return Response.json({ success: true, receipt }); }).mutate(record.request_id, 'SAVE', command);
  assert.equal(result.reimbursement.check_number, '00123');
  assert.equal(captured.options.headers['x-mobile-email'], 'treasurer@corridorpark.org');
  assert.equal(captured.options.headers.Authorization, undefined);
  assert.equal(captured.options.method, 'PATCH');
});
test('unknown operation fails before transport', async () => {
  let called = false;
  await assert.rejects(make(async () => { called = true; }).mutate(record.request_id, 'RESETT', command), error => error.code === 'VALIDATION');
  assert.equal(called, false);
});
test('offline mutation is unknown and is not automatically replayed', async () => {
  let calls = 0;
  await assert.rejects(make(async () => { calls++; throw new Error('offline'); }).mutate(record.request_id, 'COMPLETE', command), error => error.code === 'OUTCOME_UNKNOWN' && error.outcomeUnknown);
  assert.equal(calls, 1);
});
test('expired identity has a safe message, ignoring arbitrary server text', async () => {
  await assert.rejects(make(async () => Response.json({ error: 'private backend content' }, { status: 401 })).mutate(record.request_id, 'SAVE', command),
    error => error.code === 'UNAUTHORIZED' && !error.message.includes('private backend content'));
});
test('malformed errors and malformed successful receipts do not assert save failure', async () => {
  for (const response of [Response.json('malformed', { status: 503 }), Response.json({ success: true, receipt: { ...receipt, revision: 9 } }),
    Response.json({ success: true, receipt: { ...receipt, command_id: 'different-command-0002' } })]) {
    await assert.rejects(make(async () => response).mutate(record.request_id, 'SAVE', command), error => error.code === 'OUTCOME_UNKNOWN');
  }
});
test('reconciles committed command identity and distinguishes pending/absent/unknown', async () => {
  const committed = await make(async () => Response.json({ state: 'COMMITTED', receipt })).reconcile(record.request_id, command.command_id);
  assert.equal(committed.receipt.event_id, receipt.event_id);
  for (const state of ['ABSENT', 'PENDING', 'UNKNOWN']) {
    assert.deepEqual(await make(async () => Response.json({ state })).reconcile(record.request_id, command.command_id), { state });
  }
});
test('reconciliation rejects a receipt from another command/request', async () => {
  await assert.rejects(make(async () => Response.json({ state: 'COMMITTED', receipt: { ...receipt, command_id: 'different-command-0002' } })).reconcile(record.request_id, command.command_id));
});
test('single-request decoding preserves COMPLETE and rejects malformed JSON shapes', async () => {
  assert.equal((await make(async () => Response.json([{ ...record, status: 'COMPLETE' }])).read(record.request_id)).status, 'COMPLETE');
  await assert.rejects(make(async () => Response.json([{ ...record, status: 'PAID' }])).read(record.request_id));
});

 test('ambiguous JSON gateway failures retain unknown mutation outcome', async () => {
  for (const status of [502, 503]) {
    await assert.rejects(make(async () => new Response(JSON.stringify({ error: 'gateway' }), { status })).mutate(record.request_id, 'SAVE', command), error => error.code === 'OUTCOME_UNKNOWN' && error.outcomeUnknown);
  }
});

 test('payment reset uses the separate payment reissue endpoint and reason-only command', async () => {
  let seen;
  const client = make(async (url, options) => { seen = { url, options }; return Response.json({ success: true, receipt }); });
  await client.mutate(record.request_id, 'RESET', { command_id: command.command_id, expected_revision: 0, reason: 'Voided check for reissue' });
  assert.match(seen.url, /\/payment\/reset$/);
  assert.equal(JSON.parse(seen.options.body).reason, 'Voided check for reissue');
  assert.deepEqual(JSON.parse(seen.options.body).details, {});
});
