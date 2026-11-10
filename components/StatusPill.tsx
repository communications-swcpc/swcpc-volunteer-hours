import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { STATUS_LABELS, type ReimbursementStatus } from '@/shared/reimbursement-history';

const COLORS: Record<ReimbursementStatus, { bg: string; fg: string }> = {
  PENDING: { bg: '#fef3c7', fg: '#92400e' },
  APPROVED: { bg: '#dbeafe', fg: '#1e40af' },
  COMPLETE: { bg: '#d1fae5', fg: '#065f46' },
};

export function StatusPill({ status }: { status: ReimbursementStatus }) {
  const c = COLORS[status];
  return (
    <View style={[styles.pill, { backgroundColor: c.bg }]}>
      <Text style={[styles.text, { color: c.fg }]}>{STATUS_LABELS[status]}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  text: { fontSize: 12, fontWeight: '700' },
});
