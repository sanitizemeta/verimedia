import JSZip from 'https://esm.sh/jszip@3.10.1';
import { trackEvent } from './lib/local-analytics.js';

let engineModulePromise = null;

function loadEngine() {
  if (!engineModulePromise) {
    engineModulePromise = import('./lib/engine.ts');
  }
  return engineModulePromise;
}

/* ==========================================================================
   📈 0a. Analytics Bootstrapping (Cloudflare / Umami)
   ========================================================================== */
function bootAnalytics() {
  const cfToken = document.querySelector('meta[name="cf-beacon-token"]')?.getAttribute('content')?.trim();
  if (cfToken && !cfToken.includes('YOUR_')) {
    const cf = document.createElement('script');
    cf.defer = true;
    cf.src = 'https://static.cloudflareinsights.com/beacon.min.js';
    cf.setAttribute('data-cf-beacon', JSON.stringify({ token: cfToken, spa: true }));
    document.head.appendChild(cf);
  }

  const umamiScriptUrl = document.querySelector('meta[name="umami-script-url"]')?.getAttribute('content')?.trim();
  const umamiWebsiteId = document.querySelector('meta[name="umami-website-id"]')?.getAttribute('content')?.trim();
  if (
    umamiScriptUrl &&
    umamiWebsiteId &&
    !umamiScriptUrl.includes('YOUR_') &&
    !umamiWebsiteId.includes('YOUR_')
  ) {
    const um = document.createElement('script');
    um.defer = true;
    um.src = umamiScriptUrl;
    um.setAttribute('data-website-id', umamiWebsiteId);
    document.head.appendChild(um);
  }
}
bootAnalytics();

/* ==========================================================================
   📌 0b. Sticky CTA Bar (appears after hero scrolls out of view)
   ========================================================================== */
function bootStickyCta() {
  const bar = document.getElementById('stickyCta');
  const hero = document.getElementById('calculator-section');
  if (!bar || !hero) return;

  const observer = new IntersectionObserver(
    ([entry]) => {
      if (!entry.isIntersecting) {
        bar.classList.add('visible');
        bar.removeAttribute('aria-hidden');
      } else {
        bar.classList.remove('visible');
        bar.setAttribute('aria-hidden', 'true');
      }
    },
    { threshold: 0.15 }
  );
  observer.observe(hero);
}
bootStickyCta();

/* ==========================================================================
   🌍 0. Localization & i18n Engine
   ========================================================================== */
const LANG_KEY = 'vm_lang';
const urlParams = new URLSearchParams(window.location.search);
const urlLang = urlParams.get('lang');
const supportedLangs = ['en', 'es', 'fr', 'de'];
const pathParts = window.location.pathname.split('/').filter(Boolean);
const pathLang = supportedLangs.includes(pathParts[0]) ? pathParts[0] : null;

let currentLang = (urlLang && supportedLangs.includes(urlLang))
  ? urlLang
  : (pathLang && supportedLangs.includes(pathLang))
    ? pathLang
    : 'en';

let translations = {};

// Lucide-style SVG Constants for Performance
const ICON_SCRUBBING = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="audit-icon pulse"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>`;
const ICON_CLEANED   = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" class="audit-icon" style="color:var(--emerald);"><polyline points="20 6 9 17 4 12"/></svg>`;
const ICON_ERROR     = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" class="audit-icon" style="color:var(--rose);"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`;
const ICON_SKIP      = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" class="audit-icon" style="color:var(--rose);"><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`;

async function loadTranslations(lang) {
  try {
    const response = await fetch(`/locales/${lang}.json`);
    translations = await response.json();
    
    // Fetch global stats as a non-blocking background task
    fetchGlobalStats();
    
    applyTranslations();
    
    const langDisplay = document.getElementById('currentLang');
    if (langDisplay) langDisplay.textContent = lang.toUpperCase();
    
    localStorage.setItem(LANG_KEY, lang);

    // Update URL without reloading (supports /es/ style locale paths)
    const newUrl = new URL(window.location);
    const parts = newUrl.pathname.split('/').filter(Boolean);
    const hasLocalePrefix = supportedLangs.includes(parts[0]);
    const page = hasLocalePrefix ? parts.slice(1).join('/') : parts.join('/');

    if (lang === 'en') {
      newUrl.pathname = page ? `/${page}` : '/';
      newUrl.searchParams.delete('lang');
    } else {
      newUrl.pathname = page ? `/${lang}/${page}` : `/${lang}/`;
      newUrl.searchParams.delete('lang');
    }
    window.history.replaceState({}, '', newUrl);

    // Refresh Lucide icons after translation swap
    if (window.lucide) {
      window.lucide.createIcons();
    }
  } catch (err) {
    console.error('Failed to load translations:', err);
  }
}

/**
 * ⚡ Live Social Proof Ticker State
 */
let liveStrippedCount = 14582;

async function fetchGlobalStats() {
  try {
    const res = await fetch(STATS_URL);
    const data = await res.json();
    if (data.count) {
      liveStrippedCount = data.count;
      runLiveTicker();
    }
  } catch(e) { runLiveTicker(); }
}

async function incrementGlobalStats(amount = 1) {
  // 1. Immediate local feedback
  liveStrippedCount += amount;
  const el = document.getElementById('liveCount');
  if (el) {
    el.innerText = liveStrippedCount.toLocaleString();
    el.style.transition = 'color 0.2s ease, transform 0.2s ease';
    el.style.color = '#fff';
    el.style.transform = 'scale(1.1)';
    setTimeout(() => { 
      el.style.color = 'var(--emerald)'; 
      el.style.transform = 'scale(1)';
    }, 400);
  }

  // 2. Persist to Cloudflare
  try {
    const res = await fetch(INCREMENT_STATS_URL, { 
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount })
    });
    const data = await res.json();
    if (data.count && data.count > liveStrippedCount) {
      liveStrippedCount = data.count;
      if (el) el.innerText = liveStrippedCount.toLocaleString();
    }
  } catch(e) {}
}

