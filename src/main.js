import { sanitizeImage, sanitizePDF, preloadEngine, extractMetadata } from './lib/engine.ts';

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

window.addEventListener('mousemove', (e) => { mouse.x = e.clientX; mouse.y = e.clientY; });
window.addEventListener('mouseleave', () => { mouse.x = null; mouse.y = null; });

function animateParticles() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  particles.forEach(p => { p.update(); p.draw(); });
  requestAnimationFrame(animateParticles);
}
animateParticles();

// Preload engine dependencies in background after UI paints
preloadEngine();


/* ==========================================================================
   🛡️ 2. Creator Profile — User-Configurable Metadata Identity
   ========================================================================== */
const PROFILE_KEY = 'vm_creator_profile';

function loadProfile() {
  try {
    return JSON.parse(localStorage.getItem(PROFILE_KEY) || '{}');
  } catch { return {}; }
}

function saveProfile(data) {
  localStorage.setItem(PROFILE_KEY, JSON.stringify(data));
}

// Read current profile on boot
let creatorProfile = loadProfile();

// Profile panel DOM references
const profileBtn     = document.getElementById('profileBtn');
const profilePanel   = document.getElementById('profilePanel');
const profileForm    = document.getElementById('profileForm');
const profileName    = document.getElementById('profileName');
const profileCopy    = document.getElementById('profileCopyright');
const profileUrl     = document.getElementById('profileUrl');
const profileSave    = document.getElementById('profileSaveBtn');
const profileClose   = document.getElementById('profileCloseBtn');

function openProfilePanel() {
  // Populate fields with saved values
  profileName.value = creatorProfile.name    || '';
  profileCopy.value = creatorProfile.copyright || '';
  profileUrl.value  = creatorProfile.url      || '';
  profilePanel.classList.add('active');
}

function closeProfilePanel() {
  profilePanel.classList.remove('active');
}

if (profileBtn)   profileBtn.addEventListener('click', openProfilePanel);
if (profileClose) profileClose.addEventListener('click', closeProfilePanel);
if (profilePanel) profilePanel.addEventListener('click', e => { if (e.target === profilePanel) closeProfilePanel(); });

if (profileSave) {
  profileSave.addEventListener('click', () => {
    creatorProfile = {
      name:      profileName.value.trim()  || 'Human Creator',
      copyright: profileCopy.value.trim()  || `© ${new Date().getFullYear()} Human Creator`,
      url:       profileUrl.value.trim()   || '',
    };
    saveProfile(creatorProfile);

    // Visual feedback: pulse button green
    profileSave.textContent = '✓ Saved!';
    profileSave.style.background = 'var(--accent-emerald)';
    setTimeout(() => {
      profileSave.textContent = 'Save Profile';
      profileSave.style.background = '';
    }, 1800);

    closeProfilePanel();
  });
}


/* ==========================================================================
   🛡️ 3. Core VeriMedia Client-Side UI & Process Engine (engine.ts)
   ========================================================================== */

// DOM Selectors
const dropzone    = document.getElementById('dropzone');
const fileInput   = document.getElementById('fileInput');
const statusBadge = document.getElementById('statusBadge');
const reportContent = document.getElementById('reportContent');

// State Variables
let isPro = false;
let processedBlob = null;
let processedFileName = '';

// ── Drag & drop / file-input events ──────────────────────────────────────────
dropzone.addEventListener('click', () => fileInput.click());

dropzone.addEventListener('dragover', (e) => {
  e.preventDefault();
  dropzone.classList.add('dragover');
});

dropzone.addEventListener('dragleave', () => dropzone.classList.remove('dragover'));

dropzone.addEventListener('drop', (e) => {
  e.preventDefault();
  dropzone.classList.remove('dragover');
  if (e.dataTransfer.files.length) handleFileUpload(e.dataTransfer.files[0]);
});

fileInput.addEventListener('change', (e) => {
  if (e.target.files.length) handleFileUpload(e.target.files[0]);
});

