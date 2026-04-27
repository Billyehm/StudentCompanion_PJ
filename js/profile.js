AUTH.protectRoute();

const currentUser = AUTH.getCurrentUser() || {
  userId: '',
  name: '',
  email: '',
  regNumber: '',
  role: 'student'
};
const isLecturer = AUTH.isLecturer();
const isStudent = AUTH.isStudent();

const FACULTY_DEPARTMENTS = {
  'Science and Computing': [
    'Computer Science',
    'Information Technology',
    'Software Engineering',
    'Mathematics',
    'Statistics',
    'Physics',
    'Chemistry',
    'Biology'
  ],
  Engineering: [
    'Electrical Engineering',
    'Mechanical Engineering',
    'Civil Engineering',
    'Chemical Engineering'
  ],
  'Social and Management Sciences': [
    'Economics',
    'Accounting',
    'Business Administration',
    'Political Science',
    'Mass Communication'
  ],
  Arts: [
    'English',
    'History',
    'Theatre Arts',
    'Linguistics'
  ],
  Education: [
    'Educational Management',
    'Guidance and Counselling',
    'Science Education'
  ],
  Law: ['Law'],
  Medicine: ['Medicine', 'Nursing', 'Medical Laboratory Science']
};

const LEVEL_OPTIONS = ['100', '200', '300', '400', '500'];

const roleDisplay = document.getElementById('role-badge');
const subtitleDisplay = document.getElementById('page-subtitle');
const profileDescription = document.getElementById('profile-description');
const profileNameDisplay = document.getElementById('profile-name-display');
const profileRoleDisplay = document.getElementById('profile-role-display');
const avatarDisplay = document.getElementById('profile-avatar-display');
const studentProfile = document.getElementById('student-profile');
const lecturerProfile = document.getElementById('lecturer-profile');
const bottomLogoutBtn = document.getElementById('profile-logout-bottom');
const profilePanel = document.getElementById('profile-panel');
const securityPanel = document.getElementById('security-panel');
const profileTabButton = document.getElementById('tab-profile-btn');
const securityTabButton = document.getElementById('tab-security-btn');

profileNameDisplay.textContent = currentUser.name || 'Your Name';
profileRoleDisplay.textContent = isLecturer ? 'Lecturer' : 'Student';
avatarDisplay.textContent = (currentUser.name || 'U').charAt(0).toUpperCase();

if (isLecturer) {
  studentProfile.style.display = 'none';
  lecturerProfile.style.display = 'block';
  roleDisplay.textContent = 'Lecturer';
  subtitleDisplay.textContent = 'Complete Your Lecturer Profile';
  profileDescription.textContent = 'Manage your teaching profile.';
  initLecturerProfile().catch(handleProfileError);
} else if (isStudent) {
  studentProfile.style.display = 'block';
  lecturerProfile.style.display = 'none';
  roleDisplay.textContent = 'Student';
  subtitleDisplay.textContent = 'Complete Your Academic Profile';
  profileDescription.textContent = 'Manage your academic profile.';
  initStudentProfile().catch(handleProfileError);
}

initProfileTabs();
initSecuritySettings().catch(handleProfileError);

if (bottomLogoutBtn) {
  bottomLogoutBtn.addEventListener('click', () => {
    if (typeof showConfirm === 'function') {
      showConfirm('Are you sure you want to logout?', () => {
        AUTH.logout();
      });
      return;
    }
    AUTH.logout();
  });
}

async function initStudentProfile() {
  const form = document.getElementById('student-form');
  const message = document.getElementById('student-message');
  const saveButton = document.getElementById('student-save-btn');
  const note = document.getElementById('student-lock-note');
  const facultySelect = document.getElementById('student-faculty');
  const departmentSelect = document.getElementById('student-department');
  const levelSelect = document.getElementById('student-level');

  const studentData = await AUTH.refreshCurrentUserFromDb();
  const academicLocked = Boolean(studentData && studentData.faculty && studentData.department && studentData.level);

  document.getElementById('student-name').value = studentData.name || currentUser.name || '';
  document.getElementById('student-id').value = studentData.regNumber || currentUser.regNumber || currentUser.userId || '';
  document.getElementById('student-email').value = studentData.email || currentUser.email || '';

  populateFacultyOptions(facultySelect);
  populateLevelOptions(levelSelect);
  facultySelect.value = studentData.faculty || '';
  populateDepartmentOptions(departmentSelect, facultySelect.value, studentData.department || '');
  levelSelect.value = studentData.level || '';

  facultySelect.addEventListener('change', () => {
    populateDepartmentOptions(departmentSelect, facultySelect.value);
  });

  applyAcademicLock({
    locked: academicLocked,
    controls: [facultySelect, departmentSelect, levelSelect],
    saveButton,
    note
  });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();

    if (academicLocked) {
      showMessage(message, 'This academic profile has been locked. Contact an admin for changes.', 'error');
      return;
    }

    const payload = {
      faculty: facultySelect.value,
      department: departmentSelect.value,
      level: levelSelect.value
    };

    if (!payload.faculty || !payload.department || !payload.level) {
      showMessage(message, 'Faculty, department, and level are required.', 'error');
      return;
    }

    await AUTH.saveAcademicProfileDb(payload);

    applyAcademicLock({
      locked: true,
      controls: [facultySelect, departmentSelect, levelSelect],
      saveButton,
      note
    });

    showMessage(message, 'Profile completed and saved successfully.', 'success');
  });
}

