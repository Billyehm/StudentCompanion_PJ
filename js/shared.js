let cachedAnnouncements = [];

document.addEventListener('DOMContentLoaded', () => {
  buildNavigation();
  removeProfileButtons();
  syncAnnouncementUi();

  // Mobile navigation toggle
  const navToggle = document.querySelector('[data-nav-toggle]');
  const navLinks = document.querySelector('[data-nav-links]');

  if (navToggle && navLinks) {
    navToggle.innerHTML = '<span aria-hidden="true">&#9776;</span>';
    navToggle.setAttribute('aria-expanded', 'false');

    navToggle.addEventListener('click', () => {
      const isOpen = navLinks.classList.toggle('open');
      navToggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    });

    // Close menu when link is clicked
    navLinks.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        navLinks.classList.remove('open');
        navToggle.setAttribute('aria-expanded', 'false');
      });
    });
  }

  // Update user info if logged in
  const user = AUTH.getCurrentUser();
  if (user) {
    // Update avatar/profile
    updateUserProfile(user);
  }

  const logoutButton = document.getElementById('logout-btn');
  if (logoutButton) {
    logoutButton.addEventListener('click', () => {
      showConfirm('Are you sure you want to logout?', () => {
        AUTH.logout();
      });
    });
  }

  // Highlight active nav link
  updateActiveNavLink();
});

window.addEventListener('storage', (event) => {
  if (event.key && event.key.startsWith('announcement_last_seen_')) {
    refreshNotificationsBadge();
  }
});

window.addEventListener('focus', () => {
  syncAnnouncementUi();
});

function buildNavigation() {
  const navMenu = document.getElementById('nav-menu') || document.querySelector('[data-nav-links]');
  if (!navMenu) return;

  const user = AUTH.getCurrentUser();
  const isLecturer = user && user.role === 'lecturer';
  const isCourseRep = user && (user.role === 'courseRep' || !!user.isCourseRep);

  if (isLecturer) {
    navMenu.innerHTML = `
      <a class="nav-link" href="dashboard.html">Home</a>
      <a class="nav-link" href="lecturer-qr.html">Generate QR</a>
      <a class="nav-link" href="lecturer-attendance.html">View Attendance</a>
      <a class="nav-link" href="directory.html">Directory</a>
      <a class="nav-link" href="profile.html">Profile</a>
      <button id="mobile-logout-btn" class="nav-logout-btn" type="button">Logout</button>
    `;
  } else {
    const baseStudentNav = `
      <a class="nav-link" href="dashboard.html">Home</a>
      <a class="nav-link" href="attendance.html">Attendance</a>
      <a class="nav-link" href="timetable.html">Timetable</a>
      <a class="nav-link" href="directory.html">Directory</a>
      <a class="nav-link" href="results.html">Results</a>
      <a class="nav-link" href="medical.html">Medical</a>
      <a class="nav-link" href="chatbot.html">AI Assistant</a>
      <a class="nav-link nav-link-with-badge" href="notifications.html">
        Notifications
        <span id="notifications-unread-badge" class="nav-badge" style="display:none;">0</span>
      </a>
      ${isCourseRep ? '<a class="nav-link" href="course-rep.html">Course Rep</a>' : ''}
      <a class="nav-link" href="profile.html">Profile</a>
      <button id="mobile-logout-btn" class="nav-logout-btn" type="button">Logout</button>
    `;
    navMenu.innerHTML = baseStudentNav;
  }
  
  // Setup mobile logout button
  const mobileLogoutBtn = document.getElementById('mobile-logout-btn');
  if (mobileLogoutBtn) {
    mobileLogoutBtn.addEventListener('click', () => {
      showConfirm('Are you sure you want to logout?', () => {
        AUTH.logout();
      });
    });
  }
}

function removeProfileButtons() {
  const profileButtons = document.querySelectorAll('.profile-btn');
  profileButtons.forEach((button) => button.remove());
}

function getLastSeenKey(userId) {
  return `announcement_last_seen_${userId}`;
}

function getUnreadAnnouncementCount(user, announcements = cachedAnnouncements) {
  if (!user || user.role === 'lecturer') {
    return 0;
  }

  const activeAnnouncements = announcements.filter((item) => !isAnnouncementExpired(item));
  if (!activeAnnouncements.length) {
    return 0;
  }

  const rawLastSeen = localStorage.getItem(getLastSeenKey(user.userId));
  const lastSeenTime = rawLastSeen ? new Date(rawLastSeen).getTime() : 0;
  if (!Number.isFinite(lastSeenTime) || lastSeenTime <= 0) {
    return activeAnnouncements.length;
  }

  return activeAnnouncements.filter((item) => {
    const createdAt = new Date(item.createdAt || 0).getTime();
    return Number.isFinite(createdAt) && createdAt > lastSeenTime;
  }).length;
}

function refreshNotificationsBadge() {
  const badge = document.getElementById('notifications-unread-badge');
  const user = AUTH.getCurrentUser();
  if (!badge || !user || user.role === 'lecturer') {
    return;
  }

  const unreadCount = getUnreadAnnouncementCount(user);
  if (unreadCount > 0) {
    badge.textContent = String(unreadCount);
    badge.style.display = 'inline-flex';
  } else {
    badge.style.display = 'none';
  }
}

