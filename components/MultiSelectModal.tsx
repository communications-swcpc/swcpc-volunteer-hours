import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  SafeAreaView,
} from 'react-native';

interface MultiSelectModalProps {
  label: string;
  options: string[];
  selected: string[];
  onChange: (selected: string[]) => void;
  placeholder?: string;
}

export function MultiSelectModal({
  label,
  options,
  selected,
  onChange,
  placeholder = 'Tap to select...',
}: MultiSelectModalProps) {
  const [visible, setVisible] = useState(false);

  const toggle = (option: string) => {
    if (selected.includes(option)) {
      onChange(selected.filter(s => s !== option));
    } else {
      onChange([...selected, option]);
    }
  };

  const displayText =
    selected.length > 0 ? selected.join(', ') : placeholder;

  return (
    <>
      <TouchableOpacity
        style={[styles.trigger, selected.length === 0 && styles.triggerEmpty]}
        onPress={() => setVisible(true)}
        activeOpacity={0.7}
      >
        <Text
          style={[styles.triggerText, selected.length === 0 && styles.placeholderText]}
          numberOfLines={2}
        >
          {displayText}
        </Text>
        <Text style={styles.chevron}>›</Text>
      </TouchableOpacity>

      <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={styles.modal}>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>{label}</Text>
            <TouchableOpacity onPress={() => setVisible(false)}>
              <Text style={styles.done}>Done</Text>
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.list}>
            {options.map(option => (
              <TouchableOpacity
                key={option}
                style={styles.item}
                onPress={() => toggle(option)}
                activeOpacity={0.7}
              >
                <View style={[styles.checkbox, selected.includes(option) && styles.checkboxChecked]}>
                  {selected.includes(option) && <Text style={styles.checkmark}>✓</Text>}
                </View>
                <Text style={styles.itemText}>{option}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  trigger: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 12,
    backgroundColor: '#fff',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  triggerEmpty: {
    borderColor: '#e5e7eb',
  },
  triggerText: {
    flex: 1,
    fontSize: 15,
    color: '#111827',
  },
  placeholderText: {
    color: '#9ca3af',
  },
  chevron: {
    fontSize: 20,
    color: '#9ca3af',
    marginLeft: 8,
    transform: [{ rotate: '90deg' }],
  },
  modal: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    backgroundColor: '#fff',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#111827',
  },
  done: {
    fontSize: 17,
    color: '#2d6a4f',
    fontWeight: '600',
  },
  list: {
    flex: 1,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#d1d5db',
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#2d6a4f',
    borderColor: '#2d6a4f',
  },
  checkmark: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
  itemText: {
    fontSize: 15,
    color: '#111827',
    flex: 1,
  },
});
