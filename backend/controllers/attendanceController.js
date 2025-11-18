import pool from "../models/db.js";

export const getAttendanceByStudent = async (req, res, next) => {
  try {
    const { studentId } = req.params;

    if (!studentId) {
      const err = new Error("Student ID is required.");
      err.statusCode = 400;
      throw err;
    }

    const [rows] = await pool.query(
      `SELECT id, student_id, login_time, logout_time, duration_minutes
       FROM attendance
       WHERE student_id = ?
       ORDER BY login_time DESC
       LIMIT 30`,
      [studentId],
    );

    res.json(rows);
  } catch (error) {
    next(error);
  }
};

export const startAttendance = async (req, res, next) => {
  try {
    const { student_id } = req.body;

    if (!student_id) {
      const err = new Error("student_id is required.");
      err.statusCode = 400;
      throw err;
    }

    const [result] = await pool.query(
      "INSERT INTO attendance (student_id, login_time) VALUES (?, NOW())",
      [student_id],
    );

    res.status(201).json({
      success: true,
      attendance_id: result.insertId,
    });
  } catch (error) {
    next(error);
  }
};

export const logoutAttendance = async (req, res, next) => {
  try {
    const { attendance_id } = req.body;

    if (!attendance_id) {
      const err = new Error("attendance_id is required.");
      err.statusCode = 400;
      throw err;
    }

    const [rows] = await pool.query(
      "SELECT id, login_time, logout_time FROM attendance WHERE id = ? LIMIT 1",
      [attendance_id],
    );

    if (!rows.length) {
      const err = new Error("Attendance record not found.");
      err.statusCode = 404;
      throw err;
    }

    if (rows[0].logout_time) {
      return res.json({
        success: true,
        message: "Attendance already logged out.",
      });
    }

    await pool.query(
      `UPDATE attendance
       SET logout_time = NOW(),
           duration_minutes = TIMESTAMPDIFF(MINUTE, login_time, NOW())
       WHERE id = ?`,
      [attendance_id],
    );

    res.json({
      success: true,
      message: "Logout time recorded.",
    });
  } catch (error) {
    next(error);
  }
};
