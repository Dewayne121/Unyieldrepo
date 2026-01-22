import React from 'react';
import { View, StyleSheet, Animated, Text } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { useOnboarding } from '../../context/OnboardingContext';

export function OnboardingProgress({ showStepIndicator = true, showStepNames = false }) {
  const { theme } = useTheme();
  const { currentStepIndex, STEPS } = useOnboarding();

  const progress = Animated.useMemo(() => new Animated.Value(currentStepIndex), [currentStepIndex]);

  React.useEffect(() => {
    Animated.timing(progress, {
      toValue: currentStepIndex,
      duration: 400,
      useNativeDriver: false,
    }).start();
  }, [currentStepIndex, progress]);

  const progressWidth = progress.interpolate({
    inputRange: [0, STEPS.length - 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <View style={styles.container}>
      {/* Progress Bar */}
      <View style={[styles.progressTrack, { backgroundColor: theme.bgPanel }]}>
        <Animated.View
          style={[
            styles.progressFill,
            {
              backgroundColor: theme.primary,
              width: progressWidth,
            },
          ]}
        />
      </View>

      {/* Step Indicators */}
      {showStepIndicator && (
        <View style={styles.stepsContainer}>
          {STEPS.map((step, index) => {
            const isCompleted = index < currentStepIndex;
            const isCurrent = index === currentStepIndex;
            const isUpcoming = index > currentStepIndex;

            return (
              <View key={step.id} style={styles.stepWrapper}>
                <View
                  style={[
                    styles.stepDot,
                    isCompleted && { backgroundColor: theme.primary },
                    isCurrent && { backgroundColor: theme.primary, borderWidth: 3, borderColor: theme.bgDeep },
                    isUpcoming && { backgroundColor: theme.bgPanel, borderColor: theme.border },
                  ]}
                >
                  {isCompleted && (
                    <View style={styles.checkmark}>
                      <View style={styles.checkmarkStem} />
                      <View style={styles.checkmarkKick} />
                    </View>
                  )}
                </View>

                {showStepNames && (
                  <View style={[
                    styles.stepNameContainer,
                    isCurrent && { opacity: 1 },
                    isCompleted && { opacity: 0.7 },
                    isUpcoming && { opacity: 0.4 },
                  ]}>
                    <Text style={[styles.stepName, { color: theme.textMain }]}>
                      {step.title}
                    </Text>
                  </View>
                )}
              </View>
            );
          })}
        </View>
      )}

      {/* Step Counter */}
      <View style={styles.counterContainer}>
        <Text style={[styles.counterText, { color: theme.textMuted }]}>
          Step {currentStepIndex + 1} of {STEPS.length}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    paddingVertical: 16,
  },
  progressTrack: {
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 16,
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  stepsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 8,
  },
  stepWrapper: {
    alignItems: 'center',
    flex: 1,
  },
  stepDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  checkmark: {
    width: 14,
    height: 8,
  },
  checkmarkStem: {
    position: 'absolute',
    left: 0,
    top: 5,
    width: 4,
    height: 8,
    backgroundColor: '#fff',
    borderRadius: 1,
  },
  checkmarkKick: {
    position: 'absolute',
    left: 4,
    top: 7,
    width: 10,
    height: 4,
    backgroundColor: '#fff',
    borderRadius: 1,
  },
  stepNameContainer: {
    marginTop: 4,
  },
  stepName: {
    fontSize: 10,
    fontWeight: '600',
    textAlign: 'center',
  },
  counterContainer: {
    alignItems: 'center',
    marginTop: 8,
  },
  counterText: {
    fontSize: 12,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
});
