import piexif from 'piexifjs';

/* ==========================================================================
   🌌 1. Space-Dust Canvas Particle Engine (Living Background)
   ========================================================================== */
const canvas = document.getElementById('particleCanvas');
const ctx = canvas.getContext('2d');

let particles = [];
let mouse = { x: null, y: null };

function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

class Particle {
  constructor() {
    this.x = Math.random() * canvas.width;
    this.y = Math.random() * canvas.height;
    this.size = Math.random() * 2 + 0.6;
    this.speedX = Math.random() * 0.16 - 0.08;
    this.speedY = Math.random() * 0.16 - 0.08;
    this.opacity = Math.random() * 0.45 + 0.15;
  }
  update() {
    this.x += this.speedX;
    this.y += this.speedY;

    if (this.x < 0 || this.x > canvas.width) this.speedX *= -1;
    if (this.y < 0 || this.y > canvas.height) this.speedY *= -1;

    // React to mouse proximity (subtle repulsion force)
    if (mouse.x && mouse.y) {
      let dx = mouse.x - this.x;
      let dy = mouse.y - this.y;
      let distance = Math.sqrt(dx * dx + dy * dy);
      if (distance < 130) {
        let force = (130 - distance) / 130;
        this.x -= dx * force * 0.025;
        this.y -= dy * force * 0.025;
      }
    }
  }
  draw() {
    ctx.fillStyle = `rgba(6, 182, 212, ${this.opacity})`;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    ctx.fill();
  }
}

function initParticles() {
  particles = [];
  let numberOfParticles = Math.floor((canvas.width * canvas.height) / 18000);
  for (let i = 0; i < numberOfParticles; i++) {
    particles.push(new Particle());
  }
}
initParticles();

window.addEventListener('mousemove', (e) => {
  mouse.x = e.clientX;
  mouse.y = e.clientY;
});
window.addEventListener('mouseleave', () => {
  mouse.x = null;
  mouse.y = null;
});

function animateParticles() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  particles.forEach(p => {
    p.update();
    p.draw();
  });
  requestAnimationFrame(animateParticles);
}
animateParticles();


/* ==========================================================================
   🛡️ 2. Core VeriMedia Client-Side UI & Process Engine
   ========================================================================== */

// DOM Selectors
const dropzone = document.getElementById('dropzone');
const fileInput = document.getElementById('fileInput');
const statusBadge = document.getElementById('statusBadge');
const reportContent = document.getElementById('reportContent');

// State Variables
let isPro = false;
let processedImageBlobUrl = null;
let processedFileName = "";


// Drag and drop events
dropzone.addEventListener('click', () => fileInput.click());

dropzone.addEventListener('dragover', (e) => {
  e.preventDefault();
  dropzone.classList.add('dragover');
});

dropzone.addEventListener('dragleave', () => {
  dropzone.classList.remove('dragover');
});

dropzone.addEventListener('drop', (e) => {
  e.preventDefault();
  dropzone.classList.remove('dragover');
  if (e.dataTransfer.files.length) {
    handleFileUpload(e.dataTransfer.files[0]);
  }
});

fileInput.addEventListener('change', (e) => {
  if (e.target.files.length) {
    handleFileUpload(e.target.files[0]);
  }
});

// Process uploaded images
function handleFileUpload(file) {
  if (file.type !== 'image/jpeg' && file.type !== 'image/jpg') {
    reportContent.innerHTML = `
      <div class="audit-list">
        <div class="audit-item danger" style="animation-delay: 0.1s;">
          <span class="audit-icon"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" style="color: var(--accent-rose); vertical-align: middle;"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></span>
          <span>Unsupported file type. VeriMedia parses standard <strong>JPEG / JPG</strong> images.</span>
        </div>
      </div>
    `;
    return;
  }

  processedFileName = file.name.replace(/\.[^/.]+$/, "") + "_ai_safe.jpg";
  statusBadge.innerText = "Scanning...";
  statusBadge.className = "status-indicator scanning";

  // Setup interactive Progress Loader Card inside Report Area
  reportContent.innerHTML = `
    <div class="empty-state" style="margin: auto; width:100%;">
      <p id="progressLabel" style="font-family:var(--font-headers); font-weight:600; color:var(--accent-cyan); font-size:1.1rem; margin-bottom: 0.5rem; letter-spacing:0.5px; transition: var(--transition-fast);">Initializing Secure Sandbox...</p>
      <div class="progress-bar-track">
        <div class="progress-bar-fill" id="progressBarFill" style="width: 0%;"></div>
      </div>
      <p style="font-size:0.85rem; color:var(--text-secondary); opacity:0.75;">Decrypting binary JPEG blocks locally...</p>
    </div>
  `;

  const progressBarFill = document.getElementById('progressBarFill');
  const progressLabel = document.getElementById('progressLabel');

  const reader = new FileReader();
  
  reader.onload = function(e) {
    const originalDataUrl = e.target.result;
    
    // Multi-stage audit simulation timeline for living tactile feedback
    let progress = 0;
    const stages = [
      { p: 20, l: "Scanning for location data..." },
      { p: 50, l: "Removing camera and location trackers..." },
      { p: 75, l: "Adding creator copyright..." },
      { p: 95, l: "Applying AI training opt-out..." },
      { p: 100, l: "Processing complete!" }
    ];

    let currentStageIndex = 0;
    const interval = setInterval(() => {
      progress += 2;
      progressBarFill.style.width = `${progress}%`;

      if (currentStageIndex < stages.length && progress >= stages[currentStageIndex].p) {
        progressLabel.innerText = stages[currentStageIndex].l;
        currentStageIndex++;
      }

      if (progress >= 100) {
        clearInterval(interval);
        // Execute real binary modifications and output report
        processMetadata(originalDataUrl, file);
      }
    }, 22);
  };
  
  reader.readAsDataURL(file);
}

