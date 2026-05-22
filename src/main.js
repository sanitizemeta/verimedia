import { sanitizeImage, sanitizePDF, preloadEngine, extractMetadata } from './lib/engine.ts';

/* ==========================================================================
   🌍 0. Localization & i18n Engine
   ========================================================================== */
const LANG_KEY = 'vm_lang';
const urlParams = new URLSearchParams(window.location.search);
const urlLang = urlParams.get('lang');
const supportedLangs = ['en', 'es', 'fr'];

let currentLang = (urlLang && supportedLangs.includes(urlLang)) 
  ? urlLang 
  : (localStorage.getItem(LANG_KEY) || 'en');

let translations = {};

async function loadTranslations(lang) {
  try {
    const response = await fetch(`/locales/${lang}.json`);
    translations = await response.json();
    applyTranslations();
    
    const langDisplay = document.getElementById('currentLang');
    if (langDisplay) langDisplay.textContent = lang.toUpperCase();
    
    localStorage.setItem(LANG_KEY, lang);

    // Update URL parameter without reloading (for SEO/User sharing)
    const newUrl = new URL(window.location);
    if (lang === 'en') {
      newUrl.searchParams.delete('lang');
    } else {
      newUrl.searchParams.set('lang', lang);
    }
    window.history.replaceState({}, '', newUrl);
  } catch (err) {
    console.error('Failed to load translations:', err);
  }
}

/**
 * ⚡ Live Social Proof Ticker State
 */
let liveStrippedCount = 14582 + Math.floor(Math.random() * 200);

function applyTranslations() {
  const elements = document.querySelectorAll('[data-i18n], [data-i18n-alt], [data-i18n-html]');
  elements.forEach(el => {
    // Skip updating pricing button if Pro is active
    if (isPro && (el.id === 'paddleCheckoutBtn' || el.classList.contains('paddle-checkout-btn'))) {
      return;
    }

    const key = el.getAttribute('data-i18n');
    const altKey = el.getAttribute('data-i18n-alt');
    const htmlKey = el.getAttribute('data-i18n-html');

    if (key) {
      const keys = key.split('.');
      let value = translations;
      keys.forEach(k => { value = value ? value[k] : null; });
      
      if (value) {
        if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
          el.placeholder = value;
        } else {
          el.textContent = value;
        }
      }
    }

    if (altKey) {
      const keys = altKey.split('.');
      let value = translations;
      keys.forEach(k => { value = value ? value[k] : null; });
      if (value && el.tagName === 'IMG') {
        el.alt = value;
      }
    }

    if (htmlKey) {
      const keys = htmlKey.split('.');
      let value = translations;
      keys.forEach(k => { value = value ? value[k] : null; });
      if (value) {
        // Special handling for the live counter placeholder
        if (value.includes('{{count}}')) {
          el.innerHTML = value.replace('{{count}}', `<span id="liveCount">${liveStrippedCount.toLocaleString()}</span>`);
        } else {
          el.innerHTML = value;
        }
      }
    }
  });

  // Re-apply Pro UI if active
  if (isPro) setProActiveUI();

  // ── SEO & Metadata Synchronization ───────────────────────────────────────
  const lang = currentLang || 'en';
  document.documentElement.lang = lang;

  // Translate document title
  const pagePath = window.location.pathname.replace('.html', '').split('/').pop() || 'index';
  let titleVal = '';
  if (pagePath === 'index' || pagePath === '') {
    titleVal = translations.hero?.title ? `${translations.hero.title} | VeriMedia` : 'VeriMedia | Browser-Based AI Shield';
  } else if (translations[`${pagePath}_page`]?.h1) {
    titleVal = `${translations[`${pagePath}_page`].h1} | VeriMedia.xyz`;
  }
  if (titleVal) document.title = titleVal;

  // Update Meta Description
  const metaDesc = document.querySelector('meta[name="description"]');
  const pageKey = `${pagePath}_page`;
  const pageSummary = translations[pageKey]?.intro || translations.hero?.summary;
  
  if (metaDesc && pageSummary) {
    metaDesc.setAttribute('content', pageSummary);
  }

  // Update OpenGraph Description
  const ogDesc = document.querySelector('meta[property="og:description"]');
  if (ogDesc && pageSummary) {
    ogDesc.setAttribute('content', pageSummary);
  }

  // Update Localized JSON-LD Structured Data
  updateStructuredData(lang, translations, pagePath);
}

