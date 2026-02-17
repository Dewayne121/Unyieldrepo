import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'react-native';
import CustomAlert, { useCustomAlert } from '../../components/CustomAlert';
import AccoladePickerModal from '../../components/AccoladePickerModal';
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

const REGIONS = ['Global', 'London', 'Manchester', 'Birmingham', 'Leeds', 'Glasgow'];
const GOALS = ['Hypertrophy', 'Leanness', 'Performance'];
const ACCOLADES = ['admin', 'community_support', 'beta', 'staff', 'verified_athlete', 'founding_member', 'challenge_master'];

// Accolade display labels
const ACCOLADE_LABELS = {
  admin: 'ADMIN',
  community_support: 'SUPPORT',
  beta: 'BETA TESTER',
  staff: 'STAFF',
  verified_athlete: 'VERIFIED ATHLETE',
  founding_member: 'FOUNDER',
  challenge_master: 'CHALLENGE MASTER',
};

const getAccoladeLabel = (accolade) => ACCOLADE_LABELS[accolade] || accolade.replace('_', ' ').toUpperCase();

export default function UserDetailScreen({ route, navigation }) {
  const insets = useSafeAreaInsets();
  const { alertConfig, showAlert, hideAlert } = useCustomAlert();
  const { userId } = route.params;
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [userData, setUserData] = useState(null);
  const [recentWorkouts, setRecentWorkouts] = useState([]);
  const [recentVideos, setRecentVideos] = useState([]);
  const [auditLog, setAuditLog] = useState([]);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editField, setEditField] = useState(null);
  const [editValue, setEditValue] = useState('');
  const [showAccoladePicker, setShowAccoladePicker] = useState(false);

  const loadUserData = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/api/admin/users/${userId}`);
      if (response?.success) {
        setUserData(response.data.user);
        setRecentWorkouts(response.data.recentWorkouts || []);
        setRecentVideos(response.data.recentVideos || []);
        setAuditLog(response.data.auditLog || []);
      } else {
        showAlert({
          title: 'Error',
          message: 'Failed to load user data',
          icon: 'error',
          buttons: [{ text: 'OK', style: 'default', onPress: () => navigation.goBack() }]
        });
      }
    } catch (err) {
      console.error('Error loading user:', err);
      showAlert({
        title: 'Error',
        message: err.message || 'Failed to load user data',
        icon: 'error',
        buttons: [{ text: 'OK', style: 'default', onPress: () => navigation.goBack() }]
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUserData();
  }, [userId]);

  const handleEdit = (field, currentValue) => {
    setEditField(field);
    setEditValue(currentValue?.toString() || '');
    setEditModalVisible(true);
  };

  const handleSaveEdit = async () => {
    try {
      setSaving(true);
      const updateData = {};

      switch (editField) {
        case 'name':
          updateData.name = editValue;
          break;
        case 'username':
          updateData.username = editValue;
          break;
        case 'email':
          updateData.email = editValue;
          break;
        case 'bio':
          updateData.bio = editValue;
          break;
        case 'weight':
          updateData.weight = parseFloat(editValue) || null;
          break;
        case 'height':
          updateData.height = parseFloat(editValue) || null;
          break;
        case 'age':
          updateData.age = parseInt(editValue) || null;
          break;
        case 'totalPoints':
          updateData.totalPoints = parseInt(editValue) || 0;
          break;
        case 'weeklyPoints':
          updateData.weeklyPoints = parseInt(editValue) || 0;
          break;
        case 'rank':
          updateData.rank = parseInt(editValue) || 99;
          break;
        case 'streak':
          updateData.streak = parseInt(editValue) || 0;
          break;
        case 'streakBest':
          updateData.streakBest = parseInt(editValue) || 0;
          break;
      }

      const response = await api.patch(`/api/admin/users/${userId}`, updateData);
      if (response?.success) {
        setUserData(response.data);
        setEditModalVisible(false);
        showAlert({
          title: 'Success',
          message: 'User updated successfully',
          icon: 'success',
          buttons: [{ text: 'OK', style: 'default' }]
        });
      } else {
        showAlert({
          title: 'Error',
          message: 'Failed to update user',
          icon: 'error',
          buttons: [{ text: 'OK', style: 'default' }]
        });
      }
    } catch (err) {
      console.error('Error updating user:', err);
      showAlert({
        title: 'Error',
        message: err.message || 'Failed to update user',
        icon: 'error',
        buttons: [{ text: 'OK', style: 'default' }]
      });
    } finally {
      setSaving(false);
    }
  };

  const handleToggleAccolade = async (accolade) => {
    try {
      const hasAccolade = userData?.accolades?.includes(accolade);
      const response = hasAccolade
        ? await api.delete(`/api/admin/users/${userId}/accolades/${accolade}`)
        : await api.post(`/api/admin/users/${userId}/accolades`, { accolade });

      if (response?.success) {
        setUserData(prev => ({
          ...prev,
          accolades: response.data.accolades,
        }));
        showAlert({
          title: 'Success',
          message: hasAccolade ? 'Accolade removed' : 'Accolade added',
          icon: 'success',
          buttons: [{ text: 'OK', style: 'default' }]
        });
      } else {
        showAlert({
          title: 'Error',
          message: 'Failed to update accolades',
          icon: 'error',
          buttons: [{ text: 'OK', style: 'default' }]
        });
      }
    } catch (err) {
      console.error('Error updating accolades:', err);
      showAlert({
        title: 'Error',
        message: err.message || 'Failed to update accolades',
        icon: 'error',
        buttons: [{ text: 'OK', style: 'default' }]
      });
    }
  };

  const handleOpenAccoladePicker = () => {
    setShowAccoladePicker(true);
  };

  const handleAccoladesUpdated = (updatedUser) => {
    setUserData(prev => ({ ...prev, ...updatedUser }));
  };

  const handleDeleteUser = () => {
    showAlert({
      title: 'Delete User',
      message: 'This will permanently delete this user and all their data. This action cannot be undone.',
      icon: 'warning',
      buttons: [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(`/api/admin/users/${userId}`);
              showAlert({
                title: 'Success',
                message: 'User deleted successfully',
                icon: 'success',
                buttons: [{ text: 'OK', style: 'default', onPress: () => navigation.goBack() }]
              });
            } catch (err) {
              console.error('Error deleting user:', err);
              showAlert({
                title: 'Error',
                message: err.message || 'Failed to delete user',
                icon: 'error',
                buttons: [{ text: 'OK', style: 'default' }]
              });
            }
          },
        },
      ]
    });
  };

  const handleSendNotification = () => {
    showAlert({
      title: 'Send Notification',
      message: 'Send a notification to this user?',
      icon: 'info',
      buttons: [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Send',
          style: 'default',
          onPress: () => {
            navigation.navigate('AdminSendNotification', { userId, userName: userData?.name });
          },
        },
      ]
    });
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={20} color={C.white} />
          </TouchableOpacity>
          <Text style={styles.pageTitle}>User Details</Text>
          <View style={styles.headerRight} />
        </View>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={C.accent} />
        </View>
      </View>
    );
  }

  if (!userData) {
    return (
      <View style={styles.container}>
        <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={20} color={C.white} />
          </TouchableOpacity>
          <Text style={styles.pageTitle}>User Details</Text>
          <View style={styles.headerRight} />
        </View>
        <View style={styles.centerContainer}>
          <Text style={styles.errorText}>User not found</Text>
        </View>
      </View>
    );
  }

  const InfoRow = ({ label, value, onEdit, editable = true, field }) => (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <TouchableOpacity
        style={styles.infoValueContainer}
        onPress={editable && onEdit ? () => onEdit(field || label.toLowerCase(), value) : undefined}
        disabled={!editable || !onEdit}
      >
        <Text style={styles.infoValue}>{value ?? 'Not set'}</Text>
        {editable && onEdit && <Ionicons name="pencil" size={14} color={C.textSubtle} />}
      </TouchableOpacity>
    </View>
  );

  const StatBox = ({ label, value, icon, color }) => (
    <View style={styles.statBox}>
      <Ionicons name={icon} size={20} color={color} />
      <Text style={styles.statBoxValue}>{value}</Text>
      <Text style={styles.statBoxLabel}>{label}</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={20} color={C.white} />
        </TouchableOpacity>
        <Text style={styles.pageTitle}>User Details</Text>
        <TouchableOpacity onPress={handleSendNotification} style={styles.notifyButton}>
          <Ionicons name="notifications" size={20} color={C.white} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Header */}
        <View style={styles.profileHeader}>
          <View style={styles.avatarContainer}>
            {userData.profileImage ? (
              <Image source={{ uri: userData.profileImage }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatarPlaceholder, { backgroundColor: C.accent }]}>
                <Text style={styles.avatarInitial}>
                  {String(userData.name || userData.username || 'U').charAt(0).toUpperCase()}
                </Text>
              </View>
            )}
          </View>

          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>{String(userData.name || 'Unknown')}</Text>
            <Text style={styles.profileHandle}>@{String(userData.username || 'unknown')}</Text>
            <View style={styles.profileBadges}>
              {userData.accolades?.map((accolade, index) => (
                <View key={index} style={styles.accoladeBadge}>
                  <Ionicons name="shield" size={10} color={C.white} />
                  <Text style={styles.accoladeBadgeText}>{getAccoladeLabel(accolade)}</Text>
                </View>
              ))}
            </View>
          </View>

          <View style={styles.profileActions}>
            <TouchableOpacity style={styles.actionButton} onPress={handleDeleteUser}>
              <Ionicons name="trash-outline" size={20} color={C.accent} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          <StatBox label="Total XP" value={userData.totalPoints || 0} icon="trophy" color={C.warning} />
          <StatBox label="Weekly XP" value={userData.weeklyPoints || 0} icon="calendar" color={C.success} />
          <StatBox label="Rank" value={`#${userData.rank || 99}`} icon="medal" color={C.warning} />
          <StatBox label="Streak" value={userData.streak || 0} icon="flame" color={C.danger} />
          <StatBox label="Best Streak" value={userData.streakBest || 0} icon="star" color={C.info} />
          <StatBox label="Workouts" value={userData.workoutCount || 0} icon="fitness" color={C.info} />
        </View>

        {/* Basic Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Basic Information</Text>
          <View style={styles.infoCard}>
            <InfoRow label="Name" value={userData.name} onEdit={handleEdit} field="name" />
            <InfoRow label="Username" value={userData.username} onEdit={handleEdit} field="username" />
            <InfoRow label="Email" value={userData.email} onEdit={handleEdit} field="email" />
            <InfoRow label="Bio" value={userData.bio} onEdit={handleEdit} field="bio" />
            <InfoRow label="Weight (kg)" value={userData.weight} onEdit={handleEdit} field="weight" />
            <InfoRow label="Height (cm)" value={userData.height} onEdit={handleEdit} field="height" />
            <InfoRow label="Age" value={userData.age} onEdit={handleEdit} field="age" />
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Region</Text>
              <View style={styles.dropdownContainer}>
                {REGIONS.map(region => (
                  <TouchableOpacity
                    key={region}
                    style={[
                      styles.dropdownItem,
                      userData.region === region && styles.dropdownItemSelected,
                    ]}
                    onPress={async () => {
                      try {
                        await api.patch(`/api/admin/users/${userId}`, { region });
                        setUserData(prev => ({ ...prev, region }));
                      } catch (err) {
                        showAlert({
                          title: 'Error',
                          message: 'Failed to update region',
                          icon: 'error',
                          buttons: [{ text: 'OK', style: 'default' }]
                        });
                      }
                    }}
                  >
                    <Text
                      style={[
                        styles.dropdownItemText,
                        userData.region === region && styles.dropdownItemTextSelected,
                      ]}
                    >
                      {region}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Goal</Text>
              <View style={styles.dropdownContainer}>
                {GOALS.map(goal => (
                  <TouchableOpacity
                    key={goal}
                    style={[
                      styles.dropdownItem,
                      userData.goal === goal && styles.dropdownItemSelected,
                    ]}
                    onPress={async () => {
                      try {
                        await api.patch(`/api/admin/users/${userId}`, { goal });
                        setUserData(prev => ({ ...prev, goal }));
                      } catch (err) {
                        showAlert({
                          title: 'Error',
                          message: 'Failed to update goal',
                          icon: 'error',
                          buttons: [{ text: 'OK', style: 'default' }]
                        });
                      }
                    }}
                  >
                    <Text
                      style={[
                        styles.dropdownItemText,
                        userData.goal === goal && styles.dropdownItemTextSelected,
                      ]}
                    >
                      {goal}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            <InfoRow label="Provider" value={userData.provider} editable={false} />
            <InfoRow
              label="Joined"
              value={new Date(userData.createdAt).toLocaleDateString()}
              editable={false}
            />
          </View>
        </View>

        {/* Game Stats */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Game Stats</Text>
          <View style={styles.infoCard}>
            <InfoRow label="Total Points" value={userData.totalPoints} onEdit={handleEdit} field="totalPoints" />
            <InfoRow label="Weekly Points" value={userData.weeklyPoints} onEdit={handleEdit} field="weeklyPoints" />
            <InfoRow label="Rank" value={userData.rank} onEdit={handleEdit} field="rank" />
            <InfoRow label="Streak" value={userData.streak} onEdit={handleEdit} field="streak" />
            <InfoRow label="Best Streak" value={userData.streakBest} onEdit={handleEdit} field="streakBest" />
          </View>
        </View>

        {/* Accolades Management */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Accolades</Text>
          <View style={styles.accoladesDisplay}>
            {userData.accolades?.map((accolade, index) => (
              <View key={index} style={styles.accoladeBadgeSmall}>
                <Ionicons name="shield" size={10} color={C.white} />
                <Text style={styles.accoladeBadgeTextSmall}>{getAccoladeLabel(accolade)}</Text>
              </View>
            ))}
            {(!userData.accolades || userData.accolades.length === 0) && (
              <Text style={styles.noAccoladesText}>No accolades assigned</Text>
            )}
          </View>
          <TouchableOpacity
            style={styles.manageAccoladesButton}
            onPress={handleOpenAccoladePicker}
          >
            <Ionicons name="shield-checkmark" size={18} color={C.accent} />
            <Text style={styles.manageAccoladesText}>Manage Accolades</Text>
          </TouchableOpacity>
        </View>

        {/* Video Stats */}
        {userData.videos && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Videos</Text>
            <View style={styles.videoStats}>
              <View style={styles.videoStatItem}>
                <Text style={styles.videoStatValue}>{userData.videos.total || 0}</Text>
                <Text style={styles.videoStatLabel}>Total</Text>
              </View>
              <View style={styles.videoStatItem}>
                <Text style={[styles.videoStatValue, { color: C.warning }]}>
                  {userData.videos.pending || 0}
                </Text>
                <Text style={styles.videoStatLabel}>Pending</Text>
              </View>
              <View style={styles.videoStatItem}>
                <Text style={[styles.videoStatValue, { color: C.success }]}>
                  {userData.videos.approved || 0}
                </Text>
                <Text style={styles.videoStatLabel}>Approved</Text>
              </View>
              <View style={styles.videoStatItem}>
                <Text style={[styles.videoStatValue, { color: C.danger }]}>
                  {userData.videos.rejected || 0}
                </Text>
                <Text style={styles.videoStatLabel}>Rejected</Text>
              </View>
            </View>
          </View>
        )}

        {/* Audit Log */}
        {auditLog.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Audit Log</Text>
            <View style={styles.auditLog}>
              {auditLog.map((log, index) => (
                <View key={index} style={styles.auditLogItem}>
                  <View style={styles.auditLogHeader}>
                    <Text style={styles.auditLogAction}>{log.action.replace(/_/g, ' ')}</Text>
                    <Text style={styles.auditLogDate}>
                      {new Date(log.createdAt).toLocaleString()}
                    </Text>
                  </View>
                  {log.admin && (
                    <Text style={styles.auditLogAdmin}>By: {log.admin.name || log.admin.username}</Text>
                  )}
                  {log.details && (
                    <Text style={styles.auditLogDetails}>
                      {JSON.stringify(log.details, null, 2)}
                    </Text>
                  )}
                </View>
              ))}
            </View>
          </View>
        )}

        <View style={styles.bottomSpacer} />
      </ScrollView>

      {/* Edit Modal */}
      <Modal visible={editModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Edit {editField}</Text>
            <TextInput
              style={styles.modalInput}
              value={editValue}
              onChangeText={setEditValue}
              autoFocus
              multiline={editField === 'bio'}
              numberOfLines={editField === 'bio' ? 4 : 1}
              keyboardType={
                ['weight', 'height', 'age'].includes(editField?.toLowerCase())
                  ? 'decimal-pad'
                  : ['totalpoints', 'weeklypoints', 'rank', 'streak', 'streakbest'].includes(editField?.toLowerCase())
                  ? 'number-pad'
                  : 'default'
              }
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonCancel]}
                onPress={() => setEditModalVisible(false)}
              >
                <Text style={styles.modalButtonTextCancel}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonSave]}
                onPress={handleSaveEdit}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator size="small" color={C.white} />
                ) : (
                  <Text style={styles.modalButtonTextSave}>Save</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Accolade Picker Modal */}
      <AccoladePickerModal
        visible={showAccoladePicker}
        onClose={() => setShowAccoladePicker(false)}
        userId={userData?.id || userData?._id}
        currentAccolades={userData?.accolades || []}
        onAccoladesUpdated={handleAccoladesUpdated}
        api={api}
      />

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
  pageTitle: { ...T.h2, flex: 1 },
  headerRight: { width: 34 },
  notifyButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: C.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  errorText: { fontSize: 14, color: C.accent },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: S.xxl },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: S.lg,
    backgroundColor: C.card,
    margin: S.xl,
    borderRadius: R.lg,
    borderWidth: 1,
    borderColor: C.border,
  },
  avatarContainer: { marginRight: S.md },
  avatar: { width: 64, height: 64, borderRadius: 32 },
  avatarPlaceholder: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: { fontSize: 22, fontWeight: '700', color: C.white },
  profileInfo: { flex: 1 },
  profileName: { fontSize: 16, fontWeight: '700', color: C.text, marginBottom: 4 },
  profileHandle: { fontSize: 12, color: C.textSubtle, marginBottom: 8 },
  profileBadges: { flexDirection: 'row', flexWrap: 'wrap' },
  accoladeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.surface,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginRight: 6,
    marginBottom: 4,
    borderWidth: 1,
    borderColor: C.border,
  },
  accoladeBadgeText: { fontSize: 9, color: C.textSubtle, fontWeight: '600', marginLeft: 4 },
  profileActions: { gap: 8 },
  actionButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: C.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: S.xl,
    marginBottom: S.lg,
    gap: 10,
  },
  statBox: {
    width: '31%',
    backgroundColor: C.card,
    borderRadius: R.md,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: C.border,
  },
  statBoxValue: { fontSize: 18, fontWeight: '700', color: C.text, marginTop: 6 },
  statBoxLabel: { fontSize: 9, color: C.textSubtle, marginTop: 4 },
  section: { paddingHorizontal: S.xl, marginBottom: S.xl },
  sectionTitle: { ...T.caption, marginBottom: S.sm },
  infoCard: {
    backgroundColor: C.card,
    borderRadius: R.lg,
    padding: S.md,
    borderWidth: 1,
    borderColor: C.border,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: C.border,
  },
  infoLabel: { fontSize: 12, color: C.textSubtle, fontWeight: '500', flex: 1 },
  infoValueContainer: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  infoValue: { fontSize: 12, color: C.text, fontWeight: '600' },
  dropdownContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  dropdownItem: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: C.panel,
    borderRadius: R.md,
    borderWidth: 1,
    borderColor: C.border,
  },
  dropdownItemSelected: { backgroundColor: C.accentSoft, borderColor: C.accent },
  dropdownItemText: { fontSize: 10, color: C.textSubtle, fontWeight: '600' },
  dropdownItemTextSelected: { color: C.accent },
  accoladesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  accoladeToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: R.md,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
  },
  accoladeToggleActive: { backgroundColor: C.accentSoft, borderColor: C.accent },
  accoladeToggleAdmin: { borderColor: C.danger },
  accoladeToggleText: { fontSize: 11, color: C.textSubtle, fontWeight: '600' },
  accoladeToggleTextActive: { color: C.accent },
  // New accolade display styles
  accoladesDisplay: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  accoladeBadgeSmall: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.accent,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: R.sm,
    gap: 4,
  },
  accoladeBadgeTextSmall: { fontSize: 10, color: C.white, fontWeight: '700' },
  noAccoladesText: { fontSize: 12, color: C.textSubtle, fontStyle: 'italic' },
  manageAccoladesButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.accent,
    borderRadius: R.md,
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 10,
  },
  manageAccoladesText: { fontSize: 13, color: C.accent, fontWeight: '600' },
  videoStats: {
    flexDirection: 'row',
    backgroundColor: C.card,
    borderRadius: R.lg,
    padding: S.md,
    borderWidth: 1,
    borderColor: C.border,
  },
  videoStatItem: { flex: 1, alignItems: 'center' },
  videoStatValue: { fontSize: 20, fontWeight: '700', color: C.text },
  videoStatLabel: { fontSize: 10, color: C.textSubtle, marginTop: 4 },
  auditLog: {
    backgroundColor: C.card,
    borderRadius: R.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: C.border,
  },
  auditLogItem: {
    padding: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: C.border,
  },
  auditLogHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  auditLogAction: { fontSize: 11, color: C.accent, fontWeight: '600' },
  auditLogDate: { fontSize: 10, color: C.textSubtle },
  auditLogAdmin: { fontSize: 11, color: C.textSubtle, marginTop: 2 },
  auditLogDetails: { fontSize: 10, color: C.textSubtle, marginTop: 4, fontFamily: T.mono.fontFamily },
  bottomSpacer: { height: 20 },
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
  modalInput: {
    backgroundColor: C.panel,
    borderRadius: R.md,
    padding: 12,
    fontSize: 13,
    color: C.text,
    marginBottom: S.md,
    borderWidth: 1,
    borderColor: C.border,
  },
  modalButtons: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12 },
  modalButton: { paddingHorizontal: 18, paddingVertical: 10, borderRadius: R.md },
  modalButtonCancel: { backgroundColor: C.surface },
  modalButtonSave: { backgroundColor: C.accent },
  modalButtonTextCancel: { fontSize: 12, fontWeight: '600', color: C.text },
  modalButtonTextSave: { fontSize: 12, fontWeight: '600', color: C.white },
});
