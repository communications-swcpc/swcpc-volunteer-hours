import React from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
} from 'react-native';
import { router, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSession } from '@/context/SessionContext';

export default function HomeScreen() {
  const { session, canApprove, canComplete } = useSession();
  const isPrivileged = canApprove || canComplete;

  return (
    <>
      <Stack.Screen options={{}} />
      <ScrollView style={styles.scroll} contentContainerStyle={styles.container}>
        <Text style={styles.welcome}>
          Welcome back{session?.firstName ? `, ${session.firstName}` : ''}
        </Text>

        {/* Action cards */}
        <TouchableOpacity
          style={styles.actionCard}
          onPress={() => router.push('/(home)/log-hours')}
          activeOpacity={0.85}
        >
          <View style={styles.actionCardContent}>
            <Ionicons name="time-outline" size={32} color="#2d6a4f" />
            <View style={styles.actionCardText}>
              <Text style={styles.actionCardTitle}>Log Volunteer Hours</Text>
              <Text style={styles.actionCardSubtitle}>Record time you've contributed</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionCard}
          onPress={() => router.push('/(home)/reimbursement')}
          activeOpacity={0.85}
        >
          <View style={styles.actionCardContent}>
            <Ionicons name="receipt-outline" size={32} color="#2d6a4f" />
            <View style={styles.actionCardText}>
              <Text style={styles.actionCardTitle}>Submit Reimbursement</Text>
              <Text style={styles.actionCardSubtitle}>Request payment for expenses</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
          </View>
        </TouchableOpacity>

        {isPrivileged && (
          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => router.push('/(home)/review-reimbursements')}
            activeOpacity={0.85}
          >
            <View style={styles.actionCardContent}>
              <Ionicons name="checkmark-circle-outline" size={32} color="#2d6a4f" />
              <View style={styles.actionCardText}>
                <Text style={styles.actionCardTitle}>Review Reimbursements</Text>
                <Text style={styles.actionCardSubtitle}>Approve and process requests</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
            </View>
          </TouchableOpacity>
        )}
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  container: { padding: 20, paddingBottom: 40 },
  welcome: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 16,
    marginTop: 8,
  },
  actionCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 3,
    minHeight: 120,
    justifyContent: 'center',
  },
  actionCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  actionCardText: { flex: 1 },
  actionCardTitle: { fontSize: 18, fontWeight: '700', color: '#111827', marginBottom: 4 },
  actionCardSubtitle: { fontSize: 13, color: '#6b7280' },
});
