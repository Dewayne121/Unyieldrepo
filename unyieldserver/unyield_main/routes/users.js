const express = require('express');
const User = require('../models/User');
const Workout = require('../models/Workout');
const Notification = require('../models/Notification');
const UserChallenge = require('../models/UserChallenge');
const VideoSubmission = require('../models/VideoSubmission');
const ChallengeSubmission = require('../models/ChallengeSubmission');
const { authenticate } = require('../middleware/auth');
const { asyncHandler, AppError } = require('../middleware/errorHandler');

const router = express.Router();

// Helper to format user response
const formatUserResponse = (user) => ({
  id: user._id,
  email: user.email,
  username: user.username,
  name: user.name,
  profileImage: user.profileImage,
  region: user.region,
  goal: user.goal,
  bio: user.bio || '',
  accolades: user.accolades || [],
  fitnessLevel: user.fitnessLevel,
  workoutFrequency: user.workoutFrequency,
  preferredDays: user.preferredDays || [],
  weight: user.weight,
  height: user.height,
  age: user.age,
  totalPoints: user.totalPoints,
  weeklyPoints: user.weeklyPoints,
  rank: user.rank,
  streak: user.streak,
  streakBest: user.streakBest,
  provider: user.provider,
  createdAt: user.createdAt,
});

// GET /api/users/profile - Get user profile
router.get('/profile', authenticate, asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id);

  if (!user) {
    throw new AppError('User not found', 404);
  }

  res.json({
    success: true,
    data: formatUserResponse(user),
  });
}));

// PATCH /api/users/profile - Update user profile
router.patch('/profile', authenticate, asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id);

  if (!user) {
    throw new AppError('User not found', 404);
  }

  const allowedUpdates = [
    'name',
    'region',
    'goal',
    'profileImage',
    'bio',
    'fitnessLevel',
    'workoutFrequency',
    'preferredDays',
    'weight',
    'height',
    'age',
  ];

  for (const key of allowedUpdates) {
    if (req.body[key] !== undefined) {
      // Validate name
      if (key === 'name') {
        const name = req.body[key].trim();
        if (name.length < 2) {
          throw new AppError('Name must be at least 2 characters', 400);
        }
        if (name.length > 30) {
          throw new AppError('Name must be less than 30 characters', 400);
        }
      }
      // Validate region
      if (key === 'region' && !User.REGIONS.includes(req.body[key])) {
        throw new AppError(`Invalid region. Must be one of: ${User.REGIONS.join(', ')}`, 400);
      }
      // Validate goal
      if (key === 'goal' && !User.GOALS.includes(req.body[key])) {
        throw new AppError(`Invalid goal. Must be one of: ${User.GOALS.join(', ')}`, 400);
      }
      // Validate fitnessLevel
      if (key === 'fitnessLevel' && !['beginner', 'intermediate', 'advanced', 'elite'].includes(req.body[key])) {
        throw new AppError(`Invalid fitness level. Must be one of: beginner, intermediate, advanced, elite`, 400);
      }
      // Validate profileImage size (max 8MB base64 - approximately 6MB actual image)
      if (key === 'profileImage' && req.body[key] && req.body[key].length > 8000000) {
        throw new AppError('Profile image too large. Max 8MB', 400);
      }
      // Validate bio length (max 300 chars)
      if (key === 'bio' && req.body[key] && req.body[key].length > 300) {
        throw new AppError('Bio too long. Max 300 characters', 400);
      }
      // Validate preferredDays is array
      if (key === 'preferredDays' && !Array.isArray(req.body[key])) {
        throw new AppError('Preferred days must be an array', 400);
      }
      // Validate weight/height/age are positive numbers
      if (['weight', 'height', 'age'].includes(key) && req.body[key] !== null) {
        const num = parseFloat(req.body[key]);
        if (isNaN(num) || num < 0) {
          throw new AppError(`${key} must be a positive number`, 400);
        }
      }
      user[key] = req.body[key];
    }
  }

  await user.save();

  res.json({
    success: true,
    data: formatUserResponse(user),
  });
}));

// GET /api/users/stats - Get user statistics
router.get('/stats', authenticate, asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id);

  if (!user) {
    throw new AppError('User not found', 404);
  }

  // Get user workouts
  const workouts = await Workout.find({ user: req.user.id });

  // Calculate stats
  const totalWorkouts = workouts.length;
  const totalReps = workouts.reduce((sum, w) => sum + (w.reps || 0), 0);
  const totalWeight = workouts.reduce((sum, w) => sum + (w.weight || 0), 0);

  // Weekly stats
  const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const weeklyWorkouts = workouts.filter(w => new Date(w.date) >= oneWeekAgo);
  const weeklyReps = weeklyWorkouts.reduce((sum, w) => sum + (w.reps || 0), 0);

  // Exercise breakdown
  const exerciseBreakdown = {};
  for (const workout of workouts) {
    if (!exerciseBreakdown[workout.exercise]) {
      exerciseBreakdown[workout.exercise] = { count: 0, totalReps: 0, totalPoints: 0 };
    }
    exerciseBreakdown[workout.exercise].count++;
    exerciseBreakdown[workout.exercise].totalReps += workout.reps || 0;
    exerciseBreakdown[workout.exercise].totalPoints += workout.points || 0;
  }

  res.json({
    success: true,
    data: {
      totalPoints: user.totalPoints,
      weeklyPoints: user.weeklyPoints,
      rank: user.rank,
      streak: user.streak,
      streakBest: user.streakBest,
      totalWorkouts,
      totalReps,
      totalWeight,
      weeklyWorkouts: weeklyWorkouts.length,
      weeklyReps,
      exerciseBreakdown,
    },
  });
}));

