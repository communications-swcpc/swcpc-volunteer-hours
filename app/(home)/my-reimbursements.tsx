import React, { useCallback, useState } from 'react';
import {
  View, Text, TouchableOpacity, FlatList, StyleSheet, ActivityIndicator, RefreshControl,
} from 'react-native';
import { router, Stack, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSession } from '@/context/SessionContext';
import { API_BASE } from '@/constants/api';
import { createHistoryClient } from '@/services/reimbursement-history';
import { StatusPill } from '@/components/StatusPill';
import {
  formatAmount, statusDate, type OwnerReimbursement,
} from '@/shared/reimbursement-history';

const historyClient = createHistoryClient({ baseURL: API_BASE, transport: fetch });

export default function MyReimbursementsScreen() {
  const { session } = useSession();
  const [items, setItems] = useState<OwnerReimbursement[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!session) return;
    try {
      setItems(await historyClient.list(session.contactId));
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load your requests.');
    }
  }, [session]);

  // Reload whenever the screen regains focus, so an edit shows on return.
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  if (items === null && !error) {
    return (
      <>
        <Stack.Screen options={{ title: 'My Reimbursements' }} />
        <View style={styles.center}><ActivityIndicator size="large" color="#2d6a4f" /></View>
      </>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: 'My Reimbursements' }} />
      <FlatList
        style={styles.list}
        contentContainerStyle={styles.container}
        data={items ?? []}
        keyExtractor={item => item.request_id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListHeaderComponent={error ? <Text style={styles.error}>{error}</Text> : null}
        ListEmptyComponent={error ? null : (
          <View style={styles.empty}>
            <Ionicons name="receipt-outline" size={40} color="#9ca3af" />
            <Text style={styles.emptyText}>You haven't submitted any reimbursement requests yet.</Text>
          </View>
        )}
        renderItem={({ item }) => {
          const when = statusDate(item);
          return (
            <TouchableOpacity
              style={styles.row}
              activeOpacity={0.85}
              onPress={() => router.push({ pathname: '/(home)/reimbursement-detail', params: { id: item.request_id } })}
            >
              <View style={styles.rowMain}>
                <View style={styles.rowTop}>
                  <Text style={styles.amount}>{formatAmount(item.amount)}</Text>
                  <StatusPill status={item.status} />
                </View>
                <Text style={styles.description} numberOfLines={2}>{item.description}</Text>
                {when.date ? <Text style={styles.date}>{when.label} {when.date}</Text> : null}
              </View>
              <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
            </TouchableOpacity>
          );
        }}
      />
    </>
  );
}

const styles = StyleSheet.create({
  list: { flex: 1 },
  container: { padding: 16, paddingBottom: 40 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  row: {
    backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 12,
    flexDirection: 'row', alignItems: 'center', gap: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  rowMain: { flex: 1, gap: 4 },
  rowTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  amount: { fontSize: 18, fontWeight: '700', color: '#111827' },
  description: { fontSize: 14, color: '#374151' },
  date: { fontSize: 13, color: '#6b7280' },
  error: { color: '#dc2626', fontSize: 14, marginBottom: 12 },
  empty: { alignItems: 'center', gap: 12, marginTop: 48, paddingHorizontal: 24 },
  emptyText: { fontSize: 15, color: '#6b7280', textAlign: 'center' },
});
