let courseList = null;
let resultsMessage = null;
let cgpaValue = null;
let unitValue = null;
let savedCourseValue = null;
let resultsChart = null;
let resultsProfilePrompt = null;
let resultsPromptText = null;
let resultsContent = null;
let summaryStrip = null;

const gradeLabels = {
  5: 'A',
  4: 'B',
  3: 'C',
  2: 'D',
  1: 'E',
  0: 'F'
};

document.addEventListener('DOMContentLoaded', () => {
  // Initialize DOM references now that the document is ready
  courseList = document.getElementById('course-list');
  resultsMessage = document.getElementById('results-message');
  cgpaValue = document.getElementById('cgpa-value');
  unitValue = document.getElementById('unit-value');
  savedCourseValue = document.getElementById('saved-course-value');
  resultsChart = document.getElementById('results-chart');
  resultsProfilePrompt = document.getElementById('results-profile-prompt');
  resultsPromptText = document.getElementById('results-prompt-text');
  resultsContent = document.getElementById('results-content');
  summaryStrip = document.querySelector('.summary-strip');

  AUTH.protectRoute('student');
  loadResults().catch((error) => {
    if (/complete your academic profile/i.test(error.message || '')) {
      showProfilePrompt(error.message);
      return;
    }
    if (resultsMessage) {
      resultsMessage.textContent = error.message || 'Unable to load results.';
      resultsMessage.className = 'message error';
    }
  });
  // Hook up semester nav buttons
  const prevBtn = document.getElementById('prev-semester');
  const nextBtn = document.getElementById('next-semester');
  if (prevBtn) prevBtn.addEventListener('click', () => {
    if (semesterGroups.length === 0) return;
    // wrap-around navigation
    currentGroupIndex = (currentGroupIndex - 1 + semesterGroups.length) % semesterGroups.length;
    renderCoursesForCurrentGroup();
  });
  if (nextBtn) nextBtn.addEventListener('click', () => {
    if (semesterGroups.length === 0) return;
    // wrap-around navigation
    currentGroupIndex = (currentGroupIndex + 1) % semesterGroups.length;
    renderCoursesForCurrentGroup();
  });
});

let semesterGroups = [];
let currentGroupIndex = 0;

async function loadResults() {
  const currentUser = await AUTH.refreshCurrentUserFromDb();
  if (!currentUser) {
    AUTH.logout();
    return;
  }

  if (!AUTH.isAcademicProfileComplete(currentUser)) {
    showProfilePrompt(AUTH.getProfileCompletionMessage('results'));
    return;
  }

  hideProfilePrompt();
  const results = await AUTH.getStudentResultSheetDb();
  prepareSemesterGroups(results, currentUser);
  renderCoursesForCurrentGroup();
}

function prepareSemesterGroups(courses, currentUser) {
  // Build groups by level (100,200,...) and semester (1st,2nd).
  // Keep an 'All' group at index 0.
  const normalizeLevel = (lvl) => {
    if (!lvl) return null;
    const m = String(lvl).match(/(\d{3})/);
    return m ? `${m[1]}L` : String(lvl).toUpperCase();
  };

  const normalizeSemester = (s) => {
    if (!s) return '';
    const lower = String(s).toLowerCase();
    if (/2|second|2nd/.test(lower)) return '2nd';
    if (/1|first|1st/.test(lower)) return '1st';
    return lower;
  };

  const levelsSet = new Set();
  courses.forEach((c) => {
    const lv = normalizeLevel(c.level || c.levels || '');
    if (lv) levelsSet.add(lv);
  });

  // If no levels discovered, infer from current user's level
  if (!levelsSet.size && currentUser && currentUser.level) {
    const lv = normalizeLevel(currentUser.level);
    if (lv) levelsSet.add(lv);
  }

  // Build ordered levels (100L,200L,...)
  const levels = Array.from(levelsSet).sort((a, b) => {
    const ai = parseInt(a) || 0; const bi = parseInt(b) || 0; return ai - bi;
  });

  const groups = [];
  levels.forEach((lvl) => {
    ['1st', '2nd'].forEach((sem) => {
      const groupCourses = courses.filter((c) => {
        const cLvl = normalizeLevel(c.level || '');
        const cSem = normalizeSemester(c.semester || c.semester_name || '');
        return cLvl === lvl && (!sem || cSem === sem);
      });
      groups.push({ level: lvl, semester: sem, courses: groupCourses });
    });
  });

  // Also include any courses that didn't match level/semester grouping in a final 'Other' group
  const groupedSet = new Set(groups.flatMap(g => g.courses.map(c => c.course_code + '::' + (c.session_label||'') + '::' + (c.semester||''))));
  const others = courses.filter((c) => !groupedSet.has(c.course_code + '::' + (c.session_label||'') + '::' + (c.semester||'')));
  if (others.length) groups.push({ level: 'Other', semester: '', courses: others });

  // Do NOT include the combined 'All' group — only show specific level·semester groups
  semesterGroups = groups;

  // Default selection: prefer current user's level + 2nd semester; else fall back to any 2nd; else first group
  currentGroupIndex = 0;
  if (currentUser && currentUser.level) {
    const wantLevel = normalizeLevel(currentUser.level);
    for (let i = 0; i < semesterGroups.length; i++) {
      const g = semesterGroups[i];
      if (g.level === wantLevel && g.semester === '2nd') { currentGroupIndex = i; break; }
    }
  }

  if (!semesterGroups.length) return;

  if (semesterGroups.length && (!semesterGroups[currentGroupIndex] || semesterGroups[currentGroupIndex].courses.length === 0)) {
    // find any 2nd-semester group
    for (let i = 0; i < semesterGroups.length; i++) {
      if (semesterGroups[i].semester === '2nd') { currentGroupIndex = i; break; }
    }
  }

  if (semesterGroups.length && (!semesterGroups[currentGroupIndex] || semesterGroups[currentGroupIndex].courses.length === 0)) {
    currentGroupIndex = 0;
  }
}

