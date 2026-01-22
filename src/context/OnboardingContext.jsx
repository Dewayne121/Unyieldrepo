import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const ONBOARDING_DATA_KEY = 'unyield_onboarding_data';
const ONBOARDING_STEP_KEY = 'unyield_onboarding_step';

const OnboardingContext = createContext(null);

export const useOnboarding = () => {
  const ctx = useContext(OnboardingContext);
  if (!ctx) throw new Error('useOnboarding must be used within OnboardingProvider');
  return ctx;
};

// Onboarding steps configuration
export const ONBOARDING_STEPS = [
  { id: 'welcome', title: 'Welcome', screen: 'WelcomeOnboarding' },
  { id: 'signup', title: 'Sign Up', screen: 'SignUpOnboarding' },
  { id: 'profile', title: 'Profile', screen: 'ProfileOnboarding' },
  { id: 'goals', title: 'Your Goals', screen: 'GoalsOnboarding' },
  { id: 'experience', title: 'Experience', screen: 'ExperienceOnboarding' },
  { id: 'frequency', title: 'Schedule', screen: 'FrequencyOnboarding' },
  { id: 'metrics', title: 'Metrics', screen: 'MetricsOnboarding' },
  { id: 'notifications', title: 'Notifications', screen: 'NotificationsOnboarding' },
  { id: 'tutorial', title: 'Tutorial', screen: 'TutorialOnboarding' },
  { id: 'celebration', title: 'Welcome Aboard', screen: 'CelebrationOnboarding' },
];

// Fitness levels
export const FITNESS_LEVELS = [
  {
    id: 'beginner',
    title: 'Just Starting',
    description: 'New to fitness or returning after a long break',
    icon: 'leaf-outline',
    color: '#10B981',
  },
  {
    id: 'intermediate',
    title: 'Some Experience',
    description: 'Work out occasionally, know the basics',
    icon: 'barbell-outline',
    color: '#3B82F6',
  },
  {
    id: 'advanced',
    title: 'Experienced',
    description: 'Train regularly, comfortable with complex movements',
    icon: 'fitness-outline',
    color: '#8B5CF6',
  },
  {
    id: 'elite',
    title: 'Elite Athlete',
    description: 'Competitive or training at high intensity for years',
    icon: 'trophy-outline',
    color: '#F59E0B',
  },
];

// Workout frequencies
export const WORKOUT_FREQUENCIES = [
  { id: '1-2', title: '1-2 days', subtitle: 'Light', description: 'Getting started' },
  { id: '3-4', title: '3-4 days', subtitle: 'Moderate', description: 'Building habits' },
  { id: '5-6', title: '5-6 days', subtitle: 'Dedicated', description: 'Serious training' },
  { id: '7', title: 'Every day', subtitle: 'Elite', description: 'No days off' },
];

// Primary goals with sub-goals
export const PRIMARY_GOALS = [
  {
    id: 'build_muscle',
    title: 'Build Muscle',
    description: 'Increase strength and size',
    icon: 'barbell-outline',
    color: '#EF4444',
    subGoals: ['Hypertrophy', 'Strength', 'Power'],
  },
  {
    id: 'lose_fat',
    title: 'Get Lean',
    description: 'Shed fat and reveal definition',
    icon: 'fire-outline',
    color: '#F59E0B',
    subGoals: ['Weight Loss', 'Body Recomposition', 'Cutting'],
  },
  {
    id: 'performance',
    title: 'Performance',
    description: 'Boost athletic ability and endurance',
    icon: 'flash-outline',
    color: '#3B82F6',
    subGoals: ['Endurance', 'Speed', 'Agility'],
  },
  {
    id: 'health',
    title: 'Health & Wellness',
    description: 'Improve overall fitness and energy',
    icon: 'heart-outline',
    color: '#10B981',
    subGoals: ['General Health', 'Mobility', 'Stress Relief'],
  },
];

