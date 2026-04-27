let resetPasswordClientPromise = null;

function loadSupabaseResetClient() {
  if (resetPasswordClientPromise) {
    return resetPasswordClientPromise;
  }

  resetPasswordClientPromise = new Promise((resolve, reject) => {
    const config = window.SUPABASE_CONFIG || {};
    const url = String(config.url || '').trim();
    const anonKey = String(config.anonKey || '').trim();

    if (!url || !anonKey) {
      reject(new Error('Supabase configuration is missing.'));
      return;
    }

    const finish = () => {
      if (!window.supabase || typeof window.supabase.createClient !== 'function') {
        reject(new Error('Supabase client failed to load.'));
        return;
      }
      resolve(window.supabase.createClient(url, anonKey));
    };

    if (window.supabase && typeof window.supabase.createClient === 'function') {
      finish();
      return;
    }

    const existing = document.querySelector('script[data-supabase-js]');
    if (existing) {
      existing.addEventListener('load', finish, { once: true });
      existing.addEventListener('error', () => reject(new Error('Supabase client failed to load.')), { once: true });
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
    script.async = true;
    script.dataset.supabaseJs = 'true';
    script.onload = finish;
    script.onerror = () => reject(new Error('Supabase client failed to load.'));
    document.head.appendChild(script);
  });

  return resetPasswordClientPromise;
}

function readRecoveryTokens() {
  const hash = window.location.hash.startsWith('#') ? window.location.hash.slice(1) : '';
  const params = new URLSearchParams(hash);
  return {
    accessToken: params.get('access_token'),
    refreshToken: params.get('refresh_token'),
    type: params.get('type')
  };
}

document.addEventListener('DOMContentLoaded', async () => {
  const form = document.getElementById('reset-password-form');
  const message = document.getElementById('reset-password-message');
  if (!form || !message) {
    return;
  }

  let supabase = null;
  try {
    supabase = await loadSupabaseResetClient();
    const tokens = readRecoveryTokens();
    if (tokens.accessToken && tokens.refreshToken) {
      const { error } = await supabase.auth.setSession({
        access_token: tokens.accessToken,
        refresh_token: tokens.refreshToken
      });

      if (error) {
        message.textContent = error.message || 'This password reset link is invalid or has expired.';
        message.className = 'message error';
        form.style.display = 'none';
        return;
      }
    } else {
      message.textContent = 'Open this page from the password reset email link.';
      message.className = 'message error';
      form.style.display = 'none';
      return;
    }
  } catch (error) {
    message.textContent = error.message || 'Unable to start password reset.';
    message.className = 'message error';
    form.style.display = 'none';
    return;
  }

  form.addEventListener('submit', async (event) => {
    event.preventDefault();

    const password = document.getElementById('new-password').value.trim();
    const confirmPassword = document.getElementById('confirm-password').value.trim();

    if (!password || !confirmPassword) {
      message.textContent = 'Fill in both password fields.';
      message.className = 'message error';
      return;
    }

    if (password.length < 6) {
      message.textContent = 'Use a password with at least 6 characters.';
      message.className = 'message error';
      return;
    }

    if (password !== confirmPassword) {
      message.textContent = 'The passwords do not match.';
      message.className = 'message error';
      return;
    }

    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      message.textContent = error.message || 'Unable to update password.';
      message.className = 'message error';
      return;
    }

    message.textContent = 'Password changed successfully. Redirecting to login...';
    message.className = 'message success';

    setTimeout(() => {
      window.location.href = 'login.html';
    }, 1200);
  });
});
