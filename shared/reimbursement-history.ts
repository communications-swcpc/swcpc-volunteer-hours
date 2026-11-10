/**
 * Volunteer-facing reimbursement history: runtime decoding of the owner
 * projection and the pure rules the screens render from.
 * Design: docs/superpowers/specs/2026-11-08-volunteer-reimbursement-history-design.md
 * Backend contract: docs/reimbursement-history-api.md
 */

export type ReimbursementStatus = 'PENDING' | 'APPROVED' | 'COMPLETE';
export const MAX_RECEIPTS = 5;

/** Same wording as the reviewer screen; volunteers see the reviewers' labels. */
export const STATUS_LABELS: Record<ReimbursementStatus, string> = {
  PENDING: 'Pending approval',
  APPROVED: 'Awaiting payment',
  COMPLETE: 'Completed history',
};

export interface OwnerReimbursement {
  request_id: string;
  contact_id: string;
  email: string;
  amount: string;
  description: string;
  receipt_url: string;
  year: string;
  status: ReimbursementStatus;
  submitted_at: string;
  approved_by: string;
  approved_at: string;
  completed_by: string;
  completed_at: string;
  approved_by_name: string;
  check_number: string;
  check_date: string;
  receipt_urls: string[];
}

const BASE_KEYS = ['request_id', 'contact_id', 'email', 'amount', 'description', 'receipt_url', 'year',
  'status', 'submitted_at', 'approved_by', 'approved_at', 'completed_by', 'completed_at'] as const;

function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Malformed reimbursement.');
  return value as Record<string, unknown>;
}

function optionalText(input: Record<string, unknown>, key: string): string {
  const value = input[key];
  if (value === undefined || value === null) return '';
  if (typeof value !== 'string') throw new Error(`Malformed ${key}.`);
  return value.trim();
}

/**
 * Decode one owner row. Fields added by the history backend
 * (approved_by_name, check_number, check_date, receipt_urls) are optional, so
 * the app reads today's contact route unchanged: no check details and a
 * single receipt.
 */
export function parseOwnerReimbursement(value: unknown): OwnerReimbursement {
  const input = object(value);
  const fields: Record<string, string> = {};
  for (const key of BASE_KEYS) {
    const v = input[key];
    if (v !== undefined && v !== null && typeof v !== 'string') throw new Error(`Malformed ${key}.`);
    fields[key] = (v as string | undefined) ?? '';
  }
  if (!fields.request_id) throw new Error('Malformed request_id.');
  if (!['PENDING', 'APPROVED', 'COMPLETE'].includes(fields.status)) throw new Error('Malformed status.');
  let receipts: string[] = [];
  if (input.receipt_urls !== undefined && input.receipt_urls !== null) {
    if (!Array.isArray(input.receipt_urls)) throw new Error('Malformed receipt_urls.');
    receipts = input.receipt_urls.filter((u): u is string => typeof u === 'string' && u.trim() !== '');
  }
  if (!receipts.length && fields.receipt_url) receipts = [fields.receipt_url];
  return {
    ...(fields as Omit<OwnerReimbursement, 'status' | 'approved_by_name' | 'check_number' | 'check_date' | 'receipt_urls'>),
    status: fields.status as ReimbursementStatus,
    approved_by_name: optionalText(input, 'approved_by_name'),
    check_number: optionalText(input, 'check_number'),
    check_date: optionalText(input, 'check_date'),
    receipt_urls: receipts,
  };
}

/** Newest first, by submitted_at. */
export function parseOwnerReimbursements(value: unknown): OwnerReimbursement[] {
  if (!Array.isArray(value)) throw new Error('Malformed reimbursement list.');
  return value.map(parseOwnerReimbursement)
    .sort((a, b) => b.submitted_at.localeCompare(a.submitted_at));
}

/** Readable date from a sheet timestamp or a YYYY-MM-DD check date; blank when unparseable. */
export function formatDate(value: string): string {
  if (!value) return '';
  const calendar = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  const date = calendar
    ? new Date(Number(calendar[1]), Number(calendar[2]) - 1, Number(calendar[3]))
    : new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
}

export function formatAmount(amount: string): string {
  const n = Number(amount);
  return Number.isFinite(n) ? `$${n.toFixed(2)}` : `$${amount}`;
}

/** The date that matters for the row's status: submitted, approved, or paid. */
export function statusDate(item: OwnerReimbursement): { label: string; date: string } {
  if (item.status === 'COMPLETE') return { label: 'Paid', date: formatDate(item.completed_at) };
  if (item.status === 'APPROVED') return { label: 'Approved', date: formatDate(item.approved_at) };
  return { label: 'Submitted', date: formatDate(item.submitted_at) };
}

export interface ProgressStep {
  key: 'submitted' | 'approved' | 'paid';
  title: string;
  done: boolean;
  /** Lines shown under the title; "Not yet" when the step is incomplete. */
  details: string[];
}

export function progressSteps(item: OwnerReimbursement): ProgressStep[] {
  const approved = item.status === 'APPROVED' || item.status === 'COMPLETE';
  const paid = item.status === 'COMPLETE';
  const approver = item.approved_by_name || item.approved_by;
  const paidDetails: string[] = [];
  if (paid) {
    paidDetails.push(formatDate(item.completed_at));
    if (item.check_number) paidDetails.push(`Check #${item.check_number}`);
    if (item.check_date) paidDetails.push(`Check dated ${formatDate(item.check_date)}`);
  }
  return [
    { key: 'submitted', title: 'Submitted', done: true, details: [formatDate(item.submitted_at)].filter(Boolean) },
    { key: 'approved', title: 'Approved', done: approved,
      details: approved ? [formatDate(item.approved_at), approver ? `by ${approver}` : ''].filter(Boolean) : ['Not yet'] },
    { key: 'paid', title: 'Check written', done: paid, details: paid ? paidDetails.filter(Boolean) : ['Not yet'] },
  ];
}

/** Approval freezes a request: only PENDING requests may be edited. */
export function canEdit(item: OwnerReimbursement): boolean {
  return item.status === 'PENDING';
}

export function isPdfUrl(url: string): boolean {
  return /\.pdf(?:$|[?#])/i.test(url);
}
