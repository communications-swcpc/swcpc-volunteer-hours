import React, { useEffect, useRef, useState } from 'react';
import { Alert, Button, Text, TextInput, View } from 'react-native';
import { normalizePaymentDetails, parsePaymentPatch, isFutureCheckDate, type PaymentDetails,
  type PaymentValidationLimits, type ReviewerReimbursement } from '../shared/reimbursement-payment';

interface Props {
  request: ReviewerReimbursement;
  identityKey: string;
  canEdit: boolean;
  completionAllowed: boolean;
  completionBlockedMessage?: string;
  dateLabel: string;
  today: string;
  limits: PaymentValidationLimits;
  onSubmit: (operation: 'SAVE' | 'COMPLETE', details: PaymentDetails, reason: string, expectedRevision: number) => Promise<void>;
  onResetPayment?: (reason: string, expectedRevision: number) => Promise<void>;
  onCancel: () => void;
  onReconcile: () => Promise<'COMMITTED' | 'ABSENT' | 'PENDING' | 'UNKNOWN'>;
  onDirtyChange?: (dirty: boolean) => void;
  onHistory?: () => void;
}
/** Unmounted. No auth issuance, persistence, offline replay or stored sensitive drafts. */
export function ReimbursementPaymentEditor(props: Props) {
  if (!props.canEdit || !props.identityKey || props.request.status === 'PENDING') return null;
  return <Draft key={`${props.identityKey}:${props.request.request_id}`} {...props} />;
}
function Draft({ request, completionAllowed, completionBlockedMessage, dateLabel, today, limits, onSubmit, onCancel, onHistory, onReconcile, onDirtyChange, onResetPayment }: Props) {
  const [draft, setDraft] = useState(() => normalizePaymentDetails(request, limits));
  const [baseline] = useState(() => normalizePaymentDetails(request, limits));
  const [expectedRevision] = useState(() => request.payment_revision);
  const stale = request.payment_revision !== expectedRevision;
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [uncertain, setUncertain] = useState(false);
  const [reconciledCommit, setReconciledCommit] = useState(false);
  const alive = useRef(true);
  const submitting = useRef(false);
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  const dirty = JSON.stringify(baseline) !== JSON.stringify(draft) || !!reason;
  useEffect(() => { onDirtyChange?.(dirty || uncertain); }, [dirty, uncertain, onDirtyChange]);
  const reconcile = async () => {
    if (submitting.current) return;
    submitting.current = true; setBusy(true);
    try {
      const outcome = await onReconcile();
      if (alive.current && (outcome === 'COMMITTED' || outcome === 'ABSENT')) { setUncertain(false); setError(outcome === 'COMMITTED' ? 'Payment recorded. Reopen refreshed details before editing again.' : '');
        if (outcome === 'COMMITTED') setReconciledCommit(true); }
    } catch { if (alive.current) setError('Outcome remains unknown. Keep this draft and reconcile again.'); }
    finally { submitting.current = false; if (alive.current) setBusy(false); }
  };
  const submit = async (operation: 'SAVE' | 'COMPLETE' | 'RESET') => {
    if (submitting.current || uncertain || stale || reconciledCommit || operation === 'COMPLETE' && (!completionAllowed || request.status !== 'APPROVED')) return;
    if (operation === 'RESET' && (!onResetPayment || !reason.trim())) { setError('A reason is required to reset payment for reissue.'); return; }
    try {
      if (operation !== 'RESET') parsePaymentPatch(draft, limits);
      submitting.current = true; setBusy(true); setError('');
      if (operation === 'RESET') await onResetPayment!(reason, expectedRevision);
      else await onSubmit(operation, draft, reason, expectedRevision);
    } catch (failure) {
      if (alive.current) {
        const code = failure && typeof failure === 'object' && 'code' in failure ? String(failure.code) : 'OUTCOME_UNKNOWN';
        if (code === 'OUTCOME_UNKNOWN') setUncertain(true);
        setError(failure instanceof Error ? failure.message : 'Save outcome unknown—refresh before retrying.');
      }
    } finally { submitting.current = false; if (alive.current) setBusy(false); }
  };
  return <View style={{ gap: 12, padding: 16 }}>
    <Text>{request.full_name} · ${Number(request.amount).toFixed(2)} · {request.status}</Text>
    <Text>Check number · optional</Text>
    <TextInput accessibilityLabel="Check number" value={draft.check_number} maxLength={limits.checkNumber}
      editable={!busy} autoCapitalize="none" onChangeText={value => setDraft({ ...draft, check_number: value })} />
    <Text>{dateLabel} · optional</Text>
    <TextInput accessibilityLabel={dateLabel} placeholder="YYYY-MM-DD" value={draft.check_date}
      editable={!busy} maxLength={10} onChangeText={value => setDraft({ ...draft, check_date: value })} />
    {isFutureCheckDate(draft.check_date, today) ? <Text>Future date—confirm the intended check date.</Text> : null}
    <Text>Internal payment note · optional</Text>
    <TextInput accessibilityLabel="Internal payment note" value={draft.payment_note} multiline maxLength={limits.note}
      editable={!busy} onChangeText={value => setDraft({ ...draft, payment_note: value })} />
    <Text>Correction, clearing or reissue reason</Text>
    <TextInput accessibilityLabel="Correction, clearing or reissue reason" value={reason} maxLength={limits.reason}
      editable={!busy} onChangeText={setReason} />
    {uncertain ? <Button title="Refresh and reconcile" disabled={busy} onPress={reconcile} /> : null}
    {stale ? <Text accessibilityRole="alert">This request changed. Reopen refreshed details before saving.</Text> : null}
    {error ? <Text accessibilityRole="alert">{error}</Text> : null}
    {!completionAllowed && request.status === 'APPROVED' ? <Text>{completionBlockedMessage}</Text> : null}
    <Button title={busy ? 'Processing…' : 'Save details'} disabled={busy || uncertain || stale || reconciledCommit} onPress={() => submit('SAVE')} />
    {request.status === 'APPROVED' ? <Button title="Confirm & complete" disabled={busy || uncertain || stale || reconciledCommit || !completionAllowed} onPress={() => {
      Alert.alert('Complete reimbursement?', 'Confirm this reimbursement is ready to complete.', [
        { text: 'Cancel', style: 'cancel' }, { text: 'Confirm & complete', onPress: () => { if (alive.current) submit('COMPLETE'); } },
      ]);
    }} /> : null}
    {request.status === 'COMPLETE' && onHistory ? <Button title="View history" disabled={busy} onPress={onHistory} /> : null}
    {onResetPayment ? <Button title="Reset payment for reissue" disabled={busy || uncertain || stale || reconciledCommit} onPress={() => {
      Alert.alert('Reset payment for reissue?', 'Archive prior payment and completion, clear active details, and return to approved awaiting reissue.', [
        { text: 'Cancel', style: 'cancel' }, { text: 'Reset payment', onPress: () => { if (alive.current) submit('RESET'); } },
      ]);
    }} /> : null}
    <Button title="Cancel" disabled={busy || uncertain} onPress={() => {
      if (!dirty) onCancel();
      else Alert.alert('Discard unsaved payment details?', '', [{ text: 'Keep editing', style: 'cancel' },
        { text: 'Discard', style: 'destructive', onPress: () => { if (alive.current) onCancel(); } }]);
    }} />
  </View>;
}
