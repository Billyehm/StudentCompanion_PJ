document.addEventListener('DOMContentLoaded', () => {
  // Protect route - only lecturers
  AUTH.protectRoute('lecturer');

  const sessionSelect = document.getElementById('session-select');
  const searchInput = document.getElementById('search-input');
  const downloadBtn = document.getElementById('download-btn');
  const downloadLegitBtn = document.getElementById('download-legit-btn');
  const downloadFlaggedBtn = document.getElementById('download-flagged-btn');
  const tbody = document.getElementById('attendance-tbody');
  const totalRecordsEl = document.getElementById('total-records');
  const flaggedRecordsEl = document.getElementById('flagged-records');

  let allRecords = [];
  let filteredRecords = [];

  // Load sessions
  async function loadSessions() {
    const currentSessionId = new URLSearchParams(window.location.search).get('sessionId');

    sessionSelect.innerHTML = '<option value="">-- All Sessions --</option>';

    try {
      const sessions = await AUTH.getMyQRSessionsDb();
      sessions.forEach(session => {
        const option = document.createElement('option');
        option.value = session.id;
        option.textContent = `${session.courseCode} - ${session.courseTitle} (${new Date(session.createdAt).toLocaleDateString()})`;
        if (currentSessionId === session.id) {
          option.selected = true;
        }
        sessionSelect.appendChild(option);
      });
    } catch (error) {
      tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: rgba(255,255,255,0.6);">${error.message || 'Unable to load sessions.'}</td></tr>`;
      totalRecordsEl.textContent = '0';
      if (flaggedRecordsEl) {
        flaggedRecordsEl.textContent = '0';
      }
      return;
    }

    if (currentSessionId) {
      sessionSelect.value = currentSessionId;
    }
    loadAttendance();
  }

  // Load attendance records
  async function loadAttendance() {
    const selectedSessionId = sessionSelect.value;

    try {
      allRecords = await AUTH.getLecturerAttendanceRecordsDb(selectedSessionId);
    } catch (error) {
      tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: rgba(255,255,255,0.6);">${error.message || 'Unable to load attendance records.'}</td></tr>`;
      totalRecordsEl.textContent = '0';
      if (flaggedRecordsEl) {
        flaggedRecordsEl.textContent = '0';
      }
      return;
    }

    filteredRecords = [...allRecords];
    displayRecords();
  }

  // Display records in table
  function displayRecords() {
    if (filteredRecords.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: rgba(255,255,255,0.6);">No attendance records found</td></tr>';
      totalRecordsEl.textContent = '0';
      if (flaggedRecordsEl) {
        flaggedRecordsEl.textContent = '0';
      }
      return;
    }

    tbody.innerHTML = filteredRecords.map(record => `
      <tr class="${record.isFlagged ? 'flagged-row' : ''}">
        <td>${record.userName}</td>
        <td><strong>${record.regNumber}</strong></td>
        <td>${record.courseCode}</td>
        <td>${record.scannedAtDisplay}</td>
        <td><span class="flag-badge ${record.isFlagged ? 'flagged' : 'clean'}">${record.integrityLabel}</span></td>
        <td>${escapeHtml(record.flagReasons.join(' ' ) || 'Clear')}</td>
      </tr>
    `).join('');

    totalRecordsEl.textContent = filteredRecords.length;
    if (flaggedRecordsEl) {
      flaggedRecordsEl.textContent = String(filteredRecords.filter((record) => record.isFlagged).length);
    }
  }

  // Search functionality
  searchInput.addEventListener('input', (e) => {
    const searchTerm = e.target.value.toLowerCase();
    
    filteredRecords = allRecords.filter(record =>
      record.regNumber.toLowerCase().includes(searchTerm) ||
      record.userName.toLowerCase().includes(searchTerm) ||
      record.courseCode.toLowerCase().includes(searchTerm) ||
      record.flagReasons.join(' ').toLowerCase().includes(searchTerm)
    );

    displayRecords();
  });

  function exportRecords(records, sheetName, filenamePrefix) {
    if (!records.length) {
      showAlert('No records to download', 'info');
      return;
    }

    const data = records.map(record => ({
      'Student Name': record.userName,
      'Reg Number': record.regNumber,
      'Course Code': record.courseCode,
      'Course Title': record.className,
      'Scanned Time': record.scannedAtDisplay,
      Status: record.integrityLabel,
      'Flag Reason': record.flagReasons.join(' '),
      'Location Verified': record.locationVerified ? 'Yes' : 'No',
      'Within Geofence': record.withinGeofence === null ? 'Unknown' : (record.withinGeofence ? 'Yes' : 'No'),
      'Distance From Class (m)': record.geoDistanceMeters ?? '',
      'Allowed Radius (m)': record.geofenceRadiusMeters ?? '',
      'Device Label': record.deviceLabel || ''
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, sheetName);

    // Auto-size columns
    const colWidths = [
      { wch: 20 },
      { wch: 15 },
      { wch: 15 },
      { wch: 25 },
      { wch: 20 },
      { wch: 12 },
      { wch: 60 },
      { wch: 16 },
      { wch: 16 },
      { wch: 18 },
      { wch: 18 },
      { wch: 40 }
    ];
    ws['!cols'] = colWidths;

    const filename = `${filenamePrefix}_${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(wb, filename);
  }

  // Download as Excel
  downloadBtn.addEventListener('click', () => {
    exportRecords(filteredRecords, 'Attendance', 'Attendance_All');
  });

  if (downloadLegitBtn) {
    downloadLegitBtn.addEventListener('click', () => {
      exportRecords(filteredRecords.filter((record) => !record.isFlagged), 'LegitAttendance', 'Attendance_Legit');
    });
  }

  if (downloadFlaggedBtn) {
    downloadFlaggedBtn.addEventListener('click', () => {
      exportRecords(filteredRecords.filter((record) => record.isFlagged), 'FlaggedAttendance', 'Attendance_Flagged');
    });
  }

  // Session select change
  sessionSelect.addEventListener('change', loadAttendance);

  // Initial load
  loadSessions();

  function escapeHtml(value) {
    return String(value || '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#39;');
  }
});
