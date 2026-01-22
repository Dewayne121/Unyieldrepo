import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const MONTHS = [
  'JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE',
  'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER'
];

/**
 * DateSelectorModal - Allows quick jumping to a specific month/year
 * Improves flexibility/efficiency (UX Rule 7)
 */
const DateSelectorModal = ({ visible, currentMonth, currentYear, onClose, onSelect }) => {
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const [selectedYear, setSelectedYear] = useState(currentYear);

  // Generate years (2020 to Current Year + 1)
  const currentY = new Date().getFullYear();
  const years = [];
  for (let y = 2020; y <= currentY + 1; y++) {
    years.push(y);
  }

  useEffect(() => {
    if (visible) {
      setSelectedMonth(currentMonth);
      setSelectedYear(currentYear);
    }
  }, [visible, currentMonth, currentYear]);

  const handleSave = () => {
    onSelect(selectedMonth, selectedYear);
    onClose();
  };

  return (
    <Modal 
      visible={visible} 
      transparent 
      animationType="fade" 
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.content}>
          <View style={styles.header}>
            <Text style={styles.title}>JUMP TO DATE</Text>
            <TouchableOpacity onPress={onClose} hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}>
              <Ionicons name="close" size={20} color="#666" />
            </TouchableOpacity>
          </View>

          <View style={styles.pickerContainer}>
            {/* Months Column */}
            <View style={styles.column}>
              <Text style={styles.colLabel}>MONTH</Text>
              <ScrollView 
                showsVerticalScrollIndicator={false} 
                style={styles.scroll}
                contentContainerStyle={{ paddingBottom: 20 }}
              >
                {MONTHS.map((m, index) => (
                  <TouchableOpacity
                    key={m}
                    style={[styles.item, selectedMonth === index && styles.itemSelected]}
                    onPress={() => setSelectedMonth(index)}
                  >
                    <Text style={[styles.itemText, selectedMonth === index && styles.itemTextSelected]}>
                      {m}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* Separator */}
            <View style={styles.separator} />

            {/* Years Column */}
            <View style={styles.column}>
              <Text style={styles.colLabel}>YEAR</Text>
              <ScrollView 
                showsVerticalScrollIndicator={false} 
                style={styles.scroll}
                contentContainerStyle={{ paddingBottom: 20 }}
              >
                {years.map((y) => (
                  <TouchableOpacity
                    key={y}
                    style={[styles.item, selectedYear === y && styles.itemSelected]}
                    onPress={() => setSelectedYear(y)}
                  >
                    <Text style={[styles.itemText, selectedYear === y && styles.itemTextSelected]}>
                      {y}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </View>

          <View style={styles.footer}>
            <TouchableOpacity style={styles.btnCancel} onPress={onClose}>
              <Text style={styles.btnCancelText}>CANCEL</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.btnConfirm} onPress={handleSave}>
              <Text style={styles.btnConfirmText}>GO TO DATE</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    padding: 24,
  },
  content: {
    backgroundColor: '#161616',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    overflow: 'hidden',
    maxHeight: 500,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  title: {
    fontSize: 14,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: 1,
  },
  pickerContainer: {
    flexDirection: 'row',
    height: 300,
  },
  column: {
    flex: 1,
    paddingTop: 16,
  },
  separator: {
    width: 1,
    backgroundColor: 'rgba(255,255,255,0.05)',
    marginVertical: 16,
  },
  colLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#444',
    textAlign: 'center',
    marginBottom: 12,
    letterSpacing: 1,
  },
  scroll: {
    flex: 1,
    paddingHorizontal: 8,
  },
  item: {
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 8,
    marginBottom: 2,
  },
  itemSelected: {
    backgroundColor: 'rgba(155, 44, 44, 0.15)',
  },
  itemText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  itemTextSelected: {
    color: '#9b2c2c',
    fontWeight: '800',
  },
  footer: {
    flexDirection: 'row',
    padding: 20,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.05)',
  },
  btnCancel: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  btnConfirm: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    borderRadius: 12,
    backgroundColor: '#9b2c2c',
  },
  btnCancelText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#888',
    letterSpacing: 0.5,
  },
  btnConfirmText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 0.5,
  },
});

export default DateSelectorModal;