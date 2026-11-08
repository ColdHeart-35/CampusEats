"""Authentication & User Access Unit & Integration Tests."""

import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_register_user_success(client: AsyncClient):
    """Verify new student registration succeeds and returns UserResponse."""
    payload = {
        "email": "freshstudent@campuseats.edu",
        "password": "StrongPassword123!",
        "full_name": "Fresh Student",
        "phone": "9876543200",
        "role": "student",
    }
    response = await client.post("/api/auth/register", json=payload)
    assert response.status_code == 201
    data = response.json()
    assert data["email"] == "freshstudent@campuseats.edu"
    assert data["full_name"] == "Fresh Student"
    assert data["role"] == "student"
    assert data["is_active"] is True
    assert "id" in data
    assert "password_hash" not in data


@pytest.mark.asyncio
async def test_register_duplicate_email(client: AsyncClient, student_user):
    """Verify that attempting to register an already taken email returns 400 error."""
    payload = {
        "email": student_user.email,
        "password": "AnotherPassword123!",
        "full_name": "Duplicate Student",
        "phone": "9876543201",
        "role": "student",
    }
    response = await client.post("/api/auth/register", json=payload)
    assert response.status_code == 400
    assert "already exists" in response.text.lower()


@pytest.mark.asyncio
async def test_login_success(client: AsyncClient, student_user):
    """Verify login with correct credentials returns valid JWT token pair."""
    payload = {
        "email": student_user.email,
        "password": "StudentPass123!",
    }
    response = await client.post("/api/auth/login", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert "refresh_token" in data
    assert data["token_type"].lower() == "bearer"


@pytest.mark.asyncio
async def test_login_wrong_password(client: AsyncClient, student_user):
    """Verify login with wrong password is rejected with 401 Unauthorized."""
    payload = {
        "email": student_user.email,
        "password": "WrongPasswordAttempt!",
    }
    response = await client.post("/api/auth/login", json=payload)
    assert response.status_code == 401
    assert "invalid email or password" in response.text.lower()


@pytest.mark.asyncio
async def test_protected_route_no_token(client: AsyncClient):
    """Verify accessing protected endpoint without Authorization header returns 401."""
    response = await client.get("/api/users/me")
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_protected_route_invalid_token(client: AsyncClient):
    """Verify accessing protected endpoint with forged/malformed token returns 401."""
    headers = {"Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.invalid.signature"}
    response = await client.get("/api/users/me", headers=headers)
    assert response.status_code == 401
