
import express from "express";
import db from "../models/db.js";

const router = express.Router();

// 🧑‍🎓 Register a new student
router.post("/register", async (req, res) => {
  try {
    const { name, email, password, course } = req.body;

    if (!name || !email || !password || !course) {
      return res.status(400).json({ error: "All fields are required" });
    }

    const query = "INSERT INTO students (name, email, password, course) VALUES (?, ?, ?, ?)";
    db.query(query, [name, email, password, course], (err, result) => {
      if (err) {
        console.error("❌ Database Error:", err);
        return res.status(500).json({ error: "Database error" });
      }
      res.status(201).json({ success: true, message: "Student registered successfully" });
    });
  } catch (error) {
    console.error("⚠️ Server Error:", error);
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
