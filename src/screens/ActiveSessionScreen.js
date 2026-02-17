import React, { useState, useEffect, useRef, useCallback } from 'react';
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
import { EXERCISES } from '../constants/exercises';
import { useTheme } from '../context/ThemeContext';
import { SKINS } from '../constants/colors';
import ScreenHeader from '../components/ScreenHeader';
import { useFocusEffect } from '@react-navigation/native';
import CustomAlert, { useCustomAlert } from '../components/CustomAlert';

export default function ActiveSessionScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { theme, skin } = useTheme();
  const isDark = skin === SKINS.operator || skin === SKINS.midnight;
  const { activeSession, updateSet, addSet, removeSet, finishSession, discardActiveSession } = useWorkout();
  const { weightUnit } = useApp();
  const { alertConfig, showAlert, hideAlert } = useCustomAlert();

  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isRunning, setIsRunning] = useState(true);
  const [restSeconds, setRestSeconds] = useState(0);
  const [isResting, setIsResting] = useState(false);
  const [showFinishModal, setShowFinishModal] = useState(false);
  const [sessionNotes, setSessionNotes] = useState('');
  const [expandedExerciseId, setExpandedExerciseId] = useState(null);

  const elapsedTimer = useRef(null);
  const restTimer = useRef(null);

  // Calculate elapsed time on mount and focus
  useEffect(() => {
    if (activeSession?.startedAt) {
      const started = new Date(activeSession.startedAt);
      const now = new Date();
      const elapsed = Math.floor((now - started) / 1000);
      setElapsedSeconds(elapsed);
    }
  }, [activeSession?.startedAt]);

  // Start/stop elapsed timer based on screen focus
  useFocusEffect(
    useCallback(() => {
      setIsRunning(true);
      return () => {
        setIsRunning(false);
      };
    }, [])
  );

  // Elapsed timer
  useEffect(() => {
    if (isRunning && !isResting) {
      elapsedTimer.current = setInterval(() => {
        setElapsedSeconds(prev => prev + 1);
      }, 1000);
    } else {
      if (elapsedTimer.current) {
        clearInterval(elapsedTimer.current);
      }
    }
    return () => {
      if (elapsedTimer.current) {
        clearInterval(elapsedTimer.current);
      }
    };
  }, [isRunning, isResting]);

  // Rest timer
  useEffect(() => {
    if (isResting && restSeconds > 0) {
      restTimer.current = setInterval(() => {
        setRestSeconds(prev => {
          if (prev <= 1) {
            setIsResting(false);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (restTimer.current) {
        clearInterval(restTimer.current);
      }
    }
    return () => {
      if (restTimer.current) {
        clearInterval(restTimer.current);
      }
    };
  }, [isResting, restSeconds]);

  if (!activeSession) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <ScreenHeader
          title="NO ACTIVE WORKOUT"
          subtitle="Start a workout to begin tracking"
        />
        <View style={styles.emptyState}>
          <Ionicons name="barbell-outline" size={64} color="#666" />
          <Text style={styles.emptyText}>No active workout session</Text>
          <TouchableOpacity
            style={styles.emptyButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.emptyButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const formatTime = (seconds) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSetComplete = (exerciseId, setId) => {
    const exercise = activeSession.exercises.find(ex => ex.id === exerciseId);
    const set = exercise?.sets?.find(s => s.id === setId);
    const restTime = exercise?.restSeconds || 90;

    updateSet(activeSession.id, exerciseId, setId, { completed: !set?.completed });

    // Start rest timer if completing a set
    if (!set?.completed) {
      setRestSeconds(restTime);
      setIsResting(true);
    }
  };

  const handleUpdateSetField = (exerciseId, setId, field, value) => {
    updateSet(activeSession.id, exerciseId, setId, { [field]: value });
  };

  const handleAddSet = (exerciseId) => {
    addSet(activeSession.id, exerciseId);
    setExpandedExerciseId(exerciseId);
  };

  const handleRemoveSet = (exerciseId, setId) => {
    showAlert({
      title: 'Remove Set',
      message: 'Remove this set?',
      icon: 'warning',
      buttons: [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Remove', style: 'destructive', onPress: () => removeSet(activeSession.id, exerciseId, setId) },
      ]
    });
  };

  const handleFinish = () => {
    setShowFinishModal(true);
  };

  const handleConfirmFinish = () => {
    finishSession(activeSession.id, sessionNotes);
    setShowFinishModal(false);
    navigation.goBack();
  };

  const handleDiscard = () => {
    showAlert({
      title: 'Discard Workout',
      message: 'Are you sure you want to discard this workout? All progress will be lost.',
      icon: 'warning',
      buttons: [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Discard',
          style: 'destructive',
          onPress: () => {
            discardActiveSession();
            navigation.goBack();
          },
        },
      ]
    });
  };

  const getExercise = (exerciseId) => {
    return EXERCISES.find(e => e.id === exerciseId);
  };

  const calculateExerciseStats = (exercise) => {
    let completedSets = 0;
    let totalVolume = 0;

    exercise.sets?.forEach(set => {
      if (set.completed && set.reps && set.weight) {
        completedSets++;
        totalVolume += set.reps * set.weight;
      }
    });

    return { completedSets, totalVolume };
  };

  const styles = createStyles(theme, isDark);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header with timer */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerButton}>
            <Ionicons name="close" size={24} color="#fff" />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>{activeSession.name}</Text>
            <Text style={styles.headerTimer}>{formatTime(elapsedSeconds)}</Text>
          </View>
          <TouchableOpacity onPress={handleFinish} style={styles.headerButton}>
            <Ionicons name="checkmark" size={24} color="#4ade80" />
          </TouchableOpacity>
        </View>

        {/* Rest Timer */}
        {isResting && restSeconds > 0 && (
          <View style={styles.restTimerBar}>
            <TouchableOpacity
              style={styles.restTimerClose}
              onPress={() => {
                setIsResting(false);
                setRestSeconds(0);
              }}
            >
              <Ionicons name="close-circle" size={20} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.restTimerText}>Rest: {formatTime(restSeconds)}</Text>
            <TouchableOpacity
              style={styles.restTimerAdd}
              onPress={() => setRestSeconds(prev => prev + 30)}
            >
              <Ionicons name="add-circle" size={20} color="#4ade80" />
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Exercises */}
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        {activeSession.exercises?.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="barbell-outline" size={48} color="#666" />
            <Text style={styles.emptyText}>No exercises in this workout</Text>
            <Text style={styles.emptySubtext}>Add exercises from a template or start quick</Text>
          </View>
        ) : (
          activeSession.exercises.map((exercise, index) => {
            const exerciseData = getExercise(exercise.exerciseId);
            const stats = calculateExerciseStats(exercise);
            const isExpanded = expandedExerciseId === exercise.id;

            return (
              <View key={exercise.id} style={styles.exerciseCard}>
                <TouchableOpacity
                  style={styles.exerciseHeader}
                  onPress={() => setExpandedExerciseId(isExpanded ? null : exercise.id)}
                >
                  <View style={styles.exerciseHeaderLeft}>
                    <Text style={styles.exerciseNumber}>{index + 1}</Text>
                    <View>
                      <Text style={styles.exerciseName}>
                        {exerciseData?.name || exercise.exerciseId}
                      </Text>
                      <Text style={styles.exerciseMeta}>
                        {stats.completedSets}/{exercise.sets?.length || 0} sets completed
                        {stats.totalVolume > 0 && ` • ${stats.totalVolume} kg volume`}
                      </Text>
                    </View>
                  </View>
                  <Ionicons
                    name={isExpanded ? 'chevron-up' : 'chevron-down'}
                    size={20}
                    color="#888"
                  />
                </TouchableOpacity>

                {isExpanded && (
                  <View style={styles.setsContainer}>
                    <View style={styles.columnHeaderRow}>
                      <Text style={[styles.columnHeader, { width: 32, textAlign: 'center' }]}>#</Text>
                      <Text style={[styles.columnHeader, { flex: 1, textAlign: 'center' }]}>REPS</Text>
                      <Text style={{ width: 10 }} />
                      <Text style={[styles.columnHeader, { flex: 1, textAlign: 'center' }]}>{weightUnit.toUpperCase()}</Text>
                      <Text style={{ width: 44 }} />
                    </View>

                    {exercise.sets?.map((set, setIndex) => (
                      <View key={set.id} style={styles.setRow}>
                        <View style={styles.setNumber}>
                          <Text style={styles.setNumberText}>{set.setNumber}</Text>
                        </View>

                        {exercise.trackingType === TRACKING_TYPES.STRENGTH && (
                          <>
                            <TextInput
                              style={styles.setInput}
                              value={set.reps?.toString() || ''}
                              onChangeText={(value) =>
                                handleUpdateSetField(
                                  exercise.id,
                                  set.id,
                                  'reps',
                                  value ? parseInt(value) : ''
                                )
                              }
                              placeholder="0"
                              placeholderTextColor="#444"
                              keyboardType="number-pad"
                              textAlign="center"
                            />
                            <Text style={styles.setTimes}>×</Text>
                            <TextInput
                              style={styles.setInput}
                              value={set.weight?.toString() || ''}
                              onChangeText={(value) =>
                                handleUpdateSetField(
                                  exercise.id,
                                  set.id,
                                  'weight',
                                  value ? parseFloat(value) : ''
                                )
                              }
                              placeholder="0"
                              placeholderTextColor="#444"
                              keyboardType="decimal-pad"
                              textAlign="center"
                            />
                          </>
                        )}

                        <TouchableOpacity
                          style={[
                            styles.setComplete,
                            set.completed && styles.setCompleteDone,
                          ]}
                          onPress={() => handleSetComplete(exercise.id, set.id)}
                        >
                          <Ionicons
                            name={set.completed ? 'checkmark-circle' : 'ellipse-outline'}
                            size={28}
                            color={set.completed ? '#4ade80' : '#333'}
                          />
                        </TouchableOpacity>

                        {exercise.sets?.length > 1 && (
                          <TouchableOpacity
                            style={styles.setRemove}
                            onPress={() => handleRemoveSet(exercise.id, set.id)}
                          >
                            <Ionicons name="trash-outline" size={18} color="#666" />
                          </TouchableOpacity>
                        )}
                      </View>
                    ))}

                    <TouchableOpacity
                      style={styles.addSetButton}
                      onPress={() => handleAddSet(exercise.id)}
                    >
                      <Ionicons name="add" size={18} color={theme.primary} />
                      <Text style={styles.addSetText}>ADD SET</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            );
          })
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Bottom actions */}
      <View style={[styles.bottomActions, { paddingBottom: insets.bottom + 16 }]}>
        <TouchableOpacity style={styles.discardButton} onPress={handleDiscard}>
          <Text style={styles.discardButtonText}>DISCARD</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.finishButton} onPress={handleFinish}>
          <Text style={styles.finishButtonText}>FINISH WORKOUT</Text>
        </TouchableOpacity>
      </View>

      {/* Finish Modal */}
      <Modal
        visible={showFinishModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowFinishModal(false)}
      >
        <View style={styles.finishModalContainer}>
          <View style={[styles.finishModalContent, { paddingBottom: insets.bottom + 16 }]}>
            <Text style={styles.finishModalTitle}>Finish Workout?</Text>

            <View style={styles.finishStats}>
              <View style={styles.finishStat}>
                <Text style={styles.finishStatValue}>{formatTime(elapsedSeconds)}</Text>
                <Text style={styles.finishStatLabel}>Duration</Text>
              </View>
              <View style={styles.finishStat}>
                <Text style={styles.finishStatValue}>
                  {activeSession.exercises?.length || 0}
                </Text>
                <Text style={styles.finishStatLabel}>Exercises</Text>
              </View>
              <View style={styles.finishStat}>
                {(() => {
                  let totalSets = 0;
                  let completedSets = 0;
                  activeSession.exercises?.forEach(ex => {
                    ex.sets?.forEach(set => {
                      totalSets++;
                      if (set.completed) completedSets++;
                    });
                  });
                  return (
                    <>
                      <Text style={styles.finishStatValue}>{completedSets}/{totalSets}</Text>
                      <Text style={styles.finishStatLabel}>Sets</Text>
                    </>
                  );
                })()}
              </View>
            </View>

            <TextInput
              style={styles.notesInput}
              value={sessionNotes}
              onChangeText={setSessionNotes}
              placeholder="Add notes about your workout (optional)"
              placeholderTextColor="#666"
              multiline
              numberOfLines={3}
            />

            <View style={styles.finishActions}>
              <TouchableOpacity
                style={styles.finishCancelButton}
                onPress={() => setShowFinishModal(false)}
              >
                <Text style={styles.finishCancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.finishConfirmButton}
                onPress={handleConfirmFinish}
              >
                <Text style={styles.finishConfirmButtonText}>Finish</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Custom Alert */}
      <CustomAlert {...alertConfig} onClose={hideAlert} />
    </View>
  );
}

function createStyles(theme, isDark) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: '#0a0a0a',
    },
    header: {
      backgroundColor: '#1a1a1a',
      borderBottomWidth: 1,
      borderBottomColor: 'rgba(255,255,255,0.05)',
    },
    headerTop: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 12,
    },
    headerButton: {
      width: 40,
      height: 40,
      justifyContent: 'center',
      alignItems: 'center',
    },
    headerCenter: {
      alignItems: 'center',
    },
    headerTitle: {
      fontSize: 14,
      fontWeight: '700',
      color: '#fff',
      letterSpacing: 1,
    },
    headerTimer: {
      fontSize: 24,
      fontWeight: '900',
      color: theme.primary,
      fontFamily: 'monospace',
      marginTop: 4,
    },
    restTimerBar: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: '#4ade80',
      paddingHorizontal: 16,
      paddingVertical: 8,
    },
    restTimerText: {
      fontSize: 14,
      fontWeight: '700',
      color: '#000',
      fontFamily: 'monospace',
    },
    scroll: {
      flex: 1,
    },
    scrollContent: {
      padding: 16,
    },
    emptyState: {
      alignItems: 'center',
      paddingVertical: 64,
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
      textAlign: 'center',
    },
    emptyButton: {
      backgroundColor: theme.primary,
      paddingHorizontal: 24,
      paddingVertical: 12,
      borderRadius: 12,
      marginTop: 20,
    },
    emptyButtonText: {
      fontSize: 14,
      fontWeight: '700',
      color: '#fff',
    },
    exerciseCard: {
      backgroundColor: '#1a1a1a',
      borderRadius: 14,
      marginBottom: 12,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.05)',
    },
    exerciseHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: 14,
    },
    exerciseHeaderLeft: {
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
      marginRight: 12,
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
    setsContainer: {
      padding: 16,
      borderTopWidth: 1,
      borderTopColor: 'rgba(255,255,255,0.05)',
      backgroundColor: '#151515',
    },
    columnHeaderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 12,
      paddingHorizontal: 2,
    },
    columnHeader: {
      fontSize: 10,
      fontWeight: '700',
      color: '#666',
      letterSpacing: 1,
    },
    setRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 12,
    },
    setNumber: {
      width: 32,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 10,
    },
    setNumberText: {
      fontSize: 14,
      fontWeight: '700',
      color: '#666',
    },
    setInput: {
      flex: 1,
      backgroundColor: '#0a0a0a',
      borderRadius: 8,
      paddingVertical: 10,
      fontSize: 16,
      fontWeight: '600',
      color: '#fff',
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.08)',
    },
    setTimes: {
      marginHorizontal: 10,
      color: '#444',
      fontSize: 14,
    },
    setUnit: {
      fontSize: 12,
      color: '#888',
      marginLeft: 4,
      minWidth: 30,
    },
    setComplete: {
      marginLeft: 16,
    },
    setCompleteDone: {
      opacity: 1,
    },
    setRemove: {
      marginLeft: 12,
    },
    addSetButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 12,
      marginTop: 4,
      backgroundColor: 'rgba(255,255,255,0.03)',
      borderRadius: 8,
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.05)',
      borderStyle: 'dashed',
    },
    addSetText: {
      fontSize: 12,
      fontWeight: '700',
      color: theme.primary,
      marginLeft: 6,
      letterSpacing: 0.5,
    },
    bottomActions: {
      flexDirection: 'row',
      gap: 12,
      paddingHorizontal: 16,
      paddingVertical: 16,
      backgroundColor: '#1a1a1a',
      borderTopWidth: 1,
      borderTopColor: 'rgba(255,255,255,0.05)',
    },
    discardButton: {
      flex: 1,
      backgroundColor: 'transparent',
      borderWidth: 1,
      borderColor: '#ff003c',
      paddingVertical: 14,
      borderRadius: 12,
      alignItems: 'center',
    },
    discardButtonText: {
      fontSize: 14,
      fontWeight: '700',
      color: '#ff003c',
    },
    finishButton: {
      flex: 2,
      backgroundColor: '#4ade80',
      paddingVertical: 14,
      borderRadius: 12,
      alignItems: 'center',
    },
    finishButtonText: {
      fontSize: 14,
      fontWeight: '700',
      color: '#000',
    },
    finishModalContainer: {
      flex: 1,
      justifyContent: 'flex-end',
      backgroundColor: 'rgba(0,0,0,0.5)',
    },
    finishModalContent: {
      backgroundColor: '#1a1a1a',
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      padding: 20,
    },
    finishModalTitle: {
      fontSize: 20,
      fontWeight: '700',
      color: '#fff',
      marginBottom: 20,
    },
    finishStats: {
      flexDirection: 'row',
      justifyContent: 'space-around',
      marginBottom: 20,
    },
    finishStat: {
      alignItems: 'center',
    },
    finishStatValue: {
      fontSize: 24,
      fontWeight: '900',
      color: theme.primary,
    },
    finishStatLabel: {
      fontSize: 12,
      color: '#888',
      marginTop: 4,
    },
    notesInput: {
      backgroundColor: '#0a0a0a',
      borderRadius: 12,
      padding: 16,
      fontSize: 14,
      color: '#fff',
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.1)',
      marginBottom: 20,
      minHeight: 80,
    },
    finishActions: {
      flexDirection: 'row',
      gap: 12,
    },
    finishCancelButton: {
      flex: 1,
      backgroundColor: '#0a0a0a',
      paddingVertical: 14,
      borderRadius: 12,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.1)',
    },
    finishCancelButtonText: {
      fontSize: 14,
      fontWeight: '600',
      color: '#888',
    },
    finishConfirmButton: {
      flex: 2,
      backgroundColor: '#4ade80',
      paddingVertical: 14,
      borderRadius: 12,
      alignItems: 'center',
    },
    finishConfirmButtonText: {
      fontSize: 14,
      fontWeight: '700',
      color: '#000',
    },
  });
}