function applyTranslations() {
  const elements = document.querySelectorAll('[data-i18n], [data-i18n-alt], [data-i18n-html]');
  elements.forEach(el => {
    // Keep paid CTA state visible after activation.
    if ((isPro || isPlus) && (el.id === 'paddleCheckoutBtn' || el.classList.contains('paddle-checkout-btn'))) {
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

  // Refresh Lucide icons for any icons inside translated elements
  if (window.lucide) {
    window.lucide.createIcons();
  }

  // Re-apply paid UI if active
  if (isPro) setProActiveUI();
  else if (isPlus) setPlusActiveUI();

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
      "item": `https://verimedia.xyz/${pagePath}${langQuery}`
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
        "featureList": trans.kb?.ai_title + ", " + trans.kb?.identity_title + ", " + trans.pricing?.pro_f2,
        "offers": {
          "@type": "Offer",
          "price": "19.00",
          "priceCurrency": "USD",
          "availability": "https://schema.org/InStock"
        },
        "description": trans.hero?.summary || "Embed AI training opt-out and creator ownership signals directly in media files."
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
      const dest = lang === 'en' ? '/' : `/${lang}/`;
      window.location.href = dest;
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
const STORAGE_KEY_LICENSE_TIER = 'vm_license_tier';
let isPro = false;
let isPlus = false;
let activeTier = 'free';

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
const profileAiOnly  = document.getElementById('profileAiOptOut');
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

  const hasPaidPlan = isPro || isPlus;
  if (hasPaidPlan) {
    if (proOverlay) proOverlay.style.display = 'none';
    if (activeKeyDisplay) activeKeyDisplay.style.display = 'block';
    if (profileWhitelabelWrap) profileWhitelabelWrap.style.display = isPro ? 'block' : 'none';
    if (profileKeyInput) {
      profileKeyInput.value = localStorage.getItem(STORAGE_KEY_LICENSE) || 'Active';
    }
    if (profileSave) profileSave.style.display = 'block';
    
    [profileName, profileCopy, profileUrl].forEach(el => { if(el) el.disabled = false; });
    if (profileWhitelabel) profileWhitelabel.disabled = !isPro;
    if (!isPro && profileWhitelabel) profileWhitelabel.checked = false;
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

    const originalText = profileSave.innerHTML;
    const successMsg = translations.profile?.save_success || 'Saved!';
    profileSave.innerHTML = `<i data-lucide="check" style="width:14px; height:14px; vertical-align:middle; margin-right:4px;"></i> ${successMsg}`;
    profileSave.style.background = 'var(--emerald)';
    if (window.lucide) window.lucide.createIcons();
    
    setTimeout(() => {
      profileSave.innerHTML = originalText;
      profileSave.style.background = '';
      if (window.lucide) window.lucide.createIcons();
    }, 1800);
    closeProfilePanel();
  });
}

// ── Profile Export/Import ────────────────────────────────────────────────────
const exportBtn = document.getElementById('profileExportBtn');
const importBtn = document.getElementById('profileImportBtn');
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
        const doneMsg = translations.profile?.import_done || 'Done!';
        importBtn.innerHTML = `<i data-lucide="check" style="width:14px; height:14px; vertical-align:middle; margin-right:4px;"></i> ${doneMsg}`;
        if (window.lucide) window.lucide.createIcons();
        setTimeout(() => { 
          importBtn.textContent = translations.profile?.import || 'Import'; 
          if (window.lucide) window.lucide.createIcons();
        }, 2000);
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
const STATS_URL = 'https://license.verimedia.xyz/stats';
const INCREMENT_STATS_URL = 'https://license.verimedia.xyz/increment-stats';

function getDeviceId() {
  let id = localStorage.getItem('vm_device_id');
  if (!id) { 
    id = crypto.randomUUID?.() || 'dev_' + Math.random().toString(36).substr(2, 9); 
    localStorage.setItem('vm_device_id', id); 
  }
  return id;
}

// Modal View Switcher
const paymentModal = document.getElementById('checkoutModal');
const viewBuy      = document.getElementById('checkoutViewBuy');
const viewActivate = document.getElementById('checkoutViewActivate');
const viewSuccess  = document.getElementById('checkoutViewSuccess');
const closeModal   = document.getElementById('closeCheckoutBtn');

const switchToActivate  = document.getElementById('switchToActivate');
const switchToBuy       = document.getElementById('switchToBuy');
const activateLicenseBtn = document.getElementById('activateLicenseBtn');
const licenseKeyInput   = document.getElementById('licenseKeyInput');
const licenseError      = document.getElementById('licenseError');
const closeSuccessBtn   = document.getElementById('closeSuccessBtn');

const paddleCheckoutBtns = document.querySelectorAll('#paddleCheckoutBtn, .paddle-checkout-btn');
let paddleReadyPromise = null;
let paddleInitialized = false;
let pendingCheckoutPlan = 'plus';

let modalTriggerElement = null;

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function getPlanCopy(plan = 'plus') {
  return plan === 'pro'
    ? {
        title: 'Creator Pro Lifetime',
        subtitle: 'One-time payment. Unlimited batches, 100MB files, whitelabel mode, and up to 3 devices.',
        item: 'Creator Pro Lifetime',
        price: '$19.00',
        buy: 'Buy Pro - $19',
        successTitle: 'Creator Pro Active',
        start: 'Start Using Pro',
        features: ['Everything in Plus unlocked', 'Unlimited batch processing active', 'Whitelabel metadata mode enabled']
      }
    : {
        title: 'Creator Plus Lifetime',
        subtitle: 'One-time payment. Clean up to 100 files per batch and add creator copyright metadata.',
        item: 'Creator Plus Lifetime',
        price: '$9.99',
        buy: 'Buy Plus - $9.99',
        successTitle: 'Creator Plus Active',
        start: 'Start Using Plus',
        features: ['100-file batches unlocked', 'Creator profile metadata active', '25MB file limit enabled']
      };
}

function updateCheckoutModal(plan = pendingCheckoutPlan) {
  pendingCheckoutPlan = plan === 'pro' ? 'pro' : 'plus';
  const copy = getPlanCopy(pendingCheckoutPlan);
  if (!viewBuy || !viewSuccess) return;

  const title = viewBuy.querySelector('h3');
  const subtitle = viewBuy.querySelector('.modal-subtitle');
  const summaryRows = viewBuy.querySelectorAll('.summary-row');
  const buyBtn = viewBuy.querySelector('.paddle-checkout-btn');
  const buyText = buyBtn?.querySelector('span');

  if (title) title.textContent = copy.title;
  if (subtitle) subtitle.textContent = copy.subtitle;
  if (summaryRows[0]) {
    const item = summaryRows[0].querySelector('span');
    const price = summaryRows[0].querySelector('strong');
    if (item) item.textContent = copy.item;
    if (price) price.textContent = copy.price;
  }
  if (summaryRows[1]) {
    const total = summaryRows[1].querySelector('strong');
    if (total) total.textContent = copy.price;
  }
  if (buyBtn) buyBtn.dataset.plan = pendingCheckoutPlan;
  if (buyText) buyText.textContent = copy.buy;

  const successTitle = viewSuccess.querySelector('h3');
  const successFeatures = viewSuccess.querySelectorAll('.success-feature-list span');
  const startBtn = viewSuccess.querySelector('#closeSuccessBtn');
  if (successTitle) successTitle.textContent = copy.successTitle;
  successFeatures.forEach((el, index) => {
    if (copy.features[index]) el.textContent = copy.features[index];
  });
  if (startBtn) startBtn.textContent = copy.start;
}

function showModalView(view) {
  if (!viewBuy || !viewActivate || !viewSuccess) return;
  [viewBuy, viewActivate, viewSuccess].forEach(v => v.style.display = 'none');
  view.style.display = 'block';
}

function openModal(startView = viewBuy) {
  if (!paymentModal) return;
  modalTriggerElement = document.activeElement;
  if (startView === viewBuy) updateCheckoutModal(pendingCheckoutPlan);
  showModalView(startView);
  paymentModal.classList.add('active');
  trackEvent('pricing_opened', { view: startView?.id || 'unknown' });
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
    const pricing = document.getElementById('pricing-section');
    if (pricing) pricing.scrollIntoView({ behavior: 'smooth' });
  });
}