/**
 * 🛠️ Updates the JSON-LD structured data for the current language.
 */
function updateStructuredData(lang, trans, pagePath) {
  let script = document.getElementById('localized-schema');
  if (!script) return; // Only update if placeholder exists

  const pageKey = `${pagePath}_page`;
  const isIndex = pagePath === 'index' || pagePath === '';
  const langQuery = lang === 'en' ? '' : `?lang=${lang}`;

  const schema = [];

  // Breadcrumb Schema (Always included)
  const breadcrumbs = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      {
        "@type": "ListItem",
        "position": 1,
        "name": trans.header?.home || "Home",
        "item": `https://verimedia.xyz/${langQuery}`
      }
    ]
  };

  if (!isIndex) {
    breadcrumbs.itemListElement.push({
      "@type": "ListItem",
      "position": 2,
      "name": trans[pageKey]?.h1 || document.title,
      "item": `https://verimedia.xyz/${pagePath}.html${langQuery}`
    });
  }
  schema.push(breadcrumbs);

  if (isIndex) {
    schema.push(
      {
        "@context": "https://schema.org",
        "@type": "SoftwareApplication",
        "name": "VeriMedia",
        "operatingSystem": "Web Browser",
        "applicationCategory": "UtilitiesApplication",
        "featureList": trans.pricing?.pro_f2 + ", " + trans.kb?.ai_title + ", " + trans.kb?.pdf_title,
        "offers": {
          "@type": "Offer",
          "price": "19.00",
          "priceCurrency": "USD",
          "availability": "https://schema.org/InStock"
        },
        "description": trans.hero?.summary
      },
      {
        "@context": "https://schema.org",
        "@type": "HowTo",
        "name": trans.faq?.q2 || "How to Protect Photos",
        "description": trans.hero?.summary,
        "step": [
          {
            "@type": "HowToStep",
            "name": trans.sandbox?.drop_title,
            "text": trans.sandbox?.drop_subtitle
          },
          {
            "@type": "HowToStep",
            "name": trans.profile?.title,
            "text": trans.profile?.subtitle
          },
          {
            "@type": "HowToStep",
            "name": trans.profile?.save,
            "text": trans.sandbox?.stage_img_4
          }
        ]
      }
    );
  } else {
    // Secondary Page Schema (WebPage + specific breadcrumbs/policy info)
    schema.push({
      "@context": "https://schema.org",
      "@type": "WebPage",
      "name": trans[pageKey]?.h1 || document.title,
      "description": trans[pageKey]?.intro || trans.hero?.summary,
      "publisher": {
        "@type": "Organization",
        "name": "VeriMedia",
        "url": "https://verimedia.xyz"
      }
    });
  }

  script.textContent = JSON.stringify(schema);
}

// ── Language Switcher UI ───────────────────────────────────────────────────
const langToggle = document.getElementById('langToggle');
const langDropdown = document.getElementById('langDropdown');
const langOpts = document.querySelectorAll('.lang-opt');

if (langToggle && langDropdown) {
  langToggle.addEventListener('click', (e) => {
    e.stopPropagation();
    const isVisible = langDropdown.style.display === 'block';
    langDropdown.style.display = isVisible ? 'none' : 'block';
  });

  window.addEventListener('click', () => {
    langDropdown.style.display = 'none';
  });

  langOpts.forEach(opt => {
    opt.addEventListener('click', () => {
      const lang = opt.getAttribute('data-lang');
      currentLang = lang;
      loadTranslations(lang);
    });
  });
}

// Boot translation
loadTranslations(currentLang);


/* ==========================================================================
   🌌 1. Space-Dust Canvas Particle Engine (Living Background)
   ========================================================================== */
const canvas = document.getElementById('particleCanvas');
const ctx = canvas ? canvas.getContext('2d') : null;

if (ctx) {
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
}


/* ==========================================================================
   🛡️ 2. Creator Profile & Identity
   ========================================================================== */
const PROFILE_KEY = 'vm_creator_profile';
const STORAGE_KEY_LICENSE = 'vm_license_key';
let isPro = false;

function loadProfile() {
  try {
    const data = JSON.parse(localStorage.getItem(PROFILE_KEY) || '{}');
    if (data.aiOnly === undefined) data.aiOnly = true;
    return data;
  } catch { return { aiOnly: true }; }
}

