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
import { useOnboarding, FITNESS_LEVELS } from '../../context/OnboardingContext';
import * as Haptics from 'expo-haptics';

export default function ExperienceOnboardingScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { theme, skin } = useTheme();
  const isDark = skin === SKINS.operator || skin === SKINS.midnight;
  const { updateData, onboardingData, goToNextStep, goToPreviousStep } = useOnboarding();

  const [selectedLevel, setSelectedLevel] = useState(onboardingData.fitnessLevel || null);

  const handleLevelSelect = (levelId) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSelectedLevel(levelId);
  };

  const handleNext = async () => {
    await updateData({ fitnessLevel: selectedLevel });
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
          <Text style={[styles.title, { color: theme.textMain }]}>Your Experience Level</Text>
          <Text style={[styles.subtitle, { color: theme.textMuted }]}>
            This helps us tailor your experience
          </Text>
        </View>
      </View>

      {/* Content */}
      <ScrollView
        style={styles.content}
        contentContainerStyle={[styles.contentContainer, { paddingBottom: insets.bottom + 140 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Illustration */}
        <View style={styles.illustrationContainer}>
          <View style={[styles.illustrationCircle, { backgroundColor: `${theme.primary}15` }]}>
            <Ionicons name="fitness-outline" size={60} color={theme.primary} />
          </View>
        </View>

        {/* Fitness Levels */}
        <Text style={[styles.sectionTitle, { color: theme.textMain }]}>
          How would you describe your fitness level?
        </Text>

        <View style={styles.levelsContainer}>
          {FITNESS_LEVELS.map((level, index) => {
            const isSelected = selectedLevel === level.id;
            return (
              <TouchableOpacity
                key={level.id}
                onPress={() => handleLevelSelect(level.id)}
                activeOpacity={0.85}
                style={[
                  styles.levelCard,
                  { backgroundColor: theme.bgCard, borderColor: theme.border },
                  isSelected && { borderColor: level.color, borderWidth: 2 },
                ]}
              >
                {/* Selection Indicator */}
                {isSelected && (
                  <View style={[styles.selectedIndicator, { backgroundColor: level.color }]}>
                    <Ionicons name="checkmark" size={18} color="#fff" />
                  </View>
                )}

                {/* Icon */}
                <View style={[styles.levelIconContainer, { backgroundColor: `${level.color}15` }]}>
                  <Ionicons name={level.icon} size={28} color={level.color} />
                </View>

                {/* Content */}
                <Text style={[styles.levelTitle, { color: theme.textMain }]}>{level.title}</Text>
                <Text style={[styles.levelDescription, { color: theme.textMuted }]}>
                  {level.description}
                </Text>

                {/* Experience Bar */}
                <View style={styles.experienceBar}>
                  <View
                    style={[
                      styles.experienceFill,
                      { backgroundColor: level.color, width: `${(index + 1) * 25}%` },
                    ]}
                  />
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Info Card */}
        <View style={[styles.infoCard, { backgroundColor: `${theme.primary}08`, borderColor: theme.primary }]}>
          <Ionicons name="compass-outline" size={20} color={theme.primary} />
          <View style={styles.infoContent}>
            <Text style={[styles.infoTitle, { color: theme.textMain }]}>Why do we ask?</Text>
            <Text style={[styles.infoText, { color: theme.textMuted }]}>
              Understanding your experience helps us set appropriate challenges and match you with competitors at your level.
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Footer */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + 16, borderTopColor: theme.border }]}>
        {/* Skip Button */}
        <TouchableOpacity
          onPress={() => {
            updateData({ fitnessLevel: 'intermediate' });
            goToNextStep();
          }}
          style={styles.skipButton}
          activeOpacity={0.7}
        >
          <Text style={[styles.skipText, { color: theme.textMuted }]}>Skip for now</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handleNext}
          disabled={!selectedLevel}
          activeOpacity={0.85}
          style={[
            styles.continueButton,
            { backgroundColor: theme.primary },
            !selectedLevel && styles.continueButtonDisabled,
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
    paddingTop: 16,
  },
  illustrationContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  illustrationCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 16,
    textAlign: 'center',
  },
  levelsContainer: {
    gap: 12,
    marginBottom: 24,
  },
  levelCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    position: 'relative',
  },
  selectedIndicator: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  levelIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  levelTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 6,
  },
  levelDescription: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 12,
  },
  experienceBar: {
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(0,0,0,0.1)',
    overflow: 'hidden',
  },
  experienceFill: {
    height: '100%',
    borderRadius: 2,
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
    gap: 8,
  },
  skipButton: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  skipText: {
    fontSize: 14,
    fontWeight: '500',
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
