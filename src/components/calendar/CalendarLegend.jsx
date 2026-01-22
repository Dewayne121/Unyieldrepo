import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';

/**
 * CalendarLegend - Shows what each day indicator means
 */
const CalendarLegend = () => {
  const legends = [
    { color: '#9b2c2c', label: 'TRAINING' },
    { color: '#ffd700', label: 'PB RECORD' },
    { color: '#444', label: 'REST' },
  ];

  return (
    <View style={styles.container}>
      <View style={styles.legendContainer}>
        {legends.map((legend, index) => (
          <View key={index} style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: legend.color }]} />
            <Text style={styles.legendLabel}>{legend.label}</Text>
          </View>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'transparent',
  },
  legendContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 8,
  },
  legendDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  legendLabel: {
    fontSize: 10,
    color: '#888',
    fontWeight: '600',
    letterSpacing: 0.5,
  },
});

export default CalendarLegend;
