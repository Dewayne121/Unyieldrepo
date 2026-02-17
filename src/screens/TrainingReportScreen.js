import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl, Modal, TextInput, KeyboardAvoidingView, Platform, Animated } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useApp, calcPoints } from '../context/AppContext';
import { EXERCISES, EXERCISE_CATEGORIES } from '../constants/exercises';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { SKINS } from '../constants/colors';
import { Spacing, BorderRadius, Typography } from '../constants/colors';
import api from '../services/api';
import ScreenHeader from '../components/ScreenHeader';
import SortButton from '../components/SortButton';
import TrainingCalendar from '../components/calendar/TrainingCalendar';
import CalendarHeader from '../components/calendar/CalendarHeader';
import CalendarLegend from '../components/calendar/CalendarLegend';
import DayDetailModal from '../components/calendar/DayDetailModal';
import QuickPBModal from '../components/calendar/QuickPBModal';
import ReflectionModal from '../components/calendar/ReflectionModal';
import DateSelectorModal from '../components/calendar/DateSelectorModal';
import CustomAlert, { useCustomAlert } from '../components/CustomAlert';

// Sort options for training logs
const SORT_OPTIONS = {
  'date-desc': { label: 'Newest', icon: 'funnel-outline' },
  'date-asc': { label: 'Oldest', icon: 'funnel' },
  'exercise': { label: 'Exercise A-Z', icon: 'text-outline' },
  'volume-desc': { label: 'Volume High-Low', icon: 'barbell-outline' },
};
const SORT_CYCLE = ['date-desc', 'date-asc', 'exercise', 'volume-desc'];
const SORT_KEY = 'unyield_training_log_sort';

// Calculate progressive overload suggestions
const calculateProgressiveOverload = (logs) => {
  if (!logs || logs.length === 0) return null;

  // Group by exercise
  const exerciseHistory = {};
  logs.forEach(log => {
    const exercise = log.exercise;
    if (!exerciseHistory[exercise]) {
      exerciseHistory[exercise] = [];
    }
    exerciseHistory[exercise].push({
      date: new Date(log.date),
      weight: log.weight || 0,
      reps: log.reps || 0,
      volume: (log.weight || 0) * (log.reps || 0),
    });
  });

  // Sort by date for each exercise
  Object.keys(exerciseHistory).forEach(exercise => {
    exerciseHistory[exercise].sort((a, b) => b.date - a.date);
  });

  // Calculate suggestions
  const suggestions = [];

  Object.keys(exerciseHistory).forEach(exercise => {
    const history = exerciseHistory[exercise];
    if (history.length < 2) return;

    const lastWorkout = history[0];
    const previousWorkout = history[1];

    // Calculate last volume
    const lastVolume = lastWorkout.volume;
    const previousVolume = previousWorkout.volume;

    // Suggestion logic
    let suggestion = null;

    // Progressive overload based on volume
    if (lastVolume > previousVolume * 1.05) {
      // Last workout was good progress
      suggestion = {
        exercise,
        type: 'maintain',
        message: 'Maintain intensity',
        lastWeight: lastWorkout.weight,
        lastReps: lastWorkout.reps,
        suggestWeight: lastWorkout.weight,
        suggestReps: lastWorkout.reps,
      };
    } else if (lastVolume >= previousVolume * 0.95) {
      // Similar performance
      suggestion = {
        exercise,
        type: 'increase',
        message: 'Try overloading',
        lastWeight: lastWorkout.weight,
        lastReps: lastWorkout.reps,
        suggestWeight: lastWorkout.weight + 2.5,
        suggestReps: lastWorkout.reps,
      };
    } else {
      // Performance dropped
      suggestion = {
        exercise,
        type: 'recovery',
        message: 'Focus on form',
        lastWeight: lastWorkout.weight,
        lastReps: lastWorkout.reps,
        suggestWeight: previousWorkout.weight,
        suggestReps: previousWorkout.reps,
      };
    }

    if (suggestion) {
      suggestions.push(suggestion);
    }
  });

  return suggestions.slice(0, 5); // Top 5 suggestions
};

