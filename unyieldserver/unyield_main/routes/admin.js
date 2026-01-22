const express = require('express');
const User = require('../models/User');
const Workout = require('../models/Workout');
const VideoSubmission = require('../models/VideoSubmission');
const Report = require('../models/Report');
const Appeal = require('../models/Appeal');
const Challenge = require('../models/Challenge');
const Notification = require('../models/Notification');
const AdminAction = require('../models/AdminAction');
const { authenticate } = require('../middleware/auth');
const { requireAdmin, requireSuperAdmin, logAdminAction, isSuperAdmin } = require('../middleware/admin');
const { asyncHandler, AppError } = require('../middleware/errorHandler');

const router = express.Router();

// ============================================================================
// DASHBOARD & ANALYTICS
// ============================================================================

// GET /api/admin/stats - Get platform-wide statistics
router.get('/stats', authenticate, requireAdmin, asyncHandler(async (req, res) => {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);
  const monthAgo = new Date(now - 30 * 24 * 60 * 60 * 1000);

  // User stats
  const totalUsers = await User.countDocuments();
  const newUsersToday = await User.countDocuments({ createdAt: { $gte: today } });
  const newUsersWeek = await User.countDocuments({ createdAt: { $gte: weekAgo } });
  const newUsersMonth = await User.countDocuments({ createdAt: { $gte: monthAgo } });

  // Active users (users who logged workout in last 7 days)
  const activeUsers = await User.distinct('user', {
    date: { $gte: weekAgo }
  });
  const activeUsersCount = activeUsers.length;

  // Workout stats
  const totalWorkouts = await Workout.countDocuments();
  const workoutsToday = await Workout.countDocuments({ date: { $gte: today } });
  const workoutsWeek = await Workout.countDocuments({ date: { $gte: weekAgo } });
  const workoutsMonth = await Workout.countDocuments({ date: { $gte: monthAgo } });

  // Video stats
  const totalVideos = await VideoSubmission.countDocuments();
  const pendingVideos = await VideoSubmission.countDocuments({ status: 'pending' });
  const approvedVideos = await VideoSubmission.countDocuments({ status: 'approved' });
  const rejectedVideos = await VideoSubmission.countDocuments({ status: 'rejected' });
  const videosToday = await VideoSubmission.countDocuments({ createdAt: { $gte: today } });

  // Report & Appeal stats
  const pendingReports = await Report.countDocuments({ status: 'pending' });
  const pendingAppeals = await Appeal.countDocuments({ status: 'pending' });

  // Points awarded
  const totalPointsAwarded = await User.aggregate([
    { $group: { _id: null, total: { $sum: '$totalPoints' } } }
  ]);
  const pointsToday = await VideoSubmission.aggregate([
    { $match: { status: 'approved', createdAt: { $gte: today } } },
    { $group: { _id: null, total: { $sum: '$pointsAwarded' } } }
  ]);

  // Active challenges
  const activeChallenges = await Challenge.countDocuments({ isActive: true });

  // User growth by month (last 12 months)
  const userGrowth = [];
  for (let i = 11; i >= 0; i--) {
    const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59);
    const count = await User.countDocuments({
      createdAt: { $gte: monthStart, $lte: monthEnd }
    });
    userGrowth.push({
      month: monthStart.toLocaleString('default', { month: 'short', year: '2-digit' }),
      count
    });
  }

  // Workout activity by month (last 12 months)
  const workoutActivity = [];
  for (let i = 11; i >= 0; i--) {
    const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59);
    const count = await Workout.countDocuments({
      date: { $gte: monthStart, $lte: monthEnd }
    });
    workoutActivity.push({
      month: monthStart.toLocaleString('default', { month: 'short', year: '2-digit' }),
      count
    });
  }

  // Region distribution
  const regionDistribution = await User.aggregate([
    { $group: { _id: '$region', count: { $sum: 1 } } },
    { $sort: { count: -1 } }
  ]);

  // Top users by points
  const topUsers = await User.find()
    .sort({ totalPoints: -1 })
    .limit(10)
    .select('name username totalPoints weeklyPoints streak region profileImage');

  res.json({
    success: true,
    data: {
      users: {
        total: totalUsers,
        newToday: newUsersToday,
        newWeek: newUsersWeek,
        newMonth: newUsersMonth,
        active: activeUsersCount,
      },
      workouts: {
        total: totalWorkouts,
        today: workoutsToday,
        week: workoutsWeek,
        month: workoutsMonth,
      },
      videos: {
        total: totalVideos,
        pending: pendingVideos,
        approved: approvedVideos,
        rejected: rejectedVideos,
        today: videosToday,
      },
      moderation: {
        pendingReports,
        pendingAppeals,
      },
      points: {
        totalAwarded: totalPointsAwarded[0]?.total || 0,
        today: pointsToday[0]?.total || 0,
      },
      challenges: {
        active: activeChallenges,
      },
      userGrowth,
      workoutActivity,
      regionDistribution,
      topUsers,
    },
  });
}));

