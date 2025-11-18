import pool from "../models/db.js";

export const getCourses = async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      `SELECT id, name, description, created_at
       FROM courses
       ORDER BY created_at DESC`,
    );

    res.json({
      success: true,
      data: rows,
    });
  } catch (error) {
    next(error);
  }
};

export const getCourseEligibility = async (req, res, next) => {
  try {
    const { courseId, studentId } = req.params;

    if (!courseId || !studentId) {
      const err = new Error("Course ID and student ID are required.");
      err.statusCode = 400;
      throw err;
    }

    const [taskCountRows] = await pool.query(
      "SELECT COUNT(*) AS totalTasks FROM tasks WHERE course_id = ?",
      [courseId],
    );

    const [completedCountRows] = await pool.query(
      `SELECT COUNT(*) AS completedTasks
       FROM student_tasks st
       INNER JOIN tasks t ON t.id = st.task_id
       WHERE st.student_id = ? AND t.course_id = ?`,
      [studentId, courseId],
    );

    const totalTasks = Number(taskCountRows[0]?.totalTasks || 0);
    const completedTasks = Number(completedCountRows[0]?.completedTasks || 0);
    const completionRate = totalTasks === 0 ? 0 : completedTasks / totalTasks;
    const eligible = totalTasks > 0 && completionRate >= 0.7;

    res.json({
      success: true,
      eligible,
      completedTasks,
      totalTasks,
      completionRate,
    });
  } catch (error) {
    next(error);
  }
};
