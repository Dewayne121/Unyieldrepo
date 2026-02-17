import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Modal, TextInput } from 'react-native';
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

const REPORT_TYPES = ['suspicious_lift', 'fake_video', 'inappropriate', 'spam', 'other'];

export default function ReportsManagementScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { alertConfig, showAlert, hideAlert } = useCustomAlert();
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
      showAlert({
        title: 'Error',
        message: 'Failed to load reports',
        icon: 'error',
        buttons: [{ text: 'OK', style: 'default' }]
      });
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
        showAlert({
          title: 'Success',
          message: `Report ${action}d`,
          icon: 'success',
          buttons: [{ text: 'OK', style: 'default' }]
        });
      }
    } catch (err) {
      showAlert({
        title: 'Error',
        message: 'Failed to review report',
        icon: 'error',
        buttons: [{ text: 'OK', style: 'default' }]
      });
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
            <Ionicons name={typeIcons[report.reportType] || 'flag'} size={16} color={C.white} />
            <Text style={styles.reportTypeText}>{report.reportType.replace(/_/g, ' ')}</Text>
          </View>
          <View style={[
            styles.statusBadge,
            { backgroundColor: report.status === 'pending' ? C.warning : report.status === 'resolved' ? C.success : C.textSubtle },
          ]}>
            <Text style={styles.statusText}>{report.status}</Text>
          </View>
        </View>

        <View style={styles.reportReporter}>
          <Ionicons name="person" size={12} color={C.textSubtle} />
          <Text style={styles.reportReporterText}>Reported by: {report.reporter?.name || 'Unknown'}</Text>
        </View>

        <Text style={styles.reportReason} numberOfLines={3}>{report.reason}</Text>

        <View style={styles.reportVideoInfo}>
          <Ionicons name="videocam" size={12} color={C.textSubtle} />
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
          <Ionicons name="arrow-back" size={20} color={C.white} />
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
          <ActivityIndicator size="large" color={C.accent} />
        </View>
      ) : reports.length === 0 ? (
        <View style={styles.centerContainer}>
          <Ionicons name="checkmark-circle-outline" size={64} color={C.success} />
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
                  <Ionicons name="flag" size={16} color={C.danger} />
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
                  placeholderTextColor={C.textSubtle}
                  value={reviewNotes}
                  onChangeText={setReviewNotes}
                  multiline
                  numberOfLines={3}
                />
                <View style={styles.modalActions}>
                  <TouchableOpacity style={[styles.modalButton, styles.dismissButton]} onPress={() => handleReview(selectedReport, 'dismiss')}>
                    <Ionicons name="close" size={18} color={C.white} />
                    <Text style={styles.modalButtonText}>Dismiss</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.modalButton, styles.resolveButton]} onPress={() => handleReview(selectedReport, 'resolve')}>
                    <Ionicons name="checkmark" size={18} color={C.white} />
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
  filtersScroll: {
    paddingHorizontal: S.xl,
    marginTop: S.sm,
    marginBottom: S.xs,
  },
  filtersContent: {
    paddingRight: S.xl,
    alignItems: 'center',
  },
  filterLabel: {
    ...T.caption,
    marginRight: 8,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    backgroundColor: C.card,
    borderRadius: R.pill,
    marginRight: 6,
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
  reportCard: {
    backgroundColor: C.card,
    borderRadius: R.lg,
    padding: S.md,
    marginBottom: S.md,
    borderWidth: 1,
    borderColor: C.border,
    ...ADMIN_SHADOWS.soft,
  },
  reportHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: S.sm,
  },
  reportTypeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.danger,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: R.md,
    gap: 4,
  },
  reportTypeText: {
    fontSize: 10,
    fontWeight: '700',
    color: C.white,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: R.md,
  },
  statusText: {
    fontSize: 9,
    fontWeight: '700',
    color: C.white,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  reportReporter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  reportReporterText: {
    fontSize: 11,
    color: C.textSubtle,
  },
  reportReason: {
    fontSize: 13,
    color: C.text,
    lineHeight: 18,
    marginBottom: 12,
  },
  reportVideoInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  reportVideoText: {
    fontSize: 12,
    color: C.textMuted,
  },
  reportDate: {
    fontSize: 10,
    color: C.textSubtle,
  },
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
  modalTitle: {
    ...T.h2,
    marginBottom: S.md,
  },
  modalReportInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  modalReportType: {
    fontSize: 12,
    fontWeight: '700',
    color: C.danger,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  modalReporter: {
    fontSize: 12,
    color: C.textSubtle,
    marginBottom: 12,
  },
  modalReasonLabel: {
    ...T.caption,
    marginBottom: 4,
  },
  modalReason: {
    fontSize: 13,
    color: C.text,
    lineHeight: 18,
    marginBottom: 12,
  },
  modalVideoInfo: {
    backgroundColor: C.panel,
    borderRadius: R.md,
    padding: S.sm,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: C.border,
  },
  modalVideoExercise: {
    fontSize: 13,
    fontWeight: '700',
    color: C.text,
  },
  modalVideoStats: {
    fontSize: 11,
    color: C.textSubtle,
    marginTop: 4,
  },
  actionLabel: {
    ...T.caption,
    marginBottom: 8,
  },
  actionScroll: {
    marginBottom: 16,
  },
  actionChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: C.panel,
    borderRadius: R.md,
    marginRight: 8,
    borderWidth: 1,
    borderColor: C.border,
  },
  actionChipActive: {
    backgroundColor: C.accentSoft,
    borderColor: C.accent,
  },
  actionChipText: {
    fontSize: 11,
    color: C.textSubtle,
    fontWeight: '600',
  },
  actionChipTextActive: {
    color: C.accent,
  },
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
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  modalButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: R.md,
    gap: 6,
  },
  dismissButton: {
    backgroundColor: C.textSubtle,
  },
  resolveButton: {
    backgroundColor: C.success,
  },
  modalButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: C.white,
  },
  closeButton: {
    padding: 12,
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 12,
    color: C.textSubtle,
  },
});
