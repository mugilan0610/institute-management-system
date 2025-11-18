import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import pool from "../models/db.js";
import { mapStudentRow, registerStudentRecord } from "./studentController.js";

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret";
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "12h";

function generateToken(student) {
  return jwt.sign(
    {
      id: student.id,
      email: student.email,
      course_id: student.course_id,
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN },
  );
}

export const register = async (req, res, next) => {
  try {
    const { student } = await registerStudentRecord(req.body);
    const token = generateToken(student);

    res.status(201).json({
      success: true,
      message: "Registration successful.",
      token,
      student,
    });
  } catch (error) {
    next(error);
  }
};

export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      const err = new Error("Email and password are required.");
      err.statusCode = 400;
      throw err;
    }

    const [rows] = await pool.query(
      `SELECT s.id, s.name, s.email, s.password_hash, s.course_id, c.name AS course_name
       FROM students s
       LEFT JOIN courses c ON c.id = s.course_id
       WHERE s.email = ?
       LIMIT 1`,
      [email.trim().toLowerCase()],
    );

    if (!rows.length) {
      const err = new Error("Invalid credentials.");
      err.statusCode = 401;
      throw err;
    }

    const studentRow = rows[0];
    const passwordMatch = await bcrypt.compare(password, studentRow.password_hash);

    if (!passwordMatch) {
      const err = new Error("Invalid credentials.");
      err.statusCode = 401;
      throw err;
    }

    const [attResult] = await pool.query(
      "INSERT INTO attendance (student_id, login_time) VALUES (?, NOW())",
      [studentRow.id],
    );

    const token = generateToken(studentRow);
    const student = mapStudentRow(studentRow);

    res.json({
      success: true,
      message: "Login successful.",
      token,
      student,
      attendance_id: attResult.insertId,
    });
  } catch (error) {
    next(error);
  }
};
