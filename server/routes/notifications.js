const express = require("express");
const Notification = require("../models/Notification");
const {
  authenticateToken,
  requireRole,
} = require("../middleware/authMiddleware");

const router = express.Router();

// Student: retrieve their own notifications
router.get(
  "/",
  authenticateToken,
  requireRole("student"),
  async (req, res) => {
    try {
      const notifications = await Notification.find({
        recipient: req.user.id,
      })
        .sort({ createdAt: -1 })
        .populate("complaint", "complaintId title status")
        .lean();

      return res.status(200).json({
        count: notifications.length,
        unreadCount: notifications.filter((item) => !item.read).length,
        notifications,
      });
    } catch (error) {
      console.error("Notification retrieval error:", error.message);
      return res.status(500).json({
        message: "Could not retrieve notifications.",
      });
    }
  }
);

// Student: mark one of their notifications as read
router.patch(
  "/:id/read",
  authenticateToken,
  requireRole("student"),
  async (req, res) => {
    try {
      const notification = await Notification.findOneAndUpdate(
        {
          _id: req.params.id,
          recipient: req.user.id,
        },
        { $set: { read: true } },
        { new: true }
      );

      if (!notification) {
        return res.status(404).json({
          message: "Notification not found.",
        });
      }

      return res.status(200).json({
        message: "Notification marked as read.",
        notification,
      });
    } catch (error) {
      console.error("Mark notification read error:", error.message);
      return res.status(500).json({
        message: "Could not update notification.",
      });
    }
  }
);

module.exports = router;