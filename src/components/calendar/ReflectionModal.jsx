import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/**
 * ReflectionModal - Modal for adding/editing daily reflection
 */
const ReflectionModal = ({
  visible,
  initialMood,
  initialEnergy,
  initialNotes,
  onSave,
  onClose,
}) => {
  const insets = useSafeAreaInsets();
  const [mood, setMood] = useState(initialMood || null);
  const [energy, setEnergy] = useState(initialEnergy || 5);
  const [notes, setNotes] = useState(initialNotes || '');
  const [saving, setSaving] = useState(false);

  const moodOptions = [
    { value: 'great', emoji: '🔥', label: 'Great' },
    { value: 'good', emoji: '😊', label: 'Good' },
    { value: 'neutral', emoji: '😐', label: 'Neutral' },
    { value: 'tired', emoji: '😫', label: 'Tired' },
    { value: 'exhausted', emoji: '😴', label: 'Exhausted' },
  ];

  const handleSave = async () => {
    if (saving) return;
    setSaving(true);
    try {
      await onSave({
        mood: mood || null,
        energyLevel: energy,
        dayNotes: notes.trim() || null,
      });
      // Reset form
      setMood(null);
      setEnergy(5);
      setNotes('');
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    setMood(null);
    setEnergy(5);
    setNotes('');
    onClose();
  };

  const remainingChars = 500 - (notes?.length || 0);

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
            <Ionicons name="create" size={24} color="#9b2c2c" />
            <Text style={styles.headerTitle}>Daily Reflection</Text>
          </View>

          <ScrollView
            style={styles.content}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Mood Selector */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>How did you feel today?</Text>
              <View style={styles.moodGrid}>
                {moodOptions.map((option) => (
                  <TouchableOpacity
                    key={option.value}
                    style={[
                      styles.moodButton,
                      mood === option.value && styles.moodButtonSelected,
                    ]}
                    onPress={() => setMood(option.value)}
                  >
                    <Text style={styles.moodEmoji}>{option.emoji}</Text>
                    <Text style={[
                      styles.moodLabel,
                      mood === option.value && styles.moodLabelSelected,
                    ]}>
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Energy Slider */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Energy Level</Text>
              <View style={styles.energyContainer}>
                <Text style={styles.energyLabel}>{energy}/10</Text>
                <View style={styles.energyBar}>
                  {Array.from({ length: 10 }, (_, i) => (
                    <TouchableOpacity
                      key={i}
                      style={[
                        styles.energySegment,
                        i < energy && styles.energySegmentFilled,
                      ]}
                      onPress={() => setEnergy(i + 1)}
                    />
                  ))}
                </View>
              </View>
            </View>

            {/* Notes Input */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>
                Notes <Text style={styles.optional}>(optional)</Text>
              </Text>
              <TextInput
                style={styles.notesInput}
                placeholder="How was the workout? Any achievements or challenges?"
                placeholderTextColor="#666"
                value={notes}
                onChangeText={setNotes}
                multiline
                maxLength={500}
                textAlignVertical="top"
              />
              <Text style={[
                styles.charCounter,
                remainingChars < 50 && styles.charCounterWarning,
              ]}>
                {remainingChars} characters left
              </Text>
            </View>
          </ScrollView>

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
              <Text style={styles.saveButtonText}>Save</Text>
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
    maxHeight: '80%',
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
  content: {
    flex: 1,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 12,
  },
  optional: {
    color: '#888',
    fontWeight: '400',
  },
  moodGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  moodButton: {
    flex: 1,
    minWidth: '30%',
    backgroundColor: '#0a0a0a',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  moodButtonSelected: {
    backgroundColor: 'rgba(155, 44, 44, 0.2)',
    borderColor: '#9b2c2c',
  },
  moodEmoji: {
    fontSize: 24,
    marginBottom: 4,
  },
  moodLabel: {
    fontSize: 12,
    color: '#888',
    fontWeight: '500',
  },
  moodLabelSelected: {
    color: '#fff',
  },
  energyContainer: {
    backgroundColor: '#0a0a0a',
    borderRadius: 12,
    padding: 14,
  },
  energyLabel: {
    fontSize: 24,
    fontWeight: '700',
    color: '#9b2c2c',
    marginBottom: 12,
  },
  energyBar: {
    flexDirection: 'row',
    gap: 4,
  },
  energySegment: {
    flex: 1,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  energySegmentFilled: {
    backgroundColor: '#9b2c2c',
  },
  notesInput: {
    backgroundColor: '#0a0a0a',
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    color: '#fff',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    minHeight: 120,
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
    marginTop: 8,
  },
  button: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
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
    backgroundColor: '#9b2c2c',
  },
  saveButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
  },
});

export default ReflectionModal;
