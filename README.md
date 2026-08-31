# SHINE Notes

**Cohort 9 — MERN (NodeJS+ReactJS) assignment for Dua Imran**

SHINE Notes is a full stack notes management platform built with the MERN stack (MongoDB, Express, React, Node.js). It supports rich-text note creation, tag based filtering and search, a 7 day soft-delete trash with auto purge, JSON/Markdown/TXT import-export, and JWT based authentication.

## ✨ Features

- **Authentication:** Signup, login, logout with JWT + token versioning for real session invalidation
- **Notes:** Full CRUD, scoped per authenticated user
- **Rich-text editing:** Inline WYSIWYG note editor
- **Organization:** Tag-based and search-bar filtering
- **Trash:** 7-day soft-delete with automatic purge
- **Import/Export:** Export notes to JSON/Markdown, import from the same formats
- **Security:** Sanitized inputs, protected routes, CORS configuration, password hashing (bcryptjs)

## 🏗️ Repository Structure

```
cohort-9-mern-7066-dua/
├── backend/          # Node.js + Express REST API — see backend/README.md
├── frontend/         # React + Vite client UI — see frontend/README.md
└── sonarQube/        # SonarQube audit logs & execution screenshots
```

## 🛠️ Tech Stack

| Layer      | Stack |
|------------|-------|
| Frontend   | React (Vite), Axios |
| Backend    | Node.js, Express, Mongoose |
| Database   | MongoDB Atlas |
| Auth       | JWT + bcryptjs |
| Testing    | Jest + React Testing Library (frontend), Mocha + Chai (backend) |
| Code Quality | SonarQube |

## 🚀 Getting Started

The backend must be running before the frontend, since the client calls the API directly.

### 1. Backend
```bash
cd backend
npm install
npm start
```
See [`backend/README.md`](./backend/README.md) for environment variables and API details.

### 2. Frontend
```bash
cd frontend
npm install
npm run dev
```
Runs at `http://localhost:5173` by default. See [`frontend/README.md`](./frontend/README.md) for full details.

## ✅ Testing & Quality

- Backend: Mocha/Chai unit tests
- Frontend: Jest + React Testing Library ( coverage on export/markdown logic)
- Static analysis: SonarQube (reports in `sonarQube/`)

## 📄 Documentation

- [Backend README](./backend/README.md) — API details, tech stack, setup
- [Frontend README](./frontend/README.md) — features, project structure, setup