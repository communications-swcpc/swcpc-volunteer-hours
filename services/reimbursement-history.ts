import { MAX_RECEIPTS, parseOwnerReimbursements, type OwnerReimbursement } from '../shared/reimbursement-history';

/** Backend contract: docs/reimbursement-history-api.md */
export class HistoryClientError extends Error {
  constructor(public readonly code: string, message: string) { super(message); }
}

const messages: Record<string, string> = {
  NOT_PENDING: 'This request has already been approved and can no longer be changed.',
  NOT_FOUND: 'Request not found. Pull down to refresh your list.',
  VALIDATION: 'Check the amount, description and receipts and try again.',
  UNAVAILABLE: 'Network error. Please check your connection and try again.',
};

export interface LocalReceipt { base64: string; mime: string }

export interface ReimbursementDraft {
  amount: number;
  description: string;
  receiptUrls: string[];
}

function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}

export function createHistoryClient(deps: { baseURL: string; transport: typeof fetch }) {
  if (new URL(deps.baseURL).protocol !== 'https:') throw new Error('An approved HTTPS backend is required.');

  const call = async (path: string, init: RequestInit): Promise<Record<string, unknown> | unknown[]> => {
    let response: Response;
    try {
      response = await deps.transport(`${deps.baseURL}${path}`, init);
    } catch {
      throw new HistoryClientError('UNAVAILABLE', messages.UNAVAILABLE);
    }
    let payload: unknown;
    try { payload = await response.json(); } catch { payload = undefined; }
    if (!response.ok) {
      const data = object(payload);
      const code = typeof data.code === 'string' ? data.code
        : response.status === 404 ? 'NOT_FOUND' : response.status === 409 ? 'NOT_PENDING' : response.status >= 500 ? 'UNAVAILABLE' : 'VALIDATION';
      const message = typeof data.error === 'string' && data.error ? data.error : messages[code] ?? messages.VALIDATION;
      throw new HistoryClientError(code, message);
    }
    if (payload === undefined) throw new HistoryClientError('UNAVAILABLE', messages.UNAVAILABLE);
    return payload as Record<string, unknown> | unknown[];
  };

  const json = (method: string, body: unknown, email?: string): RequestInit => ({
    method,
    headers: { 'Content-Type': 'application/json', ...(email ? { 'x-mobile-email': email } : {}) },
    body: JSON.stringify(body),
  });

  const checkReceipts = (urls: string[]) => {
    if (urls.length < 1) throw new HistoryClientError('VALIDATION', 'At least one receipt is required.');
    if (urls.length > MAX_RECEIPTS) throw new HistoryClientError('VALIDATION', `No more than ${MAX_RECEIPTS} receipts per request.`);
  };

  return {
    /** The signed-in volunteer's own requests, newest first. */
    async list(contactId: string): Promise<OwnerReimbursement[]> {
      const payload = await call(`/api/reimbursements/contact/${encodeURIComponent(contactId)}`, { method: 'GET' });
      try { return parseOwnerReimbursements(payload); }
      catch { throw new HistoryClientError('UNAVAILABLE', 'Could not read your requests. Please try again.'); }
    },

    /** One receipt per request: Vercel caps a function body at about 4.5 MB and receipts travel as base64. */
    async uploadReceipt(session: { contactId: string; email: string }, receipt: LocalReceipt): Promise<string> {
      const data = object(await call('/api/reimbursements/receipts', json('POST', {
        contact_id: session.contactId, email: session.email, receipt_base64: receipt.base64, receipt_mime: receipt.mime,
      })));
      if (typeof data.url !== 'string' || !data.url) throw new HistoryClientError('UNAVAILABLE', 'Receipt upload failed. Please try again.');
      return data.url;
    },

    /** Edit a PENDING request in place. The server refuses once it is approved. */
    async edit(session: { contactId: string; email: string }, requestId: string, draft: ReimbursementDraft): Promise<void> {
      checkReceipts(draft.receiptUrls);
      await call(`/api/reimbursements/${encodeURIComponent(requestId)}`, json('PATCH', {
        contact_id: session.contactId, amount: draft.amount, description: draft.description, receipt_urls: draft.receiptUrls,
      }, session.email));
    },
  };
}
