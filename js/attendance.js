document.addEventListener('DOMContentLoaded', () => {
  // Protect route - only students
  AUTH.protectRoute('student');

  const video = document.getElementById('video');
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  const toggleCameraBtn = document.getElementById('toggle-camera-btn');
  const resetBtn = document.getElementById('reset-scan-btn');
  const videoContainer = document.getElementById('video-container');
  const statusMessage = document.getElementById('status-message');
  const resultMessage = document.getElementById('result-message');
  const scanStatusBadge = document.getElementById('scan-status-badge');
  const scannerModeTitle = document.getElementById('scanner-mode-title');
  const scannerChip = document.getElementById('scanner-chip');
  const scannerCaption = document.getElementById('scanner-caption');
  const locationStatus = document.getElementById('scan-location-status');
  const locationTitle = document.getElementById('location-title');
  const locationText = document.getElementById('location-text');

  let isCameraActive = false;
  let stream = null;
  let scanFrameId = null;
  let isProcessingScan = false;
  let lastScanValue = '';
  let lastScanAt = 0;

  updateScannerState('idle', {
    badge: 'Ready to scan',
    chip: 'Idle',
    title: 'Camera ready when you are',
    captionTitle: 'Scanner idle',
    captionText: 'Open the camera to start automatic QR detection.'
  });

  // Toggle camera
  toggleCameraBtn.addEventListener('click', async () => {
    if (isCameraActive) {
      stopCamera();
    } else {
      await startCamera();
    }
  });

  // Start camera
  async function startCamera() {
    try {
      resultMessage.style.display = 'none';
      locationStatus.style.display = 'none';
      statusMessage.style.display = 'block';
      statusMessage.className = 'status-box pending scanner-card';
      document.getElementById('status-title').textContent = 'Requesting camera access...';
      document.getElementById('status-text').textContent = 'Please allow camera access in the browser.';
      updateScannerState('starting', {
        badge: 'Starting camera',
        chip: 'Starting',
        title: 'Opening your camera',
        captionTitle: 'Preparing scanner',
        captionText: 'Grant camera permission so live QR scanning can begin.'
      });

      stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: 'environment' }
        },
        audio: false
      });

      video.srcObject = stream;
      await video.play().catch(() => {});
      isCameraActive = true;
      toggleCameraBtn.textContent = 'Stop Camera';

      statusMessage.className = 'status-box pending scanner-card';
      document.getElementById('status-title').textContent = 'Scanning...';
      document.getElementById('status-text').textContent = 'Point your camera at the lecturer QR code. It will scan automatically.';
      updateScannerState('scanning', {
        badge: 'Scanning live',
        chip: 'Live',
        title: 'Scanner is live',
        captionTitle: 'Auto scan is on',
        captionText: 'Hold the QR code inside the frame and we will detect it automatically.'
      });

      scanQRCode();
    } catch (error) {
      statusMessage.style.display = 'block';
      statusMessage.className = 'status-box error scanner-card';
      document.getElementById('status-title').textContent = 'Camera Access Denied';
      document.getElementById('status-text').textContent =
        'Enable camera permissions in your browser settings and try again.';
      toggleCameraBtn.textContent = 'Start Camera';
      updateScannerState('error', {
        badge: 'Camera unavailable',
        chip: 'Blocked',
        title: 'Camera could not start',
        captionTitle: 'Scanner unavailable',
        captionText: 'Enable browser camera permission, then try again.'
      });
    }
  }

  // Stop camera
  function stopCamera() {
    if (scanFrameId) {
      cancelAnimationFrame(scanFrameId);
      scanFrameId = null;
    }
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      stream = null;
    }
    isCameraActive = false;
    video.srcObject = null;
    toggleCameraBtn.textContent = 'Start Camera';
    statusMessage.style.display = 'block';
    statusMessage.className = 'status-box pending scanner-card';
    document.getElementById('status-title').textContent = 'Camera stopped';
    document.getElementById('status-text').textContent = 'Start the camera again when you are ready to scan.';
    updateScannerState('idle', {
      badge: 'Camera stopped',
      chip: 'Idle',
      title: 'Camera ready when you are',
      captionTitle: 'Scanner idle',
      captionText: 'Open the camera to start automatic QR detection.'
    });
  }

  // Scan QR code
  function scanQRCode() {
    if (!isCameraActive || isProcessingScan) {
      return;
    }

    if (video.readyState < HTMLMediaElement.HAVE_ENOUGH_DATA || !video.videoWidth || !video.videoHeight) {
      scanFrameId = requestAnimationFrame(scanQRCode);
      return;
    }

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0);

    let code = null;
    try {
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      code = jsQR(imageData.data, imageData.width, imageData.height);
    } catch (_) {
      code = null;
    }

    if (code) {
      const now = Date.now();
      if (code.data !== lastScanValue || (now - lastScanAt) > 2500) {
        lastScanValue = code.data;
        lastScanAt = now;
        processQRData(code.data);
        return;
      }
      scanFrameId = requestAnimationFrame(scanQRCode);
    } else if (isCameraActive) {
      scanFrameId = requestAnimationFrame(scanQRCode);
    }
  }

  // Process QR code data
  async function processQRData(qrData) {
    if (isProcessingScan) {
      return;
    }
    isProcessingScan = true;
    
    try {
      const sessionData = JSON.parse(qrData);
      const sessionId = sessionData.sessionId;
      if (!sessionId) {
        throw new Error('The scanned QR code is missing a session reference.');
      }

      updateScannerState('processing', {
        badge: 'Processing scan',
        chip: 'Checking',
        title: 'QR detected',
        captionTitle: 'Code found',
        captionText: 'Verifying the session and submitting your attendance now.'
      });
      stopCamera();
      updateScannerState('processing', {
        badge: 'Authorizing',
        chip: 'Checking',
        title: 'QR detected',
        captionTitle: 'Code found',
        captionText: 'Verifying the session and submitting your attendance now.'
      });

      // Verify session exists and is not expired
      const session = await AUTH.getQRSessionDb(sessionId);
      if (!session) {
        showError('Invalid QR Code', 'This QR code could not be found.');
        return;
      }

      if (session.isExpired) {
        showError('Session Expired', 'This QR code has expired. Please ask your lecturer for a new one.');
        return;
      }

      const scanContext = await collectScanContext();

      // Record attendance
      const result = await AUTH.recordAttendanceDb(sessionId, scanContext);
      if (result) {
        const notes = [];
        if (!result.locationVerified) {
          notes.push('Location could not be verified, so this record may be reviewed.');
        } else if (result.withinGeofence === false) {
          notes.push(`Outside class geofence by about ${Math.round(result.geoDistanceMeters || 0)}m.`);
        }
        showSuccess(
          'Attendance Marked',
          `Successfully registered for ${session.courseCode}`,
          [ `Time: ${result.scannedAtDisplay}`, ...notes ].join(' ')
        );
        updateScannerState(result.locationVerified && result.withinGeofence !== false ? 'success' : 'warning', {
          badge: (!result.locationVerified || result.withinGeofence === false)
            ? 'Marked with review flag'
            : 'Attendance authorized',
          chip: (!result.locationVerified || result.withinGeofence === false) ? 'Review' : 'Done',
          title: 'Attendance submitted',
          captionTitle: 'Scan complete',
          captionText: (!result.locationVerified || result.withinGeofence === false)
            ? 'Your attendance was recorded, but it may be reviewed by the lecturer.'
            : 'Your attendance was recorded successfully.'
        });
        await loadHistory();
      }
    } catch (error) {
      showError('Cannot Mark Attendance', error.message || 'The scanned code is not valid. Please try again.');
      updateScannerState('error', {
        badge: 'Scan failed',
        chip: 'Retry',
        title: 'Scan could not be completed',
        captionTitle: 'No valid attendance recorded',
        captionText: 'Reset or reopen the camera and try scanning the lecturer QR code again.'
      });
    } finally {
      isProcessingScan = false;
    }
  }

  async function collectScanContext() {
    const [location, device] = await Promise.all([
      captureCurrentLocation(),
      getDeviceIdentity()
    ]);

    return { location, device };
  }

  async function captureCurrentLocation() {
    if (!navigator.geolocation) {
      updateLocationStatus('Location Unavailable', 'This browser does not support geolocation.', 'error');
      return { verified: false };
    }

    updateLocationStatus('Checking Location', 'Verifying that you are inside the class geofence...', 'pending');

    try {
      const position = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 12000,
          maximumAge: 0
        });
      });

      updateLocationStatus(
        'Location Verified',
        `GPS accuracy captured at about ${Math.round(position.coords.accuracy)}m.`,
        'success'
      );

      return {
        verified: true,
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracyMeters: position.coords.accuracy
      };
    } catch (error) {
      const message = error && error.code === error.PERMISSION_DENIED
        ? 'Location permission was denied. The scan will still record, but the lecturer may see it as flagged.'
        : 'Could not verify your location. The scan will still record, but it may be flagged.';
      updateLocationStatus('Location Not Verified', message, 'error');
      return { verified: false };
    }
  }

  function updateLocationStatus(title, message, type) {
    if (!locationStatus || !locationTitle || !locationText) {
      return;
    }
    locationStatus.style.display = 'block';
    locationStatus.className = `status-box ${type || 'pending'} scanner-card`;
    locationTitle.textContent = title;
    locationText.textContent = message;
  }

  async function getDeviceIdentity() {
    const storageKey = 'student_companion_device_token';
    let token = localStorage.getItem(storageKey);
    if (!token) {
      token = typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `device_${Date.now()}_${Math.random().toString(16).slice(2)}`;
      localStorage.setItem(storageKey, token);
    }

    const label = [
      navigator.platform || 'unknown-platform',
      navigator.userAgent || 'unknown-agent',
      `${window.screen?.width || 0}x${window.screen?.height || 0}`
    ].join(' | ');

    return { token, label };
  }

  // Show success message
  function showSuccess(title, message, details) {
    resultMessage.style.display = 'block';
    resultMessage.className = 'status-box success scanner-card';
    document.getElementById('result-title').textContent = '✓ ' + title;
    document.getElementById('result-text').textContent = message;
    document.getElementById('result-details').textContent = details;
  }

  // Show error message
  function showError(title, message) {
    resultMessage.style.display = 'block';
    resultMessage.className = 'status-box error scanner-card';
    document.getElementById('result-title').textContent = '✗ ' + title;
    document.getElementById('result-text').textContent = message;
    document.getElementById('result-details').textContent = '';
  }

  // Reset
  resetBtn.addEventListener('click', () => {
    lastScanValue = '';
    lastScanAt = 0;
    resultMessage.style.display = 'none';
    statusMessage.style.display = 'none';
    locationStatus.style.display = 'none';
    stopCamera();
    statusMessage.style.display = 'none';
    updateScannerState('idle', {
      badge: 'Ready to scan',
      chip: 'Idle',
      title: 'Camera reset complete',
      captionTitle: 'Scanner idle',
      captionText: 'Start the camera again whenever you are ready to scan.'
    });
  });

  // Load History
  async function loadHistory() {
    const historyList = document.getElementById('history-list');
    try {
      const myRecords = await AUTH.getMyAttendanceRecordsDb();

      if (myRecords.length === 0) {
        historyList.innerHTML = '<div class="history-empty">No attendance records yet.</div>';
        return;
      }

      historyList.innerHTML = myRecords.map(record => `
        <div class="history-item">
          <div class="history-item-main">
            <strong>${record.courseCode}</strong>
            <span>${record.className}</span>
          </div>
          <p>${record.scannedAtDisplay}</p>
        </div>
      `).join('');
    } catch (error) {
      historyList.innerHTML = `<div class="history-empty">${error.message || 'Unable to load attendance history.'}</div>`;
    }
  }

  function updateScannerState(state, content = {}) {
    if (videoContainer) {
      videoContainer.dataset.state = state;
      videoContainer.classList.toggle('scanner-active', state === 'scanning');
      videoContainer.classList.toggle('scanner-idle', state === 'idle');
    }

    if (scanStatusBadge && content.badge) {
      scanStatusBadge.textContent = content.badge;
    }

    if (scannerChip && content.chip) {
      scannerChip.textContent = content.chip;
    }

    if (scannerModeTitle && content.title) {
      scannerModeTitle.textContent = content.title;
    }

    if (scannerCaption) {
      const title = scannerCaption.querySelector('strong');
      const text = scannerCaption.querySelector('span');
      if (title && content.captionTitle) {
        title.textContent = content.captionTitle;
      }
      if (text && content.captionText) {
        text.textContent = content.captionText;
      }
    }
  }

  // Initial load
  loadHistory();
  startCamera().catch(() => {});
});
