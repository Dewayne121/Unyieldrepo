import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useApp } from '../context/AppContext';
import { useTheme } from '../context/ThemeContext';
import { getUserTier, getTierProgress } from '../constants/tiers';

export default function GlobalHeader() {
  const insets = useSafeAreaInsets();
  const { theme, skin } = useTheme();
  const { user } = useApp();
  const navigation = useNavigation();

  if (!user) return null;

  const totalPoints = Number(user?.totalPoints || 0);

  // Get current tier and progress
  const currentTier = getUserTier(totalPoints);
  const tierProgress = getTierProgress(totalPoints);

  const displayName = user?.name || 'Grinder';
  const profileImage = user?.profileImage;

  const handleProfilePress = () => {
    navigation.navigate('Profile');
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top + 12 }]}>
      {/* Top Row: Profile, Name, Tier */}
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
          <Text style={[styles.userTier, { color: currentTier.color }]}>
            {currentTier.name}
          </Text>
        </View>

        <View style={styles.tierBadgeContainer}>
          <Image
            source={currentTier.image}
            style={styles.tierBadgeImage}
            resizeMode="contain"
          />
        </View>
      </View>

      {/* Bottom Row: Progress to next tier */}
      <View style={styles.progressRow}>
        <View style={[styles.progressLabel, { backgroundColor: currentTier.color }]}>
          <Text style={styles.progressLabelText}>{totalPoints} XP</Text>
        </View>
        <View style={styles.xpTrack}>
          <View style={[styles.xpFill, { width: `${tierProgress.percentage}%`, backgroundColor: currentTier.color }]} />
        </View>
        {tierProgress.nextTier ? (
          <Text style={styles.xpLabel}>
            {tierProgress.current} / {tierProgress.target} XP
          </Text>
        ) : (
          <Text style={styles.xpLabel}>MAX TIER</Text>
        )}
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
  userTier: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  tierBadgeContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 40,
    height: 40,
  },
  tierBadge: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  tierBadgeImage: {
    width: 40,
    height: 40,
  },
  tierIcon: {
    fontSize: 16,
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  progressLabel: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  progressLabelText: {
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
    borderRadius: 3,
  },
  xpLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#666',
    fontFamily: 'monospace',
  },
});
