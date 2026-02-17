import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Modal, TextInput, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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

export default function AppealsManagementScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { alertConfig, showAlert, hideAlert } = useCustomAlert();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [appeals, setAppeals] = useState([]);
  const [selectedAppeal, setSelectedAppeal] = useState(null);
  const [reviewNotes, setReviewNotes] = useState('');
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [statusFilter, setStatusFilter] = useState('pending');

  const loadAppeals = async () => {
    try {
      setLoading(true);
      const queryParams = statusFilter && statusFilter !== 'all' ? `?status=${statusFilter}` : '';
      const response = await api.get(`/api/admin/appeals${queryParams}`);
      if (response?.success) {
        setAppeals(response.data.appeals);
      }
    } catch (err) {
      console.error('Error loading appeals:', err);
      showAlert({
        title: 'Error',
        message: 'Failed to load appeals',
        icon: 'error',
        buttons: [{ text: 'OK', style: 'default' }]
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadAppeals();
  }, [statusFilter]);

  const handleReview = async (appeal, action) => {
    try {
      const response = await api.post(`/api/admin/appeals/${appeal._id}/review`, {
        action,
        reviewNotes,
      });
      if (response?.success) {
        setAppeals(prev => prev.filter(a => a._id !== appeal._id));
        setShowReviewModal(false);
        setReviewNotes('');
        showAlert({
          title: 'Success',
          message: `Appeal ${action}ed`,
          icon: 'success',
          buttons: [{ text: 'OK', style: 'default' }]
        });
      }
    } catch (err) {
      showAlert({
        title: 'Error',
        message: 'Failed to review appeal',
        icon: 'error',
        buttons: [{ text: 'OK', style: 'default' }]
      });
    }
  };

  const AppealCard = ({ appeal, onPress }) => (
    <TouchableOpacity style={styles.appealCard} onPress={() => onPress(appeal)}>
      <View style={styles.appealHeader}>
        <View style={styles.appealUserInfo}>
          <Text style={styles.appealUserName}>{appeal.user?.name || 'Unknown'}</Text>
          <Text style={styles.appealUserHandle}>@{appeal.user?.username || 'unknown'}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: appeal.status === 'pending' ? C.warning : appeal.status === 'approved' ? C.success : C.danger }]}>
          <Text style={styles.statusText}>{appeal.status}</Text>
        </View>
      </View>
      <View style={styles.appealDetails}>
        <View style={styles.appealVideoInfo}>
          <Ionicons name="videocam" size={14} color={C.textSubtle} />
          <Text style={styles.appealVideoText}>{appeal.videoSubmission?.exercise}</Text>
          <Text style={styles.appealVideoStats}>
            {appeal.videoSubmission?.reps} reps × {appeal.videoSubmission?.weight || 0}kg
          </Text>
        </View>
      </View>
      <Text style={styles.appealReason} numberOfLines={2}>{appeal.reason}</Text>
      <Text style={styles.appealDate}>{new Date(appeal.createdAt).toLocaleString()}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={20} color={C.white} />
        </TouchableOpacity>
        <Text style={styles.pageTitle}>Appeals</Text>
        <View style={styles.headerRight} />
      </View>

      <View style={styles.filterContainer}>
        {['pending', 'approved', 'denied', 'all'].map(status => (
          <TouchableOpacity
            key={status}
            style={[styles.filterChip, statusFilter === status && styles.filterChipActive]}
            onPress={() => setStatusFilter(status)}
          >
            <Text style={[styles.filterChipText, statusFilter === status && styles.filterChipTextActive]}>
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={C.accent} />
        </View>
      ) : appeals.length === 0 ? (
        <View style={styles.centerContainer}>
          <Ionicons name="checkmark-circle-outline" size={64} color={C.success} />
          <Text style={styles.emptyText}>No appeals found</Text>
        </View>
      ) : (
        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
          {appeals.map(appeal => (
            <AppealCard
              key={appeal._id}
              appeal={appeal}
              onPress={(a) => {
                setSelectedAppeal(a);
                setShowReviewModal(true);
              }}
            />
          ))}
        </ScrollView>
      )}

      <Modal visible={showReviewModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {selectedAppeal && (
              <>
                <Text style={styles.modalTitle}>Review Appeal</Text>
                <View style={styles.modalUserInfo}>
                  <Text style={styles.modalUserName}>{selectedAppeal.user?.name}</Text>
                  <Text style={styles.modalUserHandle}>@{selectedAppeal.user?.username}</Text>
                </View>
                <View style={styles.modalVideoInfo}>
                  <Text style={styles.modalVideoExercise}>{selectedAppeal.videoSubmission?.exercise}</Text>
                  <Text style={styles.modalVideoStats}>
                    {selectedAppeal.videoSubmission?.reps} reps × {selectedAppeal.videoSubmission?.weight || 0}kg
                  </Text>
                </View>
                <Text style={styles.modalReasonLabel}>Appeal Reason:</Text>
                <Text style={styles.modalReason}>{selectedAppeal.reason}</Text>
                <TextInput
                  style={styles.notesInput}
                  placeholder="Review notes (optional)..."
                  placeholderTextColor={C.textSubtle}
                  value={reviewNotes}
                  onChangeText={setReviewNotes}
                  multiline
                  numberOfLines={3}
                />
                <View style={styles.modalActions}>
                  <TouchableOpacity style={[styles.modalButton, styles.approveButton]} onPress={() => handleReview(selectedAppeal, 'approve')}>
                    <Ionicons name="checkmark" size={18} color={C.white} />
                    <Text style={styles.modalButtonText}>Approve Appeal</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.modalButton, styles.denyButton]} onPress={() => handleReview(selectedAppeal, 'deny')}>
                    <Ionicons name="close" size={18} color={C.white} />
                    <Text style={styles.modalButtonText}>Deny Appeal</Text>
                  </TouchableOpacity>
                </View>
                <TouchableOpacity style={styles.closeButton} onPress={() => setShowReviewModal(false)}>
                  <Text style={styles.closeButtonText}>Close</Text>
                </TouchableOpacity>
              </>
            )}
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
    width: 34,
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: S.xl,
    marginTop: S.sm,
    marginBottom: S.sm,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    backgroundColor: C.card,
    borderRadius: R.pill,
    borderWidth: 1,
    borderColor: C.border,
    minHeight: 24,
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
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: S.xl,
  },
  emptyText: {
    marginTop: S.md,
    ...T.bodyMuted,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: S.xl,
    paddingBottom: S.xxl,
  },
  appealCard: {
    backgroundColor: C.card,
    borderRadius: R.lg,
    padding: S.md,
    marginBottom: S.md,
    borderWidth: 1,
    borderColor: C.border,
    ...ADMIN_SHADOWS.soft,
  },
  appealHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: S.sm,
  },
  appealUserInfo: { flex: 1 },
  appealUserName: { fontSize: 14, fontWeight: '600', color: C.text },
  appealUserHandle: { fontSize: 11, color: C.textSubtle },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: R.md },
  statusText: {
    fontSize: 9,
    fontWeight: '700',
    color: C.white,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  appealDetails: { marginBottom: 8 },
  appealVideoInfo: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  appealVideoText: { fontSize: 12, color: C.text, fontWeight: '600' },
  appealVideoStats: { fontSize: 11, color: C.textSubtle },
  appealReason: { fontSize: 13, color: C.text, lineHeight: 18, marginBottom: 8 },
  appealDate: { fontSize: 10, color: C.textSubtle },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
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
  modalTitle: { ...T.h2, marginBottom: S.md },
  modalUserInfo: { marginBottom: 12 },
  modalUserName: { fontSize: 15, fontWeight: '600', color: C.text },
  modalUserHandle: { fontSize: 11, color: C.textSubtle },
  modalVideoInfo: {
    backgroundColor: C.panel,
    borderRadius: R.md,
    padding: S.sm,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: C.border,
  },
  modalVideoExercise: { fontSize: 13, fontWeight: '700', color: C.text },
  modalVideoStats: { fontSize: 11, color: C.textSubtle, marginTop: 4 },
  modalReasonLabel: { ...T.caption, marginBottom: 4 },
  modalReason: { fontSize: 13, color: C.text, marginBottom: 12, lineHeight: 18 },
  notesInput: {
    backgroundColor: C.panel,
    borderRadius: R.md,
    padding: S.md,
    color: C.text,
    borderWidth: 1,
    borderColor: C.border,
    marginBottom: 16,
    minHeight: 80,
    textAlignVertical: 'top',
    fontSize: 13,
  },
  modalActions: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  modalButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: R.md,
    gap: 6,
  },
  approveButton: { backgroundColor: C.success },
  denyButton: { backgroundColor: C.danger },
  modalButtonText: { fontSize: 12, fontWeight: '700', color: C.white },
  closeButton: { padding: 12, alignItems: 'center' },
  closeButtonText: { fontSize: 12, color: C.textSubtle },
});
