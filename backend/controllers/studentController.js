import bcrypt from "bcryptjs";
import pool from "../models/db.js";

const SALT_ROUNDS = Number(process.env.BCRYPT_SALT_ROUNDS || 10);

/* 🔹 Utility: Clean up course name */
function normalizeCourseName(course = "") {
  return course.trim().replace(/\s+/g, " ");
}

/* 🔹 Utility: Map database row → JSON-friendly object */
export function mapStudentRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    course_id: row.course_id,
    course_name: row.course_name || row.course,
    course: row.course_name || row.course,
    created_at: row.created_at,
  };
}

/* 🔹 Seed default course tasks if not already present */
async function seedCourseDefaults(connection, courseId, courseName) {
  const [taskCountRows] = await connection.query(
    "SELECT COUNT(*) AS count FROM tasks WHERE course_id = ?",
    [courseId]
  );
  if (taskCountRows[0]?.count > 0) return;

  const templates = [
    {
      title: `${courseName} Orientation`,
      description: "Attend the orientation session and review syllabus.",
    },
    {
      title: "Complete Module 1",
      description: "Finish module 1 and submit the practice quiz.",
    },
    {
      title: "Meet Your Mentor",
      description: "Schedule a mentor session for goal setting.",
    },
  ];

  const placeholders = templates.map(() => "(?, ?, ?)").join(", ");
  const values = templates.flatMap((task) => [
    courseId,
    task.title,
    task.description,
  ]);
  await connection.query(
    `INSERT INTO tasks (course_id, title, description) VALUES ${placeholders}`,
    values
  );
}

/* 🔹 Seed initial diagnostic test for student */
async function seedInitialResult(connection, studentId, courseName) {
  await connection.query(
    `INSERT INTO results (student_id, title, marks_obtained, total_marks, status)
     VALUES (?, ?, ?, ?, ?)`,
    [studentId, `${courseName} Diagnostic Test`, 0, 100, "Fail"]
  );
}

/* 🔹 Core function: Register a student and seed defaults */
export async function registerStudentRecord(body, { autoSeed = true } = {}) {
  const { name, email, password, course } = body;

  if (!name || !email || !password || !course) {
    const err = new Error("Name, email, password and course are required.");
    err.statusCode = 400;
    throw err;
  }

  const normalizedCourse = normalizeCourseName(course);
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    // 🧩 Check existing email
    const [existingEmailRows] = await connection.query(
      "SELECT id FROM students WHERE email = ? LIMIT 1",
      [email.trim().toLowerCase()]
    );
    if (existingEmailRows.length) {
      const err = new Error("Email is already registered.");
      err.statusCode = 409;
      throw err;
    }

    // 🧩 Ensure course exists or create one
    let courseId;
    const [existingCourseRows] = await connection.query(
      "SELECT id FROM courses WHERE name = ? LIMIT 1",
      [normalizedCourse]
    );
    if (existingCourseRows.length) {
      courseId = existingCourseRows[0].id;
    } else {
      const [courseResult] = await connection.query(
        "INSERT INTO courses (name) VALUES (?)",
        [normalizedCourse]
      );
      courseId = courseResult.insertId;
      if (autoSeed) await seedCourseDefaults(connection, courseId, normalizedCourse);
    }

    // 🧩 Hash password securely
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    // 🧩 Insert new student
    const [studentResult] = await connection.query(
      `INSERT INTO students (name, email, password_hash, course_id)
       VALUES (?, ?, ?, ?)`,
      [name.trim(), email.trim().toLowerCase(), passwordHash, courseId]
    );

    const studentId = studentResult.insertId;

    // 🧩 Add initial test record
    if (autoSeed) await seedInitialResult(connection, studentId, normalizedCourse);

    await connection.commit();

    const [studentRows] = await connection.query(
      `SELECT s.id, s.name, s.email, s.course_id, c.name AS course_name, s.created_at
       FROM students s
       LEFT JOIN courses c ON c.id = s.course_id
       WHERE s.id = ?`,
      [studentId]
    );

    return { student: mapStudentRow(studentRows[0]) };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

/* ✅ Get all students */
export const getStudents = async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      `SELECT s.id, s.name, s.email, s.created_at, c.id AS course_id, c.name AS course_name
       FROM students s
       LEFT JOIN courses c ON c.id = s.course_id
       ORDER BY s.created_at DESC`
    );

    res.json({
      success: true,
      data: rows.map(mapStudentRow),
    });
  } catch (error) {
    next(error);
  }
};