// GET /api/users/regions - Get available regions
router.get('/regions', asyncHandler(async (req, res) => {
  res.json({
    success: true,
    data: User.REGIONS,
  });
}));

// GET /api/users/goals - Get available goals
router.get('/goals', asyncHandler(async (req, res) => {
  res.json({
    success: true,
    data: User.GOALS,
  });
}));

// DELETE /api/users/account - Delete user account completely
router.delete('/account', authenticate, asyncHandler(async (req, res) => {
  const userId = req.user.id;

  console.log(`🗑️ Deleting account for user: ${userId}`);

  // Delete all user's workouts
  const workoutsDeleted = await Workout.deleteMany({ user: userId });
  console.log(`   Deleted ${workoutsDeleted.deletedCount} workouts`);

  // Delete all user's video submissions
  const videosDeleted = await VideoSubmission.deleteMany({ user: userId });
  console.log(`   Deleted ${videosDeleted.deletedCount} video submissions`);

  // Delete all user's notifications
  const notificationsDeleted = await Notification.deleteMany({ user: userId });
  console.log(`   Deleted ${notificationsDeleted.deletedCount} notifications`);

  // Delete all user's challenge participations
  const challengesDeleted = await UserChallenge.deleteMany({ user: userId });
  console.log(`   Deleted ${challengesDeleted.deletedCount} challenge participations`);

  // Delete the user
  await User.findByIdAndDelete(userId);
  console.log(`✅ User ${userId} deleted successfully`);

  res.json({
    success: true,
    message: 'Account deleted successfully',
  });
}));

// GET /api/users/:id - Get public profile of another user
router.get('/:id', asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);

  if (!user) {
    throw new AppError('User not found', 404);
  }

  // Return limited public info
  res.json({
    success: true,
    data: {
      id: user._id,
      username: user.username,
      name: user.name,
      profileImage: user.profileImage,
      region: user.region,
      bio: user.bio || '',
      accolades: user.accolades || [],
      totalPoints: user.totalPoints,
      streak: user.streak,
    },
  });
}));

// GET /api/users/:id/videos - Get public videos of a specific user (approved only)
router.get('/:id/videos', asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);

  if (!user) {
    throw new AppError('User not found', 404);
  }

  // Only return approved videos for public viewing
  const [workoutVideos, challengeSubmissions] = await Promise.all([
    VideoSubmission.find({
      user: req.params.id,
      status: 'approved',
    })
      .sort({ createdAt: -1 })
      .populate('verifiedBy', 'name username'),
    ChallengeSubmission.find({
      user: req.params.id,
      status: 'approved',
      videoUrl: { $exists: true, $ne: null, $ne: '' },
    })
      .sort({ submittedAt: -1 })
      .populate('verifiedBy', 'name username')
      .populate('challenge', 'title'),
  ]);

  const formattedWorkoutVideos = workoutVideos.map((video) => ({
    _id: video._id,
    videoUrl: video.videoUrl,
    thumbnailUrl: video.thumbnailUrl,
    exercise: video.exercise,
    reps: video.reps,
    weight: video.weight,
    duration: video.duration,
    status: video.status,
    verifiedByName: video.verifiedByName || video.verifiedBy?.name || null,
    verifiedBy: video.verifiedBy ? {
      id: video.verifiedBy._id,
      name: video.verifiedBy.name,
      username: video.verifiedBy.username,
    } : null,
    createdAt: video.createdAt,
    type: 'workout',
  }));

  const formattedChallengeVideos = challengeSubmissions.map((submission) => ({
    _id: submission._id,
    videoUrl: submission.videoUrl,
    exercise: submission.exercise,
    reps: submission.reps,
    weight: submission.weight,
    duration: submission.duration,
    value: submission.value,
    status: submission.status,
    verifiedByName: submission.verifiedBy?.name || null,
    verifiedBy: submission.verifiedBy ? {
      id: submission.verifiedBy._id,
      name: submission.verifiedBy.name,
      username: submission.verifiedBy.username,
    } : null,
    createdAt: submission.submittedAt || submission.createdAt,
    submittedAt: submission.submittedAt,
    challenge: submission.challenge ? {
      id: submission.challenge._id,
      title: submission.challenge.title,
    } : null,
    type: 'challenge',
  }));

  const combinedVideos = [...formattedWorkoutVideos, ...formattedChallengeVideos]
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  res.json({
    success: true,
    data: combinedVideos,
  });
}));

module.exports = router;
