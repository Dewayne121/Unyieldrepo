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
import { LinearGradient } from 'expo-linear-gradient';
import { useApp } from '../../context/AppContext';
import api from '../../services/api';
import { 
  Colors, 
  Typography, 
  Spacing, 
  Shadows, 
  BorderRadius, 
  SKINS,
  moderateScale 
} from '../../constants/colors';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

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
    const displayValue = formatNumber(value || 0);
    const displaySubtitle = subtitle !== undefined ? String(subtitle) : null;
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
            <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} style={{ opacity: 0.5 }} />
          )}
        </View>
        <Text style={styles.statValue}>{displayValue}</Text>
        <Text style={styles.statTitle}>{title}</Text>
        {displaySubtitle !== null && (
          <Text style={[styles.statSubtitle, { color: color }]}>{displaySubtitle}</Text>
        )}
      </TouchableOpacity>
    );
  };

  const QuickAction = ({ title, icon, color, onPress }) => (
    <TouchableOpacity 
      style={styles.quickAction} 
      onPress={onPress} 
      activeOpacity={0.7}
    >
      <View style={[styles.quickActionGradientBorder, { borderColor: `${color}40` }]}>
        <LinearGradient
          colors={[`${color}20`, `${color}05`]}
          style={styles.quickActionContent}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <Ionicons name={icon} size={24} color={color} />
        </LinearGradient>
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
            <View style={[styles.topUserImagePlaceholder, { backgroundColor: Colors.surface }]}>
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
          <LinearGradient
            colors={[color, `${color}80`]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={[styles.regionProgressFill, { width: `${percentage}%` }]}
          />
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" />
        <View style={[styles.header, { paddingTop: insets.top + Spacing.md }]}>
          <Text style={styles.pageTitle}>Admin Dashboard</Text>
        </View>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Loading dashboard...</Text>
        </View>
      </View>
    );
  }

  if (error && !stats) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" />
        <View style={[styles.header, { paddingTop: insets.top + Spacing.md }]}>
          <Text style={styles.pageTitle}>Admin Dashboard</Text>
        </View>
        <View style={styles.centerContainer}>
          <View style={styles.errorIconContainer}>
            <Ionicons name="alert-circle" size={48} color={Colors.error} />
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
      <View style={[styles.header, { paddingTop: insets.top + Spacing.md }]}>
        <View>
          <Text style={styles.pageTitle}>Admin Dashboard</Text>
          <Text style={styles.pageSubtitle}>Overview & Management</Text>
        </View>
        <TouchableOpacity onPress={onRefresh} style={styles.refreshButton}>
          <Ionicons name="refresh-outline" size={20} color={Colors.textMuted} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh} 
            tintColor={Colors.primary} 
            colors={[Colors.primary]}
            progressBackgroundColor={Colors.card}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {isCommunitySupport ? (
          <>
            {/* Community Support View */}
            <View style={styles.section}>
              <View style={styles.infoCard}>
                <Ionicons name="information-circle-outline" size={20} color={Colors.info} />
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
                <LinearGradient
                  colors={[Colors.primary, '#d02020']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.primaryActionGradient}
                >
                  <View style={styles.primaryActionContent}>
                    <Ionicons name="play-circle" size={24} color="#fff" />
                    <Text style={styles.primaryActionText}>Start Moderation Queue</Text>
                  </View>
                  {(pendingVideosCount ?? 0) > 0 && (
                    <View style={styles.pendingBadge}>
                      <Text style={styles.pendingBadgeText}>{pendingVideosCount}</Text>
                    </View>
                  )}
                </LinearGradient>
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
                  color={Colors.primary}
                  onPress={() => navigation.navigate('AdminUsers')}
                />
                <StatCard
                  title="Active Users"
                  value={stats?.users?.active || 0}
                  subtitle="7-day activity"
                  icon="pulse"
                  color={Colors.info}
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
                  color={Colors.primary}
                  onPress={() => navigation.navigate('AdminUsers')}
                />
                <QuickAction
                  title="Review"
                  icon="shield-checkmark"
                  color={Colors.success}
                  onPress={() => navigation.navigate('AdminVideoModeration')}
                />
                <QuickAction
                  title="Challenges"
                  icon="trophy"
                  color="#af52de"
                  onPress={() => navigation.navigate('AdminChallenges')}
                />
                <QuickAction
                  title="Appeals"
                  icon="refresh-circle"
                  color="#ff9500"
                  onPress={() => navigation.navigate('AdminAppeals')}
                />
                <QuickAction
                  title="Reports"
                  icon="alert-circle"
                  color="#ff3b30"
                  onPress={() => navigation.navigate('AdminReports')}
                />
                <QuickAction
                  title="Notify"
                  icon="megaphone"
                  color="#5856d6"
                  onPress={() => navigation.navigate('AdminNotifications')}
                />
                <QuickAction
                  title="Analytics"
                  icon="bar-chart"
                  color={Colors.info}
                  onPress={() => navigation.navigate('AdminAnalytics')}
                />
                <QuickAction
                  title="Logs"
                  icon="receipt"
                  color={Colors.textMuted}
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
                  color={Colors.info}
                />
                <StatCard
                  title="Approval Rate"
                  value={stats?.videos?.approved || 0}
                  subtitle="Videos"
                  icon="checkmark-done"
                  color={Colors.success}
                />
                <StatCard
                  title="Points Given"
                  value={stats?.points?.totalAwarded || 0}
                  subtitle={`Today: ${stats?.points?.today || 0}`}
                  icon="star"
                  color={Colors.gold}
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
                    const colors = [Colors.primary, Colors.info, '#ff9500', '#af52de', '#34c759', '#ff3b30'];
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
                              <LinearGradient
                                colors={[Colors.primary, `${Colors.primary}60`]}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 0, y: 1 }}
                                style={[styles.chartBarFill, { height: `${barHeight}%` }]}
                              />
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
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.lg,
    backgroundColor: Colors.background,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  pageTitle: {
    ...Typography.h2,
    color: Colors.text,
  },
  pageSubtitle: {
    ...Typography.bodySmall,
    color: Colors.textMuted,
    marginTop: 2,
  },
  refreshButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.cardLight,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
  },
  loadingText: {
    marginTop: Spacing.md,
    ...Typography.body,
    color: Colors.textMuted,
  },
  errorIconContainer: {
    marginBottom: Spacing.md,
    opacity: 0.8,
  },
  errorText: {
    marginBottom: Spacing.lg,
    ...Typography.body,
    color: Colors.error,
    textAlign: 'center',
  },
  retryButton: {
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.cardLight,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  retryButtonText: {
    ...Typography.body,
    fontWeight: '600',
    color: Colors.text,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: Spacing.xxl,
    paddingTop: Spacing.lg,
  },
  section: {
    paddingHorizontal: Spacing.xl,
    marginBottom: Spacing.xl,
  },
  sectionTitle: {
    ...Typography.h4,
    color: Colors.text,
    marginBottom: Spacing.md,
    textTransform: 'uppercase',
    letterSpacing: 1,
    opacity: 0.9,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  seeAllText: {
    ...Typography.caption,
    color: Colors.primary,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -Spacing.xs,
  },
  statCard: {
    width: (SCREEN_WIDTH - (Spacing.xl * 2) - (Spacing.sm * 2)) / 2, // Accounting for margins
    margin: Spacing.xs,
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadows.subtle,
  },
  statCardPressable: {
    borderColor: Colors.borderLight,
  },
  statHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  statIconContainer: {
    width: 32,
    height: 32,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statValue: {
    ...Typography.h2,
    fontSize: moderateScale(22), // Slightly adjust for cards
    color: Colors.text,
    marginBottom: 2,
  },
  statTitle: {
    ...Typography.caption,
    color: Colors.textMuted,
    marginBottom: 2,
  },
  statSubtitle: {
    ...Typography.monoTiny,
    fontSize: 9,
  },
  
  // Quick Actions
  quickActionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
    marginHorizontal: -Spacing.xs,
  },
  quickAction: {
    width: '25%', // 4 columns
    alignItems: 'center',
    marginBottom: Spacing.md,
    paddingHorizontal: Spacing.xs,
  },
  quickActionGradientBorder: {
    width: 56,
    height: 56,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    marginBottom: Spacing.xs,
    overflow: 'hidden',
  },
  quickActionContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickActionTitle: {
    ...Typography.caption,
    fontSize: 10,
    color: Colors.textMuted,
    textAlign: 'center',
  },
  
  // Lists & Cards
  cardListContainer: {
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  cardContainer: {
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.xl,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  
  // Top User Item
  topUserItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  rankBadge: {
    width: 24,
    marginRight: Spacing.sm,
    alignItems: 'center',
  },
  rankText: {
    ...Typography.mono,
    color: Colors.textMuted,
  },
  topRankText: {
    color: Colors.gold,
    fontWeight: '800',
  },
  topUserAvatar: {
    marginRight: Spacing.sm,
  },
  topUserImage: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  topUserImagePlaceholder: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topUserInitial: {
    ...Typography.h4,
    color: Colors.text,
  },
  topUserInfo: {
    flex: 1,
    marginRight: Spacing.sm,
  },
  topUserName: {
    ...Typography.bodySmall,
    fontWeight: '600',
    color: Colors.text,
  },
  topUserHandle: {
    fontSize: 11,
    color: Colors.textMuted,
  },
  topUserPointsContainer: {
    alignItems: 'flex-end',
  },
  topUserPoints: {
    ...Typography.mono,
    color: Colors.primary,
  },
  topUserPointsLabel: {
    fontSize: 9,
    color: Colors.textMuted,
    textTransform: 'uppercase',
  },
  
  // Region Stats
  regionStatItem: {
    marginBottom: Spacing.md,
  },
  regionStatHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  regionStatName: {
    ...Typography.bodySmall,
    color: Colors.text,
    fontWeight: '600',
  },
  regionStatCount: {
    ...Typography.mono,
    color: Colors.textMuted,
  },
  regionProgressBarBg: {
    height: 6,
    backgroundColor: Colors.surface,
    borderRadius: 3,
    overflow: 'hidden',
  },
  regionProgressFill: {
    height: '100%',
    borderRadius: 3,
  },
  
  // Charts
  chartCard: {
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.xl,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    minHeight: 200,
  },
  chartContent: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: 160,
    paddingRight: Spacing.lg,
  },
  chartBarGroup: {
    width: 32,
    alignItems: 'center',
    marginRight: Spacing.md,
    height: '100%',
    justifyContent: 'flex-end',
  },
  chartBarTrack: {
    width: 8,
    height: '80%',
    backgroundColor: Colors.surface,
    borderRadius: 4,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  chartBarFill: {
    width: '100%',
    borderRadius: 4,
  },
  chartBarLabel: {
    marginTop: Spacing.xs,
    fontSize: 9,
    color: Colors.textMuted,
    textTransform: 'uppercase',
    textAlign: 'center',
  },
  chartBarValue: {
    position: 'absolute',
    top: -20, // Should be calculated better in a real chart lib, but works for simple bars
    fontSize: 9,
    color: Colors.text,
    fontWeight: '600',
  },
  
  // Info Card
  infoCard: {
    backgroundColor: `${Colors.info}15`,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderColor: `${Colors.info}30`,
  },
  infoCardText: {
    flex: 1,
    marginLeft: Spacing.sm,
    ...Typography.bodySmall,
    color: Colors.text,
  },
  
  // Primary Action Button (Community Support)
  primaryActionButton: {
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
    ...Shadows.medium,
  },
  primaryActionGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.xl,
  },
  primaryActionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  primaryActionText: {
    ...Typography.h4,
    color: '#fff',
  },
  pendingBadge: {
    backgroundColor: 'rgba(255,255,255,0.25)',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
  },
  pendingBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#fff',
  },
  
  bottomSpacer: {
    height: Spacing.xxl,
  },
  
  // Layout helpers
  twoColumnSection: {
    marginBottom: Spacing.xl,
    paddingHorizontal: Spacing.xl,
  },
  columnContainer: {
    width: '100%',
  },
});