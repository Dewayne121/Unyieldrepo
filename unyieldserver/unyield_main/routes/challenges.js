const express = require('express');
const Challenge = require('../models/Challenge');
const ChallengeSubmission = require('../models/ChallengeSubmission');
const UserChallenge = require('../models/UserChallenge');
const User = require('../models/User');
const { authenticate, optionalAuth } = require('../middleware/auth');
const { asyncHandler, AppError } = require('../middleware/errorHandler');
const { deleteVideo } = require('../services/objectStorage');

const router = express.Router();

// GET /api/challenges/user/active - Get user's active challenges (must be before /:id)
router.get('/user/active', authenticate, asyncHandler(async (req, res) => {
  const now = new Date();

  const userChallenges = await UserChallenge.find({ user: req.user.id })
    .populate({
      path: 'challenge',
      match: { isActive: true, endDate: { $gt: now } },
    });

  const activeChallenges = userChallenges
    .filter(uc => uc.challenge)
    .map(uc => ({
      ...uc.challenge.toObject(),
      progress: uc.progress,
      completed: uc.completed,
      joinedAt: uc.createdAt,
    }));

  res.json({
    success: true,
    data: activeChallenges,
  });
}));

// GET /api/challenges/my-submissions - Get user's challenge submissions (must be before /:id)
router.get('/my-submissions', authenticate, asyncHandler(async (req, res) => {
  console.log('[CHALLENGES] Getting user submissions for user:', req.user.id);

  const submissions = await ChallengeSubmission.find({ user: req.user.id })
    .populate('challenge', 'title')
    .sort({ submittedAt: -1 });

  console.log('[CHALLENGES] Found submissions:', submissions.length);

  res.json({
    success: true,
    data: submissions.map(s => ({
      _id: s._id,
      challenge: s.challenge,
      exercise: s.exercise,
      reps: s.reps,
      weight: s.weight,
      duration: s.duration,
      value: s.value,
      videoUrl: s.videoUrl,
      status: s.status,
      rejectionReason: s.rejectionReason,
      verifiedAt: s.verifiedAt,
      submittedAt: s.submittedAt,
      createdAt: s.createdAt,
    })),
  });
}));

// GET /api/challenges - Get all active challenges
router.get('/', optionalAuth, asyncHandler(async (req, res) => {
  const { region = 'global', includeExpired = 'false' } = req.query;
  const now = new Date();

  const query = {
    $or: [
      { regionScope: 'global' },
      { regionScope: region.toLowerCase() },
    ],
  };

  if (includeExpired !== 'true') {
    query.isActive = true;
    query.endDate = { $gt: now };
  }

  let challenges = await Challenge.find(query);

  // Add user progress if authenticated
  if (req.user) {
    const userChallenges = await UserChallenge.find({
      user: req.user.id,
      challenge: { $in: challenges.map(c => c._id) },
    });

    const ucMap = new Map(userChallenges.map(uc => [uc.challenge.toString(), uc]));

    challenges = challenges.map(challenge => ({
      ...challenge.toObject(),
      joined: ucMap.has(challenge._id.toString()),
      progress: ucMap.get(challenge._id.toString())?.progress || 0,
      completed: ucMap.get(challenge._id.toString())?.completed || false,
    }));
  }

  res.json({
    success: true,
    data: challenges,
  });
}));

// GET /api/challenges/:id - Get specific challenge
router.get('/:id', optionalAuth, asyncHandler(async (req, res) => {
  const challenge = await Challenge.findById(req.params.id);

  if (!challenge) {
    throw new AppError('Challenge not found', 404);
  }

  let responseData = challenge.toObject();

  // Add user progress if authenticated
  if (req.user) {
    const userChallenge = await UserChallenge.findOne({
      user: req.user.id,
      challenge: challenge._id,
    });

    responseData.joined = !!userChallenge;
    responseData.progress = userChallenge?.progress || 0;
    responseData.completed = userChallenge?.completed || false;
  }

  // Get participant count
  const participantCount = await UserChallenge.countDocuments({ challenge: challenge._id });
  responseData.participantCount = participantCount;

  res.json({
    success: true,
    data: responseData,
  });
}));

