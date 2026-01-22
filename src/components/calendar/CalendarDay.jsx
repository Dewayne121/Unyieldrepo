import React, { memo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

/**
 * CalendarDay - Individual day cell in the calendar grid
 */
const CalendarDay = memo(({
  date,
  dayData,
  isCurrentMonth,
  isToday,
  isSelected,
  onPress,
}) => {
  
  // Status indicators
  const hasTraining = dayData?.hasWorkouts;
  const hasPB = dayData?.hasPB;
  const isRest = dayData?.isRestDay;

  const handlePress = () => {
    onPress(date, dayData);
  };

  const getContainerStyle = () => {
    if (isSelected) return [styles.container, styles.containerSelected];
    if (isToday) return [styles.container, styles.containerToday];
    return styles.container;
  };

  const getTextStyle = () => {
    if (!isCurrentMonth) return styles.textOtherMonth;
    if (isSelected) return styles.textSelected;
    if (isToday) return styles.textToday;
    return styles.textDefault;
  };

  const accessibilityLabel = isToday
    ? `Today, ${date.toLocaleDateString()}`
    : date.toLocaleDateString();

  return (
    <TouchableOpacity
      style={getContainerStyle()}
      onPress={handlePress}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      accessibilityState={{ selected: isSelected }}
      disabled={!isCurrentMonth} // Optional: disable clicks on other months
    >
      <Text style={[styles.dayText, getTextStyle()]}>
        {date.getDate()}
      </Text>
      
      {/* Status Dots */}
      <View style={styles.dotContainer}>
        {hasPB && <View style={[styles.dot, styles.dotPB]} />}
        {!hasPB && hasTraining && <View style={[styles.dot, styles.dotTraining]} />}
        {!hasPB && !hasTraining && isRest && <View style={[styles.dot, styles.dotRest]} />}
      </View>
    </TouchableOpacity>
  );
});

const styles = StyleSheet.create({
  container: {
    width: '13.5%',
    marginHorizontal: '0.35%',
    aspectRatio: 1,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 2,
  },
  containerSelected: {
    backgroundColor: '#9b2c2c',
    borderRadius: 12,
  },
  containerToday: {
    borderWidth: 1,
    borderColor: '#9b2c2c',
    backgroundColor: 'rgba(155, 44, 44, 0.1)',
  },
  dayText: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  textDefault: {
    color: '#e0e0e0',
  },
  textOtherMonth: {
    color: '#333',
  },
  textSelected: {
    color: '#fff',
    fontWeight: '800',
  },
  textToday: {
    color: '#9b2c2c',
    fontWeight: '800',
  },
  dotContainer: {
    flexDirection: 'row',
    height: 6,
    gap: 2,
    position: 'absolute',
    bottom: 8,
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  dotTraining: {
    backgroundColor: '#9b2c2c',
  },
  dotPB: {
    backgroundColor: '#ffd700',
  },
  dotRest: {
    backgroundColor: '#444',
  },
});

export default CalendarDay;
