document.addEventListener('DOMContentLoaded', () => {
  // Protect route - redirect if not logged in
  AUTH.protectRoute();
  initDashboard().catch((error) => {
    console.error(error);
  });
});

async function initDashboard() {
  const summary = await AUTH.getDashboardSummaryDb();
  const user = summary.user;
  const isStudent = AUTH.isStudent();
  const isLecturer = AUTH.isLecturer();

  // Set day badge
  const dayBadge = document.getElementById('dashboard-day-badge') || document.getElementById('lecturer-day-badge');
  if (dayBadge) {
    const today = new Date().toLocaleDateString(undefined, { weekday: 'long' });
    dayBadge.textContent = `${today} - ${isStudent ? 'Study' : 'Lecturer'} mode active`;
  }

  // STUDENT DASHBOARD
  if (isStudent) {
    document.getElementById('student-dashboard').style.display = 'block';
    document.getElementById('lecturer-dashboard').style.display = 'none';

    const greeting = document.getElementById('dashboard-greeting');
    if (greeting) {
      greeting.textContent = `Welcome, ${user.firstName}`;
    }

    const roleSubtitle = document.getElementById('role-subtitle');
    if (roleSubtitle) {
      roleSubtitle.textContent = 'Daily academic dashboard';
    }

    const attendanceCount = document.getElementById('student-attendance-count');
    if (attendanceCount) {
      attendanceCount.textContent = summary.attendanceCount;
    }

    const courseCount = document.getElementById('student-course-count');
    if (courseCount) {
      courseCount.textContent = summary.courseCount;
    }

    // Load timetable preview
    loadTimetablePreview();
  }

  // LECTURER DASHBOARD
  if (isLecturer) {
    document.getElementById('student-dashboard').style.display = 'none';
    document.getElementById('lecturer-dashboard').style.display = 'block';

    const greeting = document.getElementById('lecturer-greeting');
    if (greeting) {
      greeting.textContent = `Welcome, ${user.firstName}`;
    }

    const roleSubtitle = document.getElementById('role-subtitle');
    if (roleSubtitle) {
      roleSubtitle.textContent = `Lecturer Portal`;
    }

    const activeSessionsEl = document.getElementById('lecturer-active-sessions');
    if (activeSessionsEl) {
      activeSessionsEl.textContent = summary.activeSessions;
    }

    const totalAttendanceEl = document.getElementById('lecturer-total-attendance');
    if (totalAttendanceEl) {
      totalAttendanceEl.textContent = summary.totalAttendance;
    }

    const classCountEl = document.getElementById('lecturer-class-count');
    if (classCountEl) {
      classCountEl.textContent = summary.classCount;
    }
  }
}

async function loadTimetablePreview() {
  try {
    const entries = await AUTH.getTimetablesDb();
    const today = new Date().toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
    const todayEntries = entries.filter(e => e.dayOfWeek.toLowerCase() === today);

    const previewEl = document.getElementById('timetablePreview');
    if (!previewEl) return;

    if (todayEntries.length === 0) {
      previewEl.innerHTML = 'No classes scheduled for today.';
      return;
    }

    const now = new Date();
    const currentTime = now.getHours() * 60 + now.getMinutes();
    const upcoming = todayEntries.filter(e => {
      const [hours, minutes] = e.startTime.split(':').map(Number);
      const entryTime = hours * 60 + minutes;
      return entryTime > currentTime;
    }).sort((a, b) => a.startTime.localeCompare(b.startTime));

    if (upcoming.length === 0) {
      previewEl.innerHTML = 'No more classes today.';
      return;
    }

    const next = upcoming[0];
    previewEl.innerHTML = `Next: ${next.courseCode} at ${next.startTime} in ${next.venue || 'TBA'}`;
  } catch (error) {
    console.error('Failed to load timetable preview:', error);
    const previewEl = document.getElementById('timetablePreview');
    if (previewEl) {
      previewEl.innerHTML = 'Unable to load timetable.';
    }
  }
}
