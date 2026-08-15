import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  SectionList,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { router } from 'expo-router';
import { useSession } from '@/context/SessionContext';
import { API_BASE } from '@/constants/api';

interface Address {
  street: string;
  city: string;
  state: string;
  zip: string;
}

interface Reimbursement {
  request_id: string;
  contact_id: string;
  email: string;
  full_name: string;
  address: Address | null;
  amount: string;
  description: string;
  receipt_url: string;
  year: string;
  status: 'PENDING' | 'APPROVED' | 'COMPLETE';
  submitted_at: string;
  approved_by: string;
  approved_at: string;
  completed_by: string;
  completed_at: string;
}

interface Section {
  title: string;
  data: Reimbursement[];
}

export default function ReviewReimbursementsScreen() {
  const { session, canApprove, canComplete } = useSession();

  const [pending, setPending] = useState<Reimbursement[]>([]);
  const [approved, setApproved] = useState<Reimbursement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);

  // Route guard
  useEffect(() => {
    if (!canApprove && !canComplete) {
      router.replace('/(home)');
    }
  }, [canApprove, canComplete]);

  const fetchData = useCallback(async () => {
    if (!session?.email) return;
    setError(null);
    try {
      const headers = { 'x-mobile-email': session.email };
      const [pendingRes, approvedRes] = await Promise.all([
        fetch(`${API_BASE}/api/reimbursements?status=PENDING`, { headers }),
        fetch(`${API_BASE}/api/reimbursements?status=APPROVED`, { headers }),
      ]);

      if (!pendingRes.ok || !approvedRes.ok) {
        throw new Error('Failed to load reimbursements');
      }

      const [pendingData, approvedData] = await Promise.all([
        pendingRes.json() as Promise<Reimbursement[]>,
        approvedRes.json() as Promise<Reimbursement[]>,
      ]);

      setPending(pendingData);
      setApproved(approvedData);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load reimbursements');
    } finally {
      setLoading(false);
    }
  }, [session?.email]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleApprove = (item: Reimbursement) => {
    Alert.alert(
      'Approve Reimbursement',
      `Approve $${Number(item.amount).toFixed(2)} for ${item.full_name}?\n\n"${item.description}"`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Approve',
          style: 'destructive',
          onPress: () => performApprove(item.request_id),
        },
      ]
    );
  };

  const performApprove = async (id: string) => {
    if (!session?.email) return;
    setProcessingId(id);
    try {
      const res = await fetch(`${API_BASE}/api/reimbursements/${id}/approve`, {
        method: 'POST',
        headers: { 'x-mobile-email': session.email },
      });
      if (res.status === 409 || res.status === 404) {
        // Item already acted on elsewhere — silently refresh
        await fetchData();
        return;
      }
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        Alert.alert('Error', data.error || 'Failed to approve reimbursement');
        return;
      }
      await fetchData();
    } catch {
      Alert.alert('Error', 'Network error. Please try again.');
    } finally {
      setProcessingId(null);
    }
  };

  const handleComplete = (item: Reimbursement) => {
    Alert.alert(
      'Mark as Complete',
      `Mark $${Number(item.amount).toFixed(2)} for ${item.full_name} as paid?\n\n"${item.description}"`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Mark Complete',
          style: 'destructive',
          onPress: () => performComplete(item.request_id),
        },
      ]
    );
  };

  const performComplete = async (id: string) => {
    if (!session?.email) return;
    setProcessingId(id);
    try {
      const res = await fetch(`${API_BASE}/api/reimbursements/${id}/complete`, {
        method: 'POST',
        headers: { 'x-mobile-email': session.email },
      });
      if (res.status === 409 || res.status === 404) {
        await fetchData();
        return;
      }
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        Alert.alert('Error', data.error || 'Failed to mark reimbursement complete');
        return;
      }
      await fetchData();
    } catch {
      Alert.alert('Error', 'Network error. Please try again.');
    } finally {
      setProcessingId(null);
    }
  };

  const sections: Section[] = [
    { title: 'Pending Approval', data: canApprove ? pending : [] },
    { title: 'Awaiting Payment', data: canComplete ? approved : [] },
  ].filter((s) => s.data.length > 0);

  // Counts for items the user can't act on but should still know about
  // (e.g. the treasurer can't approve, but should see that requests are
  // waiting on the president).
  const notices: string[] = [];
  if (!canApprove && pending.length > 0) {
    notices.push(`${pending.length} waiting for approval`);
  }
  if (!canComplete && approved.length > 0) {
    notices.push(`${approved.length} approved and awaiting payment`);
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#2d6a4f" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={fetchData}>
          <Text style={styles.retryButtonText}>Try Again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <SectionList
      style={styles.list}
      contentContainerStyle={styles.listContent}
      sections={sections}
      keyExtractor={(item) => item.request_id}
      refreshControl={
        <RefreshControl
          refreshing={false}
          onRefresh={fetchData}
          tintColor="#2d6a4f"
        />
      }
      renderSectionHeader={({ section }) => {
        if (section.data.length === 0) return null;
        return (
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionHeaderText}>{section.title}</Text>
          </View>
        );
      }}
      renderItem={({ item }) => {
        const isProcessing = processingId === item.request_id;
        const isPending = item.status === 'PENDING';
        return (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={styles.cardNameBlock}>
                <Text style={styles.cardName}>{item.full_name}</Text>
                <Text style={styles.cardEmail}>{item.email}</Text>
              </View>
              <Text style={styles.cardAmount}>${Number(item.amount).toFixed(2)}</Text>
            </View>
            <Text style={styles.cardDescription}>{item.description}</Text>
            <Text style={styles.cardDate}>
              Submitted {new Date(item.submitted_at).toLocaleDateString()}
            </Text>
            {!isPending && (
              <View style={styles.addressBlock}>
                <Text style={styles.addressLabel}>Pay to</Text>
                <Text style={styles.addressName}>{item.full_name}</Text>
                {item.address ? (
                  <>
                    <Text style={styles.addressText}>{item.address.street}</Text>
                    <Text style={styles.addressText}>
                      {[item.address.city, item.address.state, item.address.zip].filter(Boolean).join(', ')}
                    </Text>
                  </>
                ) : (
                  <Text style={styles.addressText}>—</Text>
                )}
              </View>
            )}
            <TouchableOpacity
              style={[styles.actionButton, isProcessing && styles.actionButtonDisabled]}
              onPress={() => isPending ? handleApprove(item) : handleComplete(item)}
              disabled={isProcessing}
              activeOpacity={0.8}
            >
              {isProcessing ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.actionButtonText}>
                  {isPending ? 'Approve' : 'Mark Complete'}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        );
      }}
      ListEmptyComponent={
        <View style={styles.center}>
          <Text style={styles.emptyText}>No reimbursements to review</Text>
          {notices.length > 0 && (
            <Text style={styles.emptyNoticeText}>{notices.join(' · ')}</Text>
          )}
        </View>
      }
    />
  );
}

