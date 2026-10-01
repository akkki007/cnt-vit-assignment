const Notification = require('../models/Notification');
const { asyncHandler } = require('../middleware/errorHandler');

const listMine = asyncHandler(async (req, res) => {
  const notifications = await Notification.find({ user: req.user._id })
    .sort({ createdAt: -1 })
    .limit(30);
  const unreadCount = await Notification.countDocuments({ user: req.user._id, read: false });
  res.json({ notifications, unreadCount });
});

const markRead = asyncHandler(async (req, res) => {
  const notification = await Notification.findOneAndUpdate(
    { _id: req.params.id, user: req.user._id },
    { read: true },
    { new: true }
  );
  if (!notification) return res.status(404).json({ message: 'Notification not found.' });
  res.json({ notification });
});

const markAllRead = asyncHandler(async (req, res) => {
  await Notification.updateMany({ user: req.user._id, read: false }, { read: true });
  res.json({ message: 'All notifications marked as read.' });
});

module.exports = { listMine, markRead, markAllRead };
