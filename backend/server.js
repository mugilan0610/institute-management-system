import fs from "fs";
import dotenv from "dotenv";
import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";

import authRoute from "./route/authRoute.js";
import studentRoute from "./route/studentRoute.js";
import courseRoute from "./route/courseRoute.js";
import attendanceRoute from "./route/attendanceRoute.js";
import taskRoute from "./route/taskRoute.js";
import resultRoute from "./route/resultRoute.js";
import { initDb } from "./models/db.js";
import { errorHandler, notFound } from "./middleware/errorMiddleware.js";

// 🧩 Load myenv.txt manually since .env is disabled
if (fs.existsSync("./myenv.txt")) {
  const envData = fs.readFileSync("./myenv.txt");
  const parsed = dotenv.parse(envData);
  process.env = { ...process.env, ...parsed };
  console.log("✅ myenv.txt loaded successfully");
} else {
  console.warn("⚠️ myenv.txt not found!");
}

// Initialize dotenv fallback (optional)
dotenv.config();

const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 🔗 API Routes
app.use("/api/auth", authRoute);
app.use("/api/students", studentRoute);
app.use("/api/courses", courseRoute);
app.use("/api/tasks", taskRoute);
app.use("/api/results", resultRoute);
app.use("/api/attendance", attendanceRoute);

// 🧱 Static frontend
app.use(express.static(path.join(__dirname, "../frontend")));

app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "../frontend/index.html"));
});

// ⚠️ Error handling
app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

async function start() {
  try {
    await initDb();
    app.listen(PORT, () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
}

start();
