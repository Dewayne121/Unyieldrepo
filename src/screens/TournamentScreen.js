import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Dimensions,
  Animated,
  StatusBar,
  ImageBackground,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../context/ThemeContext';
import { SKINS, Spacing, BorderRadius, Typography } from '../constants/colors';
import ScreenHeader from '../components/ScreenHeader';

const { width, height } = Dimensions.get('window');
const HEADER_HEIGHT = 350;

// Mock Data
const LEADERBOARD_DATA = [
  { id: 1, name: 'Sarah Connor', score: 142, rank: 1, avatar: 'SC', change: 'up' },
  { id: 2, name: 'Alex Stratham', score: 128, rank: 2, avatar: 'AS', change: 'down' },
  { id: 3, name: 'Mike Ross', score: 115, rank: 3, avatar: 'MR', change: 'same' },
  { id: 4, name: 'John Wick', score: 102, rank: 4, avatar: 'JW', change: 'up' },
  { id: 5, name: 'Lara Croft', score: 99, rank: 5, avatar: 'LC', change: 'same' },
];

const TABS = ['BRIEFING', 'LEADERBOARD', 'REWARDS'];

export default function TournamentScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { theme, skin } = useTheme();
  const [activeTab, setActiveTab] = useState('BRIEFING');
  
  // Animation Values
  const scrollY = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
    }).start();
  }, []);

  const styles = createStyles(theme, insets);

  const renderTabContent = () => {
    switch (activeTab) {
      case 'BRIEFING':
        return <BriefingTab theme={theme} styles={styles} />;
      case 'LEADERBOARD':
        return <LeaderboardTab theme={theme} styles={styles} navigation={navigation} />;
      case 'REWARDS':
        return <RewardsTab theme={theme} styles={styles} />;
      default:
        return null;
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      {/* Immersive Header Background */}
      <View style={styles.headerContainer}>
        <LinearGradient
          colors={['#000', '#1a0505']}
          style={StyleSheet.absoluteFill}
        />
        <Image
          source={require('../../assets/logo.png')}
          style={styles.headerImage}
          resizeMode="cover"
          blurRadius={3}
        />
        <LinearGradient
          colors={['transparent', '#050505']}
          style={styles.gradientOverlay}
        />
        
        {/* Header Content */}
        <Animated.View style={[styles.headerContent, { opacity: fadeAnim }]}>
          <View style={styles.badgeContainer}>
            <LinearGradient
              colors={['#FFD700', '#FFA500']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.badge}
            >
              <Text style={styles.badgeText}>SEASON 4 • JANUARY</Text>
            </LinearGradient>
          </View>
          
          <Text style={styles.titleBig}>PUSH-UP</Text>
          <Text style={[styles.titleBig, styles.titleHighlight]}>MASTER</Text>
          
          <View style={styles.timerContainer}>
            <TimerBox value="12" label="DAYS" theme={theme} />
            <Text style={styles.timerColon}>:</Text>
            <TimerBox value="08" label="HRS" theme={theme} />
            <Text style={styles.timerColon}>:</Text>
            <TimerBox value="45" label="MIN" theme={theme} />
          </View>
        </Animated.View>
      </View>

      {/* Main Content Sheet */}
      <View style={styles.sheetContainer}>
        {/* Tabs */}
        <View style={styles.tabBar}>
          {TABS.map((tab) => (
            <TouchableOpacity
              key={tab}
              style={[styles.tabItem, activeTab === tab && styles.tabItemActive]}
              onPress={() => setActiveTab(tab)}
            >
              <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
                {tab}
              </Text>
              {activeTab === tab && <View style={styles.activeIndicator} />}
            </TouchableOpacity>
          ))}
        </View>

        <ScrollView
          style={styles.scrollContent}
          contentContainerStyle={{ paddingBottom: 100 }}
          showsVerticalScrollIndicator={false}
        >
          <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: fadeAnim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }] }}>
            {renderTabContent()}
          </Animated.View>
        </ScrollView>
      </View>

      {/* Floating Action Button */}
      <View style={[styles.fabContainer, { paddingBottom: insets.bottom + 16 }]}>
        <TouchableOpacity
          style={styles.actionButton}
          activeOpacity={0.9}
          onPress={() => navigation.navigate('LogModal')}
        >
          <LinearGradient
            colors={[theme.primary, '#7f1d1d']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.actionButtonGradient}
          >
            <Ionicons name="videocam" size={24} color="#fff" style={{ marginRight: 10 }} />
            <Text style={styles.actionButtonText}>LOG OFFICIAL ATTEMPT</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ---------------- Sub Components ----------------

