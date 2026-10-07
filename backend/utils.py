# https://pypi.org/project/argon2-cffi/

from argon2 import PasswordHasher

ph = PasswordHasher()


def hash_password(raw_password: str) -> str:
    return ph.hash(raw_password)
