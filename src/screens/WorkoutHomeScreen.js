import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useWorkout } from '../context/WorkoutContext';
import { useTheme } from '../context/ThemeContext';
import { SKINS } from '../constants/colors';
import ScreenHeader from '../components/ScreenHeader';
import QuickWorkoutModal from '../components/QuickWorkoutModal';
import CustomAlert, { useCustomAlert } from '../components/CustomAlert';

export default function WorkoutHomeScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { theme, skin } = useTheme();
  const { templates, completedSessions, activeSession, startSession, deleteTemplate, addExercisesToSession } = useWorkout();
  const { alertConfig, showAlert, hideAlert } = useCustomAlert();
  const isDark = skin === SKINS.operator || skin === SKINS.midnight;
  const [refreshing, setRefreshing] = useState(false);
  const [showQuickWorkoutModal, setShowQuickWorkoutModal] = useState(false);

  // Sort templates by recently updated
  const sortedTemplates = useMemo(() => {
    return [...templates].sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
  }, [templates]);

  // Sort sessions by recently completed
  const recentSessions = useMemo(() => {
    return [...completedSessions].sort((a, b) => new Date(b.finishedAt) - new Date(a.finishedAt)).slice(0, 10);
  }, [completedSessions]);

  const handleStartWorkout = (templateId) => {
    startSession({ templateId });
    navigation.navigate('ActiveSession');
  };

  const handleQuickStart = () => {
    setShowQuickWorkoutModal(true);
  };

  const handleGenerateWorkout = async (workout, workoutName) => {
    // Start a new session with the generated exercises directly
    const result = startSession({ 
      templateId: null, 
      name: workoutName,
      initialExercises: workout 
    });

    if (result.success && result.data) {
      // Navigate to the active session
      navigation.navigate('ActiveSession');
    }
  };

  const handleDeleteTemplate = (templateId) => {
    showAlert({
      title: 'Delete Template',
      message: 'Are you sure you want to delete this workout template?',
      icon: 'warning',
      buttons: [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => deleteTemplate(templateId),
        },
      ]
    });
  };

  const onRefresh = async () => {
    setRefreshing(true);
    // Templates are loaded from AsyncStorage, so no refresh needed
    // This is for consistency with other screens
    setRefreshing(false);
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString();
  };

  const calculateSessionStats = (session) => {
    let totalVolume = 0;
    let completedSets = 0;

    session.exercises?.forEach(exercise => {
      exercise.sets?.forEach(set => {
        if (set.completed && set.reps && set.weight) {
          totalVolume += set.reps * set.weight;
          completedSets++;
        }
      });
    });

    return { totalVolume, completedSets };
  };

  const styles = createStyles(theme, isDark);

  return (
    <View style={styles.container}>
      <ScreenHeader
        title="WORKOUTS"
        subtitle="Templates & Sessions"
        rightAction={
          <TouchableOpacity
            onPress={() => navigation.navigate('SessionHistory')}
            style={styles.historyButton}
          >
            <Ionicons name="time-outline" size={24} color={theme.primary} />
          </TouchableOpacity>
        }
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} />
        }
      >
        {/* Active Session Banner */}
        {activeSession && (
          <TouchableOpacity
            style={styles.activeSessionBanner}
            onPress={() => navigation.navigate('ActiveSession')}
          >
            <View style={styles.activeSessionLeft}>
              <Ionicons name="play-circle" size={24} color="#fff" />
              <View style={styles.activeSessionText}>
                <Text style={styles.activeSessionTitle}>{activeSession.name}</Text>
                <Text style={styles.activeSessionSubtitle}>Workout in progress</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#fff" />
          </TouchableOpacity>
        )}

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>QUICK ACTIONS</Text>
          <View style={styles.quickActions}>
            <TouchableOpacity style={styles.quickActionCard} onPress={handleQuickStart}>
              <View style={styles.quickActionIcon}>
                <Ionicons name="flash" size={28} color="#fff" />
              </View>
              <Text style={styles.quickActionTitle}>Quick Workout</Text>
              <Text style={styles.quickActionSubtitle}>Generate instantly</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.quickActionCard}
              onPress={() => navigation.navigate('TemplateBuilder')}
            >
              <View style={styles.quickActionIcon}>
                <Ionicons name="add-circle" size={28} color="#fff" />
              </View>
              <Text style={styles.quickActionTitle}>Create Template</Text>
              <Text style={styles.quickActionSubtitle}>Build custom workout</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* My Templates */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>MY TEMPLATES</Text>
            <TouchableOpacity onPress={() => navigation.navigate('TemplateBuilder')}>
              <Text style={styles.seeAll}>Create New</Text>
            </TouchableOpacity>
          </View>

          {sortedTemplates.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="document-outline" size={48} color="#666" />
              <Text style={styles.emptyText}>No workout templates yet</Text>
              <Text style={styles.emptySubtext}>Create a template to quickly start workouts</Text>
              <TouchableOpacity
                style={styles.emptyButton}
                onPress={() => navigation.navigate('TemplateBuilder')}
              >
                <Text style={styles.emptyButtonText}>Create Template</Text>
              </TouchableOpacity>
            </View>
          ) : (
            sortedTemplates.map((template) => (
              <View key={template.id} style={styles.templateCard}>
                <View style={styles.templateLeft}>
                  <View style={styles.templateIcon}>
                    <Text style={styles.templateInitials}>
                      {template.name.substring(0, 2).toUpperCase()}
                    </Text>
                  </View>
                  <View style={styles.templateInfo}>
                    <Text style={styles.templateName}>{template.name}</Text>
                    <Text style={styles.templateMeta}>
                      {template.exercises?.length || 0} exercises
                    </Text>
                  </View>
                </View>
                <View style={styles.templateActions}>
                  <TouchableOpacity
                    style={styles.templateButton}
                    onPress={() => handleStartWorkout(template.id)}
                  >
                    <Ionicons name="play" size={18} color="#fff" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.templateButton, styles.templateButtonEdit]}
                    onPress={() => navigation.navigate('TemplateBuilder', { templateId: template.id })}
                  >
                    <Ionicons name="create-outline" size={18} color="#fff" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.templateButton, styles.templateButtonDelete]}
                    onPress={() => handleDeleteTemplate(template.id)}
                  >
                    <Ionicons name="trash-outline" size={18} color="#fff" />
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}
        </View>

        {/* Recent Sessions */}
        {recentSessions.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>RECENT SESSIONS</Text>
              <TouchableOpacity onPress={() => navigation.navigate('SessionHistory')}>
                <Text style={styles.seeAll}>See All</Text>
              </TouchableOpacity>
            </View>

            {recentSessions.map((session) => {
              const stats = calculateSessionStats(session);
              return (
                <TouchableOpacity
                  key={session.id}
                  style={styles.sessionCard}
                  onPress={() => navigation.navigate('SessionDetail', { sessionId: session.id })}
                >
                  <View style={styles.sessionLeft}>
                    <View style={styles.sessionIcon}>
                      <Ionicons name="checkmark-done" size={20} color="#9b2c2c" />
                    </View>
                    <View style={styles.sessionInfo}>
                      <Text style={styles.sessionName}>{session.name}</Text>
                      <Text style={styles.sessionMeta}>
                        {formatDate(session.finishedAt)} • {stats.completedSets} sets
                      </Text>
                    </View>
                  </View>
                  <View style={styles.sessionRight}>
                    <Text style={styles.sessionVolume}>{stats.totalVolume.toLocaleString()} kg</Text>
                    <Text style={styles.sessionVolumeLabel}>volume</Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Quick Workout Modal */}
      <QuickWorkoutModal
        visible={showQuickWorkoutModal}
        onClose={() => setShowQuickWorkoutModal(false)}
        onGenerate={handleGenerateWorkout}
      />

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
    historyButton: {
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
    activeSessionBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: theme.primary,
      borderRadius: 16,
      padding: 16,
      marginBottom: 20,
    },
    activeSessionLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
    },
    activeSessionText: {
      marginLeft: 12,
    },
    activeSessionTitle: {
      fontSize: 16,
      fontWeight: '700',
      color: '#fff',
    },
    activeSessionSubtitle: {
      fontSize: 12,
      color: 'rgba(255,255,255,0.7)',
      marginTop: 2,
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
    seeAll: {
      fontSize: 12,
      fontWeight: '600',
      color: theme.primary,
    },
    quickActions: {
      flexDirection: 'row',
      gap: 12,
    },
    quickActionCard: {
      flex: 1,
      backgroundColor: '#1a1a1a',
      borderRadius: 16,
      padding: 16,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.05)',
    },
    quickActionIcon: {
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: theme.primary,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 12,
    },
    quickActionTitle: {
      fontSize: 14,
      fontWeight: '700',
      color: '#fff',
      marginBottom: 4,
    },
    quickActionSubtitle: {
      fontSize: 11,
      color: '#888',
      textAlign: 'center',
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
      marginBottom: 20,
    },
    emptyButton: {
      backgroundColor: theme.primary,
      paddingHorizontal: 24,
      paddingVertical: 12,
      borderRadius: 12,
    },
    emptyButtonText: {
      fontSize: 14,
      fontWeight: '700',
      color: '#fff',
    },
    templateCard: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: '#1a1a1a',
      borderRadius: 14,
      padding: 14,
      marginBottom: 10,
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.05)',
    },
    templateLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
    },
    templateIcon: {
      width: 44,
      height: 44,
      borderRadius: 12,
      backgroundColor: 'rgba(155, 44, 44, 0.15)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    templateInitials: {
      fontSize: 12,
      fontWeight: '800',
      color: '#9b2c2c',
    },
    templateInfo: {
      marginLeft: 12,
    },
    templateName: {
      fontSize: 15,
      fontWeight: '600',
      color: '#fff',
    },
    templateMeta: {
      fontSize: 12,
      color: '#888',
      marginTop: 2,
    },
    templateActions: {
      flexDirection: 'row',
      gap: 8,
    },
    templateButton: {
      width: 36,
      height: 36,
      borderRadius: 10,
      backgroundColor: theme.primary,
      justifyContent: 'center',
      alignItems: 'center',
    },
    templateButtonEdit: {
      backgroundColor: '#3B82F6',
    },
    templateButtonDelete: {
      backgroundColor: '#ff003c',
    },
    sessionCard: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: '#1a1a1a',
      borderRadius: 14,
      padding: 14,
      marginBottom: 10,
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.05)',
    },
    sessionLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
    },
    sessionIcon: {
      width: 36,
      height: 36,
      borderRadius: 10,
      backgroundColor: 'rgba(155, 44, 44, 0.15)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    sessionInfo: {
      marginLeft: 12,
    },
    sessionName: {
      fontSize: 14,
      fontWeight: '600',
      color: '#fff',
    },
    sessionMeta: {
      fontSize: 11,
      color: '#888',
      marginTop: 2,
    },
    sessionRight: {
      alignItems: 'flex-end',
    },
    sessionVolume: {
      fontSize: 14,
      fontWeight: '700',
      color: '#9b2c2c',
    },
    sessionVolumeLabel: {
      fontSize: 10,
      color: '#888',
    },
  });
}
