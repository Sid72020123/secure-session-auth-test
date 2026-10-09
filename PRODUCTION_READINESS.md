# Production Readiness Guide

This document describes the changes required before adapting this learning
project for a real application. The examples are starting points, not a
substitute for a security review, threat model, penetration test, or
provider-specific deployment review.

The current repository is intentionally a local learning project. Do not
deploy it as-is.

## 1. Use environment-based configuration

Do not hardcode database URLs, origins, cookie settings, or other deployment
configuration in source code.

```bash
# .env.example
DATABASE_URL=mysql+pymysql://app_user:change-me@db.example.internal/app_db
FRONTEND_ORIGINS=https://app.example.com
SESSION_COOKIE_NAME=session
SESSION_TTL_SECONDS=604800
COOKIE_SECURE=true
CSRF_SECRET=replace-with-a-random-secret
ENVIRONMENT=production
```

Load and validate configuration at startup:

```python
# backend/config.py
from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str
    frontend_origins: str
    session_cookie_name: str = "session"
    session_ttl_seconds: int = 7 * 24 * 60 * 60
    cookie_secure: bool = True
    csrf_secret: str
    environment: str = "production"

    @property
    def allowed_origins(self) -> list[str]:
        return [origin.strip() for origin in self.frontend_origins.split(",") if origin.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
```

Fail startup when production configuration is unsafe:

```python
settings = get_settings()

if settings.environment == "production" and not settings.cookie_secure:
    raise RuntimeError("Production session cookies must use Secure=True")
```

Never commit the real `.env` file or database credentials.

## 2. Use migrations and a production database

MySQL is suitable, but changing the database driver does not make the
authentication design secure by itself.

Use a migration tool such as Alembic. Do not call
`Base.metadata.create_all()` during application import in production.

```python
# backend/db/__init__.py
from sqlalchemy import create_engine

from config import get_settings

engine = create_engine(
    get_settings().database_url,
    pool_pre_ping=True,
    pool_recycle=1800,
)
```

Create and apply migrations during deployment:

```bash
alembic revision --autogenerate -m "create authentication tables"
alembic upgrade head
```

Use a dedicated database user with only the permissions required by the
application. Configure backups, restore testing, encryption at rest, network
restrictions, connection limits, and monitoring.

Add database-level protections for important invariants:

```python
class UserSession(Base):
    __tablename__ = "sessions"

    # Keep the existing primary key and foreign key fields.
    token_hash: Mapped[bytes] = mapped_column(
        LargeBinary(32),
        nullable=False,
        unique=True,
    )
    expires_at: Mapped[int] = mapped_column(Integer, nullable=False, index=True)
```

Use UTC timestamps consistently. Prefer a database or application migration
for schema changes instead of editing a live production database manually.

## 3. Configure secure session cookies

For an HTTPS production deployment, the cookie should be inaccessible to
JavaScript and should only be sent over HTTPS:

```python
response.set_cookie(
    key=settings.session_cookie_name,
    value=token,
    httponly=True,
    secure=settings.cookie_secure,
    samesite="lax",
    max_age=settings.session_ttl_seconds,
    path="/",
)
```

Use `samesite="strict"` when the product flow permits it. If a cross-site
authentication flow requires `SameSite=None`, HTTPS and a deliberate CSRF
design are mandatory.

Delete the cookie using the same important attributes:

```python
response.delete_cookie(
    key=settings.session_cookie_name,
    path="/",
)
```

Rotate or revoke the session after login and after sensitive account changes.
Do not put the raw session token in URLs, logs, analytics events, or error
messages.

## 4. Add CSRF protection for cookie-authenticated requests

Because browsers automatically send cookies, protect every state-changing
request. A synchronizer token or signed double-submit token can be used.

A simple signed token pattern is:

```python
# Illustrative example; use a maintained CSRF package where possible.
import secrets
from itsdangerous import BadSignature, URLSafeTimedSerializer

csrf_serializer = URLSafeTimedSerializer(settings.csrf_secret)


def create_csrf_token() -> str:
    return csrf_serializer.dumps(secrets.token_urlsafe(32))


def validate_csrf_token(token: str) -> bool:
    try:
        csrf_serializer.loads(token, max_age=3600)
        return True
    except BadSignature:
        return False
```

Expose a CSRF token through a dedicated endpoint or a non-`HttpOnly` CSRF
cookie, then send it in a header:

```js
await fetch(`${API_URL}/auth/logout`, {
    method: "POST",
    credentials: "include",
    headers: {
        "X-CSRF-Token": csrfToken,
    },
});
```

Validate the token server-side and consider validating the `Origin` header
against the production allowlist. Do not use CORS as a replacement for CSRF
protection.

## 5. Restrict CORS and trusted hosts

Do not use wildcard origins with credentials:

```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type", "X-CSRF-Token"],
)
```

Also configure trusted hosts and serve the application behind HTTPS:

