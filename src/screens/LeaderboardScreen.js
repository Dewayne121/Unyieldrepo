import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, RefreshControl, Image, TouchableOpacity, Dimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { useApp } from '../context/AppContext';
import { useTheme } from '../context/ThemeContext';
import { SKINS, Typography } from '../constants/colors';
import api from '../services/api';
import ScreenHeader from '../components/ScreenHeader';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Rank styling helper
const getRankStyle = (rank, theme) => {
  if (rank === 1) return { color: '#FFD700', border: '#FFD700', bg: ['rgba(255, 215, 0, 0.15)', 'rgba(255, 215, 0, 0.02)'] };
  if (rank === 2) return { color: '#C0C0C0', border: '#C0C0C0', bg: ['rgba(192, 192, 192, 0.15)', 'rgba(192, 192, 192, 0.02)'] };
  if (rank === 3) return { color: '#CD7F32', border: '#CD7F32', bg: ['rgba(205, 127, 50, 0.15)', 'rgba(205, 127, 50, 0.02)'] };
  return { color: '#666', border: 'rgba(255,255,255,0.1)', bg: ['#161616', '#161616'] };
};

// League tiers
const LEAGUES = [
  { name: 'UNYIELD', minPoints: 10000, icon: '💀', color: '#9b2c2c' },
  { name: 'ELITE', minPoints: 5000, icon: '👑', color: '#ffd700' },
  { name: 'DIAMOND', minPoints: 2500, icon: '💎', color: '#00bcd4' },
  { name: 'PLATINUM', minPoints: 1500, icon: '⚪', color: '#e0e0e0' },
  { name: 'GOLD', minPoints: 800, icon: '🏅', color: '#ffd700' },
  { name: 'SILVER', minPoints: 400, icon: '🥈', color: '#c0c0c0' },
  { name: 'BRONZE', minPoints: 100, icon: '🥉', color: '#cd7f32' },
  { name: 'IRON', minPoints: 0, icon: '🔩', color: '#7f8c8d' },
];

const getUserLeague = (points) => {
  for (const league of LEAGUES) {
    if (points >= league.minPoints) return league;
  }
  return LEAGUES[LEAGUES.length - 1];
};

const formatPoints = (p) => {
  if (p >= 10000) return (p / 1000).toFixed(1) + 'k';
  if (p >= 1000) return (p / 1000).toFixed(1) + 'k';
  return p.toString();
};

