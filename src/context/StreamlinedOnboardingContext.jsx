import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import api from '../services/api';

// Global callback to refresh user data after onboarding completes
let globalRefreshUserCallback = null;

export const setRefreshUserCallback = (callback) => {
  globalRefreshUserCallback = callback;
};

// Storage keys - export these so AuthContext can clear them
export const ONBOARDING_DATA_KEY = '@unyield_streamlined_onboarding_data';
export const ONBOARDING_STEP_KEY = '@unyield_streamlined_onboarding_step';
export const ONBOARDING_COMPLETED_KEY = '@unyield_streamlined_onboarding_completed';
// This key matches AuthContext for backwards compatibility
export const AUTH_ONBOARDING_KEY = 'unyield_seen_onboarding';

// Global reset callback that can be called from AuthContext
let globalResetCallback = null;
// Global callback to check if onboarding was abandoned
let globalCheckAbandonedCallback = null;

export const resetOnboardingForNewUser = async () => {
  if (globalResetCallback) {
    await globalResetCallback();
  }
};

export const checkOnboardingAbandoned = async () => {
  if (globalCheckAbandonedCallback) {
    return await globalCheckAbandonedCallback();
  }
  return false;
};

// Onboarding steps
export const ONBOARDING_STEPS = {
  ENTRY: 'entry',
  PROFILE: 'profile',
  GOAL: 'goal',
  EXPERIENCE: 'experience',
  BODY_PROFILE: 'body_profile',
  TRAINING_AVAILABILITY: 'training_availability',
  PLAN_PREVIEW: 'plan_preview',
};

// Step order for progression
export const STEP_ORDER = [
  ONBOARDING_STEPS.ENTRY,
  ONBOARDING_STEPS.PROFILE,
  ONBOARDING_STEPS.GOAL,
  ONBOARDING_STEPS.EXPERIENCE,
  ONBOARDING_STEPS.BODY_PROFILE,
  ONBOARDING_STEPS.TRAINING_AVAILABILITY,
  ONBOARDING_STEPS.PLAN_PREVIEW,
];

// Goal options
export const GOAL_OPTIONS = [
  {
    id: 'weight_loss',
    title: 'Lose Weight',
    description: 'Burn fat and get lean',
    icon: 'flame-outline',
    color: '#FF6B6B',
    planType: 'fat_loss',
  },
  {
    id: 'consistency',
    title: 'Build Consistency',
    description: 'Create lasting habits',
    icon: 'calendar-outline',
    color: '#4ECDC4',
    planType: 'general_fitness',
  },
  {
    id: 'strength',
    title: 'Build Strength',
    description: 'Increase power and performance',
    icon: 'barbell-outline', // fallback
    color: '#95E1D3',
    planType: 'strength',
  },
  {
    id: 'muscle_gain',
    title: 'Build Muscle',
    description: 'Hypertrophy and size',
    icon: 'fitness-outline',
    color: '#F38181',
    planType: 'hypertrophy',
  },
  {
    id: 'competitive',
    title: 'Competitive',
    description: 'Rank up and compete',
    icon: 'trophy-outline',
    color: '#FFD93D',
    planType: 'performance',
  },
];

// Experience level options
export const EXPERIENCE_OPTIONS = [
  {
    id: 'never',
    title: 'Never Trained',
    description: 'Brand new to working out',
    level: 'beginner',
    recommendedDays: 2,
    sessionLength: 30,
  },
  {
    id: 'beginner',
    title: 'Beginner',
    description: 'Less than 6 months',
    level: 'beginner',
    recommendedDays: 3,
    sessionLength: 45,
  },
  {
    id: 'intermediate',
    title: 'Intermediate',
    description: '6 months to 2 years',
    level: 'intermediate',
    recommendedDays: 4,
    sessionLength: 45,
  },
  {
    id: 'advanced',
    title: 'Advanced',
    description: '2+ years of training',
    level: 'advanced',
    recommendedDays: 5,
    sessionLength: 60,
  },
];

// Training frequency options
export const FREQUENCY_OPTIONS = [
  {
    id: '2',
    title: '2 Days',
    subtitle: 'Light commitment',
    description: 'Full-body workouts',
    recommended: true,
  },
  {
    id: '3',
    title: '3 Days',
    subtitle: 'Balanced',
    description: 'Full-body or Upper/Lower',
    recommended: true,
  },
  {
    id: '4',
    title: '4 Days',
    subtitle: 'Dedicated',
    description: 'Upper/Lower split',
    recommended: false,
  },
  {
    id: '5',
    title: '5+ Days',
    subtitle: 'Serious',
    description: 'PPL or body part split',
    recommended: false,
  },
];