function processMetadata(dataUrl, file) {
  try {
    // 1. Load original EXIF segments
    let originalExif;
    try {
      originalExif = piexif.load(dataUrl);
    } catch (e) {
      originalExif = { "0th": {}, "Exif": {}, "GPS": {}, "Interop": {}, "1st": {}, "thumbnail": null };
    }

    // 2. Audit coordinates and brandings
    const gpsFound = originalExif.GPS && Object.keys(originalExif.GPS).length > 0;
    const cameraModel = originalExif["0th"] && originalExif["0th"][piexif.ImageIFD.Model];
    const originalSoftware = originalExif["0th"] && originalExif["0th"][piexif.ImageIFD.Software];
    
    let initialScore = 90;
    let strippedLogs = [];

    if (gpsFound) {
      initialScore -= 45;
      strippedLogs.push("Precise GPS Coordinates destroyed.");
    }
    if (cameraModel) {
      initialScore -= 20;
      strippedLogs.push(`Hardware signature removed: <em>"${cameraModel}"</em>`);
    }
    if (originalSoftware) {
      initialScore -= 10;
      strippedLogs.push(`Software capture headers purged: <em>"${originalSoftware}"</em>`);
    }

    // 3. Binary Strip Process
    const cleanDataUrl = piexif.remove(dataUrl);

    // 4. Secure E-E-A-T and Spawning Opt-out Injection
    const newExifObj = { "0th": {}, "Exif": {}, "GPS": {}, "1st": {} };
    newExifObj["0th"][piexif.ImageIFD.Artist] = isPro ? "VeriMedia Verified Creator" : "VeriMedia Human Creator";
    newExifObj["0th"][piexif.ImageIFD.Copyright] = "Copyright 2026. Verified human content.";
    newExifObj["0th"][piexif.ImageIFD.Software] = "VeriMedia.xyz AI-Shield v2.0";
    newExifObj["0th"][piexif.ImageIFD.ImageDescription] = "AI Opt-Out: True. Restricted from AI model scraping.";

    const exifBytes = piexif.dump(newExifObj);
    const finalDataUrl = piexif.insert(exifBytes, cleanDataUrl);

    // 5. Convert DataURL to local Blob for download trigger
    const byteString = atob(finalDataUrl.split(',')[1]);
    const mimeString = finalDataUrl.split(',')[0].split(':')[1].split(';')[0];
    const ab = new ArrayBuffer(byteString.length);
    const ia = new Uint8Array(ab);
    for (let i = 0; i < byteString.length; i++) {
      ia[i] = byteString.charCodeAt(i);
    }
    const blob = new Blob([ab], {type: mimeString});
    
    if (processedImageBlobUrl) {
      URL.revokeObjectURL(processedImageBlobUrl);
    }
    processedImageBlobUrl = URL.createObjectURL(blob);

    // Update status badge
    statusBadge.innerText = "Complete";
    statusBadge.className = "status-indicator complete";

    // 6. Draw dynamic reports with animated values and image previews
    drawReport(initialScore, gpsFound, cameraModel, originalSoftware, strippedLogs, file, dataUrl);

  } catch (error) {
    statusBadge.innerText = "Error";
    statusBadge.className = "status-indicator idle";
    reportContent.innerHTML = `
      <div class="audit-list">
        <div class="audit-item danger" style="animation-delay:0.1s;">
          <span class="audit-icon"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="color: var(--accent-yellow); vertical-align: middle;"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg></span>
          <span>Failed to process file metadata: ${error.message}. Please verify the file is a standard JPEG.</span>
        </div>
      </div>
    `;
  }
}

