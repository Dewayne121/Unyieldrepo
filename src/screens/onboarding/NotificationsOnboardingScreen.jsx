import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Notifications from 'expo-notifications';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../context/ThemeContext';
import { SKINS } from '../../constants/colors';
import { useOnboarding } from '../../context/OnboardingContext';
import * as Haptics from 'expo-haptics';

const NOTIFICATION_FEATURES = [
  {
    id: 'streak',
    icon: 'flame-outline',
    title: 'Streak Reminders',
    description: 'Don\'t break your streak! We\'ll remind you to log your workout.',
    color: '#F59E0B',
  },
  {
    id: 'leaderboard',
    icon: 'trophy-outline',
    title: 'Leaderboard Updates',
    description: 'Get notified when someone challenges your position.',
    color: '#8B5CF6',
  },
  {
    id: 'progress',
    icon: 'trending-up-outline',
    title: 'Progress Milestones',
    description: 'Celebrate when you hit new ranks or achievements.',
    color: '#10B981',
  },
  {
    id: 'community',
    icon: 'people-outline',
    title: 'Community Activity',
    description: 'Stay updated with friends and community challenges.',
    color: '#3B82F6',
  },
];

export default function NotificationsOnboardingScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { theme, skin } = useTheme();
  const isDark = skin === SKINS.operator || skin === SKINS.midnight;
  const { updateData, onboardingData, goToNextStep, goToPreviousStep } = useOnboarding();

  const [notificationsEnabled, setNotificationsEnabled] = useState(onboardingData.notificationsEnabled ?? true);
  const [permissionStatus, setPermissionStatus] = useState('undetermined');

  useEffect(() => {
    checkPermissionStatus();
  }, []);

  const checkPermissionStatus = async () => {
    const { status } = await Notifications.getPermissionsAsync();
    setPermissionStatus(status);
  };

  const handleToggle = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    if (notificationsEnabled) {
      // Disabling - no permission needed
      setNotificationsEnabled(false);
    } else {
      // Enabling - request permission
      const { status } = await Notifications.requestPermissionsAsync();
      setPermissionStatus(status);

      if (status === 'granted') {
        setNotificationsEnabled(true);
      }
    }
  };

  const handleNext = async () => {
    await updateData({ notificationsEnabled });
    goToNextStep();
  };

  const handleSkip = async () => {
    await updateData({ notificationsEnabled: false });
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
          <Text style={[styles.title, { color: theme.textMain }]}>Stay Motivated</Text>
          <Text style={[styles.subtitle, { color: theme.textMuted }]}>
            Enable notifications to stay on track
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
            <Ionicons name="notifications-outline" size={50} color={theme.primary} />
          </View>
        </View>

        {/* Main Toggle */}
        <TouchableOpacity
          onPress={handleToggle}
          activeOpacity={0.8}
          style={[styles.mainToggleCard, { backgroundColor: theme.bgCard, borderColor: theme.border }]}
        >
          <View style={styles.toggleContent}>
            <View style={[styles.toggleIconContainer, { backgroundColor: `${theme.primary}15` }]}>
              <Ionicons name="notifications" size={24} color={theme.primary} />
            </View>
            <View style={styles.toggleTextContainer}>
              <Text style={[styles.toggleTitle, { color: theme.textMain }]}>Enable Notifications</Text>
              <Text style={[styles.toggleDescription, { color: theme.textMuted }]}>
                {notificationsEnabled
                  ? 'You\'ll receive reminders and updates'
                  : 'You won\'t miss any important updates'}
              </Text>
            </View>
          </View>

          <View
            style={[
              styles.toggleSwitch,
              notificationsEnabled && { backgroundColor: theme.primary },
            ]}
          >
            <View
              style={[
                styles.toggleKnob,
                notificationsEnabled && styles.toggleKnobOn,
              ]}
            />
          </View>
        </TouchableOpacity>

        {/* Permission Status Message */}
        {Platform.OS === 'ios' && permissionStatus === 'denied' && (
          <View style={[styles.permissionWarning, { backgroundColor: `${theme.danger}10`, borderColor: theme.danger }]}>
            <Ionicons name="warning-outline" size={20} color={theme.danger} />
            <View style={styles.permissionWarningContent}>
              <Text style={[styles.permissionWarningTitle, { color: theme.danger }]}>
                Notifications are blocked
              </Text>
              <Text style={[styles.permissionWarningText, { color: theme.textMuted }]}>
                To enable notifications, go to Settings > Notifications > UNYIELD
              </Text>
            </View>
          </View>
        )}

        {/* Features List */}
        <Text style={[styles.featuresTitle, { color: theme.textMain }]}>What you'll get:</Text>

        <View style={styles.featuresContainer}>
          {NOTIFICATION_FEATURES.map((feature) => (
            <View
              key={feature.id}
              style={[styles.featureCard, { backgroundColor: theme.bgCard, borderColor: theme.border }]}
            >
              <View style={[styles.featureIconContainer, { backgroundColor: `${feature.color}15` }]}>
                <Ionicons name={feature.icon} size={22} color={feature.color} />
              </View>
              <View style={styles.featureContent}>
                <Text style={[styles.featureTitle, { color: theme.textMain }]}>{feature.title}</Text>
                <Text style={[styles.featureDescription, { color: theme.textMuted }]}>{feature.description}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Privacy Notice */}
        <View style={[styles.privacyCard, { backgroundColor: theme.bgCard, borderColor: theme.border }]}>
          <Ionicons name="shield-checkmark-outline" size={18} color={theme.primary} />
          <Text style={[styles.privacyText, { color: theme.textMuted }]}>
            We respect your privacy. You can change notification preferences anytime in Settings.
          </Text>
        </View>
      </ScrollView>

      {/* Footer */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + 16, borderTopColor: theme.border }]}>
        <TouchableOpacity
          onPress={handleSkip}
          style={styles.skipButton}
          activeOpacity={0.7}
        >
          <Text style={[styles.skipText, { color: theme.textMuted }]}>Skip for now</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handleNext}
          activeOpacity={0.85}
          style={[styles.continueButton, { backgroundColor: theme.primary }]}
        >
          <Text style={[styles.continueButtonText, { color: isDark ? theme.bgDeep : '#fff' }]}>
            {notificationsEnabled ? 'Get Notified' : 'Continue'}
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
    paddingTop: 24,
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
  mainToggleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
  },
  toggleContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    flex: 1,
  },
  toggleIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toggleTextContainer: {
    flex: 1,
  },
  toggleTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  toggleDescription: {
    fontSize: 13,
    lineHeight: 18,
  },
  toggleSwitch: {
    width: 52,
    height: 32,
    borderRadius: 16,
    padding: 3,
    backgroundColor: '#e5e5e5',
  },
  toggleSwitchOn: {
    backgroundColor: '#10B981',
  },
  toggleKnob: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
  toggleKnobOn: {
    transform: [{ translateX: 20 }],
  },
  permissionWarning: {
    flexDirection: 'row',
    gap: 12,
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    marginBottom: 16,
  },
  permissionWarningContent: {
    flex: 1,
  },
  permissionWarningTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 4,
  },
  permissionWarningText: {
    fontSize: 13,
    lineHeight: 18,
  },
  featuresTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 14,
    marginTop: 8,
  },
  featuresContainer: {
    gap: 12,
    marginBottom: 24,
  },
  featureCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
  },
  featureIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureContent: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  featureDescription: {
    fontSize: 12,
    lineHeight: 16,
  },
  privacyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
  },
  privacyText: {
    flex: 1,
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
  continueButtonText: {
    fontSize: 16,
    fontWeight: '700',
  },
});
