
const path = require("path");
const dns = require("dns");

// Fix Node.js DNS resolution for MongoDB Atlas
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");

require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Authentication routes
app.use("/api/auth", require("./routes/auth"));

// Complaint routes
app.use("/api/complaints", require("./routes/complaints"));
app.use("/api/admin", require("./routes/admin"));

// Notification routes
app.use("/api/notifications", require("./routes/notifications"));

// Uploaded evidence and images
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Home route
app.get("/", (req, res) => {
  res.json({
    message: "CampusPulse backend is running!",
  });
});

// Health check
app.get("/api/health", (req, res) => {
  res.json({
    status: "OK",
    application: "CampusPulse",
    database:
      mongoose.connection.readyState === 1
        ? "connected"
        : "disconnected",
  });
});

// Start server
async function startServer() {
  try {
    // Check MongoDB configuration
    if (!process.env.MONGODB_URI) {
      throw new Error(
        "MONGODB_URI is missing from server/.env. Check the variable name."
      );
    }

    // Connect to MongoDB Atlas
    await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 15000,
    });

    console.log("MongoDB connected successfully!");

    // Start Express only after database connection succeeds
    app.listen(PORT, () => {
      console.log(
        `CampusPulse server running at http://localhost:${PORT}`
      );
    });
  } catch (error) {
    console.error("CampusPulse startup failed:", error.message);
    process.exit(1);
  }
}

startServer();
