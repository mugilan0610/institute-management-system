import express from "express";
import { getResultsByStudent } from "../controllers/resultController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/student/:studentId", protect, getResultsByStudent);

export default router;