/* ✅ Register student */
export const createStudent = async (req, res, next) => {
  try {
    const { student } = await registerStudentRecord(req.body);

    // fire-and-forget registration email if SMTP configured
    import("../utils/mailer.js").then(({ sendRegistrationEmail }) => {
      if (student?.email) {
        sendRegistrationEmail({
          to: student.email,
          name: student.name,
          course: student.course || student.course_name || "",
        });
      }
    }).catch(() => {});

    res.status(201).json({
      success: true,
      message: "Student registered successfully.",
      student,
    });
  } catch (error) {
    next(error);
  }
};

export const getStudentById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const [rows] = await pool.query(
      `SELECT s.id, s.name, s.email, s.course_id, c.name AS course_name, s.created_at
       FROM students s
       LEFT JOIN courses c ON c.id = s.course_id
       WHERE s.id = ?`,
      [id],
    );
    if (!rows.length) {
      const err = new Error("Student not found.");
      err.statusCode = 404;
      throw err;
    }
    res.json({ success: true, student: mapStudentRow(rows[0]) });
  } catch (error) {
    next(error);
  }
};

export const updateStudent = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, email, course } = req.body;
    const updates = [];
    const params = [];
    if (name) { updates.push("name = ?"); params.push(name.trim()); }
    if (email) { updates.push("email = ?"); params.push(email.trim().toLowerCase()); }
    let courseId = null;
    if (course) {
      const normalisedCourse = course.trim().replace(/\s+/g, " ");
      const [cRows] = await pool.query("SELECT id FROM courses WHERE name = ? LIMIT 1", [normalisedCourse]);
      if (cRows.length) {
        courseId = cRows[0].id;
      } else {
        const [ins] = await pool.query("INSERT INTO courses (name) VALUES (?)", [normalisedCourse]);
        courseId = ins.insertId;
      }
      updates.push("course_id = ?");
      params.push(courseId);
    }
    if (!updates.length) {
      return res.json({ success: true, message: "No changes." });
    }
    params.push(id);
    await pool.query(`UPDATE students SET ${updates.join(", ")} WHERE id = ?`, params);
    res.json({ success: true, message: "Student updated." });
  } catch (error) {
    next(error);
  }
};

export const deleteStudent = async (req, res, next) => {
  try {
    const { id } = req.params;
    await pool.query("DELETE FROM students WHERE id = ?", [id]);
    res.json({ success: true, message: "Student deleted." });
  } catch (error) {
    next(error);
  }
};

/* ✅ Login student */
export const loginStudent = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res
        .status(400)
        .json({ success: false, message: "Email and password are required" });
    }

    const [rows] = await pool.query(
      "SELECT * FROM students WHERE email = ? LIMIT 1",
      [email.trim().toLowerCase()]
    );

    if (rows.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: "No account found with this email" });
    }

    const student = rows[0];
    const validPassword = await bcrypt.compare(password, student.password_hash);

    if (!validPassword) {
      return res
        .status(401)
        .json({ success: false, message: "Invalid password" });
    }

    res.json({
      success: true,
      message: "Login successful",
      student: {
        id: student.id,
        name: student.name,
        email: student.email,
        course_id: student.course_id,
      },
    });
  } catch (error) {
    next(error);
  }
};
