import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Modal,
  TextInput,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Video } from 'expo-av';
import CustomAlert, { useCustomAlert } from '../../components/CustomAlert';
import api from '../../services/api';
import {
  ADMIN_COLORS,
  ADMIN_SPACING,
  ADMIN_RADIUS,
  ADMIN_TYPOGRAPHY,
  ADMIN_SHADOWS,
  ADMIN_SURFACES,
} from '../../constants/adminTheme';

const C = ADMIN_COLORS;
const S = ADMIN_SPACING;
const R = ADMIN_RADIUS;
const T = ADMIN_TYPOGRAPHY;

const STATUS_FILTERS = ['active', 'ended', 'inactive', 'all'];

export default function ChallengeManagementScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { alertConfig, showAlert, hideAlert } = useCustomAlert();
  const getChallengeId = (item) => item?.id || item?._id || null;
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('challenges'); // 'challenges' or 'queue'
  const [challenges, setChallenges] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [selectedFilter, setSelectedFilter] = useState('active');
  const [selectedSubmission, setSelectedSubmission] = useState(null);
  const [showVerifyModal, setShowVerifyModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, pages: 0 });

  useEffect(() => {
    if (activeTab === 'challenges') {
      loadChallenges();
    } else {
      loadSubmissionsQueue();
    }
  }, [activeTab, selectedFilter]);

  const loadChallenges = async () => {
    try {
      setLoading(true);
      const response = await api.getAdminChallenges({
        page: 1,
        limit: 50,
        status: selectedFilter,
      });

      if (response.success) {
        setChallenges(response.data || []);
        setPagination(response.pagination || { page: 1, limit: 50, total: 0, pages: 0 });
      } else {
        setChallenges([]);
      }
    } catch (err) {
      console.error('Error loading challenges:', err);
      showAlert({
        title: 'Error',
        message: err.message || 'Failed to load challenges',
        icon: 'error',
        buttons: [{ text: 'OK', style: 'default' }]
      });
      setChallenges([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const loadSubmissionsQueue = async () => {
    console.log('[ADMIN CHALLENGE] Loading submissions queue...');
    try {
      setLoading(true);
      // Get pending submissions from all active challenges
      const response = await api.getPendingChallengeSubmissions({
        limit: 50,
      });

      console.log('[ADMIN CHALLENGE] Response:', {
        success: response.success,
        count: response.data?.length || 0,
        pagination: response.pagination
      });

      if (response.success) {
        console.log('[ADMIN CHALLENGE] Submissions loaded:', response.data?.length || 0);
        setSubmissions(response.data || []);
      } else {
        console.error('[ADMIN CHALLENGE] Response not successful');
        setSubmissions([]);
      }
    } catch (err) {
      console.error('[ADMIN CHALLENGE] Error loading submissions:', err);
      showAlert({
        title: 'Error',
        message: err.message || 'Failed to load submissions',
        icon: 'error',
        buttons: [{ text: 'OK', style: 'default' }]
      });
      setSubmissions([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    if (activeTab === 'challenges') {
      loadChallenges();
    } else {
      loadSubmissionsQueue();
    }
  };

  const handleDeleteChallenge = (challenge) => {
    showAlert({
      title: 'Delete Challenge',
      message: `Are you sure you want to delete "${challenge.title}"? This action cannot be undone.`,
      icon: 'warning',
      buttons: [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const challengeId = getChallengeId(challenge);
              if (!challengeId) {
                showAlert({
                  title: 'Error',
                  message: 'Challenge ID is missing',
                  icon: 'error',
                  buttons: [{ text: 'OK', style: 'default' }]
                });
                return;
              }
              const response = await api.deleteChallenge(challengeId);
              if (response.success) {
                showAlert({
                  title: 'Success',
                  message: 'Challenge deleted successfully',
                  icon: 'success',
                  buttons: [{ text: 'OK', style: 'default' }]
                });
                loadChallenges();
              }
            } catch (err) {
              showAlert({
                title: 'Error',
                message: err.message || 'Failed to delete challenge',
                icon: 'error',
                buttons: [{ text: 'OK', style: 'default' }]
              });
            }
          },
        },
      ]
    });
  };

  const handleToggleActive = async (challenge) => {
    try {
      const challengeId = getChallengeId(challenge);
      if (!challengeId) {
        showAlert({
          title: 'Error',
          message: 'Challenge ID is missing',
          icon: 'error',
          buttons: [{ text: 'OK', style: 'default' }]
        });
        return;
      }
      const response = await api.updateChallenge(challengeId, {
        isActive: !challenge.isActive,
      });
      if (response.success) {
        showAlert({
          title: 'Success',
          message: `Challenge ${challenge.isActive ? 'deactivated' : 'activated'}`,
          icon: 'success',
          buttons: [{ text: 'OK', style: 'default' }]
        });
        loadChallenges();
      }
    } catch (err) {
      showAlert({
        title: 'Error',
        message: err.message || 'Failed to update challenge',
        icon: 'error',
        buttons: [{ text: 'OK', style: 'default' }]
      });
    }
  };

  const handleVerifySubmission = async (submission, action) => {
    if (action === 'reject' && !rejectionReason.trim()) {
      showAlert({
        title: 'Required',
        message: 'Please enter a rejection reason',
        icon: 'warning',
        buttons: [{ text: 'OK', style: 'default' }]
      });
      return;
    }

    try {
      setVerifying(true);
      const response = await api.verifyChallengeSubmission(
        submission.id,
        action,
        rejectionReason
      );

      if (response.success) {
        showAlert({
          title: 'Success',
          message: response.message || 'Submission verified',
          icon: 'success',
          buttons: [{ text: 'OK', style: 'default' }]
        });
        setShowVerifyModal(false);
        setRejectionReason('');
        setSelectedSubmission(null);
        loadSubmissionsQueue();
      }
    } catch (err) {
      showAlert({
        title: 'Error',
        message: err.message || 'Failed to verify submission',
        icon: 'error',
        buttons: [{ text: 'OK', style: 'default' }]
      });
    } finally {
      setVerifying(false);
    }
  };

  const openVerifyModal = (submission) => {
    setSelectedSubmission(submission);
    setRejectionReason('');
    setShowVerifyModal(true);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return C.success;
      case 'ended': return C.textSubtle;
      case 'inactive': return C.warning;
      default: return C.textSubtle;
    }
  };

  const getStatusLabel = (challenge) => {
    const now = new Date();
    const endDate = new Date(challenge.endDate);
    if (!challenge.isActive) return 'Inactive';
    if (endDate < now) return 'Ended';
    return 'Active';
  };

  const renderChallengeCard = (challenge) => {
    const challengeId = getChallengeId(challenge);
    return (
      <View key={challengeId || challenge.title} style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}>{challenge.title}</Text>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(getStatusLabel(challenge)) }]}>
          <Text style={styles.statusText}>{getStatusLabel(challenge)}</Text>
        </View>
      </View>

      <Text style={styles.cardDescription} numberOfLines={2}>
        {challenge.description}
      </Text>

      <View style={styles.cardStats}>
        <View style={styles.statItem}>
          <Ionicons name="people" size={16} color={C.textSubtle} />
          <Text style={styles.statText}>{challenge.participantCount || 0}</Text>
        </View>
        {challenge.pendingSubmissions > 0 && (
          <View style={styles.statItem}>
            <Ionicons name="time" size={16} color={C.warning} />
            <Text style={styles.statText}>{challenge.pendingSubmissions} pending</Text>
          </View>
        )}
        <View style={styles.statItem}>
          <Ionicons name="trophy" size={16} color={C.warning} />
          <Text style={styles.statText}>{challenge.reward} pts</Text>
        </View>
      </View>

      <View style={styles.cardActions}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => navigation.navigate('AdminChallengeBuilder', { challenge, isEdit: true })}
        >
          <Ionicons name="pencil" size={18} color={C.white} />
          <Text style={styles.actionButtonText}>Edit</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: C.surface }]}
          onPress={() => handleToggleActive(challenge)}
        >
          <Ionicons name={challenge.isActive ? "pause" : "play"} size={18} color={C.white} />
          <Text style={styles.actionButtonText}>{challenge.isActive ? 'Deactivate' : 'Activate'}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: C.accent }]}
          onPress={() => handleDeleteChallenge(challenge)}
        >
          <Ionicons name="trash" size={18} color={C.white} />
        </TouchableOpacity>
      </View>
      </View>
    );
  };

  const renderSubmissionCard = (submission) => (
    <View key={submission.id} style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.userInfo}>
          {submission.user.profileImage ? (
            <Image source={{ uri: submission.user.profileImage }} style={styles.userAvatar} />
          ) : (
            <View style={[styles.userAvatar, { backgroundColor: C.surface }]}>
              <Text style={styles.avatarText}>{submission.user.name[0]}</Text>
            </View>
          )}
          <View>
            <Text style={styles.cardTitle}>{submission.user.name}</Text>
            <Text style={styles.cardSubtitle}>@{submission.user.username}</Text>
          </View>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: C.warning }]}>
          <Text style={styles.statusText}>Pending</Text>
        </View>
      </View>

      <View style={styles.challengeTag}>
        <Ionicons name="trophy" size={14} color={C.warning} />
        <Text style={styles.challengeTagName}>{submission.challenge?.title || 'Unknown Challenge'}</Text>
      </View>

      <View style={styles.submissionDetails}>
        <Text style={styles.detailLabel}>Exercise: <Text style={styles.detailValue}>{submission.exercise}</Text></Text>
        {submission.reps > 0 && <Text style={styles.detailLabel}>Reps: <Text style={styles.detailValue}>{submission.reps}</Text></Text>}
        {submission.weight > 0 && <Text style={styles.detailLabel}>Weight: <Text style={styles.detailValue}>{submission.weight}kg</Text></Text>}
        <Text style={styles.detailLabel}>Value: <Text style={styles.detailValue}>{submission.value}</Text></Text>
      </View>

      {submission.videoUrl && (
        <TouchableOpacity
          style={styles.videoButton}
          onPress={() => {/* Navigate to video player */}}
        >
          <Ionicons name="play-circle" size={24} color={C.accent} />
          <Text style={styles.videoButtonText}>Watch Video</Text>
        </TouchableOpacity>
      )}

      {submission.notes && (
        <Text style={styles.notesText}>Notes: {submission.notes}</Text>
      )}

      <View style={styles.cardActions}>
        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: C.success, flex: 1 }]}
          onPress={() => handleVerifySubmission(submission, 'approve')}
        >
          <Ionicons name="checkmark" size={18} color={C.black} />
          <Text style={[styles.actionButtonText, { color: C.black }]}>Approve</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: C.accent, flex: 1 }]}
          onPress={() => openVerifyModal(submission)}
        >
          <Ionicons name="close" size={18} color={C.white} />
          <Text style={styles.actionButtonText}>Reject</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top + 16 }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={C.white} />
        </TouchableOpacity>
        <Text style={styles.pageTitle}>Challenge Management</Text>
        <TouchableOpacity
          style={styles.createButton}
          onPress={() => navigation.navigate('AdminChallengeBuilder')}
        >
          <Ionicons name="add" size={24} color={C.white} />
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'challenges' && styles.tabActive]}
          onPress={() => setActiveTab('challenges')}
        >
          <Text style={[styles.tabText, activeTab === 'challenges' && styles.tabTextActive]}>
            Challenges
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'queue' && styles.tabActive]}
          onPress={() => setActiveTab('queue')}
        >
          <Text style={[styles.tabText, activeTab === 'queue' && styles.tabTextActive]}>
            Verification Queue
          </Text>
        </TouchableOpacity>
      </View>

      {/* Filter Chips - only for challenges tab */}
      {activeTab === 'challenges' && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filtersScroll}>
          {STATUS_FILTERS.map(filter => (
            <TouchableOpacity
              key={filter}
              style={[styles.filterChip, selectedFilter === filter && styles.filterChipActive]}
              onPress={() => setSelectedFilter(filter)}
            >
              <Text style={[styles.filterChipText, selectedFilter === filter && styles.filterChipTextActive]}>
                {filter.charAt(0).toUpperCase() + filter.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {/* Content */}
      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={C.accent} />
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.content}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.accent} />
          }
        >
          {activeTab === 'challenges' ? (
            challenges.length > 0 ? (
              challenges.map(renderChallengeCard)
            ) : (
              <View style={styles.centerContainer}>
                <Ionicons name="trophy-outline" size={64} color={C.textSubtle} />
                <Text style={styles.emptyText}>No challenges found</Text>
                <Text style={styles.emptySubtext}>Create a new challenge to get started</Text>
              </View>
            )
          ) : (
            submissions.length > 0 ? (
              submissions.map(renderSubmissionCard)
            ) : (
              <View style={styles.centerContainer}>
                <Ionicons name="checkmark-circle-outline" size={64} color={C.success} />
                <Text style={styles.emptyText}>No pending submissions</Text>
              </View>
            )
          )}
        </ScrollView>
      )}

      {/* Rejection Modal */}
      <Modal visible={showVerifyModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Reject Submission</Text>
            <Text style={styles.modalSubtitle}>Please provide a reason for rejection</Text>

            <TextInput
              style={styles.textInput}
              placeholder="Enter rejection reason..."
              placeholderTextColor={C.textSubtle}
              value={rejectionReason}
              onChangeText={setRejectionReason}
              multiline
              numberOfLines={4}
              autoFocus
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: C.surface }]}
                onPress={() => {
                  setShowVerifyModal(false);
                  setRejectionReason('');
                }}
              >
                <Text style={styles.modalButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: C.accent }]}
                onPress={() => handleVerifySubmission(selectedSubmission, 'reject')}
                disabled={verifying}
              >
                <Text style={styles.modalButtonText}>
                  {verifying ? 'Rejecting...' : 'Reject'}
                </Text>
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
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.border,
  },
  pageTitle: {
    flex: 1,
    textAlign: 'center',
    ...T.h2,
  },
  createButton: {
    backgroundColor: C.accent,
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabs: {
    flexDirection: 'row',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: C.border,
    paddingHorizontal: S.xl,
  },
  tab: {
    flex: 1,
    paddingVertical: S.sm,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: C.accent,
  },
  tabText: {
    ...T.caption,
    color: C.textSubtle,
  },
  tabTextActive: {
    color: C.text,
  },
  filtersScroll: {
    paddingHorizontal: S.xl,
    paddingVertical: S.sm,
    backgroundColor: C.panel,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: R.pill,
    backgroundColor: C.card,
    marginRight: 8,
    borderWidth: 1,
    borderColor: C.border,
    minHeight: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterChipActive: {
    backgroundColor: C.accentSoft,
    borderColor: C.accent,
  },
  filterChipText: {
    fontSize: 11,
    color: C.textSubtle,
    fontWeight: '600',
  },
  filterChipTextActive: {
    color: C.accent,
  },
  content: {
    flex: 1,
    padding: S.xl,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: S.xl,
  },
  loadingText: {
    marginTop: S.md,
    ...T.bodyMuted,
  },
  emptyText: {
    marginTop: S.md,
    ...T.h2,
  },
  emptySubtext: {
    marginTop: S.sm,
    ...T.bodyMuted,
  },
  card: {
    backgroundColor: C.card,
    borderRadius: R.lg,
    padding: S.md,
    marginBottom: S.md,
    borderWidth: 1,
    borderColor: C.border,
    ...ADMIN_SHADOWS.soft,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: S.sm,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  userAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: S.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 14,
    fontWeight: '700',
    color: C.white,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: C.text,
  },
  cardSubtitle: {
    fontSize: 11,
    color: C.textSubtle,
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: R.pill,
    backgroundColor: C.surface,
  },
  statusText: {
    fontSize: 9,
    fontWeight: '700',
    color: C.text,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  cardDescription: {
    fontSize: 13,
    color: C.textMuted,
    marginBottom: S.sm,
  },
  challengeTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.surface,
    borderRadius: R.md,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginBottom: S.sm,
    alignSelf: 'flex-start',
  },
  challengeTagName: {
    fontSize: 11,
    color: C.text,
    marginLeft: 6,
    fontWeight: '600',
  },
  cardStats: {
    flexDirection: 'row',
    marginBottom: S.sm,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
  },
  statText: {
    marginLeft: 4,
    fontSize: 11,
    color: C.textSubtle,
  },
  submissionDetails: {
    backgroundColor: C.panel,
    borderRadius: R.md,
    padding: S.sm,
    marginVertical: S.sm,
    borderWidth: 1,
    borderColor: C.border,
  },
  detailLabel: {
    fontSize: 11,
    color: C.textSubtle,
    marginBottom: 4,
  },
  detailValue: {
    color: C.text,
    fontWeight: '600',
  },
  videoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: C.panel,
    borderRadius: R.md,
    padding: S.sm,
    marginVertical: S.sm,
    borderWidth: 1,
    borderColor: C.border,
  },
  videoButtonText: {
    marginLeft: 8,
    fontSize: 12,
    color: C.accent,
    fontWeight: '600',
  },
  notesText: {
    fontSize: 11,
    color: C.textSubtle,
    fontStyle: 'italic',
    marginVertical: 8,
  },
  cardActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: C.surface,
    borderRadius: R.md,
    paddingVertical: 8,
    paddingHorizontal: 10,
    minWidth: 50,
    borderWidth: 1,
    borderColor: C.border,
  },
  actionButtonText: {
    marginLeft: 6,
    fontSize: 11,
    color: C.text,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  modalContent: {
    backgroundColor: C.card,
    borderRadius: R.lg,
    padding: S.lg,
    width: '100%',
    maxWidth: 420,
    borderWidth: 1,
    borderColor: C.border,
  },
  modalTitle: {
    ...T.h2,
    marginBottom: 6,
  },
  modalSubtitle: {
    ...T.bodyMuted,
    marginBottom: S.md,
  },
  textInput: {
    backgroundColor: C.panel,
    borderRadius: R.md,
    padding: S.md,
    color: C.text,
    fontSize: 13,
    minHeight: 80,
    textAlignVertical: 'top',
    marginBottom: S.md,
    borderWidth: 1,
    borderColor: C.border,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: R.md,
    alignItems: 'center',
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
  },
  modalButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: C.text,
  },
});