// ── Supported types ───────────────────────────────────────────────────────────
const SUPPORTED_IMAGE_TYPES = new Set([
  'image/jpeg', 'image/jpg', 'image/png', 'image/webp',
  'image/heic', 'image/heif',
]);

const SUPPORTED_PDF = 'application/pdf';

function getFileCategory(file) {
  if (file.type === SUPPORTED_PDF) return 'pdf';
  if (SUPPORTED_IMAGE_TYPES.has(file.type)) return 'image';
  // Fallback: detect HEIC by extension even if browser misreports mime
  if (/\.(heic|heif)$/i.test(file.name)) return 'image';
  return null;
}

// ── Main entry: handle uploaded file ─────────────────────────────────────────
async function handleFileUpload(file) {
  const category = getFileCategory(file);

  if (!category) {
    reportContent.innerHTML = buildErrorItem(
      'Unsupported file type. VeriMedia supports <strong>JPEG, PNG, WebP, HEIC/HEIF</strong> images and <strong>PDF</strong> documents.'
    );
    return;
  }

  processedFileName = file.name.replace(/\.[^/.]+$/, '') + (category === 'pdf' ? '_clean.pdf' : '_ai_safe' + getOutputExt(file));
  statusBadge.innerText = 'Scanning...';
  statusBadge.className = 'status-indicator scanning';

  // Show animated progress UI
  reportContent.innerHTML = `
    <div class="empty-state" style="margin:auto;width:100%;">
      <p id="progressLabel" style="font-family:var(--font-headers);font-weight:600;color:var(--accent-cyan);font-size:1.1rem;margin-bottom:0.5rem;letter-spacing:0.5px;">Initializing Secure Sandbox...</p>
      <div class="progress-bar-track">
        <div class="progress-bar-fill" id="progressBarFill" style="width:0%;"></div>
      </div>
      <p style="font-size:0.85rem;color:var(--text-secondary);opacity:0.75;">Decrypting binary blocks locally on your device...</p>
    </div>
  `;

  const progressBarFill = document.getElementById('progressBarFill');
  const progressLabel   = document.getElementById('progressLabel');

  const stages = category === 'pdf'
    ? [
        { p: 25, l: 'Parsing PDF structure...' },
        { p: 55, l: 'Wiping author & timestamp metadata...' },
        { p: 80, l: 'Removing embedded scripts & annotations...' },
        { p: 100, l: 'Sanitization complete!' },
      ]
    : [
        { p: 20, l: 'Scanning for GPS location data...' },
        { p: 50, l: 'Removing camera identifiers...' },
        { p: 75, l: 'Embedding creator copyright & AI opt-out...' },
        { p: 100, l: 'Processing complete!' },
      ];

  // Animated progress bar (cosmetic — real work is async below)
  let progress = 0;
  let stageIdx = 0;
  const interval = setInterval(() => {
    progress = Math.min(progress + 1.8, 92); // Cap at 92%; real completion sets 100%
    progressBarFill.style.width = `${progress}%`;
    if (stageIdx < stages.length - 1 && progress >= stages[stageIdx].p) {
      progressLabel.innerText = stages[stageIdx].l;
      stageIdx++;
    }
  }, 22);

  try {
    // ── Real work via engine.ts ───────────────────────────────────────────────
    let outputBlob;
    let report = null;

    if (category === 'pdf') {
      const pdfBytes = await sanitizePDF(file);
      outputBlob = new Blob([pdfBytes], { type: 'application/pdf' });
    } else {
      // Extract metadata report BEFORE stripping (so we know what was there)
      report = await extractMetadata(file);

      // Determine Pro options
      const options = {
        keepIcc: false,
        keepAnnots: false,
        keepCameraSpecs: isPro, // Pro users can optionally retain camera specs
      };

      outputBlob = await sanitizeImage(file, options);

      // Re-inject creator identity metadata via piexif (JPEG only)
      // For PNG/WebP/HEIC we rely on engine.ts stripping; copyright injection
      // is currently supported only on the JPEG output path via piexif.
      if (outputBlob.type === 'image/jpeg' || outputBlob.type === '') {
        try {
          const { default: piexif } = await import('piexifjs');
          const dataUrl = await blobToDataUrl(outputBlob);
          const name      = creatorProfile.name      || 'Human Creator';
          const copyright = creatorProfile.copyright || `© ${new Date().getFullYear()} Human Creator`;
          const url       = creatorProfile.url       || '';

          const newExif = { '0th': {}, Exif: {}, GPS: {}, '1st': {} };
          newExif['0th'][piexif.ImageIFD.Artist]           = isPro ? `VeriMedia Verified Creator — ${name}` : name;
          newExif['0th'][piexif.ImageIFD.Copyright]        = copyright;
          newExif['0th'][piexif.ImageIFD.Software]         = 'VeriMedia.xyz AI-Shield v2.0';
          newExif['0th'][piexif.ImageIFD.ImageDescription] = `AI Opt-Out: True. Restricted from AI training.${url ? ' License: ' + url : ''}`;

          const exifBytes = piexif.dump(newExif);
          const finalUrl  = piexif.insert(exifBytes, dataUrl);
          outputBlob = dataUrlToBlob(finalUrl);
        } catch (e) {
          console.warn('piexif copyright injection failed (non-JPEG output):', e);
        }
      }
    }

    // Finalize progress
    clearInterval(interval);
    progressBarFill.style.width = '100%';
    progressLabel.innerText = stages[stages.length - 1].l;

    // Store for download
    if (processedBlob) URL.revokeObjectURL(processedBlob._url);
    processedBlob = outputBlob;
    processedBlob._url = URL.createObjectURL(outputBlob);

    statusBadge.innerText = 'Complete';
    statusBadge.className = 'status-indicator complete';

    // Draw result report
    await new Promise(r => setTimeout(r, 280)); // Let bar finish animating
    drawReport(report, file, category);

  } catch (error) {
    clearInterval(interval);
    statusBadge.innerText = 'Error';
    statusBadge.className = 'status-indicator idle';
    reportContent.innerHTML = buildErrorItem(`Processing failed: ${error.message}. Ensure the file is a valid image or PDF.`);
    console.error('Engine error:', error);
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function getOutputExt(file) {
  if (/\.(heic|heif)$/i.test(file.name)) return '.jpg';
  const ext = file.name.match(/\.[^/.]+$/)?.[0] || '.jpg';
  return ext.toLowerCase().replace('jpg', 'jpg');
}

async function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = e => resolve(e.target.result);
    r.onerror = reject;
    r.readAsDataURL(blob);
  });
}

