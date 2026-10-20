
const mongoose = require("mongoose");

const complaintSchema = new mongoose.Schema(
  {
    complaintId: {
      type: String,
      unique: true,
      index: true,
    },

    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },

    description: {
      type: String,
      required: true,
      trim: true,
      maxlength: 3000,
    },

    category: {
      type: String,
      required: true,
      enum: [
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
      ],
    },

    location: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },

    
    evidence: {
        type: String,
        default: "",
        maxlength: 500,
      },
  

    priority: {
      type: String,
      enum: ["Low", "Medium", "High", "Urgent"],
      default: "Medium",
    },

    dueDate: {
        type: Date,
        default: null,
        index: true,
      },

    department: {
      type: String,
      trim: true,
      default: "",
    },

    status: {
      type: String,
      enum: [
        "Submitted",
        "Assigned",
        "In Progress",
        "Resolved",
        "Reopened",
      ],
      default: "Submitted",
      index: true,
    },

    resolutionNotes: {
      type: String,
      trim: true,
      maxlength: 3000,
      default: "",
    },

    resolvedAt: {
      type: Date,
      default: null,
    },
    feedback: {
        rating: {
          type: Number,
          min: 1,
          max: 5,
          default: null,
        },
        comment: {
          type: String,
          trim: true,
          maxlength: 1000,
          default: "",
        },
        submittedAt: {
          type: Date,
          default: null,
        },
      },
      
      reopenReason: {
        type: String,
        trim: true,
        maxlength: 1000,
        default: "",
      },
  },
  {
    timestamps: true,
  }
);

complaintSchema.index({ student: 1, createdAt: -1 });

module.exports = mongoose.model("Complaint", complaintSchema);
