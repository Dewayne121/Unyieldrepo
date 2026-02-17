import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator, Image } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useApp } from '../context/AppContext';
import { useWorkout } from '../context/WorkoutContext';
import { Spacing, BorderRadius, Typography, SKINS } from '../constants/colors';
import GlobalHeader from '../components/GlobalHeader';

const BR = BorderRadius;

function withinLastDays(dateISO, days) {
  const d = new Date(dateISO);
  const now = new Date();
  const diff = (now - d) / (1000 * 60 * 60 * 24);
  return diff <= days;
}

export default function DashboardScreen({ navigation }) {
  const { theme, skin } = useTheme();
  const { user, logs, weightUnit, heightUnit } = useApp();
  const { completedSessions } = useWorkout();
  const insets = useSafeAreaInsets();

  const [workoutLimit, setWorkoutLimit] = useState(3);

  // Memoized calculations
  const weekTotal = useMemo(() => {
    return (logs || [])
      .filter((l) => withinLastDays(l.date, 7))
      .reduce((sum, l) => sum + (Number(l.points) || 0), 0);
  }, [logs]);

  // Display values with unit conversion
  const displayWeight = useMemo(() => {
    if (!user?.weight) return '--';
    if (weightUnit === 'lbs') {
      return Math.round(user.weight * 2.20462);
    }
    return user.weight;
  }, [user?.weight, weightUnit]);

  const displayHeight = useMemo(() => {
    if (!user?.height) return '--';
    if (heightUnit === 'ft') {
      const totalFeet = user.height * 0.0328084;
      return totalFeet.toFixed(1); 
    }
    return user.height;
  }, [user?.height, heightUnit]);

  // Activity chart data
  const activityData = useMemo(() => {
    const days = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
    const today = new Date();
    const data = [];

    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const dateKey = d.toLocaleDateString();
      const dayLogs = (logs || []).filter(l => new Date(l.date).toLocaleDateString() === dateKey);
      const total = dayLogs.reduce((acc, curr) => acc + (curr.points || 0), 0);
      data.push({ day: days[d.getDay()], total, hasData: total > 0 });
    }
    return data;
  }, [logs]);

  // Recent sessions summary
  const recentSessionsSummary = useMemo(() => {
    return (completedSessions || [])
      .sort((a, b) => new Date(b.finishedAt) - new Date(a.finishedAt))
      .slice(0, workoutLimit)
      .map(session => {
        let volume = 0;
        let sets = 0;
        session.exercises?.forEach(ex => {
          ex.sets?.forEach(set => {
            if (set.completed && set.reps && set.weight) {
              volume += set.reps * set.weight;
              sets++;
            }
          });
        });

        const duration = session.startedAt && session.finishedAt 
          ? Math.floor((new Date(session.finishedAt) - new Date(session.startedAt)) / 60000)
          : 0;

        return {
          ...session,
          volume,
          sets,
          duration,
        };
      });
  }, [completedSessions, workoutLimit]);

  if (!user) return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.bgDeep }}>
      <ActivityIndicator size="large" color={theme.primary} />
    </View>
  );

  const styles = createStyles(theme, skin, insets);

  return (
    <View style={styles.page}>
      <GlobalHeader />

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Welcome Banner */}
        <View style={styles.welcomeBanner}>
          <View>
            <Text style={styles.welcomeDate}>{new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' }).toUpperCase()}</Text>
            <Text style={styles.welcomeTitle}>WELCOME BACK, {user.name?.split(' ')[0].toUpperCase()}</Text>
          </View>
          <View style={styles.streakBadge}>
            <Ionicons name="flame" size={14} color="#FF6B35" />
            <Text style={styles.streakText}>{user.streak || 0}</Text>
          </View>
        </View>

        {/* Quick Actions Grid (UX Rule 7: Efficiency) */}
        <View style={styles.gridContainer}>
          <TouchableOpacity
            style={[styles.gridItem, { backgroundColor: 'rgba(155, 44, 44, 0.15)', borderColor: 'rgba(155, 44, 44, 0.3)' }]}
            onPress={() => navigation.navigate('Training', { screen: 'WorkoutHome' })}
          >
            <Ionicons name="play" size={28} color={theme.primary} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.gridItem}
            onPress={() => navigation.navigate('CalendarLog')}
          >
            <Ionicons name="calendar-outline" size={28} color="#fff" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.gridItem}
            onPress={() => navigation.navigate('Compete')}
          >
            <Ionicons name="trophy-outline" size={28} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Body Stats Row */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>VITALS</Text>
          <View style={styles.bodyStatsRow}>
            <View style={styles.bodyStatItem}>
              <Text style={styles.bodyStatLabel}>WEIGHT</Text>
              <View style={styles.statValueContainer}>
                <Text style={styles.bodyStatValue}>{displayWeight}</Text>
                <Text style={styles.bodyStatUnit}>{weightUnit}</Text>
              </View>
            </View>
            <View style={styles.verticalDivider} />
            <View style={styles.bodyStatItem}>
              <Text style={styles.bodyStatLabel}>HEIGHT</Text>
              <View style={styles.statValueContainer}>
                <Text style={styles.bodyStatValue}>{displayHeight}</Text>
                <Text style={styles.bodyStatUnit}>{heightUnit || 'cm'}</Text>
              </View>
            </View>
            <View style={styles.verticalDivider} />
            <View style={styles.bodyStatItem}>
              <Text style={styles.bodyStatLabel}>WEEKLY XP</Text>
              <Text style={[styles.bodyStatValue, { color: theme.primary }]}>{weekTotal}</Text>
            </View>
          </View>
        </View>

        {/* Activity Panel */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>ACTIVITY LOG</Text>
          <View style={styles.activityPanel}>
            <View style={styles.graphStage}>
              {activityData.map((item, idx) => {
                const heightPct = Math.min(100, (item.total / 600) * 100);
                return (
                  <View key={idx} style={styles.graphCol}>
                    <View style={[styles.graphBar, { height: Math.max(4, heightPct) + '%' }, item.hasData && { backgroundColor: theme.primary }]} />
                    <Text style={[styles.graphDay, item.hasData && { color: '#fff' }]}>{item.day}</Text>
                  </View>
                );
              })}
            </View>
          </View>
        </View>

        {/* Recent Workouts Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>RECENT WORKOUTS</Text>
            {recentSessionsSummary.length > 0 && (
              <TouchableOpacity onPress={() => navigation.jumpTo('Training')}>
                <Text style={styles.seeAllText}>SEE ALL</Text>
              </TouchableOpacity>
            )}
          </View>

          {recentSessionsSummary.length > 0 ? (
            recentSessionsSummary.map((session) => (
              <TouchableOpacity
                key={session.id}
                style={styles.workoutCard}
                onPress={() => navigation.jumpTo('Training')}
                activeOpacity={0.7}
              >
                <View style={styles.workoutIcon}>
                  <Ionicons name="barbell" size={20} color="#fff" />
                </View>
                <View style={styles.workoutInfo}>
                  <Text style={styles.workoutName}>{session.name}</Text>
                  <Text style={styles.workoutDate}>{new Date(session.finishedAt).toLocaleDateString()}</Text>
                </View>
                <View style={styles.workoutStats}>
                  <Text style={styles.workoutStatValue}>{session.volume.toLocaleString()} kg</Text>
                  <Text style={styles.workoutStatLabel}>{session.duration} min</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color="#666" style={{ marginLeft: 8 }} />
              </TouchableOpacity>
            ))
          ) : (
            <View style={styles.emptyCard}>
              <Ionicons name="clipboard-outline" size={32} color="#444" style={{ marginBottom: 8 }} />
              <Text style={styles.emptyText}>NO RECENT SESSIONS</Text>
              <TouchableOpacity
                style={styles.startBtn}
                onPress={() => navigation.jumpTo('Training')}
              >
                <Text style={styles.startBtnText}>START TRAINING</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        <View style={{ height: 110 }} />
      </ScrollView>
    </View>
  );
}

function createStyles(theme, skin, insets) {
  return StyleSheet.create({
    page: { flex: 1, backgroundColor: theme.bgDeep },
    content: { flex: 1, paddingHorizontal: 20 },

    // Welcome Banner
    welcomeBanner: {
      marginTop: 20,
      marginBottom: 24,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
    },
    welcomeDate: {
      fontSize: 11,
      fontWeight: '700',
      color: '#888',
      letterSpacing: 1,
      marginBottom: 4,
    },
    welcomeTitle: {
      fontSize: 18,
      fontWeight: '800',
      color: '#fff',
      letterSpacing: 0.5,
    },
    streakBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: 'rgba(255, 107, 53, 0.1)',
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: 'rgba(255, 107, 53, 0.2)',
      gap: 4,
    },
    streakText: {
      fontSize: 12,
      fontWeight: '800',
      color: '#FF6B35',
    },

    // Grid Actions
    gridContainer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 12,
      marginBottom: 32,
    },
    gridItem: {
      width: '31%',
      backgroundColor: theme.bgCard,
      borderRadius: 16,
      padding: 16,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.05)',
      height: 80,
    },
    gridLabel: {
      fontSize: 11,
      fontWeight: '800',
      color: '#fff',
      letterSpacing: 1,
    },

    // Sections
    section: {
      marginBottom: 32,
    },
    sectionHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 12,
    },
    sectionTitle: {
      fontSize: 12,
      fontWeight: '800',
      color: '#666',
      letterSpacing: 1,
      marginBottom: 12,
    },
    seeAllText: {
      fontSize: 11,
      fontWeight: '700',
      color: theme.primary,
      letterSpacing: 0.5,
    },

    // Vitals Row
    bodyStatsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.bgCard,
      borderRadius: 16,
      padding: 20,
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.05)',
    },
    bodyStatItem: {
      flex: 1,
      alignItems: 'center',
    },
    bodyStatLabel: {
      fontSize: 10,
      fontWeight: '700',
      color: '#666',
      marginBottom: 6,
      letterSpacing: 0.5,
    },
    statValueContainer: {
      flexDirection: 'row',
      alignItems: 'baseline',
      gap: 2,
    },
    bodyStatValue: {
      fontSize: 18,
      fontWeight: '800',
      color: '#fff',
    },
    bodyStatUnit: {
      fontSize: 11,
      color: '#666',
      fontWeight: '600',
    },
    verticalDivider: {
      width: 1,
      height: 32,
      backgroundColor: 'rgba(255,255,255,0.1)',
    },

    // Activity Log
    activityPanel: {
      backgroundColor: theme.bgCard,
      borderRadius: 16,
      padding: 20,
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.05)',
      height: 140,
    },
    graphStage: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'flex-end',
      justifyContent: 'space-between',
      gap: 8,
    },
    graphCol: {
      flex: 1,
      height: '100%',
      justifyContent: 'flex-end',
      alignItems: 'center',
    },
    graphBar: {
      width: '100%',
      backgroundColor: 'rgba(255,255,255,0.05)',
      borderRadius: 4,
      minHeight: 4,
    },
    graphDay: {
      marginTop: 8,
      fontSize: 10,
      fontWeight: '700',
      color: '#666',
    },

    // Recent Workouts
    workoutCard: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.bgCard,
      borderRadius: 16,
      padding: 16,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.05)',
    },
    workoutIcon: {
      width: 40,
      height: 40,
      borderRadius: 12,
      backgroundColor: 'rgba(255,255,255,0.05)',
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 12,
    },
    workoutInfo: {
      flex: 1,
    },
    workoutName: {
      fontSize: 14,
      fontWeight: '700',
      color: '#fff',
      marginBottom: 2,
    },
    workoutDate: {
      fontSize: 11,
      color: '#666',
      fontWeight: '600',
    },
    workoutStats: {
      alignItems: 'flex-end',
    },
    workoutStatValue: {
      fontSize: 13,
      fontWeight: '700',
      color: theme.primary,
    },
    workoutStatLabel: {
      fontSize: 10,
      color: '#666',
      marginTop: 2,
    },

    // Empty State
    emptyCard: {
      backgroundColor: 'rgba(255,255,255,0.02)',
      borderRadius: 16,
      padding: 32,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.05)',
      borderStyle: 'dashed',
    },
    emptyText: {
      fontSize: 12,
      fontWeight: '700',
      color: '#666',
      letterSpacing: 1,
      marginBottom: 16,
    },
    startBtn: {
      backgroundColor: theme.primary,
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderRadius: 8,
    },
    startBtnText: {
      fontSize: 11,
      fontWeight: '800',
      color: '#fff',
      letterSpacing: 0.5,
    },
  });
}
