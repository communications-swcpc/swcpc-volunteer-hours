// Run: see docs/reimbursement-history-api.md, "Tests".
const { test } = require('node:test');
const assert = require('node:assert/strict');
const historyPath = process.env.HISTORY_CONTRACT_PATH;
const clientPath = process.env.HISTORY_CLIENT_PATH;
if (!historyPath || !clientPath) throw new Error('Set HISTORY_CONTRACT_PATH and HISTORY_CLIENT_PATH to the compiled modules.');
const { parseOwnerReimbursement, parseOwnerReimbursements, progressSteps, canEdit, statusDate, STATUS_LABELS, MAX_RECEIPTS } = require(historyPath);
const { createHistoryClient, HistoryClientError } = require(clientPath);

const base = {
  request_id: 'fixture-1', contact_id: 'fixture-contact', email: 'volunteer@example.org',
  amount: '25', description: 'Synthetic only', receipt_url: 'https://fixture.public.blob.vercel-storage.com/a.jpg', year: '2026',
  status: 'PENDING', submitted_at: '2026-10-01T12:00:00Z', approved_by: '', approved_at: '', completed_by: '', completed_at: '',
};
const session = { contactId: 'fixture-contact', email: 'volunteer@example.org' };

test('reads today\'s contact route unchanged: single receipt, no check details', () => {
  const item = parseOwnerReimbursement(base);
  assert.deepEqual(item.receipt_urls, [base.receipt_url]);
  assert.equal(item.check_number, '');
  assert.equal(item.approved_by_name, '');
});

test('receipt list wins over the legacy single receipt when present', () => {
  const urls = ['https://x.public.blob.vercel-storage.com/1.jpg', 'https://x.public.blob.vercel-storage.com/2.pdf'];
  assert.deepEqual(parseOwnerReimbursement({ ...base, receipt_urls: urls }).receipt_urls, urls);
  assert.deepEqual(parseOwnerReimbursement({ ...base, receipt_urls: [] }).receipt_urls, [base.receipt_url]);
});

test('rejects malformed rows rather than rendering them', () => {
  assert.throws(() => parseOwnerReimbursement({ ...base, status: 'DENIED' }));
  assert.throws(() => parseOwnerReimbursement({ ...base, request_id: '' }));
  assert.throws(() => parseOwnerReimbursement({ ...base, amount: 25 }));
  assert.throws(() => parseOwnerReimbursements({}));
});

test('list is newest first', () => {
  const list = parseOwnerReimbursements([
    { ...base, request_id: 'old', submitted_at: '2026-01-01T00:00:00Z' },
    { ...base, request_id: 'new', submitted_at: '2026-09-01T00:00:00Z' },
  ]);
  assert.deepEqual(list.map(r => r.request_id), ['new', 'old']);
});

test('pending: only Submitted is complete, later steps read Not yet', () => {
  const steps = progressSteps(parseOwnerReimbursement(base));
  assert.deepEqual(steps.map(s => s.done), [true, false, false]);
  assert.deepEqual(steps[1].details, ['Not yet']);
  assert.deepEqual(steps[2].details, ['Not yet']);
});

test('approved shows approver name, falling back to the address', () => {
  const approved = { ...base, status: 'APPROVED', approved_by: 'vicepresident@corridorpark.org', approved_at: '2026-10-02T12:00:00Z' };
  const named = progressSteps(parseOwnerReimbursement({ ...approved, approved_by_name: 'Fixture Person' }));
  assert.deepEqual(named.map(s => s.done), [true, true, false]);
  assert.ok(named[1].details.includes('by Fixture Person'));
  const unnamed = progressSteps(parseOwnerReimbursement(approved));
  assert.ok(unnamed[1].details.includes('by vicepresident@corridorpark.org'));
});

