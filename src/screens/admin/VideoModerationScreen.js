import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
  TextInput,
  Dimensions,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'react-native';
import { Video } from 'expo-av';
import api from '../../services/api';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function VideoModerationScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [videos, setVideos] = useState([]);
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [pointsOverride, setPointsOverride] = useState('');
  const [showRejectionModal, setShowRejectionModal] = useState(false);
  const [showPointsModal, setShowPointsModal] = useState(false);
  const [filterExercise, setFilterExercise] = useState('');
  const [debouncedExercise, setDebouncedExercise] = useState('');
  const videoRef = useRef(null);

  useEffect(() => {
    const handle = setTimeout(() => {
      setDebouncedExercise(filterExercise.trim());
    }, 400);

    return () => clearTimeout(handle);
  }, [filterExercise]);

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
        const combined = [...workoutVideos, ...challengeSubmissions];
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
      Alert.alert('Error', err.message || 'Failed to load videos');
      setVideos([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadVideos();
  }, [debouncedExercise]);

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
          Alert.alert('Removed', response.message || 'Orphan video removed');
        } else {
          Alert.alert('Success', action === 'approve' ? 'Video approved' : 'Video rejected');
        }
      } else {
        console.error('[VIDEO MODERATION] Verify failed:', response);
        Alert.alert('Error', response.error || 'Failed to verify video');
      }
    } catch (err) {
      console.error('[VIDEO MODERATION] Error verifying video:', err);
      Alert.alert('Error', err.message || 'Failed to verify video');
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
        Alert.alert('Success', action === 'approve' ? 'Challenge entry approved' : 'Challenge entry rejected');
      } else {
        Alert.alert('Error', response.error || 'Failed to verify challenge entry');
      }
    } catch (err) {
      console.error('[VIDEO MODERATION] Error verifying challenge submission:', err);
      Alert.alert('Error', err.message || 'Failed to verify challenge entry');
    } finally {
      setVerifying(false);
    }
  };

  const handleApprove = (video) => {
    const targetVideo = video || selectedVideo;
    if (!targetVideo) {
      Alert.alert('Error', 'No video selected');
      return;
    }
    if (targetVideo.source === 'challenge') {
      Alert.alert(
        'Approve Challenge Entry',
        'Approve this challenge submission?',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Approve', onPress: () => handleVerifyChallenge(targetVideo.id, 'approve') },
        ]
      );
      return;
    }
    Alert.alert(
      'Approve Video',
      'Award points for this video?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Auto Calculate',
          onPress: () => handleVerifyWorkout(targetVideo.id, 'approve'),
        },
        {
          text: 'Set Custom Points',
          onPress: () => {
            setSelectedVideo(targetVideo);
            setShowPointsModal(true);
          },
        },
      ]
    );
  };

  const confirmApproveWithPoints = () => {
    if (!selectedVideo) {
      Alert.alert('Error', 'No video selected');
      return;
    }
    setShowPointsModal(false);
    const pointsValue = pointsOverride ? parseInt(pointsOverride) : null;
    handleVerifyWorkout(selectedVideo.id, 'approve', '', pointsValue);
  };

  const handleReject = (video) => {
    const targetVideo = video || selectedVideo;
    if (!targetVideo) {
      Alert.alert('Error', 'No video selected');
      return;
    }
    setSelectedVideo(targetVideo);
    setRejectionReason('');
    setShowRejectionModal(true);
  };

  const confirmReject = () => {
    if (!selectedVideo) {
      Alert.alert('Error', 'No video selected');
      return;
    }
    if (!rejectionReason.trim()) {
      Alert.alert('Required', 'Please provide a reason for rejection');
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
    const userName = video.user?.name || 'Unknown';
    const userHandle = video.user?.username ? `@${video.user.username}` : '';
    const exerciseLabel = video.exercise || video.challenge?.title || 'Challenge Submission';
    const points = video.reps * 1.5 + (video.weight || 0) * 0.1; // Rough calculation

    return (
      <TouchableOpacity
        style={styles.videoCard}
        onPress={() => onPress(video)}
        activeOpacity={0.7}
      >
        <View style={styles.videoThumbnail}>
          <Ionicons name="play-circle" size={40} color="#fff" />
          <View style={styles.videoOverlay}>
            <Text style={styles.videoExercise}>{exerciseLabel}</Text>
            <Text style={styles.videoStats}>
              {video.reps} reps × {video.weight || 0}kg
            </Text>
            <Text style={styles.videoUser}>{userName}</Text>
          </View>
        </View>

        <View style={styles.videoInfo}>
          <View style={styles.videoHeader}>
            <View>
              <Text style={styles.videoUserName}>{userName}</Text>
              <Text style={styles.videoUserHandle}>{userHandle}</Text>
            </View>
            <View style={styles.videoPointsBadge}>
              <Text style={styles.videoPointsText}>~{Math.round(points)} XP</Text>
            </View>
          </View>

          <View style={styles.videoDetails}>
            <View style={styles.videoDetailItem}>
              <Ionicons name="barbell" size={14} color="#888" />
              <Text style={styles.videoDetailText}>{exerciseLabel}</Text>
            </View>
            <View style={styles.videoDetailItem}>
              <Ionicons name="repeat" size={14} color="#888" />
              <Text style={styles.videoDetailText}>{video.reps} reps</Text>
            </View>
            {video.weight > 0 && (
              <View style={styles.videoDetailItem}>
                <Ionicons name="fitness" size={14} color="#888" />
                <Text style={styles.videoDetailText}>{video.weight}kg</Text>
              </View>
            )}
          </View>

          <View style={styles.videoActions}>
            <TouchableOpacity
              style={[styles.actionButton, styles.approveButton]}
              onPress={() => handleApprove(video)}
            >
              <Ionicons name="checkmark" size={16} color="#fff" />
              <Text style={styles.actionButtonText}>Approve</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, styles.rejectButton]}
              onPress={() => handleReject(video)}
            >
              <Ionicons name="close" size={16} color="#fff" />
              <Text style={styles.actionButtonText}>Reject</Text>
            </TouchableOpacity>
          </View>
        </View>

        <Text style={styles.videoDate}>
          {new Date(video.createdAt || video.submittedAt).toLocaleDateString()} • {new Date(video.createdAt || video.submittedAt).toLocaleTimeString()}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.pageTitle}>Video Moderation</Text>
        <View style={styles.headerRight}>
          <Text style={styles.queueCount}>{videos.length}</Text>
        </View>
      </View>

      {/* Search/Filter */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#888" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Filter by exercise..."
          placeholderTextColor="#666"
          value={filterExercise}
          onChangeText={setFilterExercise}
          autoCapitalize="none"
        />
        {filterExercise.length > 0 && (
          <TouchableOpacity onPress={() => setFilterExercise('')} style={styles.clearButton}>
            <Ionicons name="close-circle" size={20} color="#888" />
          </TouchableOpacity>
        )}
      </View>

      {/* Videos List */}
      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#ff003c" />
          <Text style={styles.loadingText}>Loading pending videos...</Text>
        </View>
      ) : videos.length === 0 ? (
        <View style={styles.centerContainer}>
          <Ionicons name="checkmark-circle-outline" size={64} color="#00d4aa" />
          <Text style={styles.emptyText}>All caught up!</Text>
          <Text style={styles.emptySubtext}>No pending videos to review</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#ff003c" />
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
              if (videoRef.current) {
                videoRef.current.stopAsync();
              }
            }}
          >
            <Ionicons name="close" size={32} color="#fff" />
          </TouchableOpacity>

          {selectedVideo && (
            <>
              {/* Video Player */}
              {selectedVideo.videoUrl ? (
                <Video
                  ref={videoRef}
                  source={{ uri: selectedVideo.videoUrl }}
                  style={styles.videoPlayer}
                  useNativeControls
                  resizeMode="contain"
                  shouldPlay
                />
              ) : (
                <View style={styles.noVideoContainer}>
                  <Ionicons name="videocam-off" size={64} color="#666" />
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
                        {(selectedVideo.user?.name?.[0] || '?').toUpperCase()}
                      </Text>
                    </View>
                  )}
                  <View style={styles.modalUserDetails}>
                    <Text style={styles.modalUserName}>{selectedVideo.user?.name || 'Unknown'}</Text>
                    <Text style={styles.modalUserHandle}>
                      @{selectedVideo.user?.username || 'unknown'}
                    </Text>
                    <View style={styles.modalUserStats}>
                      <Text style={styles.modalUserStat}>
                        {selectedVideo.user?.totalPoints || 0} XP
                      </Text>
                      <Text style={styles.modalUserStatSeparator}>•</Text>
                      <Text style={styles.modalUserStat}>Rank {selectedVideo.user?.rank || 99}</Text>
                      <Text style={styles.modalUserStatSeparator}>•</Text>
                      <Text style={styles.modalUserStat}>{selectedVideo.user?.region || 'Global'}</Text>
                    </View>
                  </View>
                </View>

                <View style={styles.modalWorkoutInfo}>
                  <Text style={styles.modalExercise}>
                    {selectedVideo.exercise || selectedVideo.challenge?.title || 'Challenge Submission'}
                  </Text>
                  <View style={styles.modalStats}>
                    <View style={styles.modalStat}>
                      <Ionicons name="repeat" size={18} color="#888" />
                      <Text style={styles.modalStatText}>{selectedVideo.reps} reps</Text>
                    </View>
                    {selectedVideo.weight > 0 && (
                      <View style={styles.modalStat}>
                        <Ionicons name="fitness" size={18} color="#888" />
                        <Text style={styles.modalStatText}>{selectedVideo.weight}kg</Text>
                      </View>
                    )}
                    {selectedVideo.duration && (
                      <View style={styles.modalStat}>
                        <Ionicons name="time" size={18} color="#888" />
                        <Text style={styles.modalStatText}>
                          {Math.floor(selectedVideo.duration / 60)}:{(selectedVideo.duration % 60).toString().padStart(2, '0')}
                        </Text>
                      </View>
                    )}
                  </View>
                </View>

                {/* Action Buttons */}
                <View style={styles.modalActions}>
                  <TouchableOpacity
                    style={[styles.modalActionButton, styles.modalApproveButton]}
                    onPress={() => handleApprove(selectedVideo)}
                    disabled={verifying}
                  >
                    <Ionicons name="checkmark" size={24} color="#fff" />
                    <Text style={styles.modalActionText}>Approve</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.modalActionButton, styles.modalRejectButton]}
                    onPress={() => handleReject(selectedVideo)}
                    disabled={verifying}
                  >
                    <Ionicons name="close" size={24} color="#fff" />
                    <Text style={styles.modalActionText}>Reject</Text>
                  </TouchableOpacity>
                </View>

                {/* User's Video History */}
                {selectedVideo.userVideoHistory && selectedVideo.userVideoHistory.length > 0 && (
                  <View style={styles.modalHistory}>
                    <Text style={styles.modalHistoryTitle}>User's Recent Videos</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                      {selectedVideo.userVideoHistory.map((historyVideo, index) => (
                        <View
                          key={index}
                          style={[
                            styles.historyItem,
                            historyVideo.status === 'approved' && styles.historyItemApproved,
                            historyVideo.status === 'rejected' && styles.historyItemRejected,
                          ]}
                        >
                          <Text style={styles.historyExercise}>{historyVideo.exercise}</Text>
                          <Text style={styles.historyStats}>
                            {historyVideo.reps} × {historyVideo.weight || 0}kg
                          </Text>
                          <Text style={styles.historyStatus}>{historyVideo.status}</Text>
                        </View>
                      ))}
                    </ScrollView>
                  </View>
                )}
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
              placeholderTextColor="#666"
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
              placeholderTextColor="#666"
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#050505',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  pageTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
    flex: 1,
  },
  headerRight: {
    width: 40,
    alignItems: 'flex-end',
  },
  queueCount: {
    fontSize: 14,
    fontWeight: '700',
    color: '#ff003c',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0f0f0f',
    marginHorizontal: 16,
    marginBottom: 16,
    paddingHorizontal: 16,
    borderRadius: 12,
    height: 48,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#fff',
  },
  clearButton: {
    padding: 4,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 14,
    color: '#888',
  },
  emptyText: {
    marginTop: 16,
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
  emptySubtext: {
    marginTop: 8,
    fontSize: 14,
    color: '#888',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  bottomSpacer: {
    height: 20,
  },
  videoCard: {
    backgroundColor: '#0f0f0f',
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 16,
  },
  videoThumbnail: {
    height: 180,
    backgroundColor: '#1a1a1a',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  videoOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.7)',
    padding: 12,
  },
  videoExercise: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 4,
  },
  videoStats: {
    fontSize: 12,
    color: '#ccc',
    marginBottom: 2,
  },
  videoUser: {
    fontSize: 11,
    color: '#888',
  },
  videoInfo: {
    padding: 12,
  },
  videoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  videoUserName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  videoUserHandle: {
    fontSize: 12,
    color: '#888',
  },
  videoPointsBadge: {
    backgroundColor: '#ff003c',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  videoPointsText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#fff',
  },
  videoDetails: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 12,
  },
  videoDetailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
    marginBottom: 4,
  },
  videoDetailText: {
    fontSize: 11,
    color: '#888',
    marginLeft: 4,
  },
  videoActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
  },
  approveButton: {
    backgroundColor: '#00d4aa',
  },
  rejectButton: {
    backgroundColor: '#ff3b30',
  },
  actionButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#fff',
  },
  videoDate: {
    fontSize: 10,
    color: '#666',
    paddingHorizontal: 12,
    paddingBottom: 12,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
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
  videoPlayer: {
    width: SCREEN_WIDTH,
    height: SCREEN_WIDTH * 0.75,
    backgroundColor: '#000',
  },
  noVideoContainer: {
    width: SCREEN_WIDTH,
    height: SCREEN_WIDTH * 0.75,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0a0a0a',
  },
  noVideoText: {
    marginTop: 16,
    fontSize: 14,
    color: '#666',
  },
  modalInfo: {
    flex: 1,
    backgroundColor: '#050505',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    marginTop: -20,
  },
  modalUserInfo: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  modalAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    marginRight: 12,
  },
  modalAvatarPlaceholder: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#ff003c',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  modalAvatarInitial: {
    fontSize: 22,
    fontWeight: '700',
    color: '#fff',
  },
  modalUserDetails: {
    flex: 1,
  },
  modalUserName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 2,
  },
  modalUserHandle: {
    fontSize: 12,
    color: '#888',
    marginBottom: 6,
  },
  modalUserStats: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  modalUserStat: {
    fontSize: 11,
    color: '#666',
  },
  modalUserStatSeparator: {
    fontSize: 8,
    color: '#444',
    marginHorizontal: 6,
  },
  modalWorkoutInfo: {
    backgroundColor: '#0f0f0f',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  modalExercise: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 12,
  },
  modalStats: {
    flexDirection: 'row',
    gap: 16,
  },
  modalStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  modalStatText: {
    fontSize: 14,
    color: '#888',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  modalActionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  modalApproveButton: {
    backgroundColor: '#00d4aa',
  },
  modalRejectButton: {
    backgroundColor: '#ff3b30',
  },
  modalActionText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  modalHistory: {
    backgroundColor: '#0f0f0f',
    borderRadius: 12,
    padding: 16,
  },
  modalHistoryTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#888',
    marginBottom: 12,
  },
  historyItem: {
    backgroundColor: '#1a1a1a',
    borderRadius: 8,
    padding: 12,
    marginRight: 12,
    minWidth: 140,
  },
  historyItemApproved: {
    borderWidth: 1,
    borderColor: '#00d4aa',
  },
  historyItemRejected: {
    borderWidth: 1,
    borderColor: '#ff3b30',
  },
  historyExercise: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 4,
  },
  historyStats: {
    fontSize: 11,
    color: '#888',
    marginBottom: 4,
  },
  historyStatus: {
    fontSize: 10,
    color: '#666',
    textTransform: 'uppercase',
  },
  rejectionModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  rejectionModalContent: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 20,
    width: '100%',
    maxWidth: 400,
  },
  rejectionModalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 8,
  },
  rejectionModalSubtitle: {
    fontSize: 14,
    color: '#888',
    marginBottom: 16,
  },
  rejectionInput: {
    backgroundColor: '#0f0f0f',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: '#fff',
    borderWidth: 1,
    borderColor: '#333',
    marginBottom: 16,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  rejectionModalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  rejectionModalButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  rejectionCancelButton: {
    backgroundColor: '#222',
  },
  rejectionConfirmButton: {
    backgroundColor: '#ff3b30',
  },
  rejectionCancelButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  rejectionConfirmButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
});
