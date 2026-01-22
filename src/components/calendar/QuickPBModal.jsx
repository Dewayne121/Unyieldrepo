import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/**
 * QuickPBModal - Bottom sheet modal for quickly marking a PB
 */
const QuickPBModal = ({
  visible,
  exercise,
  reps,
  weight,
  onSave,
  onClose,
}) => {
  const insets = useSafeAreaInsets();
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (saving) return;
    setSaving(true);
    try {
      await onSave(note.trim());
      setNote('');
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    setNote('');
    onClose();
  };

  const remainingChars = 100 - (note?.length || 0);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardContainer}
      >
        <View style={[styles.modalContainer, { paddingBottom: insets.bottom + 16 }]}>
          {/* Handle bar */}
          <View style={styles.handleBar} />

          {/* Header */}
          <View style={styles.header}>
            <Ionicons name="trophy" size={24} color="#d4af37" />
            <Text style={styles.headerTitle}>New Personal Best</Text>
          </View>

          {/* Exercise info */}
          <View style={styles.exerciseInfo}>
            <Text style={styles.exerciseName}>{exercise}</Text>
            <Text style={styles.exerciseStats}>
              {weight}kg × {reps} reps
            </Text>
          </View>

          {/* Note input */}
          <View style={styles.noteSection}>
            <Text style={styles.noteLabel}>
              Note <Text style={styles.noteOptional}>(optional)</Text>
            </Text>
            <TextInput
              style={styles.noteInput}
              placeholder="How did it feel? Finally hit your goal?"
              placeholderTextColor="#666"
              value={note}
              onChangeText={setNote}
              multiline
              maxLength={100}
              autoFocus
            />
            <Text style={[
              styles.charCounter,
              remainingChars < 10 && styles.charCounterWarning,
            ]}>
              {remainingChars} characters left
            </Text>
          </View>

          {/* Buttons */}
          <View style={styles.buttons}>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton]}
              onPress={handleClose}
              disabled={saving}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, styles.saveButton]}
              onPress={handleSave}
              disabled={saving}
            >
              <Ionicons name="trophy" size={18} color="#000" />
              <Text style={styles.saveButtonText}>Save PB</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  keyboardContainer: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#1a1a1a',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 16,
  },
  handleBar: {
    width: 40,
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
    marginLeft: 12,
  },
  exerciseInfo: {
    backgroundColor: '#0a0a0a',
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.3)',
  },
  exerciseName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 4,
  },
  exerciseStats: {
    fontSize: 14,
    color: '#d4af37',
  },
  noteSection: {
    marginBottom: 16,
  },
  noteLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 8,
  },
  noteOptional: {
    color: '#888',
    fontWeight: '400',
  },
  noteInput: {
    backgroundColor: '#0a0a0a',
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    color: '#fff',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    minHeight: 80,
    textAlignVertical: 'top',
  },
  charCounter: {
    fontSize: 12,
    color: '#666',
    textAlign: 'right',
    marginTop: 6,
  },
  charCounterWarning: {
    color: '#ff3b30',
  },
  buttons: {
    flexDirection: 'row',
    gap: 12,
  },
  button: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  cancelButton: {
    backgroundColor: '#0a0a0a',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  cancelButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#888',
  },
  saveButton: {
    backgroundColor: '#d4af37',
  },
  saveButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#000',
  },
});

export default QuickPBModal;
