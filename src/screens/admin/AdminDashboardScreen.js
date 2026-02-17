import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
  RefreshControl,
  Image,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../../context/AppContext';
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

export default function AdminDashboardScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { user } = useApp();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState(null);
  const [error, setError] = useState(null);
  const [pendingVideosCount, setPendingVideosCount] = useState(null);

  // Check if user is full admin or just community support
  const isFullAdmin = user?.accolades?.includes('admin');
  const isCommunitySupport = user?.accolades?.includes('community_support') && !isFullAdmin;

  const loadStats = async () => {
    try {
      setError(null);
      const [statsResponse, videosResponse, challengesResponse] = await Promise.all([
        api.get('/api/admin/stats').catch(() => ({ success: false, data: null })),
        api.getAdminPendingVideos({ limit: 1000 }).catch(() => ({ success: false, data: null })),
        api.getPendingChallengeSubmissions({ limit: 1000 }).catch(() => ({ success: false, data: null })),
      ]);

      if (statsResponse?.success) {
        setStats(statsResponse.data);
      }

      // Calculate actual pending count from real data (same as VideoModerationScreen)
      const workoutCount = videosResponse?.data?.videos?.length || 0;
      const challengeCount = challengesResponse?.success ? (challengesResponse.data || []).length : 0;
      setPendingVideosCount(workoutCount + challengeCount);
    } catch (err) {
      console.error('Error loading admin stats:', err);
      setError(err.message || 'Failed to load stats');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadStats();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    loadStats();
  };

  const formatNumber = (num) => {
    if (typeof num !== 'number') return '0';
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'k';
    return num.toString();
  };

  // --- Components ---

  const StatCard = ({ title, value, subtitle, icon, color, onPress }) => {
    const displayValue = typeof value === 'number' ? formatNumber(value) : formatNumber(0);
    const displaySubtitle = subtitle !== undefined && subtitle !== null ? String(subtitle) : null;
    const isPressable = !!onPress;

    return (
      <TouchableOpacity
        style={[styles.statCard, isPressable && styles.statCardPressable]}
        onPress={onPress}
        activeOpacity={isPressable ? 0.7 : 1}
        disabled={!isPressable}
      >
        <View style={styles.statHeader}>
          <View style={[styles.statIconContainer, { backgroundColor: `${color}15` }]}>
            <Ionicons name={icon} size={20} color={color} />
          </View>
          {isPressable && (
            <Ionicons name="chevron-forward" size={16} color={C.textSubtle} style={{ opacity: 0.6 }} />
          )}
        </View>
        <Text style={styles.statValue}>{displayValue}</Text>
        <Text style={styles.statTitle}>{String(title)}</Text>
        {displaySubtitle !== null && (
          <Text style={[styles.statSubtitle, { color }]}>{displaySubtitle}</Text>
        )}
      </TouchableOpacity>
    );
  };

  const QuickAction = ({ title, icon, color, onPress }) => (
    <TouchableOpacity
      style={[styles.quickAction, { borderColor: `${color}55` }]}
      onPress={onPress}
      activeOpacity={0.75}
    >
      <View style={[styles.quickActionIcon, { backgroundColor: `${color}20` }]}>
        <Ionicons name={icon} size={18} color={color} />
      </View>
      <Text style={styles.quickActionTitle} numberOfLines={2}>{title}</Text>
    </TouchableOpacity>
  );

  const TopUserItem = ({ user, index }) => {
    const userName = String(user?.name || user?.username || 'Unknown');
    const userHandle = String(user?.username || 'unknown');
    const userInitial = userName.charAt(0).toUpperCase();

    return (
      <View style={styles.topUserItem}>
        <View style={styles.rankBadge}>
          <Text style={[styles.rankText, index < 3 && styles.topRankText]}>#{index + 1}</Text>
        </View>
        
        <View style={styles.topUserAvatar}>
          {user.profileImage ? (
            <Image source={{ uri: user.profileImage }} style={styles.topUserImage} />
          ) : (
            <View style={styles.topUserImagePlaceholder}>
              <Text style={styles.topUserInitial}>{userInitial}</Text>
            </View>
          )}
        </View>
        
        <View style={styles.topUserInfo}>
          <Text style={styles.topUserName} numberOfLines={1}>{userName}</Text>
          <Text style={styles.topUserHandle} numberOfLines={1}>@{userHandle}</Text>
        </View>
        
        <View style={styles.topUserPointsContainer}>
          <Text style={styles.topUserPoints}>{formatNumber(user.totalPoints || 0)}</Text>
          <Text style={styles.topUserPointsLabel}>XP</Text>
        </View>
      </View>
    );
  };

  const RegionStatItem = ({ region, count, color }) => {
    const maxCount = Math.max(...(stats?.regionDistribution || []).map(r => r.count || 0));
    const percentage = maxCount > 0 ? ((count || 0) / maxCount) * 100 : 0;

    return (
      <View style={styles.regionStatItem}>
        <View style={styles.regionStatHeader}>
          <Text style={styles.regionStatName}>{region}</Text>
          <Text style={styles.regionStatCount}>{count || 0}</Text>
        </View>
        <View style={styles.regionProgressBarBg}>
          <View style={[styles.regionProgressFill, { width: `${percentage}%`, backgroundColor: color }]} />
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" />
        <View style={[styles.header, { paddingTop: insets.top + S.lg }]}>
          <Text style={styles.pageTitle}>Admin Dashboard</Text>
        </View>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={C.accent} />
          <Text style={styles.loadingText}>Loading dashboard...</Text>
        </View>
      </View>
    );
  }

  if (error && !stats) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" />
        <View style={[styles.header, { paddingTop: insets.top + S.lg }]}>
          <Text style={styles.pageTitle}>Admin Dashboard</Text>
        </View>
        <View style={styles.centerContainer}>
          <View style={styles.errorIconContainer}>
            <Ionicons name="alert-circle" size={48} color={C.danger} />
          </View>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadStats}>
            <Text style={styles.retryButtonText}>Retry Connection</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      {/* Header */}
        <View style={[styles.header, { paddingTop: insets.top + S.lg }]}>
        <View>
          <Text style={styles.pageTitle}>Admin Dashboard</Text>
          <Text style={styles.pageSubtitle}>Overview & Management</Text>
        </View>
        <TouchableOpacity onPress={onRefresh} style={styles.refreshButton}>
          <Ionicons name="refresh-outline" size={20} color={C.textSubtle} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh} 
            tintColor={C.accent}
            colors={[C.accent]}
            progressBackgroundColor={C.card}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {isCommunitySupport ? (
          <>
            {/* Community Support View */}
            <View style={styles.section}>
              <View style={styles.infoCard}>
                <Ionicons name="information-circle-outline" size={20} color={C.info} />
                <Text style={styles.infoCardText}>
                  As Community Support, you have access to video moderation tools to help maintain platform quality.
                </Text>
              </View>

              <Text style={styles.sectionTitle}>Video Moderation</Text>
              <View style={styles.statsGrid}>
                <StatCard
                  title="Pending Videos"
                  value={pendingVideosCount ?? 0}
                  subtitle="Awaiting review"
                  icon="videocam"
                  color="#ff9500"
                  onPress={() => navigation.navigate('AdminVideoModeration')}
                />
                <StatCard
                  title="Approved Videos"
                  value={stats?.videos?.approved || 0}
                  subtitle={`${((stats?.videos?.approved || 0) / Math.max(stats?.videos?.total || 1, 1) * 100).toFixed(0)}% rate`}
                  icon="checkmark-circle"
                  color="#34c759"
                />
              </View>
            </View>

            <View style={styles.section}>
              <TouchableOpacity
                style={styles.primaryActionButton}
                onPress={() => navigation.navigate('AdminVideoModeration')}
                activeOpacity={0.8}
              >
                <View style={styles.primaryActionGradient}>
                  <View style={styles.primaryActionContent}>
                    <Ionicons name="play-circle" size={22} color={C.white} />
                    <Text style={styles.primaryActionText}>Start Moderation Queue</Text>
                  </View>
                  {(pendingVideosCount ?? 0) > 0 && (
                    <View style={styles.pendingBadge}>
                      <Text style={styles.pendingBadgeText}>{pendingVideosCount}</Text>
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            </View>
          </>
        ) : (
          <>
            {/* Full Admin View */}
            
            {/* Quick Stats Row */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Platform Overview</Text>
              <View style={styles.statsGrid}>
                <StatCard
                  title="Total Users"
                  value={stats?.users?.total || 0}
                  subtitle={`+${stats?.users?.newToday || 0} today`}
                  icon="people"
                  color={C.accent}
                  onPress={() => navigation.navigate('AdminUsers')}
                />
                <StatCard
                  title="Active Users"
                  value={stats?.users?.active || 0}
                  subtitle="7-day activity"
                  icon="pulse"
                  color={C.info}
                />
                <StatCard
                  title="Pending Videos"
                  value={pendingVideosCount ?? 0}
                  subtitle="To review"
                  icon="videocam"
                  color="#ff9500"
                  onPress={() => navigation.navigate('AdminVideoModeration')}
                />
                <StatCard
                  title="Pending Reports"
                  value={stats?.moderation?.pendingReports || 0}
                  subtitle={`${stats?.moderation?.pendingAppeals || 0} appeals`}
                  icon="flag"
                  color="#ff3b30"
                  onPress={() => navigation.navigate('AdminReports')}
                />
              </View>
            </View>

            {/* Quick Actions Grid */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Management Tools</Text>
              <View style={styles.quickActionsContainer}>
                <QuickAction
                  title="Users"
                  icon="people"
                  color={C.accent}
                  onPress={() => navigation.navigate('AdminUsers')}
                />
                <QuickAction
                  title="Review"
                  icon="shield-checkmark"
                  color={C.success}
                  onPress={() => navigation.navigate('AdminVideoModeration')}
                />
                <QuickAction
                  title="Challenges"
                  icon="trophy"
                  color={C.info}
                  onPress={() => navigation.navigate('AdminChallenges')}
                />
                <QuickAction
                  title="Appeals"
                  icon="refresh-circle"
                  color={C.warning}
                  onPress={() => navigation.navigate('AdminAppeals')}
                />
                <QuickAction
                  title="Reports"
                  icon="alert-circle"
                  color={C.danger}
                  onPress={() => navigation.navigate('AdminReports')}
                />
                <QuickAction
                  title="Notify"
                  icon="megaphone"
                  color={C.accent}
                  onPress={() => navigation.navigate('AdminNotifications')}
                />
                <QuickAction
                  title="Analytics"
                  icon="bar-chart"
                  color={C.info}
                  onPress={() => navigation.navigate('AdminAnalytics')}
                />
                <QuickAction
                  title="Logs"
                  icon="receipt"
                  color={C.textSubtle}
                  onPress={() => navigation.navigate('AdminAuditLog')}
                />
              </View>
            </View>

            {/* Activity Stats */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>System Activity</Text>
              <View style={styles.statsGrid}>
                <StatCard
                  title="Total Workouts"
                  value={stats?.workouts?.total || 0}
                  subtitle={`+${stats?.workouts?.today || 0} today`}
                  icon="fitness"
                  color={C.info}
                />
                <StatCard
                  title="Approval Rate"
                  value={stats?.videos?.approved || 0}
                  subtitle="Videos"
                  icon="checkmark-done"
                  color={C.success}
                />
                <StatCard
                  title="Points Given"
                  value={stats?.points?.totalAwarded || 0}
                  subtitle={`Today: ${stats?.points?.today || 0}`}
                  icon="star"
                  color={C.warning}
                />
                <StatCard
                  title="Active Events"
                  value={stats?.challenges?.active || 0}
                  subtitle="Challenges"
                  icon="ribbon"
                  color="#af52de"
                  onPress={() => navigation.navigate('AdminChallenges')}
                />
              </View>
            </View>

            <View style={styles.twoColumnSection}>
              {/* Top Users */}
              {stats?.topUsers && stats.topUsers.length > 0 && (
                <View style={styles.columnContainer}>
                  <View style={styles.sectionHeaderRow}>
                    <Text style={styles.sectionTitle}>Top Grinders</Text>
                    <TouchableOpacity onPress={() => navigation.navigate('AdminLeaderboard')}>
                      <Text style={styles.seeAllText}>View All</Text>
                    </TouchableOpacity>
                  </View>
                  <View style={styles.cardListContainer}>
                    {stats.topUsers.slice(0, 5).map((topUser, index) => (
                      <TopUserItem key={topUser.id || topUser._id} user={topUser} index={index} />
                    ))}
                  </View>
                </View>
              )}
            </View>
            
            {/* Region Distribution */}
            {stats?.regionDistribution && stats.regionDistribution.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>User Demographics</Text>
                <View style={styles.cardContainer}>
                  {stats.regionDistribution.map((item, index) => {
                    const colors = [C.accent, C.info, C.warning, '#7C5CFF', C.success, C.danger];
                    return (
                      <RegionStatItem
                        key={item._id}
                        region={item._id}
                        count={item.count}
                        color={colors[index % colors.length]}
                      />
                    );
                  })}
                </View>
              </View>
            )}

            {/* User Growth Chart */}
            {stats?.userGrowth && stats.userGrowth.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Growth Trajectory</Text>
                <View style={styles.chartCard}>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <View style={styles.chartContent}>
                      {stats.userGrowth.map((item, index) => {
                        const maxCount = Math.max(...stats.userGrowth.map(u => Number(u.count) || 0), 1);
                        const barHeight = maxCount > 0 ? ((Number(item.count) || 0) / maxCount) * 100 : 0;
                        return (
                          <View key={index} style={styles.chartBarGroup}>
                            <View style={styles.chartBarTrack}>
                              <View style={[styles.chartBarFill, { height: `${barHeight}%` }]} />
                            </View>
                            <Text style={styles.chartBarLabel}>{String(item.month || '').substring(0, 3)}</Text>
                            <Text style={styles.chartBarValue}>{item.count || 0}</Text>
                          </View>
                        );
                      })}
                    </View>
                  </ScrollView>
                </View>
              </View>
            )}
          </>
        )}

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: ADMIN_SURFACES.page,
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: S.xl,
    paddingBottom: S.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: C.border,
  },
  pageTitle: {
    ...T.title,
  },
  pageSubtitle: {
    ...T.subtitle,
    marginTop: 4,
  },
  refreshButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: C.card,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: C.border,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: S.xl,
  },
  loadingText: {
    marginTop: S.md,
    ...T.bodyMuted,
  },
  errorIconContainer: {
    marginBottom: S.md,
    opacity: 0.9,
  },
  errorText: {
    marginBottom: S.lg,
    ...T.body,
    color: C.danger,
    textAlign: 'center',
  },
  retryButton: {
    paddingHorizontal: S.xl,
    paddingVertical: S.sm,
    backgroundColor: C.card,
    borderRadius: R.md,
    borderWidth: 1,
    borderColor: C.border,
  },
  retryButtonText: {
    ...T.body,
    color: C.text,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: S.xxl,
    paddingTop: S.md,
  },
  section: {
    paddingHorizontal: S.xl,
    marginBottom: S.xl,
  },
  sectionTitle: {
    ...T.caption,
    color: C.textSubtle,
    marginBottom: S.md,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: S.md,
  },
  seeAllText: {
    ...T.caption,
    color: C.accent,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -S.xs,
  },
  statCard: {
    width: (SCREEN_WIDTH - (S.xl * 2) - (S.sm * 2)) / 2,
    margin: S.xs,
    backgroundColor: C.card,
    borderRadius: R.lg,
    padding: S.md,
    borderWidth: 1,
    borderColor: C.border,
    ...ADMIN_SHADOWS.soft,
  },
  statCardPressable: {
    borderColor: C.borderSoft,
  },
  statHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: S.sm,
  },
  statIconContainer: {
    width: 30,
    height: 30,
    borderRadius: R.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statValue: {
    fontSize: 22,
    fontWeight: '700',
    color: C.text,
    fontFamily: T.title.fontFamily,
    marginBottom: 2,
  },
  statTitle: {
    ...T.caption,
    color: C.textSubtle,
    marginBottom: 2,
  },
  statSubtitle: {
    ...T.mono,
  },
  quickActionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -S.xs,
  },
  quickAction: {
    width: '25%',
    alignItems: 'center',
    padding: S.xs,
    marginBottom: S.md,
    borderWidth: 1,
    borderRadius: R.lg,
    backgroundColor: C.panel,
  },
  quickActionIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  quickActionTitle: {
    ...T.caption,
    fontSize: 9,
    textAlign: 'center',
    color: C.textMuted,
  },
  cardListContainer: {
    backgroundColor: C.card,
    borderRadius: R.xl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: C.border,
  },
  cardContainer: {
    backgroundColor: C.card,
    borderRadius: R.xl,
    padding: S.md,
    borderWidth: 1,
    borderColor: C.border,
  },
  topUserItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: S.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: C.border,
  },
  rankBadge: {
    width: 26,
    marginRight: S.sm,
    alignItems: 'center',
  },
  rankText: {
    ...T.mono,
  },
  topRankText: {
    color: C.warning,
    fontWeight: '800',
  },
  topUserAvatar: {
    marginRight: S.sm,
  },
  topUserImage: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: C.border,
  },
  topUserImagePlaceholder: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: C.surface,
  },
  topUserInitial: {
    fontSize: 14,
    fontWeight: '700',
    color: C.text,
    fontFamily: T.title.fontFamily,
  },
  topUserInfo: {
    flex: 1,
    marginRight: S.sm,
  },
  topUserName: {
    fontSize: 13,
    fontWeight: '600',
    color: C.text,
  },
  topUserHandle: {
    fontSize: 10,
    color: C.textSubtle,
  },
  topUserPointsContainer: {
    alignItems: 'flex-end',
  },
  topUserPoints: {
    ...T.mono,
    color: C.accent,
  },
  topUserPointsLabel: {
    fontSize: 9,
    color: C.textSubtle,
    textTransform: 'uppercase',
  },
  regionStatItem: {
    marginBottom: S.md,
  },
  regionStatHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  regionStatName: {
    fontSize: 12,
    fontWeight: '600',
    color: C.text,
  },
  regionStatCount: {
    ...T.mono,
  },
  regionProgressBarBg: {
    height: 6,
    backgroundColor: C.surface,
    borderRadius: 3,
    overflow: 'hidden',
  },
  regionProgressFill: {
    height: '100%',
    borderRadius: 3,
  },
  chartCard: {
    backgroundColor: C.card,
    borderRadius: R.xl,
    padding: S.md,
    borderWidth: 1,
    borderColor: C.border,
    minHeight: 200,
  },
  chartContent: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: 160,
    paddingRight: S.lg,
  },
  chartBarGroup: {
    width: 32,
    alignItems: 'center',
    marginRight: S.md,
    height: '100%',
    justifyContent: 'flex-end',
  },
  chartBarTrack: {
    width: 8,
    height: '80%',
    backgroundColor: C.surface,
    borderRadius: 4,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  chartBarFill: {
    width: '100%',
    borderRadius: 4,
    backgroundColor: C.accent,
  },
  chartBarLabel: {
    marginTop: S.xs,
    fontSize: 9,
    color: C.textSubtle,
    textTransform: 'uppercase',
    textAlign: 'center',
  },
  chartBarValue: {
    position: 'absolute',
    top: -20,
    fontSize: 9,
    color: C.text,
    fontWeight: '600',
  },
  infoCard: {
    backgroundColor: C.surface,
    padding: S.md,
    borderRadius: R.lg,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: S.lg,
    borderWidth: 1,
    borderColor: C.borderSoft,
  },
  infoCardText: {
    flex: 1,
    marginLeft: S.sm,
    ...T.bodyMuted,
    color: C.text,
  },
  primaryActionButton: {
    borderRadius: R.xl,
    overflow: 'hidden',
    ...ADMIN_SHADOWS.card,
  },
  primaryActionGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: S.lg,
    paddingHorizontal: S.xl,
    backgroundColor: C.accent,
  },
  primaryActionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: S.md,
  },
  primaryActionText: {
    fontSize: 14,
    fontWeight: '700',
    color: C.white,
    letterSpacing: 0.6,
    fontFamily: T.title.fontFamily,
  },
  pendingBadge: {
    backgroundColor: 'rgba(255,255,255,0.25)',
    paddingHorizontal: S.sm,
    paddingVertical: 4,
    borderRadius: R.pill,
  },
  pendingBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: C.white,
  },
  bottomSpacer: {
    height: S.xxl,
  },
  twoColumnSection: {
    marginBottom: S.xl,
    paddingHorizontal: S.xl,
  },
  columnContainer: {
    width: '100%',
  },
});
