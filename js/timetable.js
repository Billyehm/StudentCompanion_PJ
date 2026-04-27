document.addEventListener('DOMContentLoaded', () => {
  AUTH.protectRoute();
  initTimetablePage().catch((error) => {
    console.error(error);
    if (/complete your academic profile/i.test(error.message || '')) {
      showProfilePrompt(error.message);
      return;
    }
    displayNotification(error.message || 'Unable to load the timetable page.', 'error');
  });
});

async function initTimetablePage() {
  const currentUser = await AUTH.refreshCurrentUserFromDb();
  if (!currentUser) {
    AUTH.logout();
    return;
  }

  if (!AUTH.isAcademicProfileComplete(currentUser)) {
    showProfilePrompt(AUTH.getProfileCompletionMessage('the timetable page'));
    return;
  }

  hideProfilePrompt();

  const isCourseRep = AUTH.isCourseRep() || currentUser.role === 'lecturer';
  if (isCourseRep) {
    const addBtn = document.getElementById('addTimetableButton');
    if (addBtn) addBtn.style.display = 'block';
  }

  await loadTimetable(isCourseRep);
}

async function loadTimetable(isCourseRep = false) {
  try {
    const entries = await AUTH.getTimetablesDb();
    currentTimetableEntries = Array.isArray(entries) ? entries : [];
    renderTimetable(entries, isCourseRep);
  } catch (error) {
    currentTimetableEntries = [];
    if (/complete your academic profile/i.test(error.message || '')) {
      showProfilePrompt(error.message);
      return;
    }
    displayNotification(error.message || 'Unable to load timetable.', 'error');
  }
}

function renderTimetable(entries, isCourseRep = false) {
  const container = document.getElementById('timetableGrid');
  if (!container) return;
  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

  // generate time slots (HH:MM) and also provide display label in am/pm
  const timeSlots = [];
  for (let hour = 8; hour < 18; hour++) {
    const hh = hour.toString().padStart(2, '0') + ':00';
    timeSlots.push(hh);
  }

  function formatAmPm(hm) {
    // expects 'HH:MM' or 'H:MM'
    const [hhStr, mm] = hm.split(':');
    let hh = parseInt(hhStr, 10);
    const suffix = hh >= 12 ? 'PM' : 'AM';
    hh = ((hh + 11) % 12) + 1; // convert to 1-12
    return `${hh}:${mm} ${suffix}`;
  }

  function extractHm(value) {
    if (!value) return null;
    const m = String(value).match(/(\d{1,2}:\d{2})/);
    return m ? m[1] : null;
  }

  // transpose: days as rows, times as columns
  let html = '<table style="width: 100%; border-collapse: collapse; font-size: 0.9em;">';
  // header: first empty cell then time columns
  html += '<thead><tr><th style="border: 1px solid var(--border); padding: 12px; background: var(--surface-soft); font-weight: 600;">Day / Time</th>';
  timeSlots.forEach(ts => {
    html += `<th style="border: 1px solid var(--border); padding: 8px; background: var(--surface-soft); font-weight: 600;">${formatAmPm(ts)}</th>`;
  });
  html += '</tr></thead><tbody>';

  days.forEach(day => {
    html += `<tr><td style="border: 1px solid var(--border); padding: 12px; background: var(--surface-soft); font-weight: 600; min-width: 90px;">${day}</td>`;
    timeSlots.forEach(ts => {
      // find an entry that matches this day and startTime normalized to HH:MM
      const entry = entries.find(e => {
        if (!e || !e.startTime) return false;
        // normalize e.startTime to HH:MM
        const m = ('' + e.startTime).match(/(\d{1,2}:\d{2})/);
        if (!m) return false;
        const start = m[1];
        return e.dayOfWeek === day && start === ts;
      });

      if (entry) {
        const startHm = extractHm(entry.startTime) || ts;
        const endHm = extractHm(entry.endTime) || (String(ts).replace(/(\d{2}):(\d{2})/, (m, h, mm) => `${(parseInt(h, 10) + 1).toString().padStart(2, '0')}:${mm}`));
        const cellContent = `
          <strong style="color: var(--primary);">${escapeHtml(entry.courseCode)}</strong><br>
          <span style="color: var(--text);">${escapeHtml(entry.courseTitle)}</span><br>
          <small style="color: var(--muted);">⏱️ ${formatAmPm(startHm)} - ${formatAmPm(endHm)}</small>
        `;

        if (isCourseRep) {
          html += `<td style="border: 1px solid var(--border); padding: 8px; background: rgba(34, 197, 94, 0.08); cursor: pointer;" onclick="editTimetableEntry('${entry.id}')">
            ${cellContent}
            <br><button type="button" onclick="event.stopPropagation(); deleteTimetableEntry('${entry.id}')" style="margin-top: 6px; font-size: 0.8em; padding: 2px 6px;">Delete</button>
          </td>`;
        } else {
          html += `<td style="border: 1px solid var(--border); padding: 8px; background: rgba(34, 197, 94, 0.08);">${cellContent}</td>`;
        }
      } else {
        if (isCourseRep) {
          html += `<td style="border: 1px solid var(--border); padding: 8px; background: var(--surface); cursor: pointer; text-align: center;" onclick="addTimetableEntry('${day}', '${ts}')">+ Add</td>`;
        } else {
          html += `<td style="border: 1px solid var(--border); padding: 8px; background: var(--surface);"></td>`;
        }
      }
    });
    html += '</tr>';
  });

  html += '</tbody></table>';
  container.innerHTML = html;
}

