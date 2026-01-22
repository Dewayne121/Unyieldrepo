import React, { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react';
import { Image } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from './AuthContext';
import api from '../services/api';
import { EXERCISES, EXERCISE_CATEGORIES } from '../constants/exercises';

export { EXERCISES, EXERCISE_CATEGORIES };

// ----------------------------
// Preloadable hoodie images
// ----------------------------
const HOODIE_IMAGES = {
  1: require('../../assets/unyieldgold.png'),
  2: require('../../assets/unyieldsilver.png'),
  3: require('../../assets/unyieldbronze.png'),
};

// Preload all hoodie images
function preloadAssets() {
  const imageSources = Object.values(HOODIE_IMAGES);
  const uris = imageSources.map(source => Image.resolveAssetSource(source).uri);

  return Promise.all(
    uris.map(uri => {
      return new Promise((resolve) => {
        Image.getSize(
          uri,
          () => resolve(),
          () => resolve()
        );
      });
    })
  );
}

// ----------------------------
// Storage keys
// ----------------------------
export const LS_USER = 'unyield_user';
export const LS_LOGS = 'unyield_logs';
export const LS_GEMINI_KEY = 'unyield_gemini_api_key';
export const LS_WORKOUT_VIDEOS = 'unyield_workout_videos';
export const LS_WEIGHT_UNIT = 'unyield_weight_unit';
export const LS_HEIGHT_UNIT = 'unyield_height_unit';

// ----------------------------
// Limits
// ----------------------------
export const MAX_REPS = 2000;
export const MAX_WEIGHT_KG = 1000;
export const MAX_WEIGHT_LBS = 2200;

// ----------------------------
// Reference data
// ----------------------------
export const REGIONS = [
  'Global',
  'London',
  'Manchester',
  'Birmingham',
  'Leeds',
  'Glasgow',
];

export const GOALS = ['Hypertrophy', 'Leanness', 'Performance'];

const AppContext = createContext(null);

export const useApp = () => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
};

// ----------------------------
// Helpers
// ----------------------------
export function calcPoints(exercise, reps, weight, streak) {
  const intensity = exercise?.intensity ?? 1;
  const base = reps * intensity;
  const weightBonus = Math.max(0, Math.round((weight || 0) * 0.1));
  const streakBonus = Math.min(50, (streak || 0) * 4);
  return Math.max(1, Math.round(base + weightBonus + streakBonus));
}

