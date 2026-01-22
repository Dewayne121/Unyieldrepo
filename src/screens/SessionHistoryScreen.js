import React, { useMemo } from 'react';
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
import { useTheme } from '../context/ThemeContext';
import { SKINS } from '../constants/colors';
import ScreenHeader from '../components/ScreenHeader';

export default function SessionHistoryScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const { sessions, deleteSession } = useWorkout();

  // Group sessions by date
  const groupedSessions = useMemo(() => {
    const groups = {};
    const completedSessions = sessions.filter(s => s.status === 'complete');

    completedSessions.forEach(session => {
      const date = new Date(session.finishedAt);
      const dateKey = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
      if (!groups[dateKey]) {
        groups[dateKey] = {
          date,
          sessions: [],
        };
      }
      groups[dateKey].sessions.push(session);
    });

    return Object.entries(groups)
      .map(([key, value]) => ({ date: value.date, sessions: value.sessions }))
      .sort((a, b) => b.date - a.date);
  }, [sessions]);

  const calculateSessionStats = (session) => {
    let totalVolume = 0;
    let completedSets = 0;
    let totalExercises = session.exercises?.length || 0;

    session.exercises?.forEach(exercise => {
      exercise.sets?.forEach(set => {
        if (set.completed && set.reps && set.weight) {
          totalVolume += set.reps * set.weight;
          completedSets++;
        }
      });
    });

    return { totalVolume, completedSets, totalExercises };
  };

  const formatDate = (date) => {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) return 'Today';
    if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
    return date.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
  };

  const formatDuration = (startedAt, finishedAt) => {
    const start = new Date(startedAt);
    const end = new Date(finishedAt);
    const minutes = Math.floor((end - start) / 60000);
    if (minutes < 60) return `${minutes}m`;
    const hrs = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hrs}h ${mins}m`;
  };

  const handleDeleteSession = (sessionId) => {
    // Would use Alert here but keeping simple for now
    deleteSession(sessionId);
  };

  const styles = createStyles(theme);

  return (
    <View style={styles.container}>
      <ScreenHeader
        title="SESSION HISTORY"
        subtitle="Your completed workouts"
        showBackButton
        onBackPress={() => navigation.goBack()}
      />

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        {groupedSessions.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="time-outline" size={64} color="#666" />
            <Text style={styles.emptyText}>No workout sessions yet</Text>
            <Text style={styles.emptySubtext}>Complete a workout to see it here</Text>
          </View>
        ) : (
          groupedSessions.map(({ date, sessions: daySessions }) => (
            <View key={date.toDateString()} style={styles.dayGroup}>
              <Text style={styles.dayHeader}>{formatDate(date)}</Text>

              {daySessions.map((session) => {
                const stats = calculateSessionStats(session);
                return (
                  <TouchableOpacity
                    key={session.id}
                    style={styles.sessionCard}
                    onPress={() => navigation.navigate('SessionDetail', { sessionId: session.id })}
                  >
                    <View style={styles.sessionTop}>
                      <View style={styles.sessionTitleRow}>
                        <Text style={styles.sessionName}>{session.name}</Text>
                        <Text style={styles.sessionDuration}>
                          {formatDuration(session.startedAt, session.finishedAt)}
                        </Text>
                      </View>
                      <Text style={styles.sessionTime}>
                        {new Date(session.startedAt).toLocaleTimeString('en-US', {
                          hour: 'numeric',
                          minute: '2-digit',
                        })}
                      </Text>
                    </View>

                    <View style={styles.sessionStats}>
                      <View style={styles.sessionStat}>
                        <Ionicons name="barbell" size={16} color="#9b2c2c" />
                        <Text style={styles.sessionStatText}>{stats.totalExercises} exercises</Text>
                      </View>
                      <View style={styles.sessionStat}>
                        <Ionicons name="layers" size={16} color="#9b2c2c" />
                        <Text style={styles.sessionStatText}>{stats.completedSets} sets</Text>
                      </View>
                      <View style={styles.sessionStat}>
                        <Ionicons name="trending-up" size={16} color="#9b2c2c" />
                        <Text style={styles.sessionStatText}>{stats.totalVolume.toLocaleString()} kg</Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          ))
        )}

        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

function createStyles(theme) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: '#0a0a0a',
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
    },
    dayGroup: {
      marginBottom: 24,
    },
    dayHeader: {
      fontSize: 16,
      fontWeight: '700',
      color: '#fff',
      marginBottom: 12,
      textTransform: 'capitalize',
    },
    sessionCard: {
      backgroundColor: '#1a1a1a',
      borderRadius: 14,
      padding: 14,
      marginBottom: 10,
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.05)',
    },
    sessionTop: {
      marginBottom: 10,
    },
    sessionTitleRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 4,
    },
    sessionName: {
      fontSize: 15,
      fontWeight: '600',
      color: '#fff',
    },
    sessionDuration: {
      fontSize: 12,
      color: '#888',
    },
    sessionTime: {
      fontSize: 12,
      color: '#666',
    },
    sessionStats: {
      flexDirection: 'row',
      gap: 16,
    },
    sessionStat: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    sessionStatText: {
      fontSize: 12,
      color: '#888',
    },
  });
}
