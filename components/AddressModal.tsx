import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  ActivityIndicator,
} from 'react-native';
import { FormField } from '@/components/FormField';

export interface AddressInput {
  street: string;
  city: string;
  state: string;
  zip: string;
}

interface AddressModalProps {
  visible: boolean;
  saving: boolean;
  onCancel: () => void;
  onSave: (address: AddressInput) => void;
}

export function AddressModal({ visible, saving, onCancel, onSave }: AddressModalProps) {
  const [street, setStreet] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [zip, setZip] = useState('');
  const [errors, setErrors] = useState<Partial<Record<keyof AddressInput, string>>>({});

  useEffect(() => {
    if (visible) {
      setStreet('');
      setCity('');
      setState('');
      setZip('');
      setErrors({});
    }
  }, [visible]);

  const validate = (): AddressInput | null => {
    const newErrors: typeof errors = {};
    if (!street.trim()) newErrors.street = 'Street address is required';
    if (!city.trim()) newErrors.city = 'City is required';
    if (!state.trim()) newErrors.state = 'State is required';
    if (!zip.trim() || zip.trim().length < 5) newErrors.zip = 'Valid ZIP code is required';
    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return null;
    return { street: street.trim(), city: city.trim(), state: state.trim(), zip: zip.trim() };
  };

  const handleSave = () => {
    const address = validate();
    if (address) onSave(address);
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={styles.modal}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onCancel} disabled={saving}>
            <Text style={styles.cancel}>Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Mailing Address</Text>
          <TouchableOpacity onPress={handleSave} disabled={saving}>
            {saving ? <ActivityIndicator size="small" color="#2d6a4f" /> : <Text style={styles.save}>Save</Text>}
          </TouchableOpacity>
        </View>
        <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent} keyboardShouldPersistTaps="handled">
          <Text style={styles.intro}>
            We need a mailing address on file before this reimbursement can be processed.
          </Text>

          <FormField label="Street Address" required error={errors.street}>
            <TextInput
              style={[styles.input, errors.street && styles.inputError]}
              value={street} onChangeText={setStreet}
              placeholder="123 Main St" autoComplete="street-address" textContentType="streetAddressLine1"
            />
          </FormField>

          <FormField label="City" required error={errors.city}>
            <TextInput
              style={[styles.input, errors.city && styles.inputError]}
              value={city} onChangeText={setCity}
              placeholder="Boston" autoComplete="address-line2" textContentType="addressCity"
            />
          </FormField>

          <FormField label="State" required error={errors.state}>
            <TextInput
              style={[styles.input, errors.state && styles.inputError]}
              value={state} onChangeText={setState}
              placeholder="MA" autoCapitalize="characters" textContentType="addressState"
            />
          </FormField>

          <FormField label="ZIP Code" required error={errors.zip}>
            <TextInput
              style={[styles.input, errors.zip && styles.inputError]}
              value={zip} onChangeText={setZip}
              placeholder="02120" keyboardType="number-pad" textContentType="postalCode"
            />
          </FormField>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modal: { flex: 1, backgroundColor: '#f9fafb' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    backgroundColor: '#fff',
  },
  headerTitle: { fontSize: 17, fontWeight: '600', color: '#111827' },
  cancel: { fontSize: 17, color: '#6b7280' },
  save: { fontSize: 17, color: '#2d6a4f', fontWeight: '600' },
  body: { flex: 1 },
  bodyContent: { padding: 16, paddingBottom: 40 },
  intro: { fontSize: 14, color: '#6b7280', marginBottom: 16, lineHeight: 20 },
  input: { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8, padding: 12, fontSize: 15, color: '#111827', backgroundColor: '#fff' },
  inputError: { borderColor: '#dc2626' },
});