test('complete shows check number and date when held, paid date alone otherwise', () => {
  const done = { ...base, status: 'COMPLETE', approved_by: 'vp@example.org', approved_at: '2026-10-02T12:00:00Z', completed_at: '2026-10-05T12:00:00Z' };
  const withCheck = progressSteps(parseOwnerReimbursement({ ...done, check_number: '00123', check_date: '2026-10-04' }));
  assert.deepEqual(withCheck[2].details, ['Oct 5, 2026', 'Check #00123', 'Check dated Oct 4, 2026']);
  const bare = progressSteps(parseOwnerReimbursement(done));
  assert.deepEqual(bare[2].details, ['Oct 5, 2026']);
  assert.equal(statusDate(parseOwnerReimbursement(done)).label, 'Paid');
});

test('approval freezes a request: only PENDING is editable', () => {
  assert.equal(canEdit(parseOwnerReimbursement(base)), true);
  assert.equal(canEdit(parseOwnerReimbursement({ ...base, status: 'APPROVED' })), false);
  assert.equal(canEdit(parseOwnerReimbursement({ ...base, status: 'COMPLETE' })), false);
});

test('labels reuse the reviewer screen wording', () => {
  assert.deepEqual(STATUS_LABELS, { PENDING: 'Pending approval', APPROVED: 'Awaiting payment', COMPLETE: 'Completed history' });
  assert.equal(MAX_RECEIPTS, 5);
});

const client = transport => createHistoryClient({ baseURL: 'https://fixture.invalid', transport });

test('edit sends PATCH with the claimed email header and contact id', async () => {
  let captured;
  await client(async (url, init) => { captured = { url, init }; return Response.json({ success: true }); })
    .edit(session, 'fixture-1', { amount: 30, description: 'Fixed', receiptUrls: [base.receipt_url] });
  assert.equal(captured.url, 'https://fixture.invalid/api/reimbursements/fixture-1');
  assert.equal(captured.init.method, 'PATCH');
  assert.equal(captured.init.headers['x-mobile-email'], 'volunteer@example.org');
  assert.deepEqual(JSON.parse(captured.init.body), { contact_id: 'fixture-contact', amount: 30, description: 'Fixed', receipt_urls: [base.receipt_url] });
});

test('edit refused after approval surfaces NOT_PENDING', async () => {
  await assert.rejects(
    client(async () => Response.json({ error: 'This request has already been approved and can no longer be changed.', code: 'NOT_PENDING' }, { status: 409 }))
      .edit(session, 'fixture-1', { amount: 30, description: 'x', receiptUrls: [base.receipt_url] }),
    e => e instanceof HistoryClientError && e.code === 'NOT_PENDING' && /already been approved/.test(e.message));
});

test('edit with no receipts or too many fails before transport', async () => {
  let called = false;
  const c = client(async () => { called = true; return Response.json({}); });
  await assert.rejects(c.edit(session, 'fixture-1', { amount: 1, description: 'x', receiptUrls: [] }), e => e.code === 'VALIDATION');
  await assert.rejects(c.edit(session, 'fixture-1', { amount: 1, description: 'x', receiptUrls: Array(6).fill(base.receipt_url) }), e => e.code === 'VALIDATION');
  assert.equal(called, false);
});

test('upload sends one receipt per request and returns its URL', async () => {
  let body;
  const url = await client(async (_u, init) => { body = JSON.parse(init.body); return Response.json({ url: base.receipt_url }); })
    .uploadReceipt(session, { base64: 'AAAA', mime: 'image/jpeg' });
  assert.equal(url, base.receipt_url);
  assert.deepEqual(body, { contact_id: 'fixture-contact', email: 'volunteer@example.org', receipt_base64: 'AAAA', receipt_mime: 'image/jpeg' });
});

test('network failure is reported, never a silent success', async () => {
  await assert.rejects(client(async () => { throw new Error('offline'); }).list('fixture-contact'), e => e.code === 'UNAVAILABLE');
  await assert.rejects(client(async () => Response.json({ nope: true })).uploadReceipt(session, { base64: 'A', mime: 'image/jpeg' }), e => e.code === 'UNAVAILABLE');
});

test('list decodes and sorts the owner rows', async () => {
  const list = await client(async () => Response.json([base, { ...base, request_id: 'b', submitted_at: '2026-11-01T00:00:00Z' }])).list('fixture-contact');
  assert.deepEqual(list.map(r => r.request_id), ['b', 'fixture-1']);
});
