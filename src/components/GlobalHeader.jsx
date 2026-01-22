import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useApp } from '../context/AppContext';
import { useTheme } from '../context/ThemeContext';

// League tiers - matching the leaderboard system
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

const XP_PER_LEVEL = 500;

export default function GlobalHeader() {
  const insets = useSafeAreaInsets();
  const { theme, skin } = useTheme();
  const { user } = useApp();
  const navigation = useNavigation();

  if (!user) return null;

  // Calculate level and XP progress
  const totalXp = Number(user?.totalPoints || 0);
  const level = Math.floor(totalXp / XP_PER_LEVEL) + 1;
  const xpInCurrentLevel = totalXp % XP_PER_LEVEL;
  const xpProgress = (xpInCurrentLevel / XP_PER_LEVEL) * 100;

  // Get current league
  const currentLeague = getUserLeague(totalXp);

  const displayName = user?.name || 'Grinder';
  const profileImage = user?.profileImage;

  const handleProfilePress = () => {
    navigation.navigate('Profile');
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top + 12 }]}>
      {/* Top Row: Profile, Name, League */}
      <View style={styles.topRow}>
        <TouchableOpacity
          onPress={handleProfilePress}
          style={styles.profilePicContainer}
          activeOpacity={0.8}
        >
          {profileImage ? (
            <Image source={{ uri: profileImage }} style={styles.profilePic} />
          ) : (
            <View style={styles.profilePicPlaceholder}>
              <Text style={styles.profilePicInitials}>
                {displayName.substring(0, 2).toUpperCase()}
              </Text>
            </View>
          )}
        </TouchableOpacity>

        <View style={styles.userInfo}>
          <Text style={styles.userName}>{displayName}</Text>
          <Text style={styles.userRank}>OPERATOR</Text>
        </View>

        <View style={[styles.leagueBadge, { borderColor: currentLeague.color }]}>
          <Text style={styles.leagueIcon}>{currentLeague.icon}</Text>
          <Text style={[styles.leagueText, { color: currentLeague.color }]}>
            {currentLeague.name}
          </Text>
        </View>
      </View>

      {/* Bottom Row: Level & XP Bar */}
      <View style={styles.progressRow}>
        <View style={styles.levelBadge}>
          <Text style={styles.levelText}>LVL {level}</Text>
        </View>
        <View style={styles.xpTrack}>
          <View style={[styles.xpFill, { width: `${xpProgress}%` }]} />
        </View>
        <Text style={styles.xpLabel}>
          {xpInCurrentLevel} / {XP_PER_LEVEL} XP
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    backgroundColor: '#0a0a0a',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  profilePicContainer: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 2,
    borderColor: '#9b2c2c',
    overflow: 'hidden',
    backgroundColor: '#1a1a1a',
    marginRight: 14,
  },
  profilePic: {
    width: '100%',
    height: '100%',
  },
  profilePicPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#9b2c2c',
  },
  profilePicInitials: {
    fontSize: 16,
    fontWeight: '800',
    color: '#fff',
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 20,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  userRank: {
    fontSize: 11,
    fontWeight: '600',
    color: '#888',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  leagueBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    backgroundColor: 'rgba(255,255,255,0.03)',
    gap: 6,
  },
  leagueIcon: {
    fontSize: 12,
  },
  leagueText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  levelBadge: {
    backgroundColor: '#1a1a1a',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  levelText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: 0.5,
  },
  xpTrack: {
    flex: 1,
    height: 6,
    backgroundColor: '#1a1a1a',
    borderRadius: 3,
    overflow: 'hidden',
  },
  xpFill: {
    height: '100%',
    backgroundColor: '#9b2c2c',
    borderRadius: 3,
  },
  xpLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#666',
    fontFamily: 'monospace',
  },
});