// ============================================================================
// USER MANAGEMENT
// ============================================================================

// Helper to format user response with all details
const formatUserDetailResponse = async (user) => {
  // Get user's workout count
  const workoutCount = await Workout.countDocuments({ user: user._id });

  // Get user's video submissions
  const videoStats = await VideoSubmission.aggregate([
    { $match: { user: user._id } },
    { $group: {
      _id: '$status',
      count: { $sum: 1 }
    }}
  ]);

  const videos = {
    total: await VideoSubmission.countDocuments({ user: user._id }),
    pending: 0,
    approved: 0,
    rejected: 0,
  };

  videoStats.forEach(stat => {
    videos[stat._id] = stat.count;
  });

  return {
    id: user._id,
    email: user.email,
    username: user.username,
    name: user.name,
    profileImage: user.profileImage,
    region: user.region,
    goal: user.goal,
    bio: user.bio || '',
    accolades: user.accolades || [],
    provider: user.provider,
    totalPoints: user.totalPoints,
    weeklyPoints: user.weeklyPoints,
    rank: user.rank,
    streak: user.streak,
    streakBest: user.streakBest,
    lastWorkoutDate: user.lastWorkoutDate,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
    workoutCount,
    videos,
  };
};

// GET /api/admin/users - List all users with pagination and filters
router.get('/users', authenticate, requireAdmin, asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 20,
    search = '',
    region = '',
    accolade = '',
    sortBy = 'createdAt',
    sortOrder = 'desc',
  } = req.query;

  const skip = (parseInt(page) - 1) * parseInt(limit);

  // Build query
  const query = {};

  if (search) {
    query.$or = [
      { name: { $regex: search, $options: 'i' } },
      { username: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
    ];
  }

  if (region && region !== 'all') {
    query.region = region;
  }

  if (accolade && accolade !== 'all') {
    query.accolades = accolade;
  }

  // Build sort
  const sort = {};
  sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

  // Execute query
  const users = await User.find(query)
    .sort(sort)
    .skip(skip)
    .limit(parseInt(limit))
    .select('-password');

  const total = await User.countDocuments(query);

  res.json({
    success: true,
    data: {
      users: users.map(user => ({
        id: user._id,
        name: user.name,
        username: user.username,
        email: user.email,
        profileImage: user.profileImage,
        region: user.region,
        totalPoints: user.totalPoints,
        weeklyPoints: user.weeklyPoints,
        rank: user.rank,
        streak: user.streak,
        accolades: user.accolades || [],
        provider: user.provider,
        createdAt: user.createdAt,
        lastWorkoutDate: user.lastWorkoutDate,
      })),
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
      },
    },
  });
}));

