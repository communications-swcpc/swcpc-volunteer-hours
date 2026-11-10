import React, { useCallback, useState } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, StyleSheet, ActivityIndicator, Image, Linking,
} from 'react-native';
import { router, Stack, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSession } from '@/context/SessionContext';
import { API_BASE } from '@/constants/api';
import { createHistoryClient } from '@/services/reimbursement-history';
import { StatusPill } from '@/components/StatusPill';
import {
  canEdit, formatAmount, isPdfUrl, progressSteps, type OwnerReimbursement,
} from '@/shared/reimbursement-history';

const historyClient = createHistoryClient({ baseURL: API_BASE, transport: fetch });

export default function ReimbursementDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session } = useSession();
  const [item, setItem] = useState<OwnerReimbursement | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Re-read on every focus so the status shown is the sheet's, not a cached copy.
  useFocusEffect(useCallback(() => {
    if (!session || !id) return;
    let live = true;
    historyClient.list(session.contactId)
      .then(list => {
        if (!live) return;
        const found = list.find(r => r.request_id === id) ?? null;
        setItem(found);
        setError(found ? null : 'Request not found.');
      })
      .catch(e => { if (live) setError(e instanceof Error ? e.message : 'Could not load this request.'); });
    return () => { live = false; };
  }, [session, id]));

  if (!item) {
    return (
      <>
        <Stack.Screen options={{ title: 'Request' }} />
        <View style={styles.center}>
          {error ? <Text style={styles.error}>{error}</Text> : <ActivityIndicator size="large" color="#2d6a4f" />}
        </View>
      </>
    );
  }

  const steps = progressSteps(item);

  return (
    <>
      <Stack.Screen options={{ title: 'Request' }} />
      <ScrollView style={styles.scroll} contentContainerStyle={styles.container}>
        <View style={styles.card}>
          <View style={styles.headRow}>
            <Text style={styles.amount}>{formatAmount(item.amount)}</Text>
            <StatusPill status={item.status} />
          </View>
          <Text style={styles.description}>{item.description}</Text>
        </View>

        <View style={styles.card}>
          {steps.map((step, i) => (
            <View key={step.key} style={styles.step}>
              <View style={styles.rail}>
                <View style={[styles.dot, step.done && styles.dotDone]}>
                  {step.done && <Ionicons name="checkmark" size={14} color="#fff" />}
                </View>
                {i < steps.length - 1 && <View style={[styles.line, steps[i + 1].done && styles.lineDone]} />}
              </View>
              <View style={styles.stepBody}>
                <Text style={[styles.stepTitle, !step.done && styles.stepTitleMuted]}>{step.title}</Text>
                {step.details.map(line => <Text key={line} style={styles.stepDetail}>{line}</Text>)}
              </View>
            </View>
          ))}
        </View>

        {item.receipt_urls.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Receipts</Text>
            <View style={styles.grid}>
              {item.receipt_urls.map(url => (
                <TouchableOpacity key={url} onPress={() => Linking.openURL(url)} activeOpacity={0.8}>
                  {isPdfUrl(url) ? (
                    <View style={[styles.thumb, styles.doc]}><Ionicons name="document" size={40} color="#6b7280" /></View>
                  ) : (
                    <Image source={{ uri: url }} style={styles.thumb} resizeMode="cover" />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {canEdit(item) && (
          <TouchableOpacity
            style={styles.button}
            activeOpacity={0.8}
            onPress={() => router.push({ pathname: '/(home)/edit-reimbursement', params: { id: item.request_id } })}
          >
            <Text style={styles.buttonText}>Edit</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  container: { padding: 16, paddingBottom: 40 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  error: { color: '#dc2626', fontSize: 15, textAlign: 'center' },
  card: {
    backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  headRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  amount: { fontSize: 24, fontWeight: '700', color: '#111827' },
  description: { fontSize: 15, color: '#374151' },
  step: { flexDirection: 'row', gap: 12 },
  rail: { alignItems: 'center', width: 24 },
  dot: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: '#d1d5db', backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  dotDone: { backgroundColor: '#2d6a4f', borderColor: '#2d6a4f' },
  line: { width: 2, flex: 1, minHeight: 24, backgroundColor: '#d1d5db' },
  lineDone: { backgroundColor: '#2d6a4f' },
  stepBody: { flex: 1, paddingBottom: 16 },
  stepTitle: { fontSize: 16, fontWeight: '700', color: '#111827' },
  stepTitleMuted: { color: '#6b7280' },
  stepDetail: { fontSize: 14, color: '#4b5563', marginTop: 2 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 12 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  thumb: { width: 88, height: 88, borderRadius: 8 },
  doc: { backgroundColor: '#e5e7eb', alignItems: 'center', justifyContent: 'center' },
  button: { backgroundColor: '#2d6a4f', borderRadius: 10, padding: 16, alignItems: 'center', justifyContent: 'center', minHeight: 52 },
  buttonText: { color: '#fff', fontSize: 17, fontWeight: '700' },
});
