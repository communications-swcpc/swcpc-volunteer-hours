/** Portable J027 contract. Keep the backend and mobile copy identical. */
export const PAYMENT_LIMITS = { checkNumber: 50, note: 2000, reason: 500 } as const;
export interface PaymentValidationLimits { checkNumber: number; note: number; reason: number }
function validateLimits(limits: PaymentValidationLimits): void {
  if (!limits || [limits.checkNumber, limits.note, limits.reason].some(n => !Number.isSafeInteger(n) || n <= 0)) {
    throw new PaymentError('VALIDATION', 'Explicit positive text limits are required.');
  }
}
export const PAYMENT_KEYS = ['check_number', 'check_date', 'payment_note'] as const;
export type PaymentKey = typeof PAYMENT_KEYS[number];
export interface PaymentDetails {
  check_number: string;
  check_date: string;
  payment_note: string;
}
export type PaymentPatch = Partial<PaymentDetails>;
export type PaymentErrorCode = 'VALIDATION' | 'FORBIDDEN' | 'CONFLICT' | 'NOT_FOUND'
  | 'NOT_APPROVED' | 'ALREADY_COMPLETE' | 'ALREADY_PENDING' | 'SCHEMA_MISMATCH'
  | 'OUTCOME_UNKNOWN';
export class PaymentError extends Error {
  constructor(public readonly code: PaymentErrorCode, message: string) {
    super(message);
    this.name = 'PaymentError';
  }
}

export function isCalendarDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  if (year < 1 || month < 1 || month > 12 || day < 1) return false;
  const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const days = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  return day <= days[month - 1];
}

/** Compare calendar strings, without interpreting either as a timestamp. */
export function isFutureCheckDate(date: string, today: string): boolean {
  if (!isCalendarDate(today)) throw new PaymentError('VALIDATION', 'Invalid current calendar date.');
  return isCalendarDate(date) && date > today;
}

function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new PaymentError('VALIDATION', 'Payment details must be an object.');
  }
  return value as Record<string, unknown>;
}

function validatedText(key: PaymentKey, value: unknown, limits: PaymentValidationLimits = PAYMENT_LIMITS): string {
  validateLimits(limits);
  if (typeof value !== 'string') throw new PaymentError('VALIDATION', `${key} must be text.`);
  // Notes are plain text; keep meaningful whitespace and formula-like prefixes literal.
  const text = key === 'payment_note' ? (value.trim() ? value : '') : value.trim();
  const max = key === 'payment_note' ? limits.note : key === 'check_number' ? limits.checkNumber : 10;
  if (text.length > max) throw new PaymentError('VALIDATION', `${key} exceeds ${max} characters.`);
  if (key === 'check_date' && text && !isCalendarDate(text)) {
    throw new PaymentError('VALIDATION', 'Check date must be a real calendar date in YYYY-MM-DD format.');
  }
  return text;
}

/** Omitted properties preserve values; only explicit blank strings clear them. */
export function parsePaymentPatch(value: unknown, limits: PaymentValidationLimits = PAYMENT_LIMITS): PaymentPatch {
  const input = object(value);
  if (Object.keys(input).some(key => !PAYMENT_KEYS.includes(key as PaymentKey))) {
    throw new PaymentError('VALIDATION', 'Unknown payment field.');
  }
  const patch: PaymentPatch = {};
  for (const key of PAYMENT_KEYS) {
    if (Object.prototype.hasOwnProperty.call(input, key)) patch[key] = validatedText(key, input[key], limits);
  }
  return patch;
}

export function normalizePaymentDetails(value: Partial<PaymentDetails>, limits: PaymentValidationLimits = PAYMENT_LIMITS): PaymentDetails {
  return {
    check_number: validatedText('check_number', value.check_number === undefined ? '' : value.check_number, limits),
    check_date: validatedText('check_date', value.check_date === undefined ? '' : value.check_date, limits),
    payment_note: validatedText('payment_note', value.payment_note === undefined ? '' : value.payment_note, limits),
  };
}

export function mergePaymentDetails(current: Partial<PaymentDetails>, patch: PaymentPatch, limits: PaymentValidationLimits = PAYMENT_LIMITS): PaymentDetails {
  return { ...normalizePaymentDetails(current, limits), ...parsePaymentPatch(patch, limits) };
}

export function parsePaymentRevision(value: unknown): number {
  if (value === undefined || value === '') return 0; // legacy rows only
  if (typeof value === 'string' && /^(0|[1-9]\d*)$/.test(value)) value = Number(value);
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 0) {
    throw new PaymentError('VALIDATION', 'Invalid payment revision.');
  }
  return value;
}

export interface PaymentCommand {
  command_id: string;
  expected_revision: number;
  details: PaymentPatch;
  reason?: string;
  acknowledge_reset?: boolean;
}

/** Actor, timestamp, operation and request ID never come from a command body. */
export function parsePaymentCommand(value: unknown, limits: PaymentValidationLimits = PAYMENT_LIMITS): PaymentCommand {
  validateLimits(limits);
  const input = object(value);
  const keys = ['command_id', 'expected_revision', 'details', 'reason', 'acknowledge_reset'];
  if (Object.keys(input).some(key => !keys.includes(key))) {
    throw new PaymentError('VALIDATION', 'Unknown command field.');
  }
  if (typeof input.command_id !== 'string' || !/^[A-Za-z0-9_-]{16,100}$/.test(input.command_id)) {
    throw new PaymentError('VALIDATION', 'A command ID of 16–100 letters, digits, underscores or hyphens is required.');
  }
  if (typeof input.expected_revision !== 'number') {
    throw new PaymentError('VALIDATION', 'An expected revision is required.');
  }
  const expected_revision = parsePaymentRevision(input.expected_revision);
  let reason: string | undefined;
  if (Object.prototype.hasOwnProperty.call(input, 'reason')) {
    if (typeof input.reason !== 'string') throw new PaymentError('VALIDATION', 'Reason must be text.');
    reason = input.reason.trim();
    if (reason.length > limits.reason) throw new PaymentError('VALIDATION', `Reason exceeds ${limits.reason} characters.`);
  }
  if (input.acknowledge_reset !== undefined && typeof input.acknowledge_reset !== 'boolean') {
    throw new PaymentError('VALIDATION', 'Reset acknowledgment must be a boolean.');
  }
  return {
    command_id: input.command_id,
    expected_revision,
    details: parsePaymentPatch(input.details === undefined ? {} : input.details, limits),
    ...(reason !== undefined ? { reason } : {}),
    ...(input.acknowledge_reset !== undefined ? { acknowledge_reset: input.acknowledge_reset as boolean } : {}),
  };
}

