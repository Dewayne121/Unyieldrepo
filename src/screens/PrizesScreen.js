import React, { useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../context/AppContext';
import { Colors, Spacing, Typography, BorderRadius, Shadows } from '../constants/colors';

const BR = BorderRadius;

// Hoodie images with transparent backgrounds (local assets)
const HOODIE_IMAGES = {
  1: require('../../assets/unyieldgold.png'),   // Gold Champion Hoodie
  2: require('../../assets/unyieldsilver.png'), // Silver Elite Hoodie
  3: require('../../assets/unyieldbronze.png'), // Bronze Rare Hoodie
};

const PRIZES = [
  {
    rank: 1,
    name: 'CHAMPION HOODIE',
    rarity: 'LEGENDARY',
    color: '#facc15',
    description: 'Exclusive gold hoodie for the #1 ranked grinder',
    image: HOODIE_IMAGES[1],
    eligibility: 'Top 1 in your region',
    glowColor: 'rgba(250, 204, 21, 0.3)',
    awardedCount: 47,
  },
  {
    rank: 2,
    name: 'ELITE HOODIE',
    rarity: 'EPIC',
    color: '#e5e7eb',
    description: 'Premium silver hoodie for the #2 ranked athlete',
    image: HOODIE_IMAGES[2],
    eligibility: 'Top 2 in your region',
    glowColor: 'rgba(229, 231, 235, 0.3)',
    awardedCount: 142,
  },
  {
    rank: 3,
    name: 'RARE HOODIE',
    rarity: 'RARE',
    color: '#d97706',
    description: 'Limited bronze hoodie for the #3 ranked warrior',
    image: HOODIE_IMAGES[3],
    eligibility: 'Top 3 in your region',
    glowColor: 'rgba(217, 119, 6, 0.3)',
    awardedCount: 328,
  },
];

export default function PrizesScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useApp();

  // Only show current user - real leaderboard data will come from API
  const top3 = useMemo(() => {
    if (!user) return [];
    // Show current user as #1 until real leaderboard is connected
    return [
      { id: user.id, name: user.name, points: user.totalPoints || 0, rank: 1, isCurrentUser: true },
    ];
  }, [user]);

  if (!user) return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background }}>
      <ActivityIndicator size="large" color={Colors.primary} />
    </View>
  );

  const userRank = top3.findIndex(e => e.isCurrentUser) + 1;
  const userPrize = PRIZES.find(p => p.rank === userRank);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + Spacing.sm }]}>
        <View style={styles.pill}>
          <Ionicons name="trophy" size={14} color={Colors.primary} />
          <Text style={styles.pillText}>EXCLUSIVE REWARDS</Text>
        </View>
        <Text style={styles.title}>SECTOR PRIZES</Text>
        <Text style={styles.subtitle}>Top 3 warriors earn rare hoodies</Text>
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={{ paddingBottom: 100 + insets.bottom }}
        showsVerticalScrollIndicator={false}
      >
        {/* Your Status Card */}
        <View style={styles.statusCard}>
          <View style={styles.statusHeader}>
            <View style={styles.statusIconWrap}>
              <Ionicons name="medal" size={24} color={Colors.primary} />
            </View>
            <View style={styles.statusTextWrap}>
              <Text style={styles.statusTitle}>Your Current Rank</Text>
              <Text style={styles.statusRank}>#{userRank > 0 ? userRank : '-'}</Text>
            </View>
          </View>
          {userPrize ? (
            <View style={styles.eligibleBadge}>
              <Ionicons name="checkmark-circle" size={16} color={Colors.primary} />
              <Text style={styles.eligibleText}>Eligible for {userPrize.name}</Text>
            </View>
          ) : (
            <View style={styles.lockedBadge}>
              <Ionicons name="lock-closed" size={16} color={Colors.textMuted} />
              <Text style={styles.lockedText}>Not in top 3 - Keep grinding!</Text>
            </View>
          )}
        </View>

        {/* Prize Tiers */}
        <Text style={styles.sectionTitle}>PRIZE TIERS</Text>

        {PRIZES.map((prize) => {
          const winner = top3.find(e => e.rank === prize.rank);
          return (
            <View
              key={prize.rank}
              style={[
                styles.prizeCard,
                userPrize?.rank === prize.rank && styles.prizeCardActive,
              ]}
            >
              {/* Rank Badge */}
              <View style={[styles.rankBadge, { backgroundColor: prize.color }]}>
                <Text style={styles.rankNumber}>#{prize.rank}</Text>
              </View>

              {/* Hoodie Image */}
              <View style={[styles.hoodieContainer, { borderColor: prize.glowColor }]}>
                <Image
                  source={prize.image}
                  style={styles.hoodieImage}
                  resizeMode="contain"
                  resizeMethod="resize"
                  fadeDuration={0}
                  progressiveRenderingEnabled={false}
                />
                <View style={[styles.rarityBadge, { backgroundColor: prize.glowColor }]}>
                  <Text style={[styles.rarityText, { color: prize.color }]}>{prize.rarity}</Text>
                </View>
                <View style={styles.awardedBox}>
                  <Ionicons name="ribbon" size={12} color={Colors.primary} />
                  <Text style={styles.awardedText}>{prize.awardedCount}x awarded</Text>
                </View>
              </View>

              {/* Prize Info */}
              <View style={styles.prizeInfo}>
                <Text style={styles.prizeName}>{prize.name}</Text>
                <Text style={styles.prizeDescription}>{prize.description}</Text>

                {winner ? (
                  <View style={styles.winnerInfo}>
                    <View style={styles.winnerAvatar}>
                      <Ionicons name="person" size={20} color={Colors.text} />
                    </View>
                    <View style={styles.winnerDetails}>
                      <Text style={styles.winnerLabel}>Current Holder</Text>
                      <Text style={styles.winnerName}>
                        {winner.name}
                        {winner.isCurrentUser ? ' (You)' : ''}
                      </Text>
                    </View>
                    <View style={styles.winnerPoints}>
                      <Text style={styles.winnerPointsValue}>{winner.points.toLocaleString()}</Text>
                      <Text style={styles.winnerPointsLabel}>XP</Text>
                    </View>
                  </View>
                ) : (
                  <View style={styles.emptyWinner}>
                    <Text style={styles.emptyWinnerText}>No one ranked yet</Text>
                  </View>
                )}

                <View style={styles.eligibilityInfo}>
                  <Ionicons name="information-circle" size={14} color={Colors.textMuted} />
                  <Text style={styles.eligibilityText}>{prize.eligibility}</Text>
                </View>
              </View>
            </View>
          );
        })}

        {/* Season Info */}
        <View style={styles.seasonCard}>
          <Ionicons name="time" size={20} color={Colors.primary} />
          <View style={styles.seasonInfo}>
            <Text style={styles.seasonTitle}>Season Reset</Text>
            <Text style={styles.seasonText}>Prizes awarded monthly. Rankings reset at season end.</Text>
          </View>
        </View>
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
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.primarySubtle,
    borderWidth: 1,
    borderColor: 'rgba(16,185,129,0.35)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  pillText: {
    ...Typography.caption,
    color: Colors.primary,
    textTransform: 'uppercase',
  },
  title: {
    ...Typography.h2,
    fontWeight: '800',
    color: Colors.text,
    textAlign: 'center',
  },
  subtitle: {
    ...Typography.bodySmall,
    color: Colors.textMuted,
    textAlign: 'center',
    marginTop: 4,
  },
  content: {
    flex: 1,
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.xl,
  },

  // Status Card
  statusCard: {
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BR['2xl'],
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
    ...Shadows.medium,
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },
  statusIconWrap: {
    width: 48,
    height: 48,
    borderRadius: BR.lg,
    backgroundColor: Colors.primarySubtle,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusTextWrap: {
    flex: 1,
  },
  statusTitle: {
    ...Typography.caption,
    color: Colors.textMuted,
    textTransform: 'uppercase',
  },
  statusRank: {
    ...Typography.h3,
    fontWeight: '800',
    color: Colors.text,
    marginTop: 2,
  },
  eligibleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.primarySubtle,
    borderWidth: 1,
    borderColor: 'rgba(16,185,129,0.35)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: BR.md,
    alignSelf: 'flex-start',
  },
  eligibleText: {
    ...Typography.bodySmall,
    fontWeight: '700',
    color: Colors.primary,
  },
  lockedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: BR.md,
    alignSelf: 'flex-start',
  },
  lockedText: {
    ...Typography.bodySmall,
    fontWeight: '700',
    color: Colors.textMuted,
  },

  // Section Title
  sectionTitle: {
    ...Typography.caption,
    color: Colors.textMuted,
    textTransform: 'uppercase',
    marginBottom: Spacing.md,
  },

  // Prize Card
  prizeCard: {
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BR['2xl'],
    marginBottom: Spacing.md,
    overflow: 'hidden',
    ...Shadows.subtle,
  },
  prizeCardActive: {
    borderColor: Colors.primary,
  },
  rankBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
    ...Shadows.subtle,
  },
  rankNumber: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.background,
  },
  hoodieContainer: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BR.xl,
    padding: Spacing.lg,
    margin: Spacing.md,
    marginBottom: Spacing.sm,
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 220,
  },
  hoodieImage: {
    width: 180,
    height: 180,
  },
  rarityBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  rarityText: {
    ...Typography.caption,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  awardedBox: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.overlay,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(16,185,129,0.35)',
  },
  awardedText: {
    ...Typography.caption,
    fontWeight: '700',
    color: Colors.primary,
  },
  prizeInfo: {
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.md,
  },
  prizeName: {
    ...Typography.h4,
    fontWeight: '800',
    color: Colors.text,
    marginBottom: 4,
  },
  prizeDescription: {
    ...Typography.bodySmall,
    color: Colors.textSecondary,
    marginBottom: Spacing.md,
  },
  winnerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BR.lg,
    padding: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  winnerAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.card,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  winnerDetails: {
    flex: 1,
  },
  winnerLabel: {
    ...Typography.caption,
    color: Colors.textMuted,
    textTransform: 'uppercase',
  },
  winnerName: {
    ...Typography.bodySmall,
    fontWeight: '800',
    color: Colors.text,
  },
  winnerPoints: {
    alignItems: 'flex-end',
  },
  winnerPointsValue: {
    ...Typography.h4,
    fontWeight: '800',
    color: Colors.primary,
  },
  winnerPointsLabel: {
    ...Typography.caption,
    color: Colors.textMuted,
    textTransform: 'uppercase',
  },
  emptyWinner: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BR.lg,
    padding: Spacing.sm,
    marginBottom: Spacing.sm,
    alignItems: 'center',
  },
  emptyWinnerText: {
    ...Typography.bodySmall,
    fontWeight: '600',
    color: Colors.textMuted,
  },
  eligibilityInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  eligibilityText: {
    ...Typography.caption,
    color: Colors.textMuted,
    textTransform: 'uppercase',
  },

  // Season Card
  seasonCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    backgroundColor: Colors.primarySubtle,
    borderWidth: 1,
    borderColor: 'rgba(16,185,129,0.35)',
    borderRadius: BR['2xl'],
    padding: Spacing.lg,
    marginTop: Spacing.sm,
  },
  seasonInfo: {
    flex: 1,
  },
  seasonTitle: {
    ...Typography.body,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 2,
  },
  seasonText: {
    ...Typography.bodySmall,
    color: Colors.textSecondary,
    lineHeight: 16,
  },
});
