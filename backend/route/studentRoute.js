import express from "express";
import {
  getStudents,
  createStudent,
  getStudentById,
  updateStudent,
  deleteStudent
} from "../controllers/studentController.js";
import { login as loginStudent } from "../controllers/authController.js";

const router = express.Router();

// 📌 Get all students
router.get("/", getStudents);

// 📌 Get single student by ID
router.get("/:id", getStudentById);

// 📌 Register new student
router.post("/register", createStudent);

// 📌 Login student
router.post("/login", loginStudent);

// 📌 Update student details
router.put("/:id", updateStudent);

// 📌 Delete a student
router.delete("/:id", deleteStudent);

export default router;
