import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { StreamlinedOnboardingProvider } from '../context/StreamlinedOnboardingContext';
import { SKINS } from '../constants/colors';
import { Spacing, BorderRadius, Shadows } from '../constants/colors';
import { NavigationService } from './NavigationService';

// Screens
import SplashScreen from '../screens/SplashScreen';
import WelcomeScreen from '../screens/WelcomeScreen';
import { StreamlinedOnboardingNavigator } from '../screens/onboarding/streamlined';
import DashboardScreen from '../screens/DashboardScreen';
import LeaderboardScreen from '../screens/LeaderboardScreen';
import ProfileScreen from '../screens/ProfileScreen';
import TrainingNavigator from './TrainingNavigator';
import TournamentScreen from '../screens/TournamentScreen';
import CompeteScreen from '../screens/CompeteScreen';
import ChallengeDetailScreen from '../screens/ChallengeDetailScreen';
import ChallengeSubmissionScreen from '../screens/ChallengeSubmissionScreen';
import WorkoutSubmitScreen from '../screens/WorkoutSubmitScreen';
import WorkoutSummaryScreen from '../screens/WorkoutSummaryScreen';
import TrainingReportScreen from '../screens/TrainingReportScreen';
import NotificationSettingsScreen from '../screens/NotificationSettingsScreen';
import NotificationsScreen from '../screens/NotificationsScreen';

// Admin Screens
import AdminDashboardScreen from '../screens/admin/AdminDashboardScreen';
import UserManagementScreen from '../screens/admin/UserManagementScreen';
import UserDetailScreen from '../screens/admin/UserDetailScreen';
import VideoModerationScreen from '../screens/admin/VideoModerationScreen';
import AppealsManagementScreen from '../screens/admin/AppealsManagementScreen';
import ReportsManagementScreen from '../screens/admin/ReportsManagementScreen';
import AnalyticsScreen from '../screens/admin/AnalyticsScreen';
import ChallengeManagementScreen from '../screens/admin/ChallengeManagementScreen';
import ChallengeBuilderScreen from '../screens/admin/ChallengeBuilderScreen';
import AdminSendNotificationScreen from '../screens/admin/AdminSendNotificationScreen';

// Debug
import DebugNotificationScreen from '../screens/DebugNotificationScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();
const BR = BorderRadius;

function Placeholder() {
  return <View style={{ flex: 1 }} />;
}

