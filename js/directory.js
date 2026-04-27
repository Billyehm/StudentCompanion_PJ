document.addEventListener('DOMContentLoaded', () => {
  // Protect route
  AUTH.protectRoute();

  const searchInput = document.getElementById('directory-search');
  const tabButtons = document.querySelectorAll('.tab-btn');
  const tabContents = document.querySelectorAll('.tab-content');
  const introText = document.querySelector('.page-intro p');
  const promptCard = document.getElementById('directory-profile-prompt');
  const promptText = document.getElementById('directory-prompt-text');
  const directoryTabs = document.getElementById('directory-tabs');
  const searchBar = document.querySelector('.search-bar');
  const studentActionHeader = document.getElementById('students-action-header');
  const currentUser = AUTH.getCurrentUser();
  const canLecturerMessageStudents = Boolean(currentUser && currentUser.role === 'lecturer');

  let currentTab = 'students';
  let allStudents = [];
  let allLecturers = [];
  let directoryState = {
    filterConfigured: false,
    context: {}
  };

  // Load data
  function loadData() {
    AUTH.getDirectoryDataDb()
      .then((directoryData) => {
        allStudents = directoryData.students;
        allLecturers = directoryData.lecturers;
        directoryState = directoryData;

        if (!directoryData.profileComplete) {
          showProfilePrompt(directoryData.message || 'Complete your academic profile before using the directory.');
          displayStudents();
          displayLecturers();
          return;
        }

        hideProfilePrompt();

        if (introText) {
          introText.textContent = directoryData.filterConfigured
            ? `Showing people in ${directoryData.context.department}, ${directoryData.context.faculty}${directoryData.context.level ? ` (${directoryData.context.level} Level students)` : ''}.`
            : 'Directory';
        }

        displayStudents();
        displayLecturers();
        bindStudentMessageButtons();
      })
      .catch((error) => {
        const studentBody = document.getElementById('students-tbody');
        const lecturerBody = document.getElementById('lecturers-tbody');
        if (studentBody) {
          studentBody.innerHTML = '<tr><td colspan="3" style="text-align: center;">Unable to load directory.</td></tr>';
        }
        if (lecturerBody) {
          lecturerBody.innerHTML = '<tr><td colspan="2" style="text-align: center;">Unable to load directory.</td></tr>';
        }
        if (introText) {
          introText.textContent = error.message || 'Directory data could not be loaded.';
        }
        showProfilePrompt(error.message || 'Directory data could not be loaded.');
      });
  }

  // Display students
  function displayStudents() {
    const tbody = document.getElementById('students-tbody');
    const message = document.getElementById('students-message');
    const columnCount = canLecturerMessageStudents ? 4 : 3;

    if (studentActionHeader) {
      studentActionHeader.hidden = !canLecturerMessageStudents;
    }

    if (!directoryState.profileComplete) {
      tbody.innerHTML = `<tr><td colspan="${columnCount}" style="text-align: center;">Update your profile to access your class directory.</td></tr>`;
      message.textContent = '';
      return;
    }

    if (allStudents.length === 0) {
      tbody.innerHTML = `<tr><td colspan="${columnCount}" style="text-align: center;">No students registered yet</td></tr>`;
      message.textContent = '';
      return;
    }

    tbody.innerHTML = allStudents.map(student => `
      <tr>
        <td><strong>${student.name}</strong></td>
        <td>${student.regNumber}</td>
        <td>${student.email}</td>
        ${canLecturerMessageStudents ? `<td><button class="directory-action-btn" type="button" data-message-student="${student.id}" data-student-name="${escapeHtml(student.name)}">Message</button></td>` : ''}
      </tr>
    `).join('');

    message.textContent = directoryState.filterConfigured
      ? `${allStudents.length} student(s) in your academic circle`
      : `${allStudents.length} student(s) found`;
  }

  function bindStudentMessageButtons() {
    document.querySelectorAll('[data-message-student]').forEach((button) => {
      button.addEventListener('click', () => {
        openDirectMessageModal({
          studentId: button.getAttribute('data-message-student') || '',
          studentName: button.getAttribute('data-student-name') || ''
        });
      });
    });
  }

  // Display lecturers
  function displayLecturers() {
    const tbody = document.getElementById('lecturers-tbody');
    const message = document.getElementById('lecturers-message');

    if (!directoryState.profileComplete) {
      tbody.innerHTML = '<tr><td colspan="2" style="text-align: center;">Update your profile to view lecturers for your department.</td></tr>';
      message.textContent = '';
      return;
    }

    if (allLecturers.length === 0) {
      tbody.innerHTML = '<tr><td colspan="2" style="text-align: center;">No lecturers found</td></tr>';
      message.textContent = '';
      return;
    }

    tbody.innerHTML = allLecturers.map(lecturer => `
      <tr>
        <td><strong>${lecturer.name}</strong></td>
        <td>${lecturer.email}</td>
      </tr>
    `).join('');

    message.textContent = directoryState.filterConfigured
      ? `${allLecturers.length} lecturer(s) attached to your department`
      : `${allLecturers.length} lecturer(s) found`;
  }

  // Tab switching
  tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      currentTab = btn.dataset.tab;
      
      tabButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      tabContents.forEach(content => content.classList.remove('active'));
      document.getElementById(`${currentTab}-tab`).classList.add('active');

      filterDirectory();
    });
  });

  // Search and filter
  searchInput.addEventListener('input', filterDirectory);

  function filterDirectory() {
    if (!directoryState.profileComplete) {
      return;
    }

    const searchValue = searchInput.value.toLowerCase();

    if (currentTab === 'students') {
      const rows = document.querySelectorAll('#students-tbody tr');
      let visibleCount = 0;

      rows.forEach(row => {
        const text = row.textContent.toLowerCase();
        const matches = text.includes(searchValue);
        row.style.display = matches ? '' : 'none';
        if (matches) visibleCount++;
      });

      const message = document.getElementById('students-message');
      message.textContent = visibleCount === 0 ? 
        'No students match your search' : 
        directoryState.filterConfigured
          ? `${visibleCount} student(s) shown in your academic circle`
          : `${visibleCount} student(s) shown`;
    } else if (currentTab === 'lecturers') {
      const rows = document.querySelectorAll('#lecturers-tbody tr');
      let visibleCount = 0;

      rows.forEach(row => {
        const text = row.textContent.toLowerCase();
        const matches = text.includes(searchValue);
        row.style.display = matches ? '' : 'none';
        if (matches) visibleCount++;
      });

      const message = document.getElementById('lecturers-message');
      message.textContent = visibleCount === 0 ? 
        'No lecturers match your search' : 
        directoryState.filterConfigured
          ? `${visibleCount} lecturer(s) shown for your department`
          : `${visibleCount} lecturer(s) shown`;
    }
  }

  function showProfilePrompt(message) {
    if (promptCard) {
      promptCard.hidden = false;
    }
    if (promptText) {
      promptText.textContent = message;
    }
    if (directoryTabs) {
      directoryTabs.style.display = 'none';
    }
    if (searchBar) {
      searchBar.style.display = 'none';
    }
    if (introText) {
      introText.textContent = 'Finish your academic profile first, then come back to see only the right students and lecturers.';
    }
  }

  function hideProfilePrompt() {
    if (promptCard) {
      promptCard.hidden = true;
    }
    if (directoryTabs) {
      directoryTabs.style.display = '';
    }
    if (searchBar) {
      searchBar.style.display = '';
    }
  }

  function openDirectMessageModal({ studentId, studentName }) {
    if (!studentId || !studentName) {
      showAlert('Student target could not be resolved.', 'error');
      return;
    }

    const existing = document.querySelector('.app-modal-overlay');
    if (existing) {
      existing.remove();
    }

    const overlay = document.createElement('div');
    overlay.className = 'app-modal-overlay';
    overlay.innerHTML = `
      <div class="app-modal" role="dialog" aria-modal="true">
        <div class="app-modal-content">
          <h3>Message ${escapeHtml(studentName)}</h3>
          <form id="direct-message-form" class="direct-message-form">
            <label>
              Message
              <textarea id="direct-message-text" rows="5" placeholder="Write a short message for this student..." required></textarea>
            </label>
            <label>
              Optional label
              <input id="direct-message-course" type="text" value="DIRECT" placeholder="DIRECT">
            </label>
            <div class="app-modal-actions">
              <button class="app-modal-button app-modal-button-secondary" type="button" data-direct-cancel>Cancel</button>
              <button class="app-modal-button app-modal-button-primary" type="submit">Send Message</button>
            </div>
          </form>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    overlay.querySelector('[data-direct-cancel]').addEventListener('click', () => {
      overlay.remove();
    });

    overlay.querySelector('#direct-message-form').addEventListener('submit', async (event) => {
      event.preventDefault();
      const textField = overlay.querySelector('#direct-message-text');
      const courseField = overlay.querySelector('#direct-message-course');
      const messageText = String(textField.value || '').trim();
      const courseCode = String(courseField.value || '').trim().toUpperCase() || 'DIRECT';

      if (!messageText) {
        showAlert('Message text is required.', 'error');
        return;
      }

      try {
        await AUTH.sendDirectStudentMessageDb({
          studentId,
          studentName,
          courseCode,
          text: messageText
        });
        overlay.remove();
        showAlert(`Private message sent to ${studentName}.`, 'success');
      } catch (error) {
        showAlert(error.message || 'Unable to send direct message.', 'error');
      }
    });
  }

  function escapeHtml(value) {
    return String(value || '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#39;');
  }

  // Initial load
  loadData();
});
