/**
 * Shared nav + footer for all non-main pages.
 * Edit once here — updates every guide, legal, and 404 page.
 */

const SUPPORTED_LANGS = ['en', 'es', 'fr', 'de'];
const LANG_LABELS = { en: 'English (EN)', es: 'Español (ES)', fr: 'Français (FR)', de: 'Deutsch (DE)' };
const LANG_KEY = 'vm_lang';

function detectLang() {
  const stored = localStorage.getItem(LANG_KEY);
  if (stored && SUPPORTED_LANGS.includes(stored)) return stored;
  const pathLang = window.location.pathname.split('/').filter(Boolean)[0];
  if (SUPPORTED_LANGS.includes(pathLang)) return pathLang;
  return 'en';
}

function buildLangUrl(lang) {
  // For guide/legal pages there are no translated versions — redirect to localized home
  if (lang === 'en') return '/';
  return `/${lang}`;
}

const currentLang = detectLang();

const NAV_HTML = `
  <div class="logo-container">
    <a href="/">
      <span class="logo-text">
        <img src="/icon.svg" alt="VeriMedia" width="24" height="24">
        VeriMedia<span class="dot">.xyz</span>
      </span>
    </a>
  </div>
  <nav>
    <a href="/#calculator-section" class="nav-link">Utility</a>
    <a href="/#pricing-section" class="nav-link">Pricing</a>
    <a href="/#faq-section" class="nav-link">FAQ</a>
    <a href="/#calculator-section" class="nav-link nav-cta">Shield my images</a>
    <div class="lang-switcher-wrap" style="position:relative;">
      <button id="sc-lang-toggle" class="nav-link" style="background:none;border:none;padding:0.35rem 0;cursor:pointer;text-transform:uppercase;" aria-label="Switch Language">
        <span id="sc-lang-current">${currentLang.toUpperCase()}</span>
      </button>
      <div id="sc-lang-dropdown" class="glass-card lang-dropdown" style="display:none;position:absolute;top:calc(100% + 8px);right:0;min-width:140px;z-index:1000;padding:0.5rem;">
        ${SUPPORTED_LANGS.map(l => `
          <button class="lang-opt sc-lang-opt${l === currentLang ? ' active' : ''}" data-lang="${l}">
            ${LANG_LABELS[l]}
          </button>`).join('')}
      </div>
    </div>
    <a href="/" class="profile-nav-btn nav-link">
      <i data-lucide="user" style="width:13px;height:13px;"></i>
      Profile
    </a>
  </nav>
`;

const FOOTER_HTML = `
  <div class="footer-grid">
    <div class="footer-brand">
      <span class="logo-text" style="font-size:1.2rem; display:flex; align-items:center; gap:8px;">
        <img src="/icon.svg" alt="VeriMedia" width="20" height="20">
        VeriMedia<span class="dot">.xyz</span>
      </span>
      <p class="footer-tagline">Block AI scrapers. Protect your creative work.<br>Zero uploads. Zero tracking. Free core, forever.</p>
      <p class="footer-copy">&copy; 2026 VeriMedia.xyz. Processed 100% locally in your browser. No files are ever stored or uploaded.</p>
    </div>
    <div class="footer-col">
      <h4 class="footer-col-title">Tools</h4>
      <a href="/#calculator-section" class="footer-link">AI Opt-Out Shield</a>
      <a href="/ai-opt-out-metadata" class="footer-link">AI Opt-Out Tagger</a>
      <a href="/remove-exif-from-photos" class="footer-link">EXIF &amp; GPS Cleaner</a>
      <a href="/remove-pdf-metadata" class="footer-link">PDF Metadata Cleaner</a>
    </div>
    <div class="footer-col">
      <h4 class="footer-col-title">Resources</h4>
      <a href="/ai-opt-out-metadata" class="footer-link">AI Training Shield Guide</a>
      <a href="/remove-exif-from-photos" class="footer-link">EXIF Removal Guide</a>
      <a href="/remove-pdf-metadata" class="footer-link">PDF Privacy Guide</a>
      <a href="/knowledge" class="footer-link">Knowledge Base</a>
    </div>
    <div class="footer-col">
      <h4 class="footer-col-title">Legal</h4>
      <a href="/privacy" class="footer-link">Privacy Policy</a>
      <a href="/terms" class="footer-link">Terms of Service</a>
      <a href="/refund" class="footer-link">Refund Policy</a>
      <a href="/#pricing-section" class="footer-link">Pricing</a>
    </div>
  </div>
  <div class="footer-bottom">
    <span><i data-lucide="shield-check" style="width:12px;height:12px;vertical-align:middle;color:var(--emerald);margin-right:5px;"></i>All files processed 100% locally — nothing ever leaves your browser.</span>
  </div>
`;

document.addEventListener('DOMContentLoaded', () => {
  const header = document.querySelector('header');
  if (header) header.innerHTML = NAV_HTML;

  const footer = document.querySelector('footer');
  if (footer) footer.innerHTML = FOOTER_HTML;

  if (window.lucide) window.lucide.createIcons();

  // Wire language dropdown
  const toggle = document.getElementById('sc-lang-toggle');
  const dropdown = document.getElementById('sc-lang-dropdown');

  if (toggle && dropdown) {
    toggle.addEventListener('click', (e) => {
      e.stopPropagation();
      const open = dropdown.style.display === 'block';
      dropdown.style.display = open ? 'none' : 'block';
    });

    document.addEventListener('click', () => {
      dropdown.style.display = 'none';
    });

    document.querySelectorAll('.sc-lang-opt').forEach(btn => {
      btn.addEventListener('click', () => {
        const lang = btn.getAttribute('data-lang');
        localStorage.setItem(LANG_KEY, lang);
        window.location.href = buildLangUrl(lang);
      });
    });
  }
});