function showProfilePrompt(message) {
  const promptCard = document.getElementById('timetable-profile-prompt');
  const promptText = document.getElementById('timetable-prompt-text');
  const container = document.getElementById('timetableContainer');

  if (promptCard) {
    promptCard.hidden = false;
  }
  if (promptText) {
    promptText.textContent = message;
  }
  if (container) {
    container.style.display = 'none';
  }
}

function hideProfilePrompt() {
  const promptCard = document.getElementById('timetable-profile-prompt');
  const container = document.getElementById('timetableContainer');

  if (promptCard) {
    promptCard.hidden = true;
  }
  if (container) {
    container.style.display = '';
  }
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function displayNotification(message, type = 'success') {
  const container = document.createElement('div');
  container.innerHTML = `
    <div style="position: fixed; top: 20px; right: 20px; background: ${type === 'success' ? 'var(--primary)' : 'var(--danger)'}; color: #000; padding: 16px 20px; border-radius: 8px; z-index: 1000; max-width: 300px;">
      ${type === 'success' ? '✓' : '⚠️'} ${escapeHtml(message)}
    </div>
  `;
  document.body.appendChild(container);
  setTimeout(() => container.remove(), 4000);
}

// Timetable management functions
let currentTimetableEntries = [];

function openTimetableModal() {
  document.getElementById('entryId').value = '';
  document.getElementById('modalTitle').textContent = 'Add Timetable Entry';
  document.getElementById('timetableForm').reset();
  document.getElementById('dayOfWeek').value = 'Monday';
  document.getElementById('startTime').value = '08:00';
  document.getElementById('endTime').value = '09:00';
  document.getElementById('venue').value = '';
  document.getElementById('lecturerName').value = '';
  populateCourseDropdown();
  document.getElementById('timetableModal').style.display = 'flex';
}

function closeTimetableModal() {
  document.getElementById('timetableModal').style.display = 'none';
}

function addTimetableEntry(day, time) {
  document.getElementById('entryId').value = '';
  document.getElementById('modalTitle').textContent = 'Add Timetable Entry';
  document.getElementById('dayOfWeek').value = day;
  document.getElementById('startTime').value = time;
  document.getElementById('endTime').value = time.replace(/(\d{2}):00/, (m, h) => `${(parseInt(h) + 1).toString().padStart(2, '0')}:00`);
  document.getElementById('courseSelect').value = '';
  document.getElementById('courseCode').value = '';
  document.getElementById('courseTitle').value = '';
  document.getElementById('venue').value = '';
  document.getElementById('lecturerName').value = '';
  populateCourseDropdown();
  document.getElementById('timetableModal').style.display = 'flex';
}

async function populateCourseDropdown() {
  try {
    const currentUser = await AUTH.refreshCurrentUserFromDb();
    const includeAllLevels = currentUser && currentUser.role === 'lecturer';
    const courses = await AUTH.getCoursesForCurrentUserDb({ includeAllLevels });
    const select = document.getElementById('courseSelect');

    // Keep the placeholder option
    const placeholder = select.options[0];
    select.innerHTML = '';
    select.appendChild(placeholder);

    courses.forEach(course => {
      const option = document.createElement('option');
      option.value = JSON.stringify({ courseCode: course.course_code, courseTitle: course.course_title, courseId: course.id });
      option.textContent = `${course.course_code} - ${course.course_title}`;
      select.appendChild(option);
    });
  } catch (error) {
    displayNotification('Failed to load courses: ' + error.message, 'error');
  }
}

function onCourseSelected() {
  const select = document.getElementById('courseSelect');
  const courseCodeEl = document.getElementById('courseCode');
  const courseTitleEl = document.getElementById('courseTitle');

  if (select.value) {
    try {
      const courseData = JSON.parse(select.value);
      courseCodeEl.value = courseData.courseCode;
      courseTitleEl.value = courseData.courseTitle;
    } catch (e) {
      displayNotification('Error selecting course', 'error');
    }
  } else {
    courseCodeEl.value = '';
    courseTitleEl.value = '';
  }
}

function editTimetableEntry(id) {
  const entry = currentTimetableEntries.find((item) => item.id === id);
  if (!entry) {
    displayNotification('Unable to find that timetable entry. Refresh the page and try again.', 'error');
    return;
  }

  document.getElementById('entryId').value = entry.id;
  document.getElementById('modalTitle').textContent = 'Edit Timetable Entry';
  document.getElementById('dayOfWeek').value = entry.dayOfWeek || '';
  document.getElementById('startTime').value = entry.startTime || '';
  document.getElementById('endTime').value = entry.endTime || '';
  document.getElementById('courseCode').value = entry.courseCode || '';
  document.getElementById('courseTitle').value = entry.courseTitle || '';
  document.getElementById('venue').value = entry.venue || '';
  document.getElementById('lecturerName').value = entry.lecturerName || '';
  populateCourseDropdown().finally(() => {
    document.getElementById('timetableModal').style.display = 'flex';
  });
}

async function saveTimetableEntry(event) {
  event.preventDefault();

  const id = document.getElementById('entryId').value;
  const payload = {
    dayOfWeek: document.getElementById('dayOfWeek').value,
    startTime: document.getElementById('startTime').value,
    endTime: document.getElementById('endTime').value,
    courseCode: document.getElementById('courseCode').value.trim().toUpperCase(),
    courseTitle: document.getElementById('courseTitle').value.trim(),
    venue: document.getElementById('venue').value.trim(),
    lecturerName: document.getElementById('lecturerName').value.trim()
  };

  try {
    if (id) {
      await AUTH.updateTimetableEntryDb(id, payload);
      displayNotification('Timetable entry updated successfully.', 'success');
    } else {
      await AUTH.createTimetableEntryDb(payload);
      displayNotification('Timetable entry added successfully.', 'success');
    }
    closeTimetableModal();
    const currentUser = await AUTH.refreshCurrentUserFromDb();
    const isCourseRep = AUTH.isCourseRep() || currentUser.role === 'lecturer';
    loadTimetable(isCourseRep);
  } catch (error) {
    displayNotification(error.message || 'Unable to save timetable entry.', 'error');
  }
}

async function deleteTimetableEntry(id) {
  if (!confirm('Are you sure you want to delete this timetable entry?')) return;

  try {
    await AUTH.deleteTimetableEntryDb(id);
    displayNotification('Timetable entry deleted successfully.', 'success');
    const currentUser = await AUTH.refreshCurrentUserFromDb();
    const isCourseRep = AUTH.isCourseRep() || currentUser.role === 'lecturer';
    loadTimetable(isCourseRep);
  } catch (error) {
    displayNotification(error.message || 'Unable to delete timetable entry.', 'error');
  }
}
