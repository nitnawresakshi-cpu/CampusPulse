
const express = require("express");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const Complaint = require("../models/Complaint");
const User = require("../models/User");
const {
  authenticateToken,
  requireRole,
} = require("../middleware/authMiddleware");

const router = express.Router();

router.use(authenticateToken, requireRole("admin"));

const allowedDepartments = [
  "Cyber Security",
  "Computer Science",
  "Information Technology",
  "Electronics",
  "Mechanical",
  "Civil",
  "Other",
];

// GET /api/admin/stats
router.get("/stats", async (req, res) => {
  try {
    const [
      total,
      statusCounts,
      priorityCounts,
      categoryCounts,
      overdue,
    ] = await Promise.all([
      Complaint.countDocuments(),
      Complaint.aggregate([
        { $group: { _id: "$status", count: { $sum: 1 } } },
      ]),
      Complaint.aggregate([
        { $group: { _id: "$priority", count: { $sum: 1 } } },
      ]),
      Complaint.aggregate([
        { $group: { _id: "$category", count: { $sum: 1 } } },
      ]),
      Complaint.countDocuments({
        dueDate: { $ne: null, $lt: new Date() },
        status: { $ne: "Resolved" },
      }),
    ]);

    const toCountMap = (items) =>
      Object.fromEntries(
        items.map((item) => [item._id || "Unknown", item.count])
      );

    const statuses = toCountMap(statusCounts);

    return res.status(200).json({
      total,
      overdue,
      pending: (statuses.Submitted || 0) + (statuses.Assigned || 0),
      inProgress: statuses["In Progress"] || 0,
      resolved: statuses.Resolved || 0,
      reopened: statuses.Reopened || 0,
      byStatus: statuses,
      byPriority: toCountMap(priorityCounts),
      byCategory: toCountMap(categoryCounts),
    });
  } catch (error) {
    console.error("Admin statistics error:", error.message);
    return res.status(500).json({
      message: "Could not retrieve admin statistics.",
    });
  }
});

// GET /api/admin/complaints
router.get("/complaints", async (req, res) => {
  try {
    const complaints = await Complaint.find()
      .populate("student", "name email department")
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json({
      count: complaints.length,
      complaints,
    });
  } catch (error) {
    console.error("Admin complaints error:", error.message);
    return res.status(500).json({
      message: "Could not retrieve complaints.",
    });
  }
});

// GET /api/admin/staff
// List staff accounts without returning password hashes.
router.get("/staff", async (req, res) => {
  try {
    const staff = await User.find({ role: "staff" })
      .select("name email department role createdAt")
      .sort({ name: 1 })
      .lean();

    return res.status(200).json({
      count: staff.length,
      staff,
    });
  } catch (error) {
    console.error("Admin staff list error:", error.message);
    return res.status(500).json({
      message: "Could not retrieve staff accounts.",
    });
  }
});

// POST /api/admin/staff
// Only an authenticated admin can create staff accounts.
router.post("/staff", async (req, res) => {
  try {
    const { name, email, password, department } = req.body;

    if (
      typeof name !== "string" ||
      typeof email !== "string" ||
      typeof password !== "string" ||
      typeof department !== "string"
    ) {
      return res.status(400).json({
        message: "Name, email, password, and department are required.",
      });
    }

    const normalizedName = name.trim();
    const normalizedEmail = email.trim().toLowerCase();

    if (
      !normalizedName ||
      normalizedName.length > 100 ||
      !/^\S+@\S+\.\S+$/.test(normalizedEmail)
    ) {
      return res.status(400).json({
        message: "Enter a valid staff name and email address.",
      });
    }

    if (password.length < 12 || password.length > 128) {
      return res.status(400).json({
        message: "Staff password must be between 12 and 128 characters.",
      });
    }

    if (!allowedDepartments.includes(department)) {
      return res.status(400).json({
        message: "Please select a valid department.",
      });
    }

    const existingUser = await User.findOne({
      email: normalizedEmail,
    }).lean();

    if (existingUser) {
      return res.status(409).json({
        message: "An account with this email already exists.",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const staffMember = await User.create({
      name: normalizedName,
      email: normalizedEmail,
      password: hashedPassword,
      role: "staff",
      department,
    });

    return res.status(201).json({
      message: "Staff account created successfully.",
      staff: {
        id: staffMember._id,
        name: staffMember.name,
        email: staffMember.email,
        department: staffMember.department,
        role: staffMember.role,
      },
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        message: "An account with this email already exists.",
      });
    }

    console.error("Admin staff creation error:", error.message);
    return res.status(500).json({
      message: "Could not create staff account.",
    });
  }
});

// PATCH /api/admin/staff/:id
// Update a staff member's department.
router.patch("/staff/:id", async (req, res) => {
  try {
    const { department } = req.body;

    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({
        message: "Invalid staff account ID.",
      });
    }

    if (
      typeof department !== "string" ||
      !allowedDepartments.includes(department)
    ) {
      return res.status(400).json({
        message: "Please select a valid department.",
      });
    }

    const staffMember = await User.findOneAndUpdate(
      { _id: req.params.id, role: "staff" },
      { $set: { department } },
      { new: true, runValidators: true }
    )
      .select("name email department role createdAt")
      .lean();

    if (!staffMember) {
      return res.status(404).json({
        message: "Staff account not found.",
      });
    }

    return res.status(200).json({
      message: "Staff department updated successfully.",
      staff: staffMember,
    });
  } catch (error) {
    console.error("Admin staff update error:", error.message);
    return res.status(500).json({
      message: "Could not update staff department.",
    });
  }
});

module.exports = router;