const styles = StyleSheet.create({
  list: { flex: 1 },
  listContent: { padding: 16, paddingBottom: 40 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  errorText: { fontSize: 15, color: '#dc2626', textAlign: 'center', marginBottom: 16 },
  retryButton: {
    backgroundColor: '#2d6a4f',
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: { color: '#fff', fontWeight: '600', fontSize: 15 },
  sectionHeader: {
    paddingVertical: 8,
    paddingHorizontal: 4,
    marginBottom: 8,
    marginTop: 8,
  },
  sectionHeaderText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  cardNameBlock: { flex: 1, marginRight: 8 },
  cardName: { fontSize: 15, fontWeight: '700', color: '#111827' },
  cardEmail: { fontSize: 13, color: '#6b7280' },
  cardAmount: { fontSize: 16, fontWeight: '700', color: '#2d6a4f' },
  cardDescription: { fontSize: 13, color: '#374151', marginBottom: 4 },
  cardDate: { fontSize: 12, color: '#9ca3af', marginBottom: 12 },
  addressBlock: {
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    padding: 10,
    marginBottom: 12,
  },
  addressLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  addressName: { fontSize: 13, fontWeight: '700', color: '#111827', marginBottom: 2 },
  addressText: { fontSize: 13, color: '#374151' },
  actionButton: {
    backgroundColor: '#2d6a4f',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
    minHeight: 40,
    justifyContent: 'center',
  },
  actionButtonDisabled: { opacity: 0.6 },
  actionButtonText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  emptyText: { fontSize: 15, color: '#9ca3af', textAlign: 'center' },
  emptyNoticeText: { fontSize: 13, color: '#6b7280', textAlign: 'center', marginTop: 8 },
});
