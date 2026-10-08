from typing import Annotated

from fastapi import (
    Depends,
    FastAPI,
    HTTPException,
    Response,
    status,
)
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import APIKeyCookie

from schemas import (
    LoginRequest,
    RegisterRequest,
    UserResponse,
)

from utils import (
    authenticate_session,
    delete_user_session,
    login_user,
    register_user,
)

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://127.0.0.1:5500",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

session_cookie = APIKeyCookie(
    name="session",
)


@app.get("/")
def root():
    return "Secure Auth Test Backend API"


@app.get("/health")
def api_health():
    return {"health": "ok"}


@app.post(
    "/auth/register",
    response_model=UserResponse,
    status_code=status.HTTP_201_CREATED,
)
def register(data: RegisterRequest):

    success, result = register_user(
        data.username,
        data.password,
    )

    if not success:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=result,
        )

    return result


@app.post("/auth/login")
def login(
    data: LoginRequest,
    response: Response,
):
    success, token = login_user(
        data.username,
        data.password,
    )

    if not success:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password.",
        )

    response.set_cookie(
        key="session",
        value=token,
        httponly=True,
        secure=False,  # True in production with HTTPS
        samesite="lax",
        max_age=7 * 24 * 60 * 60,
        path="/",
    )

    return {
        "message": "Login successful",
    }


def get_current_user(
    token: Annotated[
        str,
        Depends(session_cookie),
    ],
) -> UserResponse:

    user = authenticate_session(token)

    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated.",
        )

    return UserResponse(
        id=user.id,
        username=user.username,
    )


@app.get(
    "/me",
    response_model=UserResponse,
)
def get_me(
    current_user: Annotated[
        UserResponse,
        Depends(get_current_user),
    ],
):
    return current_user


@app.post("/auth/logout")
def logout(
    response: Response,
    token: Annotated[
        str,
        Depends(session_cookie),
    ],
):
    delete_user_session(token)

    response.delete_cookie(
        key="session",
        path="/",
    )

    return {
        "message": "Logged out",
    }


# Run this file: uvicorn main:app --reload