// GET /api/admin/users/:id - Get detailed user info
router.get('/users/:id', authenticate, requireAdmin, asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id).select('-password');

  if (!user) {
    throw new AppError('User not found', 404);
  }

  const userData = await formatUserDetailResponse(user);

  // Get recent workouts
  const recentWorkouts = await Workout.find({ user: user._id })
    .sort({ date: -1 })
    .limit(10);

  // Get recent video submissions
  const recentVideos = await VideoSubmission.find({ user: user._id })
    .sort({ createdAt: -1 })
    .limit(10)
    .populate('verifiedBy', 'name username');

  // Get audit log for this user
  const auditLog = await AdminAction.find({
    targetType: 'user',
    targetId: user._id,
  })
    .sort({ createdAt: -1 })
    .limit(20)
    .populate('admin', 'name username');

  res.json({
    success: true,
    data: {
      user: userData,
      recentWorkouts,
      recentVideos,
      auditLog,
    },
  });
}));

// PATCH /api/admin/users/:id - Update user (admin only)
router.patch('/users/:id',
  authenticate,
  requireAdmin,
  logAdminAction('user_updated', 'user', ':id', null),
  asyncHandler(async (req, res) => {
    const user = await User.findById(req.params.id);

    if (!user) {
      throw new AppError('User not found', 404);
    }

    const allowedUpdates = ['name', 'username', 'email', 'region', 'goal', 'bio', 'profileImage', 'accolades', 'totalPoints', 'weeklyPoints', 'rank', 'streak', 'streakBest'];

    // Store changes for audit log
    const changes = {};

    for (const key of allowedUpdates) {
      if (req.body[key] !== undefined) {
        // Special handling for accolades - only super admin can modify
        if (key === 'accolades' && !isSuperAdmin(req.adminUser)) {
          continue;
        }

        // Validate region
        if (key === 'region' && !User.REGIONS.includes(req.body[key])) {
          throw new AppError(`Invalid region. Must be one of: ${User.REGIONS.join(', ')}`, 400);
        }

        // Validate goal
        if (key === 'goal' && !User.GOALS.includes(req.body[key])) {
          throw new AppError(`Invalid goal. Must be one of: ${User.GOALS.join(', ')}`, 400);
        }

        // Validate accolades
        if (key === 'accolades') {
          if (!Array.isArray(req.body[key])) {
            throw new AppError('Accolades must be an array', 400);
          }
          for (const acc of req.body[key]) {
            if (!User.ACCOLADES.includes(acc)) {
              throw new AppError(`Invalid accolade: ${acc}`, 400);
            }
          }
        }

        // Track changes
        if (JSON.stringify(user[key]) !== JSON.stringify(req.body[key])) {
          changes[key] = {
            from: user[key],
            to: req.body[key],
          };
        }

        user[key] = req.body[key];
      }
    }

    // Update the request's admin action data with changes
    if (req.adminActionData) {
      req.adminActionData.details = changes;
    }

    await user.save();

    res.json({
      success: true,
      data: await formatUserDetailResponse(user),
    });
}));

// DELETE /api/admin/users/:id - Delete user (super admin only)
router.delete('/users/:id',
  authenticate,
  requireSuperAdmin,
  logAdminAction('user_deleted', 'user', ':id', null),
  asyncHandler(async (req, res) => {
    const userId = req.params.id;

    // Cannot delete yourself
    if (userId === req.user.id) {
      throw new AppError('Cannot delete your own account through admin panel', 400);
    }

    const user = await User.findById(userId);

    if (!user) {
      throw new AppError('User not found', 404);
    }

    // Store user info for audit log
    if (req.adminActionData) {
      req.adminActionData.details = {
        userName: user.name,
        username: user.username,
        email: user.email,
      };
    }

    // Delete all user's data
    await Workout.deleteMany({ user: userId });
    await VideoSubmission.deleteMany({ user: userId });
    await Notification.deleteMany({ user: userId });
    await Report.deleteMany({ reporter: userId });
    await Appeal.deleteMany({ user: userId });

    // Delete the user
    await User.findByIdAndDelete(userId);

    res.json({
      success: true,
      message: 'User deleted successfully',
    });
}));