async function initLecturerProfile() {
  const form = document.getElementById('lecturer-form');
  const message = document.getElementById('lecturer-message');
  const saveButton = document.getElementById('lecturer-save-btn');
  const note = document.getElementById('lecturer-lock-note');
  const facultySelect = document.getElementById('lecturer-faculty');
  const departmentSelect = document.getElementById('lecturer-department');
  const levelSelect = document.getElementById('lecturer-level');
  const titleInput = document.getElementById('lecturer-title');
  const nameInput = document.getElementById('lecturer-name');
  const lecturerData = await AUTH.refreshCurrentUserFromDb();
  const academicLocked = Boolean(lecturerData && lecturerData.faculty && lecturerData.department && lecturerData.title);
  const canEditNameOnce = Boolean(lecturerData && !lecturerData.nameChangedAt);

  nameInput.value = lecturerData.name || currentUser.name || '';
  nameInput.readOnly = !canEditNameOnce;
  document.getElementById('lecturer-email').value = lecturerData.email || currentUser.email || '';
  if (titleInput) {
    titleInput.value = lecturerData.title || 'Lecturer';
  }

  populateFacultyOptions(facultySelect);
  populateLecturerLevelOptions(levelSelect);
  facultySelect.value = lecturerData.faculty || '';
  populateDepartmentOptions(departmentSelect, facultySelect.value, lecturerData.department || '');
  levelSelect.value = lecturerData.level || '';

  facultySelect.addEventListener('change', () => {
    populateDepartmentOptions(departmentSelect, facultySelect.value);
  });

  applyAcademicLock({
    locked: academicLocked,
    controls: [facultySelect, departmentSelect, levelSelect, titleInput],
    saveButton,
    note
  });

  if (academicLocked && canEditNameOnce && saveButton) {
    saveButton.disabled = false;
    saveButton.textContent = 'Save Name Change';
  }
  form.addEventListener('submit', async (event) => {
    event.preventDefault();

    const requestedName = nameInput.value.trim();
    const currentLecturerName = lecturerData.name || currentUser.name || '';
    const nameChanged = AUTH.normalizeName(requestedName) !== AUTH.normalizeName(currentLecturerName);

    if (academicLocked && !(canEditNameOnce && nameChanged)) {
      showMessage(message, 'This academic assignment has been locked. Contact an admin for changes.', 'error');
      return;
    }

    const title = titleInput ? titleInput.value.trim() : 'Lecturer';
    const payload = {
      name: requestedName,
      faculty: facultySelect.value || lecturerData.faculty || null,
      department: departmentSelect.value || lecturerData.department || null,
      level: levelSelect.value || lecturerData.level || null,
      title
    };

    if (!payload.name) {
      showMessage(message, 'Name is required.', 'error');
      return;
    }

    if (!title || !payload.faculty || !payload.department) {
      showMessage(message, 'Title, faculty, and department are required.', 'error');
      return;
    }

    const updatedLecturer = await AUTH.saveAcademicProfileDb(payload);
    nameInput.readOnly = true;
    currentUser.name = updatedLecturer.name;
    profileNameDisplay.textContent = updatedLecturer.name || 'Your Name';
    avatarDisplay.textContent = (updatedLecturer.name || 'U').charAt(0).toUpperCase();

    applyAcademicLock({
      locked: true,
      controls: [facultySelect, departmentSelect, levelSelect, titleInput],
      saveButton,
      note
    });

    showMessage(message, 'Profile completed and saved successfully.', 'success');
  });
}

function initProfileTabs() {
  if (!profileTabButton || !securityTabButton || !profilePanel || !securityPanel) {
    return;
  }

  profileTabButton.addEventListener('click', () => {
    setActivePanel('profile');
  });

  securityTabButton.addEventListener('click', () => {
    setActivePanel('security');
  });
}

function setActivePanel(panelName) {
  const showingProfile = panelName === 'profile';
  profileTabButton.classList.toggle('active', showingProfile);
  securityTabButton.classList.toggle('active', !showingProfile);
  profilePanel.classList.toggle('active', showingProfile);
  securityPanel.classList.toggle('active', !showingProfile);
}