export function OnboardingProvider({ children }) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [onboardingData, setOnboardingData] = useState({
    // Auth data
    email: '',
    username: '',
    password: '',

    // Profile data
    displayName: '',
    profileImage: null,

    // Goals data
    primaryGoal: null,
    subGoals: [],

    // Experience data
    fitnessLevel: null,

    // Schedule data
    workoutFrequency: null,
    preferredDays: [],

    // Metrics data (optional)
    startingMetrics: {
      weight: null,
      weightUnit: 'kg',
      height: null,
      heightUnit: 'cm',
      age: null,
    },

    // Preferences
    notificationsEnabled: true,
    skipMetrics: false,

    // Tracking
    startedAt: null,
    completedAt: null,
  });

  const [isLoading, setIsLoading] = useState(false);
  const navigationRef = useRef(null);
  const onboardingStartTime = useRef(null);

  // Initialize onboarding
  const initializeOnboarding = useCallback(async () => {
    try {
      const [savedData, savedStep] = await Promise.all([
        AsyncStorage.getItem(ONBOARDING_DATA_KEY),
        AsyncStorage.getItem(ONBOARDING_STEP_KEY),
      ]);

      if (savedData) {
        const parsed = JSON.parse(savedData);
        setOnboardingData(parsed);
      }

      if (savedStep) {
        setCurrentStepIndex(parseInt(savedStep, 10));
      } else {
        setCurrentStepIndex(0);
      }
    } catch (error) {
      console.error('Error loading onboarding data:', error);
    }
  }, []);

  // Save onboarding data
  const saveOnboardingData = useCallback(async (data) => {
    try {
      await AsyncStorage.setItem(ONBOARDING_DATA_KEY, JSON.stringify(data));
    } catch (error) {
      console.error('Error saving onboarding data:', error);
    }
  }, []);

  // Update onboarding data
  const updateData = useCallback((updates) => {
    setOnboardingData((prev) => {
      const newData = { ...prev, ...updates };
      saveOnboardingData(newData);
      return newData;
    });
  }, [saveOnboardingData]);

  // Navigate to next step
  const goToNextStep = useCallback(() => {
    setCurrentStepIndex((prev) => {
      const nextStep = Math.min(prev + 1, ONBOARDING_STEPS.length - 1);
      AsyncStorage.setItem(ONBOARDING_STEP_KEY, nextStep.toString());
      return nextStep;
    });
  }, []);

  // Navigate to previous step
  const goToPreviousStep = useCallback(() => {
    setCurrentStepIndex((prev) => {
      const prevStep = Math.max(prev - 1, 0);
      AsyncStorage.setItem(ONBOARDING_STEP_KEY, prevStep.toString());
      return prevStep;
    });
  }, []);

  // Go to specific step
  const goToStep = useCallback((stepIndex) => {
    const validIndex = Math.max(0, Math.min(stepIndex, ONBOARDING_STEPS.length - 1));
    setCurrentStepIndex(validIndex);
    AsyncStorage.setItem(ONBOARDING_STEP_KEY, validIndex.toString());
  }, []);

  // Skip current step (for optional steps)
  const skipStep = useCallback(() => {
    goToNextStep();
  }, [goToNextStep]);

  // Mark onboarding as started
  const startOnboarding = useCallback(() => {
    const startTime = new Date().toISOString();
    onboardingStartTime.current = startTime;
    updateData({ startedAt: startTime });
  }, [updateData]);

  // Complete onboarding
  const completeOnboarding = useCallback(async () => {
    const completedData = {
      ...onboardingData,
      completedAt: new Date().toISOString(),
    };

    try {
      await AsyncStorage.setItem(ONBOARDING_DATA_KEY, JSON.stringify(completedData));
      setOnboardingData(completedData);

      // Mark as seen in auth context
      await AsyncStorage.setItem('unyield_seen_onboarding', 'true');

      return { success: true, data: completedData };
    } catch (error) {
      console.error('Error completing onboarding:', error);
      return { success: false, error: error.message };
    }
  }, [onboardingData]);

  // Reset onboarding (for testing or re-onboarding)
  const resetOnboarding = useCallback(async () => {
    try {
      await AsyncStorage.multiRemove([
        ONBOARDING_DATA_KEY,
        ONBOARDING_STEP_KEY,
        'unyield_seen_onboarding',
      ]);

      setOnboardingData({
        email: '',
        username: '',
        password: '',
        displayName: '',
        profileImage: null,
        primaryGoal: null,
        subGoals: [],
        fitnessLevel: null,
        workoutFrequency: null,
        preferredDays: [],
        startingMetrics: {
          weight: null,
          weightUnit: 'kg',
          height: null,
          heightUnit: 'cm',
          age: null,
        },
        notificationsEnabled: true,
        skipMetrics: false,
        startedAt: null,
        completedAt: null,
      });

      setCurrentStepIndex(0);
      onboardingStartTime.current = null;

      return { success: true };
    } catch (error) {
      console.error('Error resetting onboarding:', error);
      return { success: false, error: error.message };
    }
  }, []);

  // Get current step info
  const currentStep = ONBOARDING_STEPS[currentStepIndex] || ONBOARDING_STEPS[0];
  const progress = ((currentStepIndex + 1) / ONBOARDING_STEPS.length) * 100;

  const value = {
    // State
    currentStepIndex,
    currentStep,
    onboardingData,
    isLoading,
    progress,

    // Actions
    updateData,
    goToNextStep,
    goToPreviousStep,
    goToStep,
    skipStep,
    startOnboarding,
    completeOnboarding,
    resetOnboarding,
    initializeOnboarding,

    // Constants
    STEPS: ONBOARDING_STEPS,
    FITNESS_LEVELS,
    WORKOUT_FREQUENCIES,
    PRIMARY_GOALS,

    // Navigation ref
    navigationRef,
  };

  return (
    <OnboardingContext.Provider value={value}>
      {children}
    </OnboardingContext.Provider>
  );
}
