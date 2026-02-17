/**
 * Simplified Tier System
 * Single consolidated progression based on totalPoints from competition workouts
 * Progression scaled for challenging but achievable gameplay
 */

export const TIERS = [
  { name: 'UNYIELD', minPoints: 100000, icon: '💀', color: '#9b2c2c', image: require('../../assets/ranks/rank_unyield.png') },
  { name: 'CHAMPION', minPoints: 50000, icon: '🏆', color: '#ffd700', image: require('../../assets/ranks/rank_champion.png') },
  { name: 'DIAMOND', minPoints: 25000, icon: '💎', color: '#00bcd4', image: require('../../assets/ranks/rank_diamond.png') },
  { name: 'PLATINUM', minPoints: 10000, icon: '⚪', color: '#e0e0e0', image: require('../../assets/ranks/rank_platinum.png') },
  { name: 'GOLD', minPoints: 5000, icon: '🥇', color: '#ffd700', image: require('../../assets/ranks/rank_gold.png') },
  { name: 'SILVER', minPoints: 2000, icon: '🥈', color: '#c0c0c0', image: require('../../assets/ranks/rank_silver.png') },
  { name: 'BRONZE', minPoints: 0, icon: '🥉', color: '#cd7f32', image: require('../../assets/ranks/rank_bronze.png') },
];

/**
 * Get user's current tier based on total points
 */
export const getUserTier = (points) => {
  const pts = Number(points) || 0;
  for (const tier of TIERS) {
    if (pts >= tier.minPoints) return tier;
  }
  return TIERS[TIERS.length - 1];
};

/**
 * Get progress to next tier
 */
export const getTierProgress = (currentPoints) => {
  const pts = Number(currentPoints) || 0;
  const currentTier = getUserTier(pts);
  const currentIndex = TIERS.findIndex(t => t.name === currentTier.name);
  const nextTier = TIERS[currentIndex - 1]; // Next tier up

  if (!nextTier) {
    // Already at max tier
    return {
      current: pts,
      target: pts,
      percentage: 100,
      currentTier,
      nextTier: null,
    };
  }

  const prevTierPoints = currentTier.minPoints;
  const nextTierPoints = nextTier.minPoints;
  const progress = pts - prevTierPoints;
  const totalNeeded = nextTierPoints - prevTierPoints;
  const percentage = Math.min(100, Math.max(0, (progress / totalNeeded) * 100));

  return {
    current: pts,
    target: nextTierPoints,
    percentage,
    currentTier,
    nextTier,
  };
};

/**
 * Format points for display
 */
export const formatPoints = (points) => {
  const p = Number(points) || 0;
  if (p >= 10000) return (p / 1000).toFixed(1) + 'k';
  if (p >= 1000) return (p / 1000).toFixed(1) + 'k';
  return p.toString();
};