// POST /api/admin/users/:id/accolades - Add accolade to user (super admin only)
router.post('/users/:id/accolades',
  authenticate,
  requireSuperAdmin,
  logAdminAction('accolade_added', 'user', ':id', null),
  asyncHandler(async (req, res) => {
    const { accolade } = req.body;

    if (!accolade) {
      throw new AppError('Accolade is required', 400);
    }

    if (!User.ACCOLADES.includes(accolade)) {
      throw new AppError(`Invalid accolade. Must be one of: ${User.ACCOLADES.join(', ')}`, 400);
    }

    const user = await User.findById(req.params.id);

    if (!user) {
      throw new AppError('User not found', 404);
    }

    if (!user.accolades) {
      user.accolades = [];
    }

    if (user.accolades.includes(accolade)) {
      throw new AppError('User already has this accolade', 400);
    }

    user.accolades.push(accolade);
    await user.save();

    if (req.adminActionData) {
      req.adminActionData.details = { accolade, newAccolades: user.accolades };
    }

    res.json({
      success: true,
      data: { accolades: user.accolades },
    });
}));

// DELETE /api/admin/users/:id/accolades/:accolade - Remove accolade from user (super admin only)
router.delete('/users/:id/accolades/:accolade',
  authenticate,
  requireSuperAdmin,
  logAdminAction('accolade_removed', 'user', ':id', null),
  asyncHandler(async (req, res) => {
    const { accolade } = req.params;

    if (!User.ACCOLADES.includes(accolade)) {
      throw new AppError(`Invalid accolade`, 400);
    }

    const user = await User.findById(req.params.id);

    if (!user) {
      throw new AppError('User not found', 404);
    }

    if (!user.accolades || !user.accolades.includes(accolade)) {
      throw new AppError('User does not have this accolade', 400);
    }

    user.accolades = user.accolades.filter(a => a !== accolade);
    await user.save();

    if (req.adminActionData) {
      req.adminActionData.details = { accolade, newAccolades: user.accolades };
    }

    res.json({
      success: true,
      data: { accolades: user.accolades },
    });
}));

// ============================================================================
// VIDEO MODERATION (ENHANCED)
// ============================================================================

// GET /api/admin/videos/pending - Get all pending videos with enhanced info
router.get('/videos/pending', authenticate, requireAdmin, asyncHandler(async (req, res) => {
  console.log('[ADMIN VIDEO] Fetching pending videos...');
  const { page = 1, limit = 20, exercise = '' } = req.query;
  const skip = (parseInt(page) - 1) * parseInt(limit);

  const query = { status: 'pending' };

  if (exercise) {
    query.exercise = { $regex: exercise, $options: 'i' };
  }

  console.log('[ADMIN VIDEO] Query:', JSON.stringify(query));

  const videos = await VideoSubmission.find(query)
    .sort({ createdAt: 1 })
    .skip(skip)
    .limit(parseInt(limit))
    .populate('user', 'name username profileImage region accolades')
    .populate('workout');

  const total = await VideoSubmission.countDocuments(query);

  console.log('[ADMIN VIDEO] Found:', {
    count: videos.length,
    total,
    page,
    limit
  });

  // Log video details
  videos.forEach((v, i) => {
    console.log(`[ADMIN VIDEO] Video ${i + 1}:`, {
      _id: v._id,
      exercise: v.exercise,
      reps: v.reps,
      user: v.user?.username,
      videoUrl: v.videoUrl?.substring(0, 50) + '...'
    });
  });

  res.json({
    success: true,
    data: {
      videos,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
      },
    },
  });
  console.log('[ADMIN VIDEO] Response sent with', videos.length, 'videos');
}));

// GET /api/admin/videos/:id - Get video with full details for moderation
router.get('/videos/:id', authenticate, requireAdmin, asyncHandler(async (req, res) => {
  const video = await VideoSubmission.findById(req.params.id)
    .populate('user', 'name username profileImage region accolades totalPoints streak')
    .populate('verifiedBy', 'name username')
    .populate('workout');

  if (!video) {
    throw new AppError('Video not found', 404);
  }

  // Get user's video history
  const userVideoHistory = await VideoSubmission.find({
    user: video.user._id,
    status: { $in: ['approved', 'rejected'] },
  })
    .sort({ createdAt: -1 })
    .limit(10)
    .populate('verifiedBy', 'name username');

  // Get any reports on this video
  const reports = await Report.find({
    videoSubmission: video._id,
  })
    .sort({ createdAt: -1 })
    .populate('reporter', 'name username');

  // Get any appeals on this video
  const appeal = await Appeal.findOne({
    videoSubmission: video._id,
  })
    .populate('user', 'name username');

  res.json({
    success: true,
    data: {
      video,
      userVideoHistory,
      reports,
      appeal,
    },
  });
}));

