import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ----------------------------
// Storage keys
// ----------------------------
export const LS_TEMPLATES = 'unyield_workout_templates';
export const LS_SESSIONS = 'unyield_workout_sessions';
export const LS_ACTIVE_SESSION = 'unyield_active_session';

// ----------------------------
// Tracking types
// ----------------------------
export const TRACKING_TYPES = {
  STRENGTH: 'strength',
  TIME: 'time',
  DISTANCE: 'distance',
  ROUNDS: 'rounds',
  BODYWEIGHT: 'bodyweight',
};

// ----------------------------
// Helper functions
// ----------------------------
function generateId() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function generateSetNumber(sets) {
  if (!sets || sets.length === 0) return 1;
  return Math.max(...sets.map(s => s.setNumber || 0)) + 1;
}

// ----------------------------
// Context
// ----------------------------
const WorkoutContext = createContext(null);

export const useWorkout = () => {
  const ctx = useContext(WorkoutContext);
  if (!ctx) throw new Error('useWorkout must be used within WorkoutProvider');
  return ctx;
};

// ----------------------------
// Provider
// ----------------------------
export function WorkoutProvider({ children }) {
  const [templates, setTemplates] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [activeSession, setActiveSession] = useState(null);
  const [isReady, setIsReady] = useState(false);

  // Load data on mount
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const [savedTemplates, savedSessions, savedActiveSession] = await Promise.all([
          AsyncStorage.getItem(LS_TEMPLATES),
          AsyncStorage.getItem(LS_SESSIONS),
          AsyncStorage.getItem(LS_ACTIVE_SESSION),
        ]);

        if (!mounted) return;

        if (savedTemplates) {
          try {
            const parsed = JSON.parse(savedTemplates);
            setTemplates(Array.isArray(parsed) ? parsed : []);
          } catch {
            setTemplates([]);
          }
        }

        if (savedSessions) {
          try {
            const parsed = JSON.parse(savedSessions);
            setSessions(Array.isArray(parsed) ? parsed : []);
          } catch {
            setSessions([]);
          }
        }

        if (savedActiveSession) {
          try {
            const parsed = JSON.parse(savedActiveSession);
            // Only restore if it's a draft session
            if (parsed && parsed.status === 'draft') {
              setActiveSession(parsed);
            }
          } catch {
            setActiveSession(null);
          }
        }
      } finally {
        if (mounted) setIsReady(true);
      }
    })();
    return () => { mounted = false; };
  }, []);

  // Persist templates
  useEffect(() => {
    if (!isReady) return;
    AsyncStorage.setItem(LS_TEMPLATES, JSON.stringify(templates)).catch(() => {});
  }, [templates, isReady]);

  // Persist sessions
  useEffect(() => {
    if (!isReady) return;
    AsyncStorage.setItem(LS_SESSIONS, JSON.stringify(sessions)).catch(() => {});
  }, [sessions, isReady]);

  // Persist active session
  useEffect(() => {
    if (!isReady) return;
    if (activeSession) {
      AsyncStorage.setItem(LS_ACTIVE_SESSION, JSON.stringify(activeSession)).catch(() => {});
    } else {
      AsyncStorage.removeItem(LS_ACTIVE_SESSION).catch(() => {});
    }
  }, [activeSession, isReady]);

  // ----------------------------
  // Template CRUD
  // ----------------------------

  const createTemplate = useCallback((templateData) => {
    const newTemplate = {
      id: generateId(),
      name: templateData.name || 'Untitled Workout',
      description: templateData.description || '',
      exercises: templateData.exercises || [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setTemplates(prev => [newTemplate, ...prev]);
    return { success: true, data: newTemplate };
  }, []);

  const updateTemplate = useCallback((templateId, updates) => {
    setTemplates(prev => prev.map(t => {
      if (t.id === templateId) {
        return {
          ...t,
          ...updates,
          updatedAt: new Date().toISOString(),
        };
      }
      return t;
    }));
    return { success: true };
  }, []);

  const deleteTemplate = useCallback((templateId) => {
    setTemplates(prev => prev.filter(t => t.id !== templateId));
    return { success: true };
  }, []);

  const duplicateTemplate = useCallback((templateId) => {
    const template = templates.find(t => t.id === templateId);
    if (!template) {
      return { success: false, error: 'Template not found' };
    }

    const newTemplate = {
      ...template,
      id: generateId(),
      name: `${template.name} (Copy)`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setTemplates(prev => [newTemplate, ...prev]);
    return { success: true, data: newTemplate };
  }, [templates]);

  // ----------------------------
  // Session Management
  // ----------------------------

  const startSession = useCallback(({ templateId, name, initialExercises = [] }) => {
    const template = templates.find(t => t.id === templateId);

    // Prepare exercises from template OR initialExercises
    let sessionExercises = [];

    if (template) {
      sessionExercises = template.exercises.map((ex, index) => ({
        id: generateId(),
        exerciseId: ex.exerciseId,
        orderIndex: index,
        trackingType: ex.trackingType || TRACKING_TYPES.STRENGTH,
        sets: ex.defaultSets ? Array.from({ length: ex.defaultSets }, (_, i) => ({
          id: generateId(),
          setNumber: i + 1,
          reps: '',
          weight: '',
          durationSeconds: '',
          distance: '',
          completed: false,
          notes: '',
        })) : [],
      }));
    } else if (initialExercises && initialExercises.length > 0) {
      // Create exercises from passed initialExercises (e.g. Quick Workout)
      sessionExercises = initialExercises.map((ex, index) => ({
        id: generateId(),
        exerciseId: ex.exerciseId,
        orderIndex: index,
        trackingType: ex.trackingType || TRACKING_TYPES.STRENGTH,
        sets: Array.from({ length: ex.defaultSets || 3 }, (_, i) => ({
          id: generateId(),
          setNumber: i + 1,
          reps: '',
          weight: '',
          durationSeconds: '',
          distance: '',
          completed: false,
          notes: '',
        })),
      }));
    }

    const newSession = {
      id: generateId(),
      templateId: templateId || null,
      name: name || template?.name || 'Quick Workout',
      startedAt: new Date().toISOString(),
      finishedAt: null,
      status: 'draft',
      notes: '',
      exercises: sessionExercises,
    };

    setActiveSession(newSession);
    return { success: true, data: newSession };
  }, [templates]);

  const updateSet = useCallback((sessionId, exerciseId, setId, updates) => {
    setActiveSession(prev => {
      if (!prev || prev.id !== sessionId) return prev;

      return {
        ...prev,
        exercises: prev.exercises.map(ex => {
          if (ex.id === exerciseId) {
            return {
              ...ex,
              sets: ex.sets.map(set => {
                if (set.id === setId) {
                  return { ...set, ...updates };
                }
                return set;
              }),
            };
          }
          return ex;
        }),
      };
    });

    return { success: true };
  }, []);

  const addSet = useCallback((sessionId, exerciseId) => {
    setActiveSession(prev => {
      if (!prev || prev.id !== sessionId) return prev;

      return {
        ...prev,
        exercises: prev.exercises.map(ex => {
          if (ex.id === exerciseId) {
            const newSetNumber = generateSetNumber(ex.sets);
            const newSet = {
              id: generateId(),
              setNumber: newSetNumber,
              reps: '',
              weight: '',
              durationSeconds: '',
              distance: '',
              completed: false,
              notes: '',
            };
            return {
              ...ex,
              sets: [...ex.sets, newSet],
            };
          }
          return ex;
        }),
      };
    });

    return { success: true };
  }, []);

  const removeSet = useCallback((sessionId, exerciseId, setId) => {
    setActiveSession(prev => {
      if (!prev || prev.id !== sessionId) return prev;

      return {
        ...prev,
        exercises: prev.exercises.map(ex => {
          if (ex.id === exerciseId) {
            return {
              ...ex,
              sets: ex.sets.filter(s => s.id !== setId),
            };
          }
          return ex;
        }),
      };
    });

    return { success: true };
  }, []);

  const finishSession = useCallback((sessionId, notes = '') => {
    setActiveSession(prev => {
      if (!prev || prev.id !== sessionId) return prev;

      const finishedSession = {
        ...prev,
        status: 'complete',
        finishedAt: new Date().toISOString(),
        notes,
      };

      // Add to sessions history
      setSessions(sessionPrev => [finishedSession, ...sessionPrev]);

      return null; // Clear active session
    });

    return { success: true };
  }, []);

  const deleteSession = useCallback((sessionId) => {
    setSessions(prev => prev.filter(s => s.id !== sessionId));
    return { success: true };
  }, []);

  const discardActiveSession = useCallback(() => {
    setActiveSession(null);
    AsyncStorage.removeItem(LS_ACTIVE_SESSION).catch(() => {});
    return { success: true };
  }, []);

  // ----------------------------
  // Exercise Management (for Quick Workouts)
  // ----------------------------

  const addExercise = useCallback((sessionId, exerciseId, trackingType = TRACKING_TYPES.STRENGTH, defaultSets = 3) => {
    setActiveSession(prev => {
      if (!prev || prev.id !== sessionId) return prev;

      const newExercise = {
        id: generateId(),
        exerciseId: exerciseId,
        orderIndex: prev.exercises.length,
        trackingType: trackingType,
        sets: Array.from({ length: defaultSets }, (_, i) => ({
          id: generateId(),
          setNumber: i + 1,
          reps: '',
          weight: '',
          durationSeconds: '',
          distance: '',
          completed: false,
          notes: '',
        })),
      };

      return {
        ...prev,
        exercises: [...prev.exercises, newExercise],
      };
    });

    return { success: true };
  }, []);

  const addExercisesToSession = useCallback((sessionId, exercisesData) => {
    setActiveSession(prev => {
      if (!prev || prev.id !== sessionId) return prev;

      const newExercises = exercisesData.map((ex, index) => ({
        id: generateId(),
        exerciseId: ex.exerciseId,
        orderIndex: prev.exercises.length + index,
        trackingType: ex.trackingType || TRACKING_TYPES.STRENGTH,
        sets: Array.from({ length: ex.defaultSets || 3 }, (_, i) => ({
          id: generateId(),
          setNumber: i + 1,
          reps: '',
          weight: '',
          durationSeconds: '',
          distance: '',
          completed: false,
          notes: '',
        })),
      }));

      return {
        ...prev,
        exercises: [...prev.exercises, ...newExercises],
      };
    });

    return { success: true };
  }, []);

  const removeExercise = useCallback((sessionId, exerciseId) => {
    setActiveSession(prev => {
      if (!prev || prev.id !== sessionId) return prev;

      return {
        ...prev,
        exercises: prev.exercises.filter(ex => ex.id !== exerciseId),
      };
    });

    return { success: true };
  }, []);

  // ----------------------------
  // Computed values
  // ----------------------------

  const completedSessions = useMemo(() => {
    return sessions.filter(s => s.status === 'complete');
  }, [sessions]);

  const draftSessions = useMemo(() => {
    return sessions.filter(s => s.status === 'draft');
  }, [sessions]);

  const value = useMemo(() => ({
    isReady,
    templates,
    sessions,
    activeSession,
    completedSessions,
    draftSessions,

    // Template methods
    createTemplate,
    updateTemplate,
    deleteTemplate,
    duplicateTemplate,

    // Session methods
    startSession,
    updateSet,
    addSet,
    removeSet,
    finishSession,
    deleteSession,
    discardActiveSession,

    // Exercise management methods (for Quick Workouts)
    addExercise,
    addExercisesToSession,
    removeExercise,
  }), [
    isReady,
    templates,
    sessions,
    activeSession,
    completedSessions,
    draftSessions,
    createTemplate,
    updateTemplate,
    deleteTemplate,
    duplicateTemplate,
    startSession,
    updateSet,
    addSet,
    removeSet,
    finishSession,
    deleteSession,
    discardActiveSession,
    addExercise,
    addExercisesToSession,
    removeExercise,
  ]);

  return <WorkoutContext.Provider value={value}>{children}</WorkoutContext.Provider>;
}
