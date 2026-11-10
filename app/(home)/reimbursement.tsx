import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, Alert, ActivityIndicator,
} from 'react-native';
import { Stack } from 'expo-router';
import { FormField } from '@/components/FormField';
import { AddressModal, AddressInput } from '@/components/AddressModal';
import { API_BASE } from '@/constants/api';
import { useSession } from '@/context/SessionContext';
import { ReceiptPicker, type ReceiptItem } from '@/components/ReceiptPicker';
import { createHistoryClient, HistoryClientError } from '@/services/reimbursement-history';

const historyClient = createHistoryClient({ baseURL: API_BASE, transport: fetch });

export default function ReimbursementScreen() {
  const { session } = useSession();
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [receipts, setReceipts] = useState<ReceiptItem[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<{ amount?: string; description?: string; receipt?: string }>({});
  const [addressModalVisible, setAddressModalVisible] = useState(false);
  const [addressSaving, setAddressSaving] = useState(false);

  const validateForm = (): boolean => {
    const newErrors: typeof errors = {};
    if (!amount.trim()) newErrors.amount = 'Amount is required';
    else if (isNaN(Number(amount)) || Number(amount) <= 0) newErrors.amount = 'Enter a positive number';
    if (!description.trim()) newErrors.description = 'Description is required';
    if (!receipts.length) newErrors.receipt = 'Receipt is required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // A single receipt still travels inline, exactly as before. Several are
  // uploaded one request each (Vercel's ~4.5 MB body cap), then sent as URLs;
  // receipt_url carries the first so every existing reader keeps working.
  // Uploaded URLs are kept on the item so a retry never uploads twice.
  const receiptFields = async (): Promise<Record<string, unknown>> => {
    if (receipts.length === 1 && !receipts[0].url) {
      return { receipt_base64: receipts[0].base64, receipt_mime: receipts[0].mime };
    }
    const uploaded: ReceiptItem[] = [];
    for (const r of receipts) {
      uploaded.push(r.url ? r : { ...r, url: await historyClient.uploadReceipt(session!, { base64: r.base64!, mime: r.mime }) });
    }
    setReceipts(uploaded);
    const urls = uploaded.map(r => r.url!);
    return { receipt_url: urls[0], receipt_urls: urls };
  };

  const postReimbursement = async (address?: AddressInput) => {
    const body: Record<string, unknown> = {
      contact_id: session!.contactId,
      email: session!.email,
      amount: Number(amount),
      description: description.trim(),
      ...(await receiptFields()),
    };
    if (address) body.address = address;
    const res = await fetch(`${API_BASE}/api/reimbursements`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
    });
    const data = await res.json();
    return { res, data };
  };

  const onSubmitSuccess = () => {
    Alert.alert('Submitted!', 'Your reimbursement request has been sent. The vice president and treasurer have been notified.');
    setAmount('');
    setDescription('');
    setReceipts([]);
    setAddressModalVisible(false);
    setSubmitting(false);
  };

  const handleSubmit = async () => {
    if (!session || !validateForm()) return;
    if (receipts.some(r => !r.url && !r.base64)) {
      Alert.alert('Error', 'A receipt could not be read. Remove it and attach it again.');
      return;
    }
    setSubmitting(true);
    try {
      const { res, data } = await postReimbursement();
      if (res.ok && data.success) {
        onSubmitSuccess();
      } else if (data.code === 'ADDRESS_REQUIRED') {
        setAddressModalVisible(true);
      } else {
        Alert.alert('Error', data.error || 'Failed to submit. Please try again.');
        setSubmitting(false);
      }
    } catch (error) {
      Alert.alert('Error', error instanceof HistoryClientError ? error.message : 'Network error. Please check your connection and try again.');
      setSubmitting(false);
    }
  };

  const handleAddressSave = async (address: AddressInput) => {
    setAddressSaving(true);
    try {
      const { res, data } = await postReimbursement(address);
      if (res.ok && data.success) {
        onSubmitSuccess();
      } else {
        Alert.alert('Error', data.error || 'Failed to save address and submit. Please try again.');
      }
    } catch (error) {
      Alert.alert('Error', error instanceof HistoryClientError ? error.message : 'Network error. Please check your connection and try again.');
    } finally {
      setAddressSaving(false);
    }
  };

  const handleAddressCancel = () => {
    setAddressModalVisible(false);
    setSubmitting(false);
  };

  return (
    <>
      <Stack.Screen options={{ title: 'Reimbursement' }} />
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
            style={[styles.button, submitting && styles.buttonDisabled]}
            onPress={handleSubmit} disabled={submitting} activeOpacity={0.8}
          >
            {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Submit Request</Text>}
          </TouchableOpacity>
        </View>
      </ScrollView>
      <AddressModal
        visible={addressModalVisible}
        saving={addressSaving}
        onCancel={handleAddressCancel}
        onSave={handleAddressSave}
      />
    </>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  container: { padding: 16, paddingBottom: 40 },
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
