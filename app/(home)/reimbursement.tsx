import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, Alert, ActivityIndicator, Image, Platform,
} from 'react-native';
import { Stack } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import { FormField } from '@/components/FormField';
import { API_BASE } from '@/constants/api';
import { Ionicons } from '@expo/vector-icons';
import { useSession } from '@/context/SessionContext';

export default function ReimbursementScreen() {
  const { session, budget, budgetLoading, refreshBudget } = useSession();
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [receipt, setReceipt] = useState<{ uri: string; base64?: string; mime: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<{ amount?: string; description?: string; receipt?: string }>({});

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Camera access is required to take a photo of your receipt.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true, quality: 0.8, base64: true,
    });
    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      setReceipt({ uri: asset.uri, base64: asset.base64 || undefined, mime: asset.mimeType || 'image/jpeg' });
    }
  };

  const pickFile = async () => {
    const result = await DocumentPicker.getDocumentAsync({ type: ['image/*', 'application/pdf'], copyToCacheDirectory: true });
    if (result.canceled) return;
    const file = result.assets[0];
    const mime = file.mimeType || 'image/jpeg';
    if (file.uri && (mime.startsWith('image/') || mime === 'application/pdf')) {
      try {
        const base64 = await FileSystem.readAsStringAsync(file.uri, { encoding: 'base64' });
        setReceipt({ uri: file.uri, base64, mime });
      } catch {
        setReceipt({ uri: file.uri, mime });
      }
    }
  };

  const validateForm = (): boolean => {
    const newErrors: typeof errors = {};
    if (!amount.trim()) newErrors.amount = 'Amount is required';
    else if (isNaN(Number(amount)) || Number(amount) <= 0) newErrors.amount = 'Enter a positive number';
    if (!description.trim()) newErrors.description = 'Description is required';
    if (!receipt) newErrors.receipt = 'Receipt is required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!session || !validateForm()) return;
    const amt = Number(amount);
    if (budget && amt > budget.remaining) {
      Alert.alert('Over budget', `You have $${budget.remaining.toFixed(2)} remaining. Requested amount would exceed your $${budget.limit} annual limit.`);
      return;
    }
    setSubmitting(true);
    try {
      const body: Record<string, unknown> = {
        contact_id: session.contactId,
        email: session.email,
        amount: amt,
        description: description.trim(),
      };
      if (receipt?.base64) {
        body.receipt_base64 = receipt.base64;
        body.receipt_mime = receipt.mime;
      } else {
        Alert.alert('Error', 'Receipt is required. Please take a photo or choose a file.');
        setSubmitting(false);
        return;
      }
      const res = await fetch(`${API_BASE}/api/reimbursements`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        Alert.alert('Submitted!', 'Your reimbursement request has been sent. The president and treasurer have been notified.');
        setAmount('');
        setDescription('');
        setReceipt(null);
        refreshBudget();
      } else {
        Alert.alert('Error', data.error || 'Failed to submit. Please try again.');
      }
    } catch {
      Alert.alert('Error', 'Network error. Please check your connection and try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Stack.Screen options={{ title: 'Reimbursement' }} />
      <ScrollView style={styles.scroll} contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        {budgetLoading ? (
          <ActivityIndicator size="small" color="#2d6a4f" style={{ marginVertical: 12 }} />
        ) : budget ? (
          <View style={styles.budgetBar}>
            <Text style={styles.budgetText}>
              You have ${budget.remaining.toFixed(2)} of ${budget.limit} remaining for {budget.year}
            </Text>
          </View>
        ) : null}

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

          <FormField label="Receipt" required error={errors.receipt}>
            <View style={styles.receiptRow}>
              <TouchableOpacity style={styles.receiptBtn} onPress={takePhoto}>
                <Ionicons name="camera-outline" size={24} color="#2d6a4f" />
                <Text style={styles.receiptBtnText}>Take Photo</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.receiptBtn} onPress={pickFile}>
                <Ionicons name="document-outline" size={24} color="#2d6a4f" />
                <Text style={styles.receiptBtnText}>Choose File</Text>
              </TouchableOpacity>
            </View>
            {receipt && (
              <View style={styles.receiptPreview}>
                {receipt.mime.startsWith('image/') ? (
                  <Image source={{ uri: receipt.uri }} style={styles.receiptThumb} resizeMode="cover" />
                ) : (
                  <Ionicons name="document" size={48} color="#6b7280" />
                )}
                <Text style={styles.receiptPreviewText}>Receipt attached</Text>
                <TouchableOpacity onPress={() => setReceipt(null)}>
                  <Text style={styles.removeText}>Remove</Text>
                </TouchableOpacity>
              </View>
            )}
          </FormField>

          <TouchableOpacity
            style={[styles.button, submitting && styles.buttonDisabled]}
            onPress={handleSubmit} disabled={submitting} activeOpacity={0.8}
          >
            {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Submit Request</Text>}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  container: { padding: 16, paddingBottom: 40 },
  budgetBar: { paddingVertical: 10, paddingHorizontal: 12, backgroundColor: '#eff6ff', borderRadius: 8, marginBottom: 16 },
  budgetText: { fontSize: 14, color: '#1e40af', fontWeight: '500' },
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
  receiptRow: { flexDirection: 'row', gap: 12 },
  receiptBtn: { flex: 1, borderWidth: 1, borderColor: '#2d6a4f', borderRadius: 8, padding: 16, alignItems: 'center', gap: 8 },
  receiptBtnText: { fontSize: 14, color: '#2d6a4f', fontWeight: '600' },
  receiptPreview: { marginTop: 12, padding: 12, backgroundColor: '#f9fafb', borderRadius: 8, alignItems: 'center', gap: 8 },
  receiptThumb: { width: 120, height: 120, borderRadius: 8 },
  receiptPreviewText: { fontSize: 13, color: '#6b7280' },
  removeText: { fontSize: 13, color: '#dc2626', fontWeight: '600' },
});