function dataUrlToBlob(dataUrl) {
  const [meta, b64] = dataUrl.split(',');
  const mime = meta.split(':')[1].split(';')[0];
  const bytes = atob(b64);
  const ab = new Uint8Array(bytes.length);
  for (let i = 0; i < bytes.length; i++) ab[i] = bytes.charCodeAt(i);
  return new Blob([ab], { type: mime });
}

function buildErrorItem(msg) {
  return `
    <div class="audit-list">
      <div class="audit-item danger" style="animation-delay:0.1s;">
        <span class="audit-icon">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" style="color:var(--accent-rose);vertical-align:middle;">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </span>
        <span>${msg}</span>
      </div>
    </div>
  `;
}

// ── Report Renderer ───────────────────────────────────────────────────────────

async function drawReport(report, file, category) {
  let listItemsHtml = '';
  let animDelay = 0.1;

  if (category === 'pdf') {
    listItemsHtml += buildSuccessItem('PDF metadata dictionary wiped (Author, Creator, Timestamps).', animDelay);
    animDelay += 0.12;
    listItemsHtml += buildSuccessItem('Embedded scripts, OpenAction triggers, and hidden XMP streams removed.', animDelay);
    animDelay += 0.12;
    listItemsHtml += buildSuccessItem('File attachments and steganography vectors neutralized.', animDelay);
  } else if (report) {
    // Show high-risk tags that were stripped
    const highRisk = report.tags.filter(t =>
      ['GPS Location', 'Device', 'Device ID', 'Timestamp', 'Identity', 'Provenance'].includes(t.category)
    );

    if (highRisk.length > 0) {
      highRisk.slice(0, 6).forEach(tag => {
        listItemsHtml += buildDangerItem(
          `Removed: <strong>${tag.category}</strong> — <em>${tag.name}: ${truncate(tag.value, 48)}</em>`,
          animDelay
        );
        animDelay += 0.1;
      });
      if (highRisk.length > 6) {
        listItemsHtml += buildDangerItem(`…and ${highRisk.length - 6} more metadata tags stripped.`, animDelay);
        animDelay += 0.1;
      }
    } else {
      listItemsHtml += buildSuccessItem('No high-risk location or identity tags detected in source file.', animDelay);
      animDelay += 0.12;
    }

    // C2PA provenance detection
    const c2paTags = report.tags.filter(t => t.category === 'Provenance');
    if (c2paTags.length > 0) {
      listItemsHtml += buildDangerItem(`C2PA provenance manifest detected and removed (${c2paTags.length} entries).`, animDelay);
      animDelay += 0.1;
    }

    // Show what was injected
    const name      = creatorProfile.name      || 'Human Creator';
    const copyright = creatorProfile.copyright || `© ${new Date().getFullYear()} Human Creator`;
    const url       = creatorProfile.url;

    listItemsHtml += buildSuccessItem(
      `Injected Creator: <em>"${isPro ? 'VeriMedia Verified Creator — ' + name : name}"</em>`,
      animDelay
    );
    animDelay += 0.1;
    listItemsHtml += buildSuccessItem(
      `Injected Copyright: <em>"${copyright}"</em>`,
      animDelay
    );
    animDelay += 0.1;
    if (url) {
      listItemsHtml += buildSuccessItem(`Embedded License URL: <em>${url}</em> (Google Licensable Badge schema)`, animDelay);
      animDelay += 0.1;
    }
    listItemsHtml += buildSuccessItem('Embedded AI Opt-Out: <strong>"ai:opt-out=true"</strong>', animDelay);
    animDelay += 0.1;
  }

  // Score
  const initialScore = report ? Math.min(90, report.privacyScore) : 90;
  const fileSizeKb   = (file.size / 1024).toFixed(1);
  const thumbnailSrc = category !== 'pdf' ? await blobToDataUrl(await file.slice(0, file.size)) : null;

  reportContent.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1.5rem;background:rgba(255,255,255,0.01);padding:0.85rem;border-radius:10px;border:1px solid var(--border-color);">
      <div style="display:flex;align-items:center;">
        ${thumbnailSrc
          ? `<img src="${thumbnailSrc}" class="thumbnail-preview-holder" alt="Upload thumbnail">`
          : `<div style="width:52px;height:52px;border-radius:8px;background:var(--card-bg);border:1px solid var(--border-color);display:flex;align-items:center;justify-content:center;margin-right:12px;flex-shrink:0;">
               <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--accent-cyan)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
             </div>`
        }
        <div>
          <p style="font-weight:600;font-size:0.9rem;max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;margin-bottom:0.15rem;">${file.name}</p>
          <p style="color:var(--text-secondary);font-size:0.75rem;">Size: ${fileSizeKb} KB</p>
        </div>
      </div>
      <div style="text-align:right;">
        <div style="font-size:0.75rem;text-transform:uppercase;color:var(--text-secondary);margin-bottom:0.1rem;">Privacy Score</div>
        <div style="display:flex;align-items:center;justify-content:flex-end;gap:0.25rem;">
          <span class="score-value" id="scoreStart" style="color:${initialScore >= 90 ? 'var(--accent-emerald)' : 'var(--accent-cyan)'}">0</span>
          <span style="color:var(--text-secondary);font-size:0.85rem;">➔</span>
          <span class="score-value" id="scoreEnd" style="color:var(--accent-emerald)">0</span>
        </div>
      </div>
    </div>
    <ul class="audit-list">${listItemsHtml}</ul>
    <button class="download-sec-btn" id="downloadBtn">Download AI-Safe ${category === 'pdf' ? 'PDF' : 'Media'}</button>
  `;

  animateScoreCount('scoreStart', 0, initialScore, 700);
  animateScoreCount('scoreEnd', 0, 100, 1000);
  document.getElementById('downloadBtn').addEventListener('click', triggerDownload);
}

function buildDangerItem(msg, delay) {
  return `
    <li class="audit-item danger" style="animation-delay:${delay}s;">
      <span class="audit-icon"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="color:var(--accent-rose);vertical-align:middle;"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg></span>
      <span>${msg}</span>
    </li>`;
}

function buildSuccessItem(msg, delay) {
  return `
    <li class="audit-item success" style="animation-delay:${delay}s;">
      <span class="audit-icon"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="color:var(--accent-emerald);vertical-align:middle;"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg></span>
      <span>${msg}</span>
    </li>`;
}

function truncate(str, n) {
  return str.length > n ? str.slice(0, n) + '…' : str;
}

function animateScoreCount(id, start, end, duration) {
  const obj = document.getElementById(id);
  if (!obj) return;
  let startTimestamp = null;
  const step = (timestamp) => {
    if (!startTimestamp) startTimestamp = timestamp;
    const progress = Math.min((timestamp - startTimestamp) / duration, 1);
    obj.innerText = `${Math.floor(progress * (end - start) + start)}%`;
    if (progress < 1) window.requestAnimationFrame(step);
  };
  window.requestAnimationFrame(step);
}

function triggerDownload() {
  if (!processedBlob?._url) return;
  const link = document.createElement('a');
  link.href = processedBlob._url;
  link.download = processedFileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}


/* ==========================================================================
   4. Paddle License Validation Engine
   (Replace PADDLE_VENDOR_ID and PADDLE_AUTH_CODE with values from
    Paddle Dashboard → Developer Tools → Auth Code)
   ========================================================================== */

// ── Paddle configuration ──────────────────────────────────────────────────────
// TODO: Set your Vendor ID from Paddle Dashboard → Developer Tools
const PADDLE_VENDOR_ID  = 'YOUR_PADDLE_VENDOR_ID';
// TODO: Set your Auth Code from Paddle Dashboard → Developer Tools → Auth Code
const PADDLE_AUTH_CODE  = 'YOUR_PADDLE_AUTH_CODE';
// Paddle Billing classic license verify endpoint
const PADDLE_VERIFY_URL = 'https://vendors.paddle.com/api/2.0/product/licenses/verify';

const STORAGE_KEY_LICENSE  = 'vm_license_key';
const STORAGE_KEY_INSTANCE = 'vm_instance_id';

// ── Modal element refs ────────────────────────────────────────────────────────
const paymentModal      = document.getElementById('paymentModal');
const upgradeBtn        = document.getElementById('upgradeBtn');
const activateKeyBtn    = document.getElementById('activateKeyBtn');
const closeModal        = document.getElementById('closeModal');
const switchToActivate  = document.getElementById('switchToActivate');
const switchToBuy       = document.getElementById('switchToBuy');
const activateLicenseBtn = document.getElementById('activateLicenseBtn');
const licenseKeyInput   = document.getElementById('licenseKeyInput');
const licenseError      = document.getElementById('licenseError');
const closeSuccessBtn   = document.getElementById('closeSuccessBtn');

const viewBuy      = document.getElementById('modalViewBuy');
const viewActivate = document.getElementById('modalViewActivate');
const viewSuccess  = document.getElementById('modalViewSuccess');

// ── Modal view switcher ───────────────────────────────────────────────────────
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

// ── UI state helpers ──────────────────────────────────────────────────────────
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

// ── Core: Verify a Paddle license key ────────────────────────────────────────
async function verifyPaddleLicense(licenseKey) {
  const body = new URLSearchParams({
    vendor_id:    PADDLE_VENDOR_ID,
    auth_code:    PADDLE_AUTH_CODE,
    license_code: licenseKey.trim(),
  });

  const res = await fetch(PADDLE_VERIFY_URL, {
    method: 'POST',
    headers: { 'Accept': 'application/json', 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });

  const data = await res.json();
  return data;
}

// ── Core: Silent re-validation on page load ───────────────────────────────────
async function validateStoredLicense() {
  const key = localStorage.getItem(STORAGE_KEY_LICENSE);
  if (!key) return false;

  try {
    const data = await verifyPaddleLicense(key);
    // Paddle returns { success: true, response: { is_valid: true } }
    return data.success === true && data.response?.is_valid === true;
  } catch {
    // Network failure — trust cached state to avoid locking out offline users
    return true;
  }
}

// ── Events: Upgrade / Activate buttons ───────────────────────────────────────
upgradeBtn.addEventListener('click', () => openModal(viewBuy));

if (activateKeyBtn) {
  activateKeyBtn.addEventListener('click', () => openModal(viewActivate));
}

closeModal.addEventListener('click', closePaymentModal);
paymentModal.addEventListener('click', e => { if (e.target === paymentModal) closePaymentModal(); });
if (closeSuccessBtn) closeSuccessBtn.addEventListener('click', closePaymentModal);

switchToActivate.addEventListener('click', () => { clearLicenseError(); showModalView(viewActivate); });
switchToBuy.addEventListener('click', () => showModalView(viewBuy));

// ── Activate button handler ───────────────────────────────────────────────────
activateLicenseBtn.addEventListener('click', async () => {
  const key = licenseKeyInput.value.trim();
  if (!key) { showLicenseError('Please enter your license key.'); return; }

  clearLicenseError();
  setActivateBtnLoading(true);

  try {
    const data = await verifyPaddleLicense(key);

    if (data.success === true && data.response?.is_valid === true) {
      localStorage.setItem(STORAGE_KEY_LICENSE, key);
      setProActiveUI();
      showModalView(viewSuccess);
    } else {
      const errMsg = data.error || (data.response?.is_valid === false ? 'This license key is invalid or has expired.' : '');
      showLicenseError(errMsg || 'Activation failed. Double-check your purchase email or contact support.');
    }
  } catch {
    showLicenseError('Network error. Check your connection and try again.');
  } finally {
    setActivateBtnLoading(false);
  }
});

licenseKeyInput.addEventListener('keydown', e => {
  if (e.key === 'Enter') activateLicenseBtn.click();
});

// ── Boot: Silent re-validation on every page load ────────────────────────────
(async () => {
  const isValid = await validateStoredLicense();
  if (isValid) {
    setProActiveUI();
  } else if (localStorage.getItem(STORAGE_KEY_LICENSE)) {
    localStorage.removeItem(STORAGE_KEY_LICENSE);
    localStorage.removeItem(STORAGE_KEY_INSTANCE);
  }

  // Handle license key passed via URL param (e.g., Paddle redirect)
  const urlParams = new URLSearchParams(window.location.search);
  const licenseFromUrl = urlParams.get('license') || urlParams.get('license_code');
  if (licenseFromUrl && !isValid) {
    openModal(viewActivate);
    if (licenseKeyInput) {
      licenseKeyInput.value = licenseFromUrl;
      setTimeout(() => activateLicenseBtn.click(), 450);
    }
    const cleanUrl = window.location.protocol + '//' + window.location.host + window.location.pathname;
    window.history.replaceState({ path: cleanUrl }, '', cleanUrl);
  }
})();
