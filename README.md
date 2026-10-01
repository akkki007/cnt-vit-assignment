# VIT ProjectHub

A modern, responsive full-stack web application for managing student projects and assignments at **Vishwakarma Institute of Technology (VIT), Pune** — [www.vit.edu](https://www.vit.edu) — across four academic categories: **SDP · EDI · DT · Course Projects**.

The official institute logo (`public/img/vit-logo.png`) is used across the UI — navbar, sidebar, auth pages, and footer.

## Features

- **Teacher**: register/login, create classrooms (auto-generated unique class code), post assignments with deadlines, upload resources, view a submission roster, grade with marks + feedback.
- **Student**: register/login, join classrooms via class code, browse assignments by category, upload submissions (multi-file), track deadlines/status, view grades and feedback.
- **Dynamic category pills** (Bootstrap 5 nav-pills + jQuery) for SDP / EDI / DT / Course Projects — each with its own staged workflow (e.g. SDP: Requirements → Design → Development → Testing).
- Bootstrap 5 tabs/pills, modals, toasts, progress/stage chips, responsive sidebar navigation, and jQuery-powered search/filter, form validation and dynamic UI updates throughout.
- JWT authentication with role-based access control (student vs teacher).
- File uploads via Multer with type + size validation, served statically.
- Realistic seeded demo data so the UI is populated out of the box.

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | HTML5, CSS3, Bootstrap 5, Bootstrap Icons, jQuery, vanilla JS |
| Backend | Node.js, Express.js |
| Database | MongoDB (Mongoose) |
| Auth | JWT (jsonwebtoken + bcryptjs) |
| File upload | Multer |
| Validation | express-validator |

## Project Structure

```
server/
  config/db.js              MongoDB connection
  models/                   User, Classroom, Assignment, Submission, Resource, Project, Notification
  middleware/                auth (JWT), role guard, multer upload + validation, centralized error handler
  controllers/                business logic per resource
  routes/                     REST route definitions
  utils/                       class-code generator, demo data seed script
  uploads/                     uploaded files (resources/, submissions/)
  server.js                    app entry point
public/
  index.html, login.html, register.html
  student-dashboard.html, teacher-dashboard.html
  classroom.html, assignment.html, submission.html
  css/style.css                design system
  js/                            api.js (fetch wrapper), common.js (shared UI), one script per page
```

## Getting Started

### Prerequisites
- Node.js 18+
- A running MongoDB instance (local install, Docker, or MongoDB Atlas)

### Setup

```bash
npm install
cp .env.example .env   # then edit MONGO_URI / JWT_SECRET if needed
npm run seed            # populates demo teachers, students, classrooms, assignments, submissions
npm run dev              # starts the server with nodemon on http://localhost:5000
```

Or with a local Docker MongoDB:

```bash
docker run -d --name vph-mongo -p 27017:27017 mongo:7
```

Then open **http://localhost:5000** in your browser.

### Demo Credentials
(password for all accounts: `password123`)

| Role | Email |
|---|---|
| Teacher | teacher@vit.edu |
| Teacher | suresh.iyer@vit.edu |
| Student | arjun.mehta2023@vit.edu |
| Student | priya.sharma2023@vit.edu |

## Demo Flow

**Teacher:** Register/Login → Create Classroom → Share Class Code → Create Assignment → Review Submissions → Grade & give feedback.

**Student:** Register/Login → Join Classroom with code → View Assignment requirements → Upload submission → Track status → View grade/feedback once graded.

## REST API Overview

| Resource | Endpoints |
|---|---|
| Auth | `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/auth/me` |
| Classrooms | `POST /api/classrooms`, `GET /api/classrooms`, `GET /api/classrooms/:id`, `POST /api/classrooms/join`, `DELETE /api/classrooms/:id/students/:studentId` |
| Assignments | `POST /api/assignments/classroom/:classroomId`, `GET /api/assignments/classroom/:classroomId`, `GET/PUT/DELETE /api/assignments/:id` |
| Submissions | `POST /api/submissions/assignment/:assignmentId`, `GET /api/submissions/assignment/:assignmentId/mine`, `GET /api/submissions/assignment/:assignmentId/roster`, `GET /api/submissions/:id`, `PUT /api/submissions/:id/grade` |
| Resources | `POST/GET /api/resources/classroom/:classroomId` |
| Projects | `POST/GET /api/projects/classroom/:classroomId`, `GET/PUT /api/projects/:id` |
| Notifications | `GET /api/notifications`, `PUT /api/notifications/:id/read`, `PUT /api/notifications/read-all` |

All routes except register/login require a `Authorization: Bearer <token>` header. Teacher-only actions (create classroom/assignment, upload resource, grade) are enforced server-side via role middleware, not just hidden in the UI.

## Notes

- Uploaded files are stored under `server/uploads/` (git-ignored) and served at `/uploads/...`.
- `npm run seed` clears and repopulates all collections — only run it in a dev/demo database.
