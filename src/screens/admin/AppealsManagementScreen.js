import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert, Modal, TextInput, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import api from '../../services/api';

export default function AppealsManagementScreen({ navigation }) {
  const insets = useSafeAreaInsets();
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
      Alert.alert('Error', 'Failed to load appeals');
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
        Alert.alert('Success', `Appeal ${action}ed`);
      }
    } catch (err) {
      Alert.alert('Error', 'Failed to review appeal');
    }
  };

  const AppealCard = ({ appeal, onPress }) => (
    <TouchableOpacity style={styles.appealCard} onPress={() => onPress(appeal)}>
      <View style={styles.appealHeader}>
        <View style={styles.appealUserInfo}>
          <Text style={styles.appealUserName}>{appeal.user?.name || 'Unknown'}</Text>
          <Text style={styles.appealUserHandle}>@{appeal.user?.username || 'unknown'}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: appeal.status === 'pending' ? '#ff9500' : appeal.status === 'approved' ? '#00d4aa' : '#ff3b30' }]}>
          <Text style={styles.statusText}>{appeal.status}</Text>
        </View>
      </View>
      <View style={styles.appealDetails}>
        <View style={styles.appealVideoInfo}>
          <Ionicons name="videocam" size={14} color="#888" />
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
          <Ionicons name="arrow-back" size={24} color="#fff" />
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
          <ActivityIndicator size="large" color="#ff003c" />
        </View>
      ) : appeals.length === 0 ? (
        <View style={styles.centerContainer}>
          <Ionicons name="checkmark-circle-outline" size={64} color="#00d4aa" />
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
                  placeholderTextColor="#666"
                  value={reviewNotes}
                  onChangeText={setReviewNotes}
                  multiline
                  numberOfLines={3}
                />
                <View style={styles.modalActions}>
                  <TouchableOpacity style={[styles.modalButton, styles.approveButton]} onPress={() => handleReview(selectedAppeal, 'approve')}>
                    <Ionicons name="checkmark" size={20} color="#fff" />
                    <Text style={styles.modalButtonText}>Approve Appeal</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.modalButton, styles.denyButton]} onPress={() => handleReview(selectedAppeal, 'deny')}>
                    <Ionicons name="close" size={20} color="#fff" />
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#050505' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 16 },
  backButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.05)', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  pageTitle: { fontSize: 18, fontWeight: '700', color: '#fff', flex: 1 },
  headerRight: { width: 40 },
  filterContainer: { flexDirection: 'row', paddingHorizontal: 16, marginBottom: 16, gap: 8 },
  filterChip: { paddingHorizontal: 14, paddingVertical: 6, backgroundColor: '#0f0f0f', borderRadius: 16 },
  filterChipActive: { backgroundColor: '#ff003c' },
  filterChipText: { fontSize: 12, color: '#888', fontWeight: '600' },
  filterChipTextActive: { color: '#fff' },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { marginTop: 16, fontSize: 16, color: '#888' },
  scroll: { flex: 1 },
  scrollContent: { padding: 16 },
  appealCard: { backgroundColor: '#0f0f0f', borderRadius: 12, padding: 16, marginBottom: 12 },
  appealHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  appealUserInfo: { flex: 1 },
  appealUserName: { fontSize: 14, fontWeight: '600', color: '#fff' },
  appealUserHandle: { fontSize: 12, color: '#888' },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  statusText: { fontSize: 10, fontWeight: '700', color: '#fff', textTransform: 'uppercase' },
  appealDetails: { marginBottom: 8 },
  appealVideoInfo: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  appealVideoText: { fontSize: 12, color: '#fff', fontWeight: '600' },
  appealVideoStats: { fontSize: 11, color: '#888' },
  appealReason: { fontSize: 13, color: '#ccc', lineHeight: 18, marginBottom: 8 },
  appealDate: { fontSize: 11, color: '#666' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  modalContent: { backgroundColor: '#1a1a1a', borderRadius: 12, padding: 20, width: '100%', maxWidth: 400 },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#fff', marginBottom: 16 },
  modalUserInfo: { marginBottom: 12 },
  modalUserName: { fontSize: 16, fontWeight: '600', color: '#fff' },
  modalUserHandle: { fontSize: 12, color: '#888' },
  modalVideoInfo: { backgroundColor: '#0f0f0f', borderRadius: 8, padding: 12, marginBottom: 12 },
  modalVideoExercise: { fontSize: 14, fontWeight: '700', color: '#fff' },
  modalVideoStats: { fontSize: 12, color: '#888', marginTop: 4 },
  modalReasonLabel: { fontSize: 12, fontWeight: '600', color: '#888', marginBottom: 4 },
  modalReason: { fontSize: 13, color: '#ccc', marginBottom: 12, lineHeight: 18 },
  notesInput: { backgroundColor: '#0f0f0f', borderRadius: 8, padding: 12, color: '#fff', borderWidth: 1, borderColor: '#333', marginBottom: 16, minHeight: 80, textAlignVertical: 'top' },
  modalActions: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  modalButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, borderRadius: 8, gap: 8 },
  approveButton: { backgroundColor: '#00d4aa' },
  denyButton: { backgroundColor: '#ff3b30' },
  modalButtonText: { fontSize: 14, fontWeight: '700', color: '#fff' },
  closeButton: { padding: 12, alignItems: 'center' },
  closeButtonText: { fontSize: 14, color: '#888' },
});
