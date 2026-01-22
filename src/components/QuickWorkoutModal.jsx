import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { MUSCLE_GROUP_OPTIONS, LOCATION_OPTIONS, generateQuickWorkout, getWorkoutName } from '../utils/exerciseMappings';

export default function QuickWorkoutModal({ visible, onClose, onGenerate }) {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const [selectedMuscleGroup, setSelectedMuscleGroup] = useState(null);
  const [selectedLocation, setSelectedLocation] = useState('gym');
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerate = async () => {
    if (!selectedMuscleGroup) return;

    setIsGenerating(true);
    try {
      // Generate workout
      const workout = generateQuickWorkout(selectedMuscleGroup, selectedLocation);
      const workoutName = getWorkoutName(selectedMuscleGroup, selectedLocation);

      // Call the onGenerate callback with the workout data
      await onGenerate(workout, workoutName, selectedMuscleGroup, selectedLocation);

      // Close modal
      handleClose();
    } catch (error) {
      console.error('Error generating workout:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleClose = () => {
    setSelectedMuscleGroup(null);
    setSelectedLocation('gym');
    onClose();
  };

  const styles = createStyles(theme);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={handleClose}
    >
      <View style={styles.modalContainer}>
        <View style={[styles.modalContent, { paddingBottom: insets.bottom + 16 }]}>
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>Quick Workout</Text>
              <Text style={styles.subtitle}>Generate a workout instantly</Text>
            </View>
            <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
              <Ionicons name="close" size={28} color="#fff" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
            {/* Location Toggle */}
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>LOCATION</Text>
              <View style={styles.locationToggle}>
                <TouchableOpacity
                  style={[
                    styles.locationOption,
                    selectedLocation === 'home' && styles.locationOptionActive,
                  ]}
                  onPress={() => setSelectedLocation('home')}
                >
                  <Ionicons
                    name="home"
                    size={20}
                    color={selectedLocation === 'home' ? '#fff' : '#888'}
                  />
                  <Text
                    style={[
                      styles.locationText,
                      selectedLocation === 'home' && styles.locationTextActive,
                    ]}
                  >
                    Home
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.locationOption,
                    selectedLocation === 'gym' && styles.locationOptionActive,
                  ]}
                  onPress={() => setSelectedLocation('gym')}
                >
                  <Ionicons
                    name="barbell"
                    size={20}
                    color={selectedLocation === 'gym' ? '#fff' : '#888'}
                  />
                  <Text
                    style={[
                      styles.locationText,
                      selectedLocation === 'gym' && styles.locationTextActive,
                    ]}
                  >
                    Gym
                  </Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.locationDescription}>
                {LOCATION_OPTIONS.find(l => l.id === selectedLocation)?.description}
              </Text>
            </View>

            {/* Muscle Group Selection */}
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>TARGET MUSCLE</Text>
              <View style={styles.muscleGrid}>
                {MUSCLE_GROUP_OPTIONS.map((group) => {
                  const isSelected = selectedMuscleGroup === group.id;
                  return (
                    <TouchableOpacity
                      key={group.id}
                      style={[
                        styles.muscleCard,
                        isSelected && styles.muscleCardActive,
                      ]}
                      onPress={() => setSelectedMuscleGroup(group.id)}
                    >
                      <View style={[styles.muscleIcon, isSelected && styles.muscleIconActive]}>
                        <Ionicons
                          name={group.icon}
                          size={24}
                          color={isSelected ? '#fff' : theme.primary}
                        />
                      </View>
                      <Text style={[styles.muscleName, isSelected && styles.muscleNameActive]}>
                        {group.name}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Generate Button */}
            <TouchableOpacity
              style={[
                styles.generateButton,
                (!selectedMuscleGroup || isGenerating) && styles.generateButtonDisabled,
              ]}
              onPress={handleGenerate}
              disabled={!selectedMuscleGroup || isGenerating}
            >
              {isGenerating ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <Ionicons name="flash" size={20} color="#fff" />
                  <Text style={styles.generateButtonText}>Generate Workout</Text>
                </>
              )}
            </TouchableOpacity>

            <View style={{ height: 20 }} />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function createStyles(theme) {
  return StyleSheet.create({
    modalContainer: {
      flex: 1,
      justifyContent: 'flex-end',
      backgroundColor: 'rgba(0,0,0,0.7)',
    },
    modalContent: {
      backgroundColor: '#1a1a1a',
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      paddingHorizontal: 20,
      paddingTop: 20,
      maxHeight: '85%',
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 24,
    },
    title: {
      fontSize: 24,
      fontWeight: '800',
      color: '#fff',
      letterSpacing: 1,
    },
    subtitle: {
      fontSize: 13,
      color: '#888',
      marginTop: 2,
    },
    closeButton: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: '#0a0a0a',
      justifyContent: 'center',
      alignItems: 'center',
    },
    scroll: {
      // flex: 1, // Removed to allow content to determine height
    },
    section: {
      marginBottom: 24,
    },
    sectionLabel: {
      fontSize: 12,
      fontWeight: '700',
      color: '#888',
      letterSpacing: 1,
      marginBottom: 12,
      textTransform: 'uppercase',
    },
    locationToggle: {
      flexDirection: 'row',
      backgroundColor: '#0a0a0a',
      borderRadius: 12,
      padding: 4,
      gap: 4,
    },
    locationOption: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      paddingVertical: 12,
      borderRadius: 10,
    },
    locationOptionActive: {
      backgroundColor: theme.primary,
    },
    locationText: {
      fontSize: 14,
      fontWeight: '600',
      color: '#888',
    },
    locationTextActive: {
      color: '#fff',
    },
    locationDescription: {
      fontSize: 12,
      color: '#666',
      marginTop: 8,
      textAlign: 'center',
    },
    muscleGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 10,
    },
    muscleCard: {
      width: '48%',
      backgroundColor: '#0a0a0a',
      borderRadius: 14,
      padding: 14,
      alignItems: 'center',
      borderWidth: 2,
      borderColor: 'transparent',
    },
    muscleCardActive: {
      backgroundColor: 'rgba(155, 44, 44, 0.15)',
      borderColor: theme.primary,
    },
    muscleIcon: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: 'rgba(155, 44, 44, 0.1)',
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 8,
    },
    muscleIconActive: {
      backgroundColor: theme.primary,
    },
    muscleName: {
      fontSize: 13,
      fontWeight: '700',
      color: '#fff',
      textAlign: 'center',
    },
    muscleNameActive: {
      color: theme.primary,
    },
    generateButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.primary,
      paddingVertical: 16,
      borderRadius: 14,
      gap: 10,
      marginTop: 8,
    },
    generateButtonDisabled: {
      backgroundColor: '#333',
    },
    generateButtonText: {
      fontSize: 16,
      fontWeight: '700',
      color: '#fff',
      letterSpacing: 0.5,
    },
  });
}
