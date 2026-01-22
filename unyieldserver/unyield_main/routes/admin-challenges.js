const express = require('express');
const Challenge = require('../models/Challenge');
const ChallengeSubmission = require('../models/ChallengeSubmission');
const UserChallenge = require('../models/UserChallenge');
const User = require('../models/User');
const { authenticate } = require('../middleware/auth');
const { requireChallengeMaster, requireChallengeModerator, logAdminAction } = require('../middleware/admin');
const { asyncHandler, AppError } = require('../middleware/errorHandler');

const router = express.Router();

// GET /api/admin/challenges/pending-submissions - Get all pending submissions across all challenges
router.get('/pending-submissions',
  authenticate,
  requireChallengeModerator,
  asyncHandler(async (req, res) => {
    console.log('[ADMIN CHALLENGE SERVER] Fetching pending submissions...');
    const { page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [submissions, total] = await Promise.all([
      ChallengeSubmission.find({ status: 'pending' })
        .populate('user', 'name username profileImage')
        .populate('challenge', 'title')
        .populate('verifiedBy', 'name')
        .sort({ submittedAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      ChallengeSubmission.countDocuments({ status: 'pending' }),
    ]);

    console.log('[ADMIN CHALLENGE SERVER] Found submissions:', {
      count: submissions.length,
      total,
      page,
      limit
    });

    console.log('[ADMIN CHALLENGE SERVER] Sending response with', submissions.length, 'submissions');
    res.json({
      success: true,
      data: submissions.map((s) => ({
        id: s._id,
        user: {
          id: s.user._id,
          name: s.user.name,
          username: s.user.username,
          profileImage: s.user.profileImage,
        },
        challenge: {
          id: s.challenge?._id,
          title: s.challenge?.title || 'Unknown Challenge',
        },
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
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  })
);

// GET /api/admin/challenges - List all challenges (paginated)
router.get('/',
  authenticate,
  requireChallengeMaster,
  asyncHandler(async (req, res) => {
    const {
      page = 1,
      limit = 20,
      search = '',
      status = 'all',
      regionScope = 'all',
    } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Build query
    const query = {};

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ];
    }

    if (status === 'active') {
      query.isActive = true;
      query.endDate = { $gt: new Date() };
    } else if (status === 'ended') {
      query.endDate = { $lt: new Date() };
    } else if (status === 'inactive') {
      query.isActive = false;
    }

    if (regionScope !== 'all') {
      query.regionScope = regionScope.toLowerCase();
    }

    const [challenges, total] = await Promise.all([
      Challenge.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .populate('createdBy', 'name'),
      Challenge.countDocuments(query),
    ]);

    // Get participant counts for each challenge
    const challengesWithCounts = await Promise.all(
      challenges.map(async (challenge) => {
        const participantCount = await UserChallenge.countDocuments({
          challenge: challenge._id,
        });
        const pendingSubmissions = await ChallengeSubmission.countDocuments({
          challenge: challenge._id,
          status: 'pending',
        });

        return {
          ...challenge.toObject(),
          participantCount,
          pendingSubmissions,
        };
      })
    );

    res.json({
      success: true,
      data: challengesWithCounts,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  })
);

// GET /api/admin/challenges/:id - Get challenge details with participants
router.get('/:id',
  authenticate,
  requireChallengeMaster,
  asyncHandler(async (req, res) => {
    const challenge = await Challenge.findById(req.params.id).populate('createdBy', 'name');

    if (!challenge) {
      throw new AppError('Challenge not found', 404);
    }

    // Get participants with progress
    const participants = await UserChallenge.find({ challenge: challenge._id })
      .populate('user', 'name username profileImage region')
      .sort({ progress: -1, createdAt: 1 });

    // Get submission stats
    const submissionStats = await ChallengeSubmission.aggregate([
      { $match: { challenge: challenge._id } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
        },
      },
    ]);

    const statsMap = { pending: 0, approved: 0, rejected: 0 };
    submissionStats.forEach((s) => {
      statsMap[s._id] = s.count;
    });

    res.json({
      success: true,
      data: {
        challenge,
        participants: participants.map((p) => ({
          userId: p.user._id,
          name: p.user.name,
          username: p.user.username,
          profileImage: p.user.profileImage,
          region: p.user.region,
          progress: p.progress,
          completed: p.completed,
          completedAt: p.completedAt,
          joinedAt: p.createdAt,
        })),
        participantCount: participants.length,
        submissionStats: statsMap,
      },
    });
  })
);

// POST /api/admin/challenges - Create new challenge
router.post('/',
  authenticate,
  requireChallengeMaster,
  logAdminAction('challenge_created', 'challenge', null, null),
  asyncHandler(async (req, res) => {
    const {
      title,
      description,
      challengeType = 'exercise',
      exercises = [],
      customMetricName = '',
      metricType = 'reps',
      target,
      startDate,
      endDate,
      regionScope = 'global',
      reward = 100,
      requiresVideo = true,
      minVideoDuration = 5,
      rules = '',
      completionType = 'cumulative',
      winnerCriteria = 'first_to_complete',
      maxParticipants = 0,
    } = req.body;

    // Validation
    if (!title || !description || !target || !startDate || !endDate) {
      throw new AppError('Missing required fields', 400);
    }

    if (new Date(endDate) <= new Date(startDate)) {
      throw new AppError('End date must be after start date', 400);
    }

    if (challengeType === 'exercise' && (!exercises || exercises.length === 0)) {
      throw new AppError('Exercise-based challenges require at least one exercise', 400);
    }

    if (challengeType === 'custom' && !customMetricName) {
      throw new AppError('Custom challenges require a metric name', 400);
    }

    const challenge = await Challenge.create({
      title,
      description,
      challengeType,
      exercises: challengeType === 'exercise' ? exercises : [],
      customMetricName: challengeType === 'custom' ? customMetricName : '',
      metricType,
      target,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      regionScope: regionScope.toLowerCase(),
      reward,
      requiresVideo,
      minVideoDuration,
      rules,
      completionType,
      winnerCriteria,
      maxParticipants,
      createdBy: req.user.id,
      isActive: true,
    });

    // Add challenge ID to admin action data
    if (req.adminActionData) {
      req.adminActionData.targetId = challenge._id;
      req.adminActionData.details = {
        title: challenge.title,
        challengeType: challenge.challengeType,
        target: challenge.target,
        regionScope: challenge.regionScope,
      };
    }

    res.status(201).json({
      success: true,
      data: challenge,
    });
  })
);

// PATCH /api/admin/challenges/:id - Update challenge
router.patch('/:id',
  authenticate,
  requireChallengeMaster,
  logAdminAction('challenge_updated', 'challenge', ':id', null),
  asyncHandler(async (req, res) => {
    const challenge = await Challenge.findById(req.params.id);

    if (!challenge) {
      throw new AppError('Challenge not found', 404);
    }

    const allowedUpdates = [
      'title',
      'description',
      'exercises',
      'customMetricName',
      'metricType',
      'target',
      'startDate',
      'endDate',
      'regionScope',
      'reward',
      'requiresVideo',
      'minVideoDuration',
      'rules',
      'completionType',
      'winnerCriteria',
      'maxParticipants',
      'isActive',
    ];

    const updates = {};
    Object.keys(req.body).forEach((key) => {
      if (allowedUpdates.includes(key)) {
        updates[key] = req.body[key];
      }
    });

    // Validate end date
    if (updates.endDate && new Date(updates.endDate) <= new Date(challenge.startDate)) {
      throw new AppError('End date must be after start date', 400);
    }

    Object.assign(challenge, updates);
    await challenge.save();

    // Add details to admin action
    if (req.adminActionData) {
      req.adminActionData.details = {
        updatedFields: Object.keys(updates),
      };
    }

    res.json({
      success: true,
      data: challenge,
    });
  })
);

// DELETE /api/admin/challenges/:id - Delete challenge
router.delete('/:id',
  authenticate,
  requireChallengeMaster,
  logAdminAction('challenge_deleted', 'challenge', ':id', null),
  asyncHandler(async (req, res) => {
    const challenge = await Challenge.findById(req.params.id);

    if (!challenge) {
      throw new AppError('Challenge not found', 404);
    }

    // Check if challenge has participants
    const participantCount = await UserChallenge.countDocuments({
      challenge: challenge._id,
    });

    if (participantCount > 0) {
      throw new AppError(
        `Cannot delete challenge with ${participantCount} participants. Deactivate it instead.`,
        400
      );
    }

    await Challenge.findByIdAndDelete(req.params.id);

    // Add details to admin action
    if (req.adminActionData) {
      req.adminActionData.details = {
        title: challenge.title,
        participantCount,
      };
    }

    res.json({
      success: true,
      message: 'Challenge deleted successfully',
    });
  })
);

// GET /api/admin/challenges/:id/participants - Get challenge participants
router.get('/:id/participants',
  authenticate,
  requireChallengeMaster,
  asyncHandler(async (req, res) => {
    const { page = 1, limit = 50, status = 'all' } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const challenge = await Challenge.findById(req.params.id);

    if (!challenge) {
      throw new AppError('Challenge not found', 404);
    }

    const query = { challenge: challenge._id };
    if (status === 'completed') {
      query.completed = true;
    } else if (status === 'in_progress') {
      query.completed = false;
    }

    const [participants, total] = await Promise.all([
      UserChallenge.find(query)
        .populate('user', 'name username profileImage region')
        .sort({ progress: -1, createdAt: 1 })
        .skip(skip)
        .limit(parseInt(limit)),
      UserChallenge.countDocuments(query),
    ]);

    res.json({
      success: true,
      data: participants.map((p) => ({
        userId: p.user._id,
        name: p.user.name,
        username: p.user.username,
        profileImage: p.user.profileImage,
        region: p.user.region,
        progress: p.progress,
        completed: p.completed,
        completedAt: p.completedAt,
        joinedAt: p.createdAt,
      })),
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  })
);

// GET /api/admin/challenges/:id/submissions - Get submissions queue
router.get('/:id/submissions',
  authenticate,
  requireChallengeMaster,
  asyncHandler(async (req, res) => {
    const { page = 1, limit = 20, status = 'pending' } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const challenge = await Challenge.findById(req.params.id);

    if (!challenge) {
      throw new AppError('Challenge not found', 404);
    }

    const query = { challenge: challenge._id };
    if (status !== 'all') {
      query.status = status;
    }

    const [submissions, total] = await Promise.all([
      ChallengeSubmission.find(query)
        .populate('user', 'name username profileImage')
        .populate('verifiedBy', 'name')
        .sort({ submittedAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      ChallengeSubmission.countDocuments(query),
    ]);

    res.json({
      success: true,
      data: submissions.map((s) => ({
        id: s._id,
        user: {
          id: s.user._id,
          name: s.user.name,
          username: s.user.username,
          profileImage: s.user.profileImage,
        },
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
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  })
);

// POST /api/admin/challenges/submissions/:id/verify - Approve or reject submission
router.post('/submissions/:id/verify',
  authenticate,
  requireChallengeModerator,
  logAdminAction('challenge_submission_verified', 'challenge_submission', ':id', null),
  asyncHandler(async (req, res) => {
    const { action, rejectionReason = '' } = req.body;

    if (!['approve', 'reject'].includes(action)) {
      throw new AppError('Invalid action. Must be "approve" or "reject"', 400);
    }

    const submission = await ChallengeSubmission.findById(req.params.id)
      .populate('challenge')
      .populate('user');

    if (!submission) {
      throw new AppError('Submission not found', 404);
    }

    if (submission.status !== 'pending') {
      throw new AppError('Submission has already been verified', 400);
    }

    submission.status = action === 'approve' ? 'approved' : 'rejected';
    submission.verifiedBy = req.user.id;
    submission.verifiedAt = new Date();

    if (action === 'reject') {
      submission.rejectionReason = rejectionReason || 'Submission did not meet requirements';
    }

    await submission.save();

    // If approved, update user's challenge progress
    if (action === 'approve') {
      const userChallenge = await UserChallenge.findOne({
        user: submission.user._id,
        challenge: submission.challenge._id,
      });

      if (userChallenge) {
        // Update progress based on completion type
        if (submission.challenge.completionType === 'cumulative') {
          userChallenge.progress += submission.value;
        } else if (submission.challenge.completionType === 'best_effort') {
          userChallenge.progress = Math.max(userChallenge.progress, submission.value);
        } else {
          // single_session - use the current submission value
          userChallenge.progress = submission.value;
        }

        // Check if challenge is completed
        if (userChallenge.progress >= submission.challenge.target && !userChallenge.completed) {
          userChallenge.completed = true;
          userChallenge.completedAt = new Date();

          // Award bonus points (reward)
          submission.user.totalPoints += submission.challenge.reward || 0;
          await submission.user.save();
        }

        await userChallenge.save();
      }
    }

    // Add details to admin action
    if (req.adminActionData) {
      req.adminActionData.details = {
        action,
        challengeId: submission.challenge._id,
        challengeTitle: submission.challenge.title,
        userId: submission.user._id,
        userName: submission.user.name,
        value: submission.value,
        rejectionReason: action === 'reject' ? rejectionReason : undefined,
      };
    }

    res.json({
      success: true,
      message: action === 'approve'
        ? 'Submission approved and progress updated'
        : 'Submission rejected',
      data: submission,
    });
  })
);

// GET /api/admin/challenges/:id/leaderboard - View challenge leaderboard
router.get('/:id/leaderboard',
  authenticate,
  requireChallengeMaster,
  asyncHandler(async (req, res) => {
    const { limit = 100 } = req.query;

    const challenge = await Challenge.findById(req.params.id);

    if (!challenge) {
      throw new AppError('Challenge not found', 404);
    }

    const participants = await UserChallenge.find({ challenge: challenge._id })
      .populate('user', 'name username profileImage region')
      .sort({ progress: -1 })
      .limit(parseInt(limit));

    const leaderboard = participants.map((p, index) => ({
      rank: index + 1,
      userId: p.user._id,
      name: p.user.name,
      username: p.user.username,
      profileImage: p.user.profileImage,
      region: p.user.region,
      progress: p.progress,
      completed: p.completed,
      completedAt: p.completedAt,
      joinedAt: p.createdAt,
      percentage: Math.min(100, (p.progress / challenge.target) * 100),
    }));

    // Get top submissions for best_effort challenges
    let topSubmissions = [];
    if (challenge.winnerCriteria === 'best_single' || challenge.completionType === 'best_effort') {
      topSubmissions = await ChallengeSubmission.find({
        challenge: challenge._id,
        status: 'approved',
      })
        .populate('user', 'name username')
        .sort({ value: -1 })
        .limit(10);
    }

    res.json({
      success: true,
      data: {
        challenge: {
          id: challenge._id,
          title: challenge.title,
          target: challenge.target,
          metricType: challenge.metricType,
          winnerCriteria: challenge.winnerCriteria,
        },
        leaderboard,
        totalParticipants: participants.length,
        topSubmissions: topSubmissions.map((s) => ({
          id: s._id,
          value: s.value,
          exercise: s.exercise,
          reps: s.reps,
          weight: s.weight,
          user: { id: s.user._id, name: s.user.name, username: s.user.username },
        })),
      },
    });
  })
);

module.exports = router;
