# SHINE Notes — Backend API

Node.js and Express RESTful API powering the SHINE Notes platform, featuring MongoDB/Mongoose ODM integration, JWT authentication, and structured error handling.

## ✨ Key Features

- **Authentication:** Secure user signup, login, and JWT session handling with token versioning for real logout invalidation.
- **Notes Management:** CRUD operations, scoped per authenticated user.
- **Trash Pipeline:** Soft-deletion pipeline with automatic 7-day expiration purging.
- **Validation & Security:** Sanitized inputs, protected middleware routes, and CORS configuration.
- **Logging & Error Handling:** Structured request logging (Pino) and centralized error handling (Mongoose validation/cast errors → 400, duplicate keys → 409, others masked as 500).

## 🛠️ Tech Stack

- **Runtime:** Node.js
- **Framework:** Express.js
- **Database:** MongoDB Atlas via Mongoose
- **Authentication:** JSON Web Tokens (JWT) & bcryptjs password hashing
- **Logging:** Pino / pino-http
- **Testing:** Mocha + Chai

## 🚀 Getting Started

### Prerequisites
- Node.js
- A MongoDB Atlas connection string

### Installation
```bash
npm install
```

### Environment Variables
Create a `.env` file in the `backend/` root with:
```
PORT=5000
MONGO_URI=<your MongoDB Atlas connection string>
JWT_SECRET=<your JWT signing secret>
```

### Run the server
```bash
npm start
```

### Run tests
```bash
npm test
```

## 📚 API Endpoints

### Auth
| Method | Endpoint | Description | Auth Required |
|--------|----------|--------------|----------------|
| POST | `/api/auth/signup` | Register a new user | No |
| POST | `/api/auth/login` | Log in, returns JWT | No |
| POST | `/api/auth/logout` | Invalidate current session (bumps token version) | Yes |

### Notes
| Method | Endpoint | Description | Auth Required |
|--------|----------|--------------|----------------|
| GET | `/api/notes` | Get all notes for the authenticated user | Yes |
| POST | `/api/notes` | Create a new note | Yes |
| GET | `/api/notes/:id` | Get a single note | Yes |
| PUT | `/api/notes/:id` | Update a note | Yes |
| DELETE | `/api/notes/:id` | Soft-delete a note (moves to trash) | Yes |

> Adjust the table above to match your actual route names/paths — fill in any endpoints (e.g. trash restore/purge) that aren't listed here yet.

## 📁 Project Structure
```
backend/
├── controllers/   # Route handler logic
├── models/        # Mongoose schemas (User, Note)
├── routes/        # Express route definitions
├── middleware/     # Auth protection, error handler
└── index.js       # App entry point
```

## 🔗 Related

See the [main README](../README.md) for full-project setup, and [`frontend/README.md`](../frontend/README.md) for the client.