function renderCoursesForCurrentGroup() {
  const group = semesterGroups[currentGroupIndex] || { courses: [] };
  let label = '';
  if (group.level) {
    label = group.level + (group.semester ? ` · ${group.semester}` : '');
  }
  const currentLabelEl = document.getElementById('current-semester');
  if (currentLabelEl) currentLabelEl.textContent = label;
  renderCourses(group.courses || []);
}

function showProfilePrompt(message) {
  if (resultsProfilePrompt) {
    resultsProfilePrompt.hidden = false;
  }
  if (resultsPromptText) {
    resultsPromptText.textContent = message;
  }
  if (resultsContent) {
    resultsContent.style.display = 'none';
  }
  if (summaryStrip) {
    summaryStrip.style.display = 'none';
  }
  if (resultsMessage) {
    resultsMessage.textContent = '';
    resultsMessage.className = 'message';
  }
}

function hideProfilePrompt() {
  if (resultsProfilePrompt) {
    resultsProfilePrompt.hidden = true;
  }
  if (resultsContent) {
    resultsContent.style.display = '';
  }
  if (summaryStrip) {
    summaryStrip.style.display = '';
  }
}

function renderCourses(courses) {
  if (!courseList || !cgpaValue || !unitValue || !savedCourseValue) {
    return;
  }

  if (!Array.isArray(courses) || !courses.length) {
    courseList.innerHTML = '<div class="empty-state">No courses are attached to your class yet.</div>';
    cgpaValue.textContent = '0.00';
    unitValue.textContent = '0';
    savedCourseValue.textContent = '0';
    if (resultsChart) {
      resultsChart.innerHTML = '<div class="empty-state">Your performance chart will appear here after grades are published.</div>';
    }
    return;
  }

  // CGPA: calculate across all provided courses (caller may pass full list or a group)
  const allGradedCourses = courses.filter((course) => course.hasPublishedGrade);
  const totalPoints = allGradedCourses.reduce((sum, course) => sum + (Number(course.units || 0) * Number(course.grade_point || 0)), 0);
  const totalUnits = allGradedCourses.reduce((sum, course) => sum + Number(course.units || 0), 0);
  const cgpa = totalUnits ? (totalPoints / totalUnits).toFixed(2) : '0.00';

  courseList.innerHTML = `
    <div class="table-wrap">
      <table class="results-table">
        <thead>
          <tr>
            <th>Course Code</th>
            <th>Course Title</th>
            <th>Units</th>
            <th>Grade</th>
          </tr>
        </thead>
        <tbody>
          ${courses.map((course) => `
            <tr>
              <td><strong>${escapeHtml(course.course_code || '-')}</strong></td>
              <td>
                ${escapeHtml(course.course_title || 'Course')}
                ${(course.semester || course.session_label) ? `<div class="muted" style="font-size: 0.85rem;">${escapeHtml([course.semester, course.session_label].filter(Boolean).join(' · '))}</div>` : ''}
              </td>
              <td>${Number(course.units || 0)}</td>
              <td>${escapeHtml(course.grade || '-')}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;

  cgpaValue.textContent = cgpa;
  unitValue.textContent = String(totalUnits);
  savedCourseValue.textContent = String(courses.length);

  // Render chart for the currently selected group (semester) showing semester GPA breakdown
  renderChartForSemester(courses);

  if (resultsMessage) {
    resultsMessage.textContent = 'Your class course sheet is shown below. Published grades appear in the table, and courses without grades show a dash.';
    resultsMessage.className = 'message success';
  }
}

function renderChart(courses) {
  // Deprecated: kept for compatibility. Use renderChartForSemester instead.
  return renderChartForSemester(courses);
}

function renderChartForSemester(courses) {
  if (!resultsChart) return;

  const graded = courses.filter((c) => c.hasPublishedGrade);
  if (!graded.length) {
    resultsChart.innerHTML = '<div class="empty-state">Your performance chart will appear after grades are published.</div>';
    return;
  }

  // Semester GPA
  const semPoints = graded.reduce((s, c) => s + (Number(c.units || 0) * Number(c.grade_point || 0)), 0);
  const semUnits = graded.reduce((s, c) => s + Number(c.units || 0), 0);
  const semGpa = semUnits ? (semPoints / semUnits).toFixed(2) : '0.00';

  // Bars for courses in this semester
  const bars = graded.map((course) => {
    const gradePoint = Number(course.grade_point || 0);
    const height = Math.max(16, gradePoint * 20);
    return `
      <div class="chart-bar">
        <div class="chart-bar-fill" style="height: ${height}px;"></div>
        <strong>${gradeLabels[gradePoint] || '-'}</strong>
        <span>${escapeHtml(course.course_code || course.course_title || 'Course')}</span>
      </div>
    `;
  }).join('');

  resultsChart.innerHTML = `
    <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:12px;">
      <div><strong>Semester GPA:</strong> ${semGpa}</div>
      <div><strong>CGPA:</strong> ${cgpaValue ? cgpaValue.textContent : '0.00'}</div>
    </div>
    <div class="chart-bars">${bars}</div>
  `;
}

function escapeHtml(value) {
  return String(value || '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}
