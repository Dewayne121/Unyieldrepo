import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Dimensions, Modal, ActivityIndicator, TextInput, Platform, ActionSheetIOS, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Video } from 'expo-av';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import api from '../services/api';
import ScreenHeader from '../components/ScreenHeader';

// Conditional import for expo-video-thumbnails (not available on web)
let VideoThumbnails;
try {
  VideoThumbnails = require('expo-video-thumbnails');
} catch (e) {
  VideoThumbnails = null;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const LS_WORKOUT_VIDEOS = 'unyield_workout_videos';

// Profile options
const REGIONS = ['Global', 'London', 'Manchester', 'Birmingham', 'Leeds', 'Glasgow'];
const GOALS = ['Hypertrophy', 'Leanness', 'Performance'];

// Fitness levels
const FITNESS_LEVELS = [
  { id: 'beginner', title: 'Recruit', description: 'Just starting the journey', icon: 'leaf-outline', color: '#10B981' },
  { id: 'intermediate', title: 'Regular', description: 'Consistent training', icon: 'barbell-outline', color: '#3B82F6' },
  { id: 'advanced', title: 'Veteran', description: 'Highly experienced', icon: 'fitness-outline', color: '#8B5CF6' },
  { id: 'elite', title: 'Elite', description: 'Top tier performance', icon: 'trophy-outline', color: '#F59E0B' },
];

// Workout frequencies
const WORKOUT_FREQUENCIES = [
  { id: '1-2', title: '1-2 days', subtitle: 'Casual', description: 'Maintenance mode' },
  { id: '3-4', title: '3-4 days', subtitle: 'Standard', description: 'Building strength' },
  { id: '5-6', title: '5-6 days', subtitle: 'Serious', description: 'High volume' },
  { id: '7', title: 'Every day', subtitle: 'Relentless', description: 'Maximum effort' },
];

const TRAINING_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

// Helper functions for video storage
async function getWorkoutVideos() {
  try {
    const existing = await AsyncStorage.getItem(LS_WORKOUT_VIDEOS);
    return existing ? JSON.parse(existing) : [];
  } catch (e) {
    return [];
  }
}

async function deleteWorkoutVideo(videoId, serverId, type = 'workout') {
  try {
    if (serverId) {
      if (type === 'challenge') {
        await api.deleteChallengeSubmission(serverId);
      } else {
        await api.deleteVideo(serverId);
      }
    }
    const existing = await AsyncStorage.getItem(LS_WORKOUT_VIDEOS);
    const videos = existing ? JSON.parse(existing) : [];
    const filtered = videos.filter(v => v.id !== videoId);
    await AsyncStorage.setItem(LS_WORKOUT_VIDEOS, JSON.stringify(filtered));
  } catch (e) {
    console.error('Error deleting video:', e);
    throw e;
  }
}

async function clearAllLocalVideos() {
  try {
    await AsyncStorage.removeItem(LS_WORKOUT_VIDEOS);
    return true;
  } catch (e) {
    return false;
  }
}

export default function ProfileScreen({ route, navigation }) {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const { user: currentUser, weightUnit, toggleWeightUnit, heightUnit, toggleHeightUnit } = useApp();
  const { signOut, deleteAccount, updateUserProfile, refreshUser } = useAuth();

  // Profile state
  const [viewedUser, setViewedUser] = useState(null);
  const [isOwnProfile, setIsOwnProfile] = useState(true);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [workoutVideos, setWorkoutVideos] = useState([]);
  const [videoThumbnails, setVideoThumbnails] = useState({});
  const [refreshKey, setRefreshKey] = useState(0);
  const [selectedVideo, setSelectedVideo] = useState(null);
  const videoRef = useRef(null);
  const lastRefreshRef = useRef(0);
  const thumbnailRequestsRef = useRef(new Set());

  // Edit Profile Modal state
  const [showEditProfileModal, setShowEditProfileModal] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);

  // Edit form fields
  const [editName, setEditName] = useState('');
  const [editBio, setEditBio] = useState('');
  const [editRegion, setEditRegion] = useState('Global');
  const [editGoal, setEditGoal] = useState('Hypertrophy');
  const [editProfileImage, setEditProfileImage] = useState(null);
  const [editFitnessLevel, setEditFitnessLevel] = useState(null);
  const [editWorkoutFrequency, setEditWorkoutFrequency] = useState(null);
  const [editPreferredDays, setEditPreferredDays] = useState([]);
  const [editWeight, setEditWeight] = useState('');
  const [editHeight, setEditHeight] = useState('');
  const [editAge, setEditAge] = useState('');

  // Inline editing states
  const [editingBioInline, setEditingBioInline] = useState(false);
  const [inlineBioText, setInlineBioText] = useState('');
  const [savingInlineBio, setSavingInlineBio] = useState(false);

  // Settings modal state
  const [showSettingsModal, setShowSettingsModal] = useState(false);

  const userId = route?.params?.userId;
  const currentUserId = currentUser?.id ?? currentUser?._id;
  const isViewingOtherUser = Boolean(userId && String(userId) !== String(currentUserId));

  // Load user profile
  useEffect(() => {
    // If we're already viewing this user, don't reload unless it's a refresh
    if (viewedUser && (viewedUser.id === userId || viewedUser._id === userId)) {
      setLoadingProfile(false);
      return;
    }

    // Immediate loading state to prevent flicker of old data
    setLoadingProfile(true);
    // Clear previous user immediately to avoid showing stale data
    setViewedUser(null);

    const loadUserProfile = async () => {
      setIsOwnProfile(!isViewingOtherUser);
      if (isViewingOtherUser) {
        setLoadingProfile(true);
        try {
          const response = await api.getUserById(userId);
          if (response.success && response.data) {
            setViewedUser(response.data);
          } else {
            setViewedUser(null);
          }
        } catch (err) {
          setViewedUser(null);
        } finally {
          setLoadingProfile(false);
        }
      } else {
        (async () => {
          try {
            const response = await api.getProfile();
            if (response.success && response.data) {
              setViewedUser(response.data);
            } else {
              setViewedUser(currentUser);
            }
          } catch (error) {
            setViewedUser(currentUser);
          }
          setLoadingProfile(false);
        })();
      }
    };
    loadUserProfile();
  }, [isViewingOtherUser, userId, currentUser]);

  useFocusEffect(
    useCallback(() => {
      const now = Date.now();
      const timeSinceLastRefresh = now - lastRefreshRef.current;
      const isFirstMount = lastRefreshRef.current === 0;
      if (isOwnProfile && refreshUser && (isFirstMount || timeSinceLastRefresh > 30000)) {
        lastRefreshRef.current = now;
        refreshUser().catch(() => {});
      }
    }, [isOwnProfile, refreshUser])
  );

  const loadWorkoutVideos = useCallback(async () => {
    try {
      let allVideos = [];
      if (!isViewingOtherUser) {
        const videoResponse = await api.getMyVideos();
        let challengeResponse = { success: false, data: [] };
        try {
          challengeResponse = await api.getMyChallengeSubmissions();
        } catch (e) {}

        if (videoResponse.success && videoResponse.data) {
          allVideos.push(...videoResponse.data.map(v => ({
            id: v._id,
            serverId: v._id,
            uri: v.videoUrl,
            exercise: v.exercise,
            reps: v.reps,
            weight: v.weight,
            date: v.createdAt,
            points: v.reps * 10,
            duration: v.duration,
            status: v.status,
            approved: v.status === 'approved',
            rejectionReason: v.rejectionReason,
            type: 'workout',
          })));
        }

        if (challengeResponse.success && challengeResponse.data) {
          allVideos.push(...challengeResponse.data.map(v => ({
            id: v._id,
            serverId: v._id,
            uri: v.videoUrl,
            exercise: v.exercise,
            reps: v.reps,
            weight: v.weight,
            date: v.submittedAt || v.createdAt,
            points: v.value || 0,
            duration: v.duration,
            status: v.status,
            approved: v.status === 'approved',
            rejectionReason: v.rejectionReason,
            type: 'challenge',
            challengeTitle: v.challenge?.title,
          })));
        }

        allVideos.sort((a, b) => new Date(b.date) - new Date(a.date));

        if (allVideos.length === 0) {
          const localVideos = await getWorkoutVideos();
          allVideos = localVideos.map(v => ({ ...v, status: v.status || 'pending', type: 'workout' }));
        }
        setWorkoutVideos(allVideos);
      } else if (userId) {
        const response = await api.getUserVideos(userId);
        if (response.success && response.data) {
          setWorkoutVideos(response.data.map(v => ({
            id: v._id,
            serverId: v._id,
            uri: v.videoUrl,
            exercise: v.exercise,
            reps: v.reps,
            weight: v.weight,
            date: v.submittedAt || v.createdAt,
            points: v.type === 'challenge' ? (v.value || 0) : ((v.reps || 0) * 10),
            status: v.status,
            approved: v.status === 'approved',
            type: v.type,
          })));
        } else {
          setWorkoutVideos([]);
        }
      }
    } catch (err) {
      if (!isViewingOtherUser) {
        const videos = await getWorkoutVideos();
        setWorkoutVideos(videos);
      } else {
        setWorkoutVideos([]);
      }
    }
  }, [isViewingOtherUser, userId]);

  useFocusEffect(
    useCallback(() => {
      loadWorkoutVideos();
    }, [loadWorkoutVideos])
  );

  useEffect(() => {
    if (refreshKey > 0) loadWorkoutVideos();
  }, [refreshKey, loadWorkoutVideos]);

  useEffect(() => {
    let isCancelled = false;
    const generateThumbnails = async () => {
      const pendingVideos = workoutVideos.filter((video) => {
        if (!video?.uri) return false;
        if (videoThumbnails[video.id]) return false;
        if (thumbnailRequestsRef.current.has(video.id)) return false;
        return true;
      });

      for (const video of pendingVideos) {
        thumbnailRequestsRef.current.add(video.id);
        try {
          if (VideoThumbnails) {
            const { uri } = await VideoThumbnails.getThumbnailAsync(video.uri, { time: 500 });
            if (!isCancelled && uri) {
              setVideoThumbnails(prev => ({ ...prev, [video.id]: uri }));
            }
          }
        } catch (error) {}
      }
    };
    generateThumbnails();
    return () => { isCancelled = true; };
  }, [workoutVideos, videoThumbnails]);

  const handleBack = () => {
    if (navigation.canGoBack()) navigation.goBack();
    else navigation.navigate('Home');
  };

  const handleEditProfile = () => {
    setEditName(viewedUser?.name || '');
    setEditBio(viewedUser?.bio || '');
    setEditRegion(viewedUser?.region || 'Global');
    setEditGoal(viewedUser?.goal || 'Hypertrophy');
    setEditProfileImage(viewedUser?.profileImage || null);
    setEditFitnessLevel(viewedUser?.fitnessLevel || 'beginner');
    setEditWorkoutFrequency(viewedUser?.workoutFrequency || '3-4');
    setEditPreferredDays(viewedUser?.preferredDays || []);
    setEditAge(viewedUser?.age ? String(viewedUser.age) : '');

    let w = viewedUser?.weight;
    if (w && weightUnit === 'lbs') w = Math.round(w * 2.20462);
    setEditWeight(w ? String(w) : '');

    let h = viewedUser?.height;
    if (h && heightUnit === 'ft') h = (h * 0.0328084).toFixed(2);
    setEditHeight(h ? String(h) : '');

    setShowSettingsModal(false);
    setShowEditProfileModal(true);
  };

  const handleCloseEditModal = () => {
    setShowEditProfileModal(false);
    resetEditForm();
  };

  const resetEditForm = () => {
    setEditName('');
    setEditBio('');
    // ... reset others
  };

  const handleSaveProfile = async () => {
    if (!editName.trim()) return Alert.alert('Error', 'Display name required.');
    setSavingProfile(true);
    try {
      const updates = {
        name: editName.trim(),
        bio: editBio.trim(),
        region: editRegion,
        goal: editGoal,
        fitnessLevel: editFitnessLevel,
        workoutFrequency: editWorkoutFrequency,
        preferredDays: editPreferredDays,
      };

      if (editProfileImage && editProfileImage !== viewedUser?.profileImage) {
        updates.profileImage = editProfileImage;
      }

      if (editWeight) {
        let w = parseFloat(editWeight);
        if (!isNaN(w)) {
          if (weightUnit === 'lbs') w = w / 2.20462;
          updates.weight = Math.round(w * 10) / 10;
        }
      }

      if (editHeight) {
        let h = parseFloat(editHeight);
        if (!isNaN(h)) {
          if (heightUnit === 'ft') h = h / 0.0328084;
          updates.height = Math.round(h);
        }
      }

      if (editAge) {
        const a = parseInt(editAge);
        if (!isNaN(a)) updates.age = a;
      }

      const result = await updateUserProfile(updates);
      if (result.success) {
        setViewedUser(result.data);
        setRefreshKey(prev => prev + 1);
        setShowEditProfileModal(false);
        Alert.alert('Success', 'Profile updated');
      } else {
        Alert.alert('Error', 'Update failed');
      }
    } catch (e) {
      Alert.alert('Error', 'Update failed');
    } finally {
      setSavingProfile(false);
    }
  };

  const handlePickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') return Alert.alert('Permission needed', 'Allow camera access');
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
        base64: true,
      });
      if (!result.canceled && result.assets[0]?.base64) {
        setEditProfileImage(`data:image/jpeg;base64,${result.assets[0].base64}`);
      }
    } catch (e) {
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  const toggleDay = (day) => {
    setEditPreferredDays(prev => prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]);
  };

  const handleEditBioInline = () => { setInlineBioText(bio || ''); setEditingBioInline(true); };
  const handleCancelInlineBio = () => { setEditingBioInline(false); };
  const handleSaveInlineBio = async () => { /* logic */ setEditingBioInline(false); };

  const handleDeleteVideo = (video) => {
    Alert.alert('Delete', 'Delete this video?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try {
          await deleteWorkoutVideo(video.id, video.serverId, video.type);
          setRefreshKey(prev => prev + 1);
        } catch (e) {}
      }}
    ]);
  };

  const handleClearLocalVideos = async () => {
    Alert.alert('Clear Videos', 'This removes local video cache.', [
        { text: 'Cancel' },
        { text: 'Clear', style: 'destructive', onPress: async () => {
            await clearAllLocalVideos();
            setRefreshKey(prev => prev + 1);
        }}
    ]);
  };

  const handleDeleteAccount = () => {
    Alert.alert('Delete Account', 'This is permanent.', [
        { text: 'Cancel' },
        { text: 'Delete', style: 'destructive', onPress: async () => {
            await deleteAccount();
        }}
    ]);
  };

  const handleQuickChangeGoal = () => {
    Alert.alert('Select Goal', '', GOALS.map(g => ({
        text: g,
        onPress: async () => {
            const res = await updateUserProfile({ goal: g });
            if(res.success) {
                setViewedUser(prev => ({ ...prev, goal: g }));
                setRefreshKey(prev => prev + 1);
            }
        }
    })));
  };

  const handleQuickChangeRegion = () => {
    Alert.alert('Select Region', '', REGIONS.map(r => ({
        text: r,
        onPress: async () => {
            const res = await updateUserProfile({ region: r });
            if(res.success) {
                setViewedUser(prev => ({ ...prev, region: r }));
                setRefreshKey(prev => prev + 1);
            }
        }
    })));
  };

  if (loadingProfile || !viewedUser) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  const displayName = viewedUser?.name || viewedUser?.username || 'Operator';
  const handle = viewedUser?.username ? `@${viewedUser.username}` : '@' + displayName.toLowerCase().replace(/\s/g, '_');
  const workouts = viewedUser?.logs?.length || 0;
  const points = viewedUser?.totalPoints || 0;
  const streak = viewedUser?.streak || 0;
  const bio = viewedUser?.bio || '';

  const formatPoints = (p) => p >= 1000 ? (p / 1000).toFixed(1) + 'k' : p.toString();

  // Accolades
  const hasAdmin = viewedUser?.accolades?.includes('admin');
  const hasCommunity = viewedUser?.accolades?.includes('community_support');

  return (
    <View style={styles.container}>
      <ScreenHeader
        title="PROFILE"
        subtitle={isOwnProfile ? "PERSONNEL FILE" : "DOSSIER"}
        showBackButton={true}
        onBackPress={handleBack}
        rightAction={isOwnProfile ? (
          <TouchableOpacity onPress={() => setShowSettingsModal(true)} style={styles.iconBtn}>
            <Ionicons name="settings-sharp" size={20} color="#fff" />
          </TouchableOpacity>
        ) : null}
      />

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.profileHero}>
          <View style={styles.avatarContainer}>
            {viewedUser?.profileImage ? (
              <Image source={{ uri: viewedUser.profileImage }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, styles.avatarPlaceholder]}>
                <Text style={styles.avatarInitials}>{displayName.substring(0, 2).toUpperCase()}</Text>
              </View>
            )}
            <View style={styles.rankBadge}>
               <Text style={styles.rankBadgeText}>{viewedUser?.fitnessLevel === 'elite' ? 'ELITE' : 'OPr'}</Text>
            </View>
          </View>

          <Text style={styles.userName}>{displayName}</Text>
          <Text style={styles.userHandle}>{handle}</Text>

          {/* Inline Bio */}
          <View style={styles.bioSection}>
             {bio ? (
               <Text style={styles.bioText}>{bio}</Text>
             ) : isOwnProfile ? (
               <TouchableOpacity onPress={handleEditProfile}>
                 <Text style={styles.bioPlaceholder}>Add service record...</Text>
               </TouchableOpacity>
             ) : null}
          </View>
        </View>

        {/* Stats Matrix */}
        <View style={styles.statsMatrix}>
          <View style={styles.statItem}>
            <Text style={styles.statVal}>{workouts}</Text>
            <Text style={styles.statLabel}>LOGS</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={[styles.statVal, { color: theme.primary }]}>{formatPoints(points)}</Text>
            <Text style={styles.statLabel}>MERIT</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statVal}>{streak}</Text>
            <Text style={styles.statLabel}>STREAK</Text>
          </View>
        </View>

        {/* Info Grid - Interactive */}
        <View style={styles.infoGrid}>
           <TouchableOpacity style={styles.infoCard} onPress={isOwnProfile ? handleQuickChangeRegion : null} activeOpacity={isOwnProfile ? 0.7 : 1}>
              <Text style={styles.infoLabel}>REGION</Text>
              <View style={{flexDirection: 'row', alignItems: 'center'}}>
                <Text style={styles.infoValue}>{viewedUser?.region || 'Unknown'}</Text>
                {isOwnProfile && <Ionicons name="create-outline" size={12} color="#666" style={{marginLeft: 4}} />}
              </View>
           </TouchableOpacity>
           <TouchableOpacity style={styles.infoCard} onPress={isOwnProfile ? handleQuickChangeGoal : null} activeOpacity={isOwnProfile ? 0.7 : 1}>
              <Text style={styles.infoLabel}>OBJECTIVE</Text>
              <View style={{flexDirection: 'row', alignItems: 'center'}}>
                <Text style={styles.infoValue}>{viewedUser?.goal || 'Classified'}</Text>
                {isOwnProfile && <Ionicons name="create-outline" size={12} color="#666" style={{marginLeft: 4}} />}
              </View>
           </TouchableOpacity>
        </View>

        {/* Workout Videos Section */}
        {workoutVideos.length > 0 && (
          <View style={styles.videosSection}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>EVIDENCE LOG</Text>
              <Text style={styles.sectionCount}>{workoutVideos.length}</Text>
            </View>

            <View style={styles.videosGrid}>
              {workoutVideos.map((video, index) => {
                const thumbnailUri = video.thumbnailUrl || videoThumbnails[video.id];
                return (
                  <TouchableOpacity
                    key={video.id}
                    style={styles.videoCard}
                    onPress={() => setSelectedVideo(video)}
                    activeOpacity={0.8}
                  >
                    <View style={styles.videoThumbnail}>
                      {thumbnailUri ? (
                        <Image source={{ uri: thumbnailUri }} style={styles.videoThumbnailImage} resizeMode="cover" />
                      ) : (
                        <View style={styles.videoThumbnailFallback}>
                          <Ionicons name="videocam" size={24} color="#333" />
                        </View>
                      )}
                      <View style={styles.videoOverlay}>
                         <View style={styles.videoStatus}>
                            {video.approved ? (
                                <Ionicons name="checkmark-circle" size={12} color="#00d4aa" />
                            ) : video.status === 'rejected' ? (
                                <Ionicons name="alert-circle" size={12} color="#ff003c" />
                            ) : (
                                <Ionicons name="time" size={12} color="#eab308" />
                            )}
                         </View>
                      </View>
                    </View>
                    <Text style={styles.videoExercise} numberOfLines={1}>{video.exercise}</Text>
                    <Text style={styles.videoMeta}>{video.reps}x • +{video.points} XP</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Settings Modal */}
      <Modal visible={showSettingsModal} transparent animationType="fade" onRequestClose={() => setShowSettingsModal(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowSettingsModal(false)}>
          <View style={styles.settingsSheet}>
            <View style={styles.settingsHandle} />
            <Text style={styles.settingsTitle}>SETTINGS</Text>
            
            {(hasAdmin || hasCommunity) && (
                <TouchableOpacity style={styles.settingItem} onPress={() => { setShowSettingsModal(false); navigation.navigate('AdminDashboard'); }}>
                    <Ionicons name="shield-checkmark" size={20} color={theme.primary} />
                    <Text style={[styles.settingText, { color: theme.primary }]}>Admin Panel</Text>
                </TouchableOpacity>
            )}

            <TouchableOpacity style={styles.settingItem} onPress={handleEditProfile}>
               <Ionicons name="person" size={20} color="#fff" />
               <Text style={styles.settingText}>Edit Profile</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.settingItem} onPress={toggleWeightUnit}>
               <Ionicons name="scale" size={20} color="#fff" />
               <Text style={styles.settingText}>Unit: {weightUnit.toUpperCase()}</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.settingItem} onPress={handleClearLocalVideos}>
               <Ionicons name="trash-bin-outline" size={20} color="#fff" />
               <Text style={styles.settingText}>Clear Cache</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.settingItem} onPress={signOut}>
               <Ionicons name="log-out" size={20} color="#ff003c" />
               <Text style={[styles.settingText, { color: '#ff003c' }]}>Sign Out</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.settingItem, { borderBottomWidth: 0 }]} onPress={handleDeleteAccount}>
               <Ionicons name="close-circle-outline" size={20} color="#666" />
               <Text style={[styles.settingText, { color: '#666', fontSize: 14 }]}>Delete Account</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Edit Profile Modal (Restored) */}
      <Modal visible={showEditProfileModal} animationType="slide" presentationStyle="pageSheet" onRequestClose={handleCloseEditModal}>
        <View style={styles.editModalContainer}>
            <View style={styles.editModalHeader}>
                <TouchableOpacity onPress={handleCloseEditModal}>
                    <Text style={styles.editModalCancelText}>Cancel</Text>
                </TouchableOpacity>
                <Text style={styles.editModalTitle}>Edit Profile</Text>
                <TouchableOpacity onPress={handleSaveProfile} disabled={savingProfile}>
                    {savingProfile ? <ActivityIndicator color={theme.primary} /> : <Text style={styles.editModalSaveText}>Save</Text>}
                </TouchableOpacity>
            </View>
            <ScrollView style={styles.editModalScroll}>
                <View style={styles.formCard}>
                    <Text style={styles.cardLabel}>PUBLIC INFO</Text>
                    <View style={styles.inputGroup}>
                        <Text style={styles.inputLabel}>Display Name</Text>
                        <TextInput style={styles.modernInput} value={editName} onChangeText={setEditName} placeholder="Name" placeholderTextColor="#555" />
                    </View>
                    <View style={styles.inputGroup}>
                        <Text style={styles.inputLabel}>Bio</Text>
                        <TextInput style={[styles.modernInput, styles.textArea]} value={editBio} onChangeText={setEditBio} placeholder="Bio" placeholderTextColor="#555" multiline />
                    </View>
                </View>

                <View style={styles.formCard}>
                    <Text style={styles.cardLabel}>STATS</Text>
                    <View style={styles.statsRow}>
                        <View style={styles.statInputWrap}>
                            <Text style={styles.statInputLabel}>Weight ({weightUnit})</Text>
                            <TextInput style={styles.statInput} value={editWeight} onChangeText={setEditWeight} keyboardType="decimal-pad" placeholder="--" placeholderTextColor="#555" />
                        </View>
                        <View style={styles.statInputWrap}>
                            <Text style={styles.statInputLabel}>Height ({heightUnit || 'cm'})</Text>
                            <TextInput style={styles.statInput} value={editHeight} onChangeText={setEditHeight} keyboardType="decimal-pad" placeholder="--" placeholderTextColor="#555" />
                        </View>
                    </View>
                </View>
            </ScrollView>
        </View>
      </Modal>

      {/* Video Modal */}
      <Modal visible={selectedVideo !== null} animationType="fade" onRequestClose={() => setSelectedVideo(null)}>
        <View style={styles.videoModalContainer}>
          <TouchableOpacity style={styles.videoModalClose} onPress={() => setSelectedVideo(null)}>
            <Ionicons name="close" size={32} color="#fff" />
          </TouchableOpacity>
          {selectedVideo && (
            <Video
              source={{ uri: selectedVideo.uri }}
              style={styles.fullScreenVideo}
              useNativeControls
              resizeMode="contain"
              shouldPlay
            />
          )}
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#050505' },
  loadingContainer: { justifyContent: 'center', alignItems: 'center' },
  iconBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center', borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.05)' },
  scroll: { flex: 1 },
  
  // Hero
  profileHero: { alignItems: 'center', paddingVertical: 32, paddingHorizontal: 20 },
  avatarContainer: { marginBottom: 16 },
  avatar: { width: 100, height: 100, borderRadius: 50, borderWidth: 2, borderColor: '#1a1a1a' },
  avatarPlaceholder: { backgroundColor: '#1a1a1a', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#333' },
  avatarInitials: { fontSize: 32, fontWeight: '800', color: '#fff' },
  rankBadge: { position: 'absolute', bottom: 0, right: 0, backgroundColor: '#9b2c2c', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4, borderWidth: 2, borderColor: '#050505' },
  rankBadgeText: { fontSize: 10, fontWeight: '900', color: '#fff' },
  userName: { fontSize: 20, fontWeight: '800', color: '#fff', letterSpacing: 0.5, marginBottom: 4 },
  userHandle: { fontSize: 12, color: '#666', fontWeight: '600' },
  
  bioSection: { marginTop: 12, paddingHorizontal: 32 },
  bioText: { fontSize: 13, color: '#888', textAlign: 'center', lineHeight: 18 },
  bioPlaceholder: { fontSize: 13, color: '#444', fontStyle: 'italic' },

  // Stats
  statsMatrix: { flexDirection: 'row', backgroundColor: '#111', marginHorizontal: 20, marginTop: 24, borderRadius: 16, padding: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  statItem: { flex: 1, alignItems: 'center' },
  statVal: { fontSize: 20, fontWeight: '800', color: '#fff', marginBottom: 4 },
  statLabel: { fontSize: 10, fontWeight: '800', color: '#555', letterSpacing: 1 },
  statDivider: { width: 1, height: 24, backgroundColor: 'rgba(255,255,255,0.1)' },

  // Info Grid
  infoGrid: { flexDirection: 'row', paddingHorizontal: 20, marginTop: 12, gap: 12 },
  infoCard: { flex: 1, backgroundColor: '#0f0f0f', padding: 16, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.03)' },
  infoLabel: { fontSize: 10, fontWeight: '800', color: '#444', marginBottom: 6, letterSpacing: 1 },
  infoValue: { fontSize: 13, fontWeight: '700', color: '#ccc' },

  // Videos
  videosSection: { paddingHorizontal: 20, marginTop: 32 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16, alignItems: 'center' },
  sectionTitle: { fontSize: 12, fontWeight: '800', color: '#666', letterSpacing: 1 },
  sectionCount: { fontSize: 12, fontWeight: '800', color: '#9b2c2c' },
  videosGrid: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -6 },
  videoCard: { width: (SCREEN_WIDTH - 40 - 12) / 3, marginHorizontal: 2, marginBottom: 12 },
  videoThumbnail: { aspectRatio: 1, backgroundColor: '#1a1a1a', borderRadius: 8, overflow: 'hidden', marginBottom: 6 },
  videoThumbnailImage: { width: '100%', height: '100%' },
  videoThumbnailFallback: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  videoOverlay: { position: 'absolute', top: 4, right: 4 },
  videoStatus: { backgroundColor: 'rgba(0,0,0,0.6)', padding: 4, borderRadius: 4 },
  videoExercise: { fontSize: 11, fontWeight: '700', color: '#ddd', marginBottom: 2 },
  videoMeta: { fontSize: 10, color: '#666' },

  // Settings
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'flex-end' },
  settingsSheet: { backgroundColor: '#161616', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 48 },
  settingsHandle: { width: 40, height: 4, backgroundColor: '#333', borderRadius: 2, alignSelf: 'center', marginBottom: 24 },
  settingsTitle: { fontSize: 12, fontWeight: '900', color: '#444', marginBottom: 16, letterSpacing: 1 },
  settingItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)', gap: 16 },
  settingText: { fontSize: 16, fontWeight: '600', color: '#fff' },

  // Edit Modal Styles
  editModalContainer: { flex: 1, backgroundColor: '#0a0a0a' },
  editModalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#222' },
  editModalTitle: { fontSize: 16, fontWeight: '700', color: '#fff' },
  editModalCancelText: { color: '#888', fontSize: 16 },
  editModalSaveText: { color: '#9b2c2c', fontSize: 16, fontWeight: '700' },
  editModalScroll: { flex: 1, padding: 20 },
  formCard: { marginBottom: 24 },
  cardLabel: { fontSize: 12, fontWeight: '800', color: '#666', marginBottom: 12 },
  inputGroup: { marginBottom: 16 },
  inputLabel: { fontSize: 12, color: '#888', marginBottom: 8 },
  modernInput: { backgroundColor: '#1a1a1a', borderRadius: 12, padding: 16, color: '#fff', fontSize: 16 },
  textArea: { minHeight: 100, textAlignVertical: 'top' },
  statsRow: { flexDirection: 'row', gap: 16 },
  statInputWrap: { flex: 1 },
  statInputLabel: { fontSize: 12, color: '#888', marginBottom: 8 },
  statInput: { backgroundColor: '#1a1a1a', borderRadius: 12, padding: 16, color: '#fff', fontSize: 16, textAlign: 'center' },

  // Video Modal
  videoModalContainer: { flex: 1, backgroundColor: '#000', justifyContent: 'center' },
  videoModalClose: { position: 'absolute', top: 50, right: 20, zIndex: 10 },
  fullScreenVideo: { width: '100%', height: 300 },
});