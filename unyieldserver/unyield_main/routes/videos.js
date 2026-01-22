const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const VideoSubmission = require('../models/VideoSubmission');
const User = require('../models/User');
const Report = require('../models/Report');
const Appeal = require('../models/Appeal');
const { authenticate } = require('../middleware/auth');
const { asyncHandler, AppError } = require('../middleware/errorHandler');
const { uploadVideo, deleteVideo } = require('../services/objectStorage');

const router = express.Router();

// Ensure uploads directory exists (for backward compatibility)
const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer for disk storage (to avoid OOM on Render free tier)
const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, '/tmp'); // Use /tmp for Render's ephemeral storage
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    },
  }),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB max file size
  },
  fileFilter: (req, file, cb) => {
    // Accept video files only
    const allowedMimes = [
      'video/mp4',
      'video/mpeg',
      'video/quicktime',
      'video/webm',
      'video/x-msvideo',
      'video/x-ms-wmv',
    ];
    const allowedExtensions = [
      '.mp4',
      '.m4v',
      '.mov',
      '.webm',
      '.mpeg',
      '.mpg',
      '.avi',
      '.wmv',
    ];
    const extension = path.extname(file.originalname || '').toLowerCase();
    const hasAllowedExtension = allowedExtensions.includes(extension);
    const hasAllowedMime = allowedMimes.includes(file.mimetype) || (file.mimetype || '').startsWith('video/');

    if (hasAllowedMime || hasAllowedExtension) {
      cb(null, true);
    } else {
      req.fileValidationError = 'Invalid file type. Only video files are allowed.';
      cb(null, false);
    }
  }
});

// Helper to check if user can verify videos (has admin or community_support accolade)
const canVerify = (user) => {
  return user.accolades && (
    user.accolades.includes('admin') ||
    user.accolades.includes('community_support')
  );
};

// POST /api/videos/upload - Upload video file to Oracle Cloud Object Storage
router.post('/upload', authenticate, upload.single('video'), asyncHandler(async (req, res) => {
  console.log('================== [UPLOAD ROUTE] Upload request received ==================');
  console.log('[UPLOAD ROUTE] User:', req.user?.id);
  console.log('[UPLOAD ROUTE] File present:', !!req.file);
  console.log('[UPLOAD ROUTE] Content-Type:', req.get('content-type'));

  if (!req.file) {
    console.error('[UPLOAD ROUTE] No file in request');
    if (req.fileValidationError) {
      throw new AppError(req.fileValidationError, 400);
    }
    throw new AppError('No video file uploaded', 400);
  }

  console.log('[UPLOAD ROUTE] File details:', {
    originalname: req.file.originalname,
    mimetype: req.file.mimetype,
    size: req.file.size,
    path: req.file.path
  });

  try {
    console.log('[UPLOAD ROUTE] Reading file from disk...');
    // Read file from disk (diskStorage saves to /tmp)
    const fs = require('fs');
    const fileBuffer = fs.readFileSync(req.file.path);
    console.log('[UPLOAD ROUTE] File read from disk, size:', fileBuffer.length);

    console.log('[UPLOAD ROUTE] Calling uploadVideo service...');
    // Upload to Oracle Cloud Object Storage
    const uploadResult = await uploadVideo(
      fileBuffer,
      req.file.originalname,
      req.file.mimetype
    );

    // Clean up temp file
    fs.unlinkSync(req.file.path);
    console.log('[UPLOAD ROUTE] Temp file cleaned up');

    console.log('[UPLOAD ROUTE] Upload service returned raw result:', {
      hasObjectName: !!uploadResult?.objectName,
      hasPublicUrl: !!uploadResult?.publicUrl,
      objectName: uploadResult?.objectName,
      publicUrl: uploadResult?.publicUrl?.substring(0, 50) + '...'
    });

    const { objectName, publicUrl } = uploadResult;

    console.log('[UPLOAD ROUTE] Destructured values:', {
      objectName,
      publicUrl: publicUrl?.substring(0, 50) + '...'
    });

    const responseData = {
      success: true,
      data: {
        videoUrl: publicUrl,
        objectName: objectName,
        size: req.file.size,
        mimetype: req.file.mimetype,
      },
    };

    console.log('[UPLOAD ROUTE] Sending response:', {
      success: responseData.success,
      hasVideoUrl: !!responseData.data.videoUrl,
      hasObjectName: !!responseData.data.objectName
    });

    console.log('[UPLOAD ROUTE] About to send 201 response');
    res.status(201).json(responseData);
    console.log('[UPLOAD ROUTE] Response sent successfully');

  } catch (error) {
    console.error('[UPLOAD ROUTE] Upload error:', {
      message: error.message,
      stack: error.stack?.substring(0, 200)
    });
    throw new AppError(`Video upload failed: ${error.message}`, 500);
  }
}));

