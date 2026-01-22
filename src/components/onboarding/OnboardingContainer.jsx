import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../context/ThemeContext';
import { SKINS } from '../../constants/colors';
import { useOnboarding } from '../../context/OnboardingContext';
import { OnboardingProgress } from './OnboardingProgress';

export function OnboardingContainer({
  children,
  title,
  subtitle,
  showProgress = true,
  showBackButton = true,
  showSkipButton = false,
  onNext,
  onBack,
  onSkip,
  nextButtonText,
  disableNext = false,
  loading = false,
}) {
  const insets = useSafeAreaInsets();
  const { theme, skin } = useTheme();
  const isDark = skin === SKINS.operator || skin === SKINS.midnight;
  const { goToPreviousStep, skipStep, currentStepIndex, STEPS } = useOnboarding();

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      goToPreviousStep();
    }
  };

  const handleSkip = () => {
    if (onSkip) {
      onSkip();
    } else {
      skipStep();
    }
  };

  const isLastStep = currentStepIndex === STEPS.length - 1;
  const defaultNextText = isLastStep ? 'Finish' : 'Continue';

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: theme.bgDeep }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
    >
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <View style={styles.headerTop}>
          {/* Back Button */}
          {showBackButton && (
            <TouchableOpacity
              onPress={handleBack}
              activeOpacity={0.7}
              style={[styles.iconButton, { backgroundColor: theme.bgCard, borderColor: theme.border }]}
            >
              <Ionicons name="arrow-back" size={22} color={theme.textMain} />
            </TouchableOpacity>
          )}

          {/* Skip Button */}
          {showSkipButton && (
            <TouchableOpacity
              onPress={handleSkip}
              activeOpacity={0.7}
              style={styles.skipButton}
            >
              <Text style={[styles.skipText, { color: theme.textMuted }]}>Skip</Text>
            </TouchableOpacity>
          )}

          {/* Spacer for center alignment */}
          <View style={styles.spacer} />
        </View>

        {/* Progress */}
        {showProgress && <OnboardingProgress showStepIndicator={false} />}

        {/* Title & Subtitle */}
        {title && (
          <View style={styles.titleContainer}>
            <Text style={[styles.title, { color: theme.textMain }]}>{title}</Text>
            {subtitle && <Text style={[styles.subtitle, { color: theme.textMuted }]}>{subtitle}</Text>}
          </View>
        )}
      </View>

      {/* Content */}
      <ScrollView
        style={styles.content}
        contentContainerStyle={[styles.contentContainer, { paddingBottom: insets.bottom + 100 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {children}
      </ScrollView>

      {/* Bottom CTA */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + 16, borderTopColor: theme.border }]}>
        <TouchableOpacity
          onPress={onNext}
          disabled={disableNext || loading}
          activeOpacity={0.85}
          style={[
            styles.nextButton,
            { backgroundColor: theme.primary },
            (disableNext || loading) && styles.nextButtonDisabled,
          ]}
        >
          {loading ? (
            <Text style={[styles.nextButtonText, { color: isDark ? theme.bgDeep : '#fff' }]}>
              Loading...
            </Text>
          ) : (
            <>
              <Text style={[styles.nextButtonText, { color: isDark ? theme.bgDeep : '#fff' }]}>
                {nextButtonText || defaultNextText}
              </Text>
              {!isLastStep && (
                <Ionicons
                  name="chevron-forward"
                  size={20}
                  color={isDark ? theme.bgDeep : '#fff'}
                  style={styles.nextButtonIcon}
                />
              )}
            </>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 44,
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  skipButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  skipText: {
    fontSize: 15,
    fontWeight: '600',
  },
  spacer: {
    flex: 1,
  },
  titleContainer: {
    marginTop: 24,
    marginBottom: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 15,
    marginTop: 6,
    lineHeight: 22,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 16,
    borderTopWidth: 1,
  },
  nextButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 14,
  },
  nextButtonDisabled: {
    opacity: 0.5,
  },
  nextButtonText: {
    fontSize: 16,
    fontWeight: '700',
  },
  nextButtonIcon: {
    marginLeft: 6,
  },
});
