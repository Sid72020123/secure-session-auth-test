const API_URL = document.querySelector('meta[name="auth-api-url"]')?.content || "/api";
const CONTENT = document.querySelector(".content");

function renderLoginForm(message = "") {
    CONTENT.innerHTML = `
<!-- Login Form -->
<h1>Login</h1>

<form id="login-form">
    <div class="field">
        <label for="login-username">Username</label>
        <input id="login-username" type="text" name="username" autofocus autocomplete="username" required />
    </div>
    <div class="field">
        <label for="login-password">Password</label>
        <input id="login-password" type="password" name="password" autocomplete="current-password" required />
    </div>
    <div class="message hidden" role="alert"></div>
    <div class="button-field">
        <button type="submit" class="form-action-button main-form-button">Log In</button>

        <i>Don't have an account?</i>
        <button type="button" class="form-action-button" id="show-registration">Register</button>
    </div>
</form>`;

    CONTENT.querySelector("#login-form").addEventListener("submit", loginUser);
    CONTENT.querySelector("#show-registration").addEventListener("click", () => renderRegistrationForm());

    if (message) {
        displayMessage(message, "error");
    }
}

function renderRegistrationForm() {
    CONTENT.innerHTML = `
<!-- Register Form -->
<h1>Register</h1>

<form id="registration-form">
    <div class="field">
        <label for="registration-username">Username</label>
        <input id="registration-username" type="text" name="username" autofocus autocomplete="username" required />
    </div>
    <div class="field">
        <label for="registration-password">Password</label>
        <input id="registration-password" type="password" name="password" autocomplete="new-password" required />
    </div>
    <div class="field">
        <label for="confirm-password">Confirm Password</label>
        <input id="confirm-password" type="password" name="confirm_password" autocomplete="new-password" required />
    </div>
    <div class="message hidden" role="alert"></div>
    <div class="button-field">
        <button type="submit" class="form-action-button main-form-button">Register</button>

        <i>Already have an account?</i>
        <button type="button" class="form-action-button" id="show-login">Log In</button>
    </div>
</form>`;

    CONTENT.querySelector("#registration-form").addEventListener("submit", registerUser);
    CONTENT.querySelector("#show-login").addEventListener("click", () => renderLoginForm());
}

function showDashboard(user) {
    CONTENT.innerHTML = `
<!-- Dashboard -->

<h1>Dashboard</h1>
<div class="user-info">
    Welcome, <span id="username"></span>!
    <i>Your user ID is #${Number(user.id)}.</i>
</div>
<form id="logout-form">
    <div class="button-field">
        <button type="submit" class="form-action-button main-form-button">
            Log Out
        </button>
    </div>
</form>`;

    CONTENT.querySelector("#username").textContent = user.username;
    CONTENT.querySelector("#logout-form").addEventListener("submit", logoutUser);
}

function displayMessage(message, type) {
    const messageElement = document.querySelector(".message");
    if (!messageElement) {
        return;
    }

    messageElement.textContent = message;
    messageElement.classList.toggle("error", type === "error");
    messageElement.classList.toggle("success", type === "success");
    messageElement.classList.remove("hidden");
}

function setFormBusy(form, busy) {
    form.querySelectorAll("input, button").forEach((element) => {
        element.disabled = busy;
    });
}

function validateUsername(username) {
    return typeof username === "string" && username.trim().length >= 3 && username.trim().length <= 30;
}

function validatePassword(password) {
    return typeof password === "string" && password.length >= 8;
}

async function requestJson(path, options = {}) {
    let response;

    try {
        response = await fetch(`${API_URL}${path}`, {
            credentials: "include",
            ...options,
        });
    } catch {
        throw new Error("Unable to connect to the authentication server.");
    }

    let data = null;
    const contentType = response.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
        data = await response.json().catch(() => null);
    }

    if (!response.ok) {
        throw new Error(data?.detail || "The request failed.");
    }

    return data;
}

async function loginUser(event) {
    event.preventDefault();

    const form = event.currentTarget;
    const username = form.username.value.trim();
    const password = form.password.value;

    if (!validateUsername(username)) {
        displayMessage("Username should be between 3 and 30 characters in length.", "error");
        return;
    }

    if (!validatePassword(password)) {
        displayMessage("Password should be at least 8 characters in length.", "error");
        return;
    }

    setFormBusy(form, true);
    try {
        await requestJson("/auth/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username, password }),
        });
        await checkAuth();
    } catch (error) {
        displayMessage(error.message, "error");
    } finally {
        if (form.isConnected) {
            setFormBusy(form, false);
        }
    }
}

async function registerUser(event) {
    event.preventDefault();

    const form = event.currentTarget;
    const username = form.username.value.trim();
    const password = form.password.value;
    const confirmPassword = form.confirm_password.value;

    if (!validateUsername(username)) {
        displayMessage("Username should be between 3 and 30 characters in length.", "error");
        return;
    }

    if (!validatePassword(password)) {
        displayMessage("Password should be at least 8 characters in length.", "error");
        return;
    }

    if (password !== confirmPassword) {
        displayMessage("Password and Confirm Password do not match.", "error");
        return;
    }

    setFormBusy(form, true);
    try {
        await requestJson("/auth/register", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username, password }),
        });
        renderLoginForm("Registration successful. You can now log in.");
        displayMessage("Registration successful. You can now log in.", "success");
    } catch (error) {
        displayMessage(error.message, "error");
    } finally {
        if (form.isConnected) {
            setFormBusy(form, false);
        }
    }
}

async function logoutUser(event) {
    event.preventDefault();

    const form = event.currentTarget;
    setFormBusy(form, true);
    try {
        await requestJson("/auth/logout", { method: "POST" });
        renderLoginForm();
    } catch (error) {
        displayMessage(error.message, "error");
        setFormBusy(form, false);
    }
}

async function checkAuth() {
    try {
        const user = await requestJson("/me");
        showDashboard(user);
        return true;
    } catch (error) {
        if (error.message === "Not authenticated.") {
            renderLoginForm();
            return false;
        }

        renderLoginForm();
        displayMessage(error.message, "error");
        return false;
    }
}

checkAuth();