```python
from starlette.middleware.trustedhost import TrustedHostMiddleware

app.add_middleware(
    TrustedHostMiddleware,
    allowed_hosts=["app.example.com", "api.example.com"],
)
```

Only include hosts that the deployment actually uses.

## 6. Add rate limiting and authentication defenses

Protect registration, login, password reset, and verification endpoints with
rate limits. Apply limits by IP and by account identifier, and use a
distributed store such as Redis when running multiple application instances.

```python
# Illustrative endpoint shape; use a maintained rate-limit library.
@app.post("/auth/login")
@limiter.limit("5/minute", per_method=True)
def login(request: Request, data: LoginRequest, response: Response):
    ...
```

Also add:

- generic login failure messages,
- progressive delays or temporary throttling,
- alerts for credential-stuffing patterns,
- account and IP abuse monitoring,
- a policy for breached and weak passwords.

Do not reveal whether a username exists during registration or recovery unless
the product explicitly accepts that account-enumeration risk.

## 7. Improve the session lifecycle

Before production, add and test:

- idle timeout and absolute maximum lifetime,
- explicit session revocation,
- logout from all devices,
- deletion of expired sessions,
- session metadata such as creation time and last-used time,
- reauthentication for sensitive operations,
- session rotation after login and privilege changes.

Clean up expired records with a scheduled job:

```python
def delete_expired_sessions() -> None:
    now = int(time.time())
    with Session(engine) as db:
        db.execute(delete(UserSession).where(UserSession.expires_at <= now))
        db.commit()
```

Run that job outside the request path on a schedule. Make sure cleanup is
safe to run concurrently.

## 8. Add security headers and safe error handling

Configure headers at the reverse proxy or application boundary:

```python
from starlette.middleware.base import BaseHTTPMiddleware


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request, call_next):
        response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["Referrer-Policy"] = "no-referrer"
        response.headers["Content-Security-Policy"] = (
            "default-src 'self'; script-src 'self'; style-src 'self'; "
            "object-src 'none'; base-uri 'self'; frame-ancestors 'none'"
        )
        return response


app.add_middleware(SecurityHeadersMiddleware)
```

Use a CSP compatible with the final frontend. Avoid inline scripts and inline
event handlers. Return safe, generic errors to clients while logging useful
diagnostic details server-side.

## 9. Keep password handling conservative

Continue using Argon2id through a maintained library. Do not log passwords or
password hashes. Consider checking whether new passwords appear in a breached
password corpus.

Example password verification flow:

```python
def verify_login(password: str, password_hash: str) -> bool:
    try:
        valid = ph.verify(password_hash, password)
        if valid and ph.check_needs_rehash(password_hash):
            # Persist a newly generated hash after a successful login.
            pass
        return valid
    except (VerifyMismatchError, InvalidHash, VerificationError):
        return False
```

Do not silently weaken password requirements to make registration easier.
Document the supported password policy and validate it consistently on the
client and server. The server must remain authoritative.

## 10. Add production tests

At minimum, test:

```python
def test_login_sets_secure_http_only_cookie(client):
    response = client.post(
        "/auth/login",
        json={"username": "alice", "password": "correct-password"},
    )

    assert response.status_code == 200
    cookie = response.headers["set-cookie"]
    assert "HttpOnly" in cookie
    assert "Secure" in cookie
    assert "SameSite=Lax" in cookie
```

The test suite should also cover:

- invalid credentials,
- expired and revoked sessions,
- concurrent login/logout behavior,
- CSRF failures,
- rate-limit responses,
- account enumeration behavior,
- password reset and reauthentication,
- authorization boundaries,
- XSS payloads in every user-controlled field,
- malformed and non-JSON upstream responses,
- database failures and transaction rollback,
- migration upgrade and rollback procedures.

Run dependency and static security checks in CI:

```bash
pip-audit
bandit -r backend
pytest
```

Install the tools in a development or CI environment, not into the production
runtime image unless they are needed there:

```bash
python -m pip install pydantic-settings itsdangerous pymysql alembic
python -m pip install pip-audit bandit pytest
```

Pin and regularly update dependencies. Review dependency changes instead of
blindly applying upgrades.

## 11. Deployment checklist

Before launch, confirm:

- HTTPS is enforced and HTTP redirects safely to HTTPS.
- `Secure`, `HttpOnly`, and appropriate `SameSite` cookie settings are enabled.
- Production origins and trusted hosts are allowlisted.
- Secrets are stored in a secret manager, not in Git.
- Database migrations run as a controlled deployment step.
- Backups have been restored successfully in a test environment.
- Rate limiting and monitoring are enabled.
- Logs exclude passwords, tokens, and sensitive personal data.
- Health and readiness checks are available.
- Dependencies are scanned and regularly updated.
- Security tests and authorization tests pass in CI.
- An independent security review has been completed.

Only after these controls are implemented, tested, and reviewed should this
project be considered for adaptation to a real application.
