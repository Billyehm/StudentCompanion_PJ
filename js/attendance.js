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
  const locationStatus = document.getElementById('scan-location-status');
  const locationTitle = document.getElementById('location-title');
  const locationText = document.getElementById('location-text');

  let isCameraActive = false;
  let stream = null;
  let scanFrameId = null;
  let isProcessingScan = false;

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
      statusMessage.style.display = 'block';
      statusMessage.className = 'status-box pending';
      document.getElementById('status-title').textContent = 'Requesting camera access...';
      document.getElementById('status-text').textContent = 'Please allow camera access in the browser';
      if (scanStatusBadge) {
        scanStatusBadge.textContent = 'Starting camera';
      }

      stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      });

      video.srcObject = stream;
      await video.play().catch(() => {});
      isCameraActive = true;
      toggleCameraBtn.textContent = '🛑 Stop Camera';
      videoContainer.style.display = 'block';

      statusMessage.className = 'status-box pending';
      document.getElementById('status-title').textContent = 'Scanning...';
      document.getElementById('status-text').textContent = 'Point camera at QR code';
      if (scanStatusBadge) {
        scanStatusBadge.textContent = 'Scanning live';
      }

      scanQRCode();
    } catch (error) {
      statusMessage.style.display = 'block';
      statusMessage.className = 'status-box error';
      document.getElementById('status-title').textContent = 'Camera Access Denied';
      document.getElementById('status-text').textContent =
        'Enable camera permissions in your browser settings and try again.';
      toggleCameraBtn.textContent = '📷 Start Camera';
      if (scanStatusBadge) {
        scanStatusBadge.textContent = 'Camera unavailable';
      }
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
      isCameraActive = false;
      toggleCameraBtn.textContent = '📷 Start Camera';
      statusMessage.style.display = 'none';
      video.srcObject = null;
      if (scanStatusBadge) {
        scanStatusBadge.textContent = 'Camera stopped';
      }
    }
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
      processQRData(code.data);
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

      stopCamera();
      if (scanStatusBadge) {
        scanStatusBadge.textContent = 'Authorizing';
      }

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
        if (scanStatusBadge) {
          scanStatusBadge.textContent = (!result.locationVerified || result.withinGeofence === false)
            ? 'Marked with review flag'
            : 'Attendance authorized';
        }
        await loadHistory();
      }
    } catch (error) {
      showError('Cannot Mark Attendance', error.message || 'The scanned code is not valid. Please try again.');
      if (scanStatusBadge) {
        scanStatusBadge.textContent = 'Scan failed';
      }
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
    locationStatus.className = `status-box ${type || 'pending'}`;
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
    resultMessage.className = 'status-box success';
    document.getElementById('result-title').textContent = '✓ ' + title;
    document.getElementById('result-text').textContent = message;
    document.getElementById('result-details').textContent = details;
  }

  // Show error message
  function showError(title, message) {
    resultMessage.style.display = 'block';
    resultMessage.className = 'status-box error';
    document.getElementById('result-title').textContent = '✗ ' + title;
    document.getElementById('result-text').textContent = message;
    document.getElementById('result-details').textContent = '';
  }

  // Reset
  resetBtn.addEventListener('click', () => {
    resultMessage.style.display = 'none';
    statusMessage.style.display = 'none';
    videoContainer.style.display = 'none';
    stopCamera();
    if (scanStatusBadge) {
      scanStatusBadge.textContent = 'Ready to scan';
    }
  });

  // Load History
  async function loadHistory() {
    const historyList = document.getElementById('history-list');
    try {
      const myRecords = await AUTH.getMyAttendanceRecordsDb();

      if (myRecords.length === 0) {
        historyList.innerHTML = '<p style="color: rgba(255,255,255,0.6); text-align: center;">No attendance records yet</p>';
        return;
      }

      historyList.innerHTML = myRecords.map(record => `
        <div style="padding: 1rem; background: rgba(255,255,255,0.05); border-radius: 8px; margin-bottom: 0.5rem; border-left: 4px solid #4CAF50;">
          <p style="margin: 0.3rem 0;"><strong>${record.courseCode}</strong> - ${record.className}</p>
          <p style="margin: 0.3rem 0; font-size: 0.9rem; color: rgba(255,255,255,0.7);">📍 ${record.scannedAtDisplay}</p>
        </div>
      `).join('');
    } catch (error) {
      historyList.innerHTML = `<p style="color: rgba(255,255,255,0.6); text-align: center;">${error.message || 'Unable to load attendance history.'}</p>`;
    }
  }

  // Initial load
  loadHistory();
  startCamera().catch(() => {});
});
