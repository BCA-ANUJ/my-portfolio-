const loginForm = document.getElementById("loginForm");
const loginMessage = document.getElementById("loginMessage");
const passwordInput = document.getElementById("password");
const passwordToggle = document.getElementById("passwordToggle");

passwordToggle.addEventListener("click", () => {
    const isVisible = passwordInput.type === "text";
    passwordInput.type = isVisible ? "password" : "text";
    passwordToggle.setAttribute("aria-pressed", String(!isVisible));
    passwordToggle.setAttribute(
        "aria-label",
        isVisible ? "Show password" : "Hide password"
    );
    passwordToggle.innerHTML = isVisible
        ? '<i class="fa-solid fa-eye" aria-hidden="true"></i>'
        : '<i class="fa-solid fa-eye-slash" aria-hidden="true"></i>';
});

loginForm.addEventListener("submit", (event) => {
    event.preventDefault();
    loginMessage.textContent =
        "This is a UI demo only. Connect a secure authentication service to sign in.";
});
