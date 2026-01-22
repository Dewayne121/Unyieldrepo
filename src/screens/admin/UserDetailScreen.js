import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  TextInput,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'react-native';
import api from '../../services/api';

const REGIONS = ['Global', 'London', 'Manchester', 'Birmingham', 'Leeds', 'Glasgow'];
const GOALS = ['Hypertrophy', 'Leanness', 'Performance'];
const ACCOLADES = ['admin', 'community_support', 'beta', 'staff', 'verified_athlete', 'founding_member'];

export default function UserDetailScreen({ route, navigation }) {
  const insets = useSafeAreaInsets();
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
        Alert.alert('Error', 'Failed to load user data');
        navigation.goBack();
      }
    } catch (err) {
      console.error('Error loading user:', err);
      Alert.alert('Error', err.message || 'Failed to load user data');
      navigation.goBack();
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
        Alert.alert('Success', 'User updated successfully');
      } else {
        Alert.alert('Error', 'Failed to update user');
      }
    } catch (err) {
      console.error('Error updating user:', err);
      Alert.alert('Error', err.message || 'Failed to update user');
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
        Alert.alert('Success', hasAccolade ? 'Accolade removed' : 'Accolade added');
      } else {
        Alert.alert('Error', 'Failed to update accolades');
      }
    } catch (err) {
      console.error('Error updating accolades:', err);
      Alert.alert('Error', err.message || 'Failed to update accolades');
    }
  };

  const handleDeleteUser = () => {
    Alert.alert(
      'Delete User',
      'This will permanently delete this user and all their data. This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(`/api/admin/users/${userId}`);
              Alert.alert('Success', 'User deleted successfully');
              navigation.goBack();
            } catch (err) {
              console.error('Error deleting user:', err);
              Alert.alert('Error', err.message || 'Failed to delete user');
            }
          },
        },
      ]
    );
  };

  const handleSendNotification = () => {
    Alert.alert(
      'Send Notification',
      'Send a notification to this user?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Send',
          onPress: () => {
            navigation.navigate('AdminSendNotification', { userId, userName: userData?.name });
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.pageTitle}>User Details</Text>
          <View style={styles.headerRight} />
        </View>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#ff003c" />
        </View>
      </View>
    );
  }

  if (!userData) {
    return (
      <View style={styles.container}>
        <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
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

  const InfoRow = ({ label, value, onEdit, editable = true }) => (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <TouchableOpacity
        style={styles.infoValueContainer}
        onPress={editable && onEdit ? () => onEdit(label.toLowerCase(), value) : undefined}
        disabled={!editable || !onEdit}
      >
        <Text style={styles.infoValue}>{value || 'Not set'}</Text>
        {editable && onEdit && <Ionicons name="pencil" size={14} color="#888" />}
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
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.pageTitle}>User Details</Text>
        <TouchableOpacity onPress={handleSendNotification} style={styles.notifyButton}>
          <Ionicons name="notifications" size={20} color="#fff" />
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
              <View style={[styles.avatarPlaceholder, { backgroundColor: '#ff003c' }]}>
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
                  <Ionicons name="shield" size={10} color="#fff" />
                  <Text style={styles.accoladeBadgeText}>{accolade.replace('_', ' ')}</Text>
                </View>
              ))}
            </View>
          </View>

          <View style={styles.profileActions}>
            <TouchableOpacity style={styles.actionButton} onPress={handleDeleteUser}>
              <Ionicons name="trash-outline" size={20} color="#ff003c" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          <StatBox label="Total XP" value={userData.totalPoints || 0} icon="trophy" color="#ffcc00" />
          <StatBox label="Weekly XP" value={userData.weeklyPoints || 0} icon="calendar" color="#00d4aa" />
          <StatBox label="Rank" value={`#${userData.rank || 99}`} icon="medal" color="#ff9500" />
          <StatBox label="Streak" value={userData.streak || 0} icon="flame" color="#ff3b30" />
          <StatBox label="Best Streak" value={userData.streakBest || 0} icon="star" color="#5856d6" />
          <StatBox label="Workouts" value={userData.workoutCount || 0} icon="fitness" color="#32ade6" />
        </View>

        {/* Basic Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Basic Information</Text>
          <View style={styles.infoCard}>
            <InfoRow label="Name" value={userData.name} onEdit={handleEdit} />
            <InfoRow label="Username" value={userData.username} onEdit={handleEdit} />
            <InfoRow label="Email" value={userData.email} onEdit={handleEdit} />
            <InfoRow label="Bio" value={userData.bio} onEdit={handleEdit} />
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
                        Alert.alert('Error', 'Failed to update region');
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
                        Alert.alert('Error', 'Failed to update goal');
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
            <InfoRow label="Total Points" value={userData.totalPoints} onEdit={handleEdit} />
            <InfoRow label="Weekly Points" value={userData.weeklyPoints} onEdit={handleEdit} />
            <InfoRow label="Rank" value={userData.rank} onEdit={handleEdit} />
            <InfoRow label="Streak" value={userData.streak} onEdit={handleEdit} />
            <InfoRow label="Best Streak" value={userData.streakBest} onEdit={handleEdit} />
          </View>
        </View>

        {/* Accolades Management */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Accolades</Text>
          <View style={styles.accoladesGrid}>
            {ACCOLADES.map(accolade => {
              const hasAccolade = userData.accolades?.includes(accolade);
              return (
                <TouchableOpacity
                  key={accolade}
                  style={[
                    styles.accoladeToggle,
                    hasAccolade && styles.accoladeToggleActive,
                    accolade === 'admin' && styles.accoladeToggleAdmin,
                  ]}
                  onPress={() => handleToggleAccolade(accolade)}
                >
                  <Ionicons
                    name={hasAccolade ? 'checkmark-circle' : 'ellipse-outline'}
                    size={20}
                    color={hasAccolade ? '#fff' : '#666'}
                  />
                  <Text
                    style={[
                      styles.accoladeToggleText,
                      hasAccolade && styles.accoladeToggleTextActive,
                    ]}
                  >
                    {accolade.replace('_', ' ')}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
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
                <Text style={[styles.videoStatValue, { color: '#ff9500' }]}>
                  {userData.videos.pending || 0}
                </Text>
                <Text style={styles.videoStatLabel}>Pending</Text>
              </View>
              <View style={styles.videoStatItem}>
                <Text style={[styles.videoStatValue, { color: '#34c759' }]}>
                  {userData.videos.approved || 0}
                </Text>
                <Text style={styles.videoStatLabel}>Approved</Text>
              </View>
              <View style={styles.videoStatItem}>
                <Text style={[styles.videoStatValue, { color: '#ff3b30' }]}>
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
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.modalButtonTextSave}>Save</Text>
                )}
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
  },
  notifyButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#ff003c',
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 16,
    color: '#ff003c',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#0f0f0f',
    margin: 16,
    borderRadius: 12,
  },
  avatarContainer: {
    marginRight: 16,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
  },
  avatarPlaceholder: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 4,
  },
  profileHandle: {
    fontSize: 14,
    color: '#888',
    marginBottom: 8,
  },
  profileBadges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  accoladeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#222',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginRight: 6,
    marginBottom: 4,
  },
  accoladeBadgeText: {
    fontSize: 10,
    color: '#888',
    fontWeight: '600',
    marginLeft: 4,
  },
  profileActions: {
    gap: 8,
  },
  actionButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 0, 60, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  statBox: {
    width: '30%',
    backgroundColor: '#0f0f0f',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    marginRight: '3.33%',
    marginBottom: 12,
  },
  statBoxValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
    marginTop: 8,
  },
  statBoxLabel: {
    fontSize: 10,
    color: '#888',
    marginTop: 4,
  },
  section: {
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 12,
  },
  infoCard: {
    backgroundColor: '#0f0f0f',
    borderRadius: 12,
    padding: 16,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  infoLabel: {
    fontSize: 14,
    color: '#888',
    fontWeight: '500',
    flex: 1,
  },
  infoValueContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  infoValue: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '600',
  },
  dropdownContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  dropdownItem: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: '#1a1a1a',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#222',
  },
  dropdownItemSelected: {
    backgroundColor: '#ff003c',
    borderColor: '#ff003c',
  },
  dropdownItemText: {
    fontSize: 11,
    color: '#888',
    fontWeight: '600',
  },
  dropdownItemTextSelected: {
    color: '#fff',
  },
  accoladesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  accoladeToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0f0f0f',
    borderWidth: 1,
    borderColor: '#222',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
    gap: 8,
  },
  accoladeToggleActive: {
    backgroundColor: '#ff003c',
    borderColor: '#ff003c',
  },
  accoladeToggleAdmin: {
    borderColor: '#ff3b30',
  },
  accoladeToggleText: {
    fontSize: 12,
    color: '#888',
    fontWeight: '600',
  },
  accoladeToggleTextActive: {
    color: '#fff',
  },
  videoStats: {
    flexDirection: 'row',
    backgroundColor: '#0f0f0f',
    borderRadius: 12,
    padding: 16,
  },
  videoStatItem: {
    flex: 1,
    alignItems: 'center',
  },
  videoStatValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
  },
  videoStatLabel: {
    fontSize: 12,
    color: '#888',
    marginTop: 4,
  },
  auditLog: {
    backgroundColor: '#0f0f0f',
    borderRadius: 12,
    overflow: 'hidden',
  },
  auditLogItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  auditLogHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  auditLogAction: {
    fontSize: 12,
    color: '#ff003c',
    fontWeight: '600',
  },
  auditLogDate: {
    fontSize: 10,
    color: '#666',
  },
  auditLogAdmin: {
    fontSize: 11,
    color: '#888',
    marginTop: 2,
  },
  auditLogDetails: {
    fontSize: 10,
    color: '#666',
    marginTop: 4,
    fontFamily: 'monospace',
  },
  bottomSpacer: {
    height: 20,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContent: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 20,
    width: '100%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 16,
  },
  modalInput: {
    backgroundColor: '#0f0f0f',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: '#fff',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#333',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  modalButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  modalButtonCancel: {
    backgroundColor: '#222',
  },
  modalButtonSave: {
    backgroundColor: '#ff003c',
  },
  modalButtonTextCancel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  modalButtonTextSave: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
});
