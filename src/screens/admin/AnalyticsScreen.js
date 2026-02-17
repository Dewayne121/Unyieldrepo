import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import api from '../../services/api';
import {
  ADMIN_COLORS,
  ADMIN_SPACING,
  ADMIN_RADIUS,
  ADMIN_TYPOGRAPHY,
  ADMIN_SHADOWS,
  ADMIN_SURFACES,
} from '../../constants/adminTheme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const C = ADMIN_COLORS;
const S = ADMIN_SPACING;
const R = ADMIN_RADIUS;
const T = ADMIN_TYPOGRAPHY;

export default function AnalyticsScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);

  const loadStats = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/admin/stats');
      if (response?.success) {
        setStats(response.data);
      }
    } catch (err) {
      console.error('Error loading analytics:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStats();
  }, []);

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
          <Text style={styles.pageTitle}>Analytics</Text>
        </View>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={C.accent} />
        </View>
      </View>
    );
  }

  const StatCard = ({ title, value, subtitle, icon, color }) => (
    <View style={styles.statCard}>
      <View style={[styles.statIconContainer, { backgroundColor: color + '20' }]}>
        <Ionicons name={icon} size={24} color={color} />
      </View>
      <Text style={styles.statValue}>{value?.toLocaleString() || 0}</Text>
      <Text style={styles.statTitle}>{title}</Text>
      {subtitle !== undefined && <Text style={styles.statSubtitle}>{subtitle}</Text>}
    </View>
  );

  const ChartBar = ({ label, value, maxValue, color }) => {
    const percentage = maxValue > 0 ? (value / maxValue) * 100 : 0;
    return (
      <View style={styles.chartBarContainer}>
        <View style={styles.chartBarLabelContainer}>
          <Text style={styles.chartBarLabel}>{label}</Text>
        </View>
        <View style={styles.chartBarTrack}>
          <View style={[styles.chartBarFill, { width: percentage + '%', backgroundColor: color }]} />
        </View>
        <Text style={styles.chartBarValue}>{value?.toLocaleString()}</Text>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <Text style={styles.pageTitle}>Platform Analytics</Text>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        {/* User Metrics */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>User Metrics</Text>
          <View style={styles.statsGrid}>
            <StatCard title="Total Users" value={stats?.users?.total} subtitle={`+${stats?.users?.newToday} today`} icon="people" color={C.accent} />
            <StatCard title="Active Users" value={stats?.users?.active} subtitle="Last 7 days" icon="person" color={C.success} />
            <StatCard title="New This Week" value={stats?.users?.newWeek} subtitle="Registrations" icon="person-add" color={C.warning} />
            <StatCard title="New This Month" value={stats?.users?.newMonth} subtitle="Registrations" icon="calendar" color={C.info} />
          </View>
        </View>

        {/* Workout Metrics */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Workout Metrics</Text>
          <View style={styles.statsGrid}>
            <StatCard title="Total Workouts" value={stats?.workouts?.total} subtitle={`+${stats?.workouts?.today} today`} icon="fitness" color={C.success} />
            <StatCard title="This Week" value={stats?.workouts?.week} subtitle="Workouts logged" icon="barbell" color={C.warning} />
            <StatCard title="This Month" value={stats?.workouts?.month} subtitle="Workouts logged" icon="calendar" color={C.info} />
          </View>
        </View>

        {/* Video Metrics */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Video Verification</Text>
          <View style={styles.statsGrid}>
            <StatCard title="Total Videos" value={stats?.videos?.total} subtitle="All time" icon="videocam" color={C.info} />
            <StatCard title="Pending" value={stats?.videos?.pending} subtitle="Awaiting review" icon="time" color={C.warning} />
            <StatCard title="Approved" value={stats?.videos?.approved} subtitle={`${((stats?.videos?.approved || 0) / Math.max(stats?.videos?.total || 1, 1) * 100).toFixed(0)}% rate`} icon="checkmark-circle" color={C.success} />
            <StatCard title="Rejected" value={stats?.videos?.rejected} subtitle={`${((stats?.videos?.rejected || 0) / Math.max(stats?.videos?.total || 1, 1) * 100).toFixed(0)}% rate`} icon="close-circle" color={C.danger} />
          </View>
        </View>

        {/* Moderation Queue */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Moderation Queue</Text>
          <View style={styles.statsGrid}>
            <StatCard title="Pending Reports" value={stats?.moderation?.pendingReports} subtitle="Need review" icon="flag" color={C.danger} />
            <StatCard title="Pending Appeals" value={stats?.moderation?.pendingAppeals} subtitle="Need review" icon="refresh" color={C.warning} />
          </View>
        </View>

        {/* Points System */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Points System</Text>
          <View style={styles.statsGrid}>
            <StatCard title="Total Awarded" value={stats?.points?.totalAwarded} subtitle="All time" icon="trophy" color={C.warning} />
            <StatCard title="Today" value={stats?.points?.today} subtitle="Points awarded" icon="star" color={C.info} />
          </View>
        </View>

        {/* User Growth Chart */}
        {stats?.userGrowth && stats.userGrowth.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>User Growth (12 Months)</Text>
            <View style={styles.chartContainer}>
              {stats.userGrowth.map((item, index) => {
                const maxValue = Math.max(...stats.userGrowth.map(u => u.count));
                return (
                  <View key={index} style={styles.growthBarContainer}>
                    <View style={styles.growthBarWrapper}>
                      <View style={[styles.growthBar, { height: maxValue > 0 ? (item.count / maxValue) * 150 : 0 }]} />
                    </View>
                    <Text style={styles.growthBarLabel}>{item.month}</Text>
                    <Text style={styles.growthBarValue}>{item.count}</Text>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* Workout Activity Chart */}
        {stats?.workoutActivity && stats.workoutActivity.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Workout Activity (12 Months)</Text>
            <View style={styles.chartContainer}>
              {stats.workoutActivity.map((item, index) => {
                const maxValue = Math.max(...stats.workoutActivity.map(w => w.count));
                return (
                  <View key={index} style={styles.growthBarContainer}>
                    <View style={styles.growthBarWrapper}>
                      <View style={[styles.growthBar, styles.workoutBar, { height: maxValue > 0 ? (item.count / maxValue) * 150 : 0 }]} />
                    </View>
                    <Text style={styles.growthBarLabel}>{item.month}</Text>
                    <Text style={styles.growthBarValue}>{item.count}</Text>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* Region Distribution */}
        {stats?.regionDistribution && stats.regionDistribution.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Region Distribution</Text>
            <View style={styles.barChartContainer}>
              {stats.regionDistribution.map((item, index) => {
                const maxValue = Math.max(...stats.regionDistribution.map(r => r.count));
                const colors = [C.accent, C.success, C.warning, C.info, '#4C8DFF', C.danger];
                return (
                  <ChartBar
                    key={index}
                    label={item._id}
                    value={item.count}
                    maxValue={maxValue}
                    color={colors[index % colors.length]}
                  />
                );
              })}
            </View>
          </View>
        )}

        {/* Top Users */}
        {stats?.topUsers && stats.topUsers.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Top Users</Text>
            <View style={styles.topUsersList}>
              {stats.topUsers.slice(0, 10).map((user, index) => (
                <View key={user.id || user._id} style={styles.topUserItem}>
                  <Text style={styles.topUserRank}>#{index + 1}</Text>
                  <Text style={styles.topUserName}>{user.name}</Text>
                  <Text style={styles.topUserPoints}>{user.totalPoints?.toLocaleString()} XP</Text>
                </View>
              ))}
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: ADMIN_SURFACES.page,
  header: { paddingHorizontal: S.xl, paddingBottom: S.md },
  pageTitle: { ...T.title },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: S.xxl, paddingTop: S.md },
  section: { paddingHorizontal: S.xl, marginBottom: S.xl },
  sectionTitle: { ...T.caption, marginBottom: S.md },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -S.xs },
  statCard: {
    width: (SCREEN_WIDTH - (S.xl * 2) - (S.sm * 2)) / 2,
    margin: S.xs,
    backgroundColor: C.card,
    borderRadius: R.lg,
    padding: S.md,
    marginBottom: S.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: C.border,
    ...ADMIN_SHADOWS.soft,
  },
  statIconContainer: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  statValue: { fontSize: 24, fontWeight: '700', color: C.text, marginBottom: 4 },
  statTitle: { fontSize: 11, fontWeight: '600', color: C.textSubtle, textAlign: 'center' },
  statSubtitle: { fontSize: 10, color: C.textSubtle, textAlign: 'center' },
  chartContainer: {
    flexDirection: 'row',
    height: 200,
    backgroundColor: C.card,
    borderRadius: R.lg,
    padding: S.md,
    alignItems: 'flex-end',
    borderWidth: 1,
    borderColor: C.border,
  },
  growthBarContainer: { flex: 1, alignItems: 'center', marginRight: 8 },
  growthBarWrapper: { height: 150, alignItems: 'center', justifyContent: 'flex-end' },
  growthBar: { width: '100%', backgroundColor: C.accent, borderRadius: 4, minWidth: 18 },
  workoutBar: { backgroundColor: C.success },
  growthBarLabel: { fontSize: 8, color: C.textSubtle, marginTop: 8, textAlign: 'center' },
  growthBarValue: { fontSize: 10, fontWeight: '600', color: C.text, marginTop: 2 },
  barChartContainer: {
    backgroundColor: C.card,
    borderRadius: R.lg,
    padding: S.md,
    borderWidth: 1,
    borderColor: C.border,
  },
  chartBarContainer: { marginBottom: 16 },
  chartBarLabelContainer: { width: 100, marginBottom: 6 },
  chartBarLabel: { fontSize: 11, fontWeight: '600', color: C.text },
  chartBarTrack: { height: 10, backgroundColor: C.surface, borderRadius: 6, overflow: 'hidden', marginBottom: 4 },
  chartBarFill: { height: '100%', borderRadius: 6 },
  chartBarValue: { fontSize: 12, fontWeight: '700', color: C.text },
  topUsersList: {
    backgroundColor: C.card,
    borderRadius: R.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: C.border,
  },
  topUserItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: S.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: C.border,
  },
  topUserRank: { fontSize: 12, fontWeight: '700', color: C.accent, width: 36 },
  topUserName: { fontSize: 12, fontWeight: '600', color: C.text, flex: 1 },
  topUserPoints: { fontSize: 12, fontWeight: '700', color: C.success },
});