export default function TrainingReportScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { theme, skin } = useTheme();
  const { user, logs, weightUnit, deleteLog, deleteAllLogs, addLog, updateLog } = useApp();
  const { refreshUser } = useAuth();
  const { alertConfig, showAlert, hideAlert } = useCustomAlert();
  const isDark = skin === SKINS.operator || skin === SKINS.midnight;

  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showAddLogModal, setShowAddLogModal] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedExercise, setSelectedExercise] = useState(EXERCISES[0].id);
  const [logReps, setLogReps] = useState('');
  const [logWeight, setLogWeight] = useState('');
  const [savingLog, setSavingLog] = useState(false);
  const [sortOption, setSortOption] = useState('date-desc');
  const [showSortLabel, setShowSortLabel] = useState(false);
  const sortLabelOpacity = useRef(new Animated.Value(0)).current;
  const sortLabelTranslate = useRef(new Animated.Value(10)).current;

  // Calendar view state
  const [viewMode, setViewMode] = useState('calendar'); // 'calendar' | 'list'
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedDayData, setSelectedDayData] = useState(null);
  const [showDayDetail, setShowDayDetail] = useState(false);
  const [showPBModal, setShowPBModal] = useState(false);
  const [showReflectionModal, setShowReflectionModal] = useState(false);
  const [showDateSelector, setShowDateSelector] = useState(false);
  const [selectedLogForPB, setSelectedLogForPB] = useState(null);

  // Filter exercises by category
  const filteredExercises = useMemo(() => {
    if (selectedCategory === 'all') return EXERCISES;
    return EXERCISES.filter(e => e.category === selectedCategory);
  }, [selectedCategory]);

  // Refresh logs when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      const refreshOnFocus = async () => {
        if (refreshUser) {
          await refreshUser();
        }
      };
      refreshOnFocus();
    }, [refreshUser])
  );

  // Load saved sort preference on mount
  useEffect(() => {
    AsyncStorage.getItem(SORT_KEY).then(saved => {
      if (saved && SORT_OPTIONS[saved]) {
        setSortOption(saved);
      }
    });
  }, []);

  // Save sort preference when it changes
  useEffect(() => {
    AsyncStorage.setItem(SORT_KEY, sortOption).catch(() => {});
  }, [sortOption]);

  // Handle delete log
  const handleDeleteLog = async (logId) => {
    showAlert({
      title: 'Delete Log',
      message: 'Are you sure you want to delete this workout log?',
      icon: 'warning',
      buttons: [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const result = await deleteLog(logId);
              if (result.success && refreshUser) {
                await refreshUser();
              }
              if (!result.success) {
                showAlert({
                  title: 'Error',
                  message: 'Failed to delete log. Please try again.',
                  icon: 'error',
                  buttons: [{ text: 'OK', style: 'default' }]
                });
              }
            } catch (error) {
              console.error('Error deleting log:', error);
              showAlert({
                title: 'Error',
                message: 'Failed to delete log. Please try again.',
                icon: 'error',
                buttons: [{ text: 'OK', style: 'default' }]
              });
            }
          },
        },
      ]
    });
  };

  // Handle add personal log
  const handleAddPersonalLog = async () => {
    const reps = parseInt(logReps);
    const weight = parseFloat(logWeight);

    if (!reps || reps <= 0) {
      showAlert({
        title: 'Error',
        message: 'Please enter valid reps.',
        icon: 'error',
        buttons: [{ text: 'OK', style: 'default' }]
      });
      return;
    }

    if (!weight || weight < 0) {
      showAlert({
        title: 'Error',
        message: 'Please enter valid weight.',
        icon: 'error',
        buttons: [{ text: 'OK', style: 'default' }]
      });
      return;
    }

    setSavingLog(true);
    try {
      const exercise = EXERCISES.find(e => e.id === selectedExercise);
      // Personal logs grant 0 XP (only competition logs grant XP)
      const points = 0;

      const newLog = {
        id: Math.random().toString(36).slice(2),
        exercise: exercise.name,
        reps,
        weight,
        date: new Date().toISOString(),
        points,
        type: 'personal',
      };

      await addLog(newLog);

      // Refresh user data to get updated logs
      if (refreshUser) {
        await refreshUser();
      }

      // Reset form
      setLogReps('');
      setLogWeight('');
      setShowAddLogModal(false);
      setSelectedExercise(EXERCISES[0].id);
      setSelectedCategory('all');

      showAlert({
        title: 'Log Saved',
        message: 'Your personal workout has been recorded.',
        icon: 'success',
        buttons: [{ text: 'OK', style: 'default' }]
      });
    } catch (error) {
      console.error('Error adding log:', error);
      showAlert({
        title: 'Error',
        message: 'Failed to add log. Please try again.',
        icon: 'error',
        buttons: [{ text: 'OK', style: 'default' }]
      });
    } finally {
      setSavingLog(false);
    }
  };

  // Calendar event handlers
  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
  };

  const handleToday = () => {
    const today = new Date();
    setCurrentMonth(today.getMonth());
    setCurrentYear(today.getFullYear());
    setSelectedDate(today);
  };

  const handleDayPress = (date, dayData) => {
    setSelectedDate(date);
    setSelectedDayData(dayData);
    setShowDayDetail(true);
  };

  const handleAddPB = (log) => {
    setSelectedLogForPB(log);
    setShowPBModal(true);
  };

  const handleSavePB = async (note) => {
    if (!selectedLogForPB) return;

    try {
      await updateLog(selectedLogForPB.id, {
        isPB: true,
        pbNote: note,
      });

      setShowPBModal(false);
      setSelectedLogForPB(null);
      setShowDayDetail(false);
      showAlert({
        title: 'Success',
        message: 'Personal best saved! 🏆',
        icon: 'success',
        buttons: [{ text: 'OK', style: 'default' }]
      });
    } catch (error) {
      console.error('Error saving PB:', error);
      showAlert({
        title: 'Error',
        message: 'Failed to save PB. Please try again.',
        icon: 'error',
        buttons: [{ text: 'OK', style: 'default' }]
      });
    }
  };

  const handleEditReflection = () => {
    setShowReflectionModal(true);
  };

  const handleSaveReflection = async (reflectionData) => {
    if (!selectedDate) return;

    try {
      // Find all logs for this date
      const dateKey = selectedDate.toISOString().split('T')[0];
      const dayLogs = (logs || []).filter(log => {
        const logDate = new Date(log.date).toISOString().split('T')[0];
        return logDate === dateKey;
      });

      // Update each log with reflection data
      const updatePromises = dayLogs.map(log =>
        updateLog(log.id, reflectionData)
      );

      await Promise.all(updatePromises);

      setShowReflectionModal(false);
      setShowDayDetail(false);
      showAlert({
        title: 'Success',
        message: 'Reflection saved!',
        icon: 'success',
        buttons: [{ text: 'OK', style: 'default' }]
      });
    } catch (error) {
      console.error('Error saving reflection:', error);
      showAlert({
        title: 'Error',
        message: 'Failed to save reflection. Please try again.',
        icon: 'error',
        buttons: [{ text: 'OK', style: 'default' }]
      });
    }
  };

  const handleDateSelect = (month, year) => {
    setCurrentMonth(month);
    setCurrentYear(year);
  };

  const cycleSortOption = () => {
    const currentIndex = SORT_CYCLE.indexOf(sortOption);
    const nextIndex = (currentIndex + 1) % SORT_CYCLE.length;
    const newSort = SORT_CYCLE[nextIndex];
    setSortOption(newSort);

    // Show sort label animation
    setShowSortLabel(true);
    sortLabelOpacity.setValue(0);
    sortLabelTranslate.setValue(10);

    Animated.parallel([
      Animated.timing(sortLabelOpacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(sortLabelTranslate, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setTimeout(() => {
        Animated.timing(sortLabelOpacity, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }).start(() => setShowSortLabel(false));
      }, 1500);
    });
  };

  const handleCloseModals = () => {
    setShowDayDetail(false);
    setShowPBModal(false);
    setShowReflectionModal(false);
    setShowDateSelector(false);
    setSelectedLogForPB(null);
  };

  // Calculate stats
  const stats = useMemo(() => {
    if (!logs || logs.length === 0) return null;

    const totalWorkouts = logs.length;
    const totalVolume = logs.reduce((sum, log) => sum + (log.weight || 0) * (log.reps || 0), 0);
    const avgVolume = totalVolume / totalWorkouts;

    // Most frequent exercises
    const exerciseCounts = {};
    logs.forEach(log => {
      const exercise = log.exercise || 'Unknown';
      exerciseCounts[exercise] = (exerciseCounts[exercise] || 0) + 1;
    });

    const topExercises = Object.entries(exerciseCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, count]) => ({ name, count }));

    // Weight progression for each exercise
    const exerciseProgression = {};
    logs.forEach(log => {
      const exercise = log.exercise;
      if (exercise) {
        if (!exerciseProgression[exercise]) {
          exerciseProgression[exercise] = { first: null, last: null };
        }
        if (!exerciseProgression[exercise].first) {
          exerciseProgression[exercise].first = log.weight || 0;
        }
        exerciseProgression[exercise].last = log.weight || 0;
      }
    });

    return {
      totalWorkouts,
      totalVolume: Math.round(totalVolume),
      avgVolume: Math.round(avgVolume),
      topExercises,
      exerciseProgression,
    };
  }, [logs]);

  // Progressive overload suggestions
  const suggestions = useMemo(() => {
    return calculateProgressiveOverload(logs);
  }, [logs]);

  // Sorted workouts (last 10, sorted by selected option)
  const sortedWorkouts = useMemo(() => {
    if (!logs || logs.length === 0) return [];

    const sorted = [...logs];

    return sorted.sort((a, b) => {
      const aVolume = (a.weight || 0) * (a.reps || 0);
      const bVolume = (b.weight || 0) * (b.reps || 0);

      switch (sortOption) {
        case 'exercise':
          return (a.exercise || '').localeCompare(b.exercise || '');
        case 'volume-desc':
          return bVolume - aVolume;
        case 'date-asc':
          return new Date(a.date || 0) - new Date(b.date || 0);
        case 'date-desc':
        default:
          return new Date(b.date || 0) - new Date(a.date || 0);
      }
    }).slice(0, 10);
  }, [logs, sortOption]);

  // Keep recentWorkouts for any other references
  const recentWorkouts = sortedWorkouts;

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      if (refreshUser) {
        await refreshUser();
      }
    } catch (e) {
      console.error('Error refreshing:', e);
    } finally {
      setRefreshing(false);
    }
  };

  const formatWeight = (weight) => {
    if (!weight) return '0';
    return Math.round(weight);
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

  const styles = createStyles(theme, skin, insets);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.primary} />
        <Text style={styles.loadingText}>Loading training data...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScreenHeader
        title="TRAINING REPORT"
        subtitle="Track & Analyze"
        showBackButton={true}
        onBackPress={() => navigation.goBack()}
        rightAction={
          <View style={{ flexDirection: 'row', gap: 4 }}>
            <TouchableOpacity
              onPress={() => setViewMode(viewMode === 'calendar' ? 'list' : 'calendar')}
              style={styles.headerBtn}
            >
               <Ionicons name={viewMode === 'calendar' ? 'list' : 'calendar'} size={20} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setShowAddLogModal(true)}
              style={styles.headerBtn}
            >
              <Ionicons name="add" size={24} color={theme.primary} />
            </TouchableOpacity>
          </View>
        }
      />

      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} colors={[theme.primary]} />
        }
      >
        {/* Summary Stats - Quick Stats Style */}
        {stats && (
          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{stats.totalWorkouts}</Text>
              <Text style={styles.statLabel}>SESSIONS</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: theme.primary }]}>{(stats.totalVolume / 1000).toFixed(1)}k</Text>
              <Text style={styles.statLabel}>VOL (KG)</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{Math.round(stats.avgVolume)}</Text>
              <Text style={styles.statLabel}>AVG VOL</Text>
            </View>
          </View>
        )}

        {/* CALENDAR VIEW */}
        {viewMode === 'calendar' && (
          <View style={{ paddingHorizontal: 16 }}>
            <View style={styles.calendarContainer}>
              <CalendarHeader
                month={currentMonth}
                year={currentYear}
                onPrevMonth={handlePrevMonth}
                onNextMonth={handleNextMonth}
                onToday={handleToday}
                onPressDate={() => setShowDateSelector(true)}
              />
              <TrainingCalendar
                month={currentMonth}
                year={currentYear}
                logs={logs}
                selectedDate={selectedDate}
                onDayPress={handleDayPress}
              />
              <View style={{ height: 16 }} />
              <CalendarLegend />
            </View>

            {/* Selected Day Summary */}
            {selectedDate && selectedDayData && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>SELECTED: {selectedDate.toLocaleDateString()}</Text>
                <TouchableOpacity
                  style={styles.daySummaryCard}
                  onPress={() => setShowDayDetail(true)}
                >
                  <View style={styles.daySummaryInfo}>
                    <Text style={styles.daySummaryTitle}>
                      {selectedDayData.logs.length} Exercises
                    </Text>
                    <Text style={styles.daySummaryVolume}>
                      {selectedDayData.totalVolume.toLocaleString()}kg Total Volume
                    </Text>
                  </View>
                  <View style={styles.arrowBtn}>
                    <Ionicons name="chevron-forward" size={16} color="#fff" />
                  </View>
                </TouchableOpacity>
              </View>
            )}

            {/* Recent Logs - Always visible under calendar */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>RECENT LOGS</Text>
                {showSortLabel && (
                  <Animated.Text
                    style={[
                      styles.sortLabel,
                      {
                        opacity: sortLabelOpacity,
                        transform: [{ translateX: sortLabelTranslate }],
                      },
                    ]}
                  >
                    {SORT_OPTIONS[sortOption].label.toUpperCase()}
                  </Animated.Text>
                )}
                <SortButton sortOption={sortOption} onPress={cycleSortOption} />
              </View>

              {!recentWorkouts || recentWorkouts.length === 0 ? (
                <View style={styles.emptyCard}>
                  <Text style={styles.emptyText}>NO LOGS FOUND</Text>
                  <TouchableOpacity style={styles.actionBtn} onPress={() => setShowAddLogModal(true)}>
                    <Text style={styles.actionBtnText}>ADD LOG</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                recentWorkouts.map((log, index) => {
                  const isPersonalLog = log.type === 'personal';

                  return (
                    <View key={log.id || index} style={styles.card}>
                      <View style={styles.cardHeader}>
                        <View style={{ flex: 1 }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                            <Text style={styles.cardTitle}>{log.exercise || 'Unknown'}</Text>
                            {isPersonalLog && (
                              <View style={styles.miniBadge}>
                                <Text style={styles.miniBadgeText}>PERSONAL</Text>
                              </View>
                            )}
                          </View>
                          <Text style={styles.cardDate}>{formatDate(log.date)}</Text>
                        </View>
                        <TouchableOpacity
                          onPress={() => handleDeleteLog(log.id)}
                          style={styles.deleteIconBtn}
                        >
                          <Ionicons name="close" size={16} color="#666" />
                        </TouchableOpacity>
                      </View>

                      <View style={styles.cardDivider} />

                      <View style={styles.cardRow}>
                        <View style={styles.cardStat}>
                          <Text style={styles.cardStatLabel}>SET</Text>
                          <Text style={styles.cardStatValue}>{formatWeight(log.weight)}<Text style={styles.unit}>kg</Text> × {log.reps}</Text>
                        </View>
                        <View style={styles.cardStat}>
                          <Text style={styles.cardStatLabel}>VOLUME</Text>
                          <Text style={[styles.cardStatValue, { color: '#888' }]}>
                            {Math.round((log.weight || 0) * (log.reps || 0)).toLocaleString()}
                          </Text>
                        </View>
                      </View>
                    </View>
                  );
                })
              )}
            </View>
          </View>
        )}

        {/* LIST VIEW */}
        {viewMode === 'list' && (
          <View style={{ paddingHorizontal: 16 }}>
            
            {/* Progressive Overload Suggestions */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>NEXT TRAINING</Text>
              </View>

              {!suggestions || suggestions.length === 0 ? (
                <View style={styles.emptyCard}>
                  <Text style={styles.emptyText}>NO SUGGESTIONS YET</Text>
                  <Text style={styles.emptySubtext}>Log more workouts to see data</Text>
                </View>
              ) : (
                suggestions.map((suggestion, index) => (
                  <View key={index} style={styles.card}>
                    <View style={styles.cardHeader}>
                      <Text style={styles.cardTitle}>{suggestion.exercise}</Text>
                      <View style={[
                        styles.badge, 
                        { backgroundColor: suggestion.type === 'increase' ? 'rgba(155, 44, 44, 0.15)' : 'rgba(255,255,255,0.05)' }
                      ]}>
                         <Text style={[
                           styles.badgeText,
                           { color: suggestion.type === 'increase' ? theme.primary : '#888' }
                         ]}>
                           {suggestion.message.toUpperCase()}
                         </Text>
                      </View>
                    </View>

                    <View style={styles.cardRow}>
                      <View style={styles.cardStat}>
                        <Text style={styles.cardStatLabel}>LAST</Text>
                        <Text style={styles.cardStatValue}>{formatWeight(suggestion.lastWeight)}<Text style={styles.unit}>kg</Text> × {suggestion.lastReps}</Text>
                      </View>
                      
                      <Ionicons 
                        name="arrow-forward" 
                        size={16} 
                        color="#444" 
                        style={{ marginTop: 12 }}
                      />

                      <View style={styles.cardStat}>
                        <Text style={styles.cardStatLabel}>TARGET</Text>
                        <Text style={[styles.cardStatValue, { color: theme.primary }]}>
                          {formatWeight(suggestion.suggestWeight)}<Text style={[styles.unit, { color: theme.primary }]}>kg</Text> × {suggestion.suggestReps}
                        </Text>
                      </View>
                    </View>
                  </View>
                ))
              )}
            </View>

            {/* Most Trained Exercises */}
            {stats && stats.topExercises && stats.topExercises.length > 0 && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>MOST TRAINED</Text>
                </View>

                <View style={styles.listContainer}>
                  {stats.topExercises.map((item, index) => (
                    <View key={index} style={[
                      styles.listItem, 
                      index === stats.topExercises.length - 1 && { borderBottomWidth: 0 }
                    ]}>
                      <View style={styles.rankCircle}>
                        <Text style={styles.rankText}>{index + 1}</Text>
                      </View>
                      <View style={styles.listContent}>
                        <View style={styles.listRow}>
                          <Text style={styles.listTitle}>{item.name}</Text>
                          <Text style={styles.listValue}>{item.count}x</Text>
                        </View>
                        <View style={styles.progressBarBg}>
                          <View 
                            style={[
                              styles.progressBarFill, 
                              { width: `${(item.count / stats.topExercises[0].count) * 100}%` }
                            ]} 
                          />
                        </View>
                      </View>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* Recent Workouts Log */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>RECENT LOGS</Text>
                {showSortLabel && (
                  <Animated.Text
                    style={[
                      styles.sortLabel,
                      {
                        opacity: sortLabelOpacity,
                        transform: [{ translateX: sortLabelTranslate }],
                      },
                    ]}
                  >
                    {SORT_OPTIONS[sortOption].label.toUpperCase()}
                  </Animated.Text>
                )}
                <SortButton sortOption={sortOption} onPress={cycleSortOption} />
              </View>

              {!recentWorkouts || recentWorkouts.length === 0 ? (
                <View style={styles.emptyCard}>
                  <Text style={styles.emptyText}>NO LOGS FOUND</Text>
                  <TouchableOpacity style={styles.actionBtn} onPress={() => setShowAddLogModal(true)}>
                    <Text style={styles.actionBtnText}>ADD LOG</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                recentWorkouts.map((log, index) => {
                  const isPersonalLog = log.type === 'personal';
                  
                  return (
                    <View key={log.id || index} style={styles.card}>
                      <View style={styles.cardHeader}>
                        <View style={{ flex: 1 }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                            <Text style={styles.cardTitle}>{log.exercise || 'Unknown'}</Text>
                            {isPersonalLog && (
                              <View style={styles.miniBadge}>
                                <Text style={styles.miniBadgeText}>PERSONAL</Text>
                              </View>
                            )}
                          </View>
                          <Text style={styles.cardDate}>{formatDate(log.date)}</Text>
                        </View>
                        <TouchableOpacity
                          onPress={() => handleDeleteLog(log.id)}
                          style={styles.deleteIconBtn}
                        >
                          <Ionicons name="close" size={16} color="#666" />
                        </TouchableOpacity>
                      </View>
                      
                      <View style={styles.cardDivider} />
                      
                      <View style={styles.cardRow}>
                        <View style={styles.cardStat}>
                          <Text style={styles.cardStatLabel}>SET</Text>
                          <Text style={styles.cardStatValue}>{formatWeight(log.weight)}<Text style={styles.unit}>kg</Text> × {log.reps}</Text>
                        </View>
                        <View style={styles.cardStat}>
                          <Text style={styles.cardStatLabel}>VOLUME</Text>
                          <Text style={[styles.cardStatValue, { color: '#888' }]}>
                            {Math.round((log.weight || 0) * (log.reps || 0)).toLocaleString()}
                          </Text>
                        </View>
                      </View>
                    </View>
                  );
                })
              )}
            </View>
          </View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Add Personal Log Modal */}
      <Modal
        visible={showAddLogModal}
        animationType="fade"
        transparent
        onRequestClose={() => setShowAddLogModal(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>ADD LOG</Text>
              <TouchableOpacity onPress={() => setShowAddLogModal(false)}>
                <Ionicons name="close" size={24} color="#fff" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              {/* Category Selector */}
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>CATEGORY</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.pillScroll}>
                  <TouchableOpacity
                    style={[styles.pill, selectedCategory === 'all' && styles.pillActive]}
                    onPress={() => {
                      setSelectedCategory('all');
                      setSelectedExercise(EXERCISES[0].id);
                    }}
                  >
                    <Text style={[styles.pillText, selectedCategory === 'all' && styles.pillTextActive]}>ALL</Text>
                  </TouchableOpacity>
                  {Object.entries(EXERCISE_CATEGORIES).map(([key, label]) => (
                    <TouchableOpacity
                      key={key}
                      style={[styles.pill, selectedCategory === key && styles.pillActive]}
                      onPress={() => {
                        setSelectedCategory(key);
                        const firstInCategory = EXERCISES.find(e => e.category === key);
                        if (firstInCategory) setSelectedExercise(firstInCategory.id);
                      }}
                    >
                      <Text style={[styles.pillText, selectedCategory === key && styles.pillTextActive]}>{label}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              {/* Exercise Selector */}
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>EXERCISE</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.pillScroll}>
                  {filteredExercises.map((exercise) => (
                    <TouchableOpacity
                      key={exercise.id}
                      style={[styles.pill, selectedExercise === exercise.id && styles.pillActive]}
                      onPress={() => setSelectedExercise(exercise.id)}
                    >
                      <Text style={[styles.pillText, selectedExercise === exercise.id && styles.pillTextActive]}>{exercise.name}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              {/* Inputs */}
              <View style={styles.row}>
                <View style={[styles.fieldGroup, { flex: 1 }]}>
                  <Text style={styles.fieldLabel}>REPS</Text>
                  <TextInput
                    style={styles.input}
                    value={logReps}
                    onChangeText={setLogReps}
                    placeholder="0"
                    placeholderTextColor="#444"
                    keyboardType="number-pad"
                    maxLength={4}
                  />
                </View>
                <View style={{ width: 16 }} />
                <View style={[styles.fieldGroup, { flex: 1 }]}>
                  <Text style={styles.fieldLabel}>WEIGHT ({weightUnit})</Text>
                  <TextInput
                    style={styles.input}
                    value={logWeight}
                    onChangeText={setLogWeight}
                    placeholder="0"
                    placeholderTextColor="#444"
                    keyboardType="decimal-pad"
                    maxLength={6}
                  />
                </View>
              </View>

              <View style={styles.infoBox}>
                <Ionicons name="information-circle-outline" size={16} color={theme.primary} />
                <Text style={styles.infoText}>
                  Personal logs are for tracking only. They do not award XP or count towards leaderboards.
                </Text>
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.saveBtn}
                onPress={handleAddPersonalLog}
                disabled={savingLog || !logReps || !logWeight}
              >
                {savingLog ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.saveBtnText}>SAVE LOG</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Day Detail Modal */}
      <DayDetailModal
        visible={showDayDetail}
        date={selectedDate}
        dayData={selectedDayData}
        onClose={handleCloseModals}
        onAddPB={handleAddPB}
        onEditReflection={handleEditReflection}
      />

      {/* Quick PB Modal */}
      <QuickPBModal
        visible={showPBModal}
        exercise={selectedLogForPB?.exercise}
        reps={selectedLogForPB?.reps}
        weight={selectedLogForPB?.weight}
        onSave={handleSavePB}
        onClose={handleCloseModals}
      />

      {/* Reflection Modal */}
      <ReflectionModal
        visible={showReflectionModal}
        initialMood={selectedDayData?.mood}
        initialEnergy={selectedDayData?.energyLevel}
        initialNotes={selectedDayData?.notes}
        onSave={handleSaveReflection}
        onClose={handleCloseModals}
      />

      {/* Date Selector Modal */}
      <DateSelectorModal
        visible={showDateSelector}
        currentMonth={currentMonth}
        currentYear={currentYear}
        onClose={handleCloseModals}
        onSelect={handleDateSelect}
      />

      {/* Custom Alert */}
      <CustomAlert {...alertConfig} onClose={hideAlert} />
    </View>
  );
}

function createStyles(theme, skin, insets) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: '#050505', // bgDeep
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: '#050505',
    },
    loadingText: {
      color: '#666',
      marginTop: 12,
      fontSize: 12,
      fontWeight: '700',
      letterSpacing: 1,
    },
    headerBtn: {
      width: 40,
      height: 40,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: '#161616',
      borderRadius: 8,
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.05)',
    },
    scroll: {
      flex: 1,
    },
    
    // Stats Container
    statsContainer: {
      flexDirection: 'row',
      backgroundColor: '#161616',
      margin: 16,
      borderRadius: 16,
      padding: 20,
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.05)',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    statItem: {
      flex: 1,
      alignItems: 'center',
    },
    statValue: {
      fontSize: 24,
      fontWeight: '800',
      color: '#fff',
      marginBottom: 4,
    },
    statLabel: {
      fontSize: 11,
      fontWeight: '700',
      color: '#888',
      letterSpacing: 1,
    },
    statDivider: {
      width: 1,
      height: 24,
      backgroundColor: 'rgba(255,255,255,0.1)',
    },

    // Calendar
    calendarContainer: {
      backgroundColor: '#161616',
      borderRadius: 16,
      paddingVertical: 16,
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.05)',
      marginTop: 8,
    },
    daySummaryCard: {
      backgroundColor: '#161616',
      borderRadius: 16,
      padding: 16,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.05)',
    },
    daySummaryTitle: {
      fontSize: 14,
      fontWeight: '700',
      color: '#fff',
      marginBottom: 2,
    },
    daySummaryVolume: {
      fontSize: 12,
      color: '#888',
    },
    arrowBtn: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: 'rgba(255,255,255,0.05)',
      justifyContent: 'center',
      alignItems: 'center',
    },

    // Section Standard Styles
    section: {
      marginTop: 24,
    },
    sectionHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 12,
      paddingHorizontal: 4,
    },
    sectionTitle: {
      fontSize: 12,
      fontWeight: '800',
      color: '#666',
      letterSpacing: 1,
    },
    sortLabel: {
      fontSize: 10,
      fontWeight: '700',
      color: '#9b2c2c',
      letterSpacing: 1,
      marginRight: 8,
    },
    deleteLink: {
      fontSize: 10,
      fontWeight: '700',
      color: '#ff003c',
      letterSpacing: 0.5,
    },
    
    // Cards
    card: {
      backgroundColor: '#161616',
      borderRadius: 16,
      padding: 16,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.05)',
    },
    cardHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: 12,
    },
    cardTitle: {
      fontSize: 15,
      fontWeight: '700',
      color: '#fff',
    },
    cardDate: {
      fontSize: 11,
      color: '#666',
      marginTop: 2,
    },
    badge: {
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 6,
    },
    badgeText: {
      fontSize: 10,
      fontWeight: '800',
      letterSpacing: 0.5,
    },
    miniBadge: {
      backgroundColor: '#222',
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 4,
    },
    miniBadgeText: {
      fontSize: 8,
      fontWeight: '700',
      color: '#888',
    },
    cardDivider: {
      height: 1,
      backgroundColor: 'rgba(255,255,255,0.05)',
      marginBottom: 12,
    },
    cardRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
    },
    cardStat: {
      flex: 1,
    },
    cardStatLabel: {
      fontSize: 11,
      fontWeight: '700',
      color: '#888',
      marginBottom: 4,
    },
    cardStatValue: {
      fontSize: 16,
      fontWeight: '700',
      color: '#fff',
    },
    unit: {
      fontSize: 11,
      color: '#666',
      fontWeight: '600',
    },
    deleteIconBtn: {
      padding: 4,
    },

    // List Container (Most Trained)
    listContainer: {
      backgroundColor: '#161616',
      borderRadius: 16,
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.05)',
      overflow: 'hidden',
    },
    listItem: {
      padding: 16,
      flexDirection: 'row',
      alignItems: 'center',
      borderBottomWidth: 1,
      borderBottomColor: 'rgba(255,255,255,0.05)',
    },
    rankCircle: {
      width: 28,
      height: 28,
      borderRadius: 14,
      backgroundColor: 'rgba(255,255,255,0.05)',
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 12,
    },
    rankText: {
      fontSize: 12,
      fontWeight: '700',
      color: '#fff',
    },
    listContent: {
      flex: 1,
    },
    listRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 8,
    },
    listTitle: {
      fontSize: 14,
      fontWeight: '600',
      color: '#fff',
    },
    listValue: {
      fontSize: 12,
      fontWeight: '700',
      color: '#888',
    },
    progressBarBg: {
      height: 4,
      backgroundColor: 'rgba(255,255,255,0.05)',
      borderRadius: 2,
    },
    progressBarFill: {
      height: '100%',
      backgroundColor: theme.primary,
      borderRadius: 2,
    },

    // Empty States
    emptyCard: {
      backgroundColor: '#161616',
      borderRadius: 16,
      padding: 32,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.05)',
      borderStyle: 'dashed',
    },
    emptyText: {
      fontSize: 13,
      fontWeight: '700',
      color: '#666',
      letterSpacing: 1,
      marginBottom: 4,
    },
    emptySubtext: {
      fontSize: 12,
      color: '#444',
    },
    actionBtn: {
      marginTop: 16,
      paddingHorizontal: 16,
      paddingVertical: 10,
      backgroundColor: 'rgba(255,255,255,0.05)',
      borderRadius: 8,
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.1)',
    },
    actionBtnText: {
      fontSize: 11,
      fontWeight: '700',
      color: '#fff',
      letterSpacing: 0.5,
    },

    // Modal
    modalOverlay: {
      flex: 1,
      justifyContent: 'center',
      backgroundColor: 'rgba(0,0,0,0.8)',
      padding: 16,
    },
    modalContent: {
      backgroundColor: '#1a1a1a',
      borderRadius: 24,
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.1)',
      overflow: 'hidden',
      maxHeight: '80%',
    },
    modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: 20,
      borderBottomWidth: 1,
      borderBottomColor: 'rgba(255,255,255,0.05)',
    },
    modalTitle: {
      fontSize: 16,
      fontWeight: '800',
      color: '#fff',
      letterSpacing: 1,
    },
    modalBody: {
      padding: 20,
    },
    fieldGroup: {
      marginBottom: 20,
    },
    fieldLabel: {
      fontSize: 11,
      fontWeight: '700',
      color: '#666',
      marginBottom: 12,
      letterSpacing: 1,
    },
    row: {
      flexDirection: 'row',
    },
    pillScroll: {
      flexDirection: 'row',
      marginBottom: -4, // Counteract bottom margin of pills for scrolling
    },
    pill: {
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderRadius: 8,
      backgroundColor: '#111',
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.1)',
      marginRight: 8,
    },
    pillActive: {
      backgroundColor: theme.primary,
      borderColor: theme.primary,
    },
    pillText: {
      fontSize: 11,
      fontWeight: '700',
      color: '#666',
      textTransform: 'uppercase',
    },
    pillTextActive: {
      color: '#fff',
    },
    input: {
      backgroundColor: '#111',
      borderRadius: 12,
      padding: 16,
      fontSize: 16,
      fontWeight: '600',
      color: '#fff',
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.1)',
    },
    infoBox: {
      flexDirection: 'row',
      backgroundColor: 'rgba(155, 44, 44, 0.1)',
      padding: 12,
      borderRadius: 12,
      gap: 12,
      marginTop: 8,
    },
    infoText: {
      flex: 1,
      fontSize: 12,
      color: '#aaa',
      lineHeight: 18,
    },
    modalFooter: {
      padding: 20,
      borderTopWidth: 1,
      borderTopColor: 'rgba(255,255,255,0.05)',
    },
    saveBtn: {
      backgroundColor: theme.primary,
      borderRadius: 12,
      paddingVertical: 16,
      alignItems: 'center',
    },
    saveBtnText: {
      fontSize: 14,
      fontWeight: '800',
      color: '#fff',
      letterSpacing: 1,
    },
  });
}