const activateKeyBtn = document.getElementById('activateKeyBtn');
if (activateKeyBtn) {
  activateKeyBtn.addEventListener('click', () => openModal(viewActivate));
}

// License UI Gating
function setProActiveUI() {
  isPro = true;
  isPlus = false;
  activeTier = 'pro';
  localStorage.setItem(STORAGE_KEY_LICENSE_TIER, 'pro');
  document.querySelectorAll('#paddleCheckoutBtn, .paddle-checkout-btn').forEach(btn => {
    const isProBtn = btn.classList.contains('paddle-pro-checkout-btn');
    btn.textContent = isProBtn ? 'Creator Pro Active' : 'Included in Pro';
    btn.style.background = isProBtn ? 'var(--emerald)' : '';
    btn.style.opacity = isProBtn ? '' : '0.65';
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

function setPlusActiveUI() {
  isPlus = true;
  isPro = false;
  activeTier = 'plus';
  localStorage.setItem(STORAGE_KEY_LICENSE_TIER, 'plus');
  document.querySelectorAll('.paddle-checkout-btn').forEach(btn => {
    const isPlusBtn = btn.classList.contains('paddle-plus-checkout-btn');
    btn.textContent = isPlusBtn ? 'Creator Plus Active' : 'Upgrade to Pro';
    btn.style.background = isPlusBtn ? 'var(--emerald)' : '';
    btn.style.opacity = isPlusBtn ? '' : '0.9';
    btn.disabled = isPlusBtn;
  });

  const fInput = document.getElementById('fileInput');
  if (fInput) fInput.multiple = true;
}

function applyPaidTierUI(plan) {
  if (plan === 'pro') setProActiveUI();
  else if (plan === 'plus') setPlusActiveUI();
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
        const plan = data.plan === 'plus' ? 'plus' : 'pro';
        applyPaidTierUI(plan);
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
      if (data.valid) applyPaidTierUI(data.plan === 'plus' ? 'plus' : 'pro');
      else {
        localStorage.removeItem(STORAGE_KEY_LICENSE);
        localStorage.removeItem(STORAGE_KEY_LICENSE_TIER);
      }
    } catch {
      console.warn('License validation unavailable; paid features remain locked until validation succeeds.');
    }
  }
  
  const params = new URLSearchParams(window.location.search);
  const lCode = params.get('license') || params.get('license_code');
  if (lCode && !isPro && !isPlus) {
    openModal(viewActivate);
    if (licenseKeyInput) {
      licenseKeyInput.value = lCode;
      setTimeout(() => activateLicenseBtn.click(), 500);
    }
  }
})();

function initPaddleOnce() {
  if (paddleInitialized || !window.Paddle) return;
  window.Paddle.Initialize({
    token: 'live_2f19b88294a235307e74e44f820',
    eventCallback: function(event) {
      if (event.name === 'checkout.completed') {
        const txnId = event.data?.transaction_id || event.data?.id;
        const eventPlan = event.data?.custom_data?.plan === 'pro'
          ? 'pro'
          : (event.data?.custom_data?.plan === 'plus' ? 'plus' : pendingCheckoutPlan);
        if (txnId) {
          localStorage.setItem(STORAGE_KEY_LICENSE, txnId.toUpperCase());
          verifyLicense(txnId.toUpperCase())
            .then((validation) => {
              const plan = validation?.plan === 'plus' ? 'plus' : (validation?.plan === 'pro' ? 'pro' : eventPlan);
              applyPaidTierUI(plan);
              updateCheckoutModal(plan);
              trackEvent('purchase_success', { provider: 'paddle', plan });
            })
            .catch(() => {
              applyPaidTierUI(eventPlan);
              updateCheckoutModal(eventPlan);
              trackEvent('purchase_success', { provider: 'paddle', plan: eventPlan, validation: 'pending' });
            })
            .finally(() => {
              openModal(viewSuccess);
            });
        }
      }
    }
  });
  paddleInitialized = true;
}

