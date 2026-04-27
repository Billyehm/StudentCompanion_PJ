let forgotPasswordClientPromise = null;

function loadSupabaseClient() {
  if (forgotPasswordClientPromise) {
    return forgotPasswordClientPromise;
  }

  forgotPasswordClientPromise = new Promise((resolve, reject) => {
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

  return forgotPasswordClientPromise;
}

document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('forgot-password-form');
  const message = document.getElementById('forgot-password-message');
  if (!form || !message) {
    return;
  }

  form.addEventListener('submit', async (event) => {
    event.preventDefault();

    const email = document.getElementById('reset-email').value.trim();
    if (!email) {
      message.textContent = 'Enter your email address.';
      message.className = 'message error';
      return;
    }

    try {
      const supabase = await loadSupabaseClient();
      const redirectTo = new URL('reset-password.html', window.location.href).href;
      const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });

      if (error) {
        message.textContent = error.message || 'Unable to send reset email.';
        message.className = 'message error';
        return;
      }

      message.textContent = 'Reset email sent. Check your inbox and open the link to choose a new password.';
      message.className = 'message success';
      form.reset();
    } catch (error) {
      message.textContent = error.message || 'Unable to send reset email.';
      message.className = 'message error';
    }
  });
});
