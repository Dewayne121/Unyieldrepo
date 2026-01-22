import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

/**
 * CalendarHeader - Month/year navigation for the calendar
 */
const CalendarHeader = ({
  month,
  year,
  onPrevMonth,
  onNextMonth,
  onToday,
  onPressDate,
}) => {
  const monthNames = [
    'JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE',
    'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER'
  ];

  return (
    <View style={styles.container}>
      <TouchableOpacity 
        style={styles.monthDisplay} 
        onPress={onPressDate}
        activeOpacity={0.7}
      >
        <Text style={styles.monthText}>
          {monthNames[month]} <Text style={styles.yearText}>{year}</Text>
        </Text>
        <Ionicons name="chevron-down" size={14} color="#666" style={{ marginTop: 2 }} />
      </TouchableOpacity>

      <View style={styles.navigation}>
        <TouchableOpacity
          style={styles.navButton}
          onPress={onPrevMonth}
          accessibilityLabel="Previous month"
        >
          <Ionicons name="chevron-back" size={20} color="#fff" />
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.todayButton}
          onPress={onToday}
          accessibilityLabel="Go to today"
        >
          <Text style={styles.todayText}>TODAY</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.navButton}
          onPress={onNextMonth}
          accessibilityLabel="Next month"
        >
          <Ionicons name="chevron-forward" size={20} color="#fff" />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 16,
    backgroundColor: 'transparent',
  },
  monthDisplay: {
    flex: 1,
    paddingLeft: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  monthText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: 0.5,
  },
  yearText: {
    color: '#666',
    fontWeight: '600',
  },
  navigation: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  navButton: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 18,
  },
  todayButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  todayText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#9b2c2c',
    letterSpacing: 0.5,
  },
});

export default CalendarHeader;
