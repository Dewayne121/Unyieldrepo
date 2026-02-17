import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useWorkout, TRACKING_TYPES } from '../context/WorkoutContext';
import { useApp } from '../context/AppContext';
import { EXERCISES, EXERCISE_CATEGORIES } from '../constants/exercises';
import { useTheme } from '../context/ThemeContext';
import { SKINS } from '../constants/colors';
import ScreenHeader from '../components/ScreenHeader';
import CustomAlert, { useCustomAlert } from '../components/CustomAlert';

export default function TemplateBuilderScreen({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const { theme, skin } = useTheme();
  const isDark = skin === SKINS.operator || skin === SKINS.midnight;
  const { templates, createTemplate, updateTemplate } = useWorkout();
  const { alertConfig, showAlert, hideAlert } = useCustomAlert();

  const templateId = route.params?.templateId;
  const isEditing = !!templateId;

  const [templateName, setTemplateName] = useState('');
  const [description, setDescription] = useState('');
  const [exercises, setExercises] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [showExercisePicker, setShowExercisePicker] = useState(false);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [configExerciseIndex, setConfigExerciseIndex] = useState(null);

  // Load template if editing
  useEffect(() => {
    if (templateId) {
      const template = templates.find(t => t.id === templateId);
      if (template) {
        setTemplateName(template.name);
        setDescription(template.description || '');
        setExercises(template.exercises || []);
      }
    }
  }, [templateId, templates]);

  // Filter exercises by category
  const filteredExercises = useMemo(() => {
    if (selectedCategory === 'all') return EXERCISES;
    return EXERCISES.filter(e => e.category === selectedCategory);
  }, [selectedCategory]);

  const handleAddExercise = (exercise) => {
    const newExercise = {
      id: Math.random().toString(36).slice(2),
      exerciseId: exercise.id,
      exerciseName: exercise.name,
      orderIndex: exercises.length,
      trackingType: TRACKING_TYPES.STRENGTH,
      defaultSets: 3,
      targetRepRange: '8-10',
      restSeconds: 90,
      notes: '',
    };
    setExercises([...exercises, newExercise]);
    setShowExercisePicker(false);
  };

  const handleRemoveExercise = (index) => {
    showAlert({
      title: 'Remove Exercise',
      message: 'Remove this exercise from the template?',
      icon: 'warning',
      buttons: [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => {
            const newExercises = exercises.filter((_, i) => i !== index);
            // Update order indices
            setExercises(newExercises.map((ex, i) => ({ ...ex, orderIndex: i })));
          },
        },
      ]
    });
  };

  const handleMoveExercise = (fromIndex, toIndex) => {
    if (toIndex < 0 || toIndex >= exercises.length) return;
    const newExercises = [...exercises];
    const [moved] = newExercises.splice(fromIndex, 1);
    newExercises.splice(toIndex, 0, moved);
    // Update order indices
    setExercises(newExercises.map((ex, i) => ({ ...ex, orderIndex: i })));
  };

  const handleConfigureExercise = (index) => {
    setConfigExerciseIndex(index);
    setShowConfigModal(true);
  };

  const handleSaveConfig = (config) => {
    const newExercises = [...exercises];
    newExercises[configExerciseIndex] = {
      ...newExercises[configExerciseIndex],
      ...config,
    };
    setExercises(newExercises);
    setShowConfigModal(false);
    setConfigExerciseIndex(null);
  };

  const handleSave = () => {
    if (!templateName.trim()) {
      showAlert({
        title: 'Error',
        message: 'Please enter a template name',
        icon: 'error',
        buttons: [{ text: 'OK', style: 'default' }]
      });
      return;
    }

    if (exercises.length === 0) {
      showAlert({
        title: 'Error',
        message: 'Please add at least one exercise',
        icon: 'error',
        buttons: [{ text: 'OK', style: 'default' }]
      });
      return;
    }

    const templateData = {
      name: templateName.trim(),
      description: description.trim(),
      exercises,
    };

    if (isEditing) {
      updateTemplate(templateId, templateData);
      showAlert({
        title: 'Success',
        message: 'Template updated successfully',
        icon: 'success',
        buttons: [{ text: 'OK', onPress: () => navigation.goBack() }]
      });
    } else {
      createTemplate(templateData);
      showAlert({
        title: 'Success',
        message: 'Template created successfully',
        icon: 'success',
        buttons: [{ text: 'OK', onPress: () => navigation.goBack() }]
      });
    }
  };

  const styles = createStyles(theme, isDark);

  return (
    <View style={styles.container}>
      <ScreenHeader
        title={isEditing ? 'EDIT TEMPLATE' : 'CREATE TEMPLATE'}
        subtitle={isEditing ? 'Modify your workout' : 'Build a custom workout'}
        leftAction={
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerButton}>
            <Ionicons name="close" size={24} color="#fff" />
          </TouchableOpacity>
        }
        rightAction={
          <TouchableOpacity onPress={handleSave} style={styles.headerButton}>
            <Text style={styles.saveButton}>SAVE</Text>
          </TouchableOpacity>
        }
      />

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        {/* Template Name */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>TEMPLATE NAME</Text>
          <TextInput
            style={styles.input}
            value={templateName}
            onChangeText={setTemplateName}
            placeholder="e.g., Push Day A"
            placeholderTextColor="#666"
          />
        </View>

        {/* Description (Optional) */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>DESCRIPTION (OPTIONAL)</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={description}
            onChangeText={setDescription}
            placeholder="Notes about this workout..."
            placeholderTextColor="#666"
            multiline
            numberOfLines={3}
          />
        </View>

        {/* Exercises List */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>EXERCISES ({exercises.length})</Text>
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => setShowExercisePicker(true)}
            >
              <Ionicons name="add" size={20} color="#fff" />
              <Text style={styles.addButtonText}>Add Exercise</Text>
            </TouchableOpacity>
          </View>

          {exercises.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="barbell-outline" size={48} color="#666" />
              <Text style={styles.emptyText}>No exercises yet</Text>
              <Text style={styles.emptySubtext}>Add exercises to build your workout</Text>
            </View>
          ) : (
            exercises.map((exercise, index) => (
              <View key={exercise.id} style={styles.exerciseCard}>
                <View style={styles.exerciseLeft}>
                  <Text style={styles.exerciseNumber}>{index + 1}</Text>
                  <View style={styles.exerciseInfo}>
                    <Text style={styles.exerciseName}>{exercise.exerciseName}</Text>
                    <Text style={styles.exerciseMeta}>
                      {exercise.defaultSets} sets × {exercise.targetRepRange} reps
                      {exercise.restSeconds && ` • ${Math.floor(exercise.restSeconds / 60)}m ${exercise.restSeconds % 60}s rest`}
                    </Text>
                  </View>
                </View>
                <View style={styles.exerciseActions}>
                  {index > 0 && (
                    <TouchableOpacity
                      style={styles.moveButton}
                      onPress={() => handleMoveExercise(index, index - 1)}
                    >
                      <Ionicons name="chevron-up" size={20} color="#888" />
                    </TouchableOpacity>
                  )}
                  {index < exercises.length - 1 && (
                    <TouchableOpacity
                      style={styles.moveButton}
                      onPress={() => handleMoveExercise(index, index + 1)}
                    >
                      <Ionicons name="chevron-down" size={20} color="#888" />
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity
                    style={styles.configButton}
                    onPress={() => handleConfigureExercise(index)}
                  >
                    <Ionicons name="settings-outline" size={20} color="#3B82F6" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.deleteButton}
                    onPress={() => handleRemoveExercise(index)}
                  >
                    <Ionicons name="trash-outline" size={20} color="#ff003c" />
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Exercise Picker Modal */}
      <Modal
        visible={showExercisePicker}
        animationType="slide"
        transparent
        onRequestClose={() => setShowExercisePicker(false)}
      >
        <View style={styles.modalContainer}>
          <View style={[styles.modalContent, { paddingBottom: insets.bottom + 16 }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>ADD EXERCISE</Text>
              <TouchableOpacity onPress={() => setShowExercisePicker(false)}>
                <Ionicons name="close" size={28} color="#fff" />
              </TouchableOpacity>
            </View>

            {/* Category Filter */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.categoryScroll}
              contentContainerStyle={styles.categoryScrollContent}
            >
              <TouchableOpacity
                style={[
                  styles.categoryPill,
                  selectedCategory === 'all' && styles.categoryPillActive,
                ]}
                onPress={() => setSelectedCategory('all')}
              >
                <Text
                  style={[
                    styles.categoryPillText,
                    selectedCategory === 'all' && styles.categoryPillTextActive,
                  ]}
                >
                  All
                </Text>
              </TouchableOpacity>
              {Object.entries(EXERCISE_CATEGORIES).map(([key, label]) => (
                <TouchableOpacity
                  key={key}
                  style={[
                    styles.categoryPill,
                    selectedCategory === key && styles.categoryPillActive,
                  ]}
                  onPress={() => setSelectedCategory(key)}
                >
                  <Text
                    style={[
                      styles.categoryPillText,
                      selectedCategory === key && styles.categoryPillTextActive,
                    ]}
                  >
                    {label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Exercise List */}
            <ScrollView style={styles.exerciseList}>
              {filteredExercises.map((exercise) => (
                <TouchableOpacity
                  key={exercise.id}
                  style={styles.exercisePickerItem}
                  onPress={() => handleAddExercise(exercise)}
                >
                  <Text style={styles.exercisePickerName}>{exercise.name}</Text>
                  <Ionicons name="add-circle-outline" size={24} color={theme.primary} />
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Config Modal */}
      {showConfigModal && configExerciseIndex !== null && (
        <ExerciseConfigModal
          visible={showConfigModal}
          exercise={exercises[configExerciseIndex]}
          onSave={handleSaveConfig}
          onClose={() => {
            setShowConfigModal(false);
            setConfigExerciseIndex(null);
          }}
          insets={insets}
          theme={theme}
        />
      )}

      {/* Custom Alert */}
      <CustomAlert {...alertConfig} onClose={hideAlert} />
    </View>
  );
}

function ExerciseConfigModal({ visible, exercise, onSave, onClose, insets, theme }) {
  const [trackingType, setTrackingType] = useState(exercise?.trackingType || TRACKING_TYPES.STRENGTH);
  const [defaultSets, setDefaultSets] = useState(exercise?.defaultSets?.toString() || '3');
  const [targetRepRange, setTargetRepRange] = useState(exercise?.targetRepRange || '8-10');
  const [restMinutes, setRestMinutes] = useState(
    Math.floor((exercise?.restSeconds || 90) / 60).toString()
  );
  const [restSeconds, setRestSeconds] = useState(
    ((exercise?.restSeconds || 90) % 60).toString()
  );

  const handleSave = () => {
    const totalRestSeconds = parseInt(restMinutes) * 60 + parseInt(restSeconds);
    onSave({
      trackingType,
      defaultSets: parseInt(defaultSets) || 3,
      targetRepRange,
      restSeconds: totalRestSeconds,
    });
  };

  const styles = createConfigStyles(theme);

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalContainer}>
        <View style={[styles.modalContent, { paddingBottom: insets.bottom + 16 }]}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>CONFIGURE EXERCISE</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={28} color="#fff" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.scroll}>
            <View style={styles.formGroup}>
              <Text style={styles.label}>TRACKING TYPE</Text>
              <View style={styles.trackingTypeRow}>
                {Object.values(TRACKING_TYPES).map((type) => (
                  <TouchableOpacity
                    key={type}
                    style={[
                      styles.trackingTypePill,
                      trackingType === type && styles.trackingTypePillActive,
                    ]}
                    onPress={() => setTrackingType(type)}
                  >
                    <Text
                      style={[
                        styles.trackingTypeText,
                        trackingType === type && styles.trackingTypeTextActive,
                      ]}
                    >
                      {type.charAt(0).toUpperCase() + type.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>DEFAULT SETS</Text>
              <TextInput
                style={styles.input}
                value={defaultSets}
                onChangeText={setDefaultSets}
                keyboardType="number-pad"
                placeholder="3"
                placeholderTextColor="#666"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>TARGET REP RANGE</Text>
              <TextInput
                style={styles.input}
                value={targetRepRange}
                onChangeText={setTargetRepRange}
                placeholder="e.g., 8-10"
                placeholderTextColor="#666"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>REST TIME</Text>
              <View style={styles.restRow}>
                <TextInput
                  style={[styles.input, styles.restInput]}
                  value={restMinutes}
                  onChangeText={setRestMinutes}
                  keyboardType="number-pad"
                  placeholder="1"
                  placeholderTextColor="#666"
                />
                <Text style={styles.restLabel}>min</Text>
                <TextInput
                  style={[styles.input, styles.restInput]}
                  value={restSeconds}
                  onChangeText={setRestSeconds}
                  keyboardType="number-pad"
                  placeholder="30"
                  placeholderTextColor="#666"
                />
                <Text style={styles.restLabel}>sec</Text>
              </View>
            </View>
          </ScrollView>

          <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
            <Text style={styles.saveButtonText}>SAVE CONFIG</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

function createStyles(theme, isDark) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: '#0a0a0a',
    },
    headerButton: {
      width: 44,
      height: 44,
      justifyContent: 'center',
      alignItems: 'center',
    },
    saveButton: {
      fontSize: 14,
      fontWeight: '700',
      color: theme.primary,
    },
    scroll: {
      flex: 1,
    },
    scrollContent: {
      padding: 16,
    },
    formGroup: {
      marginBottom: 20,
    },
    label: {
      fontSize: 12,
      fontWeight: '600',
      color: '#888',
      marginBottom: 8,
      textTransform: 'uppercase',
      letterSpacing: 1,
    },
    input: {
      backgroundColor: '#1a1a1a',
      borderRadius: 12,
      padding: 16,
      fontSize: 16,
      color: '#fff',
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.1)',
    },
    textArea: {
      minHeight: 80,
      textAlignVertical: 'top',
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
      fontSize: 14,
      fontWeight: '700',
      color: '#fff',
      letterSpacing: 1,
    },
    addButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: theme.primary,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 8,
    },
    addButtonText: {
      fontSize: 12,
      fontWeight: '700',
      color: '#fff',
    },
    emptyState: {
      backgroundColor: '#1a1a1a',
      borderRadius: 16,
      padding: 32,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.05)',
    },
    emptyText: {
      fontSize: 16,
      fontWeight: '700',
      color: '#888',
      marginTop: 16,
    },
    emptySubtext: {
      fontSize: 13,
      color: '#666',
      marginTop: 4,
    },
    exerciseCard: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: '#1a1a1a',
      borderRadius: 12,
      padding: 14,
      marginBottom: 10,
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.05)',
    },
    exerciseLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
    },
    exerciseNumber: {
      width: 28,
      height: 28,
      borderRadius: 14,
      backgroundColor: 'rgba(155, 44, 44, 0.15)',
      fontSize: 12,
      fontWeight: '700',
      color: '#9b2c2c',
      textAlign: 'center',
      lineHeight: 28,
    },
    exerciseInfo: {
      marginLeft: 12,
      flex: 1,
    },
    exerciseName: {
      fontSize: 15,
      fontWeight: '600',
      color: '#fff',
    },
    exerciseMeta: {
      fontSize: 12,
      color: '#888',
      marginTop: 2,
    },
    exerciseActions: {
      flexDirection: 'row',
      gap: 4,
    },
    moveButton: {
      width: 32,
      height: 32,
      justifyContent: 'center',
      alignItems: 'center',
    },
    configButton: {
      width: 32,
      height: 32,
      justifyContent: 'center',
      alignItems: 'center',
    },
    deleteButton: {
      width: 32,
      height: 32,
      justifyContent: 'center',
      alignItems: 'center',
    },
    modalContainer: {
      flex: 1,
      justifyContent: 'flex-end',
      backgroundColor: 'rgba(0,0,0,0.5)',
    },
    modalContent: {
      backgroundColor: '#1a1a1a',
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      maxHeight: '80%',
    },
    modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: 20,
      borderBottomWidth: 1,
      borderBottomColor: 'rgba(255,255,255,0.1)',
    },
    modalTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: '#fff',
    },
    categoryScroll: {
      maxHeight: 60,
    },
    categoryScrollContent: {
      paddingHorizontal: 16,
      paddingVertical: 12,
      gap: 8,
    },
    categoryPill: {
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderRadius: 20,
      backgroundColor: '#0a0a0a',
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.1)',
    },
    categoryPillActive: {
      backgroundColor: theme.primary,
      borderColor: theme.primary,
    },
    categoryPillText: {
      fontSize: 11,
      fontWeight: '700',
      color: '#888',
      textTransform: 'uppercase',
    },
    categoryPillTextActive: {
      color: '#fff',
    },
    exerciseList: {
      padding: 16,
    },
    exercisePickerItem: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: 16,
      backgroundColor: '#0a0a0a',
      borderRadius: 12,
      marginBottom: 10,
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.05)',
    },
    exercisePickerName: {
      fontSize: 15,
      fontWeight: '600',
      color: '#fff',
    },
  });
}

