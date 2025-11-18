import express from "express";
import { getCourses, getCourseEligibility } from "../controllers/courseController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/", protect, getCourses);
router.get("/:courseId/eligible/:studentId", protect, getCourseEligibility);

export default router;
