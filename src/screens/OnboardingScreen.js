import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, KeyboardAvoidingView, Platform, Image, Dimensions, FlatList, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp, REGIONS, GOALS } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { SKINS } from '../constants/colors';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Fitness levels for onboarding
const FITNESS_LEVELS = [
  { id: 'beginner', title: 'Beginner', description: 'New to fitness or returning after a break', icon: 'leaf-outline' },
  { id: 'intermediate', title: 'Intermediate', description: 'Work out occasionally, know the basics', icon: 'barbell-outline' },
  { id: 'advanced', title: 'Advanced', description: 'Train regularly, comfortable with complex movements', icon: 'fitness-outline' },
  { id: 'elite', title: 'Elite', description: 'Competitive or training at high intensity', icon: 'trophy-outline' },
];

// Workout frequencies
const WORKOUT_FREQUENCIES = [
  { id: '1-2', title: '1-2 days/week', subtitle: 'Light' },
  { id: '3-4', title: '3-4 days/week', subtitle: 'Moderate' },
  { id: '5-6', title: '5-6 days/week', subtitle: 'Dedicated' },
  { id: '7', title: 'Every day', subtitle: 'Elite' },
];

const DAYS_OF_WEEK = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export default function OnboardingScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { onboardingComplete } = useApp();
  const { updateUserProfile, setOnboardingComplete, signOut, user } = useAuth();
  const { theme, skin } = useTheme();
  const isDark = skin === SKINS.operator || skin === SKINS.midnight;

  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);

  // Form data
  const [displayName, setDisplayName] = useState('');
  const [region, setRegion] = useState(REGIONS[0]);
  const [goal, setGoal] = useState(GOALS[0]);
  const [fitnessLevel, setFitnessLevel] = useState('intermediate'); // Store ID as string
  const [workoutFrequency, setWorkoutFrequency] = useState('3-4');
  const [preferredDays, setPreferredDays] = useState(['Mon', 'Wed', 'Fri']);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  React.useEffect(() => {
    animateIn();
  }, [step]);

  const animateIn = () => {
    fadeAnim.setValue(0);
    slideAnim.setValue(30);

    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        friction: 8,
        tension: 50,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const steps = [
    {
      id: 'welcome',
      title: 'Welcome to UNYIELD',
      subtitle: 'Let\'s set up your profile',
      render: renderWelcomeStep,
      canContinue: () => true,
    },
    {
      id: 'name',
      title: 'What\'s Your Name?',
      subtitle: 'This will appear on leaderboards',
      render: renderNameStep,
      canContinue: () => displayName.trim().length >= 2,
    },
    {
      id: 'region',
      title: 'Choose Your Region',
      subtitle: 'Compete locally or go global',
      render: renderRegionStep,
      canContinue: () => true,
    },
    {
      id: 'goal',
      title: 'Set Your Goal',
      subtitle: 'What motivates you?',
      render: renderGoalStep,
      canContinue: () => true,
    },
    {
      id: 'fitness',
      title: 'Fitness Level',
      subtitle: 'Help us tailor your experience',
      render: renderFitnessStep,
      canContinue: () => true,
    },
    {
      id: 'schedule',
      title: 'Training Schedule',
      subtitle: 'How often do you train?',
      render: renderScheduleStep,
      canContinue: () => true,
    },
    {
      id: 'notifications',
      title: 'Stay Motivated',
      subtitle: 'Enable notifications',
      render: renderNotificationsStep,
      canContinue: () => true,
    },
    {
      id: 'complete',
      title: 'You\'re All Set!',
      subtitle: 'Time to crush it',
      render: renderCompleteStep,
      canContinue: () => true,
    },
  ];

  const currentStepData = steps[step];
  const progress = ((step + 1) / steps.length) * 100;

  function renderWelcomeStep() {
    return (
      <View style={styles.welcomeContainer}>
        <Image source={require('../../assets/logo.png')} style={styles.logo} resizeMode="contain" />
        <Text style={[styles.welcomeTitle, { color: theme.textMain }]}>Compete. Conquer. Repeat.</Text>
        <Text style={[styles.welcomeText, { color: theme.textMuted }]}>
          Join thousands of athletes pushing their limits every day. Track workouts, earn points, climb leaderboards, and prove your dedication.
        </Text>

        <View style={[styles.featureCard, { backgroundColor: theme.bgCard, borderColor: theme.border }]}>
          <Ionicons name="trophy-outline" size={24} color={theme.primary} />
          <View style={styles.featureContent}>
            <Text style={[styles.featureTitle, { color: theme.textMain }]}>Compete & Climb Ranks</Text>
            <Text style={[styles.featureDescription, { color: theme.textMuted }]}>From Initiate to Legend - earn your place on the leaderboard</Text>
          </View>
        </View>

        <View style={[styles.featureCard, { backgroundColor: theme.bgCard, borderColor: theme.border }]}>
          <Ionicons name="stats-chart-outline" size={24} color={theme.primary} />
          <View style={styles.featureContent}>
            <Text style={[styles.featureTitle, { color: theme.textMain }]}>Track Everything</Text>
            <Text style={[styles.featureDescription, { color: theme.textMuted }]}>Log workouts, track streaks, monitor your progress</Text>
          </View>
        </View>

        <View style={[styles.featureCard, { backgroundColor: theme.bgCard, borderColor: theme.border }]}>
          <Ionicons name="shirt-outline" size={24} color={theme.primary} />
          <View style={styles.featureContent}>
            <Text style={[styles.featureTitle, { color: theme.textMain }]}>Earn Rewards</Text>
            <Text style={[styles.featureDescription, { color: theme.textMuted }]}>Unlock exclusive digital hoodies as you progress</Text>
          </View>
        </View>
      </View>
    );
  }

  function renderNameStep() {
    return (
      <View style={styles.stepContainer}>
        <View style={[styles.inputCard, { backgroundColor: theme.bgCard, borderColor: theme.border }]}>
          <Ionicons name="person-outline" size={24} color={theme.primary} style={styles.inputIcon} />
          <TextInput
            style={[styles.input, { color: theme.textMain }]}
            placeholder="Enter your display name"
            placeholderTextColor={theme.textMuted}
            value={displayName}
            onChangeText={setDisplayName}
            autoFocus
            maxLength={30}
          />
        </View>
        <Text style={[styles.hintText, { color: theme.textMuted }]}>
          {displayName.length}/30 characters
        </Text>

        {displayName.length >= 2 && (
          <View style={[styles.previewCard, { backgroundColor: theme.bgCard, borderColor: theme.border }]}>
            <Text style={[styles.previewLabel, { color: theme.textMuted }]}>Preview on leaderboard</Text>
            <View style={styles.previewRow}>
              <View style={[styles.previewAvatar, { backgroundColor: theme.primary }]}>
                <Ionicons name="person" size={20} color="#fff" />
              </View>
              <Text style={[styles.previewName, { color: theme.textMain }]}>{displayName}</Text>
            </View>
          </View>
        )}
      </View>
    );
  }

  function renderRegionStep() {
    return (
      <View style={styles.stepContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.regionsScroll}>
          {REGIONS.map((r) => {
            const active = r === region;
            return (
              <TouchableOpacity
                key={r}
                onPress={() => setRegion(r)}
                activeOpacity={0.8}
                style={[
                  styles.regionCard,
                  active && styles.regionCardActive,
                  { backgroundColor: theme.bgCard, borderColor: active ? theme.primary : theme.border },
                ]}
              >
                <Ionicons name="location-outline" size={24} color={active ? theme.primary : theme.textMuted} />
                <Text style={[styles.regionName, active && { color: theme.primary }, { color: theme.textMain }]}>{r}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
        <Text style={[styles.hintText, { color: theme.textMuted }]}>
          Compete with athletes in your region
        </Text>
      </View>
    );
  }

  function renderGoalStep() {
    const goalInfo = {
      'Hypertrophy': { icon: 'barbell-outline', desc: 'Build muscle & strength', color: '#EF4444' },
      'Leanness': { icon: 'fire-outline', desc: 'Get lean & shredded', color: '#F59E0B' },
      'Performance': { icon: 'flash-outline', desc: 'Boost athletic ability', color: '#3B82F6' },
    };

    return (
      <View style={styles.stepContainer}>
        {GOALS.map((g) => {
          const active = g === goal;
          const info = goalInfo[g];
          return (
            <TouchableOpacity
              key={g}
              onPress={() => setGoal(g)}
              activeOpacity={0.85}
              style={[
                styles.goalCard,
                { backgroundColor: theme.bgCard, borderColor: active ? info.color : theme.border },
              ]}
            >
              <View style={[styles.goalIconContainer, { backgroundColor: `${info.color}15` }]}>
                <Ionicons name={info.icon} size={28} color={info.color} />
              </View>
              <View style={styles.goalContent}>
                <Text style={[styles.goalTitle, { color: theme.textMain }]}>{g.toUpperCase()}</Text>
                <Text style={[styles.goalDescription, { color: theme.textMuted }]}>{info.desc}</Text>
              </View>
              {active && (
                <View style={[styles.goalCheck, { backgroundColor: info.color }]}>
                  <Ionicons name="checkmark" size={16} color="#fff" />
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    );
  }

  function renderFitnessStep() {
    return (
      <View style={styles.stepContainer}>
        {FITNESS_LEVELS.map((level) => {
          const active = fitnessLevel === level.id;
          return (
            <TouchableOpacity
              key={level.id}
              onPress={() => setFitnessLevel(level.id)}
              activeOpacity={0.85}
              style={[
                styles.fitnessCard,
                { backgroundColor: theme.bgCard, borderColor: active ? theme.primary : theme.border },
              ]}
            >
              <View style={styles.fitnessLeft}>
                <View style={[styles.fitnessIconContainer, { backgroundColor: active ? `${theme.primary}20` : theme.bgDeep }]}>
                  <Ionicons name={level.icon} size={24} color={active ? theme.primary : theme.textMuted} />
                </View>
                <View>
                  <Text style={[styles.fitnessTitle, { color: theme.textMain }]}>{level.title}</Text>
                  <Text style={[styles.fitnessDescription, { color: theme.textMuted }]}>{level.description}</Text>
                </View>
              </View>
              {active && (
                <View style={[styles.fitnessCheck, { backgroundColor: theme.primary }]}>
                  <Ionicons name="checkmark" size={16} color={isDark ? theme.bgDeep : '#fff'} />
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    );
  }

  function renderScheduleStep() {
    return (
      <View style={styles.stepContainer}>
        <Text style={[styles.sectionTitle, { color: theme.textMain }]}>Workout Frequency</Text>
        <View style={styles.frequencyContainer}>
          {WORKOUT_FREQUENCIES.map((freq) => {
            const active = workoutFrequency === freq.id;
            return (
              <TouchableOpacity
                key={freq.id}
                onPress={() => setWorkoutFrequency(freq.id)}
                activeOpacity={0.85}
                style={[
                  styles.frequencyCard,
                  { backgroundColor: theme.bgCard, borderColor: active ? theme.primary : theme.border },
                ]}
              >
                <Text style={[styles.frequencyTitle, active && { color: theme.primary }, { color: theme.textMain }]}>{freq.title}</Text>
                <Text style={[styles.frequencySubtitle, { color: theme.textMuted }]}>{freq.subtitle}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={[styles.sectionTitle, { color: theme.textMain }, { marginTop: 24 }]}>Preferred Days</Text>
        <View style={styles.daysContainer}>
          {DAYS_OF_WEEK.map((day) => {
            const active = preferredDays.includes(day);
            return (
              <TouchableOpacity
                key={day}
                onPress={() => {
                  if (active) {
                    setPreferredDays(preferredDays.filter((d) => d !== day));
                  } else {
                    setPreferredDays([...preferredDays, day]);
                  }
                }}
                activeOpacity={0.8}
                style={[
                  styles.dayCard,
                  active && styles.dayCardActive,
                  { backgroundColor: active ? theme.primary : theme.bgCard, borderColor: theme.border },
                ]}
              >
                <Text style={[styles.dayText, { color: active ? (isDark ? theme.bgDeep : '#fff') : theme.textMain }]}>{day}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    );
  }

  function renderNotificationsStep() {
    return (
      <View style={styles.stepContainer}>
        <View style={[styles.notificationCard, { backgroundColor: theme.bgCard, borderColor: theme.border }]}>
          <View style={[styles.notificationIconContainer, { backgroundColor: `${theme.primary}15` }]}>
            <Ionicons name="notifications" size={32} color={theme.primary} />
          </View>
          <Text style={[styles.notificationTitle, { color: theme.textMain }]}>Enable Notifications</Text>
          <Text style={[styles.notificationDescription, { color: theme.textMuted }]}>
            {notificationsEnabled
              ? 'Stay motivated with workout reminders, streak alerts, and leaderboard updates.'
              : 'You won\'t receive reminders about workouts or streak alerts.'}
          </Text>

          <TouchableOpacity
            onPress={() => setNotificationsEnabled(!notificationsEnabled)}
            activeOpacity={0.8}
            style={[styles.notificationToggle, { backgroundColor: notificationsEnabled ? theme.primary : theme.border }]}
          >
            <Text style={[styles.toggleText, { color: notificationsEnabled ? (isDark ? theme.bgDeep : '#fff') : theme.textMuted }]}>
              {notificationsEnabled ? 'Enabled' : 'Disabled'}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={[styles.benefitsCard, { backgroundColor: theme.bgCard, borderColor: theme.border }]}>
          <Text style={[styles.benefitsTitle, { color: theme.textMain }]}>What you'll get:</Text>
          <View style={styles.benefitItem}>
            <Ionicons name="flame-outline" size={18} color="#F59E0B" />
            <Text style={[styles.benefitText, { color: theme.textMuted }]}>Streak reminders to keep you going</Text>
          </View>
          <View style={styles.benefitItem}>
            <Ionicons name="trophy-outline" size={18} color="#8B5CF6" />
            <Text style={[styles.benefitText, { color: theme.textMuted }]}>Leaderboard challenge alerts</Text>
          </View>
          <View style={styles.benefitItem}>
            <Ionicons name="trending-up-outline" size={18} color="#10B981" />
            <Text style={[styles.benefitText, { color: theme.textMuted }]}>Progress milestone celebrations</Text>
          </View>
        </View>
      </View>
    );
  }

  function renderCompleteStep() {
    return (
      <View style={styles.completeContainer}>
        <View style={[styles.successIconContainer, { backgroundColor: `${theme.primary}15` }]}>
          <Ionicons name="checkmark-circle" size={60} color={theme.primary} />
        </View>
        <Text style={[styles.completeTitle, { color: theme.textMain }]}>You're Ready!</Text>
        <Text style={[styles.completeText, { color: theme.textMuted }]}>
          Here's what you've set up:
        </Text>

        <View style={[styles.summaryCard, { backgroundColor: theme.bgCard, borderColor: theme.border }]}>
          <View style={styles.summaryRow}>
            <Ionicons name="person" size={18} color={theme.primary} />
            <Text style={[styles.summaryLabel, { color: theme.textMuted }]}>Name:</Text>
            <Text style={[styles.summaryValue, { color: theme.textMain }]}>{displayName || 'Athlete'}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Ionicons name="location" size={18} color={theme.primary} />
            <Text style={[styles.summaryLabel, { color: theme.textMuted }]}>Region:</Text>
            <Text style={[styles.summaryValue, { color: theme.textMain }]}>{region}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Ionicons name="flag" size={18} color={theme.primary} />
            <Text style={[styles.summaryLabel, { color: theme.textMuted }]}>Goal:</Text>
            <Text style={[styles.summaryValue, { color: theme.textMain }]}>{goal}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Ionicons name="fitness" size={18} color={theme.primary} />
            <Text style={[styles.summaryLabel, { color: theme.textMuted }]}>Level:</Text>
            <Text style={[styles.summaryValue, { color: theme.textMain }]}>{FITNESS_LEVELS.find(l => l.id === fitnessLevel)?.title || fitnessLevel}</Text>
          </View>
        </View>

        <Text style={[styles.motivationText, { color: theme.textMain }]}>
          Every rep counts. Your journey starts now.
        </Text>
      </View>
    );
  }

  const canContinue = currentStepData.canContinue();

  async function goBack() {
    if (step > 0) {
      setStep(step - 1);
    } else {
      await signOut();
    }
  }

  async function next() {
    if (step < steps.length - 1) {
      setStep(step + 1);
    } else {
      // Complete onboarding
      setLoading(true);
      try {
        const profileData = {
          name: displayName.trim() || user?.username || 'Athlete',
          region,
          goal,
          fitnessLevel,
          workoutFrequency,
          preferredDays,
          notificationsEnabled,
        };

        await onboardingComplete(profileData);
        await updateUserProfile(profileData);
        await setOnboardingComplete();
      } catch (error) {
        console.error('Error completing onboarding:', error);
      } finally {
        setLoading(false);
      }
    }
  }

  return (
    <View style={[styles.page, { backgroundColor: theme.bgDeep }]}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 20 }]} keyboardShouldPersistTaps="handled">
          {/* Header */}
          <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
            <TouchableOpacity onPress={goBack} style={styles.backButton} activeOpacity={0.7}>
              <Ionicons name="arrow-back" size={24} color={theme.textMain} />
            </TouchableOpacity>

            {/* Progress Bar */}
            <View style={[styles.progressTrack, { backgroundColor: theme.bgPanel }]}>
              <Animated.View style={[styles.progressFill, { width: `${progress}%`, backgroundColor: theme.primary }]} />
            </View>
            <Text style={[styles.stepCounter, { color: theme.textMuted }]}>
              Step {step + 1} of {steps.length}
            </Text>
          </View>

          {/* Content */}
          <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
            <Text style={[styles.heroTitle, { color: theme.textMain }]}>
              {currentStepData.title}
            </Text>
            <Text style={[styles.heroSub, { color: theme.textMuted }]}>
              {currentStepData.subtitle}
            </Text>

            {currentStepData.render()}
          </Animated.View>
        </ScrollView>

        {/* Footer Button */}
        <View style={[styles.footer, { paddingBottom: insets.bottom + 16, borderTopColor: theme.border }]}>
          <TouchableOpacity
            onPress={next}
            disabled={!canContinue || loading}
            activeOpacity={0.85}
            style={[
              styles.nextButton,
              { backgroundColor: theme.primary },
              (!canContinue || loading) && styles.nextButtonDisabled,
            ]}
          >
            {loading ? (
              <Text style={[styles.nextButtonText, { color: isDark ? theme.bgDeep : '#fff' }]}>Setting up...</Text>
            ) : (
              <>
                <Text style={[styles.nextButtonText, { color: isDark ? theme.bgDeep : '#fff' }]}>
                  {step === steps.length - 1 ? 'Enter The Arena' : 'Continue'}
                </Text>
                {step < steps.length - 1 && (
                  <Ionicons name="chevron-forward" size={20} color={isDark ? theme.bgDeep : '#fff'} />
                )}
              </>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1 },
  scroll: { flexGrow: 1, paddingHorizontal: 20, paddingTop: 20 },
  header: { paddingBottom: 20 },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  progressTrack: { height: 4, borderRadius: 2, overflow: 'hidden', marginBottom: 12 },
  progressFill: { height: '100%' },
  stepCounter: { fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 1 },
  heroTitle: { fontSize: 26, fontWeight: '800', marginBottom: 8 },
  heroSub: { fontSize: 14, marginBottom: 24 },
  footer: { paddingHorizontal: 20, paddingTop: 16, borderTopWidth: 1 },
  nextButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 14,
  },
  nextButtonDisabled: { opacity: 0.5 },
  nextButtonText: { fontSize: 16, fontWeight: '700' },

  // Welcome step
  welcomeContainer: { alignItems: 'center' },
  logo: { width: 80, height: 80, marginBottom: 20 },
  welcomeTitle: { fontSize: 24, fontWeight: '800', marginBottom: 12, textAlign: 'center' },
  welcomeText: { fontSize: 15, textAlign: 'center', lineHeight: 22, marginBottom: 24, paddingHorizontal: 20 },
  featureCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    marginBottom: 12,
    width: '100%',
  },
  featureContent: { flex: 1 },
  featureTitle: { fontSize: 15, fontWeight: '700', marginBottom: 4 },
  featureDescription: { fontSize: 13, lineHeight: 18 },

  // Name step
  stepContainer: { minHeight: 200 },
  inputCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    marginBottom: 12,
  },
  inputIcon: { marginRight: 12 },
  input: { flex: 1, fontSize: 16, fontWeight: '600' },
  hintText: { fontSize: 13, textAlign: 'center' },
  previewCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    marginTop: 20,
  },
  previewLabel: { fontSize: 12, fontWeight: '600', textTransform: 'uppercase', marginBottom: 12 },
  previewRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  previewAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewName: { fontSize: 15, fontWeight: '700' },

  // Region step
  regionsScroll: { paddingHorizontal: 4 },
  regionCard: {
    width: 120,
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    alignItems: 'center',
    marginRight: 12,
  },
  regionName: { fontSize: 13, fontWeight: '700', marginTop: 8, textAlign: 'center' },

  // Goal step
  goalCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    marginBottom: 12,
  },
  goalIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  goalContent: { flex: 1 },
  goalTitle: { fontSize: 14, fontWeight: '800', marginBottom: 4 },
  goalDescription: { fontSize: 13 },
  goalCheck: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Fitness step
  fitnessCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    marginBottom: 12,
  },
  fitnessLeft: { flexDirection: 'row', alignItems: 'center', gap: 14, flex: 1 },
  fitnessIconContainer: {
    width: 46,
    height: 46,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fitnessTitle: { fontSize: 15, fontWeight: '700', marginBottom: 4 },
  fitnessDescription: { fontSize: 13, lineHeight: 18 },
  fitnessCheck: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Schedule step
  sectionTitle: { fontSize: 15, fontWeight: '700', marginBottom: 12 },
  frequencyContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  frequencyCard: {
    flex: 1,
    minWidth: '45%',
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    alignItems: 'center',
  },
  frequencyTitle: { fontSize: 13, fontWeight: '700', marginBottom: 4 },
  frequencySubtitle: { fontSize: 12 },
  daysContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  dayCard: {
    width: (300 - 60) / 7,
    aspectRatio: 1,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayText: { fontSize: 11, fontWeight: '700' },

  // Notifications step
  notificationCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 24,
    alignItems: 'center',
    marginBottom: 20,
  },
  notificationIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  notificationTitle: { fontSize: 18, fontWeight: '700', marginBottom: 8 },
  notificationDescription: { fontSize: 14, textAlign: 'center', lineHeight: 22, marginBottom: 20 },
  notificationToggle: {
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 12,
  },
  toggleText: { fontSize: 15, fontWeight: '700' },
  benefitsCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
  },
  benefitsTitle: { fontSize: 15, fontWeight: '700', marginBottom: 12 },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  benefitText: { fontSize: 14, flex: 1 },

  // Complete step
  completeContainer: { alignItems: 'center' },
  successIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  completeTitle: { fontSize: 24, fontWeight: '800', marginBottom: 12 },
  completeText: { fontSize: 15, textAlign: 'center', marginBottom: 24 },
  summaryCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 20,
    width: '100%',
    marginBottom: 24,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  summaryLabel: { fontSize: 13, fontWeight: '600' },
  summaryValue: { fontSize: 14, fontWeight: '700', flex: 1 },
  motivationText: { fontSize: 16, fontWeight: '700', textAlign: 'center' },
});