// POST /api/admin/videos/:id/verify - Verify video with enhanced logging
router.post('/videos/:id/verify',
  authenticate,
  requireAdmin,
  logAdminAction('video_approved', 'video', ':id', null),
  asyncHandler(async (req, res) => {
    const { action, rejectionReason, pointsAwarded } = req.body;

    if (!['approve', 'reject'].includes(action)) {
      throw new AppError('Action must be approve or reject', 400);
    }

    const video = await VideoSubmission.findById(req.params.id)
      .populate('user', 'name username');

    if (!video) {
      throw new AppError('Video not found', 404);
    }

    if (video.status !== 'pending') {
      throw new AppError('Video has already been verified', 400);
    }

    // Check if user exists (handle orphan videos from deleted accounts)
    if (!video.user) {
      // Delete orphan video and return success
      await VideoSubmission.findByIdAndDelete(req.params.id);
      return res.json({
        success: true,
        message: 'Orphan video removed (user account was deleted)',
        data: { deleted: true },
      });
    }

    // Get user ID - handle both populated and non-populated cases
    const videoUserId = video.user._id?.toString() || video.user.toString();

    // Cannot verify your own submission
    if (videoUserId === req.user.id) {
      throw new AppError('You cannot verify your own submission', 400);
    }

    video.status = action === 'approve' ? 'approved' : 'rejected';
    video.verifiedBy = req.adminUser._id;
    video.verifiedByName = req.adminUser.name;
    video.verifiedAt = new Date();

    if (action === 'reject') {
      video.rejectionReason = rejectionReason || 'No reason provided';
      video.pointsAwarded = 0;
    } else if (pointsAwarded !== undefined) {
      video.pointsAwarded = parseInt(pointsAwarded) || 0;
    }

    await video.save();

    // Update action type and details for audit log
    if (req.adminActionData) {
      req.adminActionData.action = action === 'approve' ? 'video_approved' : 'video_rejected';
      req.adminActionData.details = {
        action,
        exercise: video.exercise,
        reps: video.reps,
        weight: video.weight,
        userId: videoUserId,
        userName: video.user.name || 'Unknown',
        rejectionReason,
        pointsAwarded: video.pointsAwarded,
      };
    }

    res.json({
      success: true,
      data: video,
    });
}));

// ============================================================================
// APPEALS MANAGEMENT
// ============================================================================

// GET /api/admin/appeals - Get all appeals with filtering
router.get('/appeals', authenticate, requireAdmin, asyncHandler(async (req, res) => {
  const { status = 'pending', page = 1, limit = 20 } = req.query;
  const skip = (parseInt(page) - 1) * parseInt(limit);

  const query = {};
  if (status !== 'all') {
    query.status = status;
  }

  const appeals = await Appeal.find(query)
    .sort({ createdAt: status === 'pending' ? 1 : -1 })
    .skip(skip)
    .limit(parseInt(limit))
    .populate('user', 'name username profileImage')
    .populate('videoSubmission')
    .populate('reviewedBy', 'name username');

  const total = await Appeal.countDocuments(query);

  res.json({
    success: true,
    data: {
      appeals,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
      },
    },
  });
}));

