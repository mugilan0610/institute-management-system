# Institute App Backend

## Environment

Create a `.env` file in this directory with the following variables:

```
PORT=5000
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=secret
DB_NAME=institute_app
DB_CONNECTION_LIMIT=10
JWT_SECRET=super-secret-key
JWT_EXPIRES_IN=12h
BCRYPT_SALT_ROUNDS=10
```

Adjust values to match your local MySQL instance. The server will create the database if it does not exist and initialise tables on start.

## Scripts

- `npm run dev` – start with nodemon
- `npm start` – start with Node

## API Overview

- `POST /api/auth/register` – register and receive JWT token
- `POST /api/auth/login` – login, returns token and attendance session id
- `GET /api/auth/me` – current user profile (requires `Authorization: Bearer <token>`)
- `POST /api/students/register` – register without auto login (returns success + student data)
- `GET /api/tasks/course/:courseId` – course tasks list with completion flags
- `POST /api/tasks/complete` – mark a task as complete
- `GET /api/courses/:courseId/eligible/:studentId` – exam eligibility summary
- `GET /api/results/student/:studentId` – results history
- `GET /api/attendance/student/:studentId` – attendance history
- `POST /api/attendance/logout` – end an attendance session
- `POST /api/attendance/start` – manually create an attendance session

All endpoints except `register` routes require a valid JWT token.

