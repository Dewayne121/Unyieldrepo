import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
  Modal,
  TextInput,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Video } from 'expo-av';
import api from '../../services/api';
import { colors } from '../../constants/colors';

const STATUS_FILTERS = ['active', 'ended', 'inactive', 'all'];

export default function ChallengeManagementScreen({ navigation }) {
  const insets = useSafeAreaInsets();
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
      Alert.alert('Error', err.message || 'Failed to load challenges');
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
      Alert.alert('Error', err.message || 'Failed to load submissions');
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
    Alert.alert(
      'Delete Challenge',
      `Are you sure you want to delete "${challenge.title}"? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await api.deleteChallenge(challenge._id);
              if (response.success) {
                Alert.alert('Success', 'Challenge deleted successfully');
                loadChallenges();
              }
            } catch (err) {
              Alert.alert('Error', err.message || 'Failed to delete challenge');
            }
          },
        },
      ]
    );
  };

  const handleToggleActive = async (challenge) => {
    try {
      const response = await api.updateChallenge(challenge._id, {
        isActive: !challenge.isActive,
      });
      if (response.success) {
        Alert.alert(
          'Success',
          `Challenge ${challenge.isActive ? 'deactivated' : 'activated'}`
        );
        loadChallenges();
      }
    } catch (err) {
      Alert.alert('Error', err.message || 'Failed to update challenge');
    }
  };

  const handleVerifySubmission = async (submission, action) => {
    if (action === 'reject' && !rejectionReason.trim()) {
      Alert.alert('Required', 'Please enter a rejection reason');
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
        Alert.alert('Success', response.message || 'Submission verified');
        setShowVerifyModal(false);
        setRejectionReason('');
        setSelectedSubmission(null);
        loadSubmissionsQueue();
      }
    } catch (err) {
      Alert.alert('Error', err.message || 'Failed to verify submission');
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
      case 'active': return '#00d4aa';
      case 'ended': return '#888';
      case 'inactive': return '#ff9500';
      default: return '#888';
    }
  };

  const getStatusLabel = (challenge) => {
    const now = new Date();
    const endDate = new Date(challenge.endDate);
    if (!challenge.isActive) return 'Inactive';
    if (endDate < now) return 'Ended';
    return 'Active';
  };

  const renderChallengeCard = (challenge) => (
    <View key={challenge._id} style={styles.card}>
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
          <Ionicons name="people" size={16} color="#888" />
          <Text style={styles.statText}>{challenge.participantCount || 0}</Text>
        </View>
        {challenge.pendingSubmissions > 0 && (
          <View style={styles.statItem}>
            <Ionicons name="time" size={16} color="#ff9500" />
            <Text style={styles.statText}>{challenge.pendingSubmissions} pending</Text>
          </View>
        )}
        <View style={styles.statItem}>
          <Ionicons name="trophy" size={16} color="#d4af37" />
          <Text style={styles.statText}>{challenge.reward} pts</Text>
        </View>
      </View>

      <View style={styles.cardActions}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => navigation.navigate('AdminChallengeBuilder', { challenge, isEdit: true })}
        >
          <Ionicons name="pencil" size={18} color="#fff" />
          <Text style={styles.actionButtonText}>Edit</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: '#333' }]}
          onPress={() => handleToggleActive(challenge)}
        >
          <Ionicons name={challenge.isActive ? "pause" : "play"} size={18} color="#fff" />
          <Text style={styles.actionButtonText}>{challenge.isActive ? 'Deactivate' : 'Activate'}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: '#ff003c' }]}
          onPress={() => handleDeleteChallenge(challenge)}
        >
          <Ionicons name="trash" size={18} color="#fff" />
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderSubmissionCard = (submission) => (
    <View key={submission.id} style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.userInfo}>
          {submission.user.profileImage ? (
            <Image source={{ uri: submission.user.profileImage }} style={styles.userAvatar} />
          ) : (
            <View style={[styles.userAvatar, { backgroundColor: '#333' }]}>
              <Text style={styles.avatarText}>{submission.user.name[0]}</Text>
            </View>
          )}
          <View>
            <Text style={styles.cardTitle}>{submission.user.name}</Text>
            <Text style={styles.cardSubtitle}>@{submission.user.username}</Text>
          </View>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: '#ff9500' }]}>
          <Text style={styles.statusText}>Pending</Text>
        </View>
      </View>

      <View style={styles.challengeTag}>
        <Ionicons name="trophy" size={14} color="#d4af37" />
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
          <Ionicons name="play-circle" size={24} color="#ff003c" />
          <Text style={styles.videoButtonText}>Watch Video</Text>
        </TouchableOpacity>
      )}

      {submission.notes && (
        <Text style={styles.notesText}>Notes: {submission.notes}</Text>
      )}

      <View style={styles.cardActions}>
        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: '#00d4aa', flex: 1 }]}
          onPress={() => handleVerifySubmission(submission, 'approve')}
        >
          <Ionicons name="checkmark" size={18} color="#000" />
          <Text style={[styles.actionButtonText, { color: '#000' }]}>Approve</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: '#ff003c', flex: 1 }]}
          onPress={() => openVerifyModal(submission)}
        >
          <Ionicons name="close" size={18} color="#fff" />
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
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.pageTitle}>Challenge Management</Text>
        <TouchableOpacity
          style={styles.createButton}
          onPress={() => navigation.navigate('AdminChallengeBuilder')}
        >
          <Ionicons name="add" size={24} color="#fff" />
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
          <ActivityIndicator size="large" color="#ff003c" />
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.content}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#ff003c" />
          }
        >
          {activeTab === 'challenges' ? (
            challenges.length > 0 ? (
              challenges.map(renderChallengeCard)
            ) : (
              <View style={styles.centerContainer}>
                <Ionicons name="trophy-outline" size={64} color="#333" />
                <Text style={styles.emptyText}>No challenges found</Text>
                <Text style={styles.emptySubtext}>Create a new challenge to get started</Text>
              </View>
            )
          ) : (
            submissions.length > 0 ? (
              submissions.map(renderSubmissionCard)
            ) : (
              <View style={styles.centerContainer}>
                <Ionicons name="checkmark-circle-outline" size={64} color="#00d4aa" />
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
              placeholderTextColor="#666"
              value={rejectionReason}
              onChangeText={setRejectionReason}
              multiline
              numberOfLines={4}
              autoFocus
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: '#333' }]}
                onPress={() => {
                  setShowVerifyModal(false);
                  setRejectionReason('');
                }}
              >
                <Text style={styles.modalButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: '#ff003c' }]}
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
    borderBottomWidth: 1,
    borderBottomColor: '#1a1a1a',
  },
  backButton: {
    padding: 8,
  },
  pageTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
  },
  createButton: {
    backgroundColor: '#ff003c',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabs: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#1a1a1a',
  },
  tab: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: '#ff003c',
  },
  tabText: {
    fontSize: 14,
    color: '#888',
    fontWeight: '600',
  },
  tabTextActive: {
    color: '#fff',
  },
  filtersScroll: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#0a0a0a',
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#1a1a1a',
    marginRight: 8,
  },
  filterChipActive: {
    backgroundColor: '#ff003c',
  },
  filterChipText: {
    fontSize: 12,
    color: '#888',
    fontWeight: '600',
  },
  filterChipTextActive: {
    color: '#fff',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 14,
    color: '#888',
  },
  emptyText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
    fontWeight: '600',
  },
  emptySubtext: {
    marginTop: 8,
    fontSize: 12,
    color: '#444',
  },
  card: {
    backgroundColor: '#0f0f0f',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#1a1a1a',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
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
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  cardSubtitle: {
    fontSize: 12,
    color: '#888',
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#000',
    textTransform: 'uppercase',
  },
  cardDescription: {
    fontSize: 14,
    color: '#888',
    marginBottom: 12,
  },
  challengeTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(212, 175, 55, 0.1)',
    borderRadius: 8,
    padding: 8,
    marginBottom: 12,
    alignSelf: 'flex-start',
  },
  challengeTagName: {
    fontSize: 12,
    color: '#d4af37',
    marginLeft: 6,
    fontWeight: '600',
  },
  cardStats: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
  },
  statText: {
    marginLeft: 4,
    fontSize: 12,
    color: '#888',
  },
  submissionDetails: {
    backgroundColor: '#0a0a0a',
    borderRadius: 8,
    padding: 12,
    marginVertical: 8,
  },
  detailLabel: {
    fontSize: 12,
    color: '#888',
    marginBottom: 4,
  },
  detailValue: {
    color: '#fff',
    fontWeight: '600',
  },
  videoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1a1a1a',
    borderRadius: 8,
    padding: 12,
    marginVertical: 8,
  },
  videoButtonText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#ff003c',
    fontWeight: '600',
  },
  notesText: {
    fontSize: 12,
    color: '#666',
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
    backgroundColor: '#333',
    borderRadius: 8,
    padding: 10,
    minWidth: 50,
  },
  actionButtonText: {
    marginLeft: 6,
    fontSize: 12,
    color: '#fff',
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  modalContent: {
    backgroundColor: '#0f0f0f',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    borderWidth: 1,
    borderColor: '#1a1a1a',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#888',
    marginBottom: 16,
  },
  textInput: {
    backgroundColor: '#1a1a1a',
    borderRadius: 8,
    padding: 12,
    color: '#fff',
    fontSize: 14,
    minHeight: 80,
    textAlignVertical: 'top',
    marginBottom: 16,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalButtonText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#fff',
  },
});
