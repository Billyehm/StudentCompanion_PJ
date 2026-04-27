document.addEventListener('DOMContentLoaded', () => {
  // Redirect if already logged in
  if (AUTH.isLoggedIn()) {
    window.location.href = 'dashboard.html';
    return;
  }

  const loginForm = document.getElementById('login-form');
  const loginMessage = document.getElementById('login-message');

  if (loginForm && loginMessage) {
    loginForm.addEventListener('submit', async (event) => {
      event.preventDefault();

      const email = document.getElementById('login-email').value.trim();
      const password = document.getElementById('login-password').value.trim();

      if (!email || !password) {
        loginMessage.textContent = 'Please enter both email and password.';
        loginMessage.className = 'message error';
        return;
      }

      try {
        const result = await AUTH.loginDb(email, password);

        if (result.success) {
          const user = result.user;
          loginMessage.textContent = `Welcome back, ${user.firstName}! Redirecting to your dashboard...`;
          loginMessage.className = 'message success';

          setTimeout(() => {
            window.location.href = 'dashboard.html';
          }, 800);
        }
      } catch (error) {
        loginMessage.textContent = error.message || 'Login failed.';
        loginMessage.className = 'message error';
      }
    });
  }
});
