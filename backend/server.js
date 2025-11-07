import studentRoute from "./route/studentRoute.js";
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import db from "./models/db.js";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// Default route
app.get("/", (req, res) => {
  res.send("🎓 Institute App Backend is Running!");
});

// Test database connection
app.get("/testdb", (req, res) => {
  db.query("SELECT 1 + 1 AS result", (err, results) => {
    if (err) {
      console.error("❌ Database test failed:", err);
      res.status(500).json({ error: "Database connection failed" });
    } else {
      console.log("✅ Database test passed!");
      res.json({ success: "Database connection successful", data: results });
    }
  });
});

// Start server
const PORT = process.env.PORT || 5000;
app.use("/api/students", studentRoute);

app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});
