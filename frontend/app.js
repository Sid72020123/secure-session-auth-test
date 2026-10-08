const API_URL = "http://127.0.0.1:8000";
const CONTENT = document.querySelector(".content");

function renderLoginForm() {
    CONTENT.innerHTML = `
<!-- Login Form -->
<h1>Login</h1>

<form>
    <div class="field">
        <label for="name">Username</label>
        <input type="text" name="username" autofocus autocomplete="off" />
    </div>
    <div class="field">
        <label for="password">Password</label>
        <input type="password" name="password" autocomplete="off" />
    </div>
    <div class="message hidden"></div>
    <div class="button-field">
        <button type="button" class="form-action-button main-form-button" onclick="loginUser(event)">Log In</button>

        <i>Don't have an account?</i>
        <button type="button" class="form-action-button" onclick="renderRegistrationForm()">Register</button>
    </div>
</form>`;
}

function renderRegistrationForm() {
    CONTENT.innerHTML = `
<!-- Register Form -->
<h1>Register</h1>

<form>
    <div class="field">
        <label for="name">Username</label>
        <input type="text" name="username" autofocus autocomplete="off" />
    </div>
    <div class="field">
        <label for="password">Password</label>
        <input type="password" name="password" autocomplete="off" />
    </div>
    <div class="field">
        <label for="confirm_password">Confirm Password</label>
        <input type="password" name="confirm_password" autocomplete="off" />
    </div>
    <div class="message hidden"></div>
    <div class="button-field">
        <button type="button" class="form-action-button main-form-button" onclick="registerUser(event)">Register</button>

        <i>Already have an account?</i>
        <button type="button" class="form-action-button" onclick="renderLoginForm()">Log In</button>
    </div>
</form>`;
}

function displayMessage(m, t) {
    const MESSAGE = document.querySelector(".message");

    MESSAGE.textContent = m;
    if (t === "error") {
        MESSAGE.classList.remove("success");
        MESSAGE.classList.add("error");
    } else if (t === "success") {
        MESSAGE.classList.remove("error");
        MESSAGE.classList.add("success");
    }
    if (MESSAGE.classList.contains("hidden")) {
        MESSAGE.classList.remove("hidden");
    }
}

function validateUsername(n) {
    return typeof n === "string" && n.trim().length >= 3 && n.trim().length <= 30;
}

async function loginUser(event) {
    event.preventDefault();

    const form = event.target.form;
    const username = form.username.value;
    const password = form.password.value;
    console.log(validateUsername(username));

    if (!validateUsername(username)) {
        displayMessage("Username should be between 3 and 30 characters!", "error");
        return;
    }

    const response = await fetch(`${API_URL}/auth/login`, {
        method: "POST",

        headers: {
            "Content-Type": "application/json",
        },

        body: JSON.stringify({
            username: username,
            password: password,
        }),
    });

    if (response.ok) {
        console.log("loginUser: Login successful!");
        displayMessage("Login Successful!", "success");
        checkAuth();
        return;
    }

    const data = await response.json();
    displayMessage(data.detail || "Login failed.", "error");
}

function registerUser(event) {
    event.preventDefault();
    console.log("Register!");
}

async function checkAuth() {
    const response = await fetch(`${API_URL}/me`);

    if (response.ok) {
        const data = await response.json();
        console.log(data);
        // console.log("Logged in as:", data.user.username);
        // showDashboard(data.user);
    } else {
        console.log("checkAuth: Not logged in!");
        renderLoginForm();
    }
}

checkAuth();
