import React, { useContext } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, Typography, BorderRadius, Shadows } from '../constants/colors';
import { useTheme } from '../context/ThemeContext';

const BR = BorderRadius;

export const Button = ({
  title,
  onPress,
  variant = 'primary',
  size = 'medium',
  disabled = false,
  loading = false,
  style,
}) => {
  return (
    <TouchableOpacity
      style={[
        styles.button,
        styles[`button_${variant}`],
        styles[`button_${size}`],
        disabled && styles.buttonDisabled,
        style,
      ]}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.85}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'primary' ? Colors.background : Colors.primary} size="small" />
      ) : (
        <Text
          style={[
            styles.buttonText,
            styles[`buttonText_${variant}`],
          ]}
          numberOfLines={1}
        >
          {title}
        </Text>
      )}
    </TouchableOpacity>
  );
};

export const Card = ({ children, style, padding = 'md', variant = 'default' }) => {
  return (
    <View
      style={[
        styles.card,
        styles[`card_${padding}`],
        styles[`card_${variant}`],
        style,
      ]}
    >
      {children}
    </View>
  );
};

export const StatCard = ({ label, value, subtext, icon, change, variant = 'default' }) => {
  const getChangeColor = () => {
    if (change > 0) return Colors.success;
    if (change < 0) return Colors.error;
    return Colors.textMuted;
  };

  const getChangeIcon = () => {
    if (change > 0) return 'arrow-up';
    if (change < 0) return 'arrow-down';
    return 'remove';
  };

  return (
    <Card style={styles.statCard} variant="elevated">
      <View style={styles.statIconContainer}>
        <Ionicons name={icon} size={18} color={Colors.primary} />
      </View>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
      {subtext && <Text style={styles.statSubtext}>{subtext}</Text>}
      {change !== undefined && change !== 0 && (
        <View style={styles.statChangeRow}>
          <Ionicons name={getChangeIcon()} size={10} color={getChangeColor()} />
          <Text style={[styles.statChange, { color: getChangeColor() }]}>
            {Math.abs(change)}
          </Text>
        </View>
      )}
    </Card>
  );
};

export const Input = ({
  label,
  placeholder,
  value,
  onChangeText,
  secureTextEntry = false,
  keyboardType = 'default',
  autoCapitalize = 'none',
  style,
  error,
}) => {
  return (
    <View style={styles.inputContainer}>
      {label && <Text style={styles.inputLabel}>{label}</Text>}
      <TextInput
        style={[
          styles.input,
          error && styles.inputError,
          style,
        ]}
        placeholder={placeholder}
        placeholderTextColor={Colors.textMuted}
        value={value}
        onChangeText={onChangeText}
        secureTextEntry={secureTextEntry}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
      />
      {error && <Text style={styles.inputErrorText}>{error}</Text>}
    </View>
  );
};

export const SelectionCard = ({
  title,
  icon,
  selected,
  onPress,
  subtitle,
}) => {
  return (
    <TouchableOpacity
      style={[
        styles.selectionCard,
        selected && styles.selectionCardSelected,
      ]}
      onPress={onPress}
      activeOpacity={0.85}
    >
      {icon && (
        <View style={[styles.selectionCardIconBox, selected && styles.selectionCardIconBoxSelected]}>
          <Text style={styles.selectionCardIcon}>{icon}</Text>
        </View>
      )}
      <View style={styles.selectionCardTextContainer}>
        <Text style={[
          styles.selectionCardTitle,
          selected && styles.selectionCardTitleSelected,
        ]}>
          {title}
        </Text>
        {subtitle && (
          <Text style={styles.selectionCardSubtitle}>{subtitle}</Text>
        )}
      </View>
      <View style={[
        styles.selectionCardRadio,
        selected && styles.selectionCardRadioSelected,
      ]}>
        {selected && <View style={styles.selectionCardRadioInner} />}
      </View>
    </TouchableOpacity>
  );
};

export const LeaderboardItem = ({ rank, username, points, change, isCurrentUser = false }) => {
  const getRankColor = () => {
    if (rank === 1) return Colors.gold;
    if (rank === 2) return Colors.silver;
    if (rank === 3) return Colors.bronze;
    return Colors.textMuted;
  };

  const getRankBg = () => {
    if (rank === 1) return 'rgba(251, 191, 36, 0.1)';
    if (rank === 2) return 'rgba(212, 212, 216, 0.1)';
    if (rank === 3) return 'rgba(249, 115, 22, 0.1)';
    return Colors.surface;
  };

  const getChangeColor = () => {
    if (change > 0) return Colors.success;
    if (change < 0) return Colors.error;
    return Colors.textMuted;
  };

  return (
    <View style={[styles.leaderboardItem, isCurrentUser && styles.leaderboardItemCurrent]}>
      <View style={[styles.leaderboardRankBadge, { backgroundColor: getRankBg() }]}>
        <Text style={[styles.leaderboardRank, { color: getRankColor() }]}>#{rank}</Text>
      </View>
      <View style={styles.leaderboardInfo}>
        <Text style={[
          styles.leaderboardUsername,
          isCurrentUser && styles.leaderboardUsernameCurrent
        ]}>
          {username}
          {isCurrentUser && <Text style={styles.leaderboardYouTag}> (You)</Text>}
        </Text>
      </View>
      <View style={styles.leaderboardPointsContainer}>
        <Text style={styles.leaderboardPoints}>{points.toLocaleString()}</Text>
      </View>
    </View>
  );
};