export default function LeaderboardScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { theme } = useTheme();
  const { user } = useApp();

  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [currentUserRank, setCurrentUserRank] = useState(null);
  const [selectedTab, setSelectedTab] = useState('global');
  const [userLeague, setUserLeague] = useState(null);

  const fetchLeaderboard = useCallback(async () => {
    try {
      const type = selectedTab === 'weekly' ? 'weekly' : 'total';
      const response = await api.getLeaderboard({ type, limit: 100 });
      if (response.success && response.data) {
        const leaderboardData = response.data.leaderboard.map(entry => ({
          id: entry.id,
          name: entry.username || entry.name,
          username: entry.username,
          profileImage: entry.profileImage,
          points: entry.points || entry.totalPoints || 0,
          weeklyPoints: entry.weeklyPoints || 0,
          rank: entry.rank,
          streak: entry.streak || 0,
          region: entry.region || 'Global',
          accolades: entry.accolades || [],
          isCurrentUser: user && entry.id === user.id,
        }));
        setEntries(leaderboardData);

        if (response.data.currentUser) {
          setCurrentUserRank(response.data.currentUser);
        }
      }
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user, selectedTab]);

  useEffect(() => {
    if (user) {
      setUserLeague(getUserLeague(user.totalPoints || 0));
    }
  }, [user]);

  useEffect(() => {
    fetchLeaderboard();
  }, [fetchLeaderboard]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchLeaderboard();
  }, [fetchLeaderboard]);

  const handleViewProfile = (userId) => {
    navigation.navigate('Profile', { userId });
  };

  const styles = createStyles(theme, insets);

  if (loading) {
    return (
      <View style={[styles.page, styles.centered]}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  if (!user) return <View style={{ flex: 1, backgroundColor: '#050505' }} />;

  const top3 = [entries[1], entries[0], entries[2]].filter(Boolean);
  const rest = entries.slice(3);

  return (
    <View style={styles.page}>
      <ScreenHeader
        title="LEADERBOARD"
        subtitle={selectedTab === 'global' ? 'ALL TIME RANKINGS' : 'THIS WEEK'}
      />
      
      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} />}
      >
        {/* Tab Selector */}
        <View style={styles.tabContainer}>
          <View style={styles.tabSelector}>
            <TouchableOpacity
              style={[styles.tab, selectedTab === 'global' && styles.tabActive]}
              onPress={() => setSelectedTab('global')}
            >
              <Text style={[styles.tabText, selectedTab === 'global' && styles.tabTextActive]}>ALL TIME</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, selectedTab === 'weekly' && styles.tabActive]}
              onPress={() => setSelectedTab('weekly')}
            >
              <Text style={[styles.tabText, selectedTab === 'weekly' && styles.tabTextActive]}>WEEKLY</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Podium - Redesigned */}
        {top3.length > 0 && (
          <View style={styles.podiumContainer}>
            {/* 2nd Place */}
            {top3[0] && (
              <TouchableOpacity style={[styles.podiumColumn, styles.podium2nd]} onPress={() => handleViewProfile(top3[0].id)}>
                <View style={styles.podiumAvatarWrap}>
                  {top3[0].profileImage ? (
                    <Image source={{ uri: top3[0].profileImage }} style={[styles.podiumAvatar, { borderColor: '#C0C0C0' }]} />
                  ) : (
                    <View style={[styles.podiumAvatar, styles.podiumAvatarFallback, { borderColor: '#C0C0C0' }]}>
                      <Text style={styles.podiumInitials}>{top3[0].name?.substring(0, 2).toUpperCase()}</Text>
                    </View>
                  )}
                  <View style={[styles.rankMedal, { backgroundColor: '#C0C0C0' }]}>
                    <Text style={styles.rankMedalText}>2</Text>
                  </View>
                </View>
                <Text style={styles.podiumName} numberOfLines={1}>{top3[0].name}</Text>
                <Text style={styles.podiumPoints}>{formatPoints(top3[0].points)} <Text style={{fontSize: 8}}>XP</Text></Text>
                
                <LinearGradient
                  colors={['rgba(192, 192, 192, 0.2)', 'rgba(192, 192, 192, 0.05)', 'transparent']}
                  style={[styles.podiumBar, { height: 100, borderColor: 'rgba(192, 192, 192, 0.3)' }]}
                />
              </TouchableOpacity>
            )}

            {/* 1st Place */}
            {top3[1] && (
              <TouchableOpacity style={[styles.podiumColumn, styles.podium1st]} onPress={() => handleViewProfile(top3[1].id)}>
                <View style={styles.crownWrapper}>
                  <Ionicons name="star" size={18} color="#FFD700" />
                </View>
                <View style={[styles.podiumAvatarWrap, styles.podiumAvatarWrap1st]}>
                  <View style={styles.glowEffect} />
                  {top3[1].profileImage ? (
                    <Image source={{ uri: top3[1].profileImage }} style={styles.podiumAvatar1st} />
                  ) : (
                    <View style={[styles.podiumAvatar1st, styles.podiumAvatarFallback, { borderColor: '#FFD700' }]}>
                      <Text style={[styles.podiumInitials, { fontSize: 24 }]}>{top3[1].name?.substring(0, 2).toUpperCase()}</Text>
                    </View>
                  )}
                  <View style={[styles.rankMedal, styles.rankMedal1st, { backgroundColor: '#FFD700' }]}>
                    <Text style={[styles.rankMedalText, { color: '#000' }]}>1</Text>
                  </View>
                </View>
                <Text style={[styles.podiumName, styles.podiumName1st]} numberOfLines={1}>{top3[1].name}</Text>
                <Text style={[styles.podiumPoints, styles.podiumPoints1st]}>{formatPoints(top3[1].points)} <Text style={{fontSize: 9}}>XP</Text></Text>
                
                <LinearGradient
                  colors={['rgba(255, 215, 0, 0.25)', 'rgba(255, 215, 0, 0.08)', 'transparent']}
                  style={[styles.podiumBar, { height: 140, borderColor: 'rgba(255, 215, 0, 0.4)' }]}
                />
              </TouchableOpacity>
            )}

            {/* 3rd Place */}
            {top3[2] && (
              <TouchableOpacity style={[styles.podiumColumn, styles.podium3rd]} onPress={() => handleViewProfile(top3[2].id)}>
                <View style={styles.podiumAvatarWrap}>
                  {top3[2].profileImage ? (
                    <Image source={{ uri: top3[2].profileImage }} style={[styles.podiumAvatar, { borderColor: '#CD7F32' }]} />
                  ) : (
                    <View style={[styles.podiumAvatar, styles.podiumAvatarFallback, { borderColor: '#CD7F32' }]}>
                      <Text style={styles.podiumInitials}>{top3[2].name?.substring(0, 2).toUpperCase()}</Text>
                    </View>
                  )}
                  <View style={[styles.rankMedal, { backgroundColor: '#CD7F32' }]}>
                    <Text style={styles.rankMedalText}>3</Text>
                  </View>
                </View>
                <Text style={styles.podiumName} numberOfLines={1}>{top3[2].name}</Text>
                <Text style={styles.podiumPoints}>{formatPoints(top3[2].points)} <Text style={{fontSize: 8}}>XP</Text></Text>
                
                <LinearGradient
                  colors={['rgba(205, 127, 50, 0.2)', 'rgba(205, 127, 50, 0.05)', 'transparent']}
                  style={[styles.podiumBar, { height: 70, borderColor: 'rgba(205, 127, 50, 0.3)' }]}
                />
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* List Header */}
        <View style={styles.listHeader}>
          <Text style={styles.listHeaderTitle}>RANKINGS</Text>
          <Text style={styles.listHeaderCount}>{entries.length} CONTENDERS</Text>
        </View>

        {/* List Items */}
        <View style={styles.listContainer}>
          {rest.map((item) => {
            const style = getRankStyle(item.rank, theme);
            return (
              <TouchableOpacity
                key={item.id}
                onPress={() => handleViewProfile(item.id)}
                activeOpacity={0.7}
              >
                <LinearGradient
                  colors={item.isCurrentUser ? ['rgba(155, 44, 44, 0.2)', 'rgba(155, 44, 44, 0.05)'] : style.bg}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={[
                    styles.rankRow,
                    item.isCurrentUser && styles.rankRowActive,
                    { borderColor: item.isCurrentUser ? theme.primary : style.border }
                  ]}
                >
                  <View style={styles.rankNumCol}>
                    <Text style={[styles.rankNumText, { color: style.color }]}>{item.rank}</Text>
                  </View>
                  
                  <View style={styles.avatarCol}>
                    {item.profileImage ? (
                      <Image source={{ uri: item.profileImage }} style={styles.listAvatar} />
                    ) : (
                      <View style={styles.listAvatarFallback}>
                        <Text style={styles.listAvatarText}>{item.name?.substring(0, 2).toUpperCase()}</Text>
                      </View>
                    )}
                  </View>

                  <View style={styles.infoCol}>
                    <View style={{flexDirection: 'row', alignItems: 'center'}}>
                        <Text style={styles.listName} numberOfLines={1}>{item.name}</Text>
                        {item.isCurrentUser && <View style={styles.youTag}><Text style={styles.youTagText}>YOU</Text></View>}
                    </View>
                    {item.streak > 0 && (
                      <View style={styles.streakContainer}>
                        <Ionicons name="flame" size={10} color="#FF6B35" />
                        <Text style={styles.streakLabel}>{item.streak} DAY STREAK</Text>
                      </View>
                    )}
                  </View>

                  <View style={styles.pointsCol}>
                    <Text style={styles.listPoints}>{formatPoints(item.points)}</Text>
                    <Text style={styles.listPointsLabel}>XP</Text>
                  </View>
                </LinearGradient>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* User Rank Sticky (if not in view/rest) */}
        {currentUserRank && currentUserRank.rank > entries.length && (
          <View style={styles.stickyRankContainer}>
            <View style={styles.stickyDivider}>
               <View style={styles.dividerLine} />
               <Text style={styles.dividerText}>YOUR RANK</Text>
               <View style={styles.dividerLine} />
            </View>
            <LinearGradient
              colors={['rgba(155, 44, 44, 0.2)', 'rgba(155, 44, 44, 0.05)']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[styles.rankRow, styles.rankRowActive, { borderColor: theme.primary }]}
            >
              <View style={styles.rankNumCol}>
                <Text style={[styles.rankNumText, { color: theme.primary }]}>{currentUserRank.rank}</Text>
              </View>
              <View style={styles.avatarCol}>
                <View style={[styles.listAvatarFallback, { backgroundColor: theme.primary }]}>
                  <Text style={[styles.listAvatarText, { color: '#fff' }]}>{user.name?.substring(0, 2).toUpperCase()}</Text>
                </View>
              </View>
              <View style={styles.infoCol}>
                <View style={{flexDirection: 'row', alignItems: 'center'}}>
                    <Text style={styles.listName}>You</Text>
                    <View style={styles.youTag}><Text style={styles.youTagText}>YOU</Text></View>
                </View>
              </View>
              <View style={styles.pointsCol}>
                <Text style={styles.listPoints}>{formatPoints(user.totalPoints || 0)}</Text>
                <Text style={styles.listPointsLabel}>XP</Text>
              </View>
            </LinearGradient>
          </View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

function createStyles(theme, insets) {
  return StyleSheet.create({
    page: { flex: 1, backgroundColor: '#050505' },
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#050505' },
    content: { flex: 1 },
    contentContainer: { paddingBottom: 20 },

    // Tabs
    tabContainer: { paddingHorizontal: 16, marginBottom: 32, marginTop: 12 },
    tabSelector: { flexDirection: 'row', backgroundColor: '#111', borderRadius: 12, padding: 4, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
    tab: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 8 },
    tabActive: { backgroundColor: theme.primary },
    tabText: { fontSize: 11, fontWeight: '800', color: '#666', letterSpacing: 1 },
    tabTextActive: { color: '#fff' },

    // Podium
    podiumContainer: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center', height: 310, marginBottom: 20, marginTop: 10, paddingHorizontal: 16 },
    podiumColumn: { alignItems: 'center', justifyContent: 'flex-end', flex: 1, height: '100%' },
    podium2nd: { marginRight: 4, zIndex: 1 },
    podium1st: { marginHorizontal: 4, zIndex: 2, marginBottom: 20 },
    podium3rd: { marginLeft: 4, zIndex: 1 },
    
    podiumAvatarWrap: { marginBottom: 12, alignItems: 'center' },
    podiumAvatarWrap1st: { marginBottom: 16 },
    podiumAvatar: { width: 64, height: 64, borderRadius: 32, borderWidth: 2, backgroundColor: '#161616' },
    podiumAvatar1st: { width: 88, height: 88, borderRadius: 44, borderWidth: 3, borderColor: '#FFD700', backgroundColor: '#161616' },
    podiumAvatarFallback: { justifyContent: 'center', alignItems: 'center' },
    podiumInitials: { fontSize: 20, fontWeight: '800', color: '#666' },
    
    glowEffect: {
      position: 'absolute',
      width: 120,
      height: 120,
      borderRadius: 60,
      backgroundColor: 'rgba(255, 215, 0, 0.15)',
      top: -16,
      zIndex: -1,
    },

    rankMedal: { position: 'absolute', bottom: -10, width: 24, height: 24, borderRadius: 12, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#050505', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.5, shadowRadius: 4, elevation: 5 },
    rankMedal1st: { width: 30, height: 30, borderRadius: 15, bottom: -12 },
    rankMedalText: { fontSize: 12, fontWeight: '900', color: '#000' },
    
    crownWrapper: { position: 'absolute', top: 0, zIndex: 10 },
    
    podiumName: { fontSize: 12, fontWeight: '700', color: '#fff', marginBottom: 4, textAlign: 'center', maxWidth: 90 },
    podiumName1st: { fontSize: 14, fontWeight: '800', color: '#FFD700' },
    
    podiumPoints: { fontSize: 11, fontWeight: '800', color: '#888', marginBottom: 12, letterSpacing: 0.5 },
    podiumPoints1st: { color: '#FFD700', fontSize: 13 },
    
    podiumBar: { width: '100%', borderTopLeftRadius: 12, borderTopRightRadius: 12, borderWidth: 1, borderBottomWidth: 0 },

    // Rankings List
    listHeader: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 20, marginBottom: 12, alignItems: 'center' },
    listHeaderTitle: { fontSize: 12, fontWeight: '800', color: '#666', letterSpacing: 1 },
    listHeaderCount: { fontSize: 10, fontWeight: '700', color: theme.primary, letterSpacing: 0.5 },
    
    listContainer: { paddingHorizontal: 16 },
    rankRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 16, marginBottom: 8, borderRadius: 12, borderWidth: 1 },
    rankRowActive: { borderWidth: 1 },
    
    rankNumCol: { width: 30, alignItems: 'center', marginRight: 12 },
    rankNumText: { fontSize: 14, fontWeight: '800' },
    
    avatarCol: { marginRight: 12 },
    listAvatar: { width: 40, height: 40, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
    listAvatarFallback: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#222', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
    listAvatarText: { fontSize: 14, fontWeight: '700', color: '#666' },
    
    infoCol: { flex: 1 },
    listName: { fontSize: 14, fontWeight: '700', color: '#fff' },
    youTag: { marginLeft: 8, backgroundColor: theme.primary, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
    youTagText: { fontSize: 9, fontWeight: '800', color: '#fff' },
    streakContainer: { flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: 4 },
    streakLabel: { fontSize: 10, fontWeight: '700', color: '#FF6B35' },
    
    pointsCol: { alignItems: 'flex-end' },
    listPoints: { fontSize: 15, fontWeight: '800', color: '#fff' },
    listPointsLabel: { fontSize: 10, fontWeight: '700', color: '#666' },

    // Sticky Rank
    stickyRankContainer: { paddingHorizontal: 16, marginTop: 8 },
    stickyDivider: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
    dividerLine: { flex: 1, height: 1, backgroundColor: 'rgba(255,255,255,0.1)' },
    dividerText: { fontSize: 10, fontWeight: '800', color: '#666', marginHorizontal: 12, letterSpacing: 1 },
  });
}
