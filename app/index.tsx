import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Platform,
  Modal,
  SafeAreaView,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Stack } from 'expo-router';
import { FormField } from '@/components/FormField';
import { MultiSelectModal } from '@/components/MultiSelectModal';
import { VOLUNTEER_AREAS, VOLUNTEER_ACTIVITIES } from '@/constants/options';

const API_URL = 'https://contact-crm-next.vercel.app/api/log-hours';

function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

function formatDisplayDate(date: Date): string {
  return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

interface FormErrors {
  name?: string;
  email?: string;
  hours?: string;
}

export default function LogHoursScreen() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [hours, setHours] = useState('');
  const [date, setDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [areasWorked, setAreasWorked] = useState<string[]>([]);
  const [activities, setActivities] = useState<string[]>([]);
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});

  const validate = (): boolean => {
    const newErrors: FormErrors = {};
    if (!name.trim()) newErrors.name = 'Name is required';
    if (!email.trim()) newErrors.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) newErrors.email = 'Enter a valid email';
    if (!hours.trim()) newErrors.hours = 'Hours is required';
    else if (isNaN(Number(hours)) || Number(hours) <= 0) newErrors.hours = 'Enter a positive number';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const resetForm = () => {
    setName('');
    setEmail('');
    setHours('');
    setDate(new Date());
    setAreasWorked([]);
    setActivities([]);
    setDescription('');
    setErrors({});
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setSubmitting(true);
    try {
      const res = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
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
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.subtitle}>
          Record your hours with Southwest Corridor Park Conservancy
        </Text>

        <View style={styles.card}>
          <FormField label="Name" required error={errors.name}>
            <TextInput
              style={[styles.input, errors.name && styles.inputError]}
              value={name}
              onChangeText={setName}
              placeholder="Your name or group name"
              autoCapitalize="words"
              autoCorrect={false}
              returnKeyType="next"
            />
          </FormField>

          <FormField label="Email" required error={errors.email}>
            <TextInput
              style={[styles.input, errors.email && styles.inputError]}
              value={email}
              onChangeText={setEmail}
              placeholder="your@email.com"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="next"
            />
          </FormField>

          <FormField label="Hours" required error={errors.hours}>
            <TextInput
              style={[styles.input, errors.hours && styles.inputError]}
              value={hours}
              onChangeText={setHours}
              placeholder="e.g. 2.5"
              keyboardType="decimal-pad"
              returnKeyType="done"
            />
          </FormField>

          <FormField label="Date">
            <TouchableOpacity
              style={styles.input}
              onPress={() => setShowDatePicker(true)}
              activeOpacity={0.7}
            >
              <Text style={styles.dateText}>{formatDisplayDate(date)}</Text>
            </TouchableOpacity>
            {Platform.OS === 'ios' ? (
              <Modal visible={showDatePicker} animationType="slide" presentationStyle="pageSheet" transparent={false}>
                <SafeAreaView style={styles.dateModal}>
                  <View style={styles.dateModalHeader}>
                    <Text style={styles.dateModalTitle}>Select Date</Text>
                    <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                      <Text style={styles.dateModalDone}>Done</Text>
                    </TouchableOpacity>
                  </View>
                  <DateTimePicker
                    value={date}
                    mode="date"
                    display="spinner"
                    maximumDate={new Date()}
                    onChange={(_, selectedDate) => {
                      if (selectedDate) setDate(selectedDate);
                    }}
                  />
                </SafeAreaView>
              </Modal>
            ) : (
              showDatePicker && (
                <DateTimePicker
                  value={date}
                  mode="date"
                  display="default"
                  maximumDate={new Date()}
                  onChange={(_, selectedDate) => {
                    setShowDatePicker(false);
                    if (selectedDate) setDate(selectedDate);
                  }}
                />
              )
            )}
          </FormField>

          <FormField label="Areas Worked">
            <MultiSelectModal
              label="Areas Worked"
              options={VOLUNTEER_AREAS}
              selected={areasWorked}
              onChange={setAreasWorked}
              placeholder="Tap to select areas..."
            />
          </FormField>

          <FormField label="Other Activities">
            <MultiSelectModal
              label="Other Activities"
              options={VOLUNTEER_ACTIVITIES}
              selected={activities}
              onChange={setActivities}
              placeholder="Tap to select activities..."
            />
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
          {submitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Log Hours</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
  },
  container: {
    padding: 16,
    paddingBottom: 40,
  },
  subtitle: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 20,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    marginBottom: 16,
  },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
    color: '#111827',
    backgroundColor: '#fff',
  },
  inputError: {
    borderColor: '#dc2626',
  },
  textarea: {
    minHeight: 96,
    paddingTop: 12,
  },
  dateText: {
    fontSize: 15,
    color: '#111827',
  },
  button: {
    backgroundColor: '#2d6a4f',
    borderRadius: 10,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
  },
  dateModal: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  dateModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    backgroundColor: '#fff',
  },
  dateModalTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#111827',
  },
  dateModalDone: {
    fontSize: 17,
    color: '#2d6a4f',
    fontWeight: '600',
  },
});
