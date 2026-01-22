import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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
      <View style={styles.modalCard}>
        <View style={styles.successIcon}>
          <Text style={styles.successIconText}>✔</Text>
        </View>
        <Text style={styles.title}>LOG SUCCESS</Text>
        <Text style={styles.rewardText}>+{Number(earned || 0)} XP</Text>

        <View style={styles.analysisBox}>
          <Text style={styles.analysisLabel}>ANALYSIS</Text>
          <Text style={styles.analysisText}>{report || 'Calculating...'}</Text>
        </View>

        <TouchableOpacity onPress={() => navigation.goBack()} activeOpacity={0.9} style={styles.dismissBtn}>
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
      marginBottom: 24,
    },
    successIconText: {
      fontSize: 32,
      color: isDark ? theme.bgDeep : theme.bgPanel,
      fontWeight: '800',
    },
    title: {
      fontSize: 16,
      fontWeight: '800',
      letterSpacing: 1,
      color: theme.primary,
      fontFamily: 'monospace',
      marginBottom: 6,
      textTransform: 'uppercase',
    },
    rewardText: {
      fontSize: 24,
      fontWeight: '900',
      letterSpacing: 1,
      color: theme.textMuted,
      fontFamily: 'monospace',
      marginBottom: 32,
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
  });
}
