document.addEventListener('DOMContentLoaded', () => {
  AUTH.protectRoute('lecturer');

  const qrForm = document.getElementById('qr-form');
  const currentSessionDiv = document.getElementById('current-session');
  const qrcodeContainer = document.getElementById('qrcode-container');
  const sessionsList = document.getElementById('sessions-list');
  const downloadBtn = document.getElementById('download-qr-btn');
  const courseCodeInput = document.getElementById('course-code');
  const courseTitleInput = document.getElementById('course-title');
  const courseOptions = document.getElementById('lecturer-course-options');
  const geofenceRadiusInput = document.getElementById('geofence-radius');
  const geofenceStatus = document.getElementById('geofence-status');
  const captureLocationBtn = document.getElementById('capture-location-btn');

  let currentQRCode = null;
  let currentSession = null;
  let refreshInterval = null;
  let availableCourses = [];
  let capturedLocation = null;

  initCoursePicker().catch((error) => {
    showAlert(error.message || 'Unable to load your course list.', 'error');
  });

  qrForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const courseCode = courseCodeInput.value.trim().toUpperCase();
    const courseTitle = courseTitleInput.value.trim();
    const duration = parseInt(document.getElementById('duration').value, 10);
    const geofenceRadius = parseInt(geofenceRadiusInput.value, 10);

    if (!courseCode || !courseTitle || !duration || !geofenceRadius) {
      showAlert('Please fill in all fields', 'error');
      return;
    }

    try {
      const location = capturedLocation || await captureCurrentLocation();
      currentSession = await AUTH.createQRSessionDb(courseCode, courseTitle, duration, {
        geofenceLatitude: location.latitude,
        geofenceLongitude: location.longitude,
        geofenceRadiusMeters: geofenceRadius
      });
      displayQRSession(currentSession);
      qrForm.reset();
      geofenceRadiusInput.value = String(geofenceRadius);
      refreshSessionsList();
    } catch (error) {
      showAlert(error.message || 'Unable to create the QR session.', 'error');
    }
  });

  if (captureLocationBtn) {
    captureLocationBtn.addEventListener('click', async () => {
      try {
        await captureCurrentLocation(true);
      } catch (error) {
        showAlert(error.message || 'Unable to capture your location.', 'error');
      }
    });
  }

  downloadBtn.addEventListener('click', () => {
    if (!currentSession) {
      showAlert('No QR session selected to download.', 'error');
      return;
    }
    downloadSessionQR(currentSession);
  });

  document.getElementById('close-session-btn').addEventListener('click', () => {
    if (currentSession) {
      currentSession = null;
      currentSessionDiv.style.display = 'none';
      clearInterval(refreshInterval);
      refreshSessionsList();
    }
  });

  document.getElementById('deactivate-session-btn').addEventListener('click', async () => {
    if (!currentSession) {
      showAlert('No active session to deactivate.', 'error');
      return;
    }

    try {
      await AUTH.deactivateQRSessionDb(currentSession.id);
    } catch (error) {
      showAlert(error.message || 'Unable to deactivate session.', 'error');
      return;
    }

    showAlert('Session deactivated successfully.', 'success');
    currentSession = null;
    currentSessionDiv.style.display = 'none';
    clearInterval(refreshInterval);
    refreshSessionsList();
  });

  refreshSessionsList();

  async function initCoursePicker() {
    availableCourses = await AUTH.getCoursesForCurrentUserDb({ includeAllLevels: true });
    if (courseOptions) {
      courseOptions.innerHTML = availableCourses.map((course) => (
        `<option value="${escapeHtmlAttr(course.course_code || '')}">${escapeHtmlAttr(course.course_title || '')}</option>`
      )).join('');
    }

    const syncCourseTitle = () => {
      const code = String(courseCodeInput.value || '').trim().toUpperCase();
      const matched = availableCourses.find((course) => String(course.course_code || '').toUpperCase() === code);
      if (matched && courseTitleInput) {
        courseTitleInput.value = matched.course_title || '';
      }
    };

    if (courseCodeInput) {
      courseCodeInput.addEventListener('input', syncCourseTitle);
      courseCodeInput.addEventListener('change', syncCourseTitle);
      courseCodeInput.addEventListener('focus', syncCourseTitle);
    }
  }

  async function captureCurrentLocation(manual = false) {
    if (!navigator.geolocation) {
      updateGeofenceStatus('Geolocation is not supported in this browser.', 'error');
      throw new Error('Geolocation is not supported in this browser.');
    }

    updateGeofenceStatus(manual ? 'Capturing your current lecturer location...' : 'Checking lecturer location for this session...', 'pending');

    const position = await new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0
      });
    }).catch((error) => {
      const message = error && error.code === error.PERMISSION_DENIED
        ? 'Location permission was denied.'
        : 'Unable to capture your current location.';
      updateGeofenceStatus(`${message} Geofence protection cannot be enabled.`, 'error');
      throw new Error(message);
    });

    capturedLocation = {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
      accuracyMeters: position.coords.accuracy
    };

    updateGeofenceStatus(
      `Lecturer location locked. Accuracy: ${Math.round(position.coords.accuracy)}m.`,
      'success'
    );
    return capturedLocation;
  }

  function updateGeofenceStatus(message, type) {
    if (!geofenceStatus) {
      return;
    }
    geofenceStatus.textContent = message;
    geofenceStatus.className = `geo-status${type ? ` ${type}` : ''}`;
  }

  function displayQRSession(session) {
    currentSession = session;
    qrcodeContainer.innerHTML = '';
    document.getElementById('session-course-value').textContent =
      `${session.courseCode} - ${session.courseTitle}`;
    document.getElementById('qr-print-header').textContent =
      `${session.courseCode} - ${session.courseTitle}`;
    document.getElementById('session-scans').textContent = String(session.attendanceCount || 0);
    document.getElementById('session-geofence-radius').textContent = `${Math.round(session.geofenceRadiusMeters || 0)}m`;

    currentQRCode = new QRCode(qrcodeContainer, {
      text: session.qrData,
      width: 256,
      height: 256,
      colorDark: '#000000',
      colorLight: '#ffffff',
      correctLevel: QRCode.CorrectLevel.H
    });

    currentSessionDiv.style.display = 'block';
    startCountdown();
  }

  function startCountdown() {
    if (refreshInterval) clearInterval(refreshInterval);

    refreshInterval = setInterval(() => {
      if (!currentSession) {
        clearInterval(refreshInterval);
        return;
      }

      const now = new Date();
      const expires = new Date(currentSession.expiresAt);
      const diff = expires - now;

      if (diff <= 0) {
        document.getElementById('session-expiry').textContent = 'Expired';
        AUTH.getAttendanceBySessionDb(currentSession.id)
          .then((rows) => {
            document.getElementById('session-scans').textContent = rows.length;
          })
          .catch(() => {
            document.getElementById('session-scans').textContent = '0';
          });
        clearInterval(refreshInterval);
        return;
      }

      const minutes = Math.floor(diff / 60000);
      const seconds = Math.floor((diff % 60000) / 1000);
      document.getElementById('session-expiry').textContent = `${minutes}m ${seconds}s`;

      AUTH.getAttendanceBySessionDb(currentSession.id)
        .then((rows) => {
          document.getElementById('session-scans').textContent = rows.length;
        })
        .catch(() => {
          document.getElementById('session-scans').textContent = '0';
        });
    }, 1000);
  }

  async function refreshSessionsList() {
    let sessions = [];
    try {
      sessions = await AUTH.getMyQRSessionsDb();
    } catch (error) {
      sessionsList.innerHTML = `<p style="color: rgba(255,255,255,0.6);">${escapeHtml(error.message || 'Unable to load QR sessions.')}</p>`;
      return;
    }

    if (sessions.length === 0) {
      sessionsList.innerHTML = '<p style="color: rgba(255,255,255,0.6);">No QR sessions created yet.</p>';
      return;
    }

    sessionsList.innerHTML = sessions.map(session => `
      <div class="card" style="margin-bottom: 1rem;">
        <div style="display: flex; justify-content: space-between; align-items: start;">
          <div>
            <h4 style="margin: 0 0 0.5rem 0;">${escapeHtml(session.courseCode)} - ${escapeHtml(session.courseTitle)}</h4>
            <p style="margin: 0.3rem 0; font-size: 0.9rem; color: rgba(255,255,255,0.7);">
              Created: ${new Date(session.createdAt).toLocaleString()}
            </p>
            <p style="margin: 0.3rem 0; font-size: 0.9rem; color: rgba(255,255,255,0.7);">
              Duration: ${session.durationMinutes} minutes
            </p>
            <p style="margin: 0.3rem 0; font-size: 0.9rem; color: rgba(255,255,255,0.7);">
              Geofence: ${Math.round(session.geofenceRadiusMeters || 0)}m
            </p>
            <p style="margin: 0.3rem 0; font-size: 0.9rem; color: rgba(255,255,255,0.7);">
              Attendance Count: <strong>${session.attendanceCount}</strong>
            </p>
          </div>
          <div style="text-align: right;">
            <span class="badge" style="background: ${session.isDeactivated ? '#6b7280' : session.isExpired ? '#ff6b6b' : '#4CAF50'};">
              ${session.isDeactivated ? 'Deactivated' : session.isExpired ? 'Expired' : 'Active'}
            </span>
          </div>
        </div>
        <div style="display: flex; gap: 0.75rem; flex-wrap: wrap; margin-top: 1rem;">
          ${session.isDeactivated || session.isExpired ? `<button class="btn btn-small" disabled style="flex: 1 1 auto; opacity: 0.6; cursor: not-allowed;">Unavailable</button>` : `<button class="btn btn-small" style="flex: 1 1 auto;" onclick="showSessionQRCode('${session.id}'); return false;">Show QR</button>`}
          <a href="#" onclick="viewAttendanceForSession('${session.id}'); return false;" class="btn btn-small" style="flex: 1 1 auto;">
            View Attendance
          </a>
        </div>
      </div>
    `).join('');
  }

  window.viewAttendanceForSession = (sessionId) => {
    window.location.href = `lecturer-attendance.html?sessionId=${sessionId}`;
  };

  window.showSessionQRCode = async (sessionId) => {
    try {
      const session = await AUTH.getQRSessionDb(sessionId);
      if (!session) {
        showAlert('Session not found', 'error');
        return;
      }
      if (session.isExpired || session.isDeactivated) {
        showAlert('This session is no longer available. The QR cannot be shown again.', 'error');
        return;
      }
      displayQRSession(session);
    } catch (error) {
      showAlert(error.message || 'Unable to load the selected QR session.', 'error');
    }
  };

  function downloadSessionQR(session) {
    const qrElement = qrcodeContainer.querySelector('img, canvas');
    if (!qrElement) {
      showAlert('No QR code available to download.', 'error');
      return;
    }

    const qrDataUrl = qrElement.tagName === 'IMG'
      ? qrElement.src
      : qrElement.toDataURL('image/png');

    const image = new Image();
    image.onload = () => {
      const padding = 24;
      const headerHeight = 120;
      const width = image.width + padding * 2;
      const height = image.height + headerHeight + padding * 2;
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');

      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, width, height);

      ctx.fillStyle = '#111827';
      ctx.textAlign = 'center';
      ctx.font = 'bold 24px Arial';
      wrapText(ctx, `${session.courseCode} - ${session.courseTitle}`, width / 2, 40, width - 40, 28);

      ctx.drawImage(image, padding, headerHeight, image.width, image.height);

      const link = document.createElement('a');
      link.href = canvas.toDataURL('image/png');
      link.download = `${session.courseCode}_${session.courseTitle}_QR.png`
        .replace(/\s+/g, '_')
        .replace(/[^a-zA-Z0-9_\.\-]/g, '');
      document.body.appendChild(link);
      link.click();
      link.remove();
    };
    image.src = qrDataUrl;
  }

  function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
    const words = text.split(' ');
    let line = '';
    for (let n = 0; n < words.length; n++) {
      const testLine = line + words[n] + ' ';
      const metrics = ctx.measureText(testLine);
      const testWidth = metrics.width;
      if (testWidth > maxWidth && n > 0) {
        ctx.fillText(line.trim(), x, y);
        line = words[n] + ' ';
        y += lineHeight;
      } else {
        line = testLine;
      }
    }
    ctx.fillText(line.trim(), x, y);
  }

  function escapeHtml(value) {
    return String(value || '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#39;');
  }

  function escapeHtmlAttr(value) {
    return escapeHtml(value);
  }
});
