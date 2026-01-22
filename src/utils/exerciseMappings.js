import { EXERCISES } from '../constants/exercises';

// Muscle group options for Quick Workout
export const MUSCLE_GROUP_OPTIONS = [
  { id: 'chest', name: 'Chest', icon: 'fitness' },
  { id: 'back', name: 'Back', icon: 'body' },
  { id: 'shoulders', name: 'Shoulders', icon: 'arrow-up-circle' },
  { id: 'arms', name: 'Arms', icon: 'hand-left' },
  { id: 'legs', name: 'Legs', icon: 'walk' },
  { id: 'core', name: 'Core', icon: 'scan-circle' },
  { id: 'full_body', name: 'Full Body', icon: 'barbell' },
];

// Location options
export const LOCATION_OPTIONS = [
  { id: 'home', name: 'Home', description: 'Bodyweight only' },
  { id: 'gym', name: 'Gym', description: 'Full equipment access' },
];

// Exercises that can be done at home without gym equipment.
const HOME_EXERCISE_IDS = new Set([
  // Bodyweight exercises
  'pushups',
  'dips',
  'pullups',
  'chin_ups',
  'lunges',
  'walking_lunges',
  'bulgarian_split',
  'glute_bridge',
  'step_ups',
  'situps',
  'crunches',
  'plank',
  'side_plank',
  'leg_raises',
  'russian_twist',
  'mountain_climbers',
  'dead_bug',
  'bicycle_crunch',
  'burpees',
  'diamond_pushups',
  'sumo_squat',
  'sissy_squat',
  'calf_raise',
  // Core
  // 'hanging_leg_raise', // Requires bar
  // Cardio
  'run',
]);

function normalizeLocation(location) {
  return typeof location === 'string' ? location.trim().toLowerCase() : '';
}

function isHomeLocation(location) {
  const normalized = normalizeLocation(location);
  return normalized.startsWith('home');
}

// Get exercises by muscle group and location
export function getExercisesForQuickWorkout(muscleGroup, location) {
  // Start with all exercises
  let filtered = [...EXERCISES];

  // Filter by muscle group
  if (muscleGroup === 'full_body') {
    // For full body, include compound exercises + mix from other groups
    filtered = EXERCISES.filter(ex =>
      ex.category === 'compound' ||
      ex.category === 'legs' ||
      ex.category === 'chest' ||
      ex.category === 'back'
    );
  } else {
    // Filter by specific category
    filtered = EXERCISES.filter(ex => ex.category === muscleGroup);
  }

  // Filter by location (home vs gym)
  if (isHomeLocation(location)) {
    filtered = filtered.filter(ex => HOME_EXERCISE_IDS.has(ex.id));
  }
  // For gym, include all exercises (no filter needed)

  // Sort by intensity (higher intensity first for better workout)
  filtered.sort((a, b) => b.intensity - a.intensity);

  return filtered;
}

// Generate a workout from selected criteria
export function generateQuickWorkout(muscleGroup, location) {
  const availableExercises = getExercisesForQuickWorkout(muscleGroup, location);

  // Select 4-6 exercises based on intensity and variety
  const exerciseCount = muscleGroup === 'full_body' ? 6 : 5;

  // Pick top exercises by intensity, ensuring variety
  const selected = [];

  // Always include the highest intensity compound movements first
  const compoundFirst = availableExercises.filter(ex => ex.intensity >= 1.0);
  const accessories = availableExercises.filter(ex => ex.intensity < 1.0);

  // Add compound movements
  for (const ex of compoundFirst) {
    if (selected.length >= exerciseCount) break;
    selected.push(ex);
  }

  // Fill remaining with accessories if needed
  for (const ex of accessories) {
    if (selected.length >= exerciseCount) break;
    selected.push(ex);
  }

  // Ensure we have at least 3 exercises
  if (selected.length < 3 && availableExercises.length > 0) {
    while (selected.length < Math.min(3, availableExercises.length)) {
      const remaining = availableExercises.filter(ex => !selected.includes(ex));
      if (remaining.length === 0) break;
      selected.push(remaining[0]);
    }
  }

  // Map to workout session format with default sets
  return selected.map((exercise, index) => ({
    exerciseId: exercise.id,
    name: exercise.name,
    orderIndex: index,
    trackingType: exercise.category === 'cardio' ? 'time' : 'strength',
    defaultSets: 3, // Default to 3 sets per exercise
    intensity: exercise.intensity,
  }));
}

// Get a descriptive name for the generated workout
export function getWorkoutName(muscleGroup, location) {
  const muscleName = MUSCLE_GROUP_OPTIONS.find(m => m.id === muscleGroup)?.name || muscleGroup;
  const normalizedLocation = normalizeLocation(location);
  const locationName = LOCATION_OPTIONS.find(l => l.id === normalizedLocation)?.name || location;

  if (isHomeLocation(location)) {
    return `${muscleName} (Home)`;
  }
  if (normalizedLocation.startsWith('gym')) {
    return `${muscleName} (Gym)`;
  }
  return `${muscleName} (${locationName})`;
}
