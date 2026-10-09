# Secure Session Auth Test

<small>_README.md generated using an AI agent_</small>

This is a small authentication learning project. It demonstrates user
registration, password hashing, login sessions, authentication checks, and
logout using a FastAPI backend and a plain HTML/CSS/JavaScript frontend.

> **Warning:** This repository is for authentication learning and experimentation
> only. It is **not production-ready** and must not be used to protect real
> users, applications, or sensitive data without a thorough security review and
> significant additional hardening.

## Project structure

```text
.
├── backend/
│   ├── main.py          # FastAPI application and authentication routes
│   ├── schemas.py       # Request and response validation models
│   ├── utils.py         # Password and session authentication helpers
│   ├── db/
│   │   ├── __init__.py  # SQLAlchemy models and SQLite setup
│   │   └── utils.py     # Database-related helpers
│   └── auth.db          # Local SQLite database, created by the backend
├── frontend/
│   ├── index.html       # Frontend page
│   ├── app.js           # Forms, API calls, and authentication UI
│   └── style.css        # Frontend styles
└── README.md
```

## Requirements

- Python 3.10 or newer
- A modern web browser

## Setup

From the repository root, create and activate a virtual environment:

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
```

On Windows PowerShell, activate it with:

```powershell
.\.venv\Scripts\Activate.ps1
```

Install the backend dependencies:

```bash
python -m pip install fastapi "uvicorn[standard]" sqlalchemy argon2-cffi
```

## Run the backend

From the `backend/` directory, with the virtual environment activated:

```bash
uvicorn main:app --reload
```

The API will be available at:

```text
http://127.0.0.1:8000
```

Useful endpoints include:

- `GET /health` - health check
- `POST /auth/register` - register a user
- `POST /auth/login` - create a session
- `GET /me` - get the current authenticated user
- `POST /auth/logout` - delete the current session

The SQLite database is created automatically as `backend/auth.db` when the
backend starts.

## Run the frontend

Open a second terminal and serve the `frontend/` directory over HTTP:

```bash
cd frontend
python3 -m http.server 5500 --bind 127.0.0.1
```

Then open this URL in your browser:

```text
http://127.0.0.1:5500
```

The frontend is configured in `frontend/index.html` to call the local backend
at `http://127.0.0.1:8000`. If the backend is hosted elsewhere, update the
`auth-api-url` meta tag in that file.

## Learning notes

- Passwords are hashed before they are stored.
- Session tokens are stored as hashes in the database.
- The session cookie is configured as `HttpOnly` and uses `SameSite=Lax`.
- The local development configuration uses HTTP and `secure=False`; production
  deployments require HTTPS, secure cookie settings, stricter CORS, secret and
  configuration management, migrations, monitoring, and comprehensive testing.
