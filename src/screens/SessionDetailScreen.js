import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useWorkout } from '../context/WorkoutContext';
import { useApp, EXERCISES } from '../context/AppContext';
import { useTheme } from '../context/ThemeContext';
import { SKINS } from '../constants/colors';
import ScreenHeader from '../components/ScreenHeader';
import CustomAlert, { useCustomAlert } from '../components/CustomAlert';

export default function SessionDetailScreen({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const { sessions, deleteSession } = useWorkout();
  const { weightUnit } = useApp();
  const { alertConfig, showAlert, hideAlert } = useCustomAlert();

  const sessionId = route.params?.sessionId;
  const session = sessions.find(s => s.id === sessionId);
  const [expandedExerciseId, setExpandedExerciseId] = useState(null);

  if (!session) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <ScreenHeader
          title="SESSION NOT FOUND"
          showBackButton
          onBackPress={() => navigation.goBack()}
        />
        <View style={styles.emptyState}>
          <Ionicons name="alert-circle-outline" size={64} color="#666" />
          <Text style={styles.emptyText}>Session not found</Text>
        </View>
      </View>
    );
  }

  const calculateSessionStats = useMemo(() => {
    let totalVolume = 0;
    let completedSets = 0;
    let totalSets = 0;

    session.exercises?.forEach(exercise => {
      exercise.sets?.forEach(set => {
        totalSets++;
        if (set.completed && set.reps && set.weight) {
          totalVolume += set.reps * set.weight;
          completedSets++;
        }
      });
    });

    return { totalVolume, completedSets, totalSets };
  }, [session]);

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const formatDuration = (startedAt, finishedAt) => {
    const start = new Date(startedAt);
    const end = new Date(finishedAt);
    const minutes = Math.floor((end - start) / 60000);
    if (minutes < 60) return `${minutes} minutes`;
    const hrs = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hrs}h ${mins}m`;
  };

  const handleDelete = () => {
    showAlert({
      title: 'Delete Session',
      message: 'Are you sure you want to delete this workout session? This cannot be undone.',
      icon: 'warning',
      buttons: [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            deleteSession(sessionId);
            navigation.goBack();
          },
        },
      ]
    });
  };

  const getExercise = (exerciseId) => {
    return EXERCISES.find(e => e.id === exerciseId);
  };

  const styles = createStyles(theme);

  return (
    <View style={styles.container}>
      <ScreenHeader
        title="SESSION DETAILS"
        showBackButton
        onBackPress={() => navigation.goBack()}
        rightAction={
          <TouchableOpacity onPress={handleDelete} style={styles.deleteButton}>
            <Ionicons name="trash-outline" size={24} color="#ff003c" />
          </TouchableOpacity>
        }
      />

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        {/* Session Header */}
        <View style={styles.sessionHeader}>
          <Text style={styles.sessionName}>{session.name}</Text>
          <Text style={styles.sessionDate}>{formatDate(session.finishedAt)}</Text>
          <View style={styles.sessionMetaRow}>
            <View style={styles.sessionMeta}>
              <Ionicons name="time-outline" size={16} color="#888" />
              <Text style={styles.sessionMetaText}>
                {formatTime(session.startedAt)} - {formatTime(session.finishedAt)}
              </Text>
            </View>
            <View style={styles.sessionMeta}>
              <Ionicons name="hourglass-outline" size={16} color="#888" />
              <Text style={styles.sessionMetaText}>
                {formatDuration(session.startedAt, session.finishedAt)}
              </Text>
            </View>
          </View>
        </View>

        {/* Stats Cards */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{session.exercises?.length || 0}</Text>
            <Text style={styles.statLabel}>Exercises</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{calculateSessionStats.completedSets}</Text>
            <Text style={styles.statLabel}>Completed</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{calculateSessionStats.totalVolume.toLocaleString()}</Text>
            <Text style={styles.statLabel}>Volume (kg)</Text>
          </View>
        </View>

        {/* Notes */}
        {session.notes && (
          <View style={styles.notesSection}>
            <Text style={styles.notesTitle}>NOTES</Text>
            <Text style={styles.notesText}>{session.notes}</Text>
          </View>
        )}

        {/* Exercises */}
        <View style={styles.exercisesSection}>
          <Text style={styles.exercisesTitle}>EXERCISES</Text>

          {session.exercises?.map((exercise, index) => {
            const exerciseData = getExercise(exercise.exerciseId);
            const isExpanded = expandedExerciseId === exercise.id;

            // Calculate exercise stats
            let exerciseVolume = 0;
            let exerciseCompletedSets = 0;
            exercise.sets?.forEach(set => {
              if (set.completed && set.reps && set.weight) {
                exerciseVolume += set.reps * set.weight;
                exerciseCompletedSets++;
              }
            });

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
                        {exerciseCompletedSets}/{exercise.sets?.length || 0} sets
                        {exerciseVolume > 0 && ` • ${exerciseVolume} kg`}
                      </Text>
                    </View>
                  </View>
                  <Ionicons
                    name={isExpanded ? 'chevron-up' : 'chevron-down'}
                    size={20}
                    color="#888"
                  />
                </TouchableOpacity>

                {isExpanded && exercise.sets && exercise.sets.length > 0 && (
                  <View style={styles.setsContainer}>
                    {exercise.sets.map((set, setIndex) => (
                      <View key={set.id} style={styles.setRow}>
                        <Text style={styles.setNumber}>{set.setNumber}</Text>
                        <View style={styles.setValues}>
                          {set.reps && set.weight ? (
                            <Text style={styles.setDetail}>
                              {set.reps} reps × {set.weight} {weightUnit}
                            </Text>
                          ) : set.durationSeconds ? (
                            <Text style={styles.setDetail}>
                              {set.durationSeconds}s
                            </Text>
                          ) : set.distance ? (
                            <Text style={styles.setDetail}>
                              {set.distance}
                            </Text>
                          ) : (
                            <Text style={styles.setDetailEmpty}>No data</Text>
                          )}
                        </View>
                        <View style={[
                          styles.setStatus,
                          set.completed ? styles.setStatusDone : styles.setStatusIncomplete
                        ]}>
                          <Ionicons
                            name={set.completed ? 'checkmark' : 'close'}
                            size={14}
                            color="#fff"
                          />
                        </View>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            );
          })}
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Custom Alert */}
      <CustomAlert {...alertConfig} onClose={hideAlert} />
    </View>
  );
}

function createStyles(theme) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: '#0a0a0a',
    },
    deleteButton: {
      width: 44,
      height: 44,
      justifyContent: 'center',
      alignItems: 'center',
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
    sessionHeader: {
      backgroundColor: '#1a1a1a',
      borderRadius: 16,
      padding: 16,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.05)',
    },
    sessionName: {
      fontSize: 20,
      fontWeight: '700',
      color: '#fff',
      marginBottom: 4,
    },
    sessionDate: {
      fontSize: 14,
      color: '#888',
      marginBottom: 12,
    },
    sessionMetaRow: {
      flexDirection: 'row',
      gap: 16,
    },
    sessionMeta: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    sessionMetaText: {
      fontSize: 12,
      color: '#888',
    },
    statsRow: {
      flexDirection: 'row',
      gap: 12,
      marginBottom: 16,
    },
    statCard: {
      flex: 1,
      backgroundColor: '#1a1a1a',
      borderRadius: 12,
      padding: 16,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.05)',
    },
    statValue: {
      fontSize: 20,
      fontWeight: '800',
      color: theme.primary,
    },
    statLabel: {
      fontSize: 11,
      color: '#888',
      marginTop: 4,
      textTransform: 'uppercase',
    },
    notesSection: {
      backgroundColor: '#1a1a1a',
      borderRadius: 12,
      padding: 16,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.05)',
    },
    notesTitle: {
      fontSize: 12,
      fontWeight: '600',
      color: '#888',
      marginBottom: 8,
      textTransform: 'uppercase',
    },
    notesText: {
      fontSize: 14,
      color: '#fff',
      lineHeight: 20,
    },
    exercisesSection: {
      marginBottom: 16,
    },
    exercisesTitle: {
      fontSize: 14,
      fontWeight: '700',
      color: '#fff',
      marginBottom: 12,
      letterSpacing: 1,
    },
    exerciseCard: {
      backgroundColor: '#1a1a1a',
      borderRadius: 12,
      marginBottom: 10,
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
      padding: 14,
      paddingTop: 0,
      borderTopWidth: 1,
      borderTopColor: 'rgba(255,255,255,0.05)',
    },
    setRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 8,
    },
    setNumber: {
      width: 28,
      fontSize: 12,
      fontWeight: '600',
      color: '#888',
    },
    setValues: {
      flex: 1,
    },
    setDetail: {
      fontSize: 14,
      color: '#fff',
    },
    setDetailEmpty: {
      fontSize: 14,
      color: '#666',
    },
    setStatus: {
      width: 24,
      height: 24,
      borderRadius: 12,
      justifyContent: 'center',
      alignItems: 'center',
    },
    setStatusDone: {
      backgroundColor: '#4ade80',
    },
    setStatusIncomplete: {
      backgroundColor: '#666',
    },
  });
}
