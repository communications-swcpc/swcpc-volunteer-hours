const { test } = require('node:test');
const assert = require('node:assert/strict');
const contractPath = process.env.PAYMENT_CONTRACT_PATH;
if (!contractPath) throw new Error('Set PAYMENT_CONTRACT_PATH to the compiled portable payment contract.');
const { parsePaymentPatch, parsePaymentCommand, mergePaymentDetails, isCalendarDate,
  isFutureCheckDate, parseReviewerReimbursements, projectReimbursement, projectFinancialReviewerReimbursement } = require(contractPath);
const legacy = {
  request_id: 'fixture-1', contact_id: 'fixture-contact', email: 'volunteer@example.org',
  amount: '25', description: 'Synthetic only', receipt_url: 'https://example.org/receipt', year: '2026',
  status: 'APPROVED', submitted_at: '2026-10-01T12:00:00Z', approved_by: 'vicepresident@corridorpark.org',
  approved_at: '2026-10-02T12:00:00Z', completed_by: '', completed_at: '',
};
test('text check numbers and plain multiline notes survive', () => {
  assert.deepEqual(parsePaymentPatch({ check_number: ' 00123 ', payment_note: '=SUM(A1)\n<b>text</b>' }),
    { check_number: '00123', payment_note: '=SUM(A1)\n<b>text</b>' });
});
test('omitted properties preserve; explicit blank strings clear', () => {
  const current = { check_number: '00123', check_date: '2026-10-05', payment_note: 'note' };
  assert.deepEqual(mergePaymentDetails(current, {}), current);
  assert.deepEqual(mergePaymentDetails(current, { payment_note: '' }), { ...current, payment_note: '' });
});
test('invalid calendar dates fail without timezone conversion', () => {
  for (const date of ['2026-02-30', '2025-02-29', '1900-02-29', '2026-10-05T00:00:00Z']) {
    assert.equal(isCalendarDate(date), false);
    assert.throws(() => parsePaymentPatch({ check_date: date }));
  }
  for (const date of ['2024-02-29', '2000-02-29', '2026-10-05']) {
    assert.equal(parsePaymentPatch({ check_date: date }).check_date, date);
  }
});
test('future dates warn but remain valid optional details', () => {
  assert.equal(isFutureCheckDate('2026-10-06', '2026-10-05'), true);
  assert.deepEqual(parsePaymentPatch({ check_date: '2026-10-06' }), { check_date: '2026-10-06' });
});
test('null, numeric checks and unknown fields fail', () => {
  for (const patch of [null, [], { check_number: 123 }, { payment_note: null }, { actor: 'treasurer@corridorpark.org' }]) {
    assert.throws(() => parsePaymentPatch(patch));
  }
});
test('text limits match the backend', () => {
  assert.doesNotThrow(() => parsePaymentPatch({ check_number: 'x'.repeat(50), payment_note: 'x'.repeat(2000) }));
  assert.throws(() => parsePaymentPatch({ check_number: 'x'.repeat(51) }));
  assert.throws(() => parsePaymentPatch({ payment_note: 'x'.repeat(2001) }));
});
test('commands require revision and cannot spoof actor/status', () => {
  const input = { command_id: 'fixture-command-0001', expected_revision: 0 };
  assert.deepEqual(parsePaymentCommand(input).details, {});
  assert.throws(() => parsePaymentCommand({ ...input, expected_revision: '0' }));
  assert.throws(() => parsePaymentCommand({ ...input, actor: 'treasurer@corridorpark.org' }));
});
test('legacy DTOs normalize blank payment values', () => {
  assert.deepEqual(parseReviewerReimbursements([legacy])[0], {
    ...legacy, check_number: '', check_date: '', payment_note: '', payment_revision: 0,
    payment_updated_by: '', payment_updated_at: '', full_name: legacy.email, address: null,
  });
});
test('completed DTOs keep explicit COMPLETE status', () => {
  assert.equal(parseReviewerReimbursements([{ ...legacy, status: 'COMPLETE', check_number: '00123' }])[0].status, 'COMPLETE');
});
test('malformed responses fail safely', () => {
  for (const input of [{ error: 'Unauthorized' }, [{ ...legacy, status: 'PAID' }], [{ ...legacy, amount: {} }],
    [{ ...legacy, check_number: 123 }], [{ ...legacy, payment_note: null }], [{ ...legacy, address: { street: 'x' } }]]) {
    assert.throws(() => parseReviewerReimbursements(input));
  }
});
test('nonfinancial projection strips note, revision and unknown sheet columns', () => {
  assert.deepEqual(projectReimbursement({ ...legacy, payment_note: 'private', check_number: '00123', unknown_secret: 'private' }, false), legacy);
});
test('authorized name and address survive reviewer projection', () => {
  const address = { street: '1 Fixture Way', city: 'Boston', state: 'MA', zip: '02115' };
  const projected = projectFinancialReviewerReimbursement({ ...legacy, full_name: 'Fixture Volunteer', address, future_secret: 'private' });
  assert.equal(projected.full_name, 'Fixture Volunteer');
  assert.deepEqual(projected.address, address);
  assert.equal(Object.hasOwn(projected, 'future_secret'), false);
  assert.deepEqual(parseReviewerReimbursements([projected])[0], projected);
});
