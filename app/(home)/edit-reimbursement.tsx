import React, { useEffect, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, Alert, ActivityIndicator,
} from 'react-native';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { FormField } from '@/components/FormField';
import { ReceiptPicker, remoteReceipt, type ReceiptItem } from '@/components/ReceiptPicker';
import { useSession } from '@/context/SessionContext';
import { API_BASE } from '@/constants/api';
import { createHistoryClient, HistoryClientError } from '@/services/reimbursement-history';
import { canEdit } from '@/shared/reimbursement-history';

const historyClient = createHistoryClient({ baseURL: API_BASE, transport: fetch });

/** Edit a PENDING request: amount, description and receipts, prefilled. No delete, by design. */
export default function EditReimbursementScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session } = useSession();
  const [loaded, setLoaded] = useState(false);
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [receipts, setReceipts] = useState<ReceiptItem[]>([]);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<{ amount?: string; description?: string; receipt?: string }>({});

  useEffect(() => {
    if (!session || !id) return;
    historyClient.list(session.contactId)
      .then(list => {
        const item = list.find(r => r.request_id === id);
        if (!item || !canEdit(item)) {
          Alert.alert('Cannot edit', item ? 'This request has already been approved and can no longer be changed.' : 'Request not found.');
          router.back();
          return;
        }
        setAmount(item.amount);
        setDescription(item.description);
        setReceipts(item.receipt_urls.map(remoteReceipt));
        setLoaded(true);
      })
      .catch(e => {
        Alert.alert('Error', e instanceof Error ? e.message : 'Could not load this request.');
        router.back();
      });
  }, [session, id]);

  const validate = (): boolean => {
    const next: typeof errors = {};
    if (!amount.trim()) next.amount = 'Amount is required';
    else if (isNaN(Number(amount)) || Number(amount) <= 0) next.amount = 'Enter a positive number';
    if (!description.trim()) next.description = 'Description is required';
    if (!receipts.length) next.receipt = 'Receipt is required';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSave = async () => {
    if (!session || !id || !validate()) return;
    setSaving(true);
    try {
      // New receipts upload one per request; uploaded URLs are kept so a retry never uploads twice.
      const uploaded: ReceiptItem[] = [];
      for (const r of receipts) {
        uploaded.push(r.url ? r : { ...r, url: await historyClient.uploadReceipt(session, { base64: r.base64!, mime: r.mime }) });
      }
      setReceipts(uploaded);
      await historyClient.edit(session, id, {
        amount: Number(amount),
        description: description.trim(),
        receiptUrls: uploaded.map(r => r.url!),
      });
      Alert.alert('Saved', 'Your request has been updated.');
      router.back();
    } catch (e) {
      const message = e instanceof HistoryClientError ? e.message : 'Network error. Please check your connection and try again.';
      Alert.alert(e instanceof HistoryClientError && e.code === 'NOT_PENDING' ? 'Cannot edit' : 'Error', message);
      if (e instanceof HistoryClientError && e.code === 'NOT_PENDING') router.back();
    } finally {
      setSaving(false);
    }
  };

  if (!loaded) {
    return (
      <>
        <Stack.Screen options={{ title: 'Edit Request' }} />
        <View style={styles.center}><ActivityIndicator size="large" color="#2d6a4f" /></View>
      </>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: 'Edit Request' }} />
      <ScrollView style={styles.scroll} contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <View style={styles.card}>
          <FormField label="Amount ($)" required error={errors.amount}>
            <TextInput
              style={[styles.input, errors.amount && styles.inputError]}
              value={amount} onChangeText={setAmount}
              placeholder="e.g. 25.50" keyboardType="decimal-pad"
            />
          </FormField>
          <FormField label="Description" required error={errors.description}>
            <TextInput
              style={[styles.input, styles.textarea, errors.description && styles.inputError]}
              value={description} onChangeText={setDescription}
              placeholder="What was this expense for?" multiline numberOfLines={3} textAlignVertical="top"
            />
          </FormField>
          <FormField label="Receipts" required error={errors.receipt}>
            <ReceiptPicker receipts={receipts} onChange={setReceipts} />
          </FormField>
          <TouchableOpacity
            style={[styles.button, saving && styles.buttonDisabled]}
            onPress={handleSave} disabled={saving} activeOpacity={0.8}
          >
            {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Save Changes</Text>}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  container: { padding: 16, paddingBottom: 40 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  card: {
    backgroundColor: '#fff', borderRadius: 12, padding: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 4, elevation: 2, marginBottom: 16,
  },
  input: { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8, padding: 12, fontSize: 15, color: '#111827', backgroundColor: '#fff' },
  inputError: { borderColor: '#dc2626' },
  textarea: { minHeight: 72 },
  button: { backgroundColor: '#2d6a4f', borderRadius: 10, padding: 16, alignItems: 'center', justifyContent: 'center', minHeight: 52 },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#fff', fontSize: 17, fontWeight: '700' },
});
