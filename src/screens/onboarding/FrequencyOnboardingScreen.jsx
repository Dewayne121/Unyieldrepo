import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../context/ThemeContext';
import { SKINS } from '../../constants/colors';
import { useOnboarding, WORKOUT_FREQUENCIES } from '../../context/OnboardingContext';
import * as Haptics from 'expo-haptics';

const WEEKDAYS = [
  { id: 'mon', short: 'Mon', full: 'Monday' },
  { id: 'tue', short: 'Tue', full: 'Tuesday' },
  { id: 'wed', short: 'Wed', full: 'Wednesday' },
  { id: 'thu', short: 'Thu', full: 'Thursday' },
  { id: 'fri', short: 'Fri', full: 'Friday' },
  { id: 'sat', short: 'Sat', full: 'Saturday' },
  { id: 'sun', short: 'Sun', full: 'Sunday' },
];

export default function FrequencyOnboardingScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { theme, skin } = useTheme();
  const isDark = skin === SKINS.operator || skin === SKINS.midnight;
  const { updateData, onboardingData, goToNextStep, goToPreviousStep } = useOnboarding();

  const [selectedFrequency, setSelectedFrequency] = useState(onboardingData.workoutFrequency || null);
  const [selectedDays, setSelectedDays] = useState(onboardingData.preferredDays || []);

  const handleFrequencySelect = (freqId) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSelectedFrequency(freqId);
    // Auto-select days based on frequency
    const daysCount = parseInt(freqId);
    if (daysCount === 7) {
      setSelectedDays(WEEKDAYS.map((d) => d.id));
    } else if (daysCount >= 5) {
      setSelectedDays(['mon', 'tue', 'wed', 'thu', 'fri']);
    } else if (daysCount >= 3) {
      setSelectedDays(['mon', 'wed', 'fri']);
    } else {
      setSelectedDays(['mon', 'thu']);
    }
  };

  const handleDayToggle = (dayId) => {
    Haptics.selectionAsync();
    if (selectedDays.includes(dayId)) {
      setSelectedDays(selectedDays.filter((d) => d !== dayId));
    } else {
      setSelectedDays([...selectedDays, dayId]);
    }
  };

  const handleNext = async () => {
    await updateData({
      workoutFrequency: selectedFrequency,
      preferredDays: selectedDays,
    });
    goToNextStep();
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.bgDeep }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 16, borderBottomColor: theme.border }]}>
        <TouchableOpacity
          onPress={goToPreviousStep}
          style={styles.backButton}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={24} color={theme.textMain} />
        </TouchableOpacity>

        <View style={styles.headerContent}>
          <Text style={[styles.title, { color: theme.textMain }]}>Your Training Schedule</Text>
          <Text style={[styles.subtitle, { color: theme.textMuted }]}>
            How often do you plan to work out?
          </Text>
        </View>
      </View>

      {/* Content */}
      <ScrollView
        style={styles.content}
        contentContainerStyle={[styles.contentContainer, { paddingBottom: insets.bottom + 140 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Frequency Options */}
        <Text style={[styles.sectionTitle, { color: theme.textMain }]}>Workout Frequency</Text>

        <View style={styles.frequenciesContainer}>
          {WORKOUT_FREQUENCIES.map((freq) => {
            const isSelected = selectedFrequency === freq.id;
            return (
              <TouchableOpacity
                key={freq.id}
                onPress={() => handleFrequencySelect(freq.id)}
                activeOpacity={0.85}
                style={[
                  styles.frequencyCard,
                  { backgroundColor: theme.bgCard, borderColor: theme.border },
                  isSelected && { borderColor: theme.primary, borderWidth: 2, backgroundColor: `${theme.primary}08` },
                ]}
              >
                <View style={styles.frequencyLeft}>
                  <View style={[styles.frequencyIconContainer, { backgroundColor: isSelected ? `${theme.primary}20` : theme.bgDeep }]}>
                    <Text style={[styles.frequencyTitle, { color: isSelected ? theme.primary : theme.textMain }]}>
                      {freq.title}
                    </Text>
                  </View>
                  <View>
                    <Text style={[styles.frequencySubtitle, { color: theme.textMuted }]}>
                      {freq.subtitle}
                    </Text>
                    <Text style={[styles.frequencyDescription, { color: theme.textMuted }]}>
                      {freq.description}
                    </Text>
                  </View>
                </View>
                {isSelected && (
                  <View style={[styles.checkCircle, { backgroundColor: theme.primary }]}>
                    <Ionicons name="checkmark" size={16} color={isDark ? theme.bgDeep : '#fff'} />
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Preferred Days */}
        <View style={styles.daysSection}>
          <Text style={[styles.sectionTitle, { color: theme.textMain }]}>Preferred Days</Text>
          <Text style={[styles.sectionHint, { color: theme.textMuted }]}>
            Select the days you usually train
          </Text>

          <View style={styles.daysGrid}>
            {WEEKDAYS.map((day) => {
              const isSelected = selectedDays.includes(day.id);
              return (
                <TouchableOpacity
                  key={day.id}
                  onPress={() => handleDayToggle(day.id)}
                  activeOpacity={0.8}
                  style={[
                    styles.dayCard,
                    { backgroundColor: theme.bgCard, borderColor: theme.border },
                    isSelected && { backgroundColor: theme.primary, borderColor: theme.primary },
                  ]}
                >
                  <Text
                    style={[
                      styles.dayShort,
                      { color: isSelected ? (isDark ? theme.bgDeep : '#fff') : theme.textMain },
                    ]}
                  >
                    {day.short}
                  </Text>
                  {isSelected && (
                    <Ionicons name="checkmark" size={12} color={isDark ? theme.bgDeep : '#fff'} />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>

          <Text style={[styles.selectedDaysText, { color: theme.textMuted }]}>
            {selectedDays.length > 0
              ? `${selectedDays.length} day${selectedDays.length > 1 ? 's' : ''} selected`
              : 'No days selected'}
          </Text>
        </View>

        {/* Reminder Card */}
        <View style={[styles.reminderCard, { backgroundColor: `${theme.primary}08`, borderColor: theme.primary }]}>
          <Ionicons name="notifications-outline" size={20} color={theme.primary} />
          <View style={styles.reminderContent}>
            <Text style={[styles.reminderTitle, { color: theme.textMain }]}>Stay Consistent</Text>
            <Text style={[styles.reminderText, { color: theme.textMuted }]}>
              We'll help you stay on track with reminders and streak tracking.
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Footer */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + 16, borderTopColor: theme.border }]}>
        <TouchableOpacity
          onPress={handleNext}
          disabled={!selectedFrequency || selectedDays.length === 0}
          activeOpacity={0.85}
          style={[
            styles.continueButton,
            { backgroundColor: theme.primary },
            (!selectedFrequency || selectedDays.length === 0) && styles.continueButtonDisabled,
          ]}
        >
          <Text style={[styles.continueButtonText, { color: isDark ? theme.bgDeep : '#fff' }]}>
            Continue
          </Text>
          <Ionicons
            name="chevron-forward"
            size={20}
            color={isDark ? theme.bgDeep : '#fff'}
          />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  headerContent: {
    flex: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 16,
    paddingTop: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
  },
  sectionHint: {
    fontSize: 13,
    marginBottom: 16,
  },
  frequenciesContainer: {
    gap: 12,
    marginBottom: 32,
  },
  frequencyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
  },
  frequencyLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    flex: 1,
  },
  frequencyIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  frequencyTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  frequencySubtitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  frequencyDescription: {
    fontSize: 12,
  },
  checkCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  daysSection: {
    marginBottom: 24,
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 12,
  },
  dayCard: {
    width: (320 - 32 - 50) / 7,
    aspectRatio: 1,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  dayShort: {
    fontSize: 11,
    fontWeight: '700',
  },
  selectedDaysText: {
    fontSize: 13,
    fontWeight: '500',
    textAlign: 'center',
  },
  reminderCard: {
    flexDirection: 'row',
    gap: 12,
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
  },
  reminderContent: {
    flex: 1,
  },
  reminderTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  reminderText: {
    fontSize: 13,
    lineHeight: 18,
  },
  footer: {
    paddingHorizontal: 16,
    paddingTop: 16,
    borderTopWidth: 1,
  },
  continueButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 14,
  },
  continueButtonDisabled: {
    opacity: 0.5,
  },
  continueButtonText: {
    fontSize: 16,
    fontWeight: '700',
  },
});
