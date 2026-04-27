document.addEventListener('DOMContentLoaded', () => {
  AUTH.protectRoute('student');
  renderAnnouncements();
});

window.addEventListener('focus', () => {
  renderAnnouncements();
});

async function renderAnnouncements() {
  const container = document.getElementById('notification-list');
  const countBadge = document.getElementById('announcement-count');
  const profilePrompt = document.getElementById('notifications-profile-prompt');
  const promptText = document.getElementById('notifications-prompt-text');
  if (!container || !countBadge) return;

  try {
    const announcements = await AUTH.getAnnouncementsDb();
    countBadge.textContent = `${announcements.length} total`;
    markAnnouncementsAsSeen(announcements);

    if (profilePrompt) {
      profilePrompt.hidden = true;
    }

    if (!announcements.length) {
      container.innerHTML = '<div class="notification-empty">No announcements for your class yet.</div>';
      return;
    }

    container.innerHTML = announcements.map((item) => `
      <article class="notification-item ${isAnnouncementExpired(item) ? 'expired' : ''}">
        <div class="notification-meta">
          <span>
            <strong>${escapeHtml(item.courseCode || 'General')}</strong>
            <span class="notification-tag">${escapeHtml(item.messageScope === 'direct' ? 'Direct' : (item.type || 'general'))}</span>
          </span>
          <span>${formatDate(item.createdAt || new Date().toISOString())}</span>
        </div>
        <div class="notification-meta">
          <span>By ${escapeHtml(item.createdBy || 'Course Rep')}</span>
          <span>${escapeHtml(formatAudience(item))}</span>
        </div>
        <div class="notification-meta">
          <span>${escapeHtml(isAnnouncementExpired(item) ? 'Expired announcement' : `Expires ${formatDate(item.expiresAt || item.createdAt || new Date().toISOString())}`)}</span>
        </div>
        <p class="notification-text">${escapeHtml(item.text)}</p>
      </article>
    `).join('');
  } catch (error) {
    countBadge.textContent = '0 total';
    container.innerHTML = '<div class="notification-empty"></div>';

    if (profilePrompt) {
      profilePrompt.hidden = false;
    }
    if (promptText) {
      promptText.textContent = error.message || 'Complete your profile before viewing class announcements.';
    }

    if (!profilePrompt) {
      container.innerHTML = `<div class="notification-empty">${escapeHtml(error.message || 'Unable to load announcements.')}</div>`;
    }
  }
}

function formatAudience(item) {
  if (item.messageScope === 'direct') {
    return 'Private message';
  }
  const department = item.audienceDepartment || 'your department';
  if (item.audienceLevel) {
    return `${department} ${item.audienceLevel} Level`;
  }
  return `${department} (all levels)`;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function markAnnouncementsAsSeen(announcements) {
  const user = AUTH.getCurrentUser();
  if (!user) return;

  const latest = announcements.find((item) => !isAnnouncementExpired(item)) || announcements[0];
  const latestTime = latest && latest.createdAt ? latest.createdAt : new Date().toISOString();
  localStorage.setItem(`announcement_last_seen_${user.userId}`, latestTime);

  if (typeof syncAnnouncementUi === 'function') {
    syncAnnouncementUi();
  } else if (typeof refreshNotificationsBadge === 'function') {
    refreshNotificationsBadge();
  }
}