function saveProfile(data) {
  localStorage.setItem(PROFILE_KEY, JSON.stringify(data));
}

let creatorProfile = loadProfile();

// Global Profile Modal Selectors
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
  if (!profilePanel) return;

  // Populate fields if they exist
  if (profileName) profileName.value = creatorProfile.name || '';
  if (profileCopy) profileCopy.value = creatorProfile.copyright || '';
  if (profileUrl)  profileUrl.value  = creatorProfile.url || '';
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
    if (profileSave) profileSave.style.display = 'block';
    
    [profileName, profileCopy, profileUrl, profileWhitelabel].forEach(el => { if(el) el.disabled = false; });
  } else {
    if (proOverlay) proOverlay.style.display = 'flex';
    if (activeKeyDisplay) activeKeyDisplay.style.display = 'none';
    if (profileWhitelabelWrap) profileWhitelabelWrap.style.display = 'none';
    if (profileSave) profileSave.style.display = 'none';

    [profileName, profileCopy, profileUrl, profileWhitelabel].forEach(el => { if(el) el.disabled = true; });
  }

  profilePanel.classList.add('active');
}

function closeProfilePanel() {
  if (profilePanel) profilePanel.classList.remove('active');
}

// Attach Global Profile Events
if (profileBtn)   profileBtn.addEventListener('click', openProfilePanel);
if (profileClose) profileClose.addEventListener('click', closeProfilePanel);
if (profilePanel) profilePanel.addEventListener('click', e => { if (e.target === profilePanel) closeProfilePanel(); });

if (profileSave) {
  profileSave.addEventListener('click', (e) => {
    e.preventDefault();
    creatorProfile = {
      name:      profileName ? profileName.value.trim() : '',
      copyright: profileCopy ? profileCopy.value.trim() : '',
      url:       profileUrl ? profileUrl.value.trim() : '',
      aiOnly:    profileAiOnly ? profileAiOnly.checked : false,
      whitelabel: profileWhitelabel ? profileWhitelabel.checked : false
    };
    saveProfile(creatorProfile);

    const originalText = profileSave.textContent;
    profileSave.textContent = translations.profile?.save || '✓ Saved!';
    profileSave.style.background = 'var(--accent-emerald)';
    setTimeout(() => {
      profileSave.textContent = originalText;
      profileSave.style.background = '';
    }, 1800);
    closeProfilePanel();
  });
}

// ── Profile Export/Import ────────────────────────────────────────────────────
const exportBtn = document.getElementById('exportProfileBtn');
const importBtn = document.getElementById('importProfileBtn');
const importInput = document.getElementById('importProfileInput');

