import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, Alert, ActivityIndicator, Platform, Modal, SafeAreaView,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Stack } from 'expo-router';
import { FormField } from '@/components/FormField';
import { MultiSelectModal } from '@/components/MultiSelectModal';
import { VOLUNTEER_AREAS, VOLUNTEER_ACTIVITIES } from '@/constants/options';
import { API_BASE } from '@/constants/api';
import { useSession } from '@/context/SessionContext';

const API_URL = `${API_BASE}/api/log-hours`;

function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

function formatDisplayDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    month: 'long', day: 'numeric', year: 'numeric',
  });
}

export default function LogHoursScreen() {
  const { session } = useSession();
  const [hours, setHours] = useState('');
  const [date, setDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [areasWorked, setAreasWorked] = useState<string[]>([]);
  const [activities, setActivities] = useState<string[]>([]);
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [hoursError, setHoursError] = useState('');

  const validate = (): boolean => {
    if (!hours.trim() || isNaN(Number(hours)) || Number(hours) <= 0) {
      setHoursError('Enter a positive number of hours');
      return false;
    }
    setHoursError('');
    return true;
  };

  const resetForm = () => {
    setHours('');
    setDate(new Date());
    setAreasWorked([]);
    setActivities([]);
    setDescription('');
    setHoursError('');
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setSubmitting(true);
    try {
      const res = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: session?.firstName || session?.email || '',
          email: session?.email || '',
          contact_id: session?.contactId || undefined,
          hours,
          work_date: formatDate(date),
          description: description.trim() || undefined,
          areas_worked: areasWorked,
          activities,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        Alert.alert('Hours Logged!', 'Thank you for your contribution.', [
          { text: 'OK', onPress: resetForm },
        ]);
      } else {
        const msg = typeof data.error === 'string' ? data.error : 'Failed to submit. Please try again.';
        Alert.alert('Error', msg);
      }
    } catch {
      Alert.alert('Error', 'Network error. Please check your connection and try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Stack.Screen options={{ title: 'Log Volunteer Hours' }} />
      <ScrollView style={styles.scroll} contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Text style={styles.subtitle}>Record your hours with Southwest Corridor Park Conservancy</Text>

        <View style={styles.card}>
          {/* Read-only name/email from session */}
          <View style={styles.readOnlyField}>
            <Text style={styles.readOnlyLabel}>Submitting as</Text>
            <Text style={styles.readOnlyValue}>
              {session?.firstName ? `${session.firstName} · ` : ''}{session?.email}
            </Text>
          </View>

          <FormField label="Hours" required error={hoursError}>
            <TextInput
              style={[styles.input, hoursError && styles.inputError]}
              value={hours}
              onChangeText={setHours}
              placeholder="e.g. 2.5"
              keyboardType="decimal-pad"
              returnKeyType="done"
            />
          </FormField>

          <FormField label="Date">
            <TouchableOpacity style={styles.input} onPress={() => setShowDatePicker(true)} activeOpacity={0.7}>
              <Text style={styles.dateText}>{formatDisplayDate(date)}</Text>
            </TouchableOpacity>
            {Platform.OS === 'ios' ? (
              <Modal visible={showDatePicker} animationType="slide" presentationStyle="pageSheet">
                <SafeAreaView style={styles.dateModal}>
                  <View style={styles.dateModalHeader}>
                    <Text style={styles.dateModalTitle}>Select Date</Text>
                    <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                      <Text style={styles.dateModalDone}>Done</Text>
                    </TouchableOpacity>
                  </View>
                  <DateTimePicker
                    value={date} mode="date" display="spinner" maximumDate={new Date()}
                    onChange={(_, selectedDate) => { if (selectedDate) setDate(selectedDate); }}
                  />
                </SafeAreaView>
              </Modal>
            ) : (
              showDatePicker && (
                <DateTimePicker
                  value={date} mode="date" display="default" maximumDate={new Date()}
                  onChange={(_, selectedDate) => { setShowDatePicker(false); if (selectedDate) setDate(selectedDate); }}
                />
              )
            )}
          </FormField>

          <FormField label="Areas Worked">
            <MultiSelectModal label="Areas Worked" options={VOLUNTEER_AREAS} selected={areasWorked} onChange={setAreasWorked} placeholder="Tap to select areas..." />
          </FormField>

          <FormField label="Other Activities">
            <MultiSelectModal label="Other Activities" options={VOLUNTEER_ACTIVITIES} selected={activities} onChange={setActivities} placeholder="Tap to select activities..." />
          </FormField>

          <FormField label="Description">
            <TextInput
              style={[styles.input, styles.textarea]}
              value={description}
              onChangeText={setDescription}
              placeholder="What did you work on? (optional)"
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </FormField>
        </View>

        <TouchableOpacity
          style={[styles.button, submitting && styles.buttonDisabled]}
          onPress={handleSubmit}
          disabled={submitting}
          activeOpacity={0.8}
        >
          {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Log Hours</Text>}
        </TouchableOpacity>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  container: { padding: 16, paddingBottom: 40 },
  subtitle: { fontSize: 14, color: '#6b7280', textAlign: 'center', marginBottom: 16, lineHeight: 20 },
  card: {
    backgroundColor: '#fff', borderRadius: 12, padding: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 4, elevation: 2, marginBottom: 16,
  },
  readOnlyField: {
    paddingVertical: 10, paddingHorizontal: 12, backgroundColor: '#f9fafb',
    borderRadius: 8, marginBottom: 16, borderWidth: 1, borderColor: '#e5e7eb',
  },
  readOnlyLabel: { fontSize: 11, color: '#9ca3af', fontWeight: '600', marginBottom: 2, textTransform: 'uppercase' },
  readOnlyValue: { fontSize: 14, color: '#374151' },
  input: {
    borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8,
    padding: 12, fontSize: 15, color: '#111827', backgroundColor: '#fff',
  },
  inputError: { borderColor: '#dc2626' },
  textarea: { minHeight: 96, paddingTop: 12 },
  dateText: { fontSize: 15, color: '#111827' },
  button: {
    backgroundColor: '#2d6a4f', borderRadius: 10, padding: 16,
    alignItems: 'center', justifyContent: 'center', minHeight: 52,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#fff', fontSize: 17, fontWeight: '700' },
  dateModal: { flex: 1, backgroundColor: '#f9fafb' },
  dateModalHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 16, borderBottomWidth: 1, borderBottomColor: '#e5e7eb', backgroundColor: '#fff',
  },
  dateModalTitle: { fontSize: 17, fontWeight: '600', color: '#111827' },
  dateModalDone: { fontSize: 17, color: '#2d6a4f', fontWeight: '600' },
});