// POST /api/challenges/:id/join - Join a challenge
router.post('/:id/join', authenticate, asyncHandler(async (req, res) => {
  const challenge = await Challenge.findById(req.params.id);

  if (!challenge) {
    throw new AppError('Challenge not found', 404);
  }

  if (!challenge.isActive) {
    throw new AppError('This challenge is no longer active', 400);
  }

  if (new Date(challenge.endDate) < new Date()) {
    throw new AppError('This challenge has ended', 400);
  }

  const existing = await UserChallenge.findOne({
    user: req.user.id,
    challenge: challenge._id,
  });

  if (existing) {
    throw new AppError('You have already joined this challenge', 400);
  }

  const userChallenge = await UserChallenge.create({
    user: req.user.id,
    challenge: challenge._id,
    progress: 0,
    completed: false,
  });

  res.status(201).json({
    success: true,
    data: {
      challenge,
      userProgress: userChallenge,
    },
  });
}));

// POST /api/challenges/:id/leave - Leave a challenge
router.post('/:id/leave', authenticate, asyncHandler(async (req, res) => {
  const challenge = await Challenge.findById(req.params.id);

  if (!challenge) {
    throw new AppError('Challenge not found', 404);
  }

  const result = await UserChallenge.findOneAndDelete({
    user: req.user.id,
    challenge: challenge._id,
  });

  if (!result) {
    throw new AppError('You have not joined this challenge', 400);
  }

  res.json({
    success: true,
    message: 'Successfully left the challenge',
  });
}));

// GET /api/challenges/:id/leaderboard - Get challenge leaderboard
router.get('/:id/leaderboard', asyncHandler(async (req, res) => {
  const { limit = 20 } = req.query;
  const challenge = await Challenge.findById(req.params.id);

  if (!challenge) {
    throw new AppError('Challenge not found', 404);
  }

  const participants = await UserChallenge.find({ challenge: challenge._id })
    .populate('user', 'name')
    .sort({ progress: -1 })
    .limit(parseInt(limit));

  const leaderboard = participants.map((p, index) => ({
    userId: p.user._id,
    name: p.user.name,
    progress: p.progress,
    completed: p.completed,
    joinedAt: p.createdAt,
    rank: index + 1,
  }));

  const totalParticipants = await UserChallenge.countDocuments({ challenge: challenge._id });

  res.json({
    success: true,
    data: {
      challenge: {
        id: challenge._id,
        title: challenge.title,
        target: challenge.target,
      },
      leaderboard,
      totalParticipants,
    },
  });
}));

// POST /api/challenges/:id/submit - Submit a challenge entry
router.post('/:id/submit', authenticate, asyncHandler(async (req, res) => {
  const { exercise, reps, weight, duration, videoUri, videoUrl, serverVideoId, notes = '' } = req.body;

  const challenge = await Challenge.findById(req.params.id);

  if (!challenge) {
    throw new AppError('Challenge not found', 404);
  }

  if (!challenge.isActive) {
    throw new AppError('This challenge is no longer active', 400);
  }

  if (new Date(challenge.endDate) < new Date()) {
    throw new AppError('This challenge has ended', 400);
  }

  // Check if user has joined the challenge
  const userChallenge = await UserChallenge.findOne({
    user: req.user.id,
    challenge: challenge._id,
  });

  if (!userChallenge) {
    throw new AppError('You must join this challenge before submitting entries', 400);
  }

  // Validate exercise if required
  if (challenge.challengeType === 'exercise') {
    if (!exercise || !challenge.exercises.includes(exercise)) {
      throw new AppError('Invalid exercise for this challenge', 400);
    }
  }

  // Validate required video
  if (challenge.requiresVideo && !videoUrl && !serverVideoId) {
    throw new AppError('Video evidence is required for this challenge', 400);
  }

  // Calculate the value based on metric type
  let value = 0;
  switch (challenge.metricType) {
    case 'reps':
      value = reps || 0;
      break;
    case 'weight':
      value = weight || 0;
      break;
    case 'duration':
      value = duration || 0;
      break;
    case 'workouts':
      value = 1; // Each submission counts as 1 workout
      break;
  }

  // Check for existing pending submission
  const existingPending = await ChallengeSubmission.findOne({
    user: req.user.id,
    challenge: challenge._id,
    status: 'pending',
  });

  if (existingPending) {
    throw new AppError('You already have a pending submission. Wait for it to be verified.', 400);
  }

  const submission = await ChallengeSubmission.create({
    user: req.user.id,
    challenge: challenge._id,
    exercise,
    reps: reps || 0,
    weight: weight || 0,
    duration: duration || 0,
    videoUri,
    videoUrl,
    serverVideoId,
    value,
    notes,
    submittedAt: new Date(),
  });

  res.status(201).json({
    success: true,
    message: 'Challenge entry submitted for verification',
    data: submission,
  });
}));

