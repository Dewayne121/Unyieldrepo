import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, RefreshControl, Image, TouchableOpacity, Dimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useApp } from '../context/AppContext';
import { useTheme } from '../context/ThemeContext';
import { getWeightClassLabel, formatStrengthRatio } from '../context/AppContext';
import api from '../services/api';
import ScreenHeader from '../components/ScreenHeader';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Weight class options
const WEIGHT_CLASSES = [
  { id: null, label: 'All Classes' },
  { id: 'W55_64', label: '55-64 kg' },
  { id: 'W65_74', label: '65-74 kg' },
  { id: 'W75_84', label: '75-84 kg' },
  { id: 'W85_94', label: '85-94 kg' },
  { id: 'W95_109', label: '95-109 kg' },
  { id: 'W110_PLUS', label: '110+ kg' },
];

// Rank styling helper
const getRankStyle = (rank) => {
  if (rank === 1) return { color: '#FFD700' };
  if (rank === 2) return { color: '#C0C0C0' };
  if (rank === 3) return { color: '#CD7F32' };
  return { color: '#444' };
};

export default function LeaderboardScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { theme } = useTheme();
  const { user, weightUnit } = useApp();

  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [currentUserRank, setCurrentUserRank] = useState(null);
  const [selectedTab, setSelectedTab] = useState('global');
  const [selectedWeightClass, setSelectedWeightClass] = useState(null);

  const fetchLeaderboard = useCallback(async () => {
    try {
      const params = { limit: 100 };
      if (selectedWeightClass) {
        params.weightClass = selectedWeightClass;
      }

      const response = await api.getLeaderboard(params);
      if (response.success && response.data) {
        const leaderboardData = response.data.leaderboard.map(entry => ({
          id: entry.id,
          name: entry.username || entry.name,
          username: entry.username,
          profileImage: entry.profileImage,
          strengthRatio: entry.strengthRatio || 0,
          ratioDisplay: entry.ratioDisplay || formatStrengthRatio(entry.strengthRatio),
          weight: entry.weight,
          weightClass: entry.weightClass,
          weightClassLabel: entry.weightClassLabel || getWeightClassLabel(entry.weightClass),
          rank: entry.rank,
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
  }, [user, selectedWeightClass]);

  useEffect(() => {
    fetchLeaderboard();
  }, [fetchLeaderboard]);

  useFocusEffect(
    useCallback(() => {
      fetchLeaderboard();
    }, [fetchLeaderboard])
  );

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

  return (
    <View style={styles.page}>
      <ScreenHeader
        title="LEADERBOARD"
        subtitle={selectedWeightClass
          ? `${WEIGHT_CLASSES.find(w => w.id === selectedWeightClass)?.label} RANKINGS`
          : 'ALL TIME RANKINGS'
        }
      />
      
      {/* Fixed Header Section */}
      <View style={styles.fixedHeader}>
        {/* Weight Class Selector */}
        <View style={styles.weightClassSection}>
          <Text style={styles.weightClassLabel}>WEIGHT CLASS</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.weightClassScroll}
            contentContainerStyle={styles.weightClassScrollContent}
          >
            {WEIGHT_CLASSES.map((wc) => (
              <TouchableOpacity
                key={wc.id}
                style={[
                  styles.weightClassButton,
                  selectedWeightClass === wc.id && styles.weightClassButtonActive,
                ]}
                onPress={() => setSelectedWeightClass(wc.id)}
              >
                <Text style={[
                  styles.weightClassButtonText,
                  selectedWeightClass === wc.id && styles.weightClassButtonTextActive,
                ]}>
                  {wc.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

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

        {/* List Header Labels */}
        <View style={styles.columnHeaderRow}>
          <Text style={[styles.columnHeaderText, { width: 32 }]}>#</Text>
          <Text style={[styles.columnHeaderText, { flex: 1.2 }]}>ATHLETE</Text>
          <Text style={[styles.columnHeaderText, { flex: 0.8, textAlign: 'center' }]}>CLASS</Text>
          <Text style={[styles.columnHeaderText, { flex: 0.8, textAlign: 'center' }]}>WEIGHT</Text>
          <Text style={[styles.columnHeaderText, { flex: 1, textAlign: 'right' }]}>RATIO</Text>
        </View>
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} />}
      >
        {/* List Items */}
        <View style={styles.listContainer}>
          {entries.map((item) => {
            const rankStyle = getRankStyle(item.rank);
            
            // Performance pill color logic
            const ratioValue = parseFloat(item.ratioDisplay);
            let pillColor = '#9b2c2c'; // Red
            if (ratioValue >= 2.0) pillColor = '#10B981'; // Green
            else if (ratioValue >= 1.0) pillColor = '#F59E0B'; // Orange

            return (
              <TouchableOpacity
                key={item.id}
                onPress={() => handleViewProfile(item.id)}
                activeOpacity={0.7}
                style={[
                  styles.rankRow,
                  item.isCurrentUser && styles.rankRowActive,
                  { borderColor: item.isCurrentUser ? theme.primary : 'transparent' }
                ]}
              >
                <View style={styles.rankNumCol}>
                  <Text style={[styles.rankNumText, { color: rankStyle.color }]}>
                    {item.rank}
                  </Text>
                </View>
                
                <View style={[styles.athleteCol, { flex: 1.2 }]}>
                  {item.profileImage ? (
                    <Image source={{ uri: item.profileImage }} style={styles.listAvatar} />
                  ) : (
                    <View style={styles.listAvatarFallback}>
                      <Text style={styles.listAvatarText}>{item.name?.substring(0, 2).toUpperCase()}</Text>
                    </View>
                  )}
                  <View style={styles.nameWrap}>
                    <Text style={styles.listName} numberOfLines={1}>{item.name}</Text>
                    {item.isCurrentUser && <Text style={styles.youIndicator}>YOU</Text>}
                  </View>
                </View>

                <View style={[styles.classCol, { flex: 0.8 }]}>
                  <Text style={styles.columnValueText}>{item.weightClassLabel?.split(' ')[0] || '--'}</Text>
                </View>

                <View style={[styles.weightCol, { flex: 0.8 }]}>
                  <Text style={styles.columnValueText}>
                    {item.weight 
                      ? (weightUnit === 'lbs' 
                          ? `${Math.round(item.weight * 2.20462)}lb` 
                          : `${item.weight}kg`) 
                      : '--'}
                  </Text>
                </View>

                <View style={[styles.ratioCol, { flex: 1 }]}>
                  <View style={[styles.ratioPill, { backgroundColor: pillColor + '20', borderColor: pillColor + '40' }]}>
                    <Text style={[styles.ratioPillText, { color: pillColor }]}>{item.ratioDisplay}</Text>
                  </View>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={{ height: 20 }} />
      </ScrollView>

      {/* User Rank Sticky - only show when viewing user's weight class or all classes */}
      {currentUserRank && !entries.find(e => e.id === user.id) && (!selectedWeightClass || selectedWeightClass === currentUserRank.weightClass) && (
        <View style={[styles.stickyRankContainer, { paddingBottom: insets.bottom + 10 }]}>
          <View style={styles.stickyDivider}>
             <View style={styles.dividerLine} />
             <Text style={styles.dividerText}>YOUR RANK</Text>
             <View style={styles.dividerLine} />
          </View>
          <TouchableOpacity
              onPress={() => handleViewProfile(user.id)}
              activeOpacity={0.7}
              style={[styles.rankRow, styles.rankRowActive, { borderColor: theme.primary, backgroundColor: 'rgba(155, 44, 44, 0.15)', marginHorizontal: 12 }]}
          >
            <View style={styles.rankNumCol}>
              <Text style={[styles.rankNumText, { color: theme.primary }]}>{currentUserRank.rank}</Text>
            </View>
            <View style={[styles.athleteCol, { flex: 1.2 }]}>
              <View style={[styles.listAvatarFallback, { backgroundColor: theme.primary }]}>
                <Text style={[styles.listAvatarText, { color: '#fff' }]}>{user.name?.substring(0, 2).toUpperCase()}</Text>
              </View>
              <View style={styles.nameWrap}>
                  <Text style={styles.listName}>You</Text>
                  <Text style={styles.youIndicator}>YOU</Text>
              </View>
            </View>
            <View style={[styles.classCol, { flex: 0.8 }]}>
                <Text style={styles.columnValueText}>{getWeightClassLabel(currentUserRank.weightClass)?.split(' ')[0] || '--'}</Text>
            </View>
            <View style={[styles.weightCol, { flex: 0.8 }]}>
                <Text style={styles.columnValueText}>
                  {user.weight
                    ? (weightUnit === 'lbs'
                        ? `${Math.round(user.weight * 2.20462)}lb`
                        : `${user.weight}kg`)
                    : '--'}
                </Text>
            </View>
            <View style={[styles.ratioCol, { flex: 1 }]}>
                <View style={[styles.ratioPill, { backgroundColor: 'rgba(155, 44, 44, 0.2)', borderColor: 'rgba(155, 44, 44, 0.4)' }]}>
                  <Text style={[styles.ratioPillText, { color: theme.primary }]}>{formatStrengthRatio(currentUserRank?.strengthRatio || 0)}</Text>
                </View>
            </View>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

function createStyles(theme, insets) {
  return StyleSheet.create({
    page: { flex: 1, backgroundColor: '#050505' },
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#050505' },
    content: { flex: 1 },
    contentContainer: { paddingBottom: 100 },

    fixedHeader: {
      backgroundColor: '#050505',
      zIndex: 10,
    },

    // Tabs
    tabContainer: { paddingHorizontal: 16, marginBottom: 16, marginTop: 0 },
    tabSelector: { flexDirection: 'row', backgroundColor: '#111', borderRadius: 12, padding: 4, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
    tab: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 8 },
    tabActive: { backgroundColor: theme.primary },
    tabText: { fontSize: 11, fontWeight: '800', color: '#666', letterSpacing: 1 },
    tabTextActive: { color: '#fff' },

    // Weight Class Selector
    weightClassSection: { paddingHorizontal: 16, marginBottom: 20, marginTop: 12 },
    weightClassLabel: { fontSize: 10, fontWeight: '800', color: '#444', letterSpacing: 1.5, marginBottom: 12 },
    weightClassScroll: { },
    weightClassScrollContent: { paddingRight: 20 },
    weightClassButton: {
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 8,
      backgroundColor: '#0f0f0f',
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.05)',
      marginRight: 8,
    },
    weightClassButtonActive: {
      backgroundColor: theme.primary + '20',
      borderColor: theme.primary,
    },
    weightClassButtonText: {
      fontSize: 11,
      fontWeight: '700',
      color: '#444',
    },
    weightClassButtonTextActive: {
      color: theme.primary,
    },

    // Column Headers
    columnHeaderRow: { 
      flexDirection: 'row', 
      paddingHorizontal: 20, 
      marginBottom: 0, 
      paddingBottom: 12,
      borderBottomWidth: 1,
      borderBottomColor: 'rgba(255,255,255,0.05)'
    },
    rankNumSpacer: {
      width: 32, 
    },
    columnHeaderText: { 
      fontSize: 10, 
      fontWeight: '800', 
      color: '#444', 
      letterSpacing: 1 
    },

    // Rankings List
    listContainer: { paddingHorizontal: 12, marginTop: 12 },
    rankRow: { 
      flexDirection: 'row', 
      alignItems: 'center', 
      paddingVertical: 12, 
      paddingHorizontal: 8, 
      marginBottom: 4, 
      borderRadius: 10, 
      backgroundColor: '#0a0a0a',
      borderWidth: 1,
      borderColor: 'transparent'
    },
    rankRowActive: { 
      backgroundColor: 'rgba(255, 255, 255, 0.03)',
      borderColor: 'rgba(255, 255, 255, 0.1)',
    },
    
    rankNumCol: { width: 24, alignItems: 'center', marginRight: 8 },
    rankNumText: { fontSize: 11, fontWeight: '900' },
    
    athleteCol: { flexDirection: 'row', alignItems: 'center' },
    listAvatar: { width: 32, height: 32, borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
    listAvatarFallback: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#161616', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
    listAvatarText: { fontSize: 11, fontWeight: '800', color: '#444' },
    
    nameWrap: { marginLeft: 10, flex: 1 },
    listName: { fontSize: 13, fontWeight: '700', color: '#ccc' },
    youIndicator: { fontSize: 8, fontWeight: '900', color: theme.primary, marginTop: 1 },
    
    classCol: { alignItems: 'center' },
    weightCol: { alignItems: 'center' },
    columnValueText: { fontSize: 12, fontWeight: '600', color: '#888' },
    
    ratioCol: { alignItems: 'flex-end' },
    ratioPill: { 
      paddingHorizontal: 10, 
      paddingVertical: 4, 
      borderRadius: 6, 
      borderWidth: 1,
      minWidth: 50,
      alignItems: 'center'
    },
    ratioPillText: { fontSize: 12, fontWeight: '800' },

    // Sticky Rank
    stickyRankContainer: { 
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      backgroundColor: '#050505',
      paddingTop: 12,
      borderTopWidth: 1,
      borderTopColor: 'rgba(255,255,255,0.05)',
      zIndex: 20,
    },
    stickyDivider: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, paddingHorizontal: 12 },
    dividerLine: { flex: 1, height: 1, backgroundColor: 'rgba(255,255,255,0.05)' },
    dividerText: { fontSize: 9, fontWeight: '800', color: '#333', marginHorizontal: 12, letterSpacing: 1.5 },
  });
}