function TabBar({ state, descriptors, navigation }) {
  const insets = useSafeAreaInsets();
  const { theme, skin } = useTheme();
  const isDark = skin === SKINS.operator || skin === SKINS.midnight;

  // Tab configuration with icons and labels
  const tabs = {
    'Base': { icon: 'home-outline', label: 'Home' },
    'Training': { icon: 'barbell-outline', label: 'Workout' },
    'Compete': { icon: 'trophy', label: 'Compete' },
    'Leagues': { icon: 'ribbon-outline', label: 'Ranks' },
    'Stats': { icon: 'person-outline', label: 'Profile' },
  };

  return (
    <View
      style={[
        styles.tabWrap,
        {
          paddingBottom: Math.max(insets.bottom, 12),
          backgroundColor: '#0a0a0a',
          borderTopColor: 'rgba(255,255,255,0.05)',
        },
      ]}
    >
      <View style={styles.tabInner}>
        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key];
          const isFocused = state.index === index;
          const tabConfig = tabs[route.name] || { icon: 'ellipse-outline', label: route.name };

          // Special center button for Compete
          if (route.name === 'Compete') {
            return (
              <TouchableOpacity
                key={route.key}
                accessibilityRole="button"
                accessibilityLabel="Compete"
                onPress={() => navigation.navigate('Compete')}
                activeOpacity={0.85}
                style={styles.centerSlot}
              >
                <View style={[styles.centerButton, isFocused && { transform: [{ scale: 1.05 }] }]}>
                  <View style={[styles.centerButtonInner, { backgroundColor: isFocused ? '#b91c1c' : '#9b2c2c' }]}>
                    <Ionicons name="trophy" size={24} color="#fff" />
                  </View>
                </View>
                <Text style={[styles.tabLabelCenter, isFocused && { color: '#b91c1c' }]}>COMPETE</Text>
              </TouchableOpacity>
            );
          }

          const onPress = () => {
            const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
            if (!isFocused && !event.defaultPrevented) navigation.navigate(route.name);
          };

          return (
            <TouchableOpacity
              key={route.key}
              accessibilityRole="button"
              accessibilityState={isFocused ? { selected: true } : {}}
              onPress={onPress}
              activeOpacity={0.7}
              style={styles.tabItem}
            >
              <View style={[styles.tabIconContainer, isFocused && styles.tabIconContainerFocused]}>
                <Ionicons
                  name={tabConfig.icon}
                  size={22}
                  color={isFocused ? '#9b2c2c' : '#666'}
                />
              </View>
              <Text style={[styles.tabLabel, isFocused && styles.tabLabelFocused]}>
                {tabConfig.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

function Tabs() {
  const { theme } = useTheme();

  return (
    <View style={{ flex: 1, backgroundColor: theme.bgDeep }}>
      <Tab.Navigator
        screenOptions={{
          headerShown: false,
        }}
        tabBar={(props) => <TabBar {...props} />}
      >
        <Tab.Screen name="Base" component={DashboardScreen} options={{ tabBarLabel: 'Base' }} />
        <Tab.Screen name="Training" component={TrainingNavigator} options={{ tabBarLabel: 'Training' }} />
        <Tab.Screen name="Compete" component={CompeteScreen} options={{ tabBarLabel: 'Compete' }} />
        <Tab.Screen name="Leagues" component={LeaderboardScreen} options={{ tabBarLabel: 'Leagues' }} />
        <Tab.Screen name="Stats" component={ProfileScreen} options={{ tabBarLabel: 'Stats' }} />
      </Tab.Navigator>
    </View>
  );
}

function RootNavigator() {
  const { isReady, user } = useApp();
  const { loading: authLoading, isAuthenticated, onboardingCompleted } = useAuth();

  // Show splash screen while loading
  if (!isReady || authLoading) {
    return <SplashScreen />;
  }

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      {/* Auth Flow - Show Welcome if not authenticated */}
      {!isAuthenticated ? (
        <Stack.Screen name="Welcome" component={WelcomeScreen} />
      ) : !onboardingCompleted ? (
        // Onboarding for users who haven't completed it yet
        <Stack.Screen name="Onboarding" component={StreamlinedOnboardingNavigator} />
      ) : (
        // Main app for authenticated users with completed onboarding
        <Stack.Screen name="Main" component={Tabs} />
      )}

      {/* Log flow as immersive modal */}
      <Stack.Screen
        name="LogModal"
        component={WorkoutSubmitScreen}
        options={{ presentation: 'fullScreenModal' }}
      />
      <Stack.Screen
        name="WorkoutSummary"
        component={WorkoutSummaryScreen}
        options={{ presentation: 'fullScreenModal' }}
      />
      {/* Calendar Log - Full screen modal */}
      <Stack.Screen
        name="CalendarLog"
        component={TrainingReportScreen}
        options={{ presentation: 'fullScreenModal' }}
      />
      {/* Profile screen for viewing own or other users' profiles */}
      <Stack.Screen
        name="Profile"
        component={ProfileScreen}
      />
      {/* Notification Settings */}
      <Stack.Screen
        name="NotificationSettings"
        component={NotificationSettingsScreen}
        options={{ presentation: 'card' }}
      />
      <Stack.Screen
        name="Notifications"
        component={NotificationsScreen}
        options={{ presentation: 'card' }}
      />

      {/* Challenge Routes */}
      <Stack.Screen
        name="ChallengeDetail"
        component={ChallengeDetailScreen}
        options={{ presentation: 'card' }}
      />
      <Stack.Screen
        name="ChallengeSubmission"
        component={ChallengeSubmissionScreen}
        options={{ presentation: 'fullScreenModal' }}
      />

      {/* Admin Routes */}
      <Stack.Screen
        name="AdminDashboard"
        component={AdminDashboardScreen}
        options={{ presentation: 'card' }}
      />
      <Stack.Screen
        name="AdminUsers"
        component={UserManagementScreen}
        options={{ presentation: 'card' }}
      />
      <Stack.Screen
        name="AdminUserDetail"
        component={UserDetailScreen}
        options={{ presentation: 'card' }}
      />
      <Stack.Screen
        name="AdminVideoModeration"
        component={VideoModerationScreen}
        options={{ presentation: 'card' }}
      />
      <Stack.Screen
        name="AdminAppeals"
        component={AppealsManagementScreen}
        options={{ presentation: 'card' }}
      />
      <Stack.Screen
        name="AdminReports"
        component={ReportsManagementScreen}
        options={{ presentation: 'card' }}
      />
      <Stack.Screen
        name="AdminAnalytics"
        component={AnalyticsScreen}
        options={{ presentation: 'card' }}
      />
      <Stack.Screen
        name="AdminChallenges"
        component={ChallengeManagementScreen}
        options={{ presentation: 'card' }}
      />
      <Stack.Screen
        name="AdminNotifications"
        component={AdminSendNotificationScreen}
        options={{ presentation: 'card' }}
      />
      <Stack.Screen
        name="AdminSendNotification"
        component={AdminSendNotificationScreen}
        options={{ presentation: 'card' }}
      />
      <Stack.Screen
        name="AdminChallengeBuilder"
        component={ChallengeBuilderScreen}
        options={{ presentation: 'card' }}
      />
      <Stack.Screen
        name="DebugNotifications"
        component={DebugNotificationScreen}
        options={{ presentation: 'card' }}
      />
    </Stack.Navigator>
  );
}

export default function AppNavigator() {
  const { theme } = useTheme();

  const navTheme = {
    ...DefaultTheme,
    colors: { ...DefaultTheme.colors, background: theme.bgDeep },
  };

  return (
    <StreamlinedOnboardingProvider>
      <NavigationContainer
        ref={(navigator) => {
          if (navigator) {
            NavigationService.setTopLevelNavigator(navigator);
          }
        }}
        theme={navTheme}
      >
        <RootNavigator />
      </NavigationContainer>
    </StreamlinedOnboardingProvider>
  );
}

const styles = StyleSheet.create({
  tabWrap: {
    paddingTop: 8,
    borderTopWidth: 1,
  },
  tabInner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 6,
    gap: 4,
  },
  tabIconContainer: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 22,
    backgroundColor: 'transparent',
  },
  tabIconContainerFocused: {
    backgroundColor: 'rgba(155, 44, 44, 0.15)',
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#666',
    letterSpacing: 0.3,
  },
  tabLabelFocused: {
    color: '#9b2c2c',
    fontWeight: '700',
  },
  centerSlot: {
    width: '20%',
    alignItems: 'center',
    marginTop: -20,
  },
  centerButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#9b2c2c',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  centerButtonInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#9b2c2c',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#b91c1c',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 16,
    elevation: 12,
  },
  tabLabelCenter: {
    fontSize: 11,
    fontWeight: '700',
    color: '#9b2c2c',
    marginTop: 4,
    letterSpacing: 0.5,
  },
});
