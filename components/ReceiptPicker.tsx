import React from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet, Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { Ionicons } from '@expo/vector-icons';
import { MAX_RECEIPTS, isPdfUrl } from '@/shared/reimbursement-history';

/** A receipt already uploaded (has `url`) or picked on this phone (has `base64`). */
export interface ReceiptItem {
  key: string;
  uri: string;
  mime: string;
  base64?: string;
  url?: string;
}

let counter = 0;
const nextKey = () => `receipt-${Date.now()}-${counter++}`;

export function remoteReceipt(url: string): ReceiptItem {
  return { key: nextKey(), uri: url, url, mime: isPdfUrl(url) ? 'application/pdf' : 'image/jpeg' };
}

/** Take Photo and Choose File add to the list; each receipt has its own Remove. */
export function ReceiptPicker({ receipts, onChange }: { receipts: ReceiptItem[]; onChange: (next: ReceiptItem[]) => void }) {
  const full = receipts.length >= MAX_RECEIPTS;
  const add = (item: ReceiptItem) => onChange([...receipts, item].slice(0, MAX_RECEIPTS));

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
      if (!asset.base64) {
        Alert.alert('Error', 'That photo could not be read. Please try again.');
        return;
      }
      add({ key: nextKey(), uri: asset.uri, base64: asset.base64, mime: asset.mimeType || 'image/jpeg' });
    }
  };

  const pickFile = async () => {
    const result = await DocumentPicker.getDocumentAsync({ type: ['image/*', 'application/pdf'], copyToCacheDirectory: true });
    if (result.canceled) return;
    const file = result.assets[0];
    const mime = file.mimeType || 'image/jpeg';
    if (!file.uri || !(mime.startsWith('image/') || mime === 'application/pdf')) return;
    try {
      const base64 = await FileSystem.readAsStringAsync(file.uri, { encoding: 'base64' });
      add({ key: nextKey(), uri: file.uri, base64, mime });
    } catch {
      Alert.alert('Error', 'That file could not be read. Please choose another.');
    }
  };

  return (
    <View>
      <View style={styles.row}>
        <TouchableOpacity style={[styles.btn, full && styles.btnDisabled]} onPress={takePhoto} disabled={full}>
          <Ionicons name="camera-outline" size={24} color="#2d6a4f" />
          <Text style={styles.btnText}>Take Photo</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.btn, full && styles.btnDisabled]} onPress={pickFile} disabled={full}>
          <Ionicons name="document-outline" size={24} color="#2d6a4f" />
          <Text style={styles.btnText}>Choose File</Text>
        </TouchableOpacity>
      </View>
      {full && <Text style={styles.hint}>You can attach up to {MAX_RECEIPTS} receipts.</Text>}
      {receipts.length > 0 && (
        <View style={styles.grid}>
          {receipts.map(r => (
            <View key={r.key} style={styles.tile}>
              {r.mime.startsWith('image/') ? (
                <Image source={{ uri: r.uri }} style={styles.thumb} resizeMode="cover" />
              ) : (
                <View style={[styles.thumb, styles.doc]}><Ionicons name="document" size={40} color="#6b7280" /></View>
              )}
              <TouchableOpacity onPress={() => onChange(receipts.filter(x => x.key !== r.key))}>
                <Text style={styles.remove}>Remove</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 12 },
  btn: { flex: 1, borderWidth: 1, borderColor: '#2d6a4f', borderRadius: 8, padding: 16, alignItems: 'center', gap: 8 },
  btnDisabled: { opacity: 0.4 },
  btnText: { fontSize: 14, color: '#2d6a4f', fontWeight: '600' },
  hint: { marginTop: 8, fontSize: 13, color: '#6b7280' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 12, padding: 12, backgroundColor: '#f9fafb', borderRadius: 8 },
  tile: { alignItems: 'center', gap: 6 },
  thumb: { width: 88, height: 88, borderRadius: 8 },
  doc: { backgroundColor: '#e5e7eb', alignItems: 'center', justifyContent: 'center' },
  remove: { fontSize: 13, color: '#dc2626', fontWeight: '600' },
});
