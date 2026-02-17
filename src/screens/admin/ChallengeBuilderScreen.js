import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import CustomAlert, { useCustomAlert } from '../../components/CustomAlert';
import api from '../../services/api';
import { EXERCISES, EXERCISE_CATEGORIES } from '../../constants/exercises';
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

export default function ChallengeBuilderScreen({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const { alertConfig, showAlert, hideAlert } = useCustomAlert();
  const { challenge, isEdit } = route.params || {};
  const [saving, setSaving] = useState(false);
  const getChallengeId = (item) => item?.id || item?._id || null;

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
      showAlert({
        title: 'Required',
        message: 'Please enter a challenge title',
        icon: 'warning',
        buttons: [{ text: 'OK', style: 'default' }]
      });
      return;
    }
    if (!description.trim()) {
      showAlert({
        title: 'Required',
        message: 'Please enter a description',
        icon: 'warning',
        buttons: [{ text: 'OK', style: 'default' }]
      });
      return;
    }
    if (challengeType === 'exercise' && selectedExercises.length === 0) {
      showAlert({
        title: 'Required',
        message: 'Please select at least one exercise',
        icon: 'warning',
        buttons: [{ text: 'OK', style: 'default' }]
      });
      return;
    }
    if (challengeType === 'custom' && !customMetricName.trim()) {
      showAlert({
        title: 'Required',
        message: 'Please enter a custom metric name',
        icon: 'warning',
        buttons: [{ text: 'OK', style: 'default' }]
      });
      return;
    }
    if (!target || parseInt(target) <= 0) {
      showAlert({
        title: 'Required',
        message: 'Please enter a valid target',
        icon: 'warning',
        buttons: [{ text: 'OK', style: 'default' }]
      });
      return;
    }
    if (endDate <= startDate) {
      showAlert({
        title: 'Invalid',
        message: 'End date must be after start date',
        icon: 'warning',
        buttons: [{ text: 'OK', style: 'default' }]
      });
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
        const challengeId = getChallengeId(challenge);
        if (!challengeId) {
          throw new Error('Challenge ID is missing.');
        }
        response = await api.updateChallenge(challengeId, challengeData);
      } else {
        response = await api.createChallenge(challengeData);
      }

      if (response.success) {
        showAlert({
          title: 'Success',
          message: isEdit ? 'Challenge updated successfully' : 'Challenge created successfully',
          icon: 'success',
          buttons: [{
            text: 'OK',
            onPress: () => navigation.goBack(),
          }]
        });
      }
    } catch (err) {
      showAlert({
        title: 'Error',
        message: err.message || 'Failed to save challenge',
        icon: 'error',
        buttons: [{ text: 'OK', style: 'default' }]
      });
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
          <Ionicons name="arrow-back" size={20} color={C.white} />
        </TouchableOpacity>
        <Text style={styles.pageTitle}>{isEdit ? 'Edit Challenge' : 'Create Challenge'}</Text>
        <TouchableOpacity
          style={[styles.saveButton, saving && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator size="small" color={C.white} />
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
            placeholderTextColor={C.textSubtle}
            value={title}
            onChangeText={setTitle}
          />
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Description"
            placeholderTextColor={C.textSubtle}
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
                <Ionicons name="chevron-forward" size={16} color={C.accent} />
              </TouchableOpacity>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.exercisesScroll}>
              {selectedExercises.map(exId => {
                const exercise = EXERCISES.find(e => e.id === exId);
                return exercise ? (
                  <View key={exId} style={styles.exerciseChip}>
                    <Text style={styles.exerciseChipText}>{exercise.name}</Text>
                    <TouchableOpacity onPress={() => toggleExercise(exId)}>
                      <Ionicons name="close-circle" size={16} color={C.accent} />
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
              placeholderTextColor={C.textSubtle}
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
              placeholderTextColor={C.textSubtle}
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
            <Ionicons name="calendar" size={20} color={C.textSubtle} />
            <Text style={styles.dateButtonText}>
              Start: {startDate.toLocaleDateString()}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.dateButton}
            onPress={() => setShowEndDatePicker(true)}
          >
            <Ionicons name="calendar" size={20} color={C.textSubtle} />
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
            placeholderTextColor={C.textSubtle}
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
            placeholderTextColor={C.textSubtle}
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
                color={requiresVideo ? C.black : C.textSubtle}
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
                <Ionicons name="close" size={28} color={C.white} />
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
                    <Ionicons name="checkbox" size={24} color={C.accent} />
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
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.border,
  },
  pageTitle: {
    flex: 1,
    textAlign: 'center',
    ...T.h2,
  },
  saveButton: {
    backgroundColor: C.accent,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: R.md,
  },
  saveButtonDisabled: {
    backgroundColor: C.surface,
  },
  saveButtonText: {
    color: C.white,
    fontWeight: '700',
    fontSize: 12,
    letterSpacing: 0.8,
  },
  content: { flex: 1, padding: S.xl },
  section: { marginBottom: S.xl },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: { ...T.caption, marginBottom: 10 },
  typeSelector: { flexDirection: 'row', gap: 8 },
  typeButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: R.md,
    backgroundColor: C.card,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: C.border,
  },
  typeButtonActive: { backgroundColor: C.accentSoft, borderColor: C.accent },
  typeButtonText: { fontSize: 11, fontWeight: '600', color: C.textSubtle },
  typeButtonTextActive: { color: C.accent },
  input: {
    backgroundColor: C.panel,
    borderRadius: R.md,
    padding: 12,
    color: C.text,
    fontSize: 13,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: C.border,
  },
  textArea: { minHeight: 80, textAlignVertical: 'top' },
  selectButton: { flexDirection: 'row', alignItems: 'center' },
  selectButtonText: { fontSize: 11, color: C.accent, fontWeight: '600' },
  exercisesScroll: { maxHeight: 40 },
  exerciseChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.surface,
    borderRadius: R.pill,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 8,
    borderWidth: 1,
    borderColor: C.border,
  },
  exerciseChipText: { fontSize: 11, color: C.text, marginRight: 6 },
  emptyText: { fontSize: 11, color: C.textSubtle, fontStyle: 'italic' },
  metricSelector: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  metricButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: R.pill,
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.border,
  },
  metricButtonActive: { backgroundColor: C.accentSoft, borderColor: C.accent },
  metricButtonText: { fontSize: 11, fontWeight: '600', color: C.textSubtle },
  metricButtonTextActive: { color: C.accent },
  targetInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.panel,
    borderRadius: R.md,
    padding: 12,
    borderWidth: 1,
    borderColor: C.border,
  },
  targetInput: { flex: 1, fontSize: 14, color: C.text },
  targetUnit: { fontSize: 12, color: C.textSubtle, marginLeft: 8 },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.panel,
    borderRadius: R.md,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: C.border,
  },
  dateButtonText: { fontSize: 12, color: C.text, marginLeft: 10 },
  optionsContainer: { gap: 8 },
  optionCard: {
    backgroundColor: C.card,
    borderRadius: R.md,
    padding: 12,
    borderWidth: 1,
    borderColor: C.border,
  },
  optionCardActive: { borderColor: C.accent },
  optionTitle: { fontSize: 13, fontWeight: '700', color: C.text, marginBottom: 4 },
  optionTitleActive: { color: C.accent },
  optionDesc: { fontSize: 11, color: C.textSubtle },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: C.card,
    borderRadius: R.md,
    padding: 12,
    borderWidth: 1,
    borderColor: C.border,
  },
  toggle: {
    width: 46,
    height: 26,
    borderRadius: 13,
    backgroundColor: C.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  toggleActive: { backgroundColor: C.accent },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: C.panel,
    borderTopLeftRadius: R.xl,
    borderTopRightRadius: R.xl,
    height: '80%',
    paddingTop: 16,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: S.xl,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: C.border,
  },
  modalTitle: { ...T.h2 },
  categoryScroll: { paddingHorizontal: S.xl, paddingVertical: 12 },
  categoryTab: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: R.pill,
    backgroundColor: C.card,
    marginRight: 8,
    borderWidth: 1,
    borderColor: C.border,
  },
  categoryTabActive: { backgroundColor: C.accentSoft, borderColor: C.accent },
  categoryTabText: { fontSize: 11, fontWeight: '600', color: C.textSubtle },
  categoryTabTextActive: { color: C.accent },
  exerciseList: { flex: 1, padding: S.xl },
  exerciseItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    backgroundColor: C.card,
    borderRadius: R.md,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: C.border,
  },
  exerciseItemActive: { borderColor: C.accent },
  exerciseName: { fontSize: 13, color: C.textSubtle },
  exerciseNameActive: { color: C.text, fontWeight: '600' },
  modalDoneButton: {
    backgroundColor: C.accent,
    margin: S.xl,
    padding: 14,
    borderRadius: R.md,
    alignItems: 'center',
  },
  modalDoneButtonText: { fontSize: 14, fontWeight: '700', color: C.white, letterSpacing: 0.6 },
});