function TimerBox({ value, label, theme }) {
  return (
    <View style={styles.timerBox}>
      <Text style={styles.timerValue}>{value}</Text>
      <Text style={styles.timerLabel}>{label}</Text>
    </View>
  );
}

function BriefingTab({ theme, styles }) {
  return (
    <View style={styles.tabContent}>
      {/* Objective Card */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <MaterialCommunityIcons name="target" size={24} color={theme.primary} />
          <Text style={styles.cardTitle}>OBJECTIVE</Text>
        </View>
        <Text style={styles.cardBody}>
          Complete <Text style={{ color: theme.primary, fontWeight: 'bold' }}>100 pushups</Text> in a single recorded session with perfect form.
        </Text>
        <View style={styles.statGrid}>
          <View style={styles.miniStat}>
            <Text style={styles.miniStatValue}>100</Text>
            <Text style={styles.miniStatLabel}>REPS</Text>
          </View>
          <View style={styles.miniStatDivider} />
          <View style={styles.miniStat}>
            <Text style={styles.miniStatValue}>VIDEO</Text>
            <Text style={styles.miniStatLabel}>REQUIRED</Text>
          </View>
          <View style={styles.miniStatDivider} />
          <View style={styles.miniStat}>
            <Text style={styles.miniStatValue}>1</Text>
            <Text style={styles.miniStatLabel}>SESSION</Text>
          </View>
        </View>
      </View>

      {/* Rules Card */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <MaterialCommunityIcons name="gavel" size={24} color={theme.primary} />
          <Text style={styles.cardTitle}>OFFICIAL RULES</Text>
        </View>
        <View style={styles.ruleList}>
          <RuleRow num="01" text="Chest must touch the floor (or fist height)." />
          <RuleRow num="02" text="Full lockout at the top of every rep." />
          <RuleRow num="03" text="Video must show full body from head to toe." />
          <RuleRow num="04" text="No pausing for more than 5 seconds." />
        </View>
      </View>
    </View>
  );
}

function RuleRow({ num, text }) {
  return (
    <View style={styles.ruleRow}>
      <Text style={styles.ruleNum}>{num}</Text>
      <Text style={styles.ruleText}>{text}</Text>
    </View>
  );
}

function LeaderboardTab({ theme, styles, navigation }) {
  return (
    <View style={styles.tabContent}>
      <View style={styles.leaderboardHeader}>
        <Text style={styles.leaderboardSubtitle}>CURRENT STANDINGS</Text>
        <TouchableOpacity onPress={() => navigation.navigate('Leagues')}>
          <Text style={styles.linkText}>VIEW ALL</Text>
        </TouchableOpacity>
      </View>
      
      {LEADERBOARD_DATA.map((user) => (
        <View key={user.id} style={styles.leaderRow}>
          <View style={styles.leaderLeft}>
            <View style={[styles.rankBadge, user.rank === 1 && { backgroundColor: theme.gold }]}>
              <Text style={[styles.rankText, user.rank === 1 && { color: '#000' }]}>{user.rank}</Text>
            </View>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{user.avatar}</Text>
            </View>
            <View>
              <Text style={styles.leaderName}>{user.name}</Text>
              <Text style={styles.leaderSub}>Pro Athlete</Text>
            </View>
          </View>
          <View style={styles.leaderRight}>
            <Text style={styles.leaderScore}>{user.score}</Text>
            <Text style={styles.leaderUnit}>reps</Text>
          </View>
        </View>
      ))}
    </View>
  );
}

function RewardsTab({ theme, styles }) {
  return (
    <View style={styles.tabContent}>
      <View style={styles.rewardHero}>
        <Image 
          source={require('../../assets/unyieldgold.png')} 
          style={styles.rewardImage} 
          resizeMode="contain"
        />
        <Text style={styles.rewardTitle}>LIMITED EDITION HOODIE</Text>
        <Text style={styles.rewardSubtitle}>Awarded to the winner</Text>
      </View>

      <View style={styles.rewardGrid}>
        <View style={styles.rewardItem}>
          <View style={styles.rewardIconBg}>
            <Ionicons name="trophy" size={24} color={theme.gold} />
          </View>
          <Text style={styles.rewardItemTitle}>1st Place</Text>
          <Text style={styles.rewardItemDesc}>Hoodie + Pro Lifetime</Text>
        </View>
        <View style={styles.rewardItem}>
          <View style={[styles.rewardIconBg, { borderColor: '#C0C0C0' }]}>
            <Ionicons name="medal" size={24} color="#C0C0C0" />
          </View>
          <Text style={styles.rewardItemTitle}>2nd Place</Text>
          <Text style={styles.rewardItemDesc}>1 Year Pro</Text>
        </View>
        <View style={styles.rewardItem}>
          <View style={[styles.rewardIconBg, { borderColor: '#CD7F32' }]}>
            <Ionicons name="medal" size={24} color="#CD7F32" />
          </View>
          <Text style={styles.rewardItemTitle}>3rd Place</Text>
          <Text style={styles.rewardItemDesc}>6 Months Pro</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({}); // Placeholder

function createStyles(theme, insets) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: '#050505',
    },
    headerContainer: {
      height: HEADER_HEIGHT,
      width: '100%',
      position: 'absolute',
      top: 0,
      zIndex: 0,
    },
    headerImage: {
      width: '100%',
      height: '100%',
      opacity: 0.2,
      transform: [{ scale: 1.1 }],
    },
    gradientOverlay: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      height: 200,
    },
    headerContent: {
      position: 'absolute',
      bottom: 60,
      left: 0,
      right: 0,
      paddingHorizontal: 24,
      alignItems: 'center',
    },
    badgeContainer: {
      marginBottom: 16,
      shadowColor: '#FFD700',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.6,
      shadowRadius: 10,
      elevation: 5,
    },
    badge: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 100,
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.2)',
    },
    badgeText: {
      color: '#000',
      fontSize: 11,
      fontWeight: '900',
      letterSpacing: 1,
    },
    titleBig: {
      fontSize: 48,
      fontWeight: '900',
      color: '#fff',
      letterSpacing: -2,
      lineHeight: 48,
      textShadowColor: 'rgba(0,0,0,0.8)',
      textShadowOffset: { width: 0, height: 4 },
      textShadowRadius: 8,
    },
    titleHighlight: {
      color: theme.primary,
      fontSize: 56,
      marginTop: -8,
      textShadowColor: theme.primary,
      textShadowOffset: { width: 0, height: 0 },
      textShadowRadius: 15,
    },
    timerContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 24,
      backgroundColor: 'rgba(0,0,0,0.6)',
      padding: 12,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.1)',
    },
    timerBox: {
      alignItems: 'center',
      minWidth: 40,
    },
    timerValue: {
      fontSize: 20,
      fontWeight: '800',
      color: '#fff',
      fontVariant: ['tabular-nums'],
    },
    timerLabel: {
      fontSize: 9,
      fontWeight: '700',
      color: '#888',
      marginTop: 2,
    },
    timerColon: {
      fontSize: 20,
      fontWeight: '800',
      color: '#444',
      marginHorizontal: 8,
      marginBottom: 12,
    },
    sheetContainer: {
      flex: 1,
      marginTop: HEADER_HEIGHT - 40,
      backgroundColor: '#050505',
      borderTopLeftRadius: 30,
      borderTopRightRadius: 30,
      overflow: 'hidden',
    },
    tabBar: {
      flexDirection: 'row',
      borderBottomWidth: 1,
      borderBottomColor: 'rgba(255,255,255,0.1)',
      paddingHorizontal: 16,
    },
    tabItem: {
      flex: 1,
      alignItems: 'center',
      paddingVertical: 16,
    },
    tabItemActive: {
      
    },
    tabText: {
      fontSize: 12,
      fontWeight: '700',
      color: '#666',
      letterSpacing: 1,
    },
    tabTextActive: {
      color: '#fff',
    },
    activeIndicator: {
      position: 'absolute',
      bottom: 0,
      width: 40,
      height: 3,
      backgroundColor: theme.primary,
      borderRadius: 2,
    },
    scrollContent: {
      flex: 1,
      padding: 24,
    },
    tabContent: {
      gap: 20,
    },
    card: {
      backgroundColor: '#111',
      borderRadius: 20,
      padding: 20,
      borderWidth: 1,
      borderColor: '#222',
    },
    cardHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 16,
    },
    cardTitle: {
      fontSize: 14,
      fontWeight: '800',
      color: '#fff',
      marginLeft: 10,
      letterSpacing: 1,
    },
    cardBody: {
      fontSize: 15,
      color: '#ccc',
      lineHeight: 24,
      marginBottom: 20,
    },
    statGrid: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: 'rgba(255,255,255,0.03)',
      borderRadius: 12,
      padding: 16,
    },
    miniStat: {
      flex: 1,
      alignItems: 'center',
    },
    miniStatValue: {
      fontSize: 18,
      fontWeight: '800',
      color: '#fff',
    },
    miniStatLabel: {
      fontSize: 9,
      fontWeight: '700',
      color: '#666',
      marginTop: 4,
    },
    miniStatDivider: {
      width: 1,
      height: 24,
      backgroundColor: 'rgba(255,255,255,0.1)',
    },
    ruleList: {
      gap: 12,
    },
    ruleRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
    },
    ruleNum: {
      fontSize: 14,
      fontWeight: '800',
      color: '#444',
      width: 30,
      marginTop: 2,
    },
    ruleText: {
      flex: 1,
      fontSize: 14,
      color: '#ccc',
      lineHeight: 20,
    },
    leaderboardHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 10,
    },
    leaderboardSubtitle: {
      fontSize: 12,
      fontWeight: '800',
      color: '#666',
      letterSpacing: 1,
    },
    linkText: {
      fontSize: 12,
      fontWeight: '700',
      color: theme.primary,
    },
    leaderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: '#111',
      padding: 16,
      borderRadius: 16,
      marginBottom: 8,
      borderWidth: 1,
      borderColor: '#222',
    },
    leaderLeft: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    rankBadge: {
      width: 24,
      height: 24,
      borderRadius: 8,
      backgroundColor: '#222',
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 12,
    },
    rankText: {
      fontSize: 12,
      fontWeight: '800',
      color: '#888',
    },
    avatar: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: '#222',
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 12,
      borderWidth: 1,
      borderColor: '#333',
    },
    avatarText: {
      fontSize: 14,
      fontWeight: '700',
      color: '#fff',
    },
    leaderName: {
      fontSize: 14,
      fontWeight: '700',
      color: '#fff',
    },
    leaderSub: {
      fontSize: 11,
      color: '#666',
    },
    leaderRight: {
      alignItems: 'flex-end',
    },
    leaderScore: {
      fontSize: 16,
      fontWeight: '800',
      color: theme.gold,
    },
    leaderUnit: {
      fontSize: 10,
      color: '#666',
    },
    rewardHero: {
      alignItems: 'center',
      padding: 20,
      marginBottom: 20,
    },
    rewardImage: {
      width: 150,
      height: 150,
      marginBottom: 16,
      tintColor: theme.gold,
    },
    rewardTitle: {
      fontSize: 20,
      fontWeight: '800',
      color: theme.gold,
      textAlign: 'center',
      marginBottom: 4,
    },
    rewardSubtitle: {
      fontSize: 14,
      color: '#888',
    },
    rewardGrid: {
      gap: 12,
    },
    rewardItem: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: '#111',
      padding: 16,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: '#222',
    },
    rewardIconBg: {
      width: 44,
      height: 44,
      borderRadius: 22,
      borderWidth: 1,
      borderColor: theme.gold,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 16,
      backgroundColor: 'rgba(255,255,255,0.03)',
    },
    rewardItemTitle: {
      flex: 1,
      fontSize: 16,
      fontWeight: '700',
      color: '#fff',
    },
    rewardItemDesc: {
      fontSize: 12,
      color: '#888',
      fontWeight: '600',
    },
    fabContainer: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      paddingHorizontal: 20,
    },
    actionButton: {
      shadowColor: theme.primary,
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.5,
      shadowRadius: 16,
      elevation: 10,
    },
    actionButtonGradient: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 18,
      borderRadius: 16,
    },
    actionButtonText: {
      fontSize: 16,
      fontWeight: '900',
      color: '#fff',
      letterSpacing: 1,
    },
  });
}
