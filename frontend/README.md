# SHINE Notes — Frontend

React + Vite frontend for the Notes App — a full-featured notes manager with authentication, tagging, rich-text editing, trash/restore, and export/import.

## Features
- Email/password authentication (signup, signin, logout)
- Notes CRUD with rich-text (WYSIWYG) editing
- Tag-based and search bar organization and filtering
- 7-day soft-delete trash with auto purge
- Export notes to JSON, and import from the same formats
- Responsive layout with dashboard, editor modal, and export/delete modals

## Tech Stack
- React (Vite)
- Axios for API calls
- Jest + React Testing Library for unit testing

## Getting Started

### Install dependencies
```bash
npm install
```

### Environment Variables
Create a `.env` file in the `frontend/` root with:
```
VITE_API_BASE_URL=http://localhost:5000/api
```
Adjust the port/path to match your backend's actual base URL.

### Run the dev server
```bash
npm run dev
```
Runs at `http://localhost:5173` by default.

### Run tests
```bash
npm test
```

### Run tests with coverage
```bash
npx jest --coverage
```

## Project Structure
```
src/
├── api/         # Axios API clients (auth, notes)
├── components/  # Reusable UI components (NoteCard, NoteEditor, modals, etc.)
├── pages/       # Top-level pages (AuthPage)
├── styles/      # Per-component CSS
├── utils/       # Client-side storage/helper utilities (tags, trash, import/export)
└── test/        # Jest + RTL test suites, mirroring src/ structure
```

## Environment
This app expects the backend API to be running (see [`../backend/README.md`](../backend/README.md)). Configure the API base URL via environment variables as shown above.

## 🔗 Related

See the [main README](../README.md) for full-project setup.