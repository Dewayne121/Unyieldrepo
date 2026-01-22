import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  StatusBar,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../context/AppContext';
import { useTheme } from '../context/ThemeContext';
import { SKINS, Typography, Spacing, BorderRadius } from '../constants/colors';
import api from '../services/api';

const FILTERS = [
  { key: 'active', label: 'LIVE' },
  { key: 'ended', label: 'PAST' },
  { key: 'all', label: 'ALL' },
];

export default function CompeteScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { user } = useApp();
  const { theme, skin } = useTheme();
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [challenges, setChallenges] = useState([]);
  const [selectedFilter, setSelectedFilter] = useState('active');
  const [joining, setJoining] = useState(null);

  useEffect(() => {
    loadChallenges();
  }, [selectedFilter]);

  const loadChallenges = async () => {
    try {
      setLoading(true);
      const response = await api.getChallenges({
        region: user?.region || 'global',
        includeExpired: selectedFilter !== 'active' ? 'true' : 'false',
      });

      if (response.success) {
        setChallenges(response.data || []);
      } else {
        setChallenges([]);
      }
    } catch (err) {
      console.error('Error loading challenges:', err);
      setChallenges([]); 
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadChallenges();
  };

  const confirmLeave = (challenge) => {
    Alert.alert(
      "Leave Challenge?",
      "You will lose your current progress in this challenge. Are you sure?",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Leave", 
          style: "destructive", 
          onPress: () => handleJoinLeave(challenge) 
        }
      ]
    );
  };

  const handleJoinLeave = async (challenge) => {
    // If already joined, confirm before leaving (UX Rule 5: Error Prevention)
    if (challenge.joined && !joining) {
        // We handle the actual API call in the confirm callback for 'Leave'
        // But here we need to check if we are calling this directly or from confirm
        // To simplify, let's just make the button call confirmLeave if joined
        // So this function does the actual work
    }

    try {
      setJoining(challenge._id);
      if (challenge.joined) {
        await api.leaveChallenge(challenge._id);
        setChallenges(prev => prev.map(c => c._id === challenge._id ? { ...c, joined: false, progress: 0 } : c));
        // Feedback (UX Rule 1)
        // Ideally show a toast, but Alert is invasive. Silent update + UI change is often enough if distinct.
      } else {
        await api.joinChallenge(challenge._id);
        setChallenges(prev => prev.map(c => c._id === challenge._id ? { ...c, joined: true, progress: 0 } : c));
        Alert.alert("Joined!", `You have joined ${challenge.title}. Good luck!`);
      }
    } catch (err) {
       Alert.alert("Error", "Could not update challenge status.");
    } finally {
      setJoining(null);
    }
  };

  const getTimeRemaining = (endDate) => {
    const now = new Date();
    const end = new Date(endDate);
    const diff = end - now;
    if (diff <= 0) return { text: 'ENDED', expired: true };
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    return { text: `${days}d ${hours}h`, expired: false };
  };

  const renderChallengeCard = (challenge, index) => {
    const timeInfo = getTimeRemaining(challenge.endDate);
    const isJoined = challenge.joined;
    const isCompleted = challenge.completed;
    const progressPercent = Math.min(100, (challenge.progress / challenge.target) * 100);
    
    return (
      <TouchableOpacity
        key={challenge._id || index}
        activeOpacity={0.9}
        onPress={() => navigation.navigate('ChallengeDetail', { challengeId: challenge._id })}
        style={[styles.challengeCard, { backgroundColor: theme.bgCard, borderColor: isJoined ? theme.primary : 'rgba(255,255,255,0.05)' }]}
      >
          {/* Header Row */}
          <View style={styles.cardHeader}>
            <View style={styles.headerLeft}>
              <View style={[
                styles.iconContainer, 
                { backgroundColor: isCompleted ? 'rgba(0, 212, 170, 0.1)' : 'rgba(212, 175, 55, 0.1)' }
              ]}>
                <Ionicons 
                  name={isCompleted ? "medal" : "trophy"} 
                  size={20} 
                  color={isCompleted ? "#00d4aa" : theme.gold} 
                />
              </View>
              <View style={styles.headerInfo}>
                <Text style={styles.cardTitle} numberOfLines={1}>{challenge.title}</Text>
                <View style={styles.metaRow}>
                   <Text style={styles.metaText}>{challenge.regionScope?.toUpperCase() || 'GLOBAL'}</Text>
                   <Text style={styles.metaDot}>•</Text>
                   <Text style={[styles.metaText, timeInfo.expired && { color: theme.danger }]}>
                     {timeInfo.text}
                   </Text>
                </View>
              </View>
            </View>

            <View style={[styles.rewardBadge, { borderColor: theme.gold }]}>
              <Text style={[styles.rewardText, { color: theme.gold }]}>+{challenge.reward || 100} PTS</Text>
            </View>
          </View>

          {/* Description */}
          <Text style={styles.cardDescription} numberOfLines={2}>
            {challenge.description}
          </Text>

          {/* Progress Section (only if joined) */}
          {isJoined && (
            <View style={styles.progressSection}>
              <View style={styles.progressHeader}>
                <Text style={styles.progressLabel}>PROGRESS</Text>
                <Text style={styles.progressValue}>
                  {challenge.progress || 0} / {challenge.target}
                </Text>
              </View>
              <View style={styles.progressBarBg}>
                <View style={[styles.progressBarFill, { width: `${progressPercent}%`, backgroundColor: theme.primary }]} />
              </View>
            </View>
          )}

          {/* Footer */}
          <View style={styles.cardFooter}>
            <View style={styles.participants}>
              <Ionicons name="people" size={14} color="#666" />
              <Text style={styles.participantCount}>{challenge.participantCount || 0} contenders</Text>
            </View>

            <TouchableOpacity
              style={[
                styles.joinBtn, 
                isJoined ? { backgroundColor: 'transparent', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' } : { backgroundColor: theme.primary }
              ]}
              onPress={(e) => {
                e.stopPropagation();
                if (isJoined) {
                    confirmLeave(challenge);
                } else {
                    handleJoinLeave(challenge);
                }
              }}
              disabled={joining === challenge._id || timeInfo.expired}
            >
              {joining === challenge._id ? (
                <ActivityIndicator size="small" color={isJoined ? "#fff" : "#fff"} />
              ) : (
                <Text style={[styles.joinBtnText, { color: '#fff' }]}>
                  {isJoined ? 'LEAVE' : 'JOIN'}
                </Text>
              )}
            </TouchableOpacity>
          </View>
      </TouchableOpacity>
    );
  };

  const styles = createStyles(theme);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 20 }]}>
        <Text style={styles.pageTitle}>COMPETE</Text>
        <Text style={styles.pageSubtitle}>Prove your strength</Text>
      </View>

      {/* Tabs */}
      <View style={styles.tabBar}>
        {FILTERS.map((filter) => (
          <TouchableOpacity
            key={filter.key}
            style={styles.tab}
            onPress={() => setSelectedFilter(filter.key)}
          >
            <Text style={[
                styles.tabText, 
                selectedFilter === filter.key && { color: theme.textMain },
                selectedFilter !== filter.key && { color: theme.textMuted }
            ]}>
              {filter.label}
            </Text>
            {selectedFilter === filter.key && <View style={[styles.activeIndicator, { backgroundColor: theme.primary }]} />}
          </TouchableOpacity>
        ))}
      </View>

      {/* Content */}
      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
        </View>
      ) : (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: 100 + insets.bottom }]}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} />}
          showsVerticalScrollIndicator={false}
        >
          {challenges.length > 0 ? (
            challenges.map((challenge, index) => renderChallengeCard(challenge, index))
          ) : (
            <View style={styles.emptyContainer}>
              <View style={[styles.emptyIconContainer, { backgroundColor: 'rgba(255,255,255,0.05)' }]}>
                <Ionicons name="trophy-outline" size={48} color={theme.textMuted} />
              </View>
              <Text style={styles.emptyText}>NO CHALLENGES ACTIVE</Text>
              <Text style={styles.emptySubtext}>Check back later for new competitions.</Text>
            </View>
          )}
        </ScrollView>
      )}
    </View>
  );
}