function ensurePaddleLoaded() {
  if (window.Paddle) {
    initPaddleOnce();
    return Promise.resolve();
  }
  if (paddleReadyPromise) return paddleReadyPromise;

  paddleReadyPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://cdn.paddle.com/paddle/v2/paddle.js';
    script.async = true;
    script.onload = () => {
      initPaddleOnce();
      resolve();
    };
    script.onerror = () => reject(new Error('Failed to load Paddle SDK.'));
    document.head.appendChild(script);
  });

  return paddleReadyPromise;
}

const PLUS_PRICE_ID = 'pri_01ksb8cp542z2be2nt8tkmctwp';
const PRO_PRICE_ID = 'pri_01ks3bgn6zyh2bsvqk438c3dcv';

paddleCheckoutBtns.forEach(btn => {
  btn.addEventListener('click', async () => {
    try {
      const selectedPlan = btn.dataset.plan || (btn.classList.contains('paddle-plus-checkout-btn') ? 'plus' : 'pro');
      pendingCheckoutPlan = selectedPlan;
      updateCheckoutModal(selectedPlan);
      const priceId = selectedPlan === 'plus' ? PLUS_PRICE_ID : PRO_PRICE_ID;
      trackEvent('plan_selected', { plan: selectedPlan, source: btn.className || 'paddle_btn' });
      trackEvent('checkout_started', { source: btn.className || 'paddle_btn', plan: selectedPlan });
      await ensurePaddleLoaded();
      if (window.Paddle) {
        window.Paddle.Checkout.open({
          items: [{ priceId, quantity: 1 }],
          customData: { plan: selectedPlan, product: 'verimedia_lifetime' },
          settings: { displayMode: 'overlay', theme: 'dark' }
        });
      }
    } catch (err) {
      console.error(err);
    }
  });
});

if (window.Paddle) {
  initPaddleOnce();
}


/* ==========================================================================
   ⚙️ 4. Main Processing Engine (Index Only)
   ========================================================================== */
const dropzone = document.getElementById('dropzone');
const fileInput = document.getElementById('fileInput');
const statusBadge = document.getElementById('statusBadge');
const reportContent = document.getElementById('reportContent');
const toolBody = document.getElementById('toolBody');
const reportBackBtn = document.getElementById('reportBackBtn');
let processedBlob = null;
let processedFileName = '';
const cleanNowBtn = document.getElementById('cleanNowBtn');
const queuedFilesMeta = document.getElementById('queuedFilesMeta');
const sampleFileBtn = document.getElementById('sampleFileBtn');
const trySampleBtn = document.getElementById('trySampleBtn');
let isProcessing = false;
let queuedFiles = [];

/** Show the audit / report panel, hiding the picker */
function showAuditView() {
  if (toolBody) toolBody.classList.add('audit-view');
}

/** Return to the picker panel (called by reset and back-btn) */
function showPickerView() {
  if (toolBody) toolBody.classList.remove('audit-view');
}

if (reportBackBtn) {
  reportBackBtn.addEventListener('click', () => {
    if (isProcessing) return;
    resetCleanerFlow();
  });
}


const MAX_FREE_FILES = 1;
const MAX_PLUS_FILES = 100;
const MAX_PRO_FILES = Number.POSITIVE_INFINITY;
const MAX_FILE_MB = {
  free: 5,
  plus: 25,
  pro: 100
};

function setProcessingState(active) {
  isProcessing = active;
  if (dropzone) {
    dropzone.classList.toggle('processing-disabled', active);
    dropzone.setAttribute('aria-disabled', active ? 'true' : 'false');
  }
  if (fileInput) fileInput.disabled = active;
  if (sampleFileBtn) sampleFileBtn.style.display = active ? 'none' : '';
  if (trySampleBtn) trySampleBtn.style.display = active ? 'none' : '';
  if (cleanNowBtn) cleanNowBtn.disabled = active;
}

function updateQueueUI() {
  if (!queuedFilesMeta || !cleanNowBtn) return;
  const count = queuedFiles.length;
  if (count > 0) {
    queuedFilesMeta.textContent = `${count} file${count === 1 ? '' : 's'} loaded`;
    queuedFilesMeta.style.display = 'block';
    cleanNowBtn.style.display = 'inline-flex';
    if (sampleFileBtn) sampleFileBtn.style.display = 'none';
    if (trySampleBtn) trySampleBtn.style.display = 'none';
  } else {
    queuedFilesMeta.style.display = 'none';
    cleanNowBtn.style.display = 'none';
    if (!isProcessing) {
      if (sampleFileBtn) sampleFileBtn.style.display = '';
      if (trySampleBtn) trySampleBtn.style.display = '';
    }
  }
}

function renderEmptyAuditState() {
  if (!reportContent) return;
  reportContent.innerHTML = `
    <div class="empty-state">
      <p>${translations.sandbox?.audit_empty || 'Upload a photo to strip tracking details and embed copyright and AI opt-out tags.'}</p>
      <button class="link-btn" id="trySampleBtn" data-i18n="sandbox.try_sample">${translations.sandbox?.try_sample || 'Try Sample File'}</button>
    </div>
  `;

  const sampleBtn = document.getElementById('trySampleBtn');
  if (sampleBtn) {
    sampleBtn.addEventListener('click', (e) => {
      if (isProcessing) return;
      e.stopPropagation();
      runInteractiveDemo();
    });
  }

  if (window.lucide) window.lucide.createIcons();
}

