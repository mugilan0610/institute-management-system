import express from "express";
import {
  getAttendanceByStudent,
  startAttendance,
  logoutAttendance,
} from "../controllers/attendanceController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/student/:studentId", protect, getAttendanceByStudent);
router.post("/start", protect, startAttendance);
router.post("/logout", protect, logoutAttendance);

export default router;
