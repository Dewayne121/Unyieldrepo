import React, { useCallback, useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../context/ThemeContext';
import { useStreamlinedOnboarding } from '../../../context/StreamlinedOnboardingContext';
import { Spacing, Typography, BorderRadius } from '../../../constants/colors';
import OnboardingLayout from '../../../components/onboarding/OnboardingLayout';
import * as Haptics from 'expo-haptics';

const BodyProfileScreen = () => {
  const { theme } = useTheme();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const {
    onboardingData,
    updateStepData,
    goToNextStep,
    STEPS,
    canGoNext,
  } = useStreamlinedOnboarding();

  const bodyProfileData = onboardingData[STEPS.BODY_PROFILE] || {};
  const [useMetric, setUseMetric] = useState(bodyProfileData.useMetric ?? true);
  const [age, setAge] = useState(bodyProfileData.age || '');
  const [heightCm, setHeightCm] = useState(bodyProfileData.heightCm || '');
  const [heightFt, setHeightFt] = useState(bodyProfileData.heightFt || '');
  const [heightIn, setHeightIn] = useState(bodyProfileData.heightIn || '');

  const handleSkip = useCallback(() => {
    // Skip with default values
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    updateStepData(STEPS.BODY_PROFILE, {
      age: '25',
      heightCm: '170',
      heightFt: '5',
      heightIn: '7',
      useMetric: true,
    });
    goToNextStep();
  }, [updateStepData, goToNextStep, STEPS]);

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  const toggleUnit = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const newUseMetric = !useMetric;
    setUseMetric(newUseMetric);
    // Clear height values when toggling
    if (newUseMetric) {
      setHeightFt('');
      setHeightIn('');
    } else {
      setHeightCm('');
    }
    updateStepData(STEPS.BODY_PROFILE, {
      useMetric: newUseMetric,
      heightCm: newUseMetric ? heightCm : '',
      heightFt: !newUseMetric ? heightFt : '',
      heightIn: !newUseMetric ? heightIn : '',
    });
  }, [useMetric, heightCm, heightFt, heightIn, STEPS, updateStepData]);

  const handleAgeChange = useCallback((text) => {
    // Only allow numbers
    const numericText = text.replace(/[^0-9]/g, '');
    setAge(numericText);
    updateStepData(STEPS.BODY_PROFILE, { age: numericText });
  }, [STEPS, updateStepData]);

  const handleHeightCmChange = useCallback((text) => {
    // Only allow numbers, max 3 digits
    const numericText = text.replace(/[^0-9]/g, '').slice(0, 3);
    setHeightCm(numericText);
    updateStepData(STEPS.BODY_PROFILE, { heightCm: numericText });
  }, [STEPS, updateStepData]);

  const handleHeightFtChange = useCallback((text) => {
    // Only allow numbers, max 1 digit (max 7 ft)
    const numericText = text.replace(/[^0-9]/g, '').slice(0, 1);
    setHeightFt(numericText);
    updateStepData(STEPS.BODY_PROFILE, { heightFt: numericText });
  }, [STEPS, updateStepData]);

  const handleHeightInChange = useCallback((text) => {
    // Only allow numbers, max 2 digits (max 11 inches)
    const numericText = text.replace(/[^0-9]/g, '').slice(0, 2);
    setHeightIn(numericText);
    updateStepData(STEPS.BODY_PROFILE, { heightIn: numericText });
  }, [STEPS, updateStepData]);

  const handleNext = useCallback(() => {
    // Ensure data is saved before proceeding
    updateStepData(STEPS.BODY_PROFILE, {
      age,
      heightCm: useMetric ? heightCm : '',
      heightFt: !useMetric ? heightFt : '',
      heightIn: !useMetric ? heightIn : '',
      useMetric,
    });
    goToNextStep();
  }, [age, heightCm, heightFt, heightIn, useMetric, STEPS, updateStepData, goToNextStep]);

  const isNextDisabled = !canGoNext(STEPS.BODY_PROFILE);

  return (
    <OnboardingLayout
      title="Tell us about yourself"
      subtitle="This helps us personalize your experience"
      showBack={true}
      showSkip={true}
      showProgress={true}
      nextLabel="Continue"
      disableNext={isNextDisabled}
      onNext={handleNext}
      onSkip={handleSkip}
    >
      <Animated.View style={{ opacity: fadeAnim }}>
        {/* Age Input */}
        <View style={styles.inputGroup}>
          <Text style={[styles.label, { color: theme.textMain }]}>Age</Text>
          <View
            style={[
              styles.inputContainer,
              { backgroundColor: theme.bgCard, borderColor: theme.border },
            ]}
          >
            <Ionicons name="calendar-outline" size={22} color={theme.textMuted} style={styles.inputIcon} />
            <TextInput
              style={[styles.input, { color: theme.textMain }]}
              placeholder="Enter your age"
              placeholderTextColor={theme.textMuted}
              value={age}
              onChangeText={handleAgeChange}
              keyboardType="number-pad"
              maxLength={3}
            />
            <Text style={[styles.unitSuffix, { color: theme.textMuted }]}>years</Text>
          </View>
        </View>

        {/* Height Input with Unit Toggle */}
        <View style={styles.inputGroup}>
          <View style={styles.labelRow}>
            <Text style={[styles.label, { color: theme.textMain }]}>Height</Text>
            <TouchableOpacity
              style={[styles.unitToggle, { backgroundColor: theme.bgCard, borderColor: theme.border }]}
              onPress={toggleUnit}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.unitToggleText,
                  { color: useMetric ? theme.primary : theme.textMuted },
                ]}
              >
                cm
              </Text>
              <View style={[styles.toggleDivider, { backgroundColor: theme.border }]} />
              <Text
                style={[
                  styles.unitToggleText,
                  { color: !useMetric ? theme.primary : theme.textMuted },
                ]}
              >
                ft/in
              </Text>
            </TouchableOpacity>
          </View>

          {useMetric ? (
            <View
              style={[
                styles.inputContainer,
                { backgroundColor: theme.bgCard, borderColor: theme.border },
              ]}
            >
              <Ionicons name="resize-outline" size={22} color={theme.textMuted} style={styles.inputIcon} />
              <TextInput
                style={[styles.input, { color: theme.textMain }]}
                placeholder="Enter height"
                placeholderTextColor={theme.textMuted}
                value={heightCm}
                onChangeText={handleHeightCmChange}
                keyboardType="number-pad"
                maxLength={3}
              />
              <Text style={[styles.unitSuffix, { color: theme.textMuted }]}>cm</Text>
            </View>
          ) : (
            <View style={styles.imperialContainer}>
              <View
                style={[
                  styles.inputContainer,
                  styles.imperialInput,
                  { backgroundColor: theme.bgCard, borderColor: theme.border },
                ]}
              >
                <Ionicons name="resize-outline" size={22} color={theme.textMuted} style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, { color: theme.textMain }]}
                  placeholder="ft"
                  placeholderTextColor={theme.textMuted}
                  value={heightFt}
                  onChangeText={handleHeightFtChange}
                  keyboardType="number-pad"
                  maxLength={1}
                />
                <Text style={[styles.unitSuffix, { color: theme.textMuted }]}>ft</Text>
              </View>
              <View
                style={[
                  styles.inputContainer,
                  styles.imperialInput,
                  { backgroundColor: theme.bgCard, borderColor: theme.border },
                ]}
              >
                <TextInput
                  style={[styles.input, { color: theme.textMain }]}
                  placeholder="in"
                  placeholderTextColor={theme.textMuted}
                  value={heightIn}
                  onChangeText={handleHeightInChange}
                  keyboardType="number-pad"
                  maxLength={2}
                />
                <Text style={[styles.unitSuffix, { color: theme.textMuted }]}>in</Text>
              </View>
            </View>
          )}
        </View>

        {/* Validation Hints */}
        {age.length > 0 && (parseInt(age, 10) < 13 || parseInt(age, 10) > 100) && (
          <View style={[styles.hintBox, { backgroundColor: theme.bgCard, borderColor: '#FFA500' }]}>
            <Ionicons name="warning-outline" size={18} color="#FFA500" />
            <Text style={[styles.hintText, { color: theme.textMuted }]}>
              Please enter a valid age (13-100)
            </Text>
          </View>
        )}

        {useMetric && heightCm.length > 0 && (parseInt(heightCm, 10) < 100 || parseInt(heightCm, 10) > 250) && (
          <View style={[styles.hintBox, { backgroundColor: theme.bgCard, borderColor: '#FFA500' }]}>
            <Ionicons name="warning-outline" size={18} color="#FFA500" />
            <Text style={[styles.hintText, { color: theme.textMuted }]}>
              Please enter a valid height (100-250 cm)
            </Text>
          </View>
        )}

        {!useMetric && (heightFt.length > 0 || heightIn.length > 0) && (
          (parseInt(heightFt, 10) < 3 || parseInt(heightFt, 10) > 7 || parseInt(heightIn || '0', 10) > 11) && (
            <View style={[styles.hintBox, { backgroundColor: theme.bgCard, borderColor: '#FFA500' }]}>
              <Ionicons name="warning-outline" size={18} color="#FFA500" />
              <Text style={[styles.hintText, { color: theme.textMuted }]}>
                Please enter a valid height (3'0" - 7'11")
              </Text>
            </View>
          )
        )}

        {/* Privacy Note */}
        <View style={[styles.privacyBox, { backgroundColor: theme.bgCard, borderColor: theme.border }]}>
          <Ionicons name="lock-closed-outline" size={18} color={theme.textMuted} style={styles.privacyIcon} />
          <Text style={[styles.privacyText, { color: theme.textMuted }]}>
            This information helps us provide personalized recommendations. You can update this anytime in your profile.
          </Text>
        </View>
      </Animated.View>
    </OnboardingLayout>
  );
};

