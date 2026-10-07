import time

from sqlalchemy import select
from sqlalchemy.orm import Session

"""
import hashlib
import secrets

raw_token = secrets.token_urlsafe(32)

token_hash = hashlib.sha256(
    raw_token.encode()
).digest()

now = int(time.time())

with Session(engine) as db:
    session = SessionModel(
        user_id=user.id,
        token_hash=token_hash,
        created_at=now,
        expires_at=now + 7 * 24 * 60 * 60,
        last_seen_at=now,
    )

    db.add(session)
    db.commit()
"""

from db import engine, User, UserSession
from db.utils import normalize_username

from utils import hash_password


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


print(register_user("Sid", "123456"))
