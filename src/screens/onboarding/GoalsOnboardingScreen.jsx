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
import { useOnboarding, PRIMARY_GOALS } from '../../context/OnboardingContext';
import * as Haptics from 'expo-haptics';

export default function GoalsOnboardingScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { theme, skin } = useTheme();
  const isDark = skin === SKINS.operator || skin === SKINS.midnight;
  const { updateData, onboardingData, goToNextStep, goToPreviousStep } = useOnboarding();

  const [selectedGoal, setSelectedGoal] = useState(onboardingData.primaryGoal || null);
  const [selectedSubGoals, setSelectedSubGoals] = useState(onboardingData.subGoals || []);

  const handleGoalSelect = (goal) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSelectedGoal(goal.id);
    setSelectedSubGoals([]);
  };

  const handleSubGoalToggle = (subGoal) => {
    Haptics.selectionAsync();
    if (selectedSubGoals.includes(subGoal)) {
      setSelectedSubGoals(selectedSubGoals.filter((sg) => sg !== subGoal));
    } else {
      setSelectedSubGoals([...selectedSubGoals, subGoal]);
    }
  };

  const handleNext = async () => {
    await updateData({
      primaryGoal: selectedGoal,
      subGoals: selectedSubGoals.length > 0 ? selectedSubGoals : [PRIMARY_GOALS.find((g) => g.id === selectedGoal)?.subGoals[0]],
    });
    goToNextStep();
  };

  const selectedGoalData = PRIMARY_GOALS.find((g) => g.id === selectedGoal);

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
          <Text style={[styles.title, { color: theme.textMain }]}>What's Your Goal?</Text>
          <Text style={[styles.subtitle, { color: theme.textMuted }]}>
            Choose what motivates you most
          </Text>
        </View>
      </View>

      {/* Content */}
      <ScrollView
        style={styles.content}
        contentContainerStyle={[styles.contentContainer, { paddingBottom: insets.bottom + 140 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Primary Goals */}
        <Text style={[styles.sectionTitle, { color: theme.textMain }]}>Select Your Main Goal</Text>

        <View style={styles.goalsGrid}>
          {PRIMARY_GOALS.map((goal) => {
            const isSelected = selectedGoal === goal.id;
            return (
              <TouchableOpacity
                key={goal.id}
                onPress={() => handleGoalSelect(goal)}
                activeOpacity={0.85}
                style={[
                  styles.goalCard,
                  { backgroundColor: theme.bgCard, borderColor: theme.border },
                  isSelected && { borderColor: goal.color, borderWidth: 2 },
                ]}
              >
                <View style={[styles.goalIconContainer, { backgroundColor: `${goal.color}15` }]}>
                  <Ionicons name={goal.icon} size={32} color={goal.color} />
                </View>
                <Text style={[styles.goalTitle, { color: theme.textMain }]}>{goal.title}</Text>
                <Text style={[styles.goalDescription, { color: theme.textMuted }]}>{goal.description}</Text>

                {isSelected && (
                  <View style={[styles.selectedBadge, { backgroundColor: goal.color }]}>
                    <Ionicons name="checkmark-circle" size={16} color="#fff" />
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Sub Goals */}
        {selectedGoalData && (
          <View style={styles.subGoalsSection}>
            <Text style={[styles.sectionTitle, { color: theme.textMain }]}>
              Specific Focus Area (Optional)
            </Text>
            <Text style={[styles.sectionHint, { color: theme.textMuted }]}>
              Select all that apply
            </Text>

            <View style={styles.subGoalsContainer}>
              {selectedGoalData.subGoals.map((subGoal) => {
                const isSelected = selectedSubGoals.includes(subGoal);
                return (
                  <TouchableOpacity
                    key={subGoal}
                    onPress={() => handleSubGoalToggle(subGoal)}
                    activeOpacity={0.8}
                    style={[
                      styles.subGoalPill,
                      { backgroundColor: theme.bgCard, borderColor: theme.border },
                      isSelected && { backgroundColor: `${selectedGoalData.color}20`, borderColor: selectedGoalData.color },
                    ]}
                  >
                    <Text
                      style={[
                        styles.subGoalText,
                        { color: isSelected ? selectedGoalData.color : theme.textMain },
                      ]}
                    >
                      {subGoal}
                    </Text>
                    {isSelected && (
                      <Ionicons name="checkmark" size={14} color={selectedGoalData.color} />
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}

        {/* Info Card */}
        <View style={[styles.infoCard, { backgroundColor: `${theme.primary}08`, borderColor: theme.primary }]}>
          <Ionicons name="information-circle-outline" size={20} color={theme.primary} />
          <View style={styles.infoContent}>
            <Text style={[styles.infoTitle, { color: theme.textMain }]}>You can change this later</Text>
            <Text style={[styles.infoText, { color: theme.textMuted }]}>
              Your goals can be updated anytime from your profile settings.
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Footer */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + 16, borderTopColor: theme.border }]}>
        <TouchableOpacity
          onPress={handleNext}
          disabled={!selectedGoal}
          activeOpacity={0.85}
          style={[
            styles.continueButton,
            { backgroundColor: theme.primary },
            !selectedGoal && styles.continueButtonDisabled,
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
  goalsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
  },
  goalCard: {
    width: (340 - 24) / 2,
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    position: 'relative',
  },
  goalIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  goalTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  goalDescription: {
    fontSize: 12,
    lineHeight: 16,
  },
  selectedBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  subGoalsSection: {
    marginBottom: 24,
  },
  subGoalsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  subGoalPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
    borderWidth: 1,
  },
  subGoalText: {
    fontSize: 14,
    fontWeight: '600',
  },
  infoCard: {
    flexDirection: 'row',
    gap: 12,
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
  },
  infoContent: {
    flex: 1,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  infoText: {
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
