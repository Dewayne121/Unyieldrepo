import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  TextInput,
  Dimensions,
  RefreshControl,
} from 'react-native';
import CustomAlert, { useCustomAlert } from '../../components/CustomAlert';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'react-native';
import { Video } from 'expo-av';
import api from '../../services/api';
import {
  ADMIN_COLORS,
  ADMIN_SPACING,
  ADMIN_RADIUS,
  ADMIN_TYPOGRAPHY,
  ADMIN_SHADOWS,
  ADMIN_SURFACES,
} from '../../constants/adminTheme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const C = ADMIN_COLORS;
const S = ADMIN_SPACING;
const R = ADMIN_RADIUS;
const T = ADMIN_TYPOGRAPHY;

// Filter options
const SOURCE_FILTERS = {
  all: { label: 'All Types', value: 'all' },
  workout: { label: 'Workouts', value: 'workout', icon: 'fitness' },
  challenge: { label: 'Challenges', value: 'challenge', icon: 'trophy' },
};

const DATE_FILTERS = {
  all: { label: 'All Time', value: 'all' },
  today: { label: 'Today', value: 'today' },
  week: { label: 'This Week', value: 'week' },
};

export default function VideoModerationScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [videos, setVideos] = useState([]);
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [showOriginal, setShowOriginal] = useState(false); // Toggle for blurred/original
  const [rejectionReason, setRejectionReason] = useState('');
  const [pointsOverride, setPointsOverride] = useState('');
  const [showRejectionModal, setShowRejectionModal] = useState(false);
  const [showPointsModal, setShowPointsModal] = useState(false);
  const [filterExercise, setFilterExercise] = useState('');
  const [debouncedExercise, setDebouncedExercise] = useState('');
  const [sourceFilter, setSourceFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  const videoRef = useRef(null);
  const { alertConfig, showAlert, hideAlert } = useCustomAlert();

  useEffect(() => {
    const handle = setTimeout(() => {
      setDebouncedExercise(filterExercise.trim());
    }, 400);

    return () => clearTimeout(handle);
  }, [filterExercise]);

  // Filter videos by date
  const filterByDate = (videos, dateFilter) => {
    if (dateFilter === 'all') return videos;

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const weekStart = todayStart - (7 * 24 * 60 * 60 * 1000);

    return videos.filter(video => {
      const videoDate = new Date(video.createdAt || video.submittedAt || 0).getTime();
      if (dateFilter === 'today') {
        return videoDate >= todayStart;
      } else if (dateFilter === 'week') {
        return videoDate >= weekStart;
      }
      return true;
    });
  };

  // Filter videos by source
  const filterBySource = (videos, sourceFilter) => {
    if (sourceFilter === 'all') return videos;
    return videos.filter(video => video.source === sourceFilter);
  };

  const loadVideos = async () => {
    console.log('[VIDEO MODERATION] Loading videos...');
    try {
      setLoading(true);
      const params = {};
      if (debouncedExercise) {
        params.exercise = debouncedExercise;
      }
      console.log('[VIDEO MODERATION] Fetching pending videos with params:', params);

      const [response, challengeResponse] = await Promise.all([
        api.getAdminPendingVideos(params),
        api.getPendingChallengeSubmissions({ limit: 50 }).catch((error) => {
          console.warn('[VIDEO MODERATION] Challenge submissions unavailable:', error.message);
          return null;
        }),
      ]);

      console.log('[VIDEO MODERATION] Response:', {
        success: response.success,
        hasData: !!response.data,
        videoCount: response.data?.videos?.length || 0,
        total: response.data?.pagination?.total || 0
      });

      if (response.success && response.data) {
        console.log('[VIDEO MODERATION] Loaded', response.data.videos?.length || 0, 'videos');
        const workoutVideos = (response.data.videos || []).map((video) => ({
          ...video,
          id: video._id || video.id,
          source: 'workout',
        }));
        const challengeSubmissionsRaw = challengeResponse?.success ? (challengeResponse.data || []) : [];
        const challengeSubmissions = challengeSubmissionsRaw
          .filter((submission) => {
            if (!debouncedExercise) return true;
            return String(submission.exercise || '')
              .toLowerCase()
              .includes(debouncedExercise.toLowerCase());
          })
          .map((submission) => ({
            ...submission,
            id: submission.id || submission._id,
            source: 'challenge',
            createdAt: submission.submittedAt || submission.createdAt,
          }));
        let combined = [...workoutVideos, ...challengeSubmissions];
        // Apply source filter
        combined = filterBySource(combined, sourceFilter);
        // Apply date filter
        combined = filterByDate(combined, dateFilter);
        combined.sort((a, b) => {
          const aTime = new Date(a.createdAt || a.submittedAt || 0).getTime();
          const bTime = new Date(b.createdAt || b.submittedAt || 0).getTime();
          return aTime - bTime;
        });
        setVideos(combined);
      } else {
        console.error('[VIDEO MODERATION] Response not successful:', response);
        setVideos([]);
      }
    } catch (err) {
      console.error('[VIDEO MODERATION] Error loading videos:', err);
      showAlert({
        title: 'Error',
        message: err.message || 'Failed to load videos',
        icon: 'error',
        buttons: [{ text: 'OK', style: 'default' }]
      });
      setVideos([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadVideos();
  }, [debouncedExercise, sourceFilter, dateFilter]);

  const onRefresh = () => {
    setRefreshing(true);
    loadVideos();
  };

  const handleVerifyWorkout = async (videoId, action, reason = '', pointsValue = null) => {
    console.log('[VIDEO MODERATION] handleVerifyWorkout called:', { videoId, action, reason, pointsValue });
    try {
      setVerifying(true);

      console.log('[VIDEO MODERATION] Calling adminVerifyVideo with:', { videoId, action, reason, pointsValue });

      const response = await api.adminVerifyVideo(videoId, action, reason, pointsValue);

      console.log('[VIDEO MODERATION] Verify response:', response);

      if (response.success) {
        // Remove the video from the list
        setVideos(prev => prev.filter(v => v.id !== videoId));
        setSelectedVideo(null);
        setPointsOverride('');

        // Handle orphan video case
        if (response.data?.deleted) {
          showAlert({
            title: 'Removed',
            message: response.message || 'Orphan video removed',
            icon: 'info',
            buttons: [{ text: 'OK', style: 'default' }]
          });
        } else {
          showAlert({
            title: 'Success',
            message: action === 'approve' ? 'Video approved successfully' : 'Video rejected',
            icon: 'success',
            buttons: [{ text: 'OK', style: 'default' }]
          });
        }
      } else {
        console.error('[VIDEO MODERATION] Verify failed:', response);
        showAlert({
          title: 'Error',
          message: response.error || 'Failed to verify video',
          icon: 'error',
          buttons: [{ text: 'OK', style: 'default' }]
        });
      }
    } catch (err) {
      console.error('[VIDEO MODERATION] Error verifying video:', err);
      showAlert({
        title: 'Error',
        message: err.message || 'Failed to verify video',
        icon: 'error',
        buttons: [{ text: 'OK', style: 'default' }]
      });
    } finally {
      setVerifying(false);
    }
  };

  const handleVerifyChallenge = async (submissionId, action, reason = '') => {
    console.log('[VIDEO MODERATION] handleVerifyChallenge called:', { submissionId, action, reason });
    try {
      setVerifying(true);
      const response = await api.verifyChallengeSubmission(submissionId, action, reason);
      if (response.success) {
        setVideos(prev => prev.filter(v => v.id !== submissionId));
        setSelectedVideo(null);
        setRejectionReason('');
        showAlert({
          title: 'Success',
          message: action === 'approve' ? 'Challenge entry approved' : 'Challenge entry rejected',
          icon: 'success',
          buttons: [{ text: 'OK', style: 'default' }]
        });
      } else {
        showAlert({
          title: 'Error',
          message: response.error || 'Failed to verify challenge entry',
          icon: 'error',
          buttons: [{ text: 'OK', style: 'default' }]
        });
      }
    } catch (err) {
      console.error('[VIDEO MODERATION] Error verifying challenge submission:', err);
      showAlert({
        title: 'Error',
        message: err.message || 'Failed to verify challenge entry',
        icon: 'error',
        buttons: [{ text: 'OK', style: 'default' }]
      });
    } finally {
      setVerifying(false);
    }
  };

  const handleApprove = (video) => {
    const targetVideo = video || selectedVideo;
    console.log('[VIDEO MODERATION] handleApprove called with:', { videoId: targetVideo?.id, source: targetVideo?.source });

    if (!targetVideo) {
      showAlert({
        title: 'Error',
        message: 'No video selected',
        icon: 'error',
        buttons: [{ text: 'OK', style: 'default' }]
      });
      return;
    }

    if (!targetVideo.id) {
      showAlert({
        title: 'Error',
        message: 'Video ID is missing',
        icon: 'error',
        buttons: [{ text: 'OK', style: 'default' }]
      });
      return;
    }

    const videoId = targetVideo.id;
    const isChallenge = targetVideo.source === 'challenge';

    if (isChallenge) {
      showAlert({
        title: 'Approve Challenge Entry',
        message: 'Approve this challenge submission?',
        buttons: [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Approve',
            style: 'default',
            onPress: () => {
              console.log('[VIDEO MODERATION] Approving challenge:', videoId);
              handleVerifyChallenge(videoId, 'approve');
            }
          },
        ]
      });
      return;
    }

    // For workout videos, go straight to auto approve or show points modal
    showAlert({
      title: 'Approve Video',
      message: 'Award points for this video?',
      buttons: [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Approve',
          style: 'default',
          onPress: () => {
            console.log('[VIDEO MODERATION] Approving workout video:', videoId);
            handleVerifyWorkout(videoId, 'approve');
          },
        },
      ]
    });
  };

  const confirmApproveWithPoints = () => {
    if (!selectedVideo) {
      showAlert({
        title: 'Error',
        message: 'No video selected',
        icon: 'error',
        buttons: [{ text: 'OK', style: 'default' }]
      });
      return;
    }
    setShowPointsModal(false);
    const pointsValue = pointsOverride ? parseInt(pointsOverride) : null;
    handleVerifyWorkout(selectedVideo.id, 'approve', '', pointsValue);
  };

  const handleReject = (video) => {
    const targetVideo = video || selectedVideo;
    if (!targetVideo) {
      showAlert({
        title: 'Error',
        message: 'No video selected',
        icon: 'error',
        buttons: [{ text: 'OK', style: 'default' }]
      });
      return;
    }
    setSelectedVideo(targetVideo);
    setRejectionReason('');
    setShowRejectionModal(true);
  };

  const confirmReject = () => {
    if (!selectedVideo) {
      showAlert({
        title: 'Error',
        message: 'No video selected',
        icon: 'error',
        buttons: [{ text: 'OK', style: 'default' }]
      });
      return;
    }
    if (!rejectionReason.trim()) {
      showAlert({
        title: 'Required',
        message: 'Please provide a reason for rejection',
        icon: 'warning',
        buttons: [{ text: 'OK', style: 'default' }]
      });
      return;
    }
    setShowRejectionModal(false);
    if (selectedVideo.source === 'challenge') {
      handleVerifyChallenge(selectedVideo.id, 'reject', rejectionReason);
    } else {
      handleVerifyWorkout(selectedVideo.id, 'reject', rejectionReason);
    }
  };

  const VideoCard = ({ video, onPress }) => {
    const userName = String(video.user?.name || 'Unknown');
    const userHandle = video.user?.username ? String(`@${video.user.username}`) : '';
    const exerciseLabel = String(video.exercise || video.challenge?.title || 'Challenge Submission');
    const reps = Number(video.reps) || 0;
    const weight = Number(video.weight) || 0;
    const points = reps * 1.5 + weight * 0.1;
    const dateStr = video.createdAt || video.submittedAt;
    const formattedDate = dateStr
      ? `${new Date(dateStr).toLocaleDateString()} • ${new Date(dateStr).toLocaleTimeString()}`
      : 'Unknown date';

    return (
      <TouchableOpacity
        style={styles.videoCard}
        onPress={() => onPress(video)}
        activeOpacity={0.7}
      >
        <View style={styles.videoThumbnail}>
          <Ionicons name="play-circle" size={40} color={C.white} />
          <View style={styles.videoOverlay}>
            <Text style={styles.videoExercise}>{exerciseLabel}</Text>
            <Text style={styles.videoStats}>{`${reps} reps × ${weight}kg`}</Text>
            <Text style={styles.videoUser}>{userName}</Text>
          </View>
        </View>

        <View style={styles.videoInfo}>
          <View style={styles.videoHeader}>
            <View>
              <Text style={styles.videoUserName}>{userName}</Text>
              {userHandle ? <Text style={styles.videoUserHandle}>{userHandle}</Text> : null}
            </View>
            <View style={styles.videoPointsBadge}>
              <Text style={styles.videoPointsText}>{`~${Math.round(points)} XP`}</Text>
            </View>
          </View>

          <View style={styles.videoDetails}>
            <View style={styles.videoDetailItem}>
              <Ionicons name="barbell" size={14} color={C.textSubtle} />
              <Text style={styles.videoDetailText}>{exerciseLabel}</Text>
            </View>
            <View style={styles.videoDetailItem}>
              <Ionicons name="repeat" size={14} color={C.textSubtle} />
              <Text style={styles.videoDetailText}>{`${reps} reps`}</Text>
            </View>
            {weight > 0 ? (
              <View style={styles.videoDetailItem}>
                <Ionicons name="fitness" size={14} color={C.textSubtle} />
                <Text style={styles.videoDetailText}>{`${weight}kg`}</Text>
              </View>
            ) : null}
          </View>

          <View style={styles.videoActions}>
            <TouchableOpacity
              style={[styles.actionButton, styles.approveButton]}
              onPress={() => handleApprove(video)}
            >
              <Ionicons name="checkmark" size={16} color={C.white} />
              <Text style={styles.actionButtonText}>Approve</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, styles.rejectButton]}
              onPress={() => handleReject(video)}
            >
              <Ionicons name="close" size={16} color={C.white} />
              <Text style={styles.actionButtonText}>Reject</Text>
            </TouchableOpacity>
          </View>
        </View>

        <Text style={styles.videoDate}>{formattedDate}</Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={20} color={C.white} />
        </TouchableOpacity>
        <Text style={styles.pageTitle}>Video Moderation</Text>
        <View style={styles.headerRight}>
          <Text style={styles.queueCount}>{videos.length}</Text>
        </View>
      </View>

      {/* Search/Filter */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color={C.textSubtle} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Filter by exercise..."
          placeholderTextColor={C.textSubtle}
          value={filterExercise}
          onChangeText={setFilterExercise}
          autoCapitalize="none"
        />
        {filterExercise.length > 0 && (
          <TouchableOpacity onPress={() => setFilterExercise('')} style={styles.clearButton}>
            <Ionicons name="close-circle" size={20} color={C.textSubtle} />
          </TouchableOpacity>
        )}
      </View>

      {/* Filter Chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filtersScroll}
        contentContainerStyle={styles.filtersContent}
      >
        {/* Source Filter */}
        <View style={styles.filterGroup}>
          <Text style={styles.filterGroupLabel}>Type</Text>
          {Object.values(SOURCE_FILTERS).map((filter) => (
            <TouchableOpacity
              key={filter.value}
              style={[styles.filterChip, sourceFilter === filter.value && styles.filterChipActive]}
              onPress={() => setSourceFilter(filter.value)}
              activeOpacity={0.7}
            >
              <Ionicons
                name={filter.icon}
                size={14}
                color={sourceFilter === filter.value ? C.white : C.textSubtle}
              />
              <Text style={[styles.filterChipText, sourceFilter === filter.value && styles.filterChipTextActive]}>
                {filter.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.filterDivider} />

        {/* Date Filter */}
        <View style={styles.filterGroup}>
          <Text style={styles.filterGroupLabel}>Date</Text>
          {Object.values(DATE_FILTERS).map((filter) => (
            <TouchableOpacity
              key={filter.value}
              style={[styles.filterChip, dateFilter === filter.value && styles.filterChipActive]}
              onPress={() => setDateFilter(filter.value)}
              activeOpacity={0.7}
            >
              <Ionicons
                name={filter.value === 'all' ? 'calendar' : filter.value === 'today' ? 'today' : 'time'}
                size={14}
                color={dateFilter === filter.value ? C.white : C.textSubtle}
              />
              <Text style={[styles.filterChipText, dateFilter === filter.value && styles.filterChipTextActive]}>
                {filter.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Reset Filters */}
        {(sourceFilter !== 'all' || dateFilter !== 'all' || filterExercise.length > 0) && (
          <>
            <View style={styles.filterDivider} />
            <TouchableOpacity
              style={styles.resetButton}
              onPress={() => {
                setSourceFilter('all');
                setDateFilter('all');
                setFilterExercise('');
              }}
              activeOpacity={0.7}
            >
              <Ionicons name="refresh" size={14} color={C.danger} />
              <Text style={styles.resetButtonText}>Reset</Text>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>

      {/* Videos List */}
      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={C.accent} />
          <Text style={styles.loadingText}>Loading pending videos...</Text>
        </View>
      ) : videos.length === 0 ? (
        <View style={styles.centerContainer}>
          <Ionicons name="checkmark-circle-outline" size={64} color={C.success} />
          <Text style={styles.emptyText}>All caught up!</Text>
          <Text style={styles.emptySubtext}>No pending videos to review</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.accent} />
          }
          showsVerticalScrollIndicator={false}
        >
          {videos.map(video => (
            <VideoCard
              key={video.id}
              video={video}
              onPress={(v) => setSelectedVideo(v)}
            />
          ))}
          <View style={styles.bottomSpacer} />
        </ScrollView>
      )}

      {/* Video Detail Modal */}
      <Modal visible={selectedVideo !== null} animationType="slide">
        <View style={styles.modalContainer}>
          {/* Close Button */}
          <TouchableOpacity
            style={styles.modalClose}
            onPress={() => {
              setSelectedVideo(null);
              setShowOriginal(false);
              if (videoRef.current) {
                videoRef.current.stopAsync();
              }
            }}
          >
            <Ionicons name="close" size={32} color={C.white} />
          </TouchableOpacity>

          {selectedVideo && (
            <>
              {/* Show Original Toggle - Only if video has originalUrl */}
              {selectedVideo.originalVideoUrl && (
                <TouchableOpacity
                  style={[styles.toggleOriginalBtn, showOriginal && styles.toggleOriginalBtnActive]}
                  onPress={() => {
                    setShowOriginal(!showOriginal);
                    // Stop and restart video when switching
                    if (videoRef.current) {
                      videoRef.current.stopAsync();
                    }
                  }}
                >
                  <Ionicons
                    name={showOriginal ? "eye" : "eye-off"}
                    size={18}
                    color={showOriginal ? C.success : C.white}
                  />
                  <Text style={[styles.toggleOriginalText, showOriginal && { color: C.success }]}>
                    {showOriginal ? "SHOWING ORIGINAL" : "SHOWING BLURRED"}
                  </Text>
                  <Text style={styles.toggleOriginalHint}>
                    {showOriginal ? " (tap to blur)" : " (tap to unmask)"}
                  </Text>
                </TouchableOpacity>
              )}

              {/* Video Player */}
              {selectedVideo.videoUrl ? (
                <Video
                  key={showOriginal ? 'original' : 'blurred'}
                  ref={videoRef}
                  source={{ uri: showOriginal && selectedVideo.originalVideoUrl ? selectedVideo.originalVideoUrl : selectedVideo.videoUrl }}
                  style={styles.videoPlayer}
                  useNativeControls
                  resizeMode="contain"
                  shouldPlay
                />
              ) : (
                <View style={styles.noVideoContainer}>
                  <Ionicons name="videocam-off" size={64} color={C.textSubtle} />
                  <Text style={styles.noVideoText}>Video not available</Text>
                </View>
              )}

              {/* Video Info */}
              <View style={styles.modalInfo}>
                <View style={styles.modalUserInfo}>
                  {selectedVideo.user?.profileImage ? (
                    <Image
                      source={{ uri: selectedVideo.user.profileImage }}
                      style={styles.modalAvatar}
                    />
                  ) : (
                    <View style={styles.modalAvatarPlaceholder}>
                      <Text style={styles.modalAvatarInitial}>
                        {String(selectedVideo.user?.name || '?')[0].toUpperCase()}
                      </Text>
                    </View>
                  )}
                  <View style={styles.modalUserDetails}>
                    <Text style={styles.modalUserName}>{String(selectedVideo.user?.name || 'Unknown')}</Text>
                    <Text style={styles.modalUserHandle}>{`@${selectedVideo.user?.username || 'unknown'}`}</Text>
                    <View style={styles.modalUserStats}>
                      <Text style={styles.modalUserStat}>{`${Number(selectedVideo.user?.totalPoints || 0)} XP`}</Text>
                      <Text style={styles.modalUserStatSeparator}>•</Text>
                      <Text style={styles.modalUserStat}>{`Rank ${Number(selectedVideo.user?.rank || 99)}`}</Text>
                      <Text style={styles.modalUserStatSeparator}>•</Text>
                      <Text style={styles.modalUserStat}>{String(selectedVideo.user?.region || 'Global')}</Text>
                    </View>
                  </View>
                </View>

                <View style={styles.modalWorkoutInfo}>
                  <Text style={styles.modalExercise}>
                    {String(selectedVideo.exercise || selectedVideo.challenge?.title || 'Challenge Submission')}
                  </Text>
                  <View style={styles.modalStats}>
                    <View style={styles.modalStat}>
                      <Ionicons name="repeat" size={18} color={C.textSubtle} />
                      <Text style={styles.modalStatText}>{`${Number(selectedVideo.reps || 0)} reps`}</Text>
                    </View>
                    {Number(selectedVideo.weight || 0) > 0 ? (
                      <View style={styles.modalStat}>
                        <Ionicons name="fitness" size={18} color={C.textSubtle} />
                        <Text style={styles.modalStatText}>{`${Number(selectedVideo.weight || 0)}kg`}</Text>
                      </View>
                    ) : null}
                    {selectedVideo.duration ? (
                      <View style={styles.modalStat}>
                        <Ionicons name="time" size={18} color={C.textSubtle} />
                        <Text style={styles.modalStatText}>
                          {`${Math.floor(Number(selectedVideo.duration) / 60)}:${(Number(selectedVideo.duration) % 60).toString().padStart(2, '0')}`}
                        </Text>
                      </View>
                    ) : null}
                  </View>
                </View>

                {/* Action Buttons */}
                <View style={styles.modalActions}>
                  <TouchableOpacity
                    style={[styles.modalActionButton, styles.modalApproveButton]}
                    onPress={() => handleApprove(selectedVideo)}
                    disabled={verifying}
                  >
                    <Ionicons name="checkmark" size={24} color={C.white} />
                    <Text style={styles.modalActionText}>Approve</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.modalActionButton, styles.modalRejectButton]}
                    onPress={() => handleReject(selectedVideo)}
                    disabled={verifying}
                  >
                    <Ionicons name="close" size={24} color={C.white} />
                    <Text style={styles.modalActionText}>Reject</Text>
                  </TouchableOpacity>
                </View>

                {/* User's Video History */}
                {(selectedVideo.userVideoHistory?.length || 0) > 0 ? (
                  <View style={styles.modalHistory}>
                    <Text style={styles.modalHistoryTitle}>User's Recent Videos</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                      {selectedVideo.userVideoHistory.map((historyVideo, index) => (
                        <View
                          key={historyVideo.id || historyVideo._id || String(index)}
                          style={[
                            styles.historyItem,
                            historyVideo.status === 'approved' ? styles.historyItemApproved : null,
                            historyVideo.status === 'rejected' ? styles.historyItemRejected : null,
                          ]}
                        >
                          <Text style={styles.historyExercise}>{String(historyVideo.exercise || 'Unknown')}</Text>
                          <Text style={styles.historyStats}>{`${Number(historyVideo.reps || 0)} × ${Number(historyVideo.weight || 0)}kg`}</Text>
                          <Text style={styles.historyStatus}>{String(historyVideo.status || 'pending')}</Text>
                        </View>
                      ))}
                    </ScrollView>
                  </View>
                ) : null}
              </View>
            </>
          )}
        </View>
      </Modal>

      {/* Rejection Modal */}
      <Modal visible={showRejectionModal} transparent animationType="fade">
        <View style={styles.rejectionModalOverlay}>
          <View style={styles.rejectionModalContent}>
            <Text style={styles.rejectionModalTitle}>Reject Video</Text>
            <Text style={styles.rejectionModalSubtitle}>
              Please provide a reason for rejection
            </Text>

            <TextInput
              style={styles.rejectionInput}
              placeholder="Enter rejection reason..."
              placeholderTextColor={C.textSubtle}
              value={rejectionReason}
              onChangeText={setRejectionReason}
              multiline
              numberOfLines={4}
              autoFocus
            />

            <View style={styles.rejectionModalButtons}>
              <TouchableOpacity
                style={[styles.rejectionModalButton, styles.rejectionCancelButton]}
                onPress={() => setShowRejectionModal(false)}
              >
                <Text style={styles.rejectionCancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.rejectionModalButton, styles.rejectionConfirmButton]}
                onPress={confirmReject}
              >
                <Text style={styles.rejectionConfirmButtonText}>Reject</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Points Modal */}
      <Modal visible={showPointsModal} transparent animationType="fade">
        <View style={styles.rejectionModalOverlay}>
          <View style={styles.rejectionModalContent}>
            <Text style={styles.rejectionModalTitle}>Set Custom Points</Text>
            <Text style={styles.rejectionModalSubtitle}>
              Enter the points to award for this video
            </Text>

            <TextInput
              style={styles.rejectionInput}
              placeholder="Enter points..."
              placeholderTextColor={C.textSubtle}
              value={pointsOverride}
              onChangeText={setPointsOverride}
              keyboardType="number-pad"
              autoFocus
            />

            <View style={styles.rejectionModalButtons}>
              <TouchableOpacity
                style={[styles.rejectionModalButton, styles.rejectionCancelButton]}
                onPress={() => setShowPointsModal(false)}
              >
                <Text style={styles.rejectionCancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.rejectionModalButton, styles.rejectionConfirmButton]}
                onPress={confirmApproveWithPoints}
              >
                <Text style={styles.rejectionConfirmButtonText}>Award</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Custom Alert */}
      <CustomAlert {...alertConfig} onClose={hideAlert} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: ADMIN_SURFACES.page,
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: S.xl,
    paddingBottom: S.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: C.border,
  },
  backButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: C.card,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: S.md,
    borderWidth: 1,
    borderColor: C.border,
  },
  pageTitle: {
    ...T.h2,
    flex: 1,
  },
  headerRight: {
    width: 40,
    alignItems: 'flex-end',
  },
  queueCount: {
    fontSize: 12,
    fontWeight: '700',
    color: C.accent,
    letterSpacing: 1,
  },
  // Toggle Original Button
  toggleOriginalBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: C.card,
    marginHorizontal: S.lg,
    marginVertical: S.sm,
    paddingVertical: S.sm,
    paddingHorizontal: S.md,
    borderRadius: R.sm,
    borderWidth: 1,
    borderColor: C.border,
  },
  toggleOriginalBtnActive: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderColor: C.success,
  },
  toggleOriginalText: {
    fontSize: 12,
    fontWeight: '700',
    color: C.white,
    letterSpacing: 0.5,
    marginLeft: 6,
  },
  toggleOriginalHint: {
    fontSize: 10,
    color: C.textSubtle,
    marginLeft: 4,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.panel,
    marginHorizontal: S.xl,
    marginVertical: S.md,
    paddingHorizontal: S.md,
    borderRadius: R.md,
    height: 42,
    borderWidth: 1,
    borderColor: C.border,
  },
  searchIcon: { marginRight: 8 },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: C.text,
    fontFamily: T.body.fontFamily,
  },
  clearButton: { padding: 4 },
  filtersScroll: {
    marginBottom: S.sm,
  },
  filtersContent: {
    paddingHorizontal: S.xl,
    alignItems: 'center',
  },
  filterGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: S.md,
  },
  filterGroupLabel: {
    ...T.caption,
    marginRight: S.sm,
    color: C.textSubtle,
  },
  filterDivider: {
    width: 1,
    height: 18,
    backgroundColor: C.borderSoft,
    marginHorizontal: S.sm,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: S.sm,
    paddingVertical: 6,
    backgroundColor: C.card,
    borderRadius: R.pill,
    marginRight: S.xs,
    borderWidth: 1,
    borderColor: C.border,
    gap: 4,
  },
  filterChipActive: {
    backgroundColor: C.accent,
    borderColor: C.accent,
  },
  filterChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: C.textSubtle,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  filterChipTextActive: {
    color: C.white,
  },
  resetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: S.sm,
    paddingVertical: 6,
    backgroundColor: 'transparent',
    borderRadius: R.pill,
    borderWidth: 1,
    borderColor: C.danger,
    gap: 4,
  },
  resetButtonText: {
    fontSize: 11,
    fontWeight: '700',
    color: C.danger,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: S.xl,
  },
  loadingText: { marginTop: S.md, ...T.bodyMuted },
  emptyText: { marginTop: S.md, ...T.h2 },
  emptySubtext: { marginTop: S.sm, ...T.bodyMuted },
  scroll: { flex: 1 },
  scrollContent: { padding: S.xl, paddingBottom: S.xxl },
  bottomSpacer: { height: 20 },
  videoCard: {
    backgroundColor: C.card,
    borderRadius: R.lg,
    overflow: 'hidden',
    marginBottom: S.md,
    borderWidth: 1,
    borderColor: C.border,
    ...ADMIN_SHADOWS.soft,
  },
  videoThumbnail: {
    height: 180,
    backgroundColor: C.surface,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  videoOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.6)',
    padding: 12,
  },
  videoExercise: {
    fontSize: 15,
    fontWeight: '700',
    color: C.white,
    marginBottom: 4,
  },
  videoStats: {
    fontSize: 12,
    color: C.textMuted,
    marginBottom: 2,
  },
  videoUser: {
    fontSize: 11,
    color: C.textSubtle,
  },
  videoInfo: { padding: 12 },
  videoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: S.sm,
  },
  videoUserName: { fontSize: 13, fontWeight: '600', color: C.text },
  videoUserHandle: { fontSize: 11, color: C.textSubtle },
  videoPointsBadge: {
    backgroundColor: C.accentSoft,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: R.md,
    borderWidth: 1,
    borderColor: C.accent,
  },
  videoPointsText: {
    fontSize: 11,
    fontWeight: '700',
    color: C.accent,
  },
  videoDetails: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: S.sm,
  },
  videoDetailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
    marginBottom: 4,
  },
  videoDetailText: { fontSize: 11, color: C.textSubtle, marginLeft: 4 },
  videoActions: { flexDirection: 'row', gap: 8 },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: R.md,
    gap: 6,
  },
  approveButton: { backgroundColor: C.success },
  rejectButton: { backgroundColor: C.danger },
  actionButtonText: { fontSize: 12, fontWeight: '700', color: C.white },
  videoDate: {
    fontSize: 10,
    color: C.textSubtle,
    paddingHorizontal: 12,
    paddingBottom: 12,
  },
  modalContainer: { flex: 1, backgroundColor: C.bg },
  modalClose: {
    position: 'absolute',
    top: 50,
    right: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  videoPlayer: { width: SCREEN_WIDTH, height: SCREEN_WIDTH * 0.75, backgroundColor: C.black },
  noVideoContainer: {
    width: SCREEN_WIDTH,
    height: SCREEN_WIDTH * 0.75,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: C.surface,
  },
  noVideoText: { marginTop: 12, fontSize: 12, color: C.textSubtle },
  modalInfo: {
    flex: 1,
    backgroundColor: C.panel,
    borderTopLeftRadius: R.xl,
    borderTopRightRadius: R.xl,
    padding: S.xl,
    marginTop: -20,
  },
  modalUserInfo: { flexDirection: 'row', marginBottom: S.lg },
  modalAvatar: { width: 52, height: 52, borderRadius: 26, marginRight: 12 },
  modalAvatarPlaceholder: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: C.accent,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  modalAvatarInitial: { fontSize: 20, fontWeight: '700', color: C.white },
  modalUserDetails: { flex: 1 },
  modalUserName: { fontSize: 15, fontWeight: '700', color: C.text, marginBottom: 2 },
  modalUserHandle: { fontSize: 11, color: C.textSubtle, marginBottom: 6 },
  modalUserStats: { flexDirection: 'row', alignItems: 'center' },
  modalUserStat: { fontSize: 10, color: C.textSubtle },
  modalUserStatSeparator: { fontSize: 8, color: C.textSubtle, marginHorizontal: 6 },
  modalWorkoutInfo: {
    backgroundColor: C.card,
    borderRadius: R.lg,
    padding: S.md,
    marginBottom: S.md,
    borderWidth: 1,
    borderColor: C.border,
  },
  modalExercise: { fontSize: 18, fontWeight: '700', color: C.text, marginBottom: 10 },
  modalStats: { flexDirection: 'row', gap: 16 },
  modalStat: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  modalStatText: { fontSize: 12, color: C.textSubtle },
  modalActions: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  modalActionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: R.md,
    gap: 8,
  },
  modalApproveButton: { backgroundColor: C.success },
  modalRejectButton: { backgroundColor: C.danger },
  modalActionText: { fontSize: 14, fontWeight: '700', color: C.white },
  modalHistory: {
    backgroundColor: C.card,
    borderRadius: R.lg,
    padding: S.md,
    borderWidth: 1,
    borderColor: C.border,
  },
  modalHistoryTitle: { ...T.caption, marginBottom: S.sm },
  historyItem: {
    backgroundColor: C.surface,
    borderRadius: R.md,
    padding: S.sm,
    marginRight: 12,
    minWidth: 140,
    borderWidth: 1,
    borderColor: C.border,
  },
  historyItemApproved: { borderColor: C.success },
  historyItemRejected: { borderColor: C.danger },
  historyExercise: { fontSize: 12, fontWeight: '600', color: C.text, marginBottom: 4 },
  historyStats: { fontSize: 11, color: C.textSubtle, marginBottom: 4 },
  historyStatus: { fontSize: 10, color: C.textSubtle, textTransform: 'uppercase' },
  rejectionModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  rejectionModalContent: {
    backgroundColor: C.card,
    borderRadius: R.lg,
    padding: S.lg,
    width: '100%',
    maxWidth: 420,
    borderWidth: 1,
    borderColor: C.border,
  },
  rejectionModalTitle: { ...T.h2, marginBottom: 8 },
  rejectionModalSubtitle: { ...T.bodyMuted, marginBottom: S.md },
  rejectionInput: {
    backgroundColor: C.panel,
    borderRadius: R.md,
    padding: S.md,
    fontSize: 13,
    color: C.text,
    borderWidth: 1,
    borderColor: C.border,
    marginBottom: S.md,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  rejectionModalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  rejectionModalButton: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: R.md,
  },
  rejectionCancelButton: { backgroundColor: C.surface },
  rejectionConfirmButton: { backgroundColor: C.danger },
  rejectionCancelButtonText: { fontSize: 12, fontWeight: '600', color: C.text },
  rejectionConfirmButtonText: { fontSize: 12, fontWeight: '600', color: C.white },
});
