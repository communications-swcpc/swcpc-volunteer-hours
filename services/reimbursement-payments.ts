import { parsePaymentCommand, parsePaymentRevision, parseReviewerReimbursement,
  parseReviewerReimbursements, type PaymentCommand, type PaymentValidationLimits, type ReviewerReimbursement } from '../shared/reimbursement-payment';

export class PaymentClientError extends Error {
  constructor(public readonly code: string, message: string, public readonly outcomeUnknown = false) { super(message); }
}
export interface PaymentReceipt { command_id: string; event_id: string; revision: number; reimbursement: ReviewerReimbursement }
export type CommandOutcome = { state: 'COMMITTED'; receipt: PaymentReceipt } | { state: 'ABSENT' | 'PENDING' | 'UNKNOWN' };
const messages: Record<string, string> = {
  UNAUTHORIZED: 'Sign in with your existing ContactCRM email. Your draft is retained.',
  FORBIDDEN: 'Your account cannot edit payment details.',
  VALIDATION: 'Check the payment fields and try again.',
  CONFLICT: 'This request changed. Refresh and reconcile before retrying.',
  NOT_FOUND: 'Request not found. Your draft is retained.',
  OUTCOME_UNKNOWN: 'Save outcome unknown—refresh and reconcile before retrying.',
  UNAVAILABLE: 'Payment service unavailable. Your draft is retained.',
};
function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Malformed response.');
  return value as Record<string, unknown>;
}
/** Baseline mobile claimed-email transport; no ownership proof, persistent drafts or automatic mutation retries. */
export function createPaymentClient(deps: { baseURL: string; limits: PaymentValidationLimits;
  getClaimedEmail: () => Promise<string | null>; transport: typeof fetch }) {
  if (new URL(deps.baseURL).protocol !== 'https:') throw new Error('An approved HTTPS backend is required.');
  const receipt = (value: unknown, requestId: string, commandId?: string): PaymentReceipt => {
    const raw = object(value);
    if (typeof raw.command_id !== 'string' || typeof raw.event_id !== 'string' || !raw.event_id.trim()
      || typeof raw.revision !== 'number' || parsePaymentRevision(raw.revision) < 1) throw new Error('Malformed receipt.');
    parsePaymentCommand({ command_id: raw.command_id, expected_revision: 0 }, deps.limits);
    const reimbursement = parseReviewerReimbursement(raw.reimbursement, deps.limits);
    if (reimbursement.request_id !== requestId || reimbursement.payment_revision !== raw.revision
      || commandId && raw.command_id !== commandId) throw new Error('Mismatched receipt.');
    return { command_id: raw.command_id, event_id: raw.event_id, revision: raw.revision, reimbursement };
  };
  const request = async (path: string, method = 'GET', body?: PaymentCommand): Promise<unknown> => {
    const email = await deps.getClaimedEmail();
    if (!email) throw new PaymentClientError('UNAUTHORIZED', messages.UNAUTHORIZED);
    let response: Response;
    const mutation = method !== 'GET';
    try {
      response = await deps.transport(`${deps.baseURL}${path}`, { method,
        headers: { 'x-mobile-email': email, ...(mutation ? { 'Content-Type': 'application/json' } : {}) },
        ...(body ? { body: JSON.stringify(body) } : {}) });
    } catch {
      const code = mutation ? 'OUTCOME_UNKNOWN' : 'UNAVAILABLE';
      throw new PaymentClientError(code, messages[code], mutation);
    }
    let payload: unknown;
    try { payload = await response.json(); }
    catch {
      const code = mutation ? 'OUTCOME_UNKNOWN' : 'UNAVAILABLE';
      throw new PaymentClientError(code, messages[code], mutation);
    }
    if (!response.ok) {
      let data: Record<string, unknown>;
      try { data = object(payload); }
      catch {
        const code = mutation && response.status >= 500 ? 'OUTCOME_UNKNOWN' : 'UNAVAILABLE';
        throw new PaymentClientError(code, messages[code], code === 'OUTCOME_UNKNOWN');
      }
      const statusCode = response.status === 401 ? 'UNAUTHORIZED' : response.status === 403 ? 'FORBIDDEN'
        : response.status === 404 ? 'NOT_FOUND' : response.status === 409 ? 'CONFLICT'
        : response.status === 400 ? 'VALIDATION' : 'UNAVAILABLE';
      const definiteRejection = data.outcome === 'REJECTED' && data.code === 'SCHEMA_MISMATCH';
      const code = data.code === 'OUTCOME_UNKNOWN' || mutation && response.status >= 500 && !definiteRejection
        ? 'OUTCOME_UNKNOWN' : statusCode;
      throw new PaymentClientError(code, messages[code], code === 'OUTCOME_UNKNOWN');
    }
    return payload;
  };
  return {
    async list() { return parseReviewerReimbursements(await request('/api/reimbursements'), deps.limits); },
    async createCommand() {
      const raw = object(await request('/api/reimbursements/payment-command'));
      return parsePaymentCommand({ command_id: raw.command_id, expected_revision: 0 }, deps.limits).command_id;
    },
    async history(requestId: string) {
      const raw = object(await request(`/api/reimbursements/${encodeURIComponent(requestId)}/history`));
      if (!Array.isArray(raw.events)) throw new PaymentClientError('UNAVAILABLE', messages.UNAVAILABLE);
      return raw.events.map(value => {
        const event = object(value);
        if (event.request_id !== requestId || !['SAVE', 'COMPLETE', 'RESET'].includes(String(event.operation))
          || typeof event.actor !== 'string' || typeof event.occurred_at !== 'string' || typeof event.reason !== 'string') throw new PaymentClientError('UNAVAILABLE', messages.UNAVAILABLE);
        const before = object(event.before), after = object(event.after);
        for (const snapshot of [before, after]) for (const key of ['check_number', 'check_date', 'payment_note', 'status']) {
          if (typeof snapshot[key] !== 'string') throw new PaymentClientError('UNAVAILABLE', messages.UNAVAILABLE);
        }
        return { operation: String(event.operation), actor: event.actor, occurred_at: event.occurred_at, reason: event.reason,
          before: { check_number: String(before.check_number), check_date: String(before.check_date), payment_note: String(before.payment_note), status: String(before.status) },
          after: { check_number: String(after.check_number), check_date: String(after.check_date), payment_note: String(after.payment_note), status: String(after.status) } };
      });
    },
    async mutate(requestId: string, operation: 'SAVE' | 'COMPLETE' | 'RESET', input: unknown) {
      if (!['SAVE', 'COMPLETE', 'RESET'].includes(operation)) throw new PaymentClientError('VALIDATION', messages.VALIDATION);
      const command = parsePaymentCommand(input, deps.limits);
      const payload = await request(`/api/reimbursements/${encodeURIComponent(requestId)}/${operation === 'SAVE' ? 'payment' : operation === 'RESET' ? 'payment/reset' : 'complete'}`,
        operation === 'SAVE' ? 'PATCH' : 'POST', command);
      try {
        const raw = object(payload);
        if (raw.success !== true) throw new Error('Malformed success.');
        return receipt(raw.receipt, requestId, command.command_id);
      } catch { throw new PaymentClientError('OUTCOME_UNKNOWN', messages.OUTCOME_UNKNOWN, true); }
    },
    async read(requestId: string) {
      const rows = parseReviewerReimbursements(await request('/api/reimbursements'), deps.limits);
      const found = rows.find(row => row.request_id === requestId);
      if (!found) throw new PaymentClientError('NOT_FOUND', messages.NOT_FOUND);
      return found;
    },
    async reconcile(requestId: string, commandId: string): Promise<CommandOutcome> {
      const raw = object(await request(`/api/reimbursements/${encodeURIComponent(requestId)}/commands/${encodeURIComponent(commandId)}`));
      if (raw.state === 'COMMITTED') return { state: 'COMMITTED', receipt: receipt(raw.receipt, requestId, commandId) };
      if (raw.state === 'ABSENT' || raw.state === 'PENDING' || raw.state === 'UNKNOWN') return { state: raw.state };
      throw new PaymentClientError('UNAVAILABLE', messages.UNAVAILABLE);
    },
  };
}