// GET /api/challenges/:id/my-submissions - Get user's submissions for a challenge
router.get('/:id/my-submissions', authenticate, asyncHandler(async (req, res) => {
  const challenge = await Challenge.findById(req.params.id);

  if (!challenge) {
    throw new AppError('Challenge not found', 404);
  }

  const submissions = await ChallengeSubmission.find({
    user: req.user.id,
    challenge: challenge._id,
  })
    .sort({ submittedAt: -1 })
    .populate('verifiedBy', 'name');

  res.json({
    success: true,
    data: submissions.map((s) => ({
      id: s._id,
      exercise: s.exercise,
      reps: s.reps,
      weight: s.weight,
      duration: s.duration,
      value: s.value,
      videoUrl: s.videoUrl,
      status: s.status,
      verifiedBy: s.verifiedBy ? { id: s.verifiedBy._id, name: s.verifiedBy.name } : null,
      verifiedAt: s.verifiedAt,
      rejectionReason: s.rejectionReason,
      notes: s.notes,
      submittedAt: s.submittedAt,
    })),
  });
}));

// GET /api/challenges/:id/top-submissions - Get top submissions for a challenge
router.get('/:id/top-submissions', asyncHandler(async (req, res) => {
  const { limit = 10 } = req.query;
  const challenge = await Challenge.findById(req.params.id);

  if (!challenge) {
    throw new AppError('Challenge not found', 404);
  }

  const topSubmissions = await ChallengeSubmission.find({
    challenge: challenge._id,
    status: 'approved',
  })
    .populate('user', 'name username profileImage')
    .sort({ value: -1 })
    .limit(parseInt(limit));

  res.json({
    success: true,
    data: topSubmissions.map((s, index) => ({
      rank: index + 1,
      id: s._id,
      value: s.value,
      exercise: s.exercise,
      reps: s.reps,
      weight: s.weight,
      user: {
        id: s.user._id,
        name: s.user.name,
        username: s.user.username,
        profileImage: s.user.profileImage,
      },
      verifiedAt: s.verifiedAt,
    })),
  });
}));

// DELETE /api/challenges/submissions/:id - Delete a challenge submission (owner only)
router.delete('/submissions/:id', authenticate, asyncHandler(async (req, res) => {
  console.log('[CHALLENGE SUBMISSION] Delete request for:', req.params.id, 'by user:', req.user.id);

  const submission = await ChallengeSubmission.findById(req.params.id);

  if (!submission) {
    throw new AppError('Challenge submission not found', 404);
  }

  // Must be the owner of the submission to delete it
  if (submission.user.toString() !== req.user.id) {
    throw new AppError('You can only delete your own challenge submissions', 403);
  }

  // Only allow deletion of pending or rejected submissions (not approved ones)
  if (submission.status === 'approved') {
    throw new AppError('Cannot delete an approved submission', 400);
  }

  // Delete from Object Storage
  if (submission.videoUrl) {
    try {
      await deleteVideo(submission.videoUrl);
      console.log('[CHALLENGE SUBMISSION] Deleted video from storage');
    } catch (storageErr) {
      console.log('[CHALLENGE SUBMISSION] Storage deletion error (continuing):', storageErr.message);
    }
  }

  // Delete the submission
  await ChallengeSubmission.findByIdAndDelete(req.params.id);
  console.log('[CHALLENGE SUBMISSION] Deleted from database:', req.params.id);

  res.json({
    success: true,
    message: 'Challenge submission deleted successfully',
  });
}));

module.exports = router;
