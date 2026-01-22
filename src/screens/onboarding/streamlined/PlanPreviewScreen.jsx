import React, { useCallback, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Animated } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../../context/ThemeContext';
import { useAuth } from '../../../context/AuthContext';
import { useStreamlinedOnboarding } from '../../../context/StreamlinedOnboardingContext';
import { Spacing, BorderRadius, Typography } from '../../../constants/colors';
import * as Haptics from 'expo-haptics';
import api from '../../../services/api';

const PlanPreviewScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const { setOnboardingComplete } = useAuth();
  const {
    generateRecommendedPlan,
    completeOnboarding,
    goToStep,
    onboardingData,
    STEPS,
  } = useStreamlinedOnboarding();

  const plan = generateRecommendedPlan();

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim1 = useRef(new Animated.Value(30)).current;
  const slideAnim2 = useRef(new Animated.Value(30)).current;
  const slideAnim3 = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    // Success haptic when screen loads
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    // Staggered animations
    Animated.sequence([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.parallel([
        Animated.timing(slideAnim1, {
          toValue: 0,
          duration: 400,
          useNativeDriver: true,
        }),
      ]),
      Animated.parallel([
        Animated.timing(slideAnim2, {
          toValue: 0,
          duration: 400,
          useNativeDriver: true,
        }),
      ]),
      Animated.parallel([
        Animated.timing(slideAnim3, {
          toValue: 0,
          duration: 400,
          useNativeDriver: true,
        }),
      ]),
    ]).start();
  }, []);

  const handleStartWorkout = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

    try {
      // Save onboarding data to backend
      const profileData = {
        onboardingCompleted: true,
        fitnessGoal: onboardingData[STEPS.GOAL]?.selectedGoal,
        experienceLevel: onboardingData[STEPS.EXPERIENCE]?.selectedExperience,
        age: onboardingData[STEPS.BODY_PROFILE]?.age ? parseInt(onboardingData[STEPS.BODY_PROFILE].age, 10) : null,
        heightCm: onboardingData[STEPS.BODY_PROFILE]?.heightCm ? parseInt(onboardingData[STEPS.BODY_PROFILE].heightCm, 10) : null,
        heightFt: onboardingData[STEPS.BODY_PROFILE]?.heightFt ? parseInt(onboardingData[STEPS.BODY_PROFILE].heightFt, 10) : null,
        heightIn: onboardingData[STEPS.BODY_PROFILE]?.heightIn ? parseInt(onboardingData[STEPS.BODY_PROFILE].heightIn, 10) : null,
        useMetric: onboardingData[STEPS.BODY_PROFILE]?.useMetric,
        trainingDaysPerWeek: onboardingData[STEPS.TRAINING_AVAILABILITY]?.selectedDays ? parseInt(onboardingData[STEPS.TRAINING_AVAILABILITY].selectedDays, 10) : null,
        recommendedPlan: plan,
      };

      // Try to save to backend (don't block if it fails)
      try {
        await api.updateProfile(profileData);
      } catch (apiError) {
        console.log('Could not save to backend, continuing locally:', apiError.message);
      }
    } catch (error) {
      console.error('Error saving onboarding data:', error);
    }

    // Mark onboarding as complete in both contexts
    completeOnboarding();
    // This will trigger the navigator to show the Main screen
    await setOnboardingComplete();
  }, [completeOnboarding, setOnboardingComplete, onboardingData, STEPS, plan]);

  const handleEditAnswers = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    // Go back to goal selection
    goToStep(1); // Index 1 = GOAL step
  }, [goToStep]);

  if (!plan) {
    return null;
  }

  const planFeatures = [
    {
      icon: 'calendar-outline',
      title: `${plan.daysPerWeek} days per week`,
      description: plan.splitType,
    },
    {
      icon: 'fitness-outline',
      title: plan.focus,
      description: 'Primary focus',
    },
    {
      icon: 'time-outline',
      title: `${plan.sessionLength} min`,
      description: 'Per session',
    },
    {
      icon: 'trending-up-outline',
      title: plan.level,
      description: 'Starting difficulty',
    },
  ];

  return (
    <View style={[styles.container, { backgroundColor: theme.bgDeep }]}>
      {/* Background gradient */}
      <LinearGradient
        colors={['rgba(155, 44, 44, 0.1)', 'transparent', 'rgba(155, 44, 44, 0.05)']}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: insets.top + Spacing.xxl, paddingBottom: insets.bottom + Spacing.xxxl },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <Animated.View style={[styles.header, { opacity: fadeAnim }]}>
          <View style={[styles.iconContainer, { backgroundColor: theme.primary + '20' }]}>
            <Ionicons name="trophy" size={48} color={theme.primary} />
          </View>
          <Text style={[styles.title, { color: theme.textMain }]}>Your starter plan</Text>
          <Text style={[styles.subtitle, { color: theme.textMuted }]}>
            Customized based on your goals and experience
          </Text>
        </Animated.View>

        {/* Plan Card */}
        <Animated.View style={[styles.planCardContainer, { opacity: fadeAnim, transform: [{ translateY: slideAnim1 }] }]}>
          <View style={[styles.planCard, { backgroundColor: theme.bgCard, borderColor: theme.border }]}>
            {/* Plan Header */}
            <View style={[styles.planHeader, { borderBottomColor: theme.border }]}>
              <Text style={[styles.planTitle, { color: theme.textMain }]}>Personalized Plan</Text>
              <View style={[styles.planBadge, { backgroundColor: theme.primary + '20' }]}>
                <Ionicons name="sparkles" size={14} color={theme.primary} />
                <Text style={[styles.planBadgeText, { color: theme.primary }]}>Recommended</Text>
              </View>
            </View>

            {/* Goal Highlight */}
            <View style={[styles.goalHighlight, { backgroundColor: theme.primary + '15' }]}>
              <Ionicons name="flag" size={20} color={theme.primary} />
              <Text style={[styles.goalText, { color: theme.primary }]}>
                Goal: {plan.goalTitle}
              </Text>
            </View>

            {/* Plan Features */}
            <View style={styles.featuresGrid}>
              {planFeatures.map((feature, index) => (
                <View
                  key={index}
                  style={[styles.featureItem, { borderBottomColor: theme.border }]}
                >
                  <View style={[styles.featureIcon, { backgroundColor: theme.bgDeep }]}>
                    <Ionicons name={feature.icon} size={20} color={theme.primary} />
                  </View>
                  <View style={styles.featureContent}>
                    <Text style={[styles.featureTitle, { color: theme.textMain }]}>
                      {feature.title}
                    </Text>
                    <Text style={[styles.featureDescription, { color: theme.textMuted }]}>
                      {feature.description}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        </Animated.View>

        {/* What's Next Section */}
        <Animated.View style={[styles.section, { opacity: fadeAnim, transform: [{ translateY: slideAnim2 }] }]}>
          <Text style={[styles.sectionTitle, { color: theme.textMain }]}>What's next</Text>
          <View style={styles.stepList}>
            <View style={styles.stepItem}>
              <View style={[styles.stepNumber, { backgroundColor: theme.primary }]}>
                <Text style={styles.stepNumberText}>1</Text>
              </View>
              <View style={styles.stepContent}>
                <Text style={[styles.stepTitle, { color: theme.textMain }]}>Start your first workout</Text>
                <Text style={[styles.stepDescription, { color: theme.textMuted }]}>
                  Jump right in with a guided session tailored to your level
                </Text>
              </View>
            </View>
            <View style={styles.stepItem}>
              <View style={[styles.stepNumber, { backgroundColor: theme.bgCard, borderColor: theme.border }]}>
                <Text style={[styles.stepNumberText, { color: theme.textMuted }]}>2</Text>
              </View>
              <View style={styles.stepContent}>
                <Text style={[styles.stepTitle, { color: theme.textMain }]}>Track your progress</Text>
                <Text style={[styles.stepDescription, { color: theme.textMuted }]}>
                  Log workouts and watch your stats improve over time
                </Text>
              </View>
            </View>
            <View style={styles.stepItem}>
              <View style={[styles.stepNumber, { backgroundColor: theme.bgCard, borderColor: theme.border }]}>
                <Text style={[styles.stepNumberText, { color: theme.textMuted }]}>3</Text>
              </View>
              <View style={styles.stepContent}>
                <Text style={[styles.stepTitle, { color: theme.textMain }]}>Compete & climb ranks</Text>
                <Text style={[styles.stepDescription, { color: theme.textMuted }]}>
                  Challenge others on the leaderboards
                </Text>
              </View>
            </View>
          </View>
        </Animated.View>

        {/* Edit Options */}
        <Animated.View style={[styles.editSection, { opacity: fadeAnim, transform: [{ translateY: slideAnim3 }] }]}>
          <TouchableOpacity
            style={[styles.editButton, { borderColor: theme.border }]}
            onPress={handleEditAnswers}
            activeOpacity={0.7}
          >
            <Ionicons name="pencil-outline" size={18} color={theme.textMuted} />
            <Text style={[styles.editButtonText, { color: theme.textMuted }]}>
              Edit your answers
            </Text>
          </TouchableOpacity>
        </Animated.View>
      </ScrollView>

      {/* Fixed CTA Footer */}
      <View
        style={[
          styles.footer,
          {
            paddingBottom: insets.bottom + Spacing.md,
            backgroundColor: theme.bgDeep,
            borderTopColor: theme.border,
          },
        ]}
      >
        <TouchableOpacity
          style={[styles.startButton, { backgroundColor: theme.primary }]}
          onPress={handleStartWorkout}
          activeOpacity={0.85}
        >
          <LinearGradient
            colors={[theme.primary, theme.primary + 'cc']}
            style={StyleSheet.absoluteFill}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          />
          <Text style={[styles.startButtonText, { color: '#fff' }]}>Start First Workout</Text>
          <Ionicons name="arrow-forward" size={22} color="#fff" />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
  },
  header: {
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  title: {
    ...Typography.h2,
    fontSize: 28,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: Spacing.xs,
  },
  subtitle: {
    ...Typography.body,
    fontSize: 15,
    textAlign: 'center',
    paddingHorizontal: Spacing.xl,
  },
  planCardContainer: {
    marginBottom: Spacing.xl,
  },
  planCard: {
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    overflow: 'hidden',
  },
  planHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.lg,
    borderBottomWidth: 1,
  },
  planTitle: {
    ...Typography.h4,
    fontSize: 18,
    fontWeight: '700',
  },
  planBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.md,
    gap: Spacing.xs,
  },
  planBadgeText: {
    ...Typography.bodySmall,
    fontWeight: '700',
    fontSize: 12,
  },
  goalHighlight: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    margin: Spacing.lg,
    borderRadius: BorderRadius.lg,
    gap: Spacing.sm,
  },
  goalText: {
    ...Typography.body,
    fontWeight: '700',
    fontSize: 16,
  },
  featuresGrid: {
    padding: Spacing.md,
    paddingTop: 0,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.sm,
    borderBottomWidth: 1,
  },
  featureIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  featureContent: {
    flex: 1,
  },
  featureTitle: {
    ...Typography.body,
    fontWeight: '600',
    fontSize: 15,
    marginBottom: 2,
  },
  featureDescription: {
    ...Typography.bodySmall,
    fontSize: 13,
  },
  section: {
    marginBottom: Spacing.xl,
  },
  sectionTitle: {
    ...Typography.h4,
    fontSize: 18,
    fontWeight: '700',
    marginBottom: Spacing.md,
  },
  stepList: {
    gap: Spacing.md,
  },
  stepItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  stepNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
    borderWidth: 1,
  },
  stepNumberText: {
    ...Typography.body,
    fontWeight: '700',
    fontSize: 14,
    color: '#fff',
  },
  stepContent: {
    flex: 1,
  },
  stepTitle: {
    ...Typography.body,
    fontWeight: '600',
    fontSize: 15,
    marginBottom: 2,
  },
  stepDescription: {
    ...Typography.bodySmall,
    fontSize: 14,
    lineHeight: 20,
  },
  editSection: {
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    gap: Spacing.sm,
  },
  editButtonText: {
    ...Typography.body,
    fontWeight: '600',
    fontSize: 15,
  },
  footer: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
  },
  startButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.lg,
    borderRadius: BorderRadius.xl,
    gap: Spacing.sm,
    overflow: 'hidden',
  },
  startButtonText: {
    ...Typography.body,
    fontWeight: '700',
    fontSize: 17,
  },
});

export default PlanPreviewScreen;
