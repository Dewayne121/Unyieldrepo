import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, Switch, Alert, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import * as Notifications from 'expo-notifications';
import { useTheme } from '../context/ThemeContext';
import { useNotifications } from '../hooks/useNotifications';
import api from '../services/api';
import ScreenHeader from '../components/ScreenHeader';

export default function NotificationSettingsScreen() {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const { permissionStatus, requestPermissions, registerForPushNotificationsAsync } = useNotifications();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const isMountedRef = useRef(true);
  const lastFetchRef = useRef(0);
  const FETCH_DEBOUNCE_MS = 1000; // Don't fetch more than once per second

  // Notification preferences
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [notifyRankUp, setNotifyRankUp] = useState(false);
  const [notifyRankDownWeekly, setNotifyRankDownWeekly] = useState(false);
  const [notifyStreakMilestone, setNotifyStreakMilestone] = useState(false);
  const [notifyNewChallenges, setNotifyNewChallenges] = useState(false);
  const [notifyChallengeEnding, setNotifyChallengeEnding] = useState(false);

  // Fetch notification preferences with debouncing
  const fetchPreferences = useCallback(async (force = false) => {
    const now = Date.now();
    if (!force && now - lastFetchRef.current < FETCH_DEBOUNCE_MS) {
      console.log('Fetch throttled - skipping');
      return;
    }
    lastFetchRef.current = now;

    if (!isMountedRef.current) return;

    try {
      setLoading(true);
      const response = await api.getNotificationPreferences();
      if (isMountedRef.current && response?.success && response?.data) {
        setNotificationsEnabled(response.data.notificationsEnabled || false);
        setNotifyRankUp(response.data.notifyRankUp || false);
        setNotifyRankDownWeekly(response.data.notifyRankDownWeekly || false);
        setNotifyStreakMilestone(response.data.notifyStreakMilestone || false);
        setNotifyNewChallenges(response.data.notifyNewChallenges || false);
        setNotifyChallengeEnding(response.data.notifyChallengeEnding || false);
      }
    } catch (error) {
      console.error('Error fetching notification preferences:', error);
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      isMountedRef.current = true;
      fetchPreferences(true);
      return () => {
        isMountedRef.current = false;
      };
    }, [fetchPreferences])
  );

  // Update notification preferences with debouncing
  const updatePreferences = useCallback(async (updates) => {
    if (saving) {
      console.log('Already saving, skipping update');
      return false;
    }

    try {
      setSaving(true);
      const response = await api.updateNotificationPreferences(updates);

      if (response?.success) {
        return true;
      }

      // Handle rate limiting
      if (response?.error?.includes('429') || response?.error?.toLowerCase().includes('too many')) {
        Alert.alert(
          'Slow Down',
          'You\'re changing settings too quickly. Please wait a moment and try again.',
          [{ text: 'OK' }]
        );
      }

      return false;
    } catch (error) {
      console.error('Error updating notification preferences:', error);

      // Check for rate limiting in error message
      if (error?.message?.toLowerCase().includes('429') || error?.message?.toLowerCase().includes('too many')) {
        Alert.alert(
          'Slow Down',
          'You\'re changing settings too quickly. Please wait a moment and try again.',
          [{ text: 'OK' }]
        );
      }

      return false;
    } finally {
      // Add a small delay before allowing another save
      setTimeout(() => {
        if (isMountedRef.current) {
          setSaving(false);
        }
      }, 500);
    }
  }, [saving]);

  // Handle master toggle
  const handleMasterToggle = async (value) => {
    if (value) {
      // Check current permission status
      const { status: currentStatus } = await Notifications.getPermissionsAsync();

      if (currentStatus === 'denied') {
        Alert.alert(
          'Notifications Blocked',
          'Enable notifications for UNYIELD in your device settings to receive alerts.',
          [{ text: 'OK' }]
        );
        return;
      }

      // Request permissions
      const { status: newStatus, canAskAgain } = await Notifications.requestPermissionsAsync();

      if (newStatus !== 'granted') {
        if (!canAskAgain) {
          Alert.alert(
            'Notifications Blocked',
            Platform.select({
              ios: 'Open Settings > Notifications > UNYIELDING to enable notifications.',
              android: 'Open Settings > Apps > UNYIELDING > Notifications to enable notifications.',
            }),
            [{ text: 'OK' }]
          );
        } else {
          Alert.alert(
            'Permission Required',
            'Please allow notifications to receive updates.',
            [{ text: 'OK' }]
          );
        }
        return;
      }

      // Register push token after permission granted
      try {
        await registerForPushNotificationsAsync({ requestIfNotGranted: false });
      } catch (error) {
        console.error('Failed to register push token:', error);
      }
    }

    // Update backend preferences
    const success = await updatePreferences({ notificationsEnabled: value });
    if (success) {
      setNotificationsEnabled(value);
      // When master toggle is off, turn off all individual toggles
      if (!value) {
        setNotifyRankUp(false);
        setNotifyRankDownWeekly(false);
        setNotifyStreakMilestone(false);
        setNotifyNewChallenges(false);
        setNotifyChallengeEnding(false);
      }
    } else {
      Alert.alert(
        'Error',
        'Failed to update notification settings. Please try again.',
        [{ text: 'OK' }]
      );
    }
  };

  // Handle individual toggle
  const handleToggle = async (key, value) => {
    // If master toggle is off and user tries to enable a notification, enable master first
    if (!notificationsEnabled && value) {
      // Check current permission status
      const { status: currentStatus } = await Notifications.getPermissionsAsync();

      if (currentStatus === 'denied') {
        Alert.alert(
          'Notifications Blocked',
          'Enable notifications for UNYIELD in your device settings to receive alerts.',
          [{ text: 'OK' }]
        );
        return;
      }

      // Request permissions
      const { status: newStatus, canAskAgain } = await Notifications.requestPermissionsAsync();

      if (newStatus !== 'granted') {
        if (!canAskAgain) {
          Alert.alert(
            'Notifications Blocked',
            Platform.select({
              ios: 'Open Settings > Notifications > UNYIELDING to enable notifications.',
              android: 'Open Settings > Apps > UNYIELDING > Notifications to enable notifications.',
            }),
            [{ text: 'OK' }]
          );
        } else {
          Alert.alert(
            'Permission Required',
            'Please allow notifications to receive updates.',
            [{ text: 'OK' }]
          );
        }
        return;
      }

      // Register push token after permission granted
      try {
        await registerForPushNotificationsAsync({ requestIfNotGranted: false });
      } catch (error) {
        console.error('Failed to register push token:', error);
      }

      const success = await updatePreferences({ notificationsEnabled: true, [key]: value });
      if (success) {
        setNotificationsEnabled(true);
        switch (key) {
          case 'notifyRankUp':
            setNotifyRankUp(value);
            break;
          case 'notifyRankDownWeekly':
            setNotifyRankDownWeekly(value);
            break;
          case 'notifyStreakMilestone':
            setNotifyStreakMilestone(value);
            break;
          case 'notifyNewChallenges':
            setNotifyNewChallenges(value);
            break;
          case 'notifyChallengeEnding':
            setNotifyChallengeEnding(value);
            break;
        }
      } else {
        Alert.alert(
          'Error',
          'Failed to update notification settings. Please try again.',
          [{ text: 'OK' }]
        );
      }
    } else {
      const success = await updatePreferences({ [key]: value });
      if (success) {
        switch (key) {
          case 'notifyRankUp':
            setNotifyRankUp(value);
            break;
          case 'notifyRankDownWeekly':
            setNotifyRankDownWeekly(value);
            break;
          case 'notifyStreakMilestone':
            setNotifyStreakMilestone(value);
            break;
          case 'notifyNewChallenges':
            setNotifyNewChallenges(value);
            break;
          case 'notifyChallengeEnding':
            setNotifyChallengeEnding(value);
            break;
        }
      } else {
        Alert.alert(
          'Error',
          'Failed to update notification settings. Please try again.',
          [{ text: 'OK' }]
        );
      }
    }
  };

  const styles = createStyles(theme, insets);

  if (loading) {
    return (
      <View style={[styles.page, styles.centered]}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  return (
    <View style={styles.page}>
      <ScreenHeader
        title="NOTIFICATIONS"
        subtitle="Manage your notification preferences"
      />

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Master Toggle */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionIconWrapper}>
              <Ionicons name="notifications" size={18} color={theme.primary} />
            </View>
            <Text style={styles.sectionTitle}>Enable Notifications</Text>
          </View>
          <Text style={styles.sectionDescription}>
            Turn on notifications to stay updated on your progress and new challenges.
          </Text>
          <View style={styles.toggleRow}>
            <View style={styles.toggleInfo}>
              <View style={styles.toggleTextContent}>
                <Text style={styles.toggleLabel}>Allow Notifications</Text>
                <Text style={styles.toggleSubtitle}>Enable all notifications</Text>
              </View>
            </View>
            <Switch
              value={notificationsEnabled}
              onValueChange={handleMasterToggle}
              trackColor={{ false: '#333', true: theme.primary + '40' }}
              thumbColor={notificationsEnabled ? theme.primary : '#666'}
              disabled={saving}
            />
          </View>
        </View>

        {/* Individual Toggles */}
        <View style={[styles.section, !notificationsEnabled && styles.sectionDisabled]}>
          <View style={styles.sectionHeader}>
            <View style={[styles.sectionIconWrapper, !notificationsEnabled && styles.iconDisabled]}>
              <Ionicons name="options" size={18} color={notificationsEnabled ? theme.primary : '#444'} />
            </View>
            <Text style={[styles.sectionTitle, !notificationsEnabled && styles.textDisabled]}>
              Notification Types
            </Text>
          </View>
          <Text style={[styles.sectionDescription, !notificationsEnabled && styles.textDisabled]}>
            Choose which notifications you want to receive
          </Text>

          {/* Rank Up Alerts */}
          <View style={styles.toggleRow}>
            <View style={styles.toggleInfo}>
              <View style={[styles.toggleIcon, { backgroundColor: '#22C55E15', borderColor: '#22C55E40' }]}>
                <Ionicons name="trending-up" size={16} color="#22C55E" />
              </View>
              <View style={styles.toggleTextContent}>
                <Text style={[styles.toggleLabel, !notificationsEnabled && styles.textDisabled]}>
                  Rank Up Alerts
                </Text>
                <Text style={styles.toggleSubtitle}>
                  When your rank improves
                </Text>
              </View>
            </View>
            <Switch
              value={notifyRankUp}
              onValueChange={(value) => handleToggle('notifyRankUp', value)}
              trackColor={{ false: '#333', true: '#22C55E40' }}
              thumbColor={notifyRankUp ? '#22C55E' : '#666'}
              disabled={saving || !notificationsEnabled}
            />
          </View>

          {/* Weekly Rank Digest */}
          <View style={styles.toggleRow}>
            <View style={styles.toggleInfo}>
              <View style={[styles.toggleIcon, { backgroundColor: '#3B82F615', borderColor: '#3B82F640' }]}>
                <Ionicons name="stats-chart" size={16} color="#60A5FA" />
              </View>
              <View style={styles.toggleTextContent}>
                <Text style={[styles.toggleLabel, !notificationsEnabled && styles.textDisabled]}>
                  Weekly Rank Digest
                </Text>
                <Text style={styles.toggleSubtitle}>
                  Weekly summary of rank increases and drops
                </Text>
              </View>
            </View>
            <Switch
              value={notifyRankDownWeekly}
              onValueChange={(value) => handleToggle('notifyRankDownWeekly', value)}
              trackColor={{ false: '#333', true: '#3B82F640' }}
              thumbColor={notifyRankDownWeekly ? '#3B82F6' : '#666'}
              disabled={saving || !notificationsEnabled}
            />
          </View>

          {/* Streak Milestones */}
          <View style={styles.toggleRow}>
            <View style={styles.toggleInfo}>
              <View style={[styles.toggleIcon, { backgroundColor: '#F59E0B15', borderColor: '#F59E0B40' }]}>
                <Ionicons name="flame" size={16} color="#FBBF24" />
              </View>
              <View style={styles.toggleTextContent}>
                <Text style={[styles.toggleLabel, !notificationsEnabled && styles.textDisabled]}>
                  Streak Milestones
                </Text>
                <Text style={styles.toggleSubtitle}>
                  At 7, 14, 30, 60, 100, and 365 days
                </Text>
              </View>
            </View>
            <Switch
              value={notifyStreakMilestone}
              onValueChange={(value) => handleToggle('notifyStreakMilestone', value)}
              trackColor={{ false: '#333', true: '#F59E0B40' }}
              thumbColor={notifyStreakMilestone ? '#F59E0B' : '#666'}
              disabled={saving || !notificationsEnabled}
            />
          </View>

          {/* New Challenges */}
          <View style={styles.toggleRow}>
            <View style={styles.toggleInfo}>
              <View style={[styles.toggleIcon, { backgroundColor: '#8B5CF615', borderColor: '#8B5CF640' }]}>
                <Ionicons name="trophy" size={16} color="#A78BFA" />
              </View>
              <View style={styles.toggleTextContent}>
                <Text style={[styles.toggleLabel, !notificationsEnabled && styles.textDisabled]}>
                  New Challenges
                </Text>
                <Text style={styles.toggleSubtitle}>
                  When new challenges are announced
                </Text>
              </View>
            </View>
            <Switch
              value={notifyNewChallenges}
              onValueChange={(value) => handleToggle('notifyNewChallenges', value)}
              trackColor={{ false: '#333', true: '#8B5CF640' }}
              thumbColor={notifyNewChallenges ? '#8B5CF6' : '#666'}
              disabled={saving || !notificationsEnabled}
            />
          </View>

          {/* Challenge Ending */}
          <View style={[styles.toggleRow, styles.lastToggleRow]}>
            <View style={styles.toggleInfo}>
              <View style={[styles.toggleIcon, { backgroundColor: '#EF444415', borderColor: '#EF444440' }]}>
                <Ionicons name="time" size={16} color="#F87171" />
              </View>
              <View style={styles.toggleTextContent}>
                <Text style={[styles.toggleLabel, !notificationsEnabled && styles.textDisabled]}>
                  Challenge Reminders
                </Text>
                <Text style={styles.toggleSubtitle}>
                  24 hours before challenge ends
                </Text>
              </View>
            </View>
            <Switch
              value={notifyChallengeEnding}
              onValueChange={(value) => handleToggle('notifyChallengeEnding', value)}
              trackColor={{ false: '#333', true: '#EF444440' }}
              thumbColor={notifyChallengeEnding ? '#EF4444' : '#666'}
              disabled={saving || !notificationsEnabled}
            />
          </View>
        </View>

        {/* Info Section */}
        <View style={styles.infoSection}>
          <Ionicons name="information-circle" size={14} color="#666" />
          <Text style={styles.infoText}>
            Notifications are sent via push. Make sure you've granted notification permissions in your device settings.
          </Text>
        </View>

        {saving && (
          <View style={styles.savingIndicator}>
            <ActivityIndicator size="small" color={theme.primary} />
            <Text style={styles.savingText}>Saving...</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

function createStyles(theme, insets) {
  return StyleSheet.create({
    page: {
      flex: 1,
      backgroundColor: '#050505',
    },
    centered: {
      justifyContent: 'center',
      alignItems: 'center',
    },
    content: {
      flex: 1,
    },
    contentContainer: {
      paddingBottom: insets.bottom + 20,
    },

    // Section
    section: {
      backgroundColor: '#0a0a0a',
      marginHorizontal: 16,
      marginTop: 16,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.06)',
    },
    sectionDisabled: {
      opacity: 0.5,
    },
    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingTop: 16,
      paddingBottom: 8,
    },
    sectionIconWrapper: {
      width: 28,
      height: 28,
      borderRadius: 6,
      backgroundColor: theme.primary + '15',
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 10,
    },
    iconDisabled: {
      backgroundColor: '#222',
    },
    sectionTitle: {
      fontSize: 13,
      fontWeight: '700',
      color: '#e5e5e5',
      letterSpacing: 0.5,
      textTransform: 'uppercase',
    },
    textDisabled: {
      color: '#555',
    },
    sectionDescription: {
      fontSize: 12,
      color: '#999',
      lineHeight: 18,
      paddingHorizontal: 16,
      paddingBottom: 12,
    },

    // Toggle Row
    toggleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderTopWidth: 1,
      borderTopColor: 'rgba(255,255,255,0.04)',
    },
    lastToggleRow: {
      borderBottomWidth: 0,
    },
    toggleInfo: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
      marginRight: 8,
    },
    toggleIcon: {
      width: 28,
      height: 28,
      borderRadius: 6,
      borderWidth: 1,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 10,
    },
    toggleTextContent: {
      flex: 1,
    },
    toggleLabel: {
      fontSize: 13,
      fontWeight: '600',
      color: '#d4d4d4',
      lineHeight: 18,
    },
    toggleSubtitle: {
      fontSize: 11,
      color: '#888',
      lineHeight: 16,
      marginTop: 1,
    },

    // Info Section
    infoSection: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      marginHorizontal: 16,
      marginTop: 20,
      padding: 12,
      backgroundColor: 'rgba(155, 44, 44, 0.08)',
      borderRadius: 8,
      borderWidth: 1,
      borderColor: 'rgba(155, 44, 44, 0.15)',
    },
    infoText: {
      fontSize: 11,
      color: '#999',
      marginLeft: 8,
      flex: 1,
      lineHeight: 16,
    },

    // Saving Indicator
    savingIndicator: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 20,
      paddingVertical: 8,
    },
    savingText: {
      fontSize: 12,
      color: '#888',
      marginLeft: 8,
      fontWeight: '500',
    },
  });
}
