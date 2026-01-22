import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../context/ThemeContext';
import { SKINS } from '../../constants/colors';
import { useOnboarding } from '../../context/OnboardingContext';
import * as Haptics from 'expo-haptics';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function CelebrationOnboardingScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { theme, skin } = useTheme();
  const isDark = skin === SKINS.operator || skin === SKINS.midnight;
  const { onboardingData, goToNextStep, completeOnboarding } = useOnboarding();

  const [confettiActive, setConfettiActive] = useState(true);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.5)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;

  useEffect(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    // Sequence animations
    Animated.sequence([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 500,
        delay: 200,
        useNativeDriver: true,
      }),
    ]).start();

    // Stop confetti after 3 seconds
    const timer = setTimeout(() => setConfettiActive(false), 3000);
    return () => clearTimeout(timer);
  }, []);

  const handleStart = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    await completeOnboarding();
    goToNextStep();
  };

  // Generate confetti pieces
  const renderConfetti = () => {
    if (!confettiActive) return null;

    const confetti = [];
    const colors = [theme.primary, '#EF4444', '#F59E0B', '#10B981', '#3B82F6', '#8B5CF6'];

    for (let i = 0; i < 50; i++) {
      const left = Math.random() * SCREEN_WIDTH;
      const top = -20;
      const delay = Math.random() * 1000;
      const duration = 2000 + Math.random() * 1000;
      const color = colors[Math.floor(Math.random() * colors.length)];
      const size = 6 + Math.random() * 8;
      const rotation = Math.random() * 360;

      confetti.push(
        <Animated.View
          key={i}
          style={[
            styles.confettiPiece,
            {
              left,
              top,
              width: size,
              height: size,
              backgroundColor: color,
              transform: [{ rotate: `${rotation}deg` }],
            },
          ]}
        />
      );
    }

    return (
      <View style={styles.confettiContainer}>
        {confetti}
        <Animated.View
          style={[
            styles.confettiOverlay,
            {
              opacity: fadeAnim,
            },
          ]}
        />
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.bgDeep }]}>
      {/* Confetti */}
      {renderConfetti()}

      {/* Content */}
      <View style={[styles.content, { paddingTop: insets.top + 40, paddingBottom: insets.bottom + 40 }]}>
        {/* Success Icon */}
        <Animated.View
          style={[
            styles.successIconContainer,
            {
              opacity: fadeAnim,
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          <View style={[styles.successCircle, { backgroundColor: `${theme.primary}20` }]}>
            <Ionicons name="checkmark-circle" size={100} color={theme.primary} />
          </View>
        </Animated.View>

        {/* Title */}
        <Animated.Text
          style={[
            styles.title,
            {
              color: theme.textMain,
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          Welcome Aboard!
        </Animated.Text>

        {/* Subtitle */}
        <Animated.Text
          style={[
            styles.subtitle,
            {
              color: theme.textMuted,
              opacity: fadeAnim,
            },
          ]}
        >
          You're now part of UNYIELD
        </Animated.Text>

        {/* User Summary Card */}
        <Animated.View
          style={[
            styles.summaryCard,
            {
              backgroundColor: theme.bgCard,
              borderColor: theme.border,
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          {/* Display Name */}
          {onboardingData.displayName && (
            <View style={styles.summaryRow}>
              <View style={[styles.summaryIconContainer, { backgroundColor: `${theme.primary}15` }]}>
                <Ionicons name="person" size={20} color={theme.primary} />
              </View>
              <View style={styles.summaryContent}>
                <Text style={[styles.summaryLabel, { color: theme.textMuted }]}>Display Name</Text>
                <Text style={[styles.summaryValue, { color: theme.textMain }]}>{onboardingData.displayName}</Text>
              </View>
            </View>
          )}

          {/* Goal */}
          {onboardingData.primaryGoal && (
            <View style={styles.summaryRow}>
              <View style={[styles.summaryIconContainer, { backgroundColor: `${theme.primary}15` }]}>
                <Ionicons name="flag" size={20} color={theme.primary} />
              </View>
              <View style={styles.summaryContent}>
                <Text style={[styles.summaryLabel, { color: theme.textMuted }]}>Primary Goal</Text>
                <Text style={[styles.summaryValue, { color: theme.textMain }]}>
                  {onboardingData.primaryGoal?.replace('_', ' ').toUpperCase()}
                </Text>
              </View>
            </View>
          )}

          {/* Fitness Level */}
          {onboardingData.fitnessLevel && (
            <View style={styles.summaryRow}>
              <View style={[styles.summaryIconContainer, { backgroundColor: `${theme.primary}15` }]}>
                <Ionicons name="fitness" size={20} color={theme.primary} />
              </View>
              <View style={styles.summaryContent}>
                <Text style={[styles.summaryLabel, { color: theme.textMuted }]}>Experience Level</Text>
                <Text style={[styles.summaryValue, { color: theme.textMain }]}>
                  {onboardingData.fitnessLevel?.replace('_', ' ').toUpperCase()}
                </Text>
              </View>
            </View>
          )}

          {/* Workout Frequency */}
          {onboardingData.workoutFrequency && (
            <View style={styles.summaryRow}>
              <View style={[styles.summaryIconContainer, { backgroundColor: `${theme.primary}15` }]}>
                <Ionicons name="calendar" size={20} color={theme.primary} />
              </View>
              <View style={styles.summaryContent}>
                <Text style={[styles.summaryLabel, { color: theme.textMuted }]}>Training Plan</Text>
                <Text style={[styles.summaryValue, { color: theme.textMain }]}>
                  {onboardingData.workoutFrequency} days/week
                </Text>
              </View>
            </View>
          )}
        </Animated.View>

        {/* Motivational Message */}
        <Animated.View
          style={[
            styles.motivationCard,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <Text style={[styles.motivationTitle, { color: theme.textMain }]}>
            Your journey starts now
          </Text>
          <Text style={[styles.motivationText, { color: theme.textMuted }]}>
            Every rep counts. Every workout matters. Your competitors are waiting.
          </Text>
        </Animated.View>

        {/* Start Button */}
        <Animated.View
          style={[
            styles.buttonContainer,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <TouchableOpacity
            onPress={handleStart}
            activeOpacity={0.85}
            style={[styles.startButton, { backgroundColor: theme.primary }]}
          >
            <Ionicons name="play" size={22} color={isDark ? theme.bgDeep : '#fff'} />
            <Text style={[styles.startButtonText, { color: isDark ? theme.bgDeep : '#fff' }]}>
              Start Your Journey
            </Text>
          </TouchableOpacity>
        </Animated.View>

        {/* Tagline */}
        <Animated.Text
          style={[
            styles.tagline,
            {
              color: theme.textMuted,
              opacity: fadeAnim,
            },
          ]}
        >
          Compete. Conquer. Repeat.
        </Animated.Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  confettiContainer: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  confettiOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.1)',
  },
  confettiPiece: {
    position: 'absolute',
    borderRadius: 3,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  successIconContainer: {
    marginBottom: 24,
  },
  successCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 32,
  },
  summaryCard: {
    width: '100%',
    borderRadius: 20,
    borderWidth: 1,
    padding: 20,
    marginBottom: 24,
    gap: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  summaryIconContainer: {
    width: 42,
    height: 42,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryContent: {
    flex: 1,
  },
  summaryLabel: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 15,
    fontWeight: '700',
  },
  motivationCard: {
    alignItems: 'center',
    marginBottom: 32,
  },
  motivationTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
  },
  motivationText: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 22,
  },
  buttonContainer: {
    width: '100%',
    marginBottom: 24,
  },
  startButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    borderRadius: 14,
    gap: 10,
  },
  startButtonText: {
    fontSize: 17,
    fontWeight: '700',
  },
  tagline: {
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 2,
  },
});
