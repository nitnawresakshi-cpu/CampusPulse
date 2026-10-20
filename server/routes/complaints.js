const multer = require("multer");
const path = require("path");
const fs = require("fs");
const express = require("express");
const mongoose = require("mongoose");
const Complaint = require("../models/Complaint");
const Notification = require("../models/Notification");
const {
  authenticateToken,
  requireRole,
} = require("../middleware/authMiddleware");

const router = express.Router();
const uploadDir = path.join(__dirname, "..", "uploads");
fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${Date.now()}-${require("crypto").randomUUID()}${ext}`);
  },
});

const uploadEvidence = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ["image/jpeg", "image/png", "image/webp"];
    if (allowed.includes(file.mimetype)) return cb(null, true);
    cb(new Error("Only JPG, PNG, and WebP images are allowed."));
  },
});

// Proposed resolution deadlines based on priority.
const deadlineHours = {
    Urgent: 4,
    High: 24,
    Medium: 72,
    Low: 168,
  };

const allowedCategories = [
  "Electricity",
  "Water Supply",
  "Cleanliness",
  "Classroom",
  "Hostel",
  "Internet",
  "Laboratory",
  "Library",
  "Washroom",
  "Other",
];

// Automatic department and default priority based on complaint category.
const categoryRouting = {
  "Electricity": { department: "Electronics", priority: "High" },
  "Water Supply": { department: "Other", priority: "High" },
  "Cleanliness": { department: "Other", priority: "Medium" },
  "Classroom": { department: "Computer Science", priority: "Medium" },
  "Hostel": { department: "Other", priority: "Medium" },
  "Internet": { department: "Information Technology", priority: "High" },
  "Laboratory": { department: "Electronics", priority: "Medium" },
  "Library": { department: "Other", priority: "Low" },
  "Washroom": { department: "Other", priority: "Medium" },
  "Other": { department: "Other", priority: "Medium" },
};
// Student: submit a complaint
router.post(
    "/",
    authenticateToken,
    requireRole("student"),
    uploadEvidence.single("evidence"),
  async (req, res) => {
    try {
      const { title, description, category, location } = req.body;

      if (
        typeof title !== "string" ||
        typeof description !== "string" ||
        typeof category !== "string" ||
        typeof location !== "string"
      ) {
        return res.status(400).json({
          message:
            "Title, description, category, and location are required.",
        });
      }

      if (
        !title.trim() ||
        title.trim().length > 120 ||
        !description.trim() ||
        description.trim().length > 3000 ||
        !location.trim() ||
        location.trim().length > 200 ||
        !allowedCategories.includes(category)
      ) {
        return res.status(400).json({
          message: "Please provide valid complaint details.",
        });
      }
      const priority = categoryRouting[category].priority;

      const dueDate = new Date(
        Date.now() + deadlineHours[priority] * 60 * 60 * 1000
      );
      const complaint = await Complaint.create({
        complaintId: `CP-${new mongoose.Types.ObjectId()
          .toString()
          .slice(-8)
          .toUpperCase()}`,
        student: req.user.id,
        title: title.trim(),
        description: description.trim(),
        category,
        location: location.trim(),
        evidence: req.file ? `/uploads/${req.file.filename}` : "",
        department: categoryRouting[category].department,
        status: "Submitted",
        priority,
        dueDate,
      });

      return res.status(201).json({
        message: "Complaint submitted successfully.",
        complaint,
      });
    } catch (error) {
      console.error("Complaint creation error:", error.message);

      return res.status(500).json({
        message: "Could not submit complaint. Please try again.",
      });
    }
  }
);

// Student: retrieve their own complaints
router.get(
  "/my",
  authenticateToken,
  requireRole("student"),
  async (req, res) => {
    try {
      const complaints = await Complaint.find({
        student: req.user.id,
      })
        .sort({ createdAt: -1 })
        .lean();

      return res.status(200).json({
        count: complaints.length,
        complaints,
      });
    } catch (error) {
      console.error("Complaint retrieval error:", error.message);

      return res.status(500).json({
        message: "Could not retrieve complaints. Please try again.",
      });
    }
  }
);

// Staff: view complaints from their department
router.get(
  "/staff",
  authenticateToken,
  requireRole("staff"),
  async (req, res) => {
    try {
      if (!req.user.department) {
        return res.status(403).json({
          message: "Your account has no department assigned.",
        });
      }

      const complaints = await Complaint.find({
        department: req.user.department,
      })
        .sort({ createdAt: -1 })
        .lean();

      return res.status(200).json({
        count: complaints.length,
        complaints,
      });
    } catch (error) {
      console.error("Staff complaint retrieval error:", error.message);

      return res.status(500).json({
        message: "Could not retrieve department complaints.",
      });
    }
  }
);

// Staff: update complaint status and resolution notes
router.patch(
  "/staff/:id",
  authenticateToken,
  requireRole("staff"),
  async (req, res) => {
    try {
      const { status, resolutionNotes } = req.body;

      const allowedStatuses = [
        "Assigned",
        "In Progress",
        "Resolved",
      ];

      if (!mongoose.isValidObjectId(req.params.id)) {
        return res.status(400).json({
          message: "Invalid complaint ID.",
        });
      }

      if (!allowedStatuses.includes(status)) {
        return res.status(400).json({
          message: "Invalid status.",
        });
      }

      if (
        resolutionNotes !== undefined &&
        (typeof resolutionNotes !== "string" ||
          resolutionNotes.length > 3000)
      ) {
        return res.status(400).json({
          message: "Resolution notes must be 3000 characters or fewer.",
        });
      }

      if (
        status === "Resolved" &&
        (typeof resolutionNotes !== "string" ||
          !resolutionNotes.trim())
      ) {
        return res.status(400).json({
          message: "Add resolution notes before resolving a complaint.",
        });
      }

      if (!req.user.department) {
        return res.status(403).json({
          message: "Your account has no department assigned.",
        });
      }

      const updates = { status };

      if (resolutionNotes !== undefined) {
        updates.resolutionNotes = resolutionNotes.trim();
      }

      updates.resolvedAt =
        status === "Resolved" ? new Date() : null;

      const complaint = await Complaint.findOneAndUpdate(
        {
          _id: req.params.id,
          department: req.user.department,
        },
        { $set: updates },
        { new: true, runValidators: true }
      );

      if (!complaint) {
        return res.status(404).json({
          message: "Complaint not found in your department.",
        });
      }
      await Notification.create({
        recipient: complaint.student,
        complaint: complaint._id,
        message: `Your complaint "${complaint.title}" status is now "${complaint.status}".`,
        type: "status_update",
      });
      return res.status(200).json({
        message: "Complaint updated successfully.",
        complaint,
      });
    } catch (error) {
      console.error("Staff complaint update error:", error.message);

      return res.status(500).json({
        message: "Could not update complaint.",
      });
    }
  }
);

/* Student: submit feedback for a resolved complaint */
router.patch(
    "/:id/feedback",
    authenticateToken,
    requireRole("student"),
    async (req, res) => {
      try {
        const { rating, comment = "" } = req.body;
  
        if (!mongoose.isValidObjectId(req.params.id)) {
          return res.status(400).json({ message: "Invalid complaint ID." });
        }
  
        if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
          return res.status(400).json({
            message: "Rating must be a whole number from 1 to 5.",
          });
        }
  
        if (typeof comment !== "string" || comment.length > 1000) {
          return res.status(400).json({
            message: "Feedback must be 1000 characters or fewer.",
          });
        }
  
        const complaint = await Complaint.findOne({
          _id: req.params.id,
          student: req.user.id,
        });
  
        if (!complaint) {
          return res.status(404).json({ message: "Complaint not found." });
        }
  
        if (complaint.status !== "Resolved") {
          return res.status(400).json({
            message: "Feedback can only be submitted for resolved complaints.",
          });
        }
  
        if (complaint.feedback?.submittedAt) {
          return res.status(409).json({
            message: "Feedback has already been submitted for this complaint.",
          });
        }
  
        complaint.feedback = {
          rating,
          comment: comment.trim(),
          submittedAt: new Date(),
        };
  
        await complaint.save();
  
        return res.status(200).json({
          message: "Feedback submitted successfully.",
          complaint,
        });
      } catch (error) {
        console.error("Feedback submission error:", error.message);
        return res.status(500).json({ message: "Could not submit feedback." });
      }
    }
  );
  
  /* Student: request reopening of a resolved complaint */
  router.patch(
    "/:id/reopen",
    authenticateToken,
    requireRole("student"),
    async (req, res) => {
      try {
        const { reason } = req.body;
  
        if (!mongoose.isValidObjectId(req.params.id)) {
          return res.status(400).json({ message: "Invalid complaint ID." });
        }
  
        if (
          typeof reason !== "string" ||
          !reason.trim() ||
          reason.trim().length > 1000
        ) {
          return res.status(400).json({
            message: "Provide a reopening reason of up to 1000 characters.",
          });
        }
  
        const complaint = await Complaint.findOne({
          _id: req.params.id,
          student: req.user.id,
        });
  
        if (!complaint) {
          return res.status(404).json({ message: "Complaint not found." });
        }
  
        if (complaint.status !== "Resolved") {
          return res.status(400).json({
            message: "Only resolved complaints can be reopened.",
          });
        }
  
        complaint.status = "Reopened";
        complaint.reopenReason = reason.trim();
        complaint.resolvedAt = null;
  
        await complaint.save();
  
        await Notification.create({
          recipient: complaint.student,
          complaint: complaint._id,
          message: `Your complaint "${complaint.title}" has been reopened.`,
          type: "status_update",
        });
  
        return res.status(200).json({
          message: "Complaint reopened successfully.",
          complaint,
        });
      } catch (error) {
        console.error("Complaint reopening error:", error.message);
        return res.status(500).json({ message: "Could not reopen complaint." });
      }
    }
  );
  
module.exports = router;
