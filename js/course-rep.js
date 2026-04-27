document.addEventListener('DOMContentLoaded', () => {
  AUTH.protectRoute('courseRep');
  initCourseRepPage().catch((error) => {
    displayNotification(error.message || 'Unable to load the announcement page.', 'error');
  });
});

let currentTimetableEntries = [];

async function initCourseRepPage() {
  const currentUser = await AUTH.refreshCurrentUserFromDb();
  if (!currentUser) {
    AUTH.logout();
    return;
  }

  const profilePrompt = document.getElementById('course-rep-profile-prompt');
  const promptText = document.getElementById('course-rep-prompt-text');
  const formSection = document.getElementById('course-rep-form-section');
  const audienceNote = document.getElementById('announcementAudience');

  if (!AUTH.isAcademicProfileComplete(currentUser)) {
    if (profilePrompt) {
      profilePrompt.hidden = false;
    }
    if (promptText) {
      promptText.textContent = 'Complete your faculty, department, and level in your profile before sending announcements to your class.';
    }
    if (formSection) {
      formSection.hidden = true;
    }
    return;
  }

  if (profilePrompt) {
    profilePrompt.hidden = true;
  }
  if (formSection) {
    formSection.hidden = false;
  }
  if (audienceNote) {
    audienceNote.textContent = `This announcement will go only to ${currentUser.department} ${currentUser.level} Level students.`;
  }

  await renderAnnouncementHistory();
}

async function sendAnnouncement(event) {
  event.preventDefault();

  const courseCodeField = document.getElementById('courseCode');
  const textField = document.getElementById('announcementText');
  const typeField = document.getElementById('announcementType');
  const expiryValueField = document.getElementById('announcementExpiryValue');
  const expiryUnitField = document.getElementById('announcementExpiryUnit');

  const courseCode = String(courseCodeField.value || '').trim().toUpperCase();
  const text = String(textField.value || '').trim();
  const type = String(typeField.value || 'general').trim();
  const expiryValue = Number(expiryValueField.value || 0);
  const expiryUnit = String(expiryUnitField.value || 'hours').trim();

  if (!courseCode || !text) {
    showAlert('Course code and announcement message are required.', 'error');
    return;
  }

  if (!Number.isFinite(expiryValue) || expiryValue <= 0) {
    showAlert('Enter a valid expiry duration for the announcement.', 'error');
    return;
  }

  const createdAt = new Date();
  const multiplier = expiryUnit === 'minutes' ? 60 * 1000 : expiryUnit === 'days' ? 24 * 60 * 60 * 1000 : 60 * 60 * 1000;
  const expiresAt = new Date(createdAt.getTime() + (expiryValue * multiplier)).toISOString();

  try {
    const announcement = await AUTH.createAnnouncementDb({
      courseCode,
      text,
      type,
      expiresAt
    });

    displayNotification(`Announcement for ${announcement.courseCode} sent to your class.`, 'success');
    await renderAnnouncementHistory();
    if (typeof syncAnnouncementUi === 'function') {
      syncAnnouncementUi();
    }
    event.target.reset();
    if (expiryValueField) expiryValueField.value = '1';
    if (expiryUnitField) expiryUnitField.value = 'hours';
  } catch (error) {
    displayNotification(error.message || 'Unable to send announcement.', 'error');
  }
}

async function renderAnnouncementHistory() {
  const container = document.getElementById('announcementHistory');
  if (!container) return;

  try {
    const list = await AUTH.getMyAnnouncementsDb();
    if (!list.length) {
      container.innerHTML = '<div class="announcement-empty">No announcements sent yet.</div>';
      return;
    }

    container.innerHTML = list.slice(0, 10).map((item) => `
      <article class="announcement-item">
        <div class="announcement-meta">
          <span><strong>${escapeHtml(item.courseCode || 'General')}</strong> • ${escapeHtml(item.type || 'general')}</span>
          <span>${formatDate(item.createdAt || new Date().toISOString())}</span>
        </div>
        <div class="announcement-meta">
          <span>By ${escapeHtml(item.createdBy || 'Course Rep')}</span>
          <span>${escapeHtml(formatAudience(item))}</span>
        </div>
        <div class="announcement-meta">
          <span>${escapeHtml(isAnnouncementExpired(item) ? 'Expired' : `Expires ${formatDate(item.expiresAt || item.createdAt || new Date().toISOString())}`)}</span>
        </div>
        <p>${escapeHtml(item.text)}</p>
      </article>
    `).join('');
  } catch (error) {
    container.innerHTML = `<div class="announcement-empty">${escapeHtml(error.message || 'Unable to load announcement history.')}</div>`;
  }
}

function formatAudience(item) {
  const department = item.audienceDepartment || 'your department';
  if (item.audienceLevel) {
    return `${department} ${item.audienceLevel} Level`;
  }
  return `${department} (all levels)`;
}

function displayNotification(message, type = 'success') {
  const container = document.getElementById('notification');
  if (!container) return;

  container.innerHTML = `
    <div class="notification ${type}">
      ${type === 'success' ? '✓' : '⚠️'} ${escapeHtml(message)}
    </div>
  `;

  setTimeout(() => {
    container.innerHTML = '';
  }, 4000);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

window.sendAnnouncement = sendAnnouncement;
