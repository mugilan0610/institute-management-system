import mysql from "mysql2/promise";
import fs from "fs";
import dotenv from "dotenv";

// ✅ Load environment variables manually from myenv.txt (since .env is disabled)
if (fs.existsSync("./myenv.txt")) {
  dotenv.config({ path: "./myenv.txt" });
  console.log("✅ myenv.txt loaded successfully");
} else {
  console.warn("⚠️ myenv.txt not found — using fallback defaults");
}

// ✅ Destructure environment variables
const {
  DB_HOST = "localhost",
  DB_USER = "root",
  DB_PASSWORD = "",
  DB_NAME = "institute_db",
  DB_PORT = 3306,
  DB_CONNECTION_LIMIT = 10,
} = process.env;

// ✅ Create MySQL connection pool
const pool = mysql.createPool({
  host: DB_HOST,
  user: DB_USER,
  password: DB_PASSWORD,
  database: DB_NAME,
  port: Number(DB_PORT),
  waitForConnections: true,
  connectionLimit: Number(DB_CONNECTION_LIMIT),
  namedPlaceholders: true,
});

// ✅ Ensure database exists (auto-create if missing)
async function ensureDatabaseExists() {
  const adminPool = mysql.createPool({
    host: DB_HOST,
    user: DB_USER,
    password: DB_PASSWORD,
    port: Number(DB_PORT),
    waitForConnections: true,
    connectionLimit: Number(DB_CONNECTION_LIMIT),
  });

  let adminConnection;
  try {
    adminConnection = await adminPool.getConnection();
    await adminConnection.query(`CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\``);
    console.log(`✅ Database "${DB_NAME}" ensured`);
  } finally {
    if (adminConnection) adminConnection.release();
    await adminPool.end();
  }
}

// ✅ Initialize tables
export async function initDb() {
  let connection;
  try {
    try {
      connection = await pool.getConnection();
    } catch (error) {
      if (error.code === "ER_BAD_DB_ERROR") {
        console.warn(`⚠️ Database "${DB_NAME}" not found. Creating...`);
        await ensureDatabaseExists();
        connection = await pool.getConnection();
      } else {
        throw error;
      }
    }

    console.log("✅ MySQL connection pool initialized");

    // --- Create tables ---
    await connection.query(`
      CREATE TABLE IF NOT EXISTS courses (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(150) NOT NULL UNIQUE,
        description TEXT,
        duration_weeks INT DEFAULT 0,
        status ENUM('Ongoing','Completed','Upcoming') DEFAULT 'Ongoing',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS students (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(150) NOT NULL,
        email VARCHAR(180) NOT NULL UNIQUE,
        password_hash VARCHAR(255) NOT NULL,
        course_id INT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE SET NULL
      ) ENGINE=InnoDB
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS tasks (
        id INT AUTO_INCREMENT PRIMARY KEY,
        course_id INT NOT NULL,
        title VARCHAR(150) NOT NULL,
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
      ) ENGINE=InnoDB
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS student_tasks (
        id INT AUTO_INCREMENT PRIMARY KEY,
        student_id INT NOT NULL,
        task_id INT NOT NULL,
        completed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY uniq_student_task (student_id, task_id),
        FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
        FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
      ) ENGINE=InnoDB
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS results (
        id INT AUTO_INCREMENT PRIMARY KEY,
        student_id INT NOT NULL,
        title VARCHAR(150) NOT NULL,
        marks_obtained INT NOT NULL DEFAULT 0,
        total_marks INT NOT NULL DEFAULT 100,
        status ENUM('Pass','Fail') NOT NULL DEFAULT 'Pass',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
      ) ENGINE=InnoDB
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS attendance (
        id INT AUTO_INCREMENT PRIMARY KEY,
        student_id INT NOT NULL,
        login_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        logout_time DATETIME NULL,
        duration_minutes INT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
      ) ENGINE=InnoDB
    `);

    console.log("✅ All database tables ensured successfully");

    // --- Lightweight migrations for legacy installs (without IF NOT EXISTS) ---
    async function getColumnInfo(dbConn, tableName, columnName) {
      const [rows] = await dbConn.query(
        `SELECT COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE, EXTRA
         FROM INFORMATION_SCHEMA.COLUMNS
         WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
        [DB_NAME, tableName, columnName]
      );
      return rows[0] || null;
    }

    async function ensureColumn(dbConn, tableName, columnName, addSql, modifySql) {
      const info = await getColumnInfo(dbConn, tableName, columnName);
      if (!info) {
        await dbConn.query(`ALTER TABLE \`${tableName}\` ADD COLUMN ${addSql}`);
        console.log(`✅ Added column ${tableName}.${columnName}`);
        return;
      }

      if ((info.EXTRA || "").includes("GENERATED")) {
        await dbConn.query(`ALTER TABLE \`${tableName}\` MODIFY COLUMN ${modifySql}`);
        console.log(`✅ Converted generated column ${tableName}.${columnName}`);
      }
    }

    await ensureColumn(connection, "results", "title", "title VARCHAR(150) NOT NULL DEFAULT 'Assessment'", "title VARCHAR(150) NOT NULL DEFAULT 'Assessment'");
    await ensureColumn(connection, "results", "marks_obtained", "marks_obtained INT NOT NULL DEFAULT 0", "marks_obtained INT NOT NULL DEFAULT 0");
    await ensureColumn(connection, "results", "total_marks", "total_marks INT NOT NULL DEFAULT 100", "total_marks INT NOT NULL DEFAULT 100");
    await ensureColumn(connection, "results", "status", "status ENUM('Pass','Fail') NOT NULL DEFAULT 'Fail'", "status ENUM('Pass','Fail') NOT NULL DEFAULT 'Fail'");

    await ensureColumn(connection, "tasks", "title", "title VARCHAR(150) NOT NULL DEFAULT 'Task'", "title VARCHAR(150) NOT NULL DEFAULT 'Task'");
    await ensureColumn(connection, "tasks", "description", "description TEXT NULL", "description TEXT NULL");

  } catch (err) {
    console.error("❌ Database initialization failed:", err.message);
    throw err;
  } finally {
    if (connection) connection.release();
  }
}

// ✅ Simple query helper
export async function query(sql, params = []) {
  const [rows] = await pool.query(sql, params);
  return rows;
}

export default pool;