// Initial state
const initialState = {
  [ONBOARDING_STEPS.ENTRY]: {
    isAuthenticated: false,
    isGuest: false,
  },
  [ONBOARDING_STEPS.PROFILE]: {
    displayName: '',
    profileImage: null,
  },
  [ONBOARDING_STEPS.GOAL]: {
    selectedGoal: null,
  },
  [ONBOARDING_STEPS.EXPERIENCE]: {
    selectedExperience: null,
  },
  [ONBOARDING_STEPS.BODY_PROFILE]: {
    age: '',
    heightFt: '',
    heightIn: '',
    heightCm: '',
    useMetric: true,
  },
  [ONBOARDING_STEPS.TRAINING_AVAILABILITY]: {
    selectedDays: null,
  },
  [ONBOARDING_STEPS.PLAN_PREVIEW]: {
    acceptedPlan: false,
  },
};

const StreamlinedOnboardingContext = createContext(null);

export const StreamlinedOnboardingProvider = ({ children }) => {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [onboardingData, setOnboardingData] = useState(initialState);
  const [isLoading, setIsLoading] = useState(true);
  const [isCompleted, setIsCompleted] = useState(false);

  // Load saved onboarding data
  useEffect(() => {
    loadOnboardingData();
  }, []);

  // Register global reset callback for AuthContext to call
  useEffect(() => {
    globalResetCallback = async () => {
      try {
        await AsyncStorage.multiRemove([
          ONBOARDING_DATA_KEY,
          ONBOARDING_STEP_KEY,
          ONBOARDING_COMPLETED_KEY,
          AUTH_ONBOARDING_KEY,
        ]);
        setOnboardingData(initialState);
        setCurrentStepIndex(0);
        setIsCompleted(false);
        console.log('Onboarding context reset for new user');
      } catch (error) {
        console.error('Error resetting onboarding context:', error);
      }
    };

    // Register callback to check if onboarding was abandoned
    globalCheckAbandonedCallback = () => {
      // Onboarding is considered abandoned if:
      // - User started onboarding (past ENTRY step, i.e., currentStepIndex > 0)
      // - Onboarding is NOT complete
      const abandoned = currentStepIndex > 0 && !isCompleted;
      console.log('Checking if onboarding abandoned:', { currentStepIndex, isCompleted, abandoned });
      return abandoned;
    };

    return () => {
      globalResetCallback = null;
      globalCheckAbandonedCallback = null;
    };
  }, [currentStepIndex, isCompleted]);

  const loadOnboardingData = async () => {
    try {
      const [savedData, savedStep, completed] = await Promise.all([
        AsyncStorage.getItem(ONBOARDING_DATA_KEY),
        AsyncStorage.getItem(ONBOARDING_STEP_KEY),
        AsyncStorage.getItem(ONBOARDING_COMPLETED_KEY),
      ]);

      // If onboarding was completed, mark as complete and load the data
      if (completed === 'true') {
        setIsCompleted(true);
        if (savedData) {
          setOnboardingData(JSON.parse(savedData));
        }
      } else {
        // Onboarding not completed - resume from where user left off
        setIsCompleted(false);
        if (savedData) {
          setOnboardingData(JSON.parse(savedData));
        }
        if (savedStep) {
          const stepIndex = parseInt(savedStep, 10);
          // Validate step index is within bounds
          if (stepIndex >= 0 && stepIndex < STEP_ORDER.length) {
            setCurrentStepIndex(stepIndex);
          } else {
            // Invalid step index, start from beginning
            setCurrentStepIndex(0);
          }
        } else {
          // No saved step, start from beginning
          setCurrentStepIndex(0);
        }
      }
    } catch (error) {
      console.error('Error loading onboarding data:', error);
      // On error, start fresh
      setCurrentStepIndex(0);
      setOnboardingData(initialState);
      setIsCompleted(false);
    } finally {
      setIsLoading(false);
    }
  };

  const saveOnboardingData = async (data, stepIndex) => {
    try {
      await AsyncStorage.multiSet([
        [ONBOARDING_DATA_KEY, JSON.stringify(data)],
        [ONBOARDING_STEP_KEY, String(stepIndex)],
      ]);
    } catch (error) {
      console.error('Error saving onboarding data:', error);
    }
  };

  const updateStepData = useCallback((step, data) => {
    setOnboardingData(prev => {
      const updated = {
        ...prev,
        [step]: {
          ...prev[step],
          ...data,
        },
      };
      saveOnboardingData(updated, currentStepIndex);
      return updated;
    });
  }, [currentStepIndex]);

  const goToStep = useCallback((stepIndex) => {
    if (stepIndex >= 0 && stepIndex < STEP_ORDER.length) {
      setCurrentStepIndex(stepIndex);
      AsyncStorage.setItem(ONBOARDING_STEP_KEY, String(stepIndex));
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  }, []);

  const goToNextStep = useCallback(() => {
    if (currentStepIndex < STEP_ORDER.length - 1) {
      goToStep(currentStepIndex + 1);
    }
  }, [currentStepIndex, goToStep]);

  const goToPreviousStep = useCallback(() => {
    if (currentStepIndex > 0) {
      goToStep(currentStepIndex - 1);
    }
  }, [currentStepIndex, goToStep]);

  const getCurrentStep = useCallback(() => {
    return STEP_ORDER[currentStepIndex];
  }, [currentStepIndex]);

  const getStepProgress = useCallback(() => {
    return {
      current: currentStepIndex + 1,
      total: STEP_ORDER.length,
      percentage: ((currentStepIndex + 1) / STEP_ORDER.length) * 100,
    };
  }, [currentStepIndex]);

  const canGoNext = useCallback((step = getCurrentStep()) => {
    const stepData = onboardingData[step];

    switch (step) {
      case ONBOARDING_STEPS.ENTRY:
        return stepData?.isAuthenticated || stepData?.isGuest;
      case ONBOARDING_STEPS.PROFILE:
        return stepData?.displayName && stepData.displayName.trim().length >= 2;
      case ONBOARDING_STEPS.GOAL:
        return !!stepData?.selectedGoal;
      case ONBOARDING_STEPS.EXPERIENCE:
        return !!stepData?.selectedExperience;
      case ONBOARDING_STEPS.BODY_PROFILE:
        const hasAge = stepData?.age && stepData.age.length >= 2;
        const hasHeight = stepData?.useMetric
          ? stepData?.heightCm && stepData.heightCm.length >= 2
          : stepData?.heightFt && stepData?.heightIn;
        return hasAge && hasHeight;
      case ONBOARDING_STEPS.TRAINING_AVAILABILITY:
        return !!stepData?.selectedDays;
      case ONBOARDING_STEPS.PLAN_PREVIEW:
        return true;
      default:
        return false;
    }
  }, [onboardingData, getCurrentStep]);

  const generateRecommendedPlan = useCallback(() => {
    const goal = GOAL_OPTIONS.find(g => g.id === onboardingData[ONBOARDING_STEPS.GOAL]?.selectedGoal);
    const experience = EXPERIENCE_OPTIONS.find(e => e.id === onboardingData[ONBOARDING_STEPS.EXPERIENCE]?.selectedExperience);
    const days = onboardingData[ONBOARDING_STEPS.TRAINING_AVAILABILITY]?.selectedDays;

    if (!goal || !experience || !days) {
      return null;
    }

    const numDays = parseInt(days, 10);
    let splitType = 'Full Body';
    let focus = goal.title;
    let sessionLength = experience.sessionLength;

    // Determine split based on days
    if (numDays <= 2) {
      splitType = 'Full Body';
    } else if (numDays === 3) {
      splitType = experience.level === 'beginner' ? 'Full Body' : 'Upper/Lower';
    } else if (numDays === 4) {
      splitType = 'Upper/Lower';
    } else {
      splitType = 'Push/Pull/Legs';
    }

    // Adjust session length based on goal
    if (goal.id === 'weight_loss') {
      sessionLength = Math.min(sessionLength, 45);
    }

    return {
      goalTitle: goal.title,
      focus,
      splitType,
      daysPerWeek: numDays,
      sessionLength,
      level: experience.title,
      experienceLevel: experience.level,
    };
  }, [onboardingData]);

  const completeOnboarding = useCallback(async () => {
    try {
      console.log('Completing onboarding with data:', onboardingData);

      // Map onboarding data to backend format
      const profileData = onboardingData[ONBOARDING_STEPS.PROFILE];
      const goalData = onboardingData[ONBOARDING_STEPS.GOAL];
      const experienceData = onboardingData[ONBOARDING_STEPS.EXPERIENCE];
      const bodyData = onboardingData[ONBOARDING_STEPS.BODY_PROFILE];
      const availabilityData = onboardingData[ONBOARDING_STEPS.TRAINING_AVAILABILITY];

      // Build the updates object for the backend
      const updates = {};

      // Profile data
      if (profileData?.displayName) {
        updates.name = profileData.displayName;
      }
      if (profileData?.profileImage) {
        updates.profileImage = profileData.profileImage;
      }

      // Set default region for onboarding completion check
      updates.region = 'Global';

      // Goal data - map goal IDs to backend values (must be: Hypertrophy, Leanness, Performance)
      const goalMap = {
        'weight_loss': 'Leanness',
        'consistency': 'Performance',
        'strength': 'Performance',
        'muscle_gain': 'Hypertrophy',
        'competitive': 'Performance',
      };
      if (goalData?.selectedGoal) {
        updates.goal = goalMap[goalData.selectedGoal] || 'Performance';
      }

      // Experience data
      const experienceMap = {
        'never': 'beginner',
        'beginner': 'beginner',
        'intermediate': 'intermediate',
        'advanced': 'advanced',
      };
      if (experienceData?.selectedExperience) {
        updates.experienceLevel = experienceMap[experienceData.selectedExperience] || 'beginner';
      }

      // Body profile data
      if (bodyData?.age) {
        updates.age = bodyData.age;
      }
      if (bodyData?.heightCm) {
        updates.height = bodyData.heightCm;
      }
      if (bodyData?.heightFt && bodyData?.heightIn) {
        // Convert ft/in to cm for backend
        const totalInches = (parseInt(bodyData.heightFt) * 12) + parseInt(bodyData.heightIn);
        updates.height = Math.round(totalInches * 2.54);
      }

      // Training availability
      if (availabilityData?.selectedDays) {
        updates.trainingDays = parseInt(availabilityData.selectedDays, 10);
      }

      // Send to backend if there are updates
      if (Object.keys(updates).length > 0) {
        console.log('Sending profile updates to backend:', {
          ...updates,
          profileImage: updates.profileImage ? `[BASE64 IMAGE - ${updates.profileImage.length} chars]` : null
        });

        const updateResult = await api.updateProfile(updates);
        console.log('Profile update result:', updateResult);

        // Refresh user data to get the updated profile (including profile image)
        if (globalRefreshUserCallback) {
          console.log('Refreshing user data after onboarding...');
          const refreshedUser = await globalRefreshUserCallback();
          console.log('Refreshed user data:', {
            ...refreshedUser,
            profileImage: refreshedUser?.profileImage ? `[BASE64 IMAGE - ${refreshedUser.profileImage.length} chars]` : null
          });
        }
      }

      // Set both keys to ensure AuthContext also knows onboarding is complete
      await AsyncStorage.multiSet([
        [ONBOARDING_COMPLETED_KEY, 'true'],
        [AUTH_ONBOARDING_KEY, 'true'],
      ]);
      setIsCompleted(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      console.error('Error completing onboarding:', error);
    }
  }, [onboardingData]);

  const resetOnboarding = useCallback(async () => {
    try {
      await AsyncStorage.multiRemove([
        ONBOARDING_DATA_KEY,
        ONBOARDING_STEP_KEY,
        ONBOARDING_COMPLETED_KEY,
        AUTH_ONBOARDING_KEY,
      ]);
      setOnboardingData(initialState);
      setCurrentStepIndex(0);
      setIsCompleted(false);
    } catch (error) {
      console.error('Error resetting onboarding:', error);
    }
  }, []);

  const value = {
    // State
    currentStepIndex,
    onboardingData,
    isLoading,
    isCompleted,
    currentStep: getCurrentStep(),

    // Constants
    STEPS: ONBOARDING_STEPS,
    STEP_ORDER,
    GOAL_OPTIONS,
    EXPERIENCE_OPTIONS,
    FREQUENCY_OPTIONS,

    // Methods
    updateStepData,
    goToStep,
    goToNextStep,
    goToPreviousStep,
    getCurrentStep,
    getStepProgress,
    canGoNext,
    generateRecommendedPlan,
    completeOnboarding,
    resetOnboarding,
  };

  return (
    <StreamlinedOnboardingContext.Provider value={value}>
      {children}
    </StreamlinedOnboardingContext.Provider>
  );
};

export const useStreamlinedOnboarding = () => {
  const context = useContext(StreamlinedOnboardingContext);
  if (!context) {
    throw new Error('useStreamlinedOnboarding must be used within StreamlinedOnboardingProvider');
  }
  return context;
};
