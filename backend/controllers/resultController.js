import pool from "../models/db.js";

export const getResultsByStudent = async (req, res, next) => {
  try {
    const { studentId } = req.params;

    if (!studentId) {
      const err = new Error("Student ID is required.");
      err.statusCode = 400;
      throw err;
    }

    const [rows] = await pool.query(
      `SELECT id, title, marks_obtained, total_marks, status, created_at
       FROM results
       WHERE student_id = ?
       ORDER BY created_at DESC`,
      [studentId],
    );

    res.json(rows);
  } catch (error) {
    next(error);
  }
};