// POST /api/videos - Submit a video for verification
router.post('/', authenticate, asyncHandler(async (req, res) => {
  console.log('[SUBMIT ROUTE] Video submission request received');
  const { exercise, reps, weight, duration, videoUrl, thumbnailUrl } = req.body;

  console.log('[SUBMIT ROUTE] Request body:', {
    exercise,
    reps,
    weight,
    duration,
    videoUrl: videoUrl?.substring(0, 50) + '...',
    hasThumbnail: !!thumbnailUrl
  });

  if (!exercise || !reps) {
    console.error('[SUBMIT ROUTE] Missing exercise or reps');
    throw new AppError('Exercise and reps are required', 400);
  }

  if (!videoUrl) {
    console.error('[SUBMIT ROUTE] Missing videoUrl');
    throw new AppError('Video URL is required. Upload a video first using /api/videos/upload', 400);
  }

  console.log('[SUBMIT ROUTE] Fetching user for admin check...');
  // Check if user is admin - auto-verify their submissions
  const user = await User.findById(req.user.id);
  const isAdmin = user.accolades && user.accolades.includes('admin');
  console.log('[SUBMIT ROUTE] User admin status:', isAdmin);

  console.log('[SUBMIT ROUTE] Creating VideoSubmission document...');
  const submission = new VideoSubmission({
    user: req.user.id,
    exercise,
    reps,
    weight: weight || 0,
    duration,
    videoUrl,
    thumbnailUrl,
    status: isAdmin ? 'approved' : 'pending',
    // If admin, mark as auto-verified by UNYIELD (not admin's personal name)
    ...(isAdmin && {
      verifiedBy: null, // No specific verifier for auto-approval
      verifiedByName: 'UNYIELD',
      verifiedAt: new Date(),
    }),
  });

  console.log('[SUBMIT ROUTE] Saving submission to database...');
  await submission.save();
  console.log('[SUBMIT ROUTE] Submission saved successfully:', submission._id);

  const responseData = {
    success: true,
    data: submission,
    autoVerified: isAdmin,
  };

  console.log('[SUBMIT ROUTE] Sending response:', {
    success: true,
    submissionId: submission._id,
    status: submission.status
  });

  res.status(201).json(responseData);
  console.log('[SUBMIT ROUTE] Response sent successfully');
}));

// GET /api/videos - Get user's video submissions
router.get('/', authenticate, asyncHandler(async (req, res) => {
  const { status } = req.query;

  const query = { user: req.user.id };
  if (status) {
    query.status = status;
  }

  const submissions = await VideoSubmission.find(query)
    .sort({ createdAt: -1 })
    .populate('verifiedBy', 'name username');

  res.json({
    success: true,
    data: submissions,
  });
}));

// GET /api/videos/queue - Get verification queue (for verifiers only)
router.get('/queue', authenticate, asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id);

  if (!canVerify(user)) {
    throw new AppError('You do not have permission to verify videos', 403);
  }

  const submissions = await VideoSubmission.find({ status: 'pending' })
    .sort({ createdAt: 1 }) // Oldest first
    .limit(50)
    .populate('user', 'name username profileImage');

  res.json({
    success: true,
    data: submissions,
  });
}));

// GET /api/videos/appeals/queue - Get appeals queue (for verifiers only) - MUST BE BEFORE /:id
router.get('/appeals/queue', authenticate, asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id);

  if (!canVerify(user)) {
    throw new AppError('You do not have permission to review appeals', 403);
  }

  const appeals = await Appeal.find({ status: 'pending' })
    .sort({ createdAt: 1 })
    .limit(50)
    .populate('user', 'name username profileImage')
    .populate('videoSubmission');

  res.json({
    success: true,
    data: appeals,
  });
}));

// GET /api/videos/reports/queue - Get reports queue (for verifiers only) - MUST BE BEFORE /:id
router.get('/reports/queue', authenticate, asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id);

  if (!canVerify(user)) {
    throw new AppError('You do not have permission to review reports', 403);
  }

  const reports = await Report.find({ status: 'pending' })
    .sort({ createdAt: 1 })
    .limit(50)
    .populate('reporter', 'name username')
    .populate('videoSubmission');

  res.json({
    success: true,
    data: reports,
  });
}));

