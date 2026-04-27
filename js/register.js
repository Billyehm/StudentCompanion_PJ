document.addEventListener('DOMContentLoaded', () => {
  // Redirect if already logged in
  if (AUTH.isLoggedIn()) {
    window.location.href = 'dashboard.html';
    return;
  }

  const registerForm = document.getElementById('register-form');
  const registerMessage = document.getElementById('register-message');
  const surnameInput = document.getElementById('register-surname');
  const firstNameInput = document.getElementById('register-firstname');
  const otherNameInput = document.getElementById('register-othername');

  [surnameInput, firstNameInput, otherNameInput].forEach((input) => {
    if (!input) return;
    input.addEventListener('blur', () => {
      input.value = AUTH.normalizeName(input.value);
    });
  });

  if (registerForm && registerMessage) {
    registerForm.addEventListener('submit', async (event) => {
      event.preventDefault();

      const surname = AUTH.normalizeName(document.getElementById('register-surname').value);
      const firstName = AUTH.normalizeName(document.getElementById('register-firstname').value);
      const otherName = AUTH.normalizeName(document.getElementById('register-othername').value);
      const name = AUTH.buildDisplayName({ surname, firstName, otherName });
      const regNumber = AUTH.normalizeRegNumber(document.getElementById('register-regnumber').value);
      const email = document.getElementById('register-email').value.trim();
      const password = document.getElementById('register-password').value.trim();
      const confirmPassword = document.getElementById('register-confirm-password').value.trim();

      // Validation
      if (!surname || !firstName || !name || !regNumber || !email || !password || !confirmPassword) {
        registerMessage.textContent = 'Please complete all required fields.';
        registerMessage.className = 'message error';
        return;
      }

      if (password !== confirmPassword) {
        registerMessage.textContent = 'Passwords do not match.';
        registerMessage.className = 'message error';
        return;
      }

      if (password.length < 6) {
        registerMessage.textContent = 'Password must be at least 6 characters long.';
        registerMessage.className = 'message error';
        return;
      }

      try {
        const result = await AUTH.registerStudentDb(name, email, regNumber, password);

        if (result.requiresEmailConfirmation) {
          registerForm.reset();
          window.location.href = `account-created.html?mode=confirmation&email=${encodeURIComponent(email)}`;
          return;
        }

        if (result.success) {
          registerMessage.textContent = 'Account created successfully! Logging you in...';
          registerMessage.className = 'message success';
          registerForm.reset();

          setTimeout(() => {
            window.location.href = 'dashboard.html';
          }, 700);
        }
      } catch (error) {
        registerMessage.textContent = error.message || 'Registration failed.';
        registerMessage.className = 'message error';
      }
    });
  }
});