function renderStudentAnnouncementBar() {
  const existing = document.getElementById('student-announcement-bar');
  if (existing) {
    existing.remove();
  }

  const user = AUTH.getCurrentUser();
  if (!user || user.role === 'lecturer') {
    return;
  }

  const announcements = cachedAnnouncements
    .filter((item) => !isAnnouncementExpired(item))
    .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
  if (!announcements.length) {
    return;
  }

  const rawLastSeen = localStorage.getItem(getLastSeenKey(user.userId));
  const lastSeenTime = rawLastSeen ? new Date(rawLastSeen).getTime() : 0;
  const unreadAnnouncements = announcements.filter((item) => {
    const createdAt = new Date(item.createdAt || 0).getTime();
    return !Number.isFinite(lastSeenTime) || lastSeenTime <= 0 || createdAt > lastSeenTime;
  });
  if (!unreadAnnouncements.length) {
    return;
  }

  const latest = unreadAnnouncements[0];
  const bar = document.createElement('section');
  bar.id = 'student-announcement-bar';
  bar.className = 'student-announcement-bar';
  bar.innerHTML = `
    <div class="student-announcement-pill">${latest.messageScope === 'direct' ? 'Direct Message' : 'Announcement'}</div>
    <div class="student-announcement-content">
      <strong>${escapeHtml(latest.courseCode || 'General')}</strong>
      <span>${escapeHtml(latest.text || '')}</span>
      <span class="student-announcement-author">By ${escapeHtml(latest.createdBy || 'Course Rep')}</span>
    </div>
    <div class="student-announcement-time">${formatDate(latest.createdAt || new Date().toISOString())}</div>
  `;

  const header = document.querySelector('.site-header');
  if (header && header.parentNode) {
    header.insertAdjacentElement('afterend', bar);
  }
}

async function syncAnnouncementUi() {
  const user = AUTH.getCurrentUser();
  if (!user || user.role === 'lecturer') {
    cachedAnnouncements = [];
    refreshNotificationsBadge();
    renderStudentAnnouncementBar();
    return;
  }

  try {
    cachedAnnouncements = await AUTH.getAnnouncementsDb();
  } catch (_) {
    cachedAnnouncements = [];
  }

  refreshNotificationsBadge();
  renderStudentAnnouncementBar();
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function showAlert(message, type = 'info') {
  showToast(message, type);
}

function showConfirm(message, onConfirm, onCancel) {
  const existing = document.querySelector('.app-modal-overlay');
  if (existing) existing.remove();

  const overlay = document.createElement('div');
  overlay.className = 'app-modal-overlay';
  overlay.innerHTML = `
    <div class="app-modal" role="dialog" aria-modal="true">
      <div class="app-modal-content">
        <h3>Confirm action</h3>
        <p>${message}</p>
        <div class="app-modal-actions">
          <button class="app-modal-button app-modal-button-secondary" type="button">Cancel</button>
          <button class="app-modal-button app-modal-button-primary" type="button">Confirm</button>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  overlay.querySelector('.app-modal-button-primary').addEventListener('click', () => {
    overlay.remove();
    if (onConfirm) onConfirm();
  });

  overlay.querySelector('.app-modal-button-secondary').addEventListener('click', () => {
    overlay.remove();
    if (onCancel) onCancel();
  });
}

function closeModal() {
  const existing = document.querySelector('.app-modal-overlay');
  if (existing) existing.remove();
}


function updateUserProfile(user) {
  const profileBtns = document.querySelectorAll('.profile-btn');
  
  profileBtns.forEach(btn => {
    const avatar = btn.querySelector('.avatar');
    if (avatar && avatar.querySelector('span')) {
      const initial = user.name.charAt(0).toUpperCase();
      avatar.querySelector('span').textContent = initial;
      avatar.title = user.name;
    }
  });
}

function updateActiveNavLink() {
  const currentPage = window.location.pathname.split('/').pop() || 'dashboard.html';
  const navLinks = document.querySelectorAll('.nav-links a');
  
  navLinks.forEach(link => {
    const href = link.getAttribute('href');
    if (href === currentPage || href.includes(currentPage)) {
      link.classList.add('active');
    } else {
      link.classList.remove('active');
    }
  });
}

// Utility: Check if access is allowed based on role
function checkRoleAccess(requiredRole) {
  const user = AUTH.getCurrentUser();
  if (!user) {
    return false;
  }
  return !requiredRole || user.role === requiredRole;
}

// Utility: Format date
function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function isAnnouncementExpired(item) {
  const expiresAtMs = new Date(item && item.expiresAt ? item.expiresAt : 0).getTime();
  return Number.isFinite(expiresAtMs) && expiresAtMs <= Date.now();
}

// Utility: Show toast notification
function showToast(message, type = 'info') {
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  toast.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    padding: 1rem 1.5rem;
    background: ${type === 'success' ? '#4CAF50' : type === 'error' ? '#ef4444' : '#2563EB'};
    color: white;
    border-radius: 14px;
    box-shadow: 0 14px 28px rgba(0,0,0,0.2);
    z-index: 10000;
    max-width: 400px;
    animation: slideIn 0.3s ease;
  `;
  
  document.body.appendChild(toast);
  
  setTimeout(() => {
    toast.style.animation = 'slideOut 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 3200);
}