function resetCleanerFlow() {
  queuedFiles = [];
  processedBlob = null;
  processedFileName = '';
  auditStats = [];
  if (fileInput) fileInput.value = '';
  if (statusBadge) {
    statusBadge.innerText = 'Idle';
    statusBadge.className = 'status-indicator idle';
  }
  showPickerView();
  updateQueueUI();
  renderEmptyAuditState();
}

function queueFiles(fileList) {
  if (isProcessing) return;
  queuedFiles = Array.from(fileList || []);
  updateQueueUI();
  renderQueuedAuditState();
}

function renderQueuedAuditState() {
  if (!reportContent || queuedFiles.length === 0 || isProcessing) return;
  const tier = isPro ? 'pro' : (isPlus ? 'plus' : 'free');
  const maxMb = MAX_FILE_MB[tier];
  const totalBytes = queuedFiles.reduce((sum, f) => sum + (f.size || 0), 0);
  const totalMb = (totalBytes / (1024 * 1024)).toFixed(1);
  const preview = queuedFiles.slice(0, 4);
  const overflow = queuedFiles.length - preview.length;

  showAuditView();
  reportContent.innerHTML = `
    <div class="queue-ready-panel">
      <h4>Files are queued</h4>
      <p class="queue-meta">${queuedFiles.length} file${queuedFiles.length === 1 ? '' : 's'} loaded • ${totalMb}MB total • ${maxMb}MB/file limit</p>
      <ul class="queue-file-preview">
        ${preview.map((f) => `<li title="${escapeHtml(f.name)}">${escapeHtml(f.name)}</li>`).join('')}
        ${overflow > 0 ? `<li>+${overflow} more</li>` : ''}
      </ul>
      <p class="queue-hint">Click <strong>Clean Now</strong> to start secure processing.</p>
    </div>
  `;
}

if (dropzone && fileInput) {
  dropzone.addEventListener('click', () => {
    if (isProcessing) return;
    trackEvent('upload_started', { source: 'dropzone_click' });
    fileInput.click();
  });
  dropzone.addEventListener('dragover', e => { if (isProcessing) return; e.preventDefault(); dropzone.classList.add('dragover'); });
  dropzone.addEventListener('dragleave', () => dropzone.classList.remove('dragover'));
  dropzone.addEventListener('drop', e => {
    if (isProcessing) return;
    e.preventDefault();
    dropzone.classList.remove('dragover');
    if (e.dataTransfer.files.length) {
      trackEvent('upload_started', { source: 'drop', files: e.dataTransfer.files.length });
      queueFiles(e.dataTransfer.files);
    }
  });
  fileInput.addEventListener('change', e => { if (!isProcessing && e.target.files.length) { trackEvent('upload_started', { source: 'file_picker', files: e.target.files.length }); queueFiles(e.target.files); } });

  const sampleLinkBtn = document.getElementById('sampleLinkBtn');
  
  [trySampleBtn, sampleLinkBtn, sampleFileBtn].forEach(btn => {
    if (btn) {
      btn.addEventListener('click', (e) => {
        if (isProcessing) return;
        e.stopPropagation();
        runInteractiveDemo();
      });
    }
  });

  if ('requestIdleCallback' in window) {
    window.requestIdleCallback(() => loadEngine(), { timeout: 3500 });
  }
  // Initial stats fetch
  fetchGlobalStats();
}

if (cleanNowBtn) {
  cleanNowBtn.addEventListener('click', async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (isProcessing || queuedFiles.length === 0) return;
    const filesToProcess = queuedFiles.slice();
    queuedFiles = [];
    updateQueueUI();
    await handleFiles(filesToProcess);
  });
}

/**
 * ⚡ Live Social Proof Ticker
 */
function runLiveTicker() {
  const el = document.getElementById('liveCount');
  if (el) {
    el.innerText = liveStrippedCount.toLocaleString();
  }
  const heroCounter = document.getElementById('globalShieldCount');
  if (heroCounter) {
    heroCounter.setAttribute('data-target', String(liveStrippedCount));
  }
}

