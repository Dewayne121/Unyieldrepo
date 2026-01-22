import React, { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useStreamlinedOnboarding } from '../../../context/StreamlinedOnboardingContext';
import { useTheme } from '../../../context/ThemeContext';

// Screen imports
import OnboardingEntryScreen from './OnboardingEntryScreen';
import ProfileSetupScreen from './ProfileSetupScreen';
import GoalSelectionScreen from './GoalSelectionScreen';
import ExperienceLevelScreen from './ExperienceLevelScreen';
import BodyProfileScreen from './BodyProfileScreen';
import TrainingAvailabilityScreen from './TrainingAvailabilityScreen';
import PlanPreviewScreen from './PlanPreviewScreen';

const StreamlinedOnboardingNavigator = ({ navigation }) => {
  const { theme } = useTheme();
  const {
    isLoading,
    currentStep,
    STEPS,
  } = useStreamlinedOnboarding();

  // Show loading indicator while initializing
  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.bgDeep }]}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  // Render the appropriate screen based on current step
  const renderScreen = () => {
    switch (currentStep) {
      case STEPS.ENTRY:
        return <OnboardingEntryScreen />;
      case STEPS.PROFILE:
        return <ProfileSetupScreen />;
      case STEPS.GOAL:
        return <GoalSelectionScreen />;
      case STEPS.EXPERIENCE:
        return <ExperienceLevelScreen />;
      case STEPS.BODY_PROFILE:
        return <BodyProfileScreen />;
      case STEPS.TRAINING_AVAILABILITY:
        return <TrainingAvailabilityScreen />;
      case STEPS.PLAN_PREVIEW:
        return <PlanPreviewScreen navigation={navigation} />;
      default:
        return <OnboardingEntryScreen />;
    }
  };

  return <View style={styles.container}>{renderScreen()}</View>;
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

export default StreamlinedOnboardingNavigator;
