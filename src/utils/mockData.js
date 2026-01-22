// Mock data for development - will be replaced with Firebase backend

export const REGIONS = [
  { id: 'uk-london', name: 'UK - London', flag: '🇬🇧' },
  { id: 'uk-manchester', name: 'UK - Manchester', flag: '🇬🇧' },
  { id: 'uk-birmingham', name: 'UK - Birmingham', flag: '🇬🇧' },
  { id: 'global', name: 'Global', flag: '🌍' },
];

export const TRAINING_LEVELS = [
  { id: 'beginner', name: 'Beginner' },
  { id: 'intermediate', name: 'Intermediate' },
  { id: 'advanced', name: 'Advanced' },
];

export const GOALS = [
  { id: 'strength', name: 'Build Strength' },
  { id: 'endurance', name: 'Improve Endurance' },
  { id: 'consistency', name: 'Stay Consistent' },
];

export const TRAINING_MODES = [
  { id: 'home', name: 'Home Workouts' },
  { id: 'gym', name: 'Gym Training' },
];

export const EXERCISE_TYPES = [
  'Push-ups',
  'Pull-ups',
  'Squats',
  'Lunges',
  'Burpees',
  'Plank',
  'Jumping Jacks',
  'Sit-ups',
  'Dumbbell Press',
  'Deadlifts',
  'Bench Press',
  'Overhead Press',
  'Bicep Curls',
  'Tricep Dips',
  'Other',
];

// Mock leaderboard data
export const MOCK_LEADERBOARD = [
  { rank: 1, username: 'Relentless482', points: 12500, weeklyPoints: 850, change: 0 },
  { rank: 2, username: 'IronWolf729', points: 11800, weeklyPoints: 720, change: 1 },
  { rank: 3, username: 'GrindMode365', points: 11200, weeklyPoints: 680, change: -1 },
  { rank: 4, username: 'BeastMode991', points: 10500, weeklyPoints: 650, change: 2 },
  { rank: 5, username: 'NoDaysOff', points: 9800, weeklyPoints: 590, change: 0 },
  { rank: 6, username: 'Savage847', points: 9200, weeklyPoints: 520, change: -2 },
  { rank: 7, username: 'Unstoppable234', points: 8700, weeklyPoints: 480, change: 1 },
  { rank: 8, username: 'Titan915', points: 8100, weeklyPoints: 420, change: 0 },
  { rank: 9, username: 'FuryX', points: 7500, weeklyPoints: 380, change: 3 },
  { rank: 10, username: 'Apex573', points: 6900, weeklyPoints: 320, change: -1 },
  { rank: 11, username: 'Legend419', points: 6200, weeklyPoints: 280, change: 1 },
  { rank: 12, username: 'Warrior862', points: 5600, weeklyPoints: 240, change: 0 },
  { rank: 13, username: 'Phantom294', points: 4900, weeklyPoints: 190, change: -3 },
  { rank: 14, username: 'Raptor738', points: 4200, weeklyPoints: 150, change: 2 },
  { rank: 15, username: 'Venom159', points: 3500, weeklyPoints: 110, change: 0 },
];

// Mock current user (will be dynamic)
export const MOCK_USER = {
  id: 'current_user',
  username: 'Relentless482',
  region: 'uk-london',
  trainingLevel: 'intermediate',
  goal: 'strength',
  mode: 'gym',
  totalPoints: 12500,
  weeklyPoints: 850,
  streak: 7,
  streakBest: 14,
  lastWorkoutDate: new Date().toISOString(),
  rank: 1,
  previousRank: 1,
  createdAt: new Date().toISOString(),
};

// Mock weekly challenge
export const MOCK_CHALLENGE = {
  id: 'weekly-001',
  title: 'Weekend Warrior',
  description: 'Complete 500 reps this weekend to earn bonus points',
  metricType: 'reps',
  target: 500,
  startDate: new Date().toISOString(),
  endDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
  regionScope: 'global',
  isActive: true,
  reward: 100,
};

// Mock user challenge progress
export const MOCK_USER_CHALLENGE = {
  challengeId: 'weekly-001',
  joined: true,
  progress: 320,
  joinedAt: new Date().toISOString(),
};

// Mock notifications
export const MOCK_NOTIFICATIONS = [
  {
    id: '1',
    type: 'rank_up',
    title: 'Rank Up',
    message: 'You moved up to rank #1',
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    read: false,
  },
  {
    id: '2',
    type: 'challenge_ending',
    title: 'Challenge Ending Soon',
    message: 'Weekend Warrior ends in 2 days',
    timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    read: false,
  },
  {
    id: '3',
    type: 'streak_milestone',
    title: '7 Day Streak',
    message: 'Keep the grind going',
    timestamp: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
    read: true,
  },
];

// Mock workouts
export const MOCK_WORKOUTS = [
  {
    id: '1',
    exercise: 'Push-ups',
    reps: 50,
    weight: null,
    duration: null,
    points: 50,
    date: new Date().toISOString(),
  },
  {
    id: '2',
    exercise: 'Pull-ups',
    reps: 30,
    weight: null,
    duration: null,
    points: 60,
    date: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: '3',
    exercise: 'Squats',
    reps: 100,
    weight: null,
    duration: null,
    points: 100,
    date: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
  },
];

// Mock badges - minimal icons
export const MOCK_BADGES = [
  { id: 'first_workout', name: 'First Workout', icon: '1', unlocked: true },
  { id: 'streak_7', name: '7 Day Streak', icon: '7', unlocked: true },
  { id: 'streak_30', name: '30 Day Streak', icon: '30', unlocked: false },
  { id: 'top_10', name: 'Top 10', icon: '10', unlocked: true },
  { id: 'top_1', name: 'Champion', icon: '1', unlocked: false },
  { id: 'challenge_winner', name: 'Winner', icon: 'W', unlocked: false },
];
