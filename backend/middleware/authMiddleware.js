import jwt from "jsonwebtoken";
import pool from "../models/db.js";
import { mapStudentRow } from "../controllers/studentController.js";

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret";

export const protect = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization || "";
    const [, token] = authHeader.split(" ");

    if (!token) {
      const err = new Error("Not authorised. Token required.");
      err.statusCode = 401;
      throw err;
    }

    let payload;
    try {
      payload = jwt.verify(token, JWT_SECRET);
    } catch (error) {
      const err = new Error("Token invalid or expired. Please login again.");
      err.statusCode = 401;
      throw err;
    }

    const [studentRows] = await pool.query(
      `SELECT s.id, s.name, s.email, s.course_id, c.name AS course_name, s.created_at
       FROM students s
       LEFT JOIN courses c ON c.id = s.course_id
       WHERE s.id = ?
       LIMIT 1`,
      [payload.id],
    );

    const student = studentRows[0];

    if (!student) {
      const err = new Error("User no longer exists.");
      err.statusCode = 401;
      throw err;
    }

    req.user = mapStudentRow(student);
    next();
  } catch (error) {
    next(error);
  }
};
