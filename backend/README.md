# SHINE Notes — Backend API

Node.js and Express RESTful API powering the SHINE Notes platform, featuring MongoDB/Mongoose ORM integration, JWT authentication, and structured error handling.

## ✨ Key Features

- **Authentication:** Secure user signup, login, and JWT session handling.
- **Notes Management:** CRUD operations with full text and tag querying.
- **Trash Pipeline:** Soft-deletion pipeline with automatic 7-day expiration purging.
- **Validation & Security:** Sanitized inputs, protected middleware routes, and CORS configuration.

## 🛠️ Tech Stack

- **Runtime:** Node.js
- **Framework:** Express.js
- **Database:** MongoDB Atlas via Mongoose
- **Authentication:** JSON Web Tokens (JWT) & bcryptjs password hashing
- **Testing:** Jest + Supertest

## 🚀 Getting Started

### Installation
```bash
npm install