// GET /api/admin/appeals/:id - Get appeal details
router.get('/appeals/:id', authenticate, requireAdmin, asyncHandler(async (req, res) => {
  const appeal = await Appeal.findById(req.params.id)
    .populate('user', 'name username profileImage region totalPoints')
    .populate('videoSubmission')
    .populate('reviewedBy', 'name username');

  if (!appeal) {
    throw new AppError('Appeal not found', 404);
  }

  // Get user's video history
  const userVideoHistory = await VideoSubmission.find({
    user: appeal.user._id,
    status: { $in: ['approved', 'rejected'] },
  })
    .sort({ createdAt: -1 })
    .limit(5);

  res.json({
    success: true,
    data: {
      appeal,
      userVideoHistory,
    },
  });
}));

// POST /api/admin/appeals/:id/review - Review appeal
router.post('/appeals/:id/review',
  authenticate,
  requireAdmin,
  logAdminAction('appeal_approved', 'appeal', ':id', null),
  asyncHandler(async (req, res) => {
    const { action, reviewNotes } = req.body;

    if (!['approve', 'deny'].includes(action)) {
      throw new AppError('Action must be approve or deny', 400);
    }

    const appeal = await Appeal.findById(req.params.id)
      .populate('videoSubmission');

    if (!appeal) {
      throw new AppError('Appeal not found', 404);
    }

    if (appeal.status !== 'pending') {
      throw new AppError('Appeal has already been reviewed', 400);
    }

    appeal.status = action === 'approve' ? 'approved' : 'denied';
    appeal.reviewedBy = req.adminUser._id;
    appeal.reviewedByName = req.adminUser.name;
    appeal.reviewedAt = new Date();
    appeal.reviewNotes = reviewNotes || '';

    await appeal.save();

    // Update action type and details for audit log
    if (req.adminActionData) {
      req.adminActionData.action = action === 'approve' ? 'appeal_approved' : 'appeal_denied';
      req.adminActionData.details = {
        action,
        userId: appeal.user,
        videoId: appeal.videoSubmission._id,
        reviewNotes,
      };
    }

    // If appeal approved, update the video submission status
    if (action === 'approve') {
      await VideoSubmission.findByIdAndUpdate(appeal.videoSubmission._id, {
        status: 'approved',
        verifiedBy: req.adminUser._id,
        verifiedByName: req.adminUser.name,
        verifiedAt: new Date(),
        rejectionReason: null,
      });
    }

    res.json({
      success: true,
      data: appeal,
    });
}));

// ============================================================================
// REPORTS MANAGEMENT
// ============================================================================

// GET /api/admin/reports - Get all reports with filtering
router.get('/reports', authenticate, requireAdmin, asyncHandler(async (req, res) => {
  const { status = 'pending', reportType = '', page = 1, limit = 20 } = req.query;
  const skip = (parseInt(page) - 1) * parseInt(limit);

  const query = {};
  if (status !== 'all') {
    query.status = status;
  }
  if (reportType) {
    query.reportType = reportType;
  }

  const reports = await Report.find(query)
    .sort({ createdAt: status === 'pending' ? 1 : -1 })
    .skip(skip)
    .limit(parseInt(limit))
    .populate('reporter', 'name username')
    .populate('videoSubmission')
    .populate('reviewedBy', 'name username');

  const total = await Report.countDocuments(query);

  res.json({
    success: true,
    data: {
      reports,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
      },
    },
  });
}));

// POST /api/admin/reports/:id/review - Review report
router.post('/reports/:id/review',
  authenticate,
  requireAdmin,
  logAdminAction('report_resolved', 'report', ':id', null),
  asyncHandler(async (req, res) => {
    const { action, reviewNotes, actionTaken } = req.body;

    if (!['resolve', 'dismiss'].includes(action)) {
      throw new AppError('Action must be resolve or dismiss', 400);
    }

    const report = await Report.findById(req.params.id);

    if (!report) {
      throw new AppError('Report not found', 404);
    }

    if (report.status !== 'pending') {
      throw new AppError('Report has already been reviewed', 400);
    }

    report.status = action === 'resolve' ? 'resolved' : 'dismissed';
    report.reviewedBy = req.adminUser._id;
    report.reviewedAt = new Date();
    report.reviewNotes = reviewNotes || '';
    report.actionTaken = actionTaken || 'no_action';

    await report.save();

    // Update action type and details for audit log
    if (req.adminActionData) {
      req.adminActionData.action = action === 'resolve' ? 'report_resolved' : 'report_dismissed';
      req.adminActionData.details = {
        action,
        reportType: report.reportType,
        actionTaken: report.actionTaken,
        reviewNotes,
      };
    }

    // If resolved and action is to reject the video
    if (action === 'resolve' && actionTaken === 'video_removed') {
      await VideoSubmission.findByIdAndUpdate(report.videoSubmission, {
        status: 'rejected',
        verifiedBy: req.adminUser._id,
        verifiedByName: req.adminUser.name,
        verifiedAt: new Date(),
        rejectionReason: 'Rejected due to report: ' + report.reportType,
      });
    }

    res.json({
      success: true,
      data: report,
    });
}));

