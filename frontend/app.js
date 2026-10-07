const API_URL = "/api";
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
    <div class="button-field">
        <button type="button" class="form-action-button main-form-button" onclick="loginUser(event)">Log In</button>

        <i>Don't have an account?</i>
        <button type="button" class="form-action-button" onclick="renderRegistrationForm(   )">Register</button>
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
    <div class="button-field">
        <button type="button" class="form-action-button main-form-button" onclick="registerUser(event)">Register</button>

        <i>Already have an account?</i>
        <button type="button" class="form-action-button" onclick="renderLoginForm()">Log In</button>
    </div>
</form>`;
}

function loginUser(event) {
    event.preventDefault();
    console.log("Login!");
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
        console.log("Not logged in");
        renderLoginForm();
    }
}

checkAuth();
