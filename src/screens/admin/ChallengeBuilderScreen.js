import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import api from '../../services/api';
import { EXERCISES, EXERCISE_CATEGORIES } from '../../constants/exercises';
import { colors } from '../../constants/colors';

export default function ChallengeBuilderScreen({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const { challenge, isEdit } = route.params || {};
  const [saving, setSaving] = useState(false);

  // Form state
  const [title, setTitle] = useState(challenge?.title || '');
  const [description, setDescription] = useState(challenge?.description || '');
  const [challengeType, setChallengeType] = useState(challenge?.challengeType || 'exercise');
  const [selectedExercises, setSelectedExercises] = useState(challenge?.exercises || []);
  const [customMetricName, setCustomMetricName] = useState(challenge?.customMetricName || '');
  const [metricType, setMetricType] = useState(challenge?.metricType || 'reps');
  const [target, setTarget] = useState(challenge?.target?.toString() || '');
  const [startDate, setStartDate] = useState(challenge?.startDate ? new Date(challenge.startDate) : new Date());
  const [endDate, setEndDate] = useState(challenge?.endDate ? new Date(challenge.endDate) : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000));
  const [regionScope, setRegionScope] = useState(challenge?.regionScope || 'global');
  const [reward, setReward] = useState(challenge?.reward?.toString() || '100');
  const [rules, setRules] = useState(challenge?.rules || '');
  const [completionType, setCompletionType] = useState(challenge?.completionType || 'cumulative');
  const [winnerCriteria, setWinnerCriteria] = useState(challenge?.winnerCriteria || 'first_to_complete');
  const [requiresVideo, setRequiresVideo] = useState(challenge?.requiresVideo !== false);
  const [maxParticipants, setMaxParticipants] = useState(challenge?.maxParticipants?.toString() || '0');

  // UI state
  const [showExerciseSelector, setShowExerciseSelector] = useState(false);
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('chest');

  const REGIONS = ['global', 'London', 'Manchester', 'Birmingham', 'Leeds', 'Glasgow'];

  const handleSave = async () => {
    // Validation
    if (!title.trim()) {
      Alert.alert('Required', 'Please enter a challenge title');
      return;
    }
    if (!description.trim()) {
      Alert.alert('Required', 'Please enter a description');
      return;
    }
    if (challengeType === 'exercise' && selectedExercises.length === 0) {
      Alert.alert('Required', 'Please select at least one exercise');
      return;
    }
    if (challengeType === 'custom' && !customMetricName.trim()) {
      Alert.alert('Required', 'Please enter a custom metric name');
      return;
    }
    if (!target || parseInt(target) <= 0) {
      Alert.alert('Required', 'Please enter a valid target');
      return;
    }
    if (endDate <= startDate) {
      Alert.alert('Invalid', 'End date must be after start date');
      return;
    }

    try {
      setSaving(true);

      const challengeData = {
        title: title.trim(),
        description: description.trim(),
        challengeType,
        exercises: challengeType === 'exercise' ? selectedExercises : [],
        customMetricName: challengeType === 'custom' ? customMetricName.trim() : '',
        metricType,
        target: parseInt(target),
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        regionScope: regionScope.toLowerCase(),
        reward: parseInt(reward) || 100,
        rules: rules.trim(),
        completionType,
        winnerCriteria,
        requiresVideo,
        maxParticipants: parseInt(maxParticipants) || 0,
      };

      let response;
      if (isEdit && challenge) {
        response = await api.updateChallenge(challenge._id, challengeData);
      } else {
        response = await api.createChallenge(challengeData);
      }

      if (response.success) {
        Alert.alert(
          'Success',
          isEdit ? 'Challenge updated successfully' : 'Challenge created successfully',
          [
            {
              text: 'OK',
              onPress: () => navigation.goBack(),
            },
          ]
        );
      }
    } catch (err) {
      Alert.alert('Error', err.message || 'Failed to save challenge');
    } finally {
      setSaving(false);
    }
  };

  const toggleExercise = (exerciseId) => {
    setSelectedExercises(prev =>
      prev.includes(exerciseId)
        ? prev.filter(id => id !== exerciseId)
        : [...prev, exerciseId]
    );
  };

  const getFilteredExercises = () => {
    if (!EXERCISES || !Array.isArray(EXERCISES)) return [];
    return EXERCISES.filter(ex => ex.category === selectedCategory);
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top + 16 }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.pageTitle}>{isEdit ? 'Edit Challenge' : 'Create Challenge'}</Text>
        <TouchableOpacity
          style={[styles.saveButton, saving && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.saveButtonText}>Save</Text>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} keyboardShouldPersistTaps="handled">
        {/* Challenge Type */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Challenge Type</Text>
          <View style={styles.typeSelector}>
            {['exercise', 'metric', 'custom'].map(type => (
              <TouchableOpacity
                key={type}
                style={[styles.typeButton, challengeType === type && styles.typeButtonActive]}
                onPress={() => setChallengeType(type)}
              >
                <Text style={[styles.typeButtonText, challengeType === type && styles.typeButtonTextActive]}>
                  {type.charAt(0).toUpperCase() + type.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Title & Description */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Basic Info</Text>
          <TextInput
            style={styles.input}
            placeholder="Challenge Title"
            placeholderTextColor="#666"
            value={title}
            onChangeText={setTitle}
          />
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Description"
            placeholderTextColor="#666"
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={3}
          />
        </View>

        {/* Exercise Selection (for exercise challenges) */}
        {challengeType === 'exercise' && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Exercises</Text>
              <TouchableOpacity
                style={styles.selectButton}
                onPress={() => setShowExerciseSelector(true)}
              >
                <Text style={styles.selectButtonText}>
                  {selectedExercises.length} selected
                </Text>
                <Ionicons name="chevron-forward" size={16} color="#ff003c" />
              </TouchableOpacity>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.exercisesScroll}>
              {selectedExercises.map(exId => {
                const exercise = EXERCISES.find(e => e.id === exId);
                return exercise ? (
                  <View key={exId} style={styles.exerciseChip}>
                    <Text style={styles.exerciseChipText}>{exercise.name}</Text>
                    <TouchableOpacity onPress={() => toggleExercise(exId)}>
                      <Ionicons name="close-circle" size={16} color="#ff003c" />
                    </TouchableOpacity>
                  </View>
                ) : null;
              })}
              {selectedExercises.length === 0 && (
                <Text style={styles.emptyText}>No exercises selected</Text>
              )}
            </ScrollView>
          </View>
        )}

        {/* Custom Metric Name (for custom challenges) */}
        {challengeType === 'custom' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Custom Metric Name</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., Plank Hold, Sprint Distance"
              placeholderTextColor="#666"
              value={customMetricName}
              onChangeText={setCustomMetricName}
            />
          </View>
        )}

        {/* Metric Type */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Metric Type</Text>
          <View style={styles.metricSelector}>
            {['reps', 'weight', 'duration', 'workouts'].map(type => (
              <TouchableOpacity
                key={type}
                style={[styles.metricButton, metricType === type && styles.metricButtonActive]}
                onPress={() => setMetricType(type)}
              >
                <Text style={[styles.metricButtonText, metricType === type && styles.metricButtonTextActive]}>
                  {type.charAt(0).toUpperCase() + type.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Target */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Target</Text>
          <View style={styles.targetInputContainer}>
            <TextInput
              style={styles.targetInput}
              placeholder="0"
              placeholderTextColor="#666"
              value={target}
              onChangeText={setTarget}
              keyboardType="numeric"
            />
            <Text style={styles.targetUnit}>
              {metricType === 'reps' ? 'reps' : metricType === 'weight' ? 'kg' : metricType === 'duration' ? 'seconds' : 'sessions'}
            </Text>
          </View>
        </View>

        {/* Dates */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Duration</Text>
          <TouchableOpacity
            style={styles.dateButton}
            onPress={() => setShowStartDatePicker(true)}
          >
            <Ionicons name="calendar" size={20} color="#888" />
            <Text style={styles.dateButtonText}>
              Start: {startDate.toLocaleDateString()}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.dateButton}
            onPress={() => setShowEndDatePicker(true)}
          >
            <Ionicons name="calendar" size={20} color="#888" />
            <Text style={styles.dateButtonText}>
              End: {endDate.toLocaleDateString()}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Region */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Region Scope</Text>
          <View style={styles.metricSelector}>
            {REGIONS.map(region => (
              <TouchableOpacity
                key={region}
                style={[styles.metricButton, regionScope === region.toLowerCase() && styles.metricButtonActive]}
                onPress={() => setRegionScope(region.toLowerCase())}
              >
                <Text style={[styles.metricButtonText, regionScope === region.toLowerCase() && styles.metricButtonTextActive]}>
                  {region}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Reward */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Reward Points</Text>
          <TextInput
            style={styles.input}
            placeholder="100"
            placeholderTextColor="#666"
            value={reward}
            onChangeText={setReward}
            keyboardType="numeric"
          />
        </View>

        {/* Rules */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Rules (Optional)</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Enter any specific rules or requirements..."
            placeholderTextColor="#666"
            value={rules}
            onChangeText={setRules}
            multiline
            numberOfLines={4}
          />
        </View>

        {/* Completion Type */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Completion Type</Text>
          <View style={styles.optionsContainer}>
            {[
              { value: 'cumulative', label: 'Cumulative', desc: 'Add up all submissions' },
              { value: 'single_session', label: 'Single Session', desc: 'Best single session counts' },
              { value: 'best_effort', label: 'Best Effort', desc: 'Highest single submission wins' },
            ].map(option => (
              <TouchableOpacity
                key={option.value}
                style={[styles.optionCard, completionType === option.value && styles.optionCardActive]}
                onPress={() => setCompletionType(option.value)}
              >
                <Text style={[styles.optionTitle, completionType === option.value && styles.optionTitleActive]}>
                  {option.label}
                </Text>
                <Text style={styles.optionDesc}>{option.desc}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Video Requirement */}
        <View style={styles.section}>
          <View style={styles.toggleRow}>
            <Text style={styles.sectionTitle}>Require Video Proof</Text>
            <TouchableOpacity
              style={[styles.toggle, requiresVideo && styles.toggleActive]}
              onPress={() => setRequiresVideo(!requiresVideo)}
            >
              <Ionicons
                name={requiresVideo ? "checkmark" : "close"}
                size={20}
                color={requiresVideo ? "#000" : "#888"}
              />
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* Date Pickers */}
      {showStartDatePicker && (
        <DateTimePicker
          value={startDate}
          mode="date"
          minimumDate={new Date()}
          onChange={(event, date) => {
            setShowStartDatePicker(false);
            if (date) setStartDate(date);
          }}
        />
      )}
      {showEndDatePicker && (
        <DateTimePicker
          value={endDate}
          mode="date"
          minimumDate={new Date(startDate.getTime() + 24 * 60 * 60 * 1000)}
          onChange={(event, date) => {
            setShowEndDatePicker(false);
            if (date) setEndDate(date);
          }}
        />
      )}

      {/* Exercise Selector Modal */}
      <Modal visible={showExerciseSelector} transparent animationType="slide">
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Exercises</Text>
              <TouchableOpacity onPress={() => setShowExerciseSelector(false)}>
                <Ionicons name="close" size={28} color="#fff" />
              </TouchableOpacity>
            </View>

            {/* Category Tabs */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
              {Object.entries(EXERCISE_CATEGORIES).map(([key, label]) => (
                <TouchableOpacity
                  key={key}
                  style={[styles.categoryTab, selectedCategory === key && styles.categoryTabActive]}
                  onPress={() => setSelectedCategory(key)}
                >
                  <Text style={[styles.categoryTabText, selectedCategory === key && styles.categoryTabTextActive]}>
                    {label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Exercise List */}
            <ScrollView style={styles.exerciseList}>
              {getFilteredExercises().map(exercise => (
                <TouchableOpacity
                  key={exercise.id}
                  style={[styles.exerciseItem, selectedExercises.includes(exercise.id) && styles.exerciseItemActive]}
                  onPress={() => toggleExercise(exercise.id)}
                >
                  <Text style={[styles.exerciseName, selectedExercises.includes(exercise.id) && styles.exerciseNameActive]}>
                    {exercise.name}
                  </Text>
                  {selectedExercises.includes(exercise.id) && (
                    <Ionicons name="checkbox" size={24} color="#ff003c" />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>

            <TouchableOpacity
              style={styles.modalDoneButton}
              onPress={() => setShowExerciseSelector(false)}
            >
              <Text style={styles.modalDoneButtonText}>
                Done ({selectedExercises.length} selected)
              </Text>
            </TouchableOpacity>
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
    borderBottomWidth: 1,
    borderBottomColor: '#1a1a1a',
  },
  backButton: {
    padding: 8,
  },
  pageTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
  },
  saveButton: {
    backgroundColor: '#ff003c',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  saveButtonDisabled: {
    backgroundColor: '#333',
  },
  saveButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 12,
  },
  typeSelector: {
    flexDirection: 'row',
    gap: 8,
  },
  typeButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#1a1a1a',
    alignItems: 'center',
  },
  typeButtonActive: {
    backgroundColor: '#ff003c',
  },
  typeButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#888',
  },
  typeButtonTextActive: {
    color: '#fff',
  },
  input: {
    backgroundColor: '#1a1a1a',
    borderRadius: 8,
    padding: 14,
    color: '#fff',
    fontSize: 14,
    marginBottom: 12,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  selectButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  selectButtonText: {
    fontSize: 12,
    color: '#ff003c',
    fontWeight: '600',
  },
  exercisesScroll: {
    maxHeight: 40,
  },
  exerciseChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 8,
  },
  exerciseChipText: {
    fontSize: 12,
    color: '#fff',
    marginRight: 6,
  },
  emptyText: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
  },
  metricSelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  metricButton: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#1a1a1a',
  },
  metricButtonActive: {
    backgroundColor: '#ff003c',
  },
  metricButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#888',
  },
  metricButtonTextActive: {
    color: '#fff',
  },
  targetInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    borderRadius: 8,
    padding: 14,
  },
  targetInput: {
    flex: 1,
    fontSize: 16,
    color: '#fff',
  },
  targetUnit: {
    fontSize: 14,
    color: '#888',
    marginLeft: 8,
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    borderRadius: 8,
    padding: 14,
    marginBottom: 8,
  },
  dateButtonText: {
    fontSize: 14,
    color: '#fff',
    marginLeft: 12,
  },
  optionsContainer: {
    gap: 8,
  },
  optionCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 8,
    padding: 14,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  optionCardActive: {
    borderColor: '#ff003c',
  },
  optionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#888',
    marginBottom: 4,
  },
  optionTitleActive: {
    color: '#fff',
  },
  optionDesc: {
    fontSize: 12,
    color: '#666',
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    borderRadius: 8,
    padding: 14,
  },
  toggle: {
    width: 48,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#333',
    justifyContent: 'center',
    alignItems: 'center',
  },
  toggleActive: {
    backgroundColor: '#ff003c',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#050505',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    height: '80%',
    paddingTop: 16,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1a1a1a',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  categoryScroll: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  categoryTab: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#1a1a1a',
    marginRight: 8,
  },
  categoryTabActive: {
    backgroundColor: '#ff003c',
  },
  categoryTabText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#888',
  },
  categoryTabTextActive: {
    color: '#fff',
  },
  exerciseList: {
    flex: 1,
    padding: 16,
  },
  exerciseItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
    backgroundColor: '#0f0f0f',
    borderRadius: 8,
    marginBottom: 8,
  },
  exerciseItemActive: {
    backgroundColor: '#1a1a1a',
    borderWidth: 1,
    borderColor: '#ff003c',
  },
  exerciseName: {
    fontSize: 14,
    color: '#888',
  },
  exerciseNameActive: {
    color: '#fff',
    fontWeight: '600',
  },
  modalDoneButton: {
    backgroundColor: '#ff003c',
    margin: 16,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalDoneButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
});