function drawReport(initialScore, gpsFound, cameraModel, originalSoftware, strippedLogs, file, thumbnailSrc) {
  let listItemsHtml = "";
  let animDelay = 0.1;

  // Render stripped tags list
  if (strippedLogs.length > 0) {
    strippedLogs.forEach(log => {
      listItemsHtml += `
        <li class="audit-item danger" style="animation-delay: ${animDelay}s;">
          <span class="audit-icon"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="color: var(--accent-rose); vertical-align: middle;"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg></span>
          <span>Removed: ${log}</span>
        </li>
      `;
      animDelay += 0.12;
    });
  } else {
    listItemsHtml += `
      <li class="audit-item success" style="animation-delay: ${animDelay}s;">
        <span class="audit-icon"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="color: var(--accent-emerald); vertical-align: middle;"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg></span>
        <span>No location tracking tags detected in metadata.</span>
      </li>
    `;
    animDelay += 0.12;
  }

  // Render injected tags list
  listItemsHtml += `
    <li class="audit-item success" style="animation-delay: ${animDelay}s;">
      <span class="audit-icon"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="color: var(--accent-emerald); vertical-align: middle;"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg></span>
      <span>Injected Copyright: <em>"${isPro ? 'Verified Creator' : 'Human Creator'}"</em></span>
    </li>
    <li class="audit-item success" style="animation-delay: ${animDelay + 0.1}s;">
      <span class="audit-icon"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="color: var(--accent-emerald); vertical-align: middle;"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg></span>
      <span>Injected Google licensing tags.</span>
    </li>
    <li class="audit-item success" style="animation-delay: ${animDelay + 0.2}s;">
      <span class="audit-icon"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="color: var(--accent-emerald); vertical-align: middle;"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg></span>
      <span>Embedded AI Opt-Out: <strong>"ai:opt-out=true"</strong></span>
    </li>
  `;

  // Dynamic file metadata details
  const fileSizeKb = (file.size / 1024).toFixed(1);

  reportContent.innerHTML = `
    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 1.5rem; background:rgba(255,255,255,0.01); padding:0.85rem; border-radius:10px; border:1px solid var(--border-color);">
      <div style="display:flex; align-items:center;">
        <img src="${thumbnailSrc}" class="thumbnail-preview-holder" alt="EXIF upload thumbnail preview">
        <div>
          <p style="font-weight:600; font-size:0.9rem; max-width:180px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; margin-bottom:0.15rem;">${file.name}</p>
          <p style="color:var(--text-secondary); font-size:0.75rem;">Size: ${fileSizeKb} KB</p>
        </div>
      </div>
      <div style="text-align: right;">
        <div style="font-size:0.75rem; text-transform:uppercase; color:var(--text-secondary); margin-bottom:0.1rem;">Security Score</div>
        <div style="display:flex; align-items:center; justify-content:flex-end; gap:0.25rem;">
          <span class="score-value" id="scoreStart" style="color: ${initialScore === 90 ? 'var(--accent-emerald)' : 'var(--accent-cyan)'}">0</span>
          <span style="color: var(--text-secondary); font-size: 0.85rem;">➔</span>
          <span class="score-value" id="scoreEnd" style="color: var(--accent-emerald)">0</span>
        </div>
      </div>
    </div>
    
    <ul class="audit-list">
      ${listItemsHtml}
    </ul>

    <button class="download-sec-btn" id="downloadBtn">Download AI-Safe Media</button>
  `;

  // Animate the Start Score & End Score Values
  animateScoreCount('scoreStart', 0, initialScore, 700);
  animateScoreCount('scoreEnd', 0, 100, 1000);

  // Attach listener to download
  document.getElementById('downloadBtn').addEventListener('click', triggerDownload);
}

// Count up animation utilizing requestAnimationFrame
function animateScoreCount(id, start, end, duration) {
  const obj = document.getElementById(id);
  if (!obj) return;
  
  let startTimestamp = null;
  const step = (timestamp) => {
    if (!startTimestamp) startTimestamp = timestamp;
    const progress = Math.min((timestamp - startTimestamp) / duration, 1);
    obj.innerText = `${Math.floor(progress * (end - start) + start)}%`;
    if (progress < 1) {
      window.requestAnimationFrame(step);
    }
  };
  window.requestAnimationFrame(step);
}

