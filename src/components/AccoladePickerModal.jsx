import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import CustomAlert, { useCustomAlert } from './CustomAlert';

const ACCOLADES = [
  { id: 'admin', label: 'ADMIN', color: '#9b2c2c', icon: 'shield', description: 'Full administrative access' },
  { id: 'community_support', label: 'SUPPORT', color: '#3B82F6', icon: 'people', description: 'Community support team' },
  { id: 'beta', label: 'BETA TESTER', color: '#8B5CF6', icon: 'flask', description: 'Early access tester' },
  { id: 'staff', label: 'STAFF', color: '#10B981', icon: 'construct', description: 'Staff member' },
  { id: 'verified_athlete', label: 'VERIFIED ATHLETE', color: '#F59E0B', icon: 'checkmark-circle', description: 'Verified athlete status' },
  { id: 'founding_member', label: 'FOUNDER', color: '#D4AF37', icon: 'star', description: 'Founding member badge' },
  { id: 'challenge_master', label: 'CHALLENGE MASTER', color: '#6366F1', icon: 'trophy', description: 'Challenge champion' },
];

export default function AccoladePickerModal({
  visible,
  onClose,
  userId,
  currentAccolades = [],
  onAccoladesUpdated,
  api,
}) {
  const insets = useSafeAreaInsets();
  const { alertConfig, showAlert, hideAlert } = useCustomAlert();
  const [selectedAccolades, setSelectedAccolades] = useState([...currentAccolades]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (visible) {
      setSelectedAccolades([...currentAccolades]);
    }
  }, [visible, currentAccolades]);

  const toggleAccolade = (accoladeId) => {
    setSelectedAccolades(prev => {
      if (prev.includes(accoladeId)) {
        return prev.filter(a => a !== accoladeId);
      }
      return [...prev, accoladeId];
    });
  };

  const handleSave = async () => {
    try {
      setSaving(true);

      // Determine which to add and which to remove
      const toAdd = selectedAccolades.filter(a => !currentAccolades.includes(a));
      const toRemove = currentAccolades.filter(a => !selectedAccolades.includes(a));

      // Make API calls for changes
      const promises = [];

      for (const accolade of toAdd) {
        promises.push(api.post(`/api/admin/users/${userId}/accolades`, { accolade }));
      }

      for (const accolade of toRemove) {
        promises.push(api.delete(`/api/admin/users/${userId}/accolades/${accolade}`));
      }

      if (promises.length > 0) {
        await Promise.all(promises);
      }

      // Fetch updated user data
      const response = await api.get(`/api/admin/users/${userId}`);
      if (response?.success && response?.data?.user) {
        onAccoladesUpdated(response.data.user);
        showAlert({
          title: 'Success',
          message: 'Accolades updated successfully',
          icon: 'success',
          buttons: [{ text: 'OK', style: 'default', onPress: () => onClose() }]
        });
      } else {
        onAccoladesUpdated({ accolades: selectedAccolades });
        showAlert({
          title: 'Success',
          message: 'Accolades updated successfully',
          icon: 'success',
          buttons: [{ text: 'OK', style: 'default', onPress: () => onClose() }]
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
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Modal
        visible={visible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={onClose}
      >
        <View style={[styles.container, { paddingBottom: insets.bottom }]}>
          {/* Header */}
          <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
            <TouchableOpacity onPress={onClose} style={styles.headerButton}>
              <Text style={styles.headerButtonText}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Manage Accolades</Text>
            <TouchableOpacity
              onPress={handleSave}
              style={[styles.headerButton, styles.saveButton]}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator size="small" color="#9b2c2c" />
              ) : (
                <Text style={[styles.headerButtonText, styles.saveButtonText]}>Save</Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Content */}
          <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
            <View style={styles.content}>
              <Text style={styles.description}>
                Select the accolades to grant to this user. Accolades determine their permissions and badges.
              </Text>

              <View style={styles.accoladesList}>
                {ACCOLADES.map(accolade => {
                  const isSelected = selectedAccolades.includes(accolade.id);
                  return (
                    <TouchableOpacity
                      key={accolade.id}
                      style={[
                        styles.accoladeItem,
                        isSelected && styles.accoladeItemSelected,
                      ]}
                      onPress={() => toggleAccolade(accolade.id)}
                      activeOpacity={0.7}
                    >
                      <View style={[styles.accoladeIconContainer, { backgroundColor: `${accolade.color}20` }]}>
                        <Ionicons name={accolade.icon} size={24} color={accolade.color} />
                      </View>
                      <View style={styles.accoladeInfo}>
                        <View style={styles.accoladeHeader}>
                          <Text style={[styles.accoladeLabel, { color: accolade.color }]}>
                            {accolade.label}
                          </Text>
                          <View style={[
                            styles.checkbox,
                            isSelected && { backgroundColor: accolade.color, borderColor: accolade.color }
                          ]}>
                            {isSelected && (
                              <Ionicons name="checkmark" size={16} color="#fff" />
                            )}
                          </View>
                        </View>
                        <Text style={styles.accoladeDescription}>{accolade.description}</Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Selected Count */}
              <View style={styles.summary}>
                <Ionicons name="information-circle" size={16} color="#888" />
                <Text style={styles.summaryText}>
                  {selectedAccolades.length} accolade{selectedAccolades.length !== 1 ? 's' : ''} selected
                </Text>
              </View>
            </View>
          </ScrollView>
        </View>
      </Modal>

      <CustomAlert {...alertConfig} onClose={hideAlert} />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  headerButton: {
    paddingVertical: 8,
    paddingHorizontal: 4,
    minWidth: 60,
  },
  headerButtonText: {
    fontSize: 16,
    color: '#888',
  },
  saveButton: {
    minWidth: 60,
    alignItems: 'flex-end',
  },
  saveButtonText: {
    fontSize: 16,
    color: '#9b2c2c',
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  scroll: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  description: {
    fontSize: 14,
    color: '#888',
    lineHeight: 20,
    marginBottom: 20,
  },
  accoladesList: {
    gap: 12,
  },
  accoladeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    padding: 16,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  accoladeItemSelected: {
    borderColor: '#2a2a2a',
    backgroundColor: '#151515',
  },
  accoladeIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  accoladeInfo: {
    flex: 1,
  },
  accoladeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  accoladeLabel: {
    fontSize: 14,
    fontWeight: '700',
  },
  accoladeDescription: {
    fontSize: 12,
    color: '#888',
    lineHeight: 16,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#444',
    alignItems: 'center',
    justifyContent: 'center',
  },
  summary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8,
    marginTop: 8,
  },
  summaryText: {
    fontSize: 13,
    color: '#888',
  },
});
