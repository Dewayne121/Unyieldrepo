import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import CustomAlert, { useCustomAlert } from './CustomAlert';

const REGIONS = ['Global', 'London', 'Manchester', 'Birmingham', 'Leeds', 'Glasgow'];
const GOALS = ['Hypertrophy', 'Leanness', 'Performance'];

export default function AdminProfileEditModal({
  visible,
  onClose,
  user,
  onUserUpdated,
  api,
}) {
  const insets = useSafeAreaInsets();
  const { alertConfig, showAlert, hideAlert } = useCustomAlert();

  // Form state
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [bio, setBio] = useState('');
  const [region, setRegion] = useState('Global');
  const [goal, setGoal] = useState('Hypertrophy');
  const [saving, setSaving] = useState(false);
  const [showRegionDropdown, setShowRegionDropdown] = useState(false);
  const [showGoalDropdown, setShowGoalDropdown] = useState(false);

  useEffect(() => {
    if (visible && user) {
      setName(user.name || '');
      setUsername(user.username || '');
      setEmail(user.email || '');
      setBio(user.bio || '');
      setRegion(user.region || 'Global');
      setGoal(user.goal || 'Hypertrophy');
    }
  }, [visible, user]);

  const handleSave = async () => {
    // Basic validation
    if (!name.trim()) {
      showAlert({
        title: 'Validation Error',
        message: 'Name is required',
        icon: 'error',
        buttons: [{ text: 'OK', style: 'default' }]
      });
      return;
    }

    if (!username.trim()) {
      showAlert({
        title: 'Validation Error',
        message: 'Username is required',
        icon: 'error',
        buttons: [{ text: 'OK', style: 'default' }]
      });
      return;
    }

    if (email && !email.includes('@')) {
      showAlert({
        title: 'Validation Error',
        message: 'Invalid email format',
        icon: 'error',
        buttons: [{ text: 'OK', style: 'default' }]
      });
      return;
    }

    try {
      setSaving(true);

      const updateData = {
        name: name.trim(),
        username: username.trim(),
        email: email.trim(),
        bio: bio.trim(),
        region,
        goal,
      };

      const response = await api.patch(`/api/admin/users/${user.id || user._id}`, updateData);

      if (response?.success) {
        // Fetch updated user data
        const userResponse = await api.get(`/api/admin/users/${user.id || user._id}`);
        if (userResponse?.success && userResponse?.data?.user) {
          onUserUpdated(userResponse.data.user);
        } else {
          onUserUpdated({ ...user, ...updateData });
        }
        showAlert({
          title: 'Success',
          message: 'Profile updated successfully',
          icon: 'success',
          buttons: [{ text: 'OK', style: 'default', onPress: () => onClose() }]
        });
      } else {
        throw new Error(response?.message || 'Failed to update profile');
      }
    } catch (err) {
      console.error('Error updating profile:', err);
      showAlert({
        title: 'Error',
        message: err.message || 'Failed to update profile',
        icon: 'error',
        buttons: [{ text: 'OK', style: 'default' }]
      });
    } finally {
      setSaving(false);
    }
  };

  const Dropdown = ({ options, selected, onSelect, visible, onClose }) => {
    if (!visible) return null;

    return (
      <>
        <TouchableOpacity style={styles.dropdownOverlay} onPress={onClose} activeOpacity={1}>
          <View style={styles.dropdownContent}>
            <Text style={styles.dropdownTitle}>Select Option</Text>
            {options.map(option => (
              <TouchableOpacity
                key={option}
                style={[styles.dropdownItem, selected === option && styles.dropdownItemSelected]}
                onPress={() => {
                  onSelect(option);
                  onClose();
                }}
              >
                <Text style={[
                  styles.dropdownItemText,
                  selected === option && styles.dropdownItemTextSelected
                ]}>
                  {option}
                </Text>
                {selected === option && (
                  <Ionicons name="checkmark" size={18} color="#9b2c2c" />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </>
    );
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
            <Text style={styles.headerTitle}>Edit Profile</Text>
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
              {/* Basic Info Section */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Basic Information</Text>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Display Name</Text>
                  <View style={styles.inputContainer}>
                    <Ionicons name="person" size={20} color="#666" style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      value={name}
                      onChangeText={setName}
                      placeholder="Enter display name"
                      placeholderTextColor="#555"
                    />
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Username</Text>
                  <View style={styles.inputContainer}>
                    <Ionicons name="at" size={20} color="#666" style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      value={username}
                      onChangeText={setUsername}
                      placeholder="Enter username"
                      placeholderTextColor="#555"
                      autoCapitalize="none"
                    />
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Email</Text>
                  <View style={styles.inputContainer}>
                    <Ionicons name="mail" size={20} color="#666" style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      value={email}
                      onChangeText={setEmail}
                      placeholder="Enter email"
                      placeholderTextColor="#555"
                      autoCapitalize="none"
                      keyboardType="email-address"
                    />
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Bio</Text>
                  <View style={[styles.inputContainer, styles.textAreaContainer]}>
                    <TextInput
                      style={[styles.input, styles.textArea]}
                      value={bio}
                      onChangeText={setBio}
                      placeholder="Enter bio"
                      placeholderTextColor="#555"
                      multiline
                      numberOfLines={4}
                      textAlignVertical="top"
                    />
                  </View>
                </View>
              </View>

              {/* Preferences Section */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Preferences</Text>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Region</Text>
                  <TouchableOpacity
                    style={styles.dropdownButton}
                    onPress={() => setShowRegionDropdown(true)}
                  >
                    <Text style={styles.dropdownButtonText}>{region}</Text>
                    <Ionicons name="chevron-down" size={20} color="#666" />
                  </TouchableOpacity>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Goal</Text>
                  <TouchableOpacity
                    style={styles.dropdownButton}
                    onPress={() => setShowGoalDropdown(true)}
                  >
                    <Text style={styles.dropdownButtonText}>{goal}</Text>
                    <Ionicons name="chevron-down" size={20} color="#666" />
                  </TouchableOpacity>
                </View>
              </View>

              {/* User Info */}
              <View style={styles.infoBox}>
                <Ionicons name="information-circle" size={16} color="#888" />
                <Text style={styles.infoText}>
                  You are editing @{username}'s profile as an admin.
                </Text>
              </View>
            </View>
          </ScrollView>
        </View>

        {/* Dropdowns */}
        <Dropdown
          options={REGIONS}
          selected={region}
          onSelect={setRegion}
          visible={showRegionDropdown}
          onClose={() => setShowRegionDropdown(false)}
        />
        <Dropdown
          options={GOALS}
          selected={goal}
          onSelect={setGoal}
          visible={showGoalDropdown}
          onClose={() => setShowGoalDropdown(false)}
        />
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
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#888',
    letterSpacing: 1,
    marginBottom: 16,
    textTransform: 'uppercase',
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2a2a2a',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: '#fff',
  },
  textAreaContainer: {
    paddingVertical: 14,
    height: 100,
  },
  textArea: {
    height: '100%',
    textAlignVertical: 'top',
  },
  dropdownButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2a2a2a',
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  dropdownButtonText: {
    fontSize: 15,
    color: '#fff',
  },
  dropdownOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  dropdownContent: {
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    width: '80%',
    maxWidth: 320,
    borderWidth: 1,
    borderColor: '#2a2a2a',
  },
  dropdownTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#888',
    padding: 16,
    paddingBottom: 8,
    textTransform: 'uppercase',
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#2a2a2a',
  },
  dropdownItemSelected: {
    backgroundColor: 'rgba(155, 44, 44, 0.1)',
  },
  dropdownItemText: {
    fontSize: 15,
    color: '#fff',
  },
  dropdownItemTextSelected: {
    color: '#9b2c2c',
    fontWeight: '600',
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(155, 44, 44, 0.1)',
    borderRadius: 12,
    padding: 14,
    gap: 10,
    borderWidth: 1,
    borderColor: 'rgba(155, 44, 44, 0.3)',
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: '#888',
    lineHeight: 18,
  },
});