// ----------------------------
// Provider
// ----------------------------
export function AppProvider({ children }) {
  const { signOut, user: authUser, refreshUser } = useAuth();
  const [isReady, setIsReady] = useState(false);
  const [user, setUser] = useState(null);
  const [logs, setLogs] = useState([]);
  const [weightUnit, setWeightUnit] = useState('kg');
  const [heightUnit, setHeightUnit] = useState('cm');

  // Sync user from AuthContext
  useEffect(() => {
    if (authUser) {
      console.log('AppContext: Syncing user from AuthContext:', {
        ...authUser,
        profileImage: authUser.profileImage ? `[IMAGE - ${authUser.profileImage.length} chars]` : null
      });
      setUser(authUser);
    } else {
      setUser(null);
    }
  }, [authUser]);

  // Load local data on mount
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const [savedLogs, savedWeightUnit, savedHeightUnit] = await Promise.all([
          AsyncStorage.getItem(LS_LOGS),
          AsyncStorage.getItem(LS_WEIGHT_UNIT),
          AsyncStorage.getItem(LS_HEIGHT_UNIT),
        ]);

        if (!mounted) return;

        if (savedLogs) {
          try {
            const parsed = JSON.parse(savedLogs);
            setLogs(Array.isArray(parsed) ? parsed : []);
          } catch {
            setLogs([]);
          }
        }

        if (savedWeightUnit && (savedWeightUnit === 'kg' || savedWeightUnit === 'lbs')) {
          setWeightUnit(savedWeightUnit);
        }

        if (savedHeightUnit && (savedHeightUnit === 'cm' || savedHeightUnit === 'ft')) {
          setHeightUnit(savedHeightUnit);
        }

        // Preload assets
        await preloadAssets();
      } finally {
        if (mounted) setIsReady(true);
      }
    })();
    return () => { mounted = false; };
  }, []);

  // Persist logs locally (as backup)
  useEffect(() => {
    if (!isReady) return;
    AsyncStorage.setItem(LS_LOGS, JSON.stringify(logs)).catch(() => {});
  }, [logs, isReady]);

  // Persist weight unit
  useEffect(() => {
    AsyncStorage.setItem(LS_WEIGHT_UNIT, weightUnit).catch(() => {});
  }, [weightUnit]);

  // Persist height unit
  useEffect(() => {
    AsyncStorage.setItem(LS_HEIGHT_UNIT, heightUnit).catch(() => {});
  }, [heightUnit]);

  const onboardingComplete = useCallback(async ({ name, region, goal }) => {
    // Update profile on backend
    try {
      await api.updateProfile({ name, region, goal });
      // Refresh user data from server
      if (refreshUser) {
        await refreshUser();
      }
    } catch (error) {
      console.error('Error updating profile:', error);
    }
  }, [refreshUser]);

  const updateUser = useCallback(async (partial) => {
    try {
      await api.updateProfile(partial);
      if (refreshUser) {
        await refreshUser();
      }
    } catch (error) {
      console.error('Error updating user:', error);
      // Update locally as fallback
      setUser((prev) => prev ? { ...prev, ...partial } : prev);
    }
  }, [refreshUser]);

  const addLog = useCallback(async (log) => {
    try {
      // Send workout to backend
      const response = await api.logWorkout({
        exercise: log.exercise?.name || log.exercise,
        reps: log.reps,
        weight: log.weight || null,
        duration: log.duration || null,
        notes: log.notes || null,
        // New PB and reflection fields
        isPB: log.isPB || false,
        pbNote: log.pbNote || null,
        dayNotes: log.dayNotes || null,
        mood: log.mood || null,
        energyLevel: log.energyLevel || null,
      });

      if (response.success) {
        // Add to local logs
        const newLog = {
          ...log,
          id: response.data?.workout?._id || log.id,
          points: response.data?.pointsEarned || log.points,
          date: new Date().toISOString(),
        };
        setLogs((prev) => [newLog, ...(prev || [])]);

        // Refresh user to get updated points/streak
        if (refreshUser) {
          await refreshUser();
        }

        return { success: true, data: response.data };
      }
    } catch (error) {
      console.error('Error logging workout:', error);
      // Still add locally as fallback
      setLogs((prev) => [log, ...(prev || [])]);
      setUser((prev) => {
        if (!prev) return prev;
        const nextTotal = (prev.totalPoints || 0) + (log.points || 0);
        return {
          ...prev,
          totalPoints: nextTotal,
          rank: Math.max(1, 100 - Math.floor(nextTotal / 250)),
        };
      });
      return { success: false, error: error.message };
    }
  }, [refreshUser]);

  const deleteLog = useCallback(async (logId) => {
    try {
      // Find log to get points
      const logToDelete = logs.find(l => l.id === logId);
      const pointsLost = logToDelete?.points || 0;

      // Remove from local logs immediately for UI responsiveness
      setLogs((prev) => prev.filter(log => log.id !== logId));

      // Update user profile on backend
      const updatedLogs = (user?.logs || logs || []).filter(log => log.id !== logId);
      const newTotalPoints = Math.max(0, (user?.totalPoints || 0) - pointsLost);

      await api.updateProfile({
        logs: updatedLogs,
        totalPoints: newTotalPoints,
      });

      // Refresh user to sync state
      if (refreshUser) {
        await refreshUser();
      }

      return { success: true };
    } catch (error) {
      console.error('Error deleting log:', error);
      // Refresh to restore state on error
      if (refreshUser) {
        await refreshUser();
      }
      return { success: false, error: error.message };
    }
  }, [logs, user, refreshUser]);

  const updateLog = useCallback(async (logId, updates) => {
    try {
      // Update local logs immediately for UI responsiveness
      setLogs((prev) =>
        prev.map((log) =>
          log.id === logId ? { ...log, ...updates } : log
        )
      );

      // Also update on backend via profile update
      const updatedLogs = logs.map((log) =>
        log.id === logId ? { ...log, ...updates } : log
      );

      await api.updateProfile({
        logs: updatedLogs,
      });

      // Refresh user to sync state
      if (refreshUser) {
        await refreshUser();
      }

      return { success: true };
    } catch (error) {
      console.error('Error updating log:', error);
      // Refresh to restore state on error
      if (refreshUser) {
        await refreshUser();
      }
      return { success: false, error: error.message };
    }
  }, [logs, refreshUser]);

  const deleteAllLogs = useCallback(async () => {
    try {
      // Clear local logs immediately
      setLogs([]);

      // Update user profile on backend
      await api.updateProfile({
        logs: [],
        totalPoints: 0,
      });

      // Refresh user to sync state
      if (refreshUser) {
        await refreshUser();
      }

      return { success: true };
    } catch (error) {
      console.error('Error deleting all logs:', error);
      // Refresh to restore state on error
      if (refreshUser) {
        await refreshUser();
      }
      return { success: false, error: error.message };
    }
  }, [refreshUser]);

  const resetAll = useCallback(async () => {
    try {
      await AsyncStorage.multiRemove([
        LS_USER,
        LS_LOGS,
        LS_GEMINI_KEY,
        LS_WORKOUT_VIDEOS,
        LS_WEIGHT_UNIT,
        LS_HEIGHT_UNIT,
        'unyield_user_data',
        'unyield_seen_onboarding',
        'unyield_auth_token',
      ]);
    } catch (e) {
      console.error('Error clearing AsyncStorage:', e);
    }
    setUser(null);
    setLogs([]);
    setWeightUnit('kg');
    setHeightUnit('cm');
    await signOut();
  }, [signOut]);

  const toggleWeightUnit = useCallback(() => {
    setWeightUnit((prev) => (prev === 'kg' ? 'lbs' : 'kg'));
  }, []);

  const toggleHeightUnit = useCallback(() => {
    setHeightUnit((prev) => (prev === 'cm' ? 'ft' : 'cm'));
  }, []);

  const value = useMemo(() => ({
    isReady,
    user,
    logs,
    weightUnit,
    heightUnit,
    toggleWeightUnit,
    toggleHeightUnit,
    onboardingComplete,
    updateUser,
    addLog,
    updateLog,
    deleteLog,
    deleteAllLogs,
    resetAll,
  }), [isReady, user, logs, weightUnit, heightUnit, toggleWeightUnit, toggleHeightUnit, onboardingComplete, updateUser, addLog, updateLog, deleteLog, deleteAllLogs, resetAll]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}