// POST /api/videos/:id/verify - Verify (approve/reject) a video submission
router.post('/:id/verify', authenticate, asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id);

  if (!canVerify(user)) {
    throw new AppError('You do not have permission to verify videos', 403);
  }

  const { action, rejectionReason } = req.body;

  if (!['approve', 'reject'].includes(action)) {
    throw new AppError('Action must be approve or reject', 400);
  }

  const submission = await VideoSubmission.findById(req.params.id);

  if (!submission) {
    throw new AppError('Video submission not found', 404);
  }

  if (submission.status !== 'pending') {
    throw new AppError('Video has already been verified', 400);
  }

  // Cannot verify your own submission
  if (submission.user.toString() === req.user.id) {
    throw new AppError('You cannot verify your own submission', 400);
  }

  submission.status = action === 'approve' ? 'approved' : 'rejected';
  submission.verifiedBy = req.user.id;
  submission.verifiedByName = user.name;
  submission.verifiedAt = new Date();

  if (action === 'reject') {
    submission.rejectionReason = rejectionReason || 'No reason provided';
  }

  await submission.save();

  res.json({
    success: true,
    data: submission,
  });
}));

// GET /api/videos/:id - Get a specific video submission
router.get('/:id', authenticate, asyncHandler(async (req, res) => {
  const submission = await VideoSubmission.findById(req.params.id)
    .populate('user', 'name username profileImage')
    .populate('verifiedBy', 'name username');

  if (!submission) {
    throw new AppError('Video submission not found', 404);
  }

  res.json({
    success: true,
    data: submission,
  });
}));

// DELETE /api/videos/:id - Delete a video submission (owner only)
router.delete('/:id', authenticate, asyncHandler(async (req, res) => {
  const submission = await VideoSubmission.findById(req.params.id);

  if (!submission) {
    throw new AppError('Video submission not found', 404);
  }

  // Must be the owner of the submission to delete it
  if (submission.user.toString() !== req.user.id) {
    throw new AppError('You can only delete your own video submissions', 403);
  }

  // Delete from Object Storage (handles both OCI and local URLs)
  if (submission.videoUrl) {
    await deleteVideo(submission.videoUrl);
  }

  // Delete any associated reports
  await Report.deleteMany({ videoSubmission: req.params.id });

  // Delete any associated appeals
  await Appeal.deleteMany({ videoSubmission: req.params.id });

  // Delete the submission
  await VideoSubmission.findByIdAndDelete(req.params.id);

  res.json({
    success: true,
    message: 'Video deleted successfully',
  });
}));

// POST /api/videos/:id/report - Report a suspicious video
router.post('/:id/report', authenticate, asyncHandler(async (req, res) => {
  const { reportType, reason } = req.body;

  if (!reportType || !reason) {
    throw new AppError('Report type and reason are required', 400);
  }

  const validTypes = ['suspicious_lift', 'fake_video', 'inappropriate', 'spam', 'other'];
  if (!validTypes.includes(reportType)) {
    throw new AppError(`Invalid report type. Must be one of: ${validTypes.join(', ')}`, 400);
  }

  const submission = await VideoSubmission.findById(req.params.id);

  if (!submission) {
    throw new AppError('Video submission not found', 404);
  }

  // Cannot report your own submission
  if (submission.user.toString() === req.user.id) {
    throw new AppError('You cannot report your own submission', 400);
  }

  // Check if user already reported this video
  const existingReport = await Report.findOne({
    reporter: req.user.id,
    videoSubmission: req.params.id,
  });

  if (existingReport) {
    throw new AppError('You have already reported this video', 400);
  }

  const report = new Report({
    reporter: req.user.id,
    videoSubmission: req.params.id,
    reportType,
    reason,
    status: 'pending',
  });

  await report.save();

  res.status(201).json({
    success: true,
    message: 'Report submitted successfully',
    data: { id: report._id },
  });
}));

// POST /api/videos/:id/appeal - Appeal a rejected video
router.post('/:id/appeal', authenticate, asyncHandler(async (req, res) => {
  const { reason } = req.body;

  if (!reason) {
    throw new AppError('Appeal reason is required', 400);
  }

  const submission = await VideoSubmission.findById(req.params.id);

  if (!submission) {
    throw new AppError('Video submission not found', 404);
  }

  // Must be the owner of the submission
  if (submission.user.toString() !== req.user.id) {
    throw new AppError('You can only appeal your own submissions', 403);
  }

  // Must be rejected to appeal
  if (submission.status !== 'rejected') {
    throw new AppError('You can only appeal rejected submissions', 400);
  }

  // Check if already appealed
  const existingAppeal = await Appeal.findOne({
    videoSubmission: req.params.id,
  });

  if (existingAppeal) {
    throw new AppError('You have already appealed this submission', 400);
  }

  const appeal = new Appeal({
    user: req.user.id,
    videoSubmission: req.params.id,
    reason,
    status: 'pending',
  });

  await appeal.save();

  res.status(201).json({
    success: true,
    message: 'Appeal submitted successfully',
    data: { id: appeal._id },
  });
}));

