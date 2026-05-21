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
    const data = JSON.parse(localStorage.getItem(PROFILE_KEY) || '{}');
    // Default AI Opt-Out to true for all users if not explicitly set
    if (data.aiOnly === undefined) data.aiOnly = true;
    return data;
  } catch { return { aiOnly: true }; }
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
const profileAiOnly  = document.getElementById('profileAiOnly');
const profileWhitelabel = document.getElementById('profileWhitelabel');
const profileWhitelabelWrap = document.getElementById('profileWhitelabelWrap');
const profileSave    = document.getElementById('profileSaveBtn');
const profileClose   = document.getElementById('profileCloseBtn');

function openProfilePanel() {
  // Populate fields with saved values
  profileName.value = creatorProfile.name    || '';
  profileCopy.value = creatorProfile.copyright || '';
  profileUrl.value  = creatorProfile.url      || '';
  if (profileAiOnly) profileAiOnly.checked = creatorProfile.aiOnly === true;
  if (profileWhitelabel) profileWhitelabel.checked = creatorProfile.whitelabel === true;
  
  const proOverlay = document.getElementById('proProfileOverlay');
  const activeKeyDisplay = document.getElementById('activeKeyDisplay');
  const profileKeyInput = document.getElementById('profileKeyInput');

  if (isPro) {
    if (proOverlay) proOverlay.style.display = 'none';
    if (activeKeyDisplay) activeKeyDisplay.style.display = 'block';
    if (profileWhitelabelWrap) profileWhitelabelWrap.style.display = 'block';
    if (profileKeyInput) {
      profileKeyInput.value = localStorage.getItem(STORAGE_KEY_LICENSE) || 'Active';
    }
    profileSave.style.display = 'block';
    
    // Enable fields for Pro users
    profileName.disabled = false;
    profileCopy.disabled = false;
    profileUrl.disabled = false;
    if (profileWhitelabel) profileWhitelabel.disabled = false;
  } else {
    if (proOverlay) proOverlay.style.display = 'flex';
    if (activeKeyDisplay) activeKeyDisplay.style.display = 'none';
    if (profileWhitelabelWrap) profileWhitelabelWrap.style.display = 'none';
    profileSave.style.display = 'none';

    // Lockdown fields for non-Pro users
    profileName.disabled = true;
    profileCopy.disabled = true;
    profileUrl.disabled = true;
    if (profileWhitelabel) profileWhitelabel.disabled = true;
  }

  profilePanel.classList.add('active');
}

// Additional event listeners for the profile modal
const profileUpgradeBtn = document.getElementById('profileUpgradeBtn');
if (profileUpgradeBtn) {
  profileUpgradeBtn.addEventListener('click', () => {
    closeProfilePanel();
    openModal(viewBuy);
  });
}

const copyKeyBtn = document.getElementById('copyKeyBtn');
if (copyKeyBtn && document.getElementById('profileKeyInput')) {
  copyKeyBtn.addEventListener('click', () => {
    const profileKeyInput = document.getElementById('profileKeyInput');
    profileKeyInput.select();
    document.execCommand('copy');
    const originalText = copyKeyBtn.textContent;
    copyKeyBtn.textContent = 'Copied!';
    setTimeout(() => { copyKeyBtn.textContent = originalText; }, 2000);
  });
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
      name:      profileName.value.trim()  || '',
      copyright: profileCopy.value.trim()  || '',
      url:       profileUrl.value.trim()   || '',
      aiOnly:    profileAiOnly ? profileAiOnly.checked : false,
      whitelabel: profileWhitelabel ? profileWhitelabel.checked : false
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
let isFirstRun = true;

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
  if (e.dataTransfer.files.length) handleFiles(e.dataTransfer.files);
});