if (exportBtn) {
  exportBtn.addEventListener('click', () => {
    const exportData = { version: "1.0", timestamp: new Date().toISOString(), profile: { ...creatorProfile } };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `verimedia-profile-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
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
        creatorProfile = {
          name: String(data.profile.name || ''),
          copyright: String(data.profile.copyright || ''),
          url: String(data.profile.url || ''),
          aiOnly: Boolean(data.profile.aiOnly),
          whitelabel: Boolean(data.profile.whitelabel)
        };
        saveProfile(creatorProfile);
        openProfilePanel(); // Refresh UI
        importBtn.textContent = '✓ Done!';
        setTimeout(() => { importBtn.textContent = translations.profile?.import || 'Import'; }, 2000);
      }
    } catch (err) { alert('Failed to read profile file.'); }
    finally { importInput.value = ''; }
  });
}

const copyKeyBtn = document.getElementById('copyKeyBtn');
if (copyKeyBtn) {
  copyKeyBtn.addEventListener('click', () => {
    const pkInput = document.getElementById('profileKeyInput');
    if (pkInput) {
      pkInput.select();
      document.execCommand('copy');
      const originalText = copyKeyBtn.textContent;
      copyKeyBtn.textContent = translations.profile?.copy_done || 'Copied!';
      setTimeout(() => { copyKeyBtn.textContent = originalText; }, 2000);
    }
  });
}

const toggleKeyBtn = document.getElementById('toggleKeyVisibility');
if (toggleKeyBtn) {
  toggleKeyBtn.addEventListener('click', () => {
    const pkInput = document.getElementById('profileKeyInput');
    const eyeOpen = document.getElementById('eyeIconOpen');
    const eyeClosed = document.getElementById('eyeIconClosed');
    if (pkInput && eyeOpen && eyeClosed) {
      const isHidden = pkInput.type === 'password';
      pkInput.type = isHidden ? 'text' : 'password';
      eyeOpen.style.display = isHidden ? 'none' : 'block';
      eyeClosed.style.display = isHidden ? 'block' : 'none';
    }
  });
}


/* ==========================================================================
   📊 3. Growth & License Logic
   ========================================================================== */
const LICENSE_VALIDATE_URL = 'https://license.verimedia.xyz/validate';

function getDeviceId() {
  let id = localStorage.getItem('vm_device_id');
  if (!id) { 
    id = crypto.randomUUID?.() || 'dev_' + Math.random().toString(36).substr(2, 9); 
    localStorage.setItem('vm_device_id', id); 
  }
  return id;
}

// Modal View Switcher
const paymentModal = document.getElementById('paymentModal');
const viewBuy      = document.getElementById('modalViewBuy');
const viewActivate = document.getElementById('modalViewActivate');
const viewSuccess  = document.getElementById('modalViewSuccess');
const closeModal   = document.getElementById('closeModal');

const switchToActivate  = document.getElementById('switchToActivate');
const switchToBuy       = document.getElementById('switchToBuy');
const activateLicenseBtn = document.getElementById('activateLicenseBtn');
const licenseKeyInput   = document.getElementById('licenseKeyInput');
const licenseError      = document.getElementById('licenseError');
const closeSuccessBtn   = document.getElementById('closeSuccessBtn');

const paddleCheckoutBtns = document.querySelectorAll('#paddleCheckoutBtn, .paddle-checkout-btn');

let modalTriggerElement = null;

function showModalView(view) {
  if (!viewBuy || !viewActivate || !viewSuccess) return;
  [viewBuy, viewActivate, viewSuccess].forEach(v => v.style.display = 'none');
  view.style.display = 'block';
}

function openModal(startView = viewBuy) {
  if (!paymentModal) return;
  modalTriggerElement = document.activeElement;
  showModalView(startView);
  paymentModal.classList.add('active');
}

function closePaymentModal() {
  if (paymentModal) paymentModal.classList.remove('active');
  if (modalTriggerElement) modalTriggerElement.focus();
}

if (closeModal) closeModal.addEventListener('click', closePaymentModal);
if (paymentModal) paymentModal.addEventListener('click', e => { if (e.target === paymentModal) closePaymentModal(); });

if (switchToActivate) switchToActivate.addEventListener('click', () => { if(licenseError) licenseError.style.display = 'none'; showModalView(viewActivate); });
if (switchToBuy) switchToBuy.addEventListener('click', () => showModalView(viewBuy));
if (closeSuccessBtn) closeSuccessBtn.addEventListener('click', closePaymentModal);

// Additional event listeners for the profile modal
const profileUpgradeBtn = document.getElementById('profileUpgradeBtn');
if (profileUpgradeBtn) {
  profileUpgradeBtn.addEventListener('click', () => {
    closeProfilePanel();
    openModal(viewBuy);
  });
}

const activateKeyBtn = document.getElementById('activateKeyBtn');
if (activateKeyBtn) {
  activateKeyBtn.addEventListener('click', () => openModal(viewActivate));
}

// License UI Gating
function setProActiveUI() {
  isPro = true;
  document.querySelectorAll('#paddleCheckoutBtn, .paddle-checkout-btn').forEach(btn => {
    btn.textContent = translations.checkout?.success_title || 'Creator Pro Active';
    btn.style.background = 'var(--accent-emerald)';
    btn.disabled = true;
  });
  
  // Hide all activation and purchase links/containers
  const elementsToHide = [
    '.already-have-key-link',
    '#activateKeyBtn',
    '#switchToActivate',
    '.modal-switch-link',
    '.modal-footnote'
  ];
  
  elementsToHide.forEach(selector => {
    document.querySelectorAll(selector).forEach(el => el.style.display = 'none');
  });

  const fInput = document.getElementById('fileInput');
  if (fInput) fInput.multiple = true;
}

async function verifyLicense(key) {
  const res = await fetch(LICENSE_VALIDATE_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ license_key: key.trim(), device_id: getDeviceId() }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

if (activateLicenseBtn && licenseKeyInput) {
  activateLicenseBtn.addEventListener('click', async () => {
    const key = licenseKeyInput.value.trim();
    if (!key) return;
    if(licenseError) licenseError.style.display = 'none';
    activateLicenseBtn.disabled = true;
    try {
      const data = await verifyLicense(key);
      if (data.valid) {
        localStorage.setItem(STORAGE_KEY_LICENSE, key);
        setProActiveUI();
        showModalView(viewSuccess);
      } else {
        if(licenseError) {
          licenseError.textContent = data.error || 'Invalid key.';
          licenseError.style.display = 'block';
        }
      }
    } catch { if(licenseError) { licenseError.textContent = 'Network error.'; licenseError.style.display = 'block'; } }
    finally { activateLicenseBtn.disabled = false; }
  });
}

// Boot sequence: validate license
(async () => {
  const key = localStorage.getItem(STORAGE_KEY_LICENSE);
  if (key) {
    try {
      const data = await verifyLicense(key);
      if (data.valid) setProActiveUI();
      else localStorage.removeItem(STORAGE_KEY_LICENSE);
    } catch { setProActiveUI(); }
  }
  
  const params = new URLSearchParams(window.location.search);
  const lCode = params.get('license') || params.get('license_code');
  if (lCode && !isPro) {
    openModal(viewActivate);
    if (licenseKeyInput) {
      licenseKeyInput.value = lCode;
      setTimeout(() => activateLicenseBtn.click(), 500);
    }
  }
})();

// Paddle Initialization
if (window.Paddle) {
  window.Paddle.Initialize({ 
    token: 'live_2f19b88294a235307e74e44f820',
    eventCallback: function(event) {
      if (event.name === 'checkout.completed') {
        const txnId = event.data?.transaction_id || event.data?.id; 
        if (txnId) {
          localStorage.setItem(STORAGE_KEY_LICENSE, txnId.toUpperCase());
          setProActiveUI();
          openModal(viewSuccess);
        }
      }
    }
  });
}

paddleCheckoutBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    if (window.Paddle) {
      window.Paddle.Checkout.open({
        items: [{ priceId: 'pri_01ks3bgn6zyh2bsvqk438c3dcv', quantity: 1 }],
        settings: { displayMode: 'overlay', theme: 'dark' }
      });
    }
  });
});


/* ==========================================================================
   ⚙️ 4. Main Processing Engine (Index Only)
   ========================================================================== */
const dropzone = document.getElementById('dropzone');
const fileInput = document.getElementById('fileInput');
const statusBadge = document.getElementById('statusBadge');
const reportContent = document.getElementById('reportContent');
let processedBlob = null;
let processedFileName = '';

if (dropzone && fileInput) {
  dropzone.addEventListener('click', () => fileInput.click());
  dropzone.addEventListener('dragover', e => { e.preventDefault(); dropzone.classList.add('dragover'); });
  dropzone.addEventListener('dragleave', () => dropzone.classList.remove('dragleave'));
  dropzone.addEventListener('drop', e => { e.preventDefault(); dropzone.classList.remove('dragover'); if (e.dataTransfer.files.length) handleFiles(e.dataTransfer.files); });
  fileInput.addEventListener('change', e => { if (e.target.files.length) handleFiles(e.target.files); });

  const trySampleBtn = document.getElementById('trySampleBtn');
  const sampleLinkBtn = document.getElementById('sampleLinkBtn');
  const sampleFileBtn = document.getElementById('sampleFileBtn');
  
  [trySampleBtn, sampleLinkBtn, sampleFileBtn].forEach(btn => {
    if (btn) {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        runInteractiveDemo();
      });
    }
  });

  preloadEngine();
  // Initial ticker run
  setTimeout(runLiveTicker, 100);
}

/**
 * ⚡ Live Social Proof Ticker
 */
function runLiveTicker() {
  const el = document.getElementById('liveCount');
  if (el) {
    el.innerText = liveStrippedCount.toLocaleString();
  }
}

// Update the interval logic to just increment the global variable and update the UI if element exists
setInterval(() => {
  liveStrippedCount += Math.floor(Math.random() * 3) + 1;
  const el = document.getElementById('liveCount');
  if (el) {
    el.innerText = liveStrippedCount.toLocaleString();
    el.style.transition = 'color 0.2s ease';
    el.style.color = '#fff';
    setTimeout(() => { el.style.color = 'var(--accent-emerald)'; }, 300);
  }
}, 5000);

async function runInteractiveDemo() {
  if (!reportContent) return;
  
  if(statusBadge) { statusBadge.innerText = 'Scanning...'; statusBadge.className = 'status-indicator scanning'; }
  
  // Show initial "Scary" Mock Metadata discovery
  reportContent.innerHTML = `
    <div class="audit-list" style="width:100%; text-align:left;">
      <div class="audit-item danger" style="animation-delay: 0.1s;">
        <span class="audit-icon">📍</span>
        <span>GPS: 37.7749° N, 122.4194° W (San Francisco)</span>
      </div>
      <div class="audit-item danger" style="animation-delay: 0.2s;">
        <span class="audit-icon">📱</span>
        <span>Device: iPhone 15 Pro (Apple iOS 17.4)</span>
      </div>
      <div class="audit-item danger" style="animation-delay: 0.3s;">
        <span class="audit-icon">📷</span>
        <span>Lens: 24mm f/1.78 (Serial: #88294A23)</span>
      </div>
    </div>
    <div class="progress-bar-track" style="margin-top:1.5rem;"><div class="progress-bar-fill" id="progressBarFill" style="width:0%;"></div></div>
    <p id="progressLabel" style="font-size:0.8rem; color:var(--accent-cyan); margin-top:0.5rem;">Forensic Scrubbing Active...</p>
  `;

  const progressBarFill = document.getElementById('progressBarFill');
  const progressLabel   = document.getElementById('progressLabel');

  const stages = [
    { p: 30, l: 'Purging GPS IFD segments...' },
    { p: 60, l: 'Scrubbing hardware identifiers...' },
    { p: 90, l: 'Injecting AI Opt-Out tags...' },
    { p: 100, l: 'Sanitization Complete.' }
  ];

  for (const s of stages) {
    await new Promise(r => setTimeout(r, 700));
    if(progressBarFill) progressBarFill.style.width = s.p + '%';
    if(progressLabel) progressLabel.innerText = s.l;
  }

  await new Promise(r => setTimeout(r, 400));
  if(statusBadge) { statusBadge.innerText = 'Complete'; statusBadge.className = 'status-indicator complete'; }
  
  auditStats = [{
    filename: 'demo_iphone_photo.jpg',
    removed: 28,
    added: 1,
    scoreBefore: 12,
    scoreAfter: 100
  }];

  processedBlob = null; 
  drawReport([{ name: 'demo_iphone_photo.jpg' }]);
  
  const dBtn = document.getElementById('downloadBtn');
  if (dBtn) {
    dBtn.innerText = 'Now Try Your Own File';
    dBtn.style.background = 'var(--accent-cyan)';
    dBtn.removeEventListener('click', triggerDownload);
    dBtn.addEventListener('click', () => { fileInput.click(); });
  }
}

let auditStats = [];

async function handleFiles(fileList) {
  const files = Array.from(fileList);
  if (files.length === 0) return;
  if (files.length > 1 && !isPro) {
    if(reportContent) reportContent.innerHTML = buildErrorItem('Bulk processing is a Creator Pro feature.');
    return;
  }
  
  auditStats = []; // Reset stats
  
  if (files.length === 1) await handleSingleFileUpload(files[0]);
  else await processBulkFiles(files);
}

async function handleSingleFileUpload(file) {
  const category = getFileCategory(file);
  if (!category) {
    reportContent.innerHTML = buildErrorItem('Unsupported file type.');
    return;
  }

  processedFileName = file.name.replace(/\.[^/.]+$/, '') + (category === 'pdf' ? '_clean.pdf' : '_ai_safe' + getOutputExt(file));
  if(statusBadge) { statusBadge.innerText = 'Scanning...'; statusBadge.className = 'status-indicator scanning'; }

  reportContent.innerHTML = `
    <div class="empty-state" style="margin:auto;width:100%;">
      <p id="progressLabel" style="font-family:var(--font-headers);font-weight:600;color:var(--accent-cyan);font-size:1.1rem;margin-bottom:0.5rem;letter-spacing:0.5px;">${translations.sandbox?.processing || 'Preparing...'}</p>
      <div class="progress-bar-track"><div class="progress-bar-fill" id="progressBarFill" style="width:0%;"></div></div>
    </div>
  `;

  const progressBarFill = document.getElementById('progressBarFill');
  const progressLabel   = document.getElementById('progressLabel');

  try {
    const options = {
      keepIcc: false, keepAnnots: false, keepCameraSpecs: isPro,
      injectIdentity: isPro && (creatorProfile.name || creatorProfile.copyright || creatorProfile.url),
      creatorName: creatorProfile.name, copyright: creatorProfile.copyright, contactUrl: creatorProfile.url,
      aiOptOut: creatorProfile.aiOnly === true, whitelabel: creatorProfile.whitelabel === true, isPro: isPro
    };

    let outputBlob;
    let reportBefore = await extractMetadata(file);
    let tagsAdded = options.injectIdentity ? 4 : (options.aiOptOut ? 1 : 0);

    if (category === 'pdf') {
      const pdfBytes = await sanitizePDF(file, options);
      outputBlob = new Blob([pdfBytes], { type: 'application/pdf' });
    } else {
      outputBlob = await sanitizeImage(file, options);
      
      if (outputBlob.type === 'image/jpeg' || outputBlob.type === '') {
        try {
          const { default: piexif } = await import('piexifjs');
          const dataUrl = await blobToDataUrl(outputBlob);
          const newExif = { '0th': {}, Exif: {}, GPS: {}, '1st': {} };
          const software = (options.isPro && options.whitelabel) ? 'Original Content Engine' : 'VeriMedia.xyz';
          if (options.injectIdentity) {
            newExif['0th'][piexif.ImageIFD.Artist] = (options.isPro && options.whitelabel) ? options.creatorName : `VeriMedia Verified Creator - ${options.creatorName}`;
            newExif['0th'][piexif.ImageIFD.Copyright] = options.copyright;
            newExif['0th'][piexif.ImageIFD.Software] = software;
            newExif['0th'][piexif.ImageIFD.ImageDescription] = `AI Opt-Out: True. Restricted from AI training.${options.contactUrl ? ' License: ' + options.contactUrl : ''}`;
          }
          outputBlob = dataUrlToBlob(piexif.insert(piexif.dump(newExif), dataUrl));
        } catch(e) {}
      }
    }

    auditStats.push({
      filename: file.name,
      removed: reportBefore.tags.length,
      added: tagsAdded,
      scoreBefore: reportBefore.privacyScore,
      scoreAfter: 100
    });

    if(progressBarFill) progressBarFill.style.width = '100%';
    if(statusBadge) { statusBadge.innerText = 'Complete'; statusBadge.className = 'status-indicator complete'; }
    processedBlob = outputBlob;
    processedBlob._url = URL.createObjectURL(outputBlob);
    drawReport([file]);
  } catch (error) {
    if(reportContent) reportContent.innerHTML = buildErrorItem('Engine error.');
  }
}

async function processBulkFiles(files) {
  const { default: JSZip } = await import('https://esm.sh/jszip@3.10.1');
  const zip = new JSZip();
  let successCount = 0;
  
  if(statusBadge) { statusBadge.innerText = 'Processing...'; statusBadge.className = 'status-indicator scanning'; }
  reportContent.innerHTML = `
    <div class="empty-state" style="margin:auto;width:100%;">
      <p style="font-family:var(--font-headers);font-weight:600;color:var(--accent-cyan);font-size:1.1rem;margin-bottom:0.5rem;">Batch Processing...</p>
    </div>
  `;

  const options = { isPro: true, aiOptOut: creatorProfile.aiOnly !== false, injectIdentity: !!(creatorProfile.name || creatorProfile.copyright || creatorProfile.url), ...creatorProfile };
  let tagsAdded = options.injectIdentity ? 4 : (options.aiOptOut ? 1 : 0);

  for (let file of files) {
    const category = getFileCategory(file);
    if (!category) continue;
    
    let reportBefore = await extractMetadata(file);
    const blob = category === 'pdf' ? new Blob([await sanitizePDF(file, options)]) : await sanitizeImage(file, options);
    zip.file(file.name.replace(/\.[^/.]+$/, '') + '_safe' + getOutputExt(file), blob);
    
    auditStats.push({
      filename: file.name,
      removed: reportBefore.tags.length,
      added: tagsAdded,
      scoreBefore: reportBefore.privacyScore,
      scoreAfter: 100
    });
    
    successCount++;
  }
  
  const zipBlob = await zip.generateAsync({ type: 'blob' });
  processedBlob = zipBlob;
  processedBlob._url = URL.createObjectURL(zipBlob);
  processedFileName = `VeriMedia_Batch_${successCount}_Files.zip`;
  
  if(statusBadge) { statusBadge.innerText = 'Complete'; statusBadge.className = 'status-indicator complete'; }
  drawReport(files);
}

function getFileCategory(file) {
  if (file.type === SUPPORTED_PDF) return 'pdf';
  if (SUPPORTED_IMAGE_TYPES.has(file.type)) return 'image';
  if (/\.(heic|heif)$/i.test(file.name)) return 'image';
  return null;
}

function getOutputExt(file) {
  if (/\.(heic|heif)$/i.test(file.name)) return '.jpg';
  return (file.name.match(/\.[^/.]+$/)?.[0] || '.jpg').toLowerCase();
}

async function blobToDataUrl(blob) {
  return new Promise(r => { const f = new FileReader(); f.onload = e => r(e.target.result); f.readAsDataURL(blob); });
}

function dataUrlToBlob(du) {
  const [m, b] = du.split(',');
  const mime = m.split(':')[1].split(';')[0];
  const bt = atob(b);
  const a = new Uint8Array(bt.length);
  for (let i=0; i<bt.length; i++) a[i] = bt.charCodeAt(i);
  return new Blob([a], { type: mime });
}

function buildErrorItem(m) { return `<div class="audit-item danger"><span>${m}</span></div>`; }

function triggerDownload() {
  if (!processedBlob?._url) return;
  const link = document.createElement('a');
  link.href = processedBlob._url;
  link.download = processedFileName;
  link.click();
}

const SUPPORTED_IMAGE_TYPES = new Set(['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/heic', 'image/heif']);
const SUPPORTED_PDF = 'application/pdf';

function drawReport(files) {
  const fileCount = files.length;
  reportContent.innerHTML = `
    <div style="text-align:center;">
      <h3 style="color:var(--accent-emerald); font-size:1.35rem; margin-bottom:0.4rem; font-family:var(--font-headers); font-weight:700;">${fileCount} file${fileCount !== 1 ? 's' : ''} stripped</h3>
      <button class="link-btn" id="viewAuditDetailsBtn" style="font-size:0.85rem; margin-bottom:1.5rem; text-decoration:underline; opacity:0.8;">View details</button>
      <br/>
      <button class="download-sec-btn" id="downloadBtn">Download ${fileCount > 1 ? `ZIP (${fileCount})` : 'Safe File'}</button>
    </div>
  `;
  const dBtn = document.getElementById('downloadBtn');
  if(dBtn) dBtn.addEventListener('click', triggerDownload);

  const viewBtn = document.getElementById('viewAuditDetailsBtn');
  if (viewBtn) {
    viewBtn.addEventListener('click', () => {
      const tbody = document.getElementById('auditDetailsTableBody');
      if (tbody) {
        tbody.innerHTML = auditStats.map(stat => {
          const displayFilename = stat.filename.length > 28 
            ? stat.filename.substring(0, 15) + '...' + stat.filename.substring(stat.filename.length - 10)
            : stat.filename;

          return `
            <tr>
              <td style="word-break: break-all; font-weight:500;">${displayFilename}</td>
              <td style="text-align: center; color: var(--accent-rose); font-weight:700;">${stat.removed}</td>
              <td style="text-align: center; color: var(--accent-emerald); font-weight:700;">${stat.added}</td>
              <td style="text-align: right;" class="score-jump">
                <span class="score-old">${stat.scoreBefore}</span> 
                <span class="score-new">→ ${stat.scoreAfter}</span>
              </td>
            </tr>
          `;
        }).join('');
      }
      const panel = document.getElementById('auditDetailsPanel');
      if (panel) panel.classList.add('active');
    });
  }
}

// Modal closing logic for Audit Details
const closeAuditPanelBtn = document.getElementById('closeAuditPanel');
const closeAuditBtn = document.getElementById('closeAuditBtn');
const auditDetailsPanel = document.getElementById('auditDetailsPanel');

if (closeAuditPanelBtn && closeAuditBtn) {
  [closeAuditPanelBtn, closeAuditBtn].forEach(btn => {
    btn.addEventListener('click', () => {
      if (auditDetailsPanel) auditDetailsPanel.classList.remove('active');
    });
  });
}

if (auditDetailsPanel) {
  auditDetailsPanel.addEventListener('click', e => { 
    if (e.target === auditDetailsPanel) auditDetailsPanel.classList.remove('active'); 
  });
}