// POST /api/videos/appeals/:id/review - Review an appeal (for verifiers only)
router.post('/appeals/:id/review', authenticate, asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id);

  if (!canVerify(user)) {
    throw new AppError('You do not have permission to review appeals', 403);
  }

  const { action, reviewNotes } = req.body;

  if (!['approve', 'deny'].includes(action)) {
    throw new AppError('Action must be approve or deny', 400);
  }

  const appeal = await Appeal.findById(req.params.id);

  if (!appeal) {
    throw new AppError('Appeal not found', 404);
  }

  if (appeal.status !== 'pending') {
    throw new AppError('Appeal has already been reviewed', 400);
  }

  appeal.status = action === 'approve' ? 'approved' : 'denied';
  appeal.reviewedBy = req.user.id;
  appeal.reviewedByName = user.name;
  appeal.reviewedAt = new Date();
  appeal.reviewNotes = reviewNotes || '';

  await appeal.save();

  // If appeal approved, update the video submission status
  if (action === 'approve') {
    await VideoSubmission.findByIdAndUpdate(appeal.videoSubmission, {
      status: 'approved',
      verifiedBy: req.user.id,
      verifiedByName: user.name,
      verifiedAt: new Date(),
      rejectionReason: null,
    });
  }

  res.json({
    success: true,
    data: appeal,
  });
}));

// POST /api/videos/reports/:id/review - Review a report (for verifiers only)
router.post('/reports/:id/review', authenticate, asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id);

  if (!canVerify(user)) {
    throw new AppError('You do not have permission to review reports', 403);
  }

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
  report.reviewedBy = req.user.id;
  report.reviewedAt = new Date();
  report.reviewNotes = reviewNotes || '';
  report.actionTaken = actionTaken || 'no_action';

  await report.save();

  // If resolved and action is to reject the video
  if (action === 'resolve' && actionTaken === 'video_removed') {
    await VideoSubmission.findByIdAndUpdate(report.videoSubmission, {
      status: 'rejected',
      verifiedBy: req.user.id,
      verifiedByName: user.name,
      verifiedAt: new Date(),
      rejectionReason: 'Rejected due to report: ' + report.reportType,
    });
  }

  res.json({
    success: true,
    data: report,
  });
}));

// POST /api/videos/blur - Blur faces in a video using Python microservice
router.post('/blur', authenticate, asyncHandler(async (req, res) => {
  console.log('[BLUR] Blur request received');

  const { videoUrl } = req.body;

  if (!videoUrl) {
    console.error('[BLUR] Missing videoUrl');
    throw new AppError('videoUrl is required', 400);
  }

  console.log('[BLUR] Processing video:', videoUrl.substring(0, 50) + '...');

  try {
    // Get the Python service URL from environment or use localhost
    const blurServiceUrl = process.env.BLUR_SERVICE_URL || 'http://localhost:5001';

    console.log('[BLUR] Calling Python microservice at:', blurServiceUrl);

    // Call the Python microservice
    const axios = require('axios');
    const response = await axios.post(`${blurServiceUrl}/blur`, {
      videoUrl: videoUrl
    }, {
      timeout: 300000, // 5 minute timeout for video processing
      headers: {
        'Content-Type': 'application/json'
      }
    });

    console.log('[BLUR] Python service response:', response.data);

    if (!response.data.success) {
      throw new AppError(response.data.error || 'Failed to blur video', 500);
    }

    // Read the processed video file
    const fs = require('fs');
    const outputPath = response.data.outputPath;

    if (!fs.existsSync(outputPath)) {
      throw new AppError('Blurred video file not found', 500);
    }

    // Upload the blurred video to Oracle Cloud Object Storage
    console.log('[BLUR] Uploading blurred video to storage...');
    const fileBuffer = fs.readFileSync(outputPath);
    const uploadResult = await uploadVideo(
      fileBuffer,
      `blurred_${Date.now()}.mp4`,
      'video/mp4'
    );

    // Clean up the temp file
    try {
      fs.unlinkSync(outputPath);
    } catch (err) {
      console.warn('[BLUR] Could not delete temp file:', err.message);
    }

    console.log('[BLUR] Blurred video uploaded:', uploadResult.publicUrl);

    res.json({
      success: true,
      data: {
        blurredVideoUrl: uploadResult.publicUrl,
        objectName: uploadResult.objectName,
        facesFound: response.data.facesFound,
        originalVideoUrl: videoUrl
      },
      message: `Blurred ${response.data.facesFound} faces in video`
    });

  } catch (error) {
    console.error('[BLUR] Error:', error.message);

    if (error.code === 'ECONNREFUSED') {
      throw new AppError('Face blur service is not available. Please try again later.', 503);
    }

    throw new AppError(`Failed to blur video: ${error.message}`, 500);
  }
}));

module.exports = router;
