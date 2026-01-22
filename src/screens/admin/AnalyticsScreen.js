import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import api from '../../services/api';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

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
          <ActivityIndicator size="large" color="#ff003c" />
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
            <StatCard title="Total Users" value={stats?.users?.total} subtitle={`+${stats?.users?.newToday} today`} icon="people" color="#ff003c" />
            <StatCard title="Active Users" value={stats?.users?.active} subtitle="Last 7 days" icon="person" color="#00d4aa" />
            <StatCard title="New This Week" value={stats?.users?.newWeek} subtitle="Registrations" icon="person-add" color="#ff9500" />
            <StatCard title="New This Month" value={stats?.users?.newMonth} subtitle="Registrations" icon="calendar" color="#5856d6" />
          </View>
        </View>

        {/* Workout Metrics */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Workout Metrics</Text>
          <View style={styles.statsGrid}>
            <StatCard title="Total Workouts" value={stats?.workouts?.total} subtitle={`+${stats?.workouts?.today} today`} icon="fitness" color="#00d4aa" />
            <StatCard title="This Week" value={stats?.workouts?.week} subtitle="Workouts logged" icon="barbell" color="#ffcc00" />
            <StatCard title="This Month" value={stats?.workouts?.month} subtitle="Workouts logged" icon="calendar" color="#32ade6" />
          </View>
        </View>

        {/* Video Metrics */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Video Verification</Text>
          <View style={styles.statsGrid}>
            <StatCard title="Total Videos" value={stats?.videos?.total} subtitle="All time" icon="videocam" color="#5856d6" />
            <StatCard title="Pending" value={stats?.videos?.pending} subtitle="Awaiting review" icon="time" color="#ff9500" />
            <StatCard title="Approved" value={stats?.videos?.approved} subtitle={`${((stats?.videos?.approved || 0) / Math.max(stats?.videos?.total || 1, 1) * 100).toFixed(0)}% rate`} icon="checkmark-circle" color="#34c759" />
            <StatCard title="Rejected" value={stats?.videos?.rejected} subtitle={`${((stats?.videos?.rejected || 0) / Math.max(stats?.videos?.total || 1, 1) * 100).toFixed(0)}% rate`} icon="close-circle" color="#ff3b30" />
          </View>
        </View>

        {/* Moderation Queue */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Moderation Queue</Text>
          <View style={styles.statsGrid}>
            <StatCard title="Pending Reports" value={stats?.moderation?.pendingReports} subtitle="Need review" icon="flag" color="#ff3b30" />
            <StatCard title="Pending Appeals" value={stats?.moderation?.pendingAppeals} subtitle="Need review" icon="refresh" color="#ff9500" />
          </View>
        </View>

        {/* Points System */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Points System</Text>
          <View style={styles.statsGrid}>
            <StatCard title="Total Awarded" value={stats?.points?.totalAwarded} subtitle="All time" icon="trophy" color="#ffcc00" />
            <StatCard title="Today" value={stats?.points?.today} subtitle="Points awarded" icon="star" color="#32ade6" />
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
                const colors = ['#ff003c', '#00d4aa', '#ff9500', '#5856d6', '#32ade6', '#ff3b30'];
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
  container: { flex: 1, backgroundColor: '#050505' },
  header: { paddingHorizontal: 24, paddingBottom: 16 },
  pageTitle: { fontSize: 20, fontWeight: '700', color: '#fff', letterSpacing: 1 },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 40 },
  section: { paddingHorizontal: 20, marginBottom: 32 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#fff', marginBottom: 16, letterSpacing: 0.5 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -8 },
  statCard: { width: (SCREEN_WIDTH - 64) / 2, marginHorizontal: 8, backgroundColor: '#0f0f0f', borderRadius: 12, padding: 16, marginBottom: 16, alignItems: 'center' },
  statIconContainer: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  statValue: { fontSize: 28, fontWeight: '700', color: '#fff', marginBottom: 4 },
  statTitle: { fontSize: 12, fontWeight: '600', color: '#888', textAlign: 'center' },
  statSubtitle: { fontSize: 10, color: '#666', textAlign: 'center' },
  chartContainer: { flexDirection: 'row', height: 200, backgroundColor: '#0f0f0f', borderRadius: 12, padding: 16, alignItems: 'flex-end' },
  growthBarContainer: { flex: 1, alignItems: 'center', marginRight: 8 },
  growthBarWrapper: { height: 150, alignItems: 'center', justifyContent: 'flex-end' },
  growthBar: { width: '100%', backgroundColor: '#ff003c', borderRadius: 4, minWidth: 20 },
  workoutBar: { backgroundColor: '#00d4aa' },
  growthBarLabel: { fontSize: 8, color: '#888', marginTop: 8, textAlign: 'center' },
  growthBarValue: { fontSize: 10, fontWeight: '600', color: '#fff', marginTop: 2 },
  barChartContainer: { backgroundColor: '#0f0f0f', borderRadius: 12, padding: 16 },
  chartBarContainer: { marginBottom: 16 },
  chartBarLabelContainer: { width: 100, marginBottom: 6 },
  chartBarLabel: { fontSize: 12, fontWeight: '600', color: '#fff' },
  chartBarTrack: { height: 12, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 6, overflow: 'hidden', marginBottom: 4 },
  chartBarFill: { height: '100%', borderRadius: 6 },
  chartBarValue: { fontSize: 14, fontWeight: '700', color: '#fff' },
  topUsersList: { backgroundColor: '#0f0f0f', borderRadius: 12, overflow: 'hidden' },
  topUserItem: { flexDirection: 'row', alignItems: 'center', padding: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
  topUserRank: { fontSize: 14, fontWeight: '700', color: '#ff003c', width: 40 },
  topUserName: { fontSize: 14, fontWeight: '600', color: '#fff', flex: 1 },
  topUserPoints: { fontSize: 14, fontWeight: '700', color: '#00d4aa' },
});
