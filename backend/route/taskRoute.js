import express from "express";
import { completeTask, getTasksByCourse } from "../controllers/taskController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/course/:courseId", protect, getTasksByCourse);
router.post("/complete", protect, completeTask);

export default router;

