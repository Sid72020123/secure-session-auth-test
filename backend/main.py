import time

from sqlalchemy.orm import Session, select

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

from db import create_all_tables, User, UserSession
from db.utils import normalize_username

from utils import hash_password


def register_user(username: str, password: str):
    print(hash_password(password), type(hash_password(password)))
    engine = create_all_tables()

    now = time.time()

    with Session(engine) as db:
        users = 
        user = User(
            username=username,
            username_norm=normalize_username(username),
            password_hash=hash_password(password),
            created_at=now,
            updated_at=now,
        )

        db.add(user)
        db.commit()

        print(user.id)


register_user("Sid", "123456")