const styles = StyleSheet.create({
  inputGroup: {
    marginBottom: Spacing.lg,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  label: {
    ...Typography.body,
    fontWeight: '600',
    fontSize: 16,
    marginBottom: Spacing.sm,
  },
  unitToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    padding: Spacing.xs,
  },
  unitToggleText: {
    ...Typography.bodySmall,
    fontWeight: '600',
    fontSize: 13,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  toggleDivider: {
    width: 1,
    height: 16,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    minHeight: 56,
  },
  inputIcon: {
    marginRight: Spacing.sm,
  },
  input: {
    flex: 1,
    ...Typography.body,
    fontSize: 16,
    paddingVertical: Spacing.sm,
  },
  unitSuffix: {
    ...Typography.body,
    fontSize: 15,
    fontWeight: '500',
  },
  imperialContainer: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  imperialInput: {
    flex: 1,
  },
  hintBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    marginTop: -Spacing.sm,
    marginBottom: Spacing.md,
  },
  hintText: {
    ...Typography.bodySmall,
    fontSize: 13,
    marginLeft: Spacing.sm,
    flex: 1,
    lineHeight: 18,
  },
  privacyBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    marginTop: Spacing.lg,
  },
  privacyIcon: {
    marginRight: Spacing.sm,
    marginTop: 2,
  },
  privacyText: {
    ...Typography.bodySmall,
    fontSize: 13,
    lineHeight: 18,
    flex: 1,
  },
});

export default BodyProfileScreen;