export const NotificationItem = ({ notification, onPress, onRead }) => {
  const getIconName = () => {
    const requestedType = String(notification?.data?.requestedType || '').toLowerCase();
    const notificationType = String(notification?.type || '').toLowerCase();
    const resolvedType = requestedType || notificationType;

    switch (resolvedType) {
      case 'rank_up': return 'trophy';
      case 'rank_down': return 'trending-down';
      case 'challenge_joined': return 'checkmark-circle';
      case 'new_challenge': return 'trophy';
      case 'challenge_ending': return 'time';
      case 'challenge_complete': return 'ribbon';
      case 'challenge_result': return 'flag';
      case 'streak_milestone': return 'flame';
      case 'welcome': return 'sparkles';
      case 'announcement': return 'megaphone';
      case 'admin': return 'megaphone';
      case 'system': return 'megaphone';
      default: return 'notifications';
    }
  };

  return (
    <TouchableOpacity
      style={[
        styles.notificationItem,
        !notification.read && styles.notificationItemUnread,
      ]}
      onPress={() => {
        onRead?.(notification.id);
        onPress?.(notification);
      }}
      activeOpacity={0.85}
    >
      <View style={styles.notificationIconBox}>
        <Ionicons name={getIconName()} size={16} color={Colors.primary} />
      </View>
      <View style={styles.notificationContent}>
        <Text style={styles.notificationTitle}>{notification.title}</Text>
        <Text style={styles.notificationMessage} numberOfLines={2}>
          {notification.message}
        </Text>
      </View>
      {!notification.read && <View style={[styles.notificationDot, Shadows.glow]} />}
    </TouchableOpacity>
  );
};

export const BadgeItem = ({ badge }) => {
  return (
    <View style={[styles.badgeItem, !badge.unlocked && styles.badgeItemLocked]}>
      <View style={[styles.badgeIconBox, !badge.unlocked && styles.badgeIconBoxLocked]}>
        <Text style={[styles.badgeIcon, !badge.unlocked && styles.badgeIconLocked]}>
          {badge.unlocked ? badge.icon : '?'}
        </Text>
      </View>
      <Text style={[styles.badgeName, !badge.unlocked && styles.badgeNameLocked]}>
        {badge.name}
      </Text>
    </View>
  );
};

export const ProgressBar = ({ progress, total, color, height = 6, showLabel = true }) => {
  const percentage = Math.min((progress / total) * 100, 100);

  return (
    <View style={styles.progressBarContainer}>
      <View style={[styles.progressBarBackground, { height }]}>
        <View
          style={[
            styles.progressBarFill,
            { width: `${percentage}%`, backgroundColor: color || Colors.primary, height },
          ]}
        />
      </View>
      {showLabel && (
        <View style={styles.progressBarLabelRow}>
          <Text style={styles.progressBarText}>{progress}</Text>
          <Text style={styles.progressBarTextTotal}>/ {total}</Text>
        </View>
      )}
    </View>
  );
};

