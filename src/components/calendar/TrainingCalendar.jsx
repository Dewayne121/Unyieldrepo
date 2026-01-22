import React, { useMemo } from 'react';
import { View, StyleSheet, ScrollView, Text } from 'react-native';
import CalendarDay from './CalendarDay';
import {
  getCalendarMonth,
  aggregateLogsByDay,
  isSameDay,
} from '../../utils/calendarHelpers';

/**
 * TrainingCalendar - Main calendar grid component
 */
const TrainingCalendar = ({
  month,
  year,
  logs,
  selectedDate,
  onDayPress,
}) => {
  // Memoize calendar grid computation
  const calendarDays = useMemo(() => {
    return getCalendarMonth(year, month);
  }, [year, month]);

  // Memoize day data aggregation
  const dayDataMap = useMemo(() => {
    return aggregateLogsByDay(logs, month, year);
  }, [logs, month, year]);

  const weekDays = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

  const handleDayPress = (date) => {
    if (onDayPress) {
      const dateKey = date.toISOString().split('T')[0];
      const dayData = dayDataMap.get(dateKey) || null;
      onDayPress(date, dayData);
    }
  };

  const isDaySelected = (date) => {
    if (!selectedDate) return false;
    return isSameDay(new Date(date), new Date(selectedDate));
  };

  return (
    <View style={styles.container}>
      {/* Week day headers */}
      <View style={styles.weekHeader}>
        {weekDays.map((day, index) => (
          <Text key={index} style={styles.weekDayText}>
            {day}
          </Text>
        ))}
      </View>

      {/* Calendar grid */}
      <View style={styles.gridContainer}>
        <View style={styles.calendarGrid}>
          {calendarDays.map((dayInfo, index) => {
            const dateKey = dayInfo.date.toISOString().split('T')[0];
            const dayData = dayDataMap.get(dateKey) || null;

            return (
              <CalendarDay
                key={index}
                date={dayInfo.date}
                dayData={dayData}
                isCurrentMonth={dayInfo.isCurrentMonth}
                isToday={dayInfo.isToday}
                isSelected={isDaySelected(dayInfo.date)}
                onPress={handleDayPress}
              />
            );
          })}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'transparent',
    paddingBottom: 8,
  },
  weekHeader: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingBottom: 8,
    marginBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  weekDayText: {
    flex: 1,
    textAlign: 'center',
    fontSize: 10,
    fontWeight: '700',
    color: '#444',
    textTransform: 'uppercase',
  },
  gridContainer: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    // We use a small gap or let the width % handle it. 
    // Since CalendarDay uses 13.8% and marginVertical 2, we can center it.
    justifyContent: 'flex-start',
    gap: 0, // Handled by margins in items or width
  },
});

export default TrainingCalendar;
