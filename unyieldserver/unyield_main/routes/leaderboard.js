const express = require('express');
const User = require('../models/User');
const { optionalAuth } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');

const router = express.Router();

// GET /api/leaderboard - Get leaderboard
// Supports types: 'total', 'weekly', 'monthly'
// Monthly uses totalPoints for current month competition
router.get('/', optionalAuth, asyncHandler(async (req, res) => {
  const { region = 'Global', type = 'total', limit = 50, offset = 0 } = req.query;

  const query = region !== 'Global' ? { region } : {};
  // For monthly competition, we use totalPoints (in future, could add monthlyPoints field)
  const sortField = type === 'weekly' ? 'weeklyPoints' : 'totalPoints';

  const users = await User.find(query)
    .select('username name profileImage region totalPoints weeklyPoints streak accolades')
    .sort({ [sortField]: -1 })
    .skip(parseInt(offset))
    .limit(parseInt(limit));

  const total = await User.countDocuments(query);

  // Add ranks
  const leaderboard = users.map((user, index) => ({
    id: user._id,
    username: user.username,
    name: user.name,
    profileImage: user.profileImage,
    region: user.region,
    totalPoints: user.totalPoints,
    weeklyPoints: user.weeklyPoints,
    streak: user.streak,
    accolades: user.accolades || [],
    rank: parseInt(offset) + index + 1,
    points: type === 'weekly' ? user.weeklyPoints : user.totalPoints,
  }));

  // Find current user's position
  let currentUserRank = null;
  if (req.user) {
    const currentUser = await User.findById(req.user.id);
    if (currentUser) {
      const userPoints = currentUser[sortField] || 0;
      const userPosition = await User.countDocuments({
        ...query,
        [sortField]: { $gt: userPoints },
      });

      currentUserRank = {
        id: currentUser._id,
        username: currentUser.username,
        name: currentUser.name,
        profileImage: currentUser.profileImage,
        region: currentUser.region,
        totalPoints: currentUser.totalPoints,
        weeklyPoints: currentUser.weeklyPoints,
        streak: currentUser.streak,
        accolades: currentUser.accolades || [],
        rank: userPosition + 1,
        points: type === 'weekly' ? currentUser.weeklyPoints : currentUser.totalPoints,
      };
    }
  }

  res.json({
    success: true,
    data: {
      leaderboard,
      total,
      currentUser: currentUserRank,
      limit: parseInt(limit),
      offset: parseInt(offset),
    },
  });
}));

// GET /api/leaderboard/top - Get top users
router.get('/top', asyncHandler(async (req, res) => {
  const { count = 10, region = 'Global' } = req.query;

  const query = region !== 'Global' ? { region } : {};

  const users = await User.find(query)
    .select('name region totalPoints streak accolades profileImage')
    .sort({ totalPoints: -1 })
    .limit(parseInt(count));

  const topUsers = users.map((user, index) => ({
    id: user._id,
    name: user.name,
    profileImage: user.profileImage,
    region: user.region,
    totalPoints: user.totalPoints,
    streak: user.streak,
    accolades: user.accolades || [],
    rank: index + 1,
    points: user.totalPoints,
  }));

  res.json({
    success: true,
    data: topUsers,
  });
}));

// GET /api/leaderboard/weekly - Get weekly leaderboard
router.get('/weekly', optionalAuth, asyncHandler(async (req, res) => {
  const { region = 'Global', limit = 50 } = req.query;

  const query = region !== 'Global' ? { region } : {};

  const users = await User.find(query)
    .select('name region weeklyPoints totalPoints profileImage accolades')
    .sort({ weeklyPoints: -1 })
    .limit(parseInt(limit));

  const rankedList = users.map((user, index) => ({
    id: user._id,
    name: user.name,
    profileImage: user.profileImage,
    region: user.region,
    weeklyPoints: user.weeklyPoints,
    totalPoints: user.totalPoints,
    accolades: user.accolades || [],
    rank: index + 1,
    points: user.weeklyPoints,
  }));

  res.json({
    success: true,
    data: rankedList,
  });
}));

// GET /api/leaderboard/monthly - Get monthly competition leaderboard (top 3)
// This is specifically for the Monthly Drop feature
router.get('/monthly', optionalAuth, asyncHandler(async (req, res) => {
  const { region = 'Global' } = req.query;

  const query = region !== 'Global' ? { region } : {};

  // Get top 3 users for monthly podium
  const users = await User.find(query)
    .select('username name profileImage region totalPoints weeklyPoints streak accolades')
    .sort({ totalPoints: -1 })
    .limit(3);

  const monthlyPodium = users.map((user, index) => ({
    id: user._id,
    username: user.username,
    name: user.name,
    profileImage: user.profileImage,
    region: user.region,
    totalPoints: user.totalPoints,
    weeklyPoints: user.weeklyPoints,
    streak: user.streak,
    accolades: user.accolades || [],
    rank: index + 1,
    points: user.totalPoints,
  }));

  // Also include current user's rank if not in top 3
  let currentUserRank = null;
  if (req.user) {
    const currentUser = await User.findById(req.user.id);
    if (currentUser) {
      const userPosition = await User.countDocuments({
        ...query,
        totalPoints: { $gt: currentUser.totalPoints },
      });

      currentUserRank = {
        id: currentUser._id,
        username: currentUser.username,
        name: currentUser.name,
        profileImage: currentUser.profileImage,
        region: currentUser.region,
        totalPoints: currentUser.totalPoints,
        weeklyPoints: currentUser.weeklyPoints,
        streak: currentUser.streak,
        accolades: currentUser.accolades || [],
        rank: userPosition + 1,
        points: currentUser.totalPoints,
      };
    }
  }

  res.json({
    success: true,
    data: {
      leaderboard: monthlyPodium,
      currentUser: currentUserRank,
    },
  });
}));

// GET /api/leaderboard/around-me - Get users around current user
router.get('/around-me', optionalAuth, asyncHandler(async (req, res) => {
  if (!req.user) {
    return res.json({
      success: true,
      data: [],
    });
  }

  const { region = 'Global', range = 5 } = req.query;

  const currentUser = await User.findById(req.user.id);
  if (!currentUser) {
    return res.json({
      success: true,
      data: [],
    });
  }

  const query = region !== 'Global' ? { region } : {};

  // Get users above current user
  const usersAbove = await User.find({
    ...query,
    totalPoints: { $gt: currentUser.totalPoints },
  })
    .select('name region totalPoints weeklyPoints profileImage')
    .sort({ totalPoints: 1 })
    .limit(parseInt(range));

  // Get users below current user
  const usersBelow = await User.find({
    ...query,
    _id: { $ne: currentUser._id },
    totalPoints: { $lte: currentUser.totalPoints },
  })
    .select('name region totalPoints weeklyPoints profileImage')
    .sort({ totalPoints: -1 })
    .limit(parseInt(range));

  // Combine and sort
  const allUsers = [...usersAbove.reverse(), currentUser, ...usersBelow];

  // Calculate ranks
  const userPosition = await User.countDocuments({
    ...query,
    totalPoints: { $gt: currentUser.totalPoints },
  });

  const aroundMe = allUsers.map((user, index) => ({
    id: user._id,
    name: user.name,
    profileImage: user.profileImage,
    region: user.region,
    totalPoints: user.totalPoints,
    weeklyPoints: user.weeklyPoints,
    rank: userPosition - usersAbove.length + index + 1,
    isCurrentUser: user._id.toString() === currentUser._id.toString(),
  }));

  res.json({
    success: true,
    data: aroundMe,
  });
}));

module.exports = router;