fileInput.addEventListener('change', (e) => {
  if (e.target.files.length) handleFiles(e.target.files);
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

// ── Main entry: handle uploaded files ─────────────────────────────────────────
async function handleFiles(fileList) {
  const files = Array.from(fileList);
  if (files.length === 0) return;

  if (files.length > 1 && !isPro) {
    reportContent.innerHTML = buildErrorItem('Bulk processing is a Creator Pro feature. Please process 1 file at a time or upgrade.');
    return;
  }
  
  if (files.length > 100) {
    reportContent.innerHTML = buildErrorItem('Maximum 100 files allowed per batch.');
    return;
  }

  // Handle first run loading state
  if (isFirstRun) {
    statusBadge.innerText = 'Warming Up...';
    statusBadge.className = 'status-indicator scanning';
    reportContent.innerHTML = `<div class="empty-state"><p>Loading secure environment for the first time...</p></div>`;
    await new Promise(r => setTimeout(r, 600)); // Brief visual pause
    isFirstRun = false;
  }

  if (files.length === 1) {
    await handleSingleFileUpload(files[0]);
  } else {
    await processBulkFiles(files);
  }
}

async function handleSingleFileUpload(file) {
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
      <p id="progressLabel" style="font-family:var(--font-headers);font-weight:600;color:var(--accent-cyan);font-size:1.1rem;margin-bottom:0.5rem;letter-spacing:0.5px;">Initializing Neural Privacy Shield...</p>
      <div class="progress-bar-track">
        <div class="progress-bar-fill" id="progressBarFill" style="width:0%;"></div>
      </div>
      <p style="font-size:0.85rem;color:var(--text-secondary);opacity:0.75;">Analyzing binary segments for forensic identifiers locally...</p>
    </div>
  `;

  const progressBarFill = document.getElementById('progressBarFill');
  const progressLabel   = document.getElementById('progressLabel');

  const stages = category === 'pdf'
    ? [
        { p: 25, l: 'Analyzing PDF structure...' },
        { p: 55, l: 'Purging forensic metadata streams...' },
        { p: 80, l: 'Neutralizing structural vulnerabilities...' },
        { p: 100, l: 'Sanitization complete!' },
      ]
    : [
        { p: 20, l: 'Detecting geographic forensic markers...' },
        { p: 50, l: 'Purging hardware & device serials...' },
        { p: 75, l: 'Injecting AI-Safe Content Credentials...' },
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

    // Determine options based on Pro status and profile settings
    const options = {
      keepIcc: false,
      keepAnnots: false,
      keepCameraSpecs: isPro,
      injectIdentity: isPro && (creatorProfile.name || creatorProfile.copyright || creatorProfile.url),
      creatorName: creatorProfile.name,
      copyright: creatorProfile.copyright,
      contactUrl: creatorProfile.url,
      aiOptOut: creatorProfile.aiOnly === true,
      whitelabel: creatorProfile.whitelabel === true,
      isPro: isPro
    };

    if (category === 'pdf') {
      const pdfBytes = await sanitizePDF(file, options);
      outputBlob = new Blob([pdfBytes], { type: 'application/pdf' });
    } else {
      // Extract metadata report BEFORE stripping (so we know what was there)
      report = await extractMetadata(file);

      outputBlob = await sanitizeImage(file, options);

      // Re-inject creator identity metadata via piexif (JPEG only)
      // For PNG/WebP/HEIC we rely on engine.ts stripping; copyright injection
      // is handled via surgical byte-level injection inside engine.ts.
      if (outputBlob.type === 'image/jpeg' || outputBlob.type === '') {
        try {
          const { default: piexif } = await import('piexifjs');
          const dataUrl = await blobToDataUrl(outputBlob);
          const newExif = { '0th': {}, Exif: {}, GPS: {}, '1st': {} };

          const isWhitelabel = options.isPro && options.whitelabel;
          const software = isWhitelabel ? 'Original Content Engine' : 'VeriMedia.xyz';

          if (options.injectIdentity) {
            const name      = options.creatorName      || 'Human Creator';
            const copyright = options.copyright || `© ${new Date().getFullYear()} Human Creator`;
            const url       = options.contactUrl       || '';

            newExif['0th'][piexif.ImageIFD.Artist]           = isWhitelabel ? name : `VeriMedia Verified Creator - ${name}`;
            newExif['0th'][piexif.ImageIFD.Copyright]        = copyright;
            newExif['0th'][piexif.ImageIFD.Software]         = software;
            newExif['0th'][piexif.ImageIFD.ImageDescription] = `AI Opt-Out: True. Restricted from AI training.${url ? ' License: ' + url : ''}`;
          } else if (options.aiOptOut) {
            newExif['0th'][piexif.ImageIFD.ImageDescription] = `AI Opt-Out: True. Restricted from AI training.`;
            newExif['0th'][piexif.ImageIFD.Software]         = software;
          }

          const exifBytes = piexif.dump(newExif);
          const finalUrl  = piexif.insert(exifBytes, dataUrl);
          outputBlob = dataUrlToBlob(finalUrl);
        } catch (e) {
          console.warn('piexif copyright injection failed:', e);
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

async function processBulkFiles(files) {
  statusBadge.innerText = `Processing Batch...`;
  statusBadge.className = 'status-indicator scanning';
  
  reportContent.innerHTML = `
    <div class="empty-state" style="margin:auto;width:100%;">
      <p id="progressLabel" style="font-family:var(--font-headers);font-weight:600;color:var(--accent-cyan);font-size:1.1rem;margin-bottom:0.5rem;letter-spacing:0.5px;">Initializing Batch Engine...</p>
      <div class="progress-bar-track">
        <div class="progress-bar-fill" id="progressBarFill" style="width:0%;"></div>
      </div>
      <p style="font-size:0.85rem;color:var(--text-secondary);opacity:0.75;" id="progressCount">0 / ${files.length} files</p>
    </div>
  `;
  const progressBarFill = document.getElementById('progressBarFill');
  const progressLabel   = document.getElementById('progressLabel');
  const progressCount   = document.getElementById('progressCount');

  try {
    progressLabel.innerText = 'Loading ZIP Engine...';
    const { default: JSZip } = await import('https://esm.sh/jszip@3.10.1');
    const zip = new JSZip();
    
    let successCount = 0;
    let batchStatsHtml = '';
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const category = getFileCategory(file);
      if (!category) continue;
      
      progressLabel.innerText = `Sanitizing: ${file.name}`;
      progressCount.innerText = `${i + 1} / ${files.length} files`;
      progressBarFill.style.width = `${(i / files.length) * 100}%`;
      
      let outputBlob;
      let tagsRemoved = 0;
      let tagsAdded = 0;
      let startScore = 90;
      
      // Determine options based on Pro status and profile settings
      const options = {
        keepIcc: false,
        keepAnnots: false,
        keepCameraSpecs: isPro,
        injectIdentity: isPro && (creatorProfile.name || creatorProfile.copyright || creatorProfile.url),
        creatorName: creatorProfile.name,
        copyright: creatorProfile.copyright,
        contactUrl: creatorProfile.url,
        aiOptOut: creatorProfile.aiOnly === true,
        isPro: isPro
      };

      // Run extraction to get real privacy score and tag counts before wiping
      try {
        const report = await extractMetadata(file);
        if (report) {
          tagsRemoved = report.tags.filter(t => 
            ['GPS Location', 'Device', 'Device ID', 'Timestamp', 'Identity', 'Origin & History', 'PDF Info'].includes(t.category)
          ).length;
          startScore = Math.min(90, report.privacyScore);
        }
      } catch(e) {}

      if (category === 'pdf') {
        const pdfBytes = await sanitizePDF(file, options);
        outputBlob = new Blob([pdfBytes], { type: 'application/pdf' });
        
        // Accurate PDF embedding count (Slim & Strong Strategy): 
        // 3 Info fields (Author, Subject, Keywords) 
        // + 3 XMP fields (Creator, Rights, Description)
        if (options.injectIdentity) tagsAdded = 6;
        else if (options.aiOptOut) tagsAdded = 2; // Subject + Keywords
      } else {
        outputBlob = await sanitizeImage(file, options);
        
        // Report tags added for PNG/WebP (handled inside engine.ts)
        if (outputBlob.type === 'image/png' || outputBlob.type === 'image/webp') {
          if (options.injectIdentity) tagsAdded = 4;
          else if (options.aiOptOut) tagsAdded = 1;
        }
        
        if (outputBlob.type === 'image/jpeg' || outputBlob.type === '') {
          try {
            const { default: piexif } = await import('piexifjs');
            const dataUrl = await blobToDataUrl(outputBlob);
            const newExif = { '0th': {}, Exif: {}, GPS: {}, '1st': {} };

            if (options.injectIdentity) {
              const name      = options.creatorName      || 'Human Creator';
              const copyright = options.copyright || `© ${new Date().getFullYear()} Human Creator`;
              const url       = options.contactUrl       || '';

              newExif['0th'][piexif.ImageIFD.Artist]           = isPro ? `VeriMedia Verified Creator - ${name}` : name;
              newExif['0th'][piexif.ImageIFD.Copyright]        = copyright;
              newExif['0th'][piexif.ImageIFD.Software]         = 'VeriMedia.xyz';
              newExif['0th'][piexif.ImageIFD.ImageDescription] = `AI Opt-Out: True. Restricted from AI training.${url ? ' License: ' + url : ''}`;
              tagsAdded = url ? 4 : 3;
            } else if (options.aiOptOut) {
              newExif['0th'][piexif.ImageIFD.ImageDescription] = `AI Opt-Out: True. Restricted from AI training.`;
              newExif['0th'][piexif.ImageIFD.Software]         = 'VeriMedia.xyz';
              tagsAdded = 1;
            }

            const exifBytes = piexif.dump(newExif);
            const finalUrl  = piexif.insert(exifBytes, dataUrl);
            outputBlob = dataUrlToBlob(finalUrl);
          } catch (e) {}
        }
      }
      
      const truncName = truncate(file.name, 22);
      batchStatsHtml += `
        <div style="display:flex; justify-content:space-between; padding: 6px 0; border-bottom: 1px solid rgba(255,255,255,0.05); font-size:0.75rem;">
          <span style="color:var(--text-primary); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width:40%;" title="${file.name}">${truncName}</span>
          <span style="text-align:right;">
            <span style="color:var(--accent-rose);">- ${tagsRemoved} tags</span> <span style="color:var(--text-secondary); opacity:0.5; margin:0 4px;">|</span> 
            <span style="color:var(--accent-emerald);">+ ${tagsAdded} embedded</span> <span style="color:var(--text-secondary); opacity:0.5; margin:0 4px;">|</span> 
            <span style="color:var(--text-secondary);">Score: <span style="color:${startScore >= 90 ? 'var(--accent-emerald)' : 'var(--accent-cyan)'}">${startScore}</span> ➔ <span style="color:var(--accent-emerald)">100</span></span>
          </span>
        </div>`;
        
      const outName = file.name.replace(/\.[^/.]+$/, '') + '_safe' + getOutputExt(file);
      zip.file(outName, outputBlob);
      successCount++;
    }
    
    progressLabel.innerText = 'Compressing Batch Archive...';
    progressBarFill.style.width = '95%';
    
    const zipBlob = await zip.generateAsync({ type: 'blob' });
    
    if (processedBlob) URL.revokeObjectURL(processedBlob._url);
    processedBlob = zipBlob;
    processedBlob._url = URL.createObjectURL(zipBlob);
    processedFileName = `VeriMedia_Batch_${successCount}_Files.zip`;
    
    statusBadge.innerText = 'Complete';
    statusBadge.className = 'status-indicator complete';
    
    reportContent.innerHTML = `
      <div style="text-align:center; padding: 1rem 0;">
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--accent-emerald)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-bottom:1rem;"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
        <h3 style="font-family:var(--font-headers); color:var(--text-primary); margin-bottom:0.25rem;">Batch Processing Complete</h3>
        <p style="color:var(--text-secondary); margin-bottom: 1.2rem;">Successfully sanitized ${successCount} files.</p>
        
        <details style="margin-bottom: 1.5rem; text-align: left; background: rgba(255,255,255,0.02); padding: 0.75rem 1rem; border-radius: 8px; border: 1px solid var(--border-color);">
          <summary style="cursor: pointer; color: var(--accent-cyan); font-weight: 500; font-size: 0.85rem; outline: none; user-select:none;">View Detailed File Report</summary>
          <div style="margin-top: 0.75rem; max-height: 180px; overflow-y: auto; padding-right: 5px;" class="custom-scrollbar">
            ${batchStatsHtml}
          </div>
        </details>

        <button class="download-sec-btn" id="downloadBtn">Download Secure ZIP Archive</button>
      </div>
    `;
    document.getElementById('downloadBtn').addEventListener('click', triggerDownload);
    
  } catch (err) {
    statusBadge.innerText = 'Error';
    statusBadge.className = 'status-indicator idle';
    reportContent.innerHTML = buildErrorItem(`Batch processing failed: ${err.message}`);
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
      ['GPS Location', 'Device', 'Device ID', 'Timestamp', 'Identity', 'Origin & History'].includes(t.category)
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

    // Origin/History data detection
    const c2paTags = report.tags.filter(t => t.category === 'Origin & History');
    if (c2paTags.length > 0) {
      listItemsHtml += buildDangerItem(`Embedded history and source manifests detected and removed.`, animDelay);
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
   4. License Validation Engine (via Cloudflare Worker proxy)
   
   ARCHITECTURE:
   Browser → POST https://verimedia-license.YOUR_SUBDOMAIN.workers.dev/validate
           → CF Worker (holds Paddle API key as secret env var)
           → Paddle API
           ← { valid: true/false }
   
   The browser NEVER touches Paddle credentials directly.
   Deploy the worker from /cf-worker/license-validator.js
   ========================================================================== */

// ── License configuration ─────────────────────────────────────────────────────
// Point this at your deployed Cloudflare Worker URL.
// See cf-worker/license-validator.js for the worker source.
const LICENSE_VALIDATE_URL = 'https://license.verimedia.xyz/validate';

const STORAGE_KEY_LICENSE = 'vm_license_key';
const STORAGE_KEY_DEVICE  = 'vm_device_id';

// ── Device Identity (for 3-device limit) ──────────────────────────────────────
function getDeviceId() {
  let id = localStorage.getItem(STORAGE_KEY_DEVICE);
  if (!id) {
    id = crypto.randomUUID?.() || Math.random().toString(36).slice(2) + Date.now().toString(36);
    localStorage.setItem(STORAGE_KEY_DEVICE, id);
  }
  return id;
}

// ── Modal element refs ────────────────────────────────────────────────────────
const paymentModal      = document.getElementById('paymentModal');
const activateKeyBtn    = document.getElementById('activateKeyBtn');
const closeModal        = document.getElementById('closeModal');
const switchToActivate  = document.getElementById('switchToActivate');
const switchToBuy       = document.getElementById('switchToBuy');
const activateLicenseBtn = document.getElementById('activateLicenseBtn');
const licenseKeyInput   = document.getElementById('licenseKeyInput');
const licenseError      = document.getElementById('licenseError');
const closeSuccessBtn   = document.getElementById('closeSuccessBtn');

const paddleCheckoutBtns = document.querySelectorAll('#paddleCheckoutBtn, .paddle-checkout-btn');

const viewBuy      = document.getElementById('modalViewBuy');
const viewActivate = document.getElementById('modalViewActivate');
const viewSuccess  = document.getElementById('modalViewSuccess');

let modalTriggerElement = null; // For a11y: store element that opened the modal

// ── Paddle.js Initialization ──────────────────────────────────────────────────
// Initialize Paddle for Billing v2
if (window.Paddle) {
  window.Paddle.Initialize({ 
    token: 'live_2f19b88294a235307e74e44f820',
    eventCallback: function(event) {
      console.log('Paddle Event:', event.name, event.data);
      if (event.name === 'checkout.completed') {
        // Instantly close Paddle's default success overlay
        if (window.Paddle && window.Paddle.Checkout) {
          window.Paddle.Checkout.close();
        }

        // STRICTLY grab the transaction ID (txn_...).
        const txnId = event.data?.transaction_id || event.data?.id; 
        
        if (txnId) {
          console.log('Automated Activation starting for:', txnId);
          
          // Switch to activate view and show a loading state
          openModal(viewActivate);
          if (licenseKeyInput) licenseKeyInput.value = txnId.toUpperCase();
          showLicenseError('Securely activating your Creator Pro license. Please wait...');
          licenseError.style.color = 'var(--accent-cyan)'; // Make it look like a status message, not an error
          setActivateBtnLoading(true);
          
          // Polling to fix race condition (Webhook takes a few seconds to reach CF)
          let attempts = 0;
          const poll = setInterval(async () => {
            attempts++;
            try {
              const data = await verifyLicense(txnId);
              if (data.valid === true) {
                clearInterval(poll);
                localStorage.setItem(STORAGE_KEY_LICENSE, txnId.toUpperCase());
                setProActiveUI();
                licenseError.style.color = ''; // reset color
                clearLicenseError();
                openModal(viewSuccess);
              } else if (attempts >= 10) {
                clearInterval(poll);
                setActivateBtnLoading(false);
                licenseError.style.color = ''; // reset color
                showLicenseError('Activation is taking longer than usual. Please click Activate manually.');
              }
            } catch (e) {
              if (attempts >= 10) {
                clearInterval(poll);
                setActivateBtnLoading(false);
                licenseError.style.color = '';
              }
            }
          }, 2000); // Check every 2 seconds, up to 10 times (20 seconds)
          
        } else {
          console.warn('Checkout completed, but no transaction_id found in payload.', event.data);
          openModal(viewSuccess); // Fallback
        }
      }
    }
  });
}

function openCheckout() {
  if (!window.Paddle) {
    alert('Payment system is loading, please try again in a moment.');
    return;
  }
  
  window.Paddle.Checkout.open({
    items: [{
      priceId: 'pri_01ks3bgn6zyh2bsvqk438c3dcv', 
      quantity: 1
    }],
    customData: {
      // Pass the device ID to the checkout so we can trace it later if needed
      device_id: getDeviceId()
    },
    settings: {
      displayMode: 'overlay',
      theme: 'dark',
      locale: 'en',
      allowLogout: false
    },
    // Theme customization to match VeriMedia's cosmic cyberpunk look
    theme: {
      primaryColor: '#06b6d4', // Your Cyan accent
      fontFamily: 'Outfit',
      buttonRadius: 10,
      inputRadius: 8,
      headerColor: '#ffffff',
      textColor: '#94a3b8' // --text-secondary
    }
  });
  }

  paddleCheckoutBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    closePaymentModal(); // Close our local modal first
    openCheckout();      // Open Paddle overlay
  });
  });

  // ── Modal view switcher ───────────────────────────────────────────────────────
  function showModalView(view) {
  [viewBuy, viewActivate, viewSuccess].forEach(v => v.style.display = 'none');
  view.style.display = 'block';
  }

  function openModal(startView = viewBuy) {
  modalTriggerElement = document.activeElement; // Store focus for later
  showModalView(startView);
  paymentModal.classList.add('active');
  paymentModal.setAttribute('aria-hidden', 'false');
  closeModal.focus(); // Move focus inside the modal to the close button
  }

  function closePaymentModal() {
  paymentModal.classList.remove('active');
  paymentModal.setAttribute('aria-hidden', 'true');
  if (modalTriggerElement) {
    modalTriggerElement.focus(); // Return focus to the element that opened the modal
  }
  }

  // ── UI state helpers ──────────────────────────────────────────────────────────
  function setProActiveUI() {
  isPro = true;
  paddleCheckoutBtns.forEach(btn => {
    btn.textContent = 'Creator Pro Active';
    btn.style.background = 'var(--accent-emerald)';
    btn.style.cursor = 'default';
    btn.disabled = true;
  });
  if (activateKeyBtn) activateKeyBtn.style.display = 'none';

  // Unlock bulk selection for Pro users
  if (fileInput) {
    fileInput.multiple = true;
    fileInput.setAttribute('multiple', 'multiple');
  }
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

  // ── Core: Verify a license key via CF Worker proxy ───────────────────────────
  async function verifyLicense(licenseKey) {
  const res = await fetch(LICENSE_VALIDATE_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      license_key: licenseKey.trim(),
      device_id:   getDeviceId()
    }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json(); // expects { valid: boolean, error?: string }
  }

  // ── Core: Silent re-validation on page load ───────────────────────────────────
  async function validateStoredLicense() {
  const key = localStorage.getItem(STORAGE_KEY_LICENSE);
  if (!key) return false;

  try {
    const data = await verifyLicense(key);
    return data.valid === true;
  } catch {
    // Network failure — trust cached state to avoid locking out offline users
    return true;
  }
  }

  // ── Events: Upgrade / Activate buttons ───────────────────────────────────────
  if (activateKeyBtn) {
    activateKeyBtn.addEventListener('click', () => openModal(viewActivate));
  }

  // ── Active Key Visibility Toggle ─────────────────────────────────────────────
  const toggleKeyBtn = document.getElementById('toggleKeyVisibility');
  const keyInput = document.getElementById('profileKeyInput');
  const eyeOpen = document.getElementById('eyeIconOpen');
  const eyeClosed = document.getElementById('eyeIconClosed');

  if (toggleKeyBtn && keyInput) {
    toggleKeyBtn.addEventListener('click', () => {
      const isHidden = keyInput.type === 'password';
      keyInput.type = isHidden ? 'text' : 'password';
      eyeOpen.style.display = isHidden ? 'none' : 'block';
      eyeClosed.style.display = isHidden ? 'block' : 'none';
    });
  }

  // ── Profile Export/Import ────────────────────────────────────────────────────
  const exportBtn = document.getElementById('exportProfileBtn');
  const importBtn = document.getElementById('importProfileBtn');
  const importInput = document.getElementById('importProfileInput');

  if (exportBtn) {
    exportBtn.addEventListener('click', () => {
      // Clone profile to ensure we don't accidentally include sensitive data
      const exportData = {
        version: "1.0",
        timestamp: new Date().toISOString(),
        profile: { ...creatorProfile }
      };

      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `verimedia-profile-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    });
  }

  if (importBtn && importInput) {
    importBtn.addEventListener('click', () => importInput.click());

    importInput.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;

      try {
        const text = await file.text();
        const data = JSON.parse(text);

        if (data && data.profile) {
          // Basic schema validation
          const imported = data.profile;
          creatorProfile = {
            name:       String(imported.name      || ''),
            copyright:  String(imported.copyright || ''),
            url:        String(imported.url       || ''),
            aiOnly:     Boolean(imported.aiOnly),
            whitelabel: Boolean(imported.whitelabel)
          };

          saveProfile(creatorProfile);

          // Refresh UI fields
          profileName.value = creatorProfile.name;
          profileCopy.value = creatorProfile.copyright;
          profileUrl.value  = creatorProfile.url;
          if (profileAiOnly) profileAiOnly.checked = creatorProfile.aiOnly;
          if (profileWhitelabel) profileWhitelabel.checked = creatorProfile.whitelabel;

          // Visual feedback
          const originalText = importBtn.textContent;
          importBtn.textContent = '✓ Done!';
          setTimeout(() => { importBtn.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="margin-right:4px;"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>Import`; }, 2000);
        } else {
          alert('Invalid profile file. Ensure it is a VeriMedia JSON export.');
        }
      } catch (err) {
        alert('Failed to read profile file.');
      } finally {
        importInput.value = ''; // Reset for next time
      }
    });
  }

  closeModal.addEventListener('click', closePaymentModal);  paymentModal.addEventListener('click', e => { if (e.target === paymentModal) closePaymentModal(); });
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
    const data = await verifyLicense(key);

    if (data.valid === true) {
      localStorage.setItem(STORAGE_KEY_LICENSE, key);
      setProActiveUI();
      showModalView(viewSuccess);
    } else {
      showLicenseError(data.error || 'Invalid or expired license key. Double-check your purchase email or contact support.');
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
