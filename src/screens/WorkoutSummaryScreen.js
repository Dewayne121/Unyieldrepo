import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { SKINS } from '../constants/colors';

export default function WorkoutSummaryScreen({ route, navigation }) {
  const insets = useSafeAreaInsets();
  const { theme, skin } = useTheme();
  const isDark = skin === SKINS.operator || skin === SKINS.midnight;
  const { report, earned } = route.params || {};

  const styles = createStyles(theme, isDark);

  return (
    <View style={[styles.page, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      {/* Header with back button */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      <View style={styles.modalCard}>
        <View style={styles.successIcon}>
          <Ionicons name="cloud-upload" size={36} color={isDark ? theme.bgDeep : theme.bgPanel} />
        </View>
        <Text style={styles.title}>VIDEO SUBMITTED</Text>

        <View style={styles.pendingBadge}>
          <Ionicons name="time" size={16} color="#eab308" />
          <Text style={styles.pendingText}>PENDING REVIEW</Text>
        </View>

        <Text style={styles.approvalMessage}>
          Your video is in the review queue.{'\n'}XP will be confirmed once approved.
        </Text>

        <View style={styles.xpContainer}>
          <Text style={styles.xpLabel}>POTENTIAL XP</Text>
          <Text style={styles.rewardText}>+{Number(earned || 0)}</Text>
        </View>

        <View style={styles.analysisBox}>
          <Text style={styles.analysisLabel}>ANALYSIS</Text>
          <Text style={styles.analysisText}>{report || 'Calculating...'}</Text>
        </View>

        <TouchableOpacity onPress={() => navigation.pop()} activeOpacity={0.9} style={styles.dismissBtn}>
          <Text style={styles.dismissText}>DISMISS</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function createStyles(theme, isDark) {
  return StyleSheet.create({
    page: {
      flex: 1,
      backgroundColor: theme.bgDeep,
      paddingHorizontal: 24,
    },
    modalCard: {
      width: '100%',
      backgroundColor: theme.bgPanel,
      borderRadius: 24,
      padding: 24,
      borderWidth: 1,
      borderColor: theme.border,
      alignItems: 'center',
      marginTop: 20,
    },
    successIcon: {
      width: 80,
      height: 80,
      borderRadius: 40,
      backgroundColor: theme.primary,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 20,
    },
    title: {
      fontSize: 18,
      fontWeight: '800',
      letterSpacing: 1,
      color: theme.primary,
      fontFamily: 'monospace',
      marginBottom: 12,
      textTransform: 'uppercase',
    },
    pendingBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: 'rgba(234, 179, 8, 0.15)',
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 20,
      marginBottom: 16,
    },
    pendingText: {
      fontSize: 11,
      fontWeight: '700',
      color: '#eab308',
      letterSpacing: 1,
      marginLeft: 6,
      fontFamily: 'monospace',
    },
    approvalMessage: {
      fontSize: 13,
      color: theme.textMuted,
      textAlign: 'center',
      lineHeight: 20,
      marginBottom: 20,
      fontFamily: 'monospace',
    },
    xpContainer: {
      alignItems: 'center',
      marginBottom: 24,
    },
    xpLabel: {
      fontSize: 10,
      fontWeight: '700',
      color: theme.textMuted,
      letterSpacing: 1,
      marginBottom: 4,
      fontFamily: 'monospace',
    },
    rewardText: {
      fontSize: 32,
      fontWeight: '900',
      letterSpacing: 1,
      color: theme.textMain,
      fontFamily: 'monospace',
    },
    analysisBox: {
      width: '100%',
      backgroundColor: theme.bgDeep,
      borderRadius: 12,
      padding: 20,
      marginBottom: 24,
    },
    analysisLabel: {
      fontSize: 10,
      fontWeight: '800',
      color: theme.textMuted,
      letterSpacing: 1,
      textTransform: 'uppercase',
      marginBottom: 6,
      fontFamily: 'monospace',
    },
    analysisText: {
      fontSize: 13,
      lineHeight: 20,
      color: theme.textMain,
      fontFamily: 'monospace',
    },
    dismissBtn: {
      width: '100%',
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 12,
      paddingVertical: 14,
      alignItems: 'center',
      backgroundColor: theme.bgPanel,
    },
    dismissText: {
      fontSize: 13,
      fontWeight: '800',
      letterSpacing: 1,
      textTransform: 'uppercase',
      fontFamily: 'monospace',
      color: theme.textMain,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingBottom: 16,
    },
    backBtn: {
      width: 44,
      height: 44,
      justifyContent: 'center',
      alignItems: 'center',
    },
  });
}
