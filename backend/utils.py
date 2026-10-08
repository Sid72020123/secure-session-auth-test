# https://pypi.org/project/argon2-cffi/
import time
import hashlib
import secrets

from sqlalchemy import select
from sqlalchemy.orm import Session
from argon2 import PasswordHasher
from argon2.exceptions import InvalidHash, VerificationError, VerifyMismatchError

from db import engine, User, UserSession
from db.utils import normalize_username

ph = PasswordHasher()


def hash_password(raw_password: str) -> str:
    return ph.hash(raw_password)


def verify_password(password: str, password_hash: str) -> bool:
    try:
        return ph.verify(password_hash, password)
    except (VerifyMismatchError, InvalidHash, VerificationError):
        return False


def register_user(username: str, password: str) -> tuple[bool, User | str]:
    # --> Validate Username
    username = username.strip()

    if not 3 <= len(username) <= 30:
        return False, "Username must be between 3 and 30 characters."

    # -> Validate Password
    if len(password) < 8:
        return False, "Password must be at least 8 characters."

    username_norm = normalize_username(username)

    now = int(time.time())

    with Session(engine) as db:

        existing_user = db.scalar(
            select(User).where(User.username_norm == username_norm)
        )

        if existing_user is not None:
            return False, "Username already exists!"

        password_hash = hash_password(password)

        user = User(
            username=username,
            username_norm=username_norm,
            password_hash=password_hash,
            created_at=now,
            updated_at=now,
        )

        db.add(user)
        db.commit()

        db.refresh(user)

        return True, user


def create_user_session(db: Session, user: User) -> str:
    # Generate a token that is returned to the client.
    raw_token = secrets.token_urlsafe(32)

    # Store only a hash of the token in the database.
    token_hash = hashlib.sha256(raw_token.encode()).digest()

    now = int(time.time())

    session = UserSession(
        user_id=user.id,
        token_hash=token_hash,
        created_at=now,
        expires_at=now + 7 * 24 * 60 * 60,
        last_seen_at=now,
    )

    db.add(session)

    return raw_token


def login_user(username: str, password: str) -> tuple[bool, str | None]:
    username = username.strip()
    username_norm = normalize_username(username)

    with Session(engine) as db:
        user = db.scalar(select(User).where(User.username_norm == username_norm))

        if user is None:
            return False, None

        if not verify_password(password, user.password_hash):
            return False, None

        raw_token = create_user_session(db, user)

        db.commit()

        return True, raw_token


def authenticate_session(raw_token: str) -> User | None:
    token_hash = hashlib.sha256(raw_token.encode()).digest()
    now = int(time.time())

    with Session(engine) as db:
        session = db.scalar(
            select(UserSession).where(UserSession.token_hash == token_hash)
        )

        if session is None:
            return None

        if session.expires_at <= now:
            return None

        session.last_seen_at = now
        db.commit()

        user = db.get(User, session.user_id)

        return user


"""
# Delete sessions code, if required.
def delete_expired_sessions() -> None:
    now = int(time.time())

    with Session(engine) as db:
        db.execute(
            delete(UserSession).where(
                UserSession.expires_at <= now
            )
        )

        db.commit()
"""