async function initSecuritySettings() {
  const emailForm = document.getElementById('email-form');
  const passwordForm = document.getElementById('password-form');
  const emailInput = document.getElementById('security-email');
  const passwordInput = document.getElementById('security-password');
  const passwordConfirmInput = document.getElementById('security-password-confirm');
  const emailButton = document.getElementById('email-save-btn');
  const passwordButton = document.getElementById('password-save-btn');
  const emailCooldownNote = document.getElementById('email-cooldown-note');
  const passwordCooldownNote = document.getElementById('password-cooldown-note');
  const message = document.getElementById('security-message');

  if (!emailForm || !passwordForm || !emailInput || !passwordInput || !passwordConfirmInput) {
    return;
  }

  await refreshSecurityNotes();

  emailForm.addEventListener('submit', async (event) => {
    event.preventDefault();

    const nextEmail = emailInput.value.trim().toLowerCase();
    if (!nextEmail) {
      showMessage(message, 'Enter the new email address you want to use.', 'error');
      return;
    }

    if (nextEmail === String(currentUser.email || '').toLowerCase()) {
      showMessage(message, 'That is already your current email address.', 'error');
      return;
    }

    try {
      const updatedUser = await AUTH.updateEmailInDb(nextEmail);
      currentUser.email = updatedUser.email;
      updateReadonlyEmails(updatedUser.email);
      emailInput.value = '';
      showMessage(message, 'Email updated successfully.', 'success');
      await refreshSecurityNotes();
    } catch (error) {
      showMessage(message, error.message || 'Email update failed.', 'error');
      await refreshSecurityNotes();
    }
  });

  passwordForm.addEventListener('submit', async (event) => {
    event.preventDefault();

    const nextPassword = passwordInput.value.trim();
    const confirmedPassword = passwordConfirmInput.value.trim();

    if (!nextPassword || !confirmedPassword) {
      showMessage(message, 'Enter and confirm the new password.', 'error');
      return;
    }

    if (nextPassword !== confirmedPassword) {
      showMessage(message, 'The password confirmation does not match.', 'error');
      return;
    }

    try {
      await AUTH.updatePasswordInDb(nextPassword);
      passwordInput.value = '';
      passwordConfirmInput.value = '';
      showMessage(message, 'Password updated successfully.', 'success');
      await refreshSecurityNotes();
    } catch (error) {
      showMessage(message, error.message || 'Password update failed.', 'error');
      await refreshSecurityNotes();
    }
  });

  async function refreshSecurityNotes() {
    const securityStatus = await AUTH.getSecurityStatus();
    const emailPolicy = securityStatus.email;
    const passwordPolicy = securityStatus.password;

    emailButton.disabled = !emailPolicy.allowed;
    passwordButton.disabled = !passwordPolicy.allowed;
    emailInput.disabled = !emailPolicy.allowed;
    passwordInput.disabled = !passwordPolicy.allowed;
    passwordConfirmInput.disabled = !passwordPolicy.allowed;

    emailCooldownNote.textContent = emailPolicy.allowed ? '' : `Available in ${emailPolicy.daysRemaining} day(s).`;
    passwordCooldownNote.textContent = passwordPolicy.allowed ? '' : `Available in ${passwordPolicy.daysRemaining} day(s).`;
    emailCooldownNote.style.display = emailPolicy.allowed ? 'none' : 'block';
    passwordCooldownNote.style.display = passwordPolicy.allowed ? 'none' : 'block';
  }
}

function populateFacultyOptions(select) {
  if (!select) return;
  select.innerHTML = '<option value="">Select faculty</option>' + Object.keys(FACULTY_DEPARTMENTS)
    .map((faculty) => `<option value="${faculty}">${faculty}</option>`)
    .join('');
}

function populateDepartmentOptions(select, faculty, selectedValue = '') {
  if (!select) return;
  const departments = FACULTY_DEPARTMENTS[faculty] || [];
  select.innerHTML = '<option value="">Select department</option>' + departments
    .map((department) => `<option value="${department}">${department}</option>`)
    .join('');
  select.value = selectedValue;
}

function populateLevelOptions(select) {
  if (!select) return;
  select.innerHTML = '<option value="">Select level</option>' + LEVEL_OPTIONS
    .map((level) => `<option value="${level}">${level} Level</option>`)
    .join('');
}

function populateLecturerLevelOptions(select) {
  if (!select) return;
  select.innerHTML = '<option value="">All Levels</option>' + LEVEL_OPTIONS
    .map((level) => `<option value="${level}">${level} Level</option>`)
    .join('');
}

function applyAcademicLock({ locked, controls, saveButton, note }) {
  controls.forEach((control) => {
    control.disabled = locked;
  });

  if (saveButton) {
    saveButton.disabled = locked;
    saveButton.textContent = locked ? 'Locked By Admin Policy' : 'Save Profile';
  }

  if (note) {
    note.style.display = 'none';
  }
}

function updateReadonlyEmails(email) {
  const studentEmailInput = document.getElementById('student-email');
  const lecturerEmailInput = document.getElementById('lecturer-email');

  if (studentEmailInput) {
    studentEmailInput.value = email;
  }
  if (lecturerEmailInput) {
    lecturerEmailInput.value = email;
  }
}

function handleProfileError(error) {
  const target = document.getElementById('security-message') || document.getElementById('student-message') || document.getElementById('lecturer-message');
  if (target) {
    showMessage(target, error.message || 'Something went wrong while loading your profile.', 'error');
  }
}

function showMessage(element, text, type) {
  element.textContent = text;
  element.className = 'message';
  if (type === 'success') {
    element.className += ' success';
  } else if (type === 'error') {
    element.className += ' error';
  }
}