async function runInteractiveDemo() {
  if (!reportContent) return;
  setProcessingState(true);
  showAuditView();
  
  if(statusBadge) { statusBadge.innerText = 'Scanning...'; statusBadge.className = 'status-indicator scanning'; }
  
  // Show initial "Scary" Mock Metadata discovery
  reportContent.innerHTML = `
    <div class="audit-list" style="width:100%; text-align:left;">
      <div class="audit-item danger" style="animation-delay: 0.1s;">
        <span class="audit-icon"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg></span>
        <span>GPS: 37.7749° N, 122.4194° W (San Francisco)</span>
      </div>
      <div class="audit-item danger" style="animation-delay: 0.2s;">
        <span class="audit-icon"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="2" width="14" height="20" rx="2" ry="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></svg></span>
        <span>Device: iPhone 15 Pro (Apple iOS 17.4)</span>
      </div>
      <div class="audit-item danger" style="animation-delay: 0.3s;">
        <span class="audit-icon"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg></span>
        <span>Lens: 24mm f/1.78 (Serial: #88294A23)</span>
      </div>
    </div>
    <div class="progress-bar-track" style="margin-top:1.5rem;"><div class="progress-bar-fill" id="progressBarFill" style="width:0%;"></div></div>
    <p id="progressLabel" style="font-size:0.8rem; color:var(--accent); margin-top:0.5rem;">Forensic Scrubbing Active...</p>
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
    // Demo delay only
    await new Promise(r => setTimeout(r, 150));
    if(progressBarFill) progressBarFill.style.width = s.p + '%';
    if(progressLabel) progressLabel.innerText = s.l;
  }

  await new Promise(r => setTimeout(r, 100));
  if(statusBadge) { statusBadge.innerText = 'Complete · 1 cleaned'; statusBadge.className = 'status-indicator complete'; }
  
  auditStats = [{
    filename: 'demo_iphone_photo.jpg',
    removed: 28,
    added: 1,
    scoreBefore: 12,
    scoreAfter: 100
  }];

  processedBlob = null; 
  drawReport([{ name: 'demo_iphone_photo.jpg' }]);
  incrementGlobalStats(1);
  
  const dBtn = document.getElementById('downloadBtn');
  if (dBtn) {
    dBtn.innerText = 'Now Try Your Own File';
    dBtn.style.background = 'var(--accent)';
    dBtn.removeEventListener('click', triggerDownload);
    dBtn.addEventListener('click', () => { if (!isProcessing) fileInput.click(); });
  }
  setProcessingState(false);
}

let auditStats = [];

async function handleFiles(fileList) {
  const files = Array.from(fileList);
  if (files.length === 0) return;

  const tier = isPro ? 'pro' : (isPlus ? 'plus' : 'free');
  const maxFiles = tier === 'free' ? MAX_FREE_FILES : (tier === 'plus' ? MAX_PLUS_FILES : MAX_PRO_FILES);
  const maxMb = MAX_FILE_MB[tier];

  if (files.length > maxFiles) {
    if (tier === 'free') {
      if(reportContent) reportContent.innerHTML = buildErrorItem('Bulk processing is a paid feature. Plus supports up to 100 files per batch.');
    } else if (tier === 'plus') {
      if(reportContent) reportContent.innerHTML = buildErrorItem(`Creator Plus supports up to ${MAX_PLUS_FILES} files per batch. Upgrade to Pro for unlimited batch processing.`);
    }
    return;
  }

  const oversize = files.find((f) => (f.size / (1024 * 1024)) > maxMb);
  if (oversize) {
    if(reportContent) reportContent.innerHTML = buildErrorItem(`${oversize.name} exceeds your ${tier.toUpperCase()} limit of ${maxMb}MB per file.`);
    return;
  }
  
  auditStats = []; // Reset stats
  setProcessingState(true);
  try {
    if (files.length === 1) await handleSingleFileUpload(files[0]);
    else await processBulkFiles(files);
  } finally {
    setProcessingState(false);
  }
}

async function handleSingleFileUpload(file) {
  const category = getFileCategory(file);
  if (!category) {
    reportContent.innerHTML = buildErrorItem('Unsupported file type.');
    return;
  }

  processedFileName = getNormalizedOutputName(file, category);
  if(statusBadge) { statusBadge.innerText = 'Scanning...'; statusBadge.className = 'status-indicator scanning'; }
  showAuditView();

  reportContent.innerHTML = `
    <div class="empty-state" style="margin:auto;width:100%;">
      <p id="progressLabel" style="font-family:var(--font-display);font-weight:600;color:var(--accent);font-size:1.1rem;margin-bottom:0.5rem;letter-spacing:0.5px;">${translations.sandbox?.processing || 'Preparing...'}</p>
      <div class="progress-bar-track"><div class="progress-bar-fill" id="progressBarFill" style="width:0%;"></div></div>
    </div>
  `;

  const progressBarFill = document.getElementById('progressBarFill');

  try {
    const { extractMetadata, sanitizeImage, sanitizePDF } = await loadEngine();
    const options = {
      keepIcc: false, keepAnnots: false, keepCameraSpecs: isPro,
      injectIdentity: (isPro || isPlus) && (creatorProfile.name || creatorProfile.copyright || creatorProfile.url),
      creatorName: creatorProfile.name, copyright: creatorProfile.copyright, contactUrl: creatorProfile.url,
      aiOptOut: creatorProfile.aiOnly === true, whitelabel: isPro && creatorProfile.whitelabel === true, isPro: isPro
    };

    let reportBefore = await extractMetadata(file);
    let tagsAdded = options.injectIdentity ? 4 : (options.aiOptOut ? 2 : 0);

    // Core Engine Call (Now handles JPEG identity efficiently)
    const outputBlob = category === 'pdf' 
      ? new Blob([await sanitizePDF(file, options)], { type: 'application/pdf' })
      : await sanitizeImage(file, options);

    auditStats.push({
      filename: file.name,
      removed: reportBefore.tags.length,
      added: tagsAdded,
      scoreBefore: reportBefore.privacyScore,
      scoreAfter: 100,
      removedTags: reportBefore.tags,
      addedTags: [
        ...(options.injectIdentity ? [
          { name: 'Artist', value: options.creatorName, category: 'Creator' },
          { name: 'Copyright', value: options.copyright, category: 'Creator' },
          { name: 'Software', value: options.whitelabel ? 'Original Content Engine' : 'VeriMedia.xyz', category: 'Source' }
        ] : []),
        ...(!options.injectIdentity && options.aiOptOut && !options.whitelabel ? [
          { name: 'Software', value: 'VeriMedia.xyz', category: 'Source' }
        ] : []),
        ...(options.aiOptOut ? [{ name: 'AI Opt-Out', value: 'True', category: 'Privacy' }] : []),
        ...(options.contactUrl ? [{ name: 'WebStatement', value: options.contactUrl, category: 'License' }] : [])
      ]
    });

    if(progressBarFill) progressBarFill.style.width = '100%';
    if(statusBadge) { statusBadge.innerText = 'Complete · 1 cleaned'; statusBadge.className = 'status-indicator complete'; }
    processedBlob = outputBlob;
    processedBlob._url = URL.createObjectURL(outputBlob);
    drawReport([file]);
    incrementGlobalStats(1);
    trackEvent('file_processed', { mode: 'single', type: category, count: 1 });
  } catch (error) {
    if(reportContent) reportContent.innerHTML = buildErrorItem('Engine error.');
  }
}

async function processBulkFiles(files) {
  const zip = new JSZip();
  let successCount = 0;
  const total = files.length;
  
  if(statusBadge) { 
    statusBadge.innerText = `Processing (0/${total})...`; 
    statusBadge.className = 'status-indicator scanning'; 
  }

  // Switch to audit view and set up batch processing view
  showAuditView();
  reportContent.innerHTML = `
    <div class="batch-process-view" style="width:100%; text-align:left;">
      <div class="progress-bar-track" style="margin-bottom:1rem;">
        <div class="progress-bar-fill" id="batchProgressBarFill" style="width:0%;"></div>
      </div>
      <div id="batchFileList" class="audit-list" style="max-height:180px; overflow-y:auto; padding-right:5px;">
        <!-- Files will be prepended here -->
      </div>
    </div>
  `;

  const progressBarFill = document.getElementById('batchProgressBarFill');
  const batchFileList = document.getElementById('batchFileList');
  const { extractMetadata, sanitizeImage, sanitizePDF } = await loadEngine();

  const hasPaidPlan = isPro || isPlus;
  const options = {
    ...creatorProfile,
    isPro,
    aiOptOut: creatorProfile.aiOnly !== false,
    injectIdentity: hasPaidPlan && !!(creatorProfile.name || creatorProfile.copyright || creatorProfile.url)
  };
  options.creatorName = creatorProfile.name || '';
  options.copyright = creatorProfile.copyright || '';
  options.contactUrl = creatorProfile.url || '';
  options.whitelabel = isPro && creatorProfile.whitelabel === true;
  let tagsAdded = options.injectIdentity ? 4 : (options.aiOptOut ? 2 : 0);

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const category = getFileCategory(file);
    
    // Add file to the live list as "Scrubbing"
    const fileItem = document.createElement('div');
    fileItem.className = 'audit-item';
    const safeFileName = escapeHtml(file.name);
    fileItem.innerHTML = `<span class="audit-icon pulse">${ICON_SCRUBBING}</span> <span class="batch-file-name" title="${safeFileName}">${safeFileName}</span> <span class="compact-tag" style="opacity:0.6;">SCRUBBING</span>`;
    batchFileList.prepend(fileItem);

    if (category) {
      try {
        let reportBefore = await extractMetadata(file);
        const blob = category === 'pdf' ? new Blob([await sanitizePDF(file, options)]) : await sanitizeImage(file, options);
        const cleanName = getNormalizedOutputName(file, category, '_safe');
        zip.file(cleanName, blob);
        
        auditStats.push({
          filename: file.name,
          removed: reportBefore.tags.length,
          added: tagsAdded,
          scoreBefore: reportBefore.privacyScore,
          scoreAfter: 100,
          removedTags: reportBefore.tags,
          addedTags: [
            ...(options.injectIdentity ? [
              { name: 'Artist', value: options.creatorName || 'N/A', category: 'Creator' },
              { name: 'Copyright', value: options.copyright || 'N/A', category: 'Creator' },
              { name: 'Software', value: options.whitelabel ? 'Original Content Engine' : 'VeriMedia.xyz', category: 'Source' }
            ] : []),
            ...(!options.injectIdentity && options.aiOptOut && !options.whitelabel ? [
              { name: 'Software', value: 'VeriMedia.xyz', category: 'Source' }
            ] : []),
            ...(options.aiOptOut ? [{ name: 'AI Opt-Out', value: 'True', category: 'Privacy' }] : []),
            ...(options.contactUrl ? [{ name: 'WebStatement', value: options.contactUrl, category: 'License' }] : [])
          ]
        });
        
        successCount++;
        // Update item to "Cleaned"
        fileItem.innerHTML = `<span class="audit-icon">${ICON_CLEANED}</span> <span class="batch-file-name" title="${safeFileName}">${safeFileName}</span> <span class="compact-tag" style="color:var(--emerald); border-color:var(--emerald);">CLEANED</span>`;
      } catch (e) {
        fileItem.innerHTML = `<span class="audit-icon">${ICON_ERROR}</span> <span class="batch-file-name" title="${safeFileName}">${safeFileName}</span> <span class="compact-tag" style="color:var(--rose); border-color:var(--rose);">ERROR</span>`;
      }
    } else {
      fileItem.innerHTML = `<span class="audit-icon">${ICON_SKIP}</span> <span class="batch-file-name" title="${safeFileName}">${safeFileName}</span> <span class="compact-tag">SKIP</span>`;
    }

    // Update global progress
    const progress = Math.round(((i + 1) / total) * 100);
    if (progressBarFill) progressBarFill.style.width = progress + '%';
    if (statusBadge) statusBadge.innerText = `Processing (${i+1}/${total})...`;
    if ((i + 1) % 10 === 0) await new Promise(resolve => setTimeout(resolve, 0));
  }

  if (statusBadge) statusBadge.innerText = `Finalizing ZIP (${successCount}/${total})...`;
  const zipStart = performance.now();
  let lastStatusUpdate = 0;
  const zipBlob = await zip.generateAsync(
    { type: 'blob', compression: 'STORE' },
    (meta) => {
      if (!statusBadge) return;
      const now = performance.now();
      if (now - lastStatusUpdate < 200) return;
      lastStatusUpdate = now;
      const elapsedSec = (now - zipStart) / 1000;
      const progress = Math.max(0.1, Math.min(100, meta.percent || 0));
      const estimatedTotalSec = elapsedSec / (progress / 100);
      const remainingSec = Math.max(0, Math.round(estimatedTotalSec - elapsedSec));
      statusBadge.innerText = `Finalizing ZIP ${Math.round(progress)}% (~${remainingSec}s)`;
    }
  );
  processedBlob = zipBlob;
  processedBlob._url = URL.createObjectURL(zipBlob);
  processedFileName = `VeriMedia_Batch_${successCount}_Files.zip`;
  
  if(statusBadge) { statusBadge.innerText = `Complete · ${successCount} cleaned`; statusBadge.className = 'status-indicator complete'; }
  drawReport(files);
  incrementGlobalStats(successCount);
  trackEvent('file_processed', { mode: 'bulk', count: successCount });
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

function getBaseNameWithoutSafeSuffix(fileName) {
  const base = fileName.replace(/\.[^/.]+$/, '');
  return base
    .replace(/(_ai_safe)+$/i, '')
    .replace(/(_safe)+$/i, '')
    .replace(/(_clean)+$/i, '');
}

function getNormalizedOutputName(file, category, imageSuffix = '_ai_safe') {
  const base = getBaseNameWithoutSafeSuffix(file.name);
  if (category === 'pdf') return `${base}_clean.pdf`;
  return `${base}${imageSuffix}${getOutputExt(file)}`;
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
    <div class="download-ready-panel">
      <h3>Ready for secure download</h3>
      <p>${fileCount} cleaned file${fileCount === 1 ? '' : 's'}. Download it now or clean another file.</p>
      <button class="download-sec-btn" id="downloadBtn">${fileCount > 1 ? (translations.sandbox?.download_zip || 'Download ZIP').replace('{{count}}', fileCount) : (translations.sandbox?.download_safe_file || 'Download Safe File')}</button>
      <button class="pricing-btn secondary-btn clean-more-btn" id="cleanMoreBtn" type="button">Clean More</button>
      <button class="link-btn" id="viewAuditDetailsBtn">${translations.sandbox?.view_details_btn || 'View details'}</button>
    </div>
  `;
  const dBtn = document.getElementById('downloadBtn');
  if(dBtn) dBtn.addEventListener('click', triggerDownload);

  const cleanMoreBtn = document.getElementById('cleanMoreBtn');
  if (cleanMoreBtn) cleanMoreBtn.addEventListener('click', resetCleanerFlow);

  const viewBtn = document.getElementById('viewAuditDetailsBtn');
  if (viewBtn) {
    viewBtn.addEventListener('click', () => {
      const tbody = document.getElementById('auditDetailsTableBody');
      const tableWrapper = document.getElementById('auditTableWrapper');
      const subPanel = document.getElementById('tagDetailsSubPanel');
      
      if (subPanel) subPanel.style.display = 'none';
      if (tableWrapper) tableWrapper.style.display = 'block';

      if (tbody) {
        tbody.innerHTML = auditStats.map((stat, index) => {
          const displayFilename = stat.filename.length > 28 
            ? stat.filename.substring(0, 15) + '...' + stat.filename.substring(stat.filename.length - 10)
            : stat.filename;

          return `
            <tr>
              <td class="audit-file-col" title="${stat.filename}">${displayFilename}</td>
              <td class="audit-removed-col">${stat.removed}</td>
              <td class="audit-added-col">${stat.added}</td>
              <td class="audit-score-col score-jump">
                <span class="score-old">${stat.scoreOld || stat.scoreBefore}</span> 
                <span class="score-new">→ ${stat.scoreAfter}</span>
              </td>
              <td class="audit-details-col">
                <button class="details-icon-btn view-tag-details" data-index="${index}" title="${translations.sandbox?.details_label || 'Details'}">
                  <i data-lucide="eye" style="width:14px; height:14px;"></i>
                </button>
              </td>
            </tr>
          `;
        }).join('');
        
        if (window.lucide) window.lucide.createIcons();

        // Attach details view events
        document.querySelectorAll('.view-tag-details').forEach(btn => {
          btn.addEventListener('click', () => {
            const index = parseInt(btn.getAttribute('data-index'));
            showTagDetails(index);
          });
        });
      }
      const panel = document.getElementById('auditDetailsPanel');
      if (panel) panel.classList.add('active');
    });
  }
}

