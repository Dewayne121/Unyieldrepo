const express = require('express');
const Notification = require('../models/Notification');
const { authenticate } = require('../middleware/auth');
const { asyncHandler, AppError } = require('../middleware/errorHandler');

const router = express.Router();

// GET /api/notifications - Get user's notifications
router.get('/', authenticate, asyncHandler(async (req, res) => {
  const { limit = 50, unreadOnly = 'false' } = req.query;

  const query = { user: req.user.id };
  if (unreadOnly === 'true') {
    query.read = false;
  }

  const notifications = await Notification.find(query)
    .sort({ createdAt: -1 })
    .limit(parseInt(limit));

  const unreadCount = await Notification.countDocuments({
    user: req.user.id,
    read: false,
  });

  res.json({
    success: true,
    data: {
      notifications,
      unreadCount,
    },
  });
}));

// PATCH /api/notifications/:id/read - Mark notification as read
router.patch('/:id/read', authenticate, asyncHandler(async (req, res) => {
  const notification = await Notification.findById(req.params.id);

  if (!notification) {
    throw new AppError('Notification not found', 404);
  }

  if (notification.user.toString() !== req.user.id) {
    throw new AppError('Not authorized', 403);
  }

  notification.read = true;
  notification.readAt = new Date();
  await notification.save();

  res.json({
    success: true,
    data: notification,
  });
}));

// POST /api/notifications/mark-all-read - Mark all notifications as read
router.post('/mark-all-read', authenticate, asyncHandler(async (req, res) => {
  const result = await Notification.updateMany(
    { user: req.user.id, read: false },
    { read: true, readAt: new Date() }
  );

  res.json({
    success: true,
    message: `Marked ${result.modifiedCount} notifications as read`,
    data: { markedCount: result.modifiedCount },
  });
}));

// DELETE /api/notifications/:id - Delete a notification
router.delete('/:id', authenticate, asyncHandler(async (req, res) => {
  const notification = await Notification.findById(req.params.id);

  if (!notification) {
    throw new AppError('Notification not found', 404);
  }

  if (notification.user.toString() !== req.user.id) {
    throw new AppError('Not authorized', 403);
  }

  await Notification.findByIdAndDelete(req.params.id);

  res.json({
    success: true,
    message: 'Notification deleted',
  });
}));

// DELETE /api/notifications - Delete all notifications for user
router.delete('/', authenticate, asyncHandler(async (req, res) => {
  const result = await Notification.deleteMany({ user: req.user.id });

  res.json({
    success: true,
    message: `Deleted ${result.deletedCount} notifications`,
    data: { deletedCount: result.deletedCount },
  });
}));

module.exports = router;