// ============================================================================
// NOTIFICATION MANAGEMENT
// ============================================================================

// POST /api/admin/notifications/send - Send notification to user(s)
router.post('/notifications/send',
  authenticate,
  requireAdmin,
  logAdminAction('notification_sent', 'notification', null, null),
  asyncHandler(async (req, res) => {
    const { userIds, type, title, message } = req.body;

    if (!type || !title || !message) {
      throw new AppError('Type, title, and message are required', 400);
    }

    if (!Array.isArray(userIds) || userIds.length === 0) {
      throw new AppError('userIds must be a non-empty array', 400);
    }

    const notifications = userIds.map(userId => ({
      user: userId,
      type,
      title,
      message,
      read: false,
    }));

    await Notification.insertMany(notifications);

    if (req.adminActionData) {
      req.adminActionData.details = {
        recipientCount: userIds.length,
        type,
        title,
      };
    }

    res.json({
      success: true,
      message: `Notification sent to ${userIds.length} user(s)`,
      data: { recipientCount: userIds.length },
    });
}));

// POST /api/admin/notifications/broadcast - Send broadcast to all users
router.post('/notifications/broadcast',
  authenticate,
  requireSuperAdmin,
  logAdminAction('notification_sent', 'notification', null, null),
  asyncHandler(async (req, res) => {
    const { type, title, message } = req.body;

    if (!type || !title || !message) {
      throw new AppError('Type, title, and message are required', 400);
    }

    // Get all users
    const users = await User.find({}, { _id: 1 });

    const notifications = users.map(user => ({
      user: user._id,
      type,
      title,
      message,
      read: false,
    }));

    await Notification.insertMany(notifications);

    if (req.adminActionData) {
      req.adminActionData.details = {
        recipientCount: users.length,
        type,
        title,
        broadcast: true,
      };
    }

    res.json({
      success: true,
      message: `Broadcast sent to ${users.length} user(s)`,
      data: { recipientCount: users.length },
    });
}));

// ============================================================================
// AUDIT LOG
// ============================================================================

// GET /api/admin/audit-log - Get admin action audit log
router.get('/audit-log', authenticate, requireAdmin, asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 50,
    action = '',
    targetType = '',
    adminId = '',
  } = req.query;
  const skip = (parseInt(page) - 1) * parseInt(limit);

  const query = {};

  if (action) {
    query.action = action;
  }

  if (targetType) {
    query.targetType = targetType;
  }

  if (adminId) {
    query.admin = adminId;
  }

  const actions = await AdminAction.find(query)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(parseInt(limit))
    .populate('admin', 'name username');

  const total = await AdminAction.countDocuments(query);

  res.json({
    success: true,
    data: {
      actions,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
      },
    },
  });
}));

// GET /api/admin/audit-log/:targetType/:targetId - Get audit log for specific target
router.get('/audit-log/:targetType/:targetId', authenticate, requireAdmin, asyncHandler(async (req, res) => {
  const { targetType, targetId } = req.params;

  const actions = await AdminAction.find({
    targetType,
    targetId,
  })
    .sort({ createdAt: -1 })
    .limit(100)
    .populate('admin', 'name username');

  res.json({
    success: true,
    data: actions,
  });
}));

module.exports = router;
