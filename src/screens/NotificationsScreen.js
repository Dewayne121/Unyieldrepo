import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { useApp } from '../context/AppContext';
import { NotificationItem } from '../components/common';
import { Colors, Spacing, Typography, BorderRadius } from '../constants/colors';

const BR = BorderRadius;

export default function NotificationsScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const {
    notifications,
    markAllNotificationsRead,
    unreadCount,
    refreshNotifications,
    markNotificationRead,
    notificationsLoading,
  } = useApp();

  useFocusEffect(
    React.useCallback(() => {
      refreshNotifications().catch(() => {});
    }, [refreshNotifications])
  );

  const handleNotificationPress = (notification) => {
    if (!notification?.data?.screen) return;
    const { screen, ...params } = notification.data;
    navigation.navigate(screen, params);
  };

  if (notificationsLoading && (!notifications || notifications.length === 0)) {
    return (
      <View style={styles.container}>
        <View style={[styles.header, { paddingTop: insets.top + Spacing.md }]}>
          <Text style={styles.title}>Notifications</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Loading notifications...</Text>
        </View>
      </View>
    );
  }

  if (!notifications || notifications.length === 0) {
    return (
      <View style={styles.container}>
        <View style={[styles.header, { paddingTop: insets.top + Spacing.md }]}>
          <Text style={styles.title}>Notifications</Text>
        </View>
        <View style={styles.emptyContainer}>
          <View style={[styles.emptyIconBox, { backgroundColor: `${Colors.primary}10` }]}>
            <Ionicons name="notifications-off" size={42} color={Colors.textMuted} />
          </View>
          <Text style={styles.emptyTitle}>All caught up</Text>
          <Text style={styles.emptyText}>
            You have no new notifications
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + Spacing.md }]}>
        <Text style={styles.title}>Notifications</Text>
        {unreadCount && unreadCount > 0 && (
          <TouchableOpacity onPress={markAllNotificationsRead} style={styles.markAllRead}>
            <Ionicons name="checkmark-done" size={18} color={Colors.primary} />
            <Text style={styles.markAllReadText}>Mark all read</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* List */}
      <ScrollView
        style={styles.list}
        contentContainerStyle={{ paddingBottom: 80 + insets.bottom }}
        showsVerticalScrollIndicator={false}
      >
        {notifications.map((notification) => (
          <NotificationItem
            key={notification.id}
            notification={notification}
            onRead={() => markNotificationRead(notification.id)}
            onPress={handleNotificationPress}
          />
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  title: {
    ...Typography.h2,
    color: Colors.text,
    fontWeight: '700',
  },
  markAllRead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BR.md,
    backgroundColor: `${Colors.primary}15`,
  },
  markAllReadText: {
    ...Typography.bodySmall,
    color: Colors.primary,
    fontWeight: '500',
  },
  list: {
    flex: 1,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
    gap: Spacing.md,
  },
  emptyIconBox: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    ...Typography.h3,
    color: Colors.text,
    fontWeight: '600',
  },
  emptyText: {
    ...Typography.body,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
    gap: Spacing.md,
  },
  loadingText: {
    ...Typography.bodySmall,
    color: Colors.textSecondary,
  },
});
