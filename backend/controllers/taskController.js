import pool from "../models/db.js";

export const getTasksByCourse = async (req, res, next) => {
  try {
    const { courseId } = req.params;
    const studentId = req.user?.id;

    if (!courseId) {
      const err = new Error("courseId is required.");
      err.statusCode = 400;
      throw err;
    }

    const [tasks] = await pool.query(
      `SELECT id, course_id, title, description, created_at
       FROM tasks
       WHERE course_id = ?
       ORDER BY created_at ASC`,
      [courseId],
    );

    if (!studentId) {
      return res.json(tasks);
    }

    const [completedRows] = await pool.query(
      "SELECT task_id FROM student_tasks WHERE student_id = ?",
      [studentId],
    );

    const completedSet = new Set(completedRows.map((row) => row.task_id));
    const response = tasks.map((task) => ({
      ...task,
      completed: completedSet.has(task.id),
    }));

    res.json(response);
  } catch (error) {
    next(error);
  }
};

export const completeTask = async (req, res, next) => {
  try {
    const { student_id, task_id } = req.body;
    const userId = req.user?.id;

    const finalStudentId = userId || student_id;

    if (!finalStudentId || !task_id) {
      const err = new Error("student_id and task_id are required.");
      err.statusCode = 400;
      throw err;
    }

    const [taskRows] = await pool.query(
      "SELECT id FROM tasks WHERE id = ? LIMIT 1",
      [task_id],
    );

    if (!taskRows.length) {
      const err = new Error("Task not found.");
      err.statusCode = 404;
      throw err;
    }

    await pool.query(
      `INSERT INTO student_tasks (student_id, task_id, completed_at)
       VALUES (?, ?, NOW())
       ON DUPLICATE KEY UPDATE completed_at = NOW()`,
      [finalStudentId, task_id],
    );

    res.json({
      success: true,
      message: "Task marked as completed.",
    });
  } catch (error) {
    next(error);
  }
};

