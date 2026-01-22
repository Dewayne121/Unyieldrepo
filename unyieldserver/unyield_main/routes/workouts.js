const express = require('express');
const User = require('../models/User');
const Workout = require('../models/Workout');
const { authenticate } = require('../middleware/auth');
const { asyncHandler, AppError } = require('../middleware/errorHandler');

const router = express.Router();

// GET /api/workouts/exercises/list - Get available exercises (must be before /:id)
router.get('/exercises/list', asyncHandler(async (req, res) => {
  res.json({
    success: true,
    data: Workout.EXERCISES,
  });
}));

// GET /api/workouts - Get user's workouts
router.get('/', authenticate, asyncHandler(async (req, res) => {
  const { limit = 50, offset = 0, startDate, endDate } = req.query;

  const query = { user: req.user.id };

  if (startDate || endDate) {
    query.date = {};
    if (startDate) query.date.$gte = new Date(startDate);
    if (endDate) query.date.$lte = new Date(endDate);
  }

  const workouts = await Workout.find(query)
    .sort({ date: -1 })
    .skip(parseInt(offset))
    .limit(parseInt(limit));

  const total = await Workout.countDocuments({ user: req.user.id });

  res.json({
    success: true,
    data: {
      workouts,
      total,
      limit: parseInt(limit),
      offset: parseInt(offset),
    },
  });
}));

// POST /api/workouts - Log a new workout
router.post('/', authenticate, asyncHandler(async (req, res) => {
  const { exercise, reps, weight, duration, notes } = req.body;

  if (!exercise) {
    throw new AppError('Exercise is required', 400);
  }

  if (!reps || reps <= 0) {
    throw new AppError('Reps must be greater than 0', 400);
  }

  if (reps > 2000) {
    throw new AppError('Reps cannot exceed 2000', 400);
  }

  if (weight && weight > 1000) {
    throw new AppError('Weight cannot exceed 1000 kg', 400);
  }

  const user = await User.findById(req.user.id);
  if (!user) {
    throw new AppError('User not found', 404);
  }

  // Calculate points
  const points = Workout.calcPoints(exercise, reps, weight || 0, user.streak);

  // Create workout
  const workout = await Workout.create({
    user: req.user.id,
    exercise,
    reps,
    weight: weight || null,
    duration: duration || null,
    points,
    notes: notes || null,
    date: new Date(),
  });

  // Update user stats
  const { streak, best } = await Workout.computeStreak(req.user.id);

  // Calculate weekly points
  const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const weeklyWorkouts = await Workout.find({
    user: req.user.id,
    date: { $gte: oneWeekAgo },
  });
  const weeklyPoints = weeklyWorkouts.reduce((sum, w) => sum + w.points, 0);

  user.totalPoints += points;
  user.weeklyPoints = weeklyPoints;
  user.streak = streak;
  user.streakBest = Math.max(user.streakBest, best);
  user.lastWorkoutDate = workout.date;
  user.updateRank();

  await user.save();

  res.status(201).json({
    success: true,
    data: {
      workout,
      pointsEarned: points,
      newTotal: user.totalPoints,
      streak: user.streak,
    },
  });
}));

// GET /api/workouts/:id - Get specific workout
router.get('/:id', authenticate, asyncHandler(async (req, res) => {
  const workout = await Workout.findById(req.params.id);

  if (!workout) {
    throw new AppError('Workout not found', 404);
  }

  if (workout.user.toString() !== req.user.id) {
    throw new AppError('Not authorized to view this workout', 403);
  }

  res.json({
    success: true,
    data: workout,
  });
}));

// DELETE /api/workouts/:id - Delete a workout
router.delete('/:id', authenticate, asyncHandler(async (req, res) => {
  const workout = await Workout.findById(req.params.id);

  if (!workout) {
    throw new AppError('Workout not found', 404);
  }

  if (workout.user.toString() !== req.user.id) {
    throw new AppError('Not authorized to delete this workout', 403);
  }

  // Update user points
  const user = await User.findById(req.user.id);
  if (user) {
    user.totalPoints = Math.max(0, user.totalPoints - workout.points);

    // Recalculate weekly points
    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const weeklyWorkouts = await Workout.find({
      user: req.user.id,
      _id: { $ne: req.params.id },
      date: { $gte: oneWeekAgo },
    });
    user.weeklyPoints = weeklyWorkouts.reduce((sum, w) => sum + w.points, 0);
    user.updateRank();

    await user.save();
  }

  await Workout.findByIdAndDelete(req.params.id);

  res.json({
    success: true,
    message: 'Workout deleted successfully',
  });
}));

module.exports = router;