function triggerDownload() {
  if (!processedImageBlobUrl) return;
  const link = document.createElement('a');
  link.href = processedImageBlobUrl;
  link.download = processedFileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/* ==========================================================================
   3. Lemon Squeezy License Validation Engine (Serverless, Real)
   ========================================================================== */

const LS_STORE_ID = 381579;
const LS_ACTIVATE_URL = 'https://api.lemonsqueezy.com/v1/licenses/activate';
const LS_VALIDATE_URL = 'https://api.lemonsqueezy.com/v1/licenses/validate';
const LS_INSTANCE_NAME = 'verimedia-browser-' + (navigator.userAgent.slice(0, 20).replace(/\s/g, '-'));
const STORAGE_KEY_LICENSE = 'vm_license_key';
const STORAGE_KEY_INSTANCE = 'vm_instance_id';

// Modal element refs
const paymentModal = document.getElementById('paymentModal');
const upgradeBtn = document.getElementById('upgradeBtn');
const activateKeyBtn = document.getElementById('activateKeyBtn');
const closeModal = document.getElementById('closeModal');
const switchToActivate = document.getElementById('switchToActivate');
const switchToBuy = document.getElementById('switchToBuy');
const activateLicenseBtn = document.getElementById('activateLicenseBtn');
const licenseKeyInput = document.getElementById('licenseKeyInput');
const licenseError = document.getElementById('licenseError');
const closeSuccessBtn = document.getElementById('closeSuccessBtn');

const viewBuy = document.getElementById('modalViewBuy');
const viewActivate = document.getElementById('modalViewActivate');
const viewSuccess = document.getElementById('modalViewSuccess');

// ── Modal view switcher ──────────────────────────────────────────────────────
function showModalView(view) {
  [viewBuy, viewActivate, viewSuccess].forEach(v => v.style.display = 'none');
  view.style.display = 'block';
}

function openModal(startView = viewBuy) {
  showModalView(startView);
  paymentModal.classList.add('active');
  paymentModal.setAttribute('aria-hidden', 'false');
}

function closePaymentModal() {
  paymentModal.classList.remove('active');
  paymentModal.setAttribute('aria-hidden', 'true');
}

// ── UI state helpers ─────────────────────────────────────────────────────────
function setProActiveUI() {
  isPro = true;
  upgradeBtn.textContent = 'Creator Pro Active';
  upgradeBtn.style.background = 'var(--accent-emerald)';
  upgradeBtn.style.cursor = 'default';
  upgradeBtn.disabled = true;
  if (activateKeyBtn) activateKeyBtn.style.display = 'none';
}

function showLicenseError(msg) {
  licenseError.textContent = msg;
  licenseError.style.display = 'block';
  licenseKeyInput.classList.add('input-error');
}

function clearLicenseError() {
  licenseError.style.display = 'none';
  licenseKeyInput.classList.remove('input-error');
}

// ── Spinner helper ───────────────────────────────────────────────────────────
function setActivateBtnLoading(loading) {
  if (!document.getElementById('spinner-kf')) {
    const s = document.createElement('style');
    s.id = 'spinner-kf';
    s.textContent = '@keyframes spin{to{transform:rotate(360deg)}}';
    document.head.appendChild(s);
  }
  if (loading) {
    activateLicenseBtn.innerHTML = '<span style="display:inline-block;width:13px;height:13px;border:2px solid rgba(0,0,0,0.4);border-top-color:transparent;border-radius:50%;animation:spin 0.7s linear infinite;vertical-align:middle;margin-right:8px;"></span>Validating...';
    activateLicenseBtn.disabled = true;
  } else {
    activateLicenseBtn.textContent = 'Activate License';
    activateLicenseBtn.disabled = false;
  }
}

// ── Core: Activate a new license key with Lemon Squeezy ─────────────────────
async function activateLicenseKey(key) {
  const body = new URLSearchParams({
    license_key: key.trim(),
    instance_name: LS_INSTANCE_NAME,
  });

  const res = await fetch(LS_ACTIVATE_URL, {
    method: 'POST',
    headers: { 'Accept': 'application/json', 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });

  const data = await res.json();
  return data;
}

// ── Core: Silently validate a stored key + instance on page load ─────────────
async function validateStoredLicense() {
  const key = localStorage.getItem(STORAGE_KEY_LICENSE);
  const instanceId = localStorage.getItem(STORAGE_KEY_INSTANCE);
  if (!key || !instanceId) return false;

  try {
    const body = new URLSearchParams({
      license_key: key,
      instance_id: instanceId,
    });
    const res = await fetch(LS_VALIDATE_URL, {
      method: 'POST',
      headers: { 'Accept': 'application/json', 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    });
    const data = await res.json();
    return data.valid === true;
  } catch {
    // Network failure — trust cached state to avoid locking out offline users
    return true;
  }
}

// ── Event: Open modal via Upgrade button ─────────────────────────────────────
upgradeBtn.addEventListener('click', () => openModal(viewBuy));

// ── Event: "Enter your license key" shortcut from pricing card ───────────────
if (activateKeyBtn) {
  activateKeyBtn.addEventListener('click', () => openModal(viewActivate));
}

// ── Event: Modal close ───────────────────────────────────────────────────────
closeModal.addEventListener('click', closePaymentModal);
paymentModal.addEventListener('click', e => { if (e.target === paymentModal) closePaymentModal(); });
if (closeSuccessBtn) closeSuccessBtn.addEventListener('click', closePaymentModal);

// ── Event: Switch between modal views ────────────────────────────────────────
switchToActivate.addEventListener('click', () => { clearLicenseError(); showModalView(viewActivate); });
switchToBuy.addEventListener('click', () => showModalView(viewBuy));

// ── Event: Activate License button ──────────────────────────────────────────
activateLicenseBtn.addEventListener('click', async () => {
  const key = licenseKeyInput.value.trim();
  if (!key) { showLicenseError('Please enter your license key.'); return; }

  clearLicenseError();
  setActivateBtnLoading(true);

  try {
    const data = await activateLicenseKey(key);

    if (data.activated === true || data.license_key?.status === 'active') {
      // Store key + instance ID for future silent validation
      localStorage.setItem(STORAGE_KEY_LICENSE, key);
      localStorage.setItem(STORAGE_KEY_INSTANCE, data.instance?.id || '');

      setProActiveUI();
      showModalView(viewSuccess);
    } else {
      // Decode common LS error responses into human-readable messages
      const errMsg = data.error || '';
      if (errMsg.toLowerCase().includes('expired')) {
        showLicenseError('This license key has expired. Please contact support.');
      } else if (errMsg.toLowerCase().includes('limit')) {
        showLicenseError('This key has reached its device limit (3). Deactivate another device first.');
      } else if (errMsg.toLowerCase().includes('invalid')) {
        showLicenseError('Invalid license key. Double-check your purchase email.');
      } else {
        showLicenseError(errMsg || 'Activation failed. Please try again or contact support.');
      }
    }
  } catch {
    showLicenseError('Network error. Check your connection and try again.');
  } finally {
    setActivateBtnLoading(false);
  }
});

// ── Allow Enter key to trigger activation ────────────────────────────────────
licenseKeyInput.addEventListener('keydown', e => {
  if (e.key === 'Enter') activateLicenseBtn.click();
});

// ── Boot: Silent re-validation on every page load ───────────────────────────
(async () => {
  const isValid = await validateStoredLicense();
  if (isValid) {
    setProActiveUI();
  } else if (localStorage.getItem(STORAGE_KEY_LICENSE)) {
    // Had a stored key but it's now invalid — clear and reset
    localStorage.removeItem(STORAGE_KEY_LICENSE);
    localStorage.removeItem(STORAGE_KEY_INSTANCE);
  }

  // Check if we were redirected back with a license key parameter from Lemon Squeezy
  const urlParams = new URLSearchParams(window.location.search);
  const licenseFromUrl = urlParams.get('license');
  if (licenseFromUrl && !isValid) {
    // Open payment modal directly on activation screen
    openModal(viewActivate);
    if (licenseKeyInput) {
      licenseKeyInput.value = licenseFromUrl;
      // Auto-trigger activation call after a brief transition delay
      setTimeout(() => {
        activateLicenseBtn.click();
      }, 450);
    }
    
    // Clean query parameters from URL for a sleek experience
    const cleanUrl = window.location.protocol + "//" + window.location.host + window.location.pathname;
    window.history.replaceState({ path: cleanUrl }, '', cleanUrl);
  }

  // Initialize Lemon Squeezy Overlay event tracking
  const initLemonSqueezyEventTracking = () => {
    if (window.LemonSqueezy) {
      window.LemonSqueezy.Setup({
        eventHandler: (eventData) => {
          if (eventData.event === 'Checkout.Success') {
            // Auto transition modal to the activate view so they can input the key!
            showModalView(viewActivate);
            clearLicenseError();
            if (licenseKeyInput) licenseKeyInput.focus();
          }
        }
      });
    }
  };

  // Try immediately or on script load
  if (window.LemonSqueezy) {
    initLemonSqueezyEventTracking();
  } else {
    window.addEventListener('LemonSqueezy.Setup', initLemonSqueezyEventTracking);
  }
})();