function showTagDetails(index) {
  const stat = auditStats[index];
  if (!stat) return;

  const tableWrapper = document.getElementById('auditTableWrapper');
  const subPanel = document.getElementById('tagDetailsSubPanel');
  const title = document.getElementById('tagDetailsTitle');
  const removedList = document.getElementById('removedTagsList');
  const addedList = document.getElementById('addedTagsList');

  const prefix = translations.sandbox?.forensic_title_prefix || 'Forensic: ';
  if (title) title.textContent = `${prefix}${stat.filename}`;
  
  if (removedList) {
    removedList.innerHTML = stat.removedTags && stat.removedTags.length > 0 
      ? stat.removedTags.map(t => `<div class="tag-item-forensic"><span class="tag-name-label">${t.name}</span><span class="tag-value-text" title="${t.value}">${t.value}</span></div>`).join('')
      : `<p style="font-size:0.75rem; opacity:0.5; font-style:italic;">${translations.sandbox?.no_meta_found || 'No sensitive metadata found.'}</p>`;
  }

  if (addedList) {
    addedList.innerHTML = stat.addedTags && stat.addedTags.length > 0
      ? stat.addedTags.map(t => `<div class="tag-item-forensic"><span class="tag-name-label">${t.name}</span><span class="tag-value-text" title="${t.value}">${t.value}</span></div>`).join('')
      : `<p style="font-size:0.75rem; opacity:0.5; font-style:italic;">${translations.sandbox?.no_tags_added || 'No tags added.'}</p>`;
  }

  if (tableWrapper) tableWrapper.style.display = 'none';
  if (subPanel) subPanel.style.display = 'block';
}

const hideTagDetailsBtn = document.getElementById('hideTagDetailsBtn');
if (hideTagDetailsBtn) {
  hideTagDetailsBtn.addEventListener('click', () => {
    const tableWrapper = document.getElementById('auditTableWrapper');
    const subPanel = document.getElementById('tagDetailsSubPanel');
    if (subPanel) subPanel.style.display = 'none';
    if (tableWrapper) tableWrapper.style.display = 'block';
  });
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
