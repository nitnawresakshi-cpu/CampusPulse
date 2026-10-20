
const express = require("express");
const bcrypt = require("bcryptjs");
const User = require("../models/User");

const router = express.Router();

// Register a new student
router.post("/register", async (req, res) => {
  try {
    const { name, email, password, department } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        message: "Name, email, and password are required.",
      });
    }

    if (typeof password !== "string" || password.length < 8) {
      return res.status(400).json({
        message: "Password must be at least 8 characters long.",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const existingUser = await User.findOne({
      email: normalizedEmail,
    });

    if (existingUser) {
      return res.status(409).json({
        message: "An account with this email already exists.",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const user = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      password: hashedPassword,
      department: department || "",
      role: "student",
    });

    return res.status(201).json({
      message: "Registration successful.",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        department: user.department,
      },
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        message: "An account with this email already exists.",
      });
    }

    console.error("Registration error:", error.message);

    return res.status(500).json({
      message: "Registration failed. Please try again.",
    });
  }
});

router.post("/login", async (req, res) => {
    try {
      const { email, password } = req.body;
  
      if (
        typeof email !== "string" ||
        typeof password !== "string" ||
        !email.trim() ||
        !password
      ) {
        return res.status(400).json({
          message: "Email and password are required.",
        });
      }
  
      const user = await User.findOne({
        email: email.trim().toLowerCase(),
      });
  
      if (!user) {
        return res.status(401).json({
          message: "Invalid email or password.",
        });
      }
  
      const passwordMatches = await bcrypt.compare(
        password,
        user.password
      );
  
      if (!passwordMatches) {
        return res.status(401).json({
          message: "Invalid email or password.",
        });
      }
  
      if (!process.env.JWT_SECRET) {
        throw new Error("JWT_SECRET is missing from .env");
      }
  
      const token = require("jsonwebtoken").sign(
        {
          id: user._id.toString(),
          role: user.role,
        },
        process.env.JWT_SECRET,
        { expiresIn: "2h" }
      );
  
      return res.status(200).json({
        message: "Login successful.",
        token,
        user: {
          id: user._id.toString(),
          name: user.name,
          email: user.email,
          role: user.role,
          department: user.department,
        },
      });
    } catch (error) {
      console.error("Login error:", error.message);
  
      return res.status(500).json({
        message: "Login failed. Please try again.",
      });
    }
  });

module.exports = router;
  