export const REIMBURSEMENT_BASE_KEYS = ['request_id', 'contact_id', 'email', 'amount', 'description',
  'receipt_url', 'year', 'status', 'submitted_at', 'approved_by', 'approved_at', 'completed_by', 'completed_at'] as const;
export type ReimbursementStatus = 'PENDING' | 'APPROVED' | 'COMPLETE';
export type ReimbursementBase = Record<typeof REIMBURSEMENT_BASE_KEYS[number], string> & { status: ReimbursementStatus };
export interface ReviewerReimbursement extends ReimbursementBase, PaymentDetails {
  payment_revision: number;
  payment_updated_by: string;
  payment_updated_at: string;
  full_name: string;
  address: { street: string; city: string; state: string; zip: string } | null;
}

/** Explicit projection: unknown appended Sheet columns never enter a client response. */
export function projectReimbursement(value: ReimbursementBase & Partial<PaymentDetails> & {
  payment_revision?: string | number; payment_updated_by?: string; payment_updated_at?: string;
}, includePayment: boolean, limits: PaymentValidationLimits = PAYMENT_LIMITS): ReimbursementBase | (ReimbursementBase & PaymentDetails & {
  payment_revision: number; payment_updated_by: string; payment_updated_at: string;
}) {
  const result: Record<string, string> = {};
  for (const key of REIMBURSEMENT_BASE_KEYS) result[key] = value[key];
  if (!includePayment) return result as ReimbursementBase;
  return { ...(result as ReimbursementBase), ...normalizePaymentDetails(value, limits), payment_revision: parsePaymentRevision(value.payment_revision),
    payment_updated_by: value.payment_updated_by ?? '', payment_updated_at: value.payment_updated_at ?? '' };
}

/** Runtime decoding for the phone app; no unchecked JSON array cast. */
export function parseReviewerReimbursement(value: unknown, limits: PaymentValidationLimits = PAYMENT_LIMITS): ReviewerReimbursement {
  const input = object(value);
  const fields: Record<string, string> = {};
  for (const key of REIMBURSEMENT_BASE_KEYS) {
    if (typeof input[key] !== 'string') throw new PaymentError('VALIDATION', `Invalid reimbursement ${key}.`);
    fields[key] = input[key] as string;
  }
  if (!fields.request_id || !['PENDING', 'APPROVED', 'COMPLETE'].includes(fields.status)) {
    throw new PaymentError('VALIDATION', 'Invalid reimbursement ID or status.');
  }
  const base = fields as ReimbursementBase;
  if (!base.amount.trim() || !Number.isFinite(Number(base.amount)) || Number(base.amount) <= 0) {
    throw new PaymentError('VALIDATION', 'Invalid reimbursement amount.');
  }
  const details: PaymentPatch = {};
  for (const key of PAYMENT_KEYS) {
    if (Object.prototype.hasOwnProperty.call(input, key)) details[key] = validatedText(key, input[key], limits);
  }
  const metadata = (key: string) => {
    if (input[key] === undefined) return '';
    if (typeof input[key] !== 'string') throw new PaymentError('VALIDATION', `Invalid ${key}.`);
    return input[key] as string;
  };
  let address: ReviewerReimbursement['address'] = null;
  if (input.address !== undefined && input.address !== null) {
    const raw = object(input.address);
    const parsed = { street: '', city: '', state: '', zip: '' };
    for (const key of Object.keys(parsed) as (keyof typeof parsed)[]) {
      if (typeof raw[key] !== 'string') throw new PaymentError('VALIDATION', 'Invalid mailing address.');
      parsed[key] = raw[key] as string;
    }
    address = parsed;
  }
  return { ...base, ...normalizePaymentDetails(details, limits), payment_revision: parsePaymentRevision(input.payment_revision),
    payment_updated_by: metadata('payment_updated_by'), payment_updated_at: metadata('payment_updated_at'),
    full_name: metadata('full_name') || base.email, address };
}

export function parseReviewerReimbursements(value: unknown, limits: PaymentValidationLimits = PAYMENT_LIMITS): ReviewerReimbursement[] {
  if (!Array.isArray(value)) throw new PaymentError('VALIDATION', 'Invalid reimbursement list.');
  return value.map(item => parseReviewerReimbursement(item, limits));
}

/** Financial staff only. Authorize the server-resolved caller BEFORE invoking this; mobile email is a claim. */
export function projectFinancialReviewerReimbursement(value: ReimbursementBase & Partial<PaymentDetails> & {
  payment_revision?: string | number; payment_updated_by?: string; payment_updated_at?: string;
  full_name?: string; address?: ReviewerReimbursement['address'];
}, limits: PaymentValidationLimits = PAYMENT_LIMITS): ReviewerReimbursement {
  return parseReviewerReimbursement({ ...projectReimbursement(value, true, limits),
    full_name: value.full_name, address: value.address }, limits);
}
