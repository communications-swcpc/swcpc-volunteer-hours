import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Button, Modal, ScrollView, Text, View } from 'react-native';
import { router, useNavigation } from 'expo-router';
import { usePreventRemove, type NavigationAction } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSession } from '@/context/SessionContext';
import { API_BASE } from '@/constants/api';
import { ReimbursementPaymentEditor } from '@/components/ReimbursementPaymentEditor';
import { createPaymentClient, PaymentClientError } from '@/services/reimbursement-payments';
import { PAYMENT_LIMITS, parsePaymentCommand, type PaymentDetails, type ReviewerReimbursement } from '@/shared/reimbursement-payment';

type Recovery = Record<string, string>;
type History = Awaited<ReturnType<ReturnType<typeof createPaymentClient>['history']>>;
export default function ReviewReimbursementsScreen() {
  const { session, canApprove, canComplete } = useSession();
  useEffect(() => { if (!canApprove && !canComplete) router.replace('/(home)'); }, [canApprove, canComplete]);
  if (!session || !canApprove && !canComplete) return null;
  // Remount and clear financial state on account change; old account recovery remains separately stored.
  return <Review key={session.email} email={session.email} canApprove={canApprove} canComplete={canComplete} />;
}
function Review({ email, canApprove, canComplete }: { email: string; canApprove: boolean; canComplete: boolean }) {
  const client = useMemo(() => createPaymentClient({ baseURL: API_BASE, limits: PAYMENT_LIMITS,
    getClaimedEmail: async () => email, transport: fetch }), [email]);
  const recoveryKey = `@swcpc_payment_commands:${email.toLowerCase()}`;
  const [rows, setRows] = useState<ReviewerReimbursement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState<ReviewerReimbursement | null>(null);
  const [history, setHistory] = useState<History | null>(null);
  const [historyTitle, setHistoryTitle] = useState('');
  const [pending, setPending] = useState<Recovery>({});
  const pendingRef = useRef<Recovery>({});
  const [dirty, setDirty] = useState(false);
  const [active, setActive] = useState(false);
  const dirtyRef = useRef(false), activeRef = useRef(false), selectedRef = useRef<ReviewerReimbursement | null>(null);
  const inFlight = useRef(false), ready = useRef(false), alive = useRef(true);
  const navigation = useNavigation();
  const refresh = useCallback(async () => {
    try { const data = await client.list(); if (alive.current) { setRows(data); setError('');
      setSelected(current => current ? data.find(row => row.request_id === current.request_id) ?? current : null); } }
    catch { if (alive.current) setError('Unable to load reimbursements. Try refresh.'); }
    finally { if (alive.current) setLoading(false); }
  }, [client]);
  useEffect(() => {
    alive.current = true;
    (async () => {
      try {
        const json = await AsyncStorage.getItem(recoveryKey);
        const parsed: unknown = json ? JSON.parse(json) : {};
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)
          || Object.entries(parsed).some(([id]) => !id)) throw new Error('Invalid recovery');
        for (const command of Object.values(parsed)) parsePaymentCommand({ command_id: command, expected_revision: 0 }, PAYMENT_LIMITS);
        if (!alive.current) return;
        pendingRef.current = parsed as Recovery; setPending(parsed as Recovery); ready.current = true;
        await refresh();
      } catch { if (alive.current) { setError('Payment recovery metadata unavailable. Do not submit payments; restart and retry.'); setLoading(false); } }
    })();
    return () => { alive.current = false; };
  }, [recoveryKey, refresh]);
  const [leaveAction, setLeaveAction] = useState<NavigationAction | null>(null);
  const blocked = active || dirty || !!(selected && pending[selected.request_id]);
  usePreventRemove(blocked, ({ data }) => {
    if (activeRef.current || inFlight.current || selectedRef.current && pendingRef.current[selectedRef.current.request_id]) {
      Alert.alert('Payment outcome pending', 'Reconcile the original payment command before leaving this screen.');
    } else if (dirtyRef.current) {
      Alert.alert('Discard unsaved payment details?', '', [
        { text: 'Keep editing', style: 'cancel' }, { text: 'Discard', style: 'destructive', onPress: () => {
          dirtyRef.current = false; setDirty(false); setSelected(null); selectedRef.current = null; setLeaveAction(data.action);
        } },
      ]);
    }
  });
  useEffect(() => { if (leaveAction && !blocked) { navigation.dispatch(leaveAction); setLeaveAction(null); } }, [leaveAction, blocked, navigation]);
  const onActivityChange = useCallback((value: boolean) => { activeRef.current = value; setActive(value); }, []);
  const onDirtyChange = useCallback((value: boolean) => { dirtyRef.current = value; setDirty(value); }, []);
  const storeRecovery = async (next: Recovery) => {
    await AsyncStorage.setItem(recoveryKey, JSON.stringify(next));
    pendingRef.current = next; if (alive.current) setPending(next);
  };
  const clearRecovery = async (id: string) => { const next = { ...pendingRef.current }; delete next[id]; await storeRecovery(next); };
  const submit = async (operation: 'SAVE' | 'COMPLETE' | 'RESET', details: PaymentDetails | undefined, reason: string, revision: number) => {
    const row = selectedRef.current;
    if (!row || !ready.current || inFlight.current || pendingRef.current[row.request_id]) throw new PaymentClientError('CONFLICT', 'Reconcile the original command before saving.');
    inFlight.current = true;
    let started = false;
    try {
      const command = await client.createCommand();
      // Persist opaque UUID only before transport; no payment fields, reasons or financial drafts stored.
      await storeRecovery({ ...pendingRef.current, [row.request_id]: command });
      if (!alive.current) { await clearRecovery(row.request_id); return; }
      started = true;
      await client.mutate(row.request_id, operation, { command_id: command, expected_revision: revision,
        ...(details ? { details } : {}), ...(reason ? { reason } : {}) });
      await clearRecovery(row.request_id);
      if (alive.current) { setSelected(null); selectedRef.current = null; setDirty(false); dirtyRef.current = false; }
      await refresh();
    } catch (failure) {
      if (started && failure instanceof PaymentClientError && !failure.outcomeUnknown) {
        await clearRecovery(row.request_id);
        if (failure.code === 'CONFLICT') await refresh();
      }
      if (!started && pendingRef.current[row.request_id]) await clearRecovery(row.request_id);
      if (!started && !(failure instanceof PaymentClientError)) throw new PaymentClientError('UNAVAILABLE', 'No payment submitted. Recovery storage unavailable.');
      throw failure;
    } finally { inFlight.current = false; }
  };
  const reconcile = async () => {
    const row = selectedRef.current, command = row && pendingRef.current[row.request_id];
    if (!row || !command) return 'UNKNOWN' as const;
    const result = await client.reconcile(row.request_id, command);
    if (result.state === 'COMMITTED') {
      await clearRecovery(row.request_id);
      if (alive.current) { setSelected(null); selectedRef.current = null; setDirty(false); dirtyRef.current = false; }
      await refresh();
    }
    return result.state;
  };
  const openHistory = async (row: ReviewerReimbursement) => {
    try { const events = await client.history(row.request_id); if (alive.current) { setHistory(events); setHistoryTitle(row.full_name); } }
    catch { if (alive.current) Alert.alert('History unavailable', 'Refresh and try again.'); }
  };
  const close = () => {
    if (activeRef.current || inFlight.current || selectedRef.current && pendingRef.current[selectedRef.current.request_id]) return;
    const discard = () => { setSelected(null); selectedRef.current = null; dirtyRef.current = false; setDirty(false); };
    if (dirtyRef.current) Alert.alert('Discard unsaved payment details?', '', [{ text: 'Keep editing', style: 'cancel' }, { text: 'Discard', style: 'destructive', onPress: discard }]);
    else discard();
  };
  const approve = (row: ReviewerReimbursement) => Alert.alert('Approve reimbursement?', `$${Number(row.amount).toFixed(2)} for ${row.full_name}`, [
    { text: 'Cancel', style: 'cancel' }, { text: 'Approve', onPress: async () => {
      if (inFlight.current || !ready.current) return;
      inFlight.current = true; setActive(true); activeRef.current = true;
      try {
        const response = await fetch(`${API_BASE}/api/reimbursements/${encodeURIComponent(row.request_id)}/approve`, { method: 'POST', headers: { 'x-mobile-email': email } });
        if (!response.ok) throw new Error('Approval rejected');
        await refresh();
      } catch { if (alive.current) Alert.alert('Approval outcome uncertain', 'Refresh before acting again.'); }
      finally { inFlight.current = false; if (alive.current) setActive(false); activeRef.current = false; }
    } },
  ]);
  const calendarNow = new Date();
  const today = `${calendarNow.getFullYear()}-${String(calendarNow.getMonth() + 1).padStart(2, '0')}-${String(calendarNow.getDate()).padStart(2, '0')}`;
  const historyPanel = <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}><Text>Payment history · {historyTitle}</Text>
    {history?.length === 0 ? <Text>No payment events recorded.</Text> : null}
    {history?.map((event, index) => <View key={index} style={{ gap: 4 }}><Text>{event.operation} · {event.occurred_at}</Text>
      <Text>Recorded email: {event.actor}</Text><Text>Reason: {event.reason || '—'}</Text>
      <Text>Before: {event.before.status} · Check {event.before.check_number || '—'} · {event.before.check_date || '—'}</Text><Text>{event.before.payment_note}</Text>
      <Text>After: {event.after.status} · Check {event.after.check_number || '—'} · {event.after.check_date || '—'}</Text><Text>{event.after.payment_note}</Text>
    </View>)}<Button title="Close history" onPress={() => setHistory(null)} />
  </ScrollView>;
  if (loading) return <ActivityIndicator accessibilityLabel="Loading reimbursements" />;
  return <View style={{ flex: 1, padding: 16 }}>
    {error ? <Text accessibilityRole="alert">{error}</Text> : null}
    <Button title="Refresh reimbursements" disabled={active || !!selected} onPress={refresh} />
    <ScrollView>
      {(['PENDING', 'APPROVED', 'COMPLETE'] as const).map(status => <View key={status} style={{ gap: 12, marginVertical: 12 }}>
        <Text style={{ fontWeight: 'bold' }}>{status === 'PENDING' ? 'Pending approval' : status === 'APPROVED' ? 'Awaiting payment' : 'Completed history'}</Text>
        {rows.filter(row => row.status === status).map(row => <View key={row.request_id} style={{ padding: 12, borderWidth: 1, borderColor: '#ccc', gap: 8 }}>
          <Text>{row.full_name} · ${Number(row.amount).toFixed(2)}</Text><Text>{row.description}</Text>
          {status !== 'PENDING' ? <Text>Pay to: {row.address ? `${row.address.street}, ${row.address.city}, ${row.address.state} ${row.address.zip}` : 'No mailing address on file'}</Text> : null}
          {status === 'PENDING' && canApprove ? <Button title="Approve" disabled={active} onPress={() => approve(row)} /> : null}
          {status !== 'PENDING' && canComplete ? <Button title={pending[row.request_id] ? 'Reconcile pending payment' : status === 'COMPLETE' ? 'Payment details / correction' : 'Payment details'}
            disabled={active} onPress={() => { selectedRef.current = row; setSelected(row); }} /> : null}
          {status !== 'PENDING' ? <Button title="View payment history" disabled={active} onPress={() => openHistory(row)} /> : null}
        </View>)}
      </View>)}
    </ScrollView>
    <Modal visible={!!selected} onRequestClose={() => { if (history !== null) setHistory(null); else close(); }} animationType="slide">
      <ScrollView style={{ display: history !== null ? 'none' : 'flex' }}><Text style={{ padding: 16 }}>Payment details</Text>
        {selected ? <ReimbursementPaymentEditor request={selected} identityKey={email} canEdit={canComplete}
          completionAllowed={true}
          completionConfirmationMessage={selected.address ? "Confirm this reimbursement is ready to complete." : "No mailing address is on file. Confirm this reimbursement is ready to complete."}
          dateLabel="Check written / issued date" today={today} limits={PAYMENT_LIMITS}
          pendingOutcome={!!pending[selected.request_id]}
          onActivityChange={onActivityChange}
          onDirtyChange={onDirtyChange}
          onSubmit={(operation, details, reason, revision) => submit(operation, details, reason, revision)}
          onResetPayment={(reason, revision) => submit('RESET', undefined, reason, revision)}
          onReconcile={reconcile} onCancel={() => { setSelected(null); selectedRef.current = null; setDirty(false); dirtyRef.current = false; }} onHistory={() => openHistory(selected)} /> : null}
        <Text>{dirty ? 'Unsaved details stay on this screen only.' : ''}</Text>
      </ScrollView>
      {history !== null ? historyPanel : null}
    </Modal>
    <Modal visible={history !== null && !selected} onRequestClose={() => setHistory(null)} animationType="slide">
      {historyPanel}
    </Modal>
  </View>;
}