export const LoadingIndicator = ({ size = 'large', color, text, style }) => {
  const { theme } = useTheme();
  const indicatorColor = color || theme.primary;

  return (
    <View style={[styles.loadingContainer, style]}>
      <ActivityIndicator size={size} color={indicatorColor} />
      {text && <Text style={styles.loadingText}>{text}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  // Button styles
  button: {
    borderRadius: BR.xl,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  button_primary: {
    backgroundColor: Colors.primary,
    ...Shadows.medium,
  },
  button_secondary: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadows.subtle,
  },
  button_outline: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  button_small: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    minHeight: 36,
  },
  button_medium: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    minHeight: 48,
  },
  button_large: {
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.lg,
    minHeight: 54,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    ...Typography.body,
    fontWeight: '700',
  },
  buttonText_primary: {
    color: Colors.background,
  },
  buttonText_secondary: {
    color: Colors.text,
  },
  buttonText_outline: {
    color: Colors.text,
  },

  // Card styles
  card: {
    backgroundColor: Colors.card,
    borderRadius: BR.xxl,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  card_default: {},
  card_elevated: {
    ...Shadows.medium,
  },
  card_flat: {
    borderWidth: 0,
    backgroundColor: 'transparent',
  },
  card_sm: { padding: Spacing.sm },
  card_md: { padding: Spacing.md },
  card_lg: { padding: Spacing.lg },

  // Stat card styles
  statCard: {
    alignItems: 'center',
    flex: 1,
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.sm,
  },
  statIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primarySubtle,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  statLabel: {
    ...Typography.caption,
    color: Colors.textMuted,
    textTransform: 'uppercase',
  },
  statValue: {
    ...Typography.h3,
    color: Colors.text,
    marginTop: 2,
  },
  statSubtext: {
    ...Typography.bodySmall,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  statChangeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  statChange: {
    ...Typography.caption,
    fontWeight: '700',
  },

  // Input styles
  inputContainer: {
    marginBottom: Spacing.md,
  },
  inputLabel: {
    ...Typography.caption,
    color: Colors.textMuted,
    marginBottom: Spacing.xs,
    marginLeft: Spacing.xs,
    textTransform: 'uppercase',
  },
  input: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BR.xl,
    color: Colors.text,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    fontSize: 16,
    fontWeight: Platform.OS === 'ios' ? '600' : '700',
  },
  inputError: {
    borderColor: Colors.error,
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
  },
  inputErrorText: {
    ...Typography.caption,
    color: Colors.error,
    marginTop: Spacing.xs,
    marginLeft: Spacing.xs,
    fontWeight: '600',
  },

  // Selection card styles
  selectionCard: {
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BR.xxl,
    padding: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
    ...Shadows.subtle,
  },
  selectionCardSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primarySubtle,
  },
  selectionCardIconBox: {
    width: 48,
    height: 48,
    borderRadius: BR.lg,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  selectionCardIconBoxSelected: {
    backgroundColor: Colors.primarySubtle,
  },
  selectionCardIcon: {
    fontSize: 22,
  },
  selectionCardTextContainer: {
    flex: 1,
  },
  selectionCardTitle: {
    ...Typography.h4,
    color: Colors.text,
  },
  selectionCardTitleSelected: {
    color: Colors.text,
  },
  selectionCardSubtitle: {
    ...Typography.bodySmall,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  selectionCardRadio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: Colors.borderLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: Spacing.sm,
  },
  selectionCardRadioSelected: {
    borderColor: Colors.primary,
  },
  selectionCardRadioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.primary,
  },

  // Leaderboard styles
  leaderboardItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    borderRadius: BR.xl,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  leaderboardItemCurrent: {
    backgroundColor: Colors.primarySubtle,
    borderColor: 'rgba(16,185,129,0.45)',
  },
  leaderboardRankBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  leaderboardRank: {
    ...Typography.bodySmall,
    fontWeight: '700',
    color: Colors.text,
  },
  leaderboardInfo: {
    flex: 1,
  },
  leaderboardUsername: {
    ...Typography.body,
    color: Colors.text,
    fontWeight: '600',
  },
  leaderboardUsernameCurrent: {
    fontWeight: '800',
  },
  leaderboardYouTag: {
    ...Typography.bodySmall,
    color: Colors.textMuted,
    fontWeight: '400',
  },
  leaderboardPointsContainer: {
    alignItems: 'flex-end',
  },
  leaderboardPoints: {
    ...Typography.h3,
    color: Colors.text,
    fontWeight: '800',
  },

  // Notification styles
  notificationItem: {
    flexDirection: 'row',
    backgroundColor: Colors.card,
    padding: Spacing.md,
    borderRadius: BR.xl,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: Spacing.sm,
    ...Shadows.subtle,
  },
  notificationItemUnread: {
    borderColor: 'rgba(16,185,129,0.35)',
    backgroundColor: Colors.primarySubtle,
  },
  notificationIconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.primarySubtle,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  notificationContent: {
    flex: 1,
  },
  notificationTitle: {
    ...Typography.body,
    color: Colors.text,
    fontWeight: '700',
  },
  notificationMessage: {
    ...Typography.bodySmall,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  notificationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.primary,
    marginLeft: Spacing.sm,
    marginTop: 4,
  },

  // Badge styles
  badgeItem: {
    alignItems: 'center',
    backgroundColor: Colors.card,
    borderRadius: BR.lg,
    padding: Spacing.md,
    width: 86,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadows.subtle,
  },
  badgeItemLocked: {
    opacity: 0.5,
    backgroundColor: Colors.surface,
  },
  badgeIconBox: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.primarySubtle,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  badgeIconBoxLocked: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  badgeIcon: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.primary,
  },
  badgeIconLocked: {
    color: Colors.textMuted,
  },
  badgeName: {
    ...Typography.caption,
    color: Colors.text,
    textAlign: 'center',
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  badgeNameLocked: {
    color: Colors.textMuted,
  },

  // Progress bar styles
  progressBarContainer: {
    width: '100%',
  },
  progressBarBackground: {
    backgroundColor: Colors.surface,
    borderRadius: BR.sm,
    overflow: 'hidden',
  },
  progressBarFill: {
    borderRadius: BR.sm,
  },
  progressBarLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginTop: Spacing.xs,
  },
  progressBarText: {
    ...Typography.bodySmall,
    color: Colors.text,
    fontWeight: '700',
  },
  progressBarTextTotal: {
    ...Typography.bodySmall,
    color: Colors.textMuted,
  },

  // Loading indicator styles
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  loadingText: {
    ...Typography.bodySmall,
    color: Colors.textMuted,
    marginTop: Spacing.md,
  },
});