function createStyles(theme) {
    return StyleSheet.create({
      container: {
        flex: 1,
        backgroundColor: theme.bgDeep,
      },
      header: {
        paddingHorizontal: 24,
        paddingBottom: 24,
      },
      pageTitle: {
        ...Typography.h1,
        color: theme.textMain,
        marginBottom: 4,
      },
      pageSubtitle: {
        fontSize: 14,
        color: theme.textMuted,
        fontWeight: '600',
      },
      tabBar: {
        flexDirection: 'row',
        paddingHorizontal: 24,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.05)',
      },
      tab: {
        marginRight: 28,
        paddingVertical: 14,
      },
      tabText: {
        ...Typography.monoSmall,
        fontSize: 12,
        letterSpacing: 1,
      },
      activeIndicator: {
        position: 'absolute',
        bottom: -1,
        left: 0,
        right: 0,
        height: 2,
      },
      scroll: {
        flex: 1,
      },
      scrollContent: {
        padding: 20,
      },
      centerContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
      },
      challengeCard: {
        borderRadius: 16,
        marginBottom: 16,
        padding: 20,
        borderWidth: 1,
        // Borders handled inline for dynamic logic
      },
      cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 16,
      },
      headerLeft: {
        flexDirection: 'row',
        flex: 1,
      },
      iconContainer: {
        width: 40,
        height: 40,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
      },
      headerInfo: {
        flex: 1,
        justifyContent: 'center',
      },
      cardTitle: {
        fontSize: 16,
        fontWeight: '800',
        color: '#fff',
        marginBottom: 4,
        letterSpacing: 0.5,
      },
      metaRow: {
        flexDirection: 'row',
        alignItems: 'center',
      },
      metaText: {
        fontSize: 10,
        fontWeight: '700',
        color: '#666',
        letterSpacing: 0.5,
      },
      metaDot: {
        fontSize: 10,
        color: '#444',
        marginHorizontal: 6,
      },
      rewardBadge: {
        backgroundColor: 'rgba(0,0,0,0.2)',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
        borderWidth: 1,
      },
      rewardText: {
        fontSize: 10,
        fontWeight: '800',
        letterSpacing: 0.5,
      },
      cardDescription: {
        fontSize: 13,
        color: '#888',
        lineHeight: 20,
        marginBottom: 20,
      },
      progressSection: {
        backgroundColor: 'rgba(0,0,0,0.3)',
        borderRadius: 12,
        padding: 12,
        marginBottom: 20,
      },
      progressHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 8,
      },
      progressLabel: {
        fontSize: 9,
        fontWeight: '800',
        color: '#555',
        letterSpacing: 1,
      },
      progressValue: {
        fontSize: 11,
        fontWeight: '800',
        color: '#fff',
      },
      progressBarBg: {
        height: 4,
        backgroundColor: 'rgba(255,255,255,0.1)',
        borderRadius: 2,
        overflow: 'hidden',
      },
      progressBarFill: {
        height: '100%',
        borderRadius: 2,
      },
      cardFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
      },
      participants: {
        flexDirection: 'row',
        alignItems: 'center',
      },
      participantCount: {
        fontSize: 12,
        fontWeight: '600',
        color: '#666',
        marginLeft: 6,
      },
      joinBtn: {
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 10,
        minWidth: 80,
        alignItems: 'center',
        justifyContent: 'center',
      },
      joinBtnText: {
        fontSize: 11,
        fontWeight: '800',
        letterSpacing: 1,
      },
      emptyContainer: {
        flex: 1,
        alignItems: 'center',
        paddingTop: 80,
      },
      emptyIconContainer: {
        width: 80,
        height: 80,
        borderRadius: 40,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
      },
      emptyText: {
        fontSize: 14,
        fontWeight: '800',
        color: '#fff',
        marginBottom: 4,
        letterSpacing: 1,
      },
      emptySubtext: {
        fontSize: 12,
        color: '#666',
      },
    });
}