function createConfigStyles(theme) {
  return StyleSheet.create({
    modalContainer: {
      flex: 1,
      justifyContent: 'flex-end',
      backgroundColor: 'rgba(0,0,0,0.5)',
    },
    modalContent: {
      backgroundColor: '#1a1a1a',
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      maxHeight: '70%',
    },
    modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: 20,
      borderBottomWidth: 1,
      borderBottomColor: 'rgba(255,255,255,0.1)',
    },
    modalTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: '#fff',
    },
    scroll: {
      padding: 20,
    },
    formGroup: {
      marginBottom: 20,
    },
    label: {
      fontSize: 12,
      fontWeight: '600',
      color: '#888',
      marginBottom: 8,
      textTransform: 'uppercase',
      letterSpacing: 1,
    },
    input: {
      backgroundColor: '#0a0a0a',
      borderRadius: 12,
      padding: 16,
      fontSize: 16,
      color: '#fff',
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.1)',
    },
    trackingTypeRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    trackingTypePill: {
      paddingHorizontal: 14,
      paddingVertical: 10,
      borderRadius: 20,
      backgroundColor: '#0a0a0a',
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.1)',
    },
    trackingTypePillActive: {
      backgroundColor: theme.primary,
      borderColor: theme.primary,
    },
    trackingTypeText: {
      fontSize: 11,
      fontWeight: '700',
      color: '#888',
      textTransform: 'uppercase',
    },
    trackingTypeTextActive: {
      color: '#fff',
    },
    restRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    restInput: {
      flex: 1,
      backgroundColor: '#0a0a0a',
      borderRadius: 12,
      padding: 16,
      fontSize: 16,
      color: '#fff',
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.1)',
      textAlign: 'center',
    },
    restLabel: {
      fontSize: 14,
      color: '#888',
    },
    saveButton: {
      backgroundColor: theme.primary,
      margin: 20,
      paddingVertical: 16,
      borderRadius: 12,
      alignItems: 'center',
    },
    saveButtonText: {
      fontSize: 14,
      fontWeight: '700',
      color: '#fff',
    },
  });
}
