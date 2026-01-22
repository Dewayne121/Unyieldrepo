import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert, Modal, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import api from '../../services/api';

const REPORT_TYPES = ['suspicious_lift', 'fake_video', 'inappropriate', 'spam', 'other'];

export default function ReportsManagementScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [reports, setReports] = useState([]);
  const [selectedReport, setSelectedReport] = useState(null);
  const [reviewNotes, setReviewNotes] = useState('');
  const [actionTaken, setActionTaken] = useState('no_action');
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [statusFilter, setStatusFilter] = useState('pending');
  const [typeFilter, setTypeFilter] = useState('');

  const loadReports = async () => {
    try {
      setLoading(true);
      const queryParams = new URLSearchParams({
        ...(statusFilter && statusFilter !== 'all' && { status: statusFilter }),
        ...(typeFilter && { reportType: typeFilter }),
      }).toString();

      const response = await api.get(`/api/admin/reports${queryParams ? '?' + queryParams : ''}`);
      if (response?.success) {
        setReports(response.data.reports);
      }
    } catch (err) {
      console.error('Error loading reports:', err);
      Alert.alert('Error', 'Failed to load reports');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadReports();
  }, [statusFilter, typeFilter]);

  const handleReview = async (report, action) => {
    try {
      const response = await api.post(`/api/admin/reports/${report._id}/review`, {
        action,
        reviewNotes,
        actionTaken: action === 'resolve' ? actionTaken : 'no_action',
      });
      if (response?.success) {
        setReports(prev => prev.filter(r => r._id !== report._id));
        setShowReviewModal(false);
        setReviewNotes('');
        setActionTaken('no_action');
        Alert.alert('Success', `Report ${action}d`);
      }
    } catch (err) {
      Alert.alert('Error', 'Failed to review report');
    }
  };

  const ReportCard = ({ report, onPress }) => {
    const typeIcons = {
      suspicious_lift: 'alert-circle',
      fake_video: 'videocam-off',
      inappropriate: 'ban',
      spam: 'chatbubbles',
      other: 'ellipsis-horizontal',
    };

    return (
      <TouchableOpacity style={styles.reportCard} onPress={() => onPress(report)}>
        <View style={styles.reportHeader}>
          <View style={styles.reportTypeBadge}>
            <Ionicons name={typeIcons[report.reportType] || 'flag'} size={16} color="#fff" />
            <Text style={styles.reportTypeText}>{report.reportType.replace(/_/g, ' ')}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: report.status === 'pending' ? '#ff9500' : report.status === 'resolved' ? '#00d4aa' : '#666' }]}>
            <Text style={styles.statusText}>{report.status}</Text>
          </View>
        </View>

        <View style={styles.reportReporter}>
          <Ionicons name="person" size={12} color="#888" />
          <Text style={styles.reportReporterText}>Reported by: {report.reporter?.name || 'Unknown'}</Text>
        </View>

        <Text style={styles.reportReason} numberOfLines={3}>{report.reason}</Text>

        <View style={styles.reportVideoInfo}>
          <Ionicons name="videocam" size={12} color="#888" />
          <Text style={styles.reportVideoText}>{report.videoSubmission?.exercise || 'Unknown exercise'}</Text>
        </View>

        <Text style={styles.reportDate}>{new Date(report.createdAt).toLocaleString()}</Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.pageTitle}>Reports</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filtersScroll} contentContainerStyle={styles.filtersContent}>
        <Text style={styles.filterLabel}>Status:</Text>
        {['pending', 'resolved', 'dismissed', 'all'].map(status => (
          <TouchableOpacity key={status} style={[styles.filterChip, statusFilter === status && styles.filterChipActive]} onPress={() => setStatusFilter(status)}>
            <Text style={[styles.filterChipText, statusFilter === status && styles.filterChipTextActive]}>{status.charAt(0).toUpperCase() + status.slice(1)}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filtersScroll} contentContainerStyle={styles.filtersContent}>
        <Text style={styles.filterLabel}>Type:</Text>
        <TouchableOpacity style={[styles.filterChip, typeFilter === '' && styles.filterChipActive]} onPress={() => setTypeFilter('')}>
          <Text style={[styles.filterChipText, typeFilter === '' && styles.filterChipTextActive]}>All</Text>
        </TouchableOpacity>
        {REPORT_TYPES.map(type => (
          <TouchableOpacity key={type} style={[styles.filterChip, typeFilter === type && styles.filterChipActive]} onPress={() => setTypeFilter(type)}>
            <Text style={[styles.filterChipText, typeFilter === type && styles.filterChipTextActive]}>{type.replace(/_/g, ' ')}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#ff003c" />
        </View>
      ) : reports.length === 0 ? (
        <View style={styles.centerContainer}>
          <Ionicons name="checkmark-circle-outline" size={64} color="#00d4aa" />
          <Text style={styles.emptyText}>No reports found</Text>
        </View>
      ) : (
        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
          {reports.map(report => (
            <ReportCard
              key={report._id}
              report={report}
              onPress={(r) => {
                setSelectedReport(r);
                setShowReviewModal(true);
              }}
            />
          ))}
        </ScrollView>
      )}

      <Modal visible={showReviewModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {selectedReport && (
              <>
                <Text style={styles.modalTitle}>Review Report</Text>
                <View style={styles.modalReportInfo}>
                  <Ionicons name="flag" size={16} color="#ff3b30" />
                  <Text style={styles.modalReportType}>{selectedReport.reportType.replace(/_/g, ' ')}</Text>
                </View>
                <Text style={styles.modalReporter}>Reported by: {selectedReport.reporter?.name || 'Unknown'}</Text>
                <Text style={styles.modalReasonLabel}>Reason:</Text>
                <Text style={styles.modalReason}>{selectedReport.reason}</Text>
                {selectedReport.videoSubmission && (
                  <View style={styles.modalVideoInfo}>
                    <Text style={styles.modalVideoExercise}>{selectedReport.videoSubmission.exercise}</Text>
                    <Text style={styles.modalVideoStats}>
                      {selectedReport.videoSubmission.reps} reps × {selectedReport.videoSubmission.weight || 0}kg
                    </Text>
                  </View>
                )}
                <Text style={styles.actionLabel}>Action Taken:</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.actionScroll}>
                  {['no_action', 'warning_issued', 'video_removed', 'user_suspended'].map(action => (
                    <TouchableOpacity
                      key={action}
                      style={[styles.actionChip, actionTaken === action && styles.actionChipActive]}
                      onPress={() => setActionTaken(action)}
                    >
                      <Text style={[styles.actionChipText, actionTaken === action && styles.actionChipTextActive]}>
                        {action.replace(/_/g, ' ')}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
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
                  <TouchableOpacity style={[styles.modalButton, styles.dismissButton]} onPress={() => handleReview(selectedReport, 'dismiss')}>
                    <Ionicons name="close" size={20} color="#fff" />
                    <Text style={styles.modalButtonText}>Dismiss</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.modalButton, styles.resolveButton]} onPress={() => handleReview(selectedReport, 'resolve')}>
                    <Ionicons name="checkmark" size={20} color="#fff" />
                    <Text style={styles.modalButtonText}>Resolve</Text>
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
  filtersScroll: { paddingHorizontal: 16, marginBottom: 12 },
  filtersContent: { paddingRight: 16 },
  filterLabel: { fontSize: 12, fontWeight: '600', color: '#888', marginRight: 8, alignSelf: 'center' },
  filterChip: { paddingHorizontal: 12, paddingVertical: 4, backgroundColor: '#0f0f0f', borderRadius: 12, marginRight: 6 },
  filterChipActive: { backgroundColor: '#ff003c' },
  filterChipText: { fontSize: 11, color: '#888', fontWeight: '600' },
  filterChipTextActive: { color: '#fff' },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { marginTop: 16, fontSize: 16, color: '#888' },
  scroll: { flex: 1 },
  scrollContent: { padding: 16 },
  reportCard: { backgroundColor: '#0f0f0f', borderRadius: 12, padding: 16, marginBottom: 12 },
  reportHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  reportTypeBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#ff3b30', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, gap: 4 },
  reportTypeText: { fontSize: 11, fontWeight: '700', color: '#fff', textTransform: 'uppercase' },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  statusText: { fontSize: 10, fontWeight: '700', color: '#fff', textTransform: 'uppercase' },
  reportReporter: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  reportReporterText: { fontSize: 11, color: '#888' },
  reportReason: { fontSize: 13, color: '#ccc', lineHeight: 18, marginBottom: 12 },
  reportVideoInfo: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  reportVideoText: { fontSize: 12, color: '#888' },
  reportDate: { fontSize: 10, color: '#666' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  modalContent: { backgroundColor: '#1a1a1a', borderRadius: 12, padding: 20, width: '100%', maxWidth: 400 },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#fff', marginBottom: 16 },
  modalReportInfo: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  modalReportType: { fontSize: 14, fontWeight: '700', color: '#ff3b30', textTransform: 'uppercase' },
  modalReporter: { fontSize: 12, color: '#888', marginBottom: 12 },
  modalReasonLabel: { fontSize: 12, fontWeight: '600', color: '#888', marginBottom: 4 },
  modalReason: { fontSize: 13, color: '#ccc', lineHeight: 18, marginBottom: 12 },
  modalVideoInfo: { backgroundColor: '#0f0f0f', borderRadius: 8, padding: 12, marginBottom: 16 },
  modalVideoExercise: { fontSize: 14, fontWeight: '700', color: '#fff' },
  modalVideoStats: { fontSize: 12, color: '#888', marginTop: 4 },
  actionLabel: { fontSize: 12, fontWeight: '600', color: '#888', marginBottom: 8 },
  actionScroll: { marginBottom: 16 },
  actionChip: { paddingHorizontal: 12, paddingVertical: 6, backgroundColor: '#0f0f0f', borderRadius: 8, marginRight: 8, borderWidth: 1, borderColor: '#333' },
  actionChipActive: { backgroundColor: '#ff003c', borderColor: '#ff003c' },
  actionChipText: { fontSize: 11, color: '#888', fontWeight: '600' },
  actionChipTextActive: { color: '#fff' },
  notesInput: { backgroundColor: '#0f0f0f', borderRadius: 8, padding: 12, color: '#fff', borderWidth: 1, borderColor: '#333', marginBottom: 16, minHeight: 80, textAlignVertical: 'top' },
  modalActions: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  modalButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, borderRadius: 8, gap: 8 },
  dismissButton: { backgroundColor: '#666' },
  resolveButton: { backgroundColor: '#00d4aa' },
  modalButtonText: { fontSize: 14, fontWeight: '700', color: '#fff' },
  closeButton: { padding: 12, alignItems: 'center' },
  closeButtonText: { fontSize: 14, color: '#888' },
});
