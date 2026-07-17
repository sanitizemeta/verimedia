/**
 * Shared nav + footer for all non-main pages.
 * Edit once here — updates every guide, legal, and 404 page.
 */

const SUPPORTED_LANGS = ['en'];
const LANG_LABELS = { en: 'English (EN)' };
const LANG_KEY = 'vm_lang';

function detectLang() {
  const urlLang = new URLSearchParams(window.location.search).get('lang');
  if (SUPPORTED_LANGS.includes(urlLang)) return urlLang;
  const pathLang = window.location.pathname.split('/').filter(Boolean)[0];
  if (SUPPORTED_LANGS.includes(pathLang)) return pathLang;
  return 'en';
}

// Guide slugs that have translated versions under /{lang}/
const TRANSLATABLE_GUIDES = [
  'ai-opt-out-metadata',
  'remove-exif-from-photos',
  'remove-pdf-metadata',
  'knowledge',
  'privacy',
  'terms',
  'refund',
];

function buildLangUrl(lang) {
  // Detect if we're currently on a guide page (strip leading lang prefix if any)
  const parts = window.location.pathname.split('/').filter(Boolean);
  // Remove lang prefix if present
  const pageParts = SUPPORTED_LANGS.includes(parts[0]) ? parts.slice(1) : parts;
  const slug = pageParts[0];

  if (slug === 'image-converter') {
    return `/image-converter/?lang=${lang}`;
  }

  if (TRANSLATABLE_GUIDES.includes(slug)) {
    if (lang === 'en') return `/${slug}/`;
    return `/${lang}/${slug}/`;
  }

  // Default: go to localized home
  if (lang === 'en') return '/';
  return `/${lang}/`;
}

const currentLang = detectLang();

let fullTranslations = {};

async function loadChromeStrings(lang) {
  try {
    const res = await fetch(`/locales/${lang}.json`);
    if (!res.ok) throw new Error('locale not found');
    const data = await res.json();
    fullTranslations = data;
    return data.chrome || {};
  } catch {
    return {};
  }
}

function applyPageTranslations() {
  document.querySelectorAll('[data-i18n], [data-i18n-alt], [data-i18n-html]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    const altKey = el.getAttribute('data-i18n-alt');
    const htmlKey = el.getAttribute('data-i18n-html');

    if (key) {
      let value = fullTranslations;
      for (const k of key.split('.')) { value = value ? value[k] : null; }
      if (value) {
        if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
          el.placeholder = value;
        } else {
          el.textContent = value;
        }
      }
    }

    if (altKey) {
      let value = fullTranslations;
      for (const k of altKey.split('.')) { value = value ? value[k] : null; }
      if (value) el.setAttribute('alt', value);
    }

    if (htmlKey) {
      let value = fullTranslations;
      for (const k of htmlKey.split('.')) { value = value ? value[k] : null; }
      if (value) el.innerHTML = value;
    }
  });
}

function homeUrl() {
  return currentLang === 'en' ? '/' : `/${currentLang}/`;
}

function guideUrl(slug) {
  return currentLang === 'en' ? `/${slug}/` : `/${currentLang}/${slug}/`;
}

function buildNav(t) {
  const home = homeUrl();
  const showLanguage = false; // English-only site; language switcher removed
  const showProfile = document.body.dataset.chromeProfile !== 'false';
  return `
  <div class="logo-container">
    <a href="${home}">
      <span class="logo-text">
        <img src="/icon.svg" alt="VeriMedia" width="24" height="24">
        VeriMedia<span class="dot">.xyz</span>
      </span>
    </a>
  </div>
  <nav>
    <div class="nav-dropdown-wrap">
      <button id="sc-ext-toggle" class="nav-link nav-dropdown-toggle" type="button" aria-expanded="false" aria-controls="sc-ext-dropdown">
        ${t.nav_extensions || 'Extensions'}
      </button>
      <div id="sc-ext-dropdown" class="glass-card nav-dropdown" hidden>
        <a href="/image-converter/" class="nav-dropdown-item">
          <span>${t.nav_image_converter || 'Image Converter'}</span>
          <small>Image &amp; PDF tools</small>
        </a>
        <a href="/vanishai/" class="nav-dropdown-item">
          <span>${t.nav_vanishai || 'VanishAI'}</span>
        </a>
        <a href="/quietbrowsing/" class="nav-dropdown-item">
          <span>${t.nav_quietbrowsing || 'QuietBrowsing'}</span>
          <small>Clean tracking links</small>
        </a>
        <a href="/shotglow/" class="nav-dropdown-item">
          <span>${t.nav_shotglow || 'Shotglow'}</span>
          <small>Screenshot beautifier</small>
        </a>
      </div>
    </div>
    <a href="${home}#pricing-section" class="nav-link">${t.nav_pricing || 'Pricing'}</a>
    <a href="${guideUrl('knowledge')}" class="nav-link">${t.nav_knowledge || 'Guides'}</a>
    <a href="${home}#faq-section" class="nav-link">${t.nav_faq || 'FAQ'}</a>
    <a href="${home}#calculator-section" class="nav-link nav-cta">${t.nav_cta || 'Shield my images'}</a>
    ${showLanguage ? `
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
    ` : ''}
    ${showProfile ? `
    <button class="profile-nav-btn nav-link" id="profileBtn" type="button" aria-label="Open Creator Profile settings" title="Creator Profile: set your name, copyright & URL">
      <i data-lucide="user" style="width:13px;height:13px;"></i>
      ${t.nav_profile || 'Profile'}
    </button>
    ` : ''}
  </nav>
`;
}

function buildFooter(t) {
  const home = homeUrl();
  return `
  <div class="footer-grid">
    <div class="footer-brand">
      <span class="logo-text" style="font-size:1.2rem; display:flex; align-items:center; gap:8px;">
        <img src="/icon.svg" alt="VeriMedia" width="20" height="20">
        VeriMedia<span class="dot">.xyz</span>
      </span>
      <p class="footer-tagline">${t.footer_tagline || 'Block AI scrapers. Protect your creative work.<br>Zero uploads. Zero tracking. Free core, forever.'}</p>
      <p class="footer-copy">${t.footer_copy || '© 2026 VeriMedia.xyz. Processed 100% locally in your browser. No files are ever stored or uploaded.'}</p>
    </div>
    <div class="footer-col">
      <h4 class="footer-col-title">${t.footer_col_extensions || 'Extensions'}</h4>
      <a href="/image-converter/" class="footer-link">${t.footer_link_image_converter || 'Image Converter'}</a>
      <a href="/quietbrowsing/" class="footer-link">${t.footer_link_quietbrowsing || 'QuietBrowsing'}</a>
      <a href="/vanishai/" class="footer-link">${t.footer_link_vanishai || 'VanishAI'}</a>
      <a href="/shotglow/" class="footer-link">${t.footer_link_shotglow || 'Shotglow'}</a>
    </div>
    <div class="footer-col">
      <h4 class="footer-col-title">${t.footer_col_guides || 'Guides'}</h4>
      <a href="${guideUrl('ai-opt-out-metadata')}" class="footer-link">${t.footer_link_ai_guide || 'AI Training Shield Guide'}</a>
      <a href="${guideUrl('remove-exif-from-photos')}" class="footer-link">${t.footer_link_exif_guide || 'EXIF Removal Guide'}</a>
      <a href="${guideUrl('remove-pdf-metadata')}" class="footer-link">${t.footer_link_pdf_guide || 'PDF Privacy Guide'}</a>
      <a href="${guideUrl('knowledge')}" class="footer-link">${t.footer_link_kb || 'Knowledge Base'}</a>
    </div>
    <div class="footer-col">
      <h4 class="footer-col-title">${t.footer_col_legal || 'Legal'}</h4>
      <a href="${currentLang === 'en' ? '/privacy/' : `/${currentLang}/privacy/`}" class="footer-link">${t.footer_link_privacy || 'Privacy Policy'}</a>
      <a href="${currentLang === 'en' ? '/terms/' : `/${currentLang}/terms/`}" class="footer-link">${t.footer_link_terms || 'Terms of Service'}</a>
      <a href="${currentLang === 'en' ? '/refund/' : `/${currentLang}/refund/`}" class="footer-link">${t.footer_link_refund || 'Refund Policy'}</a>
      <a href="${home}#pricing-section" class="footer-link">${t.footer_link_pricing || 'Pricing'}</a>
      <a href="/support/" class="footer-link">${t.footer_link_support || 'Support'}</a>
      <a href="https://ko-fi.com/verimedia" class="footer-link" target="_blank" rel="noopener">${t.footer_link_kofi || 'Support us on Ko-fi'}</a>
    </div>
  </div>
  <div class="footer-bottom">
    <span><i data-lucide="shield-check" style="width:12px;height:12px;vertical-align:middle;color:var(--emerald);margin-right:5px;"></i>${t.footer_bottom || 'All files processed 100% locally — nothing ever leaves your browser.'}</span>
  </div>
`;
}

function renderChrome(t = {}) {
  const header = document.querySelector('header');
  if (header) header.innerHTML = buildNav(t);

  const footer = document.querySelector('footer');
  if (footer) footer.innerHTML = buildFooter(t);

  if (window.lucide) window.lucide.createIcons();
}

function wireLanguageDropdown() {
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
}

function wireExtensionsDropdown() {
  const toggle = document.getElementById('sc-ext-toggle');
  const dropdown = document.getElementById('sc-ext-dropdown');

  if (!toggle || !dropdown) return;

  toggle.addEventListener('click', (e) => {
    e.stopPropagation();
    const open = !dropdown.hidden;
    dropdown.hidden = open;
    toggle.setAttribute('aria-expanded', String(!open));
  });

  dropdown.addEventListener('click', (e) => {
    e.stopPropagation();
  });

  document.addEventListener('click', () => {
    dropdown.hidden = true;
    toggle.setAttribute('aria-expanded', 'false');
  });
}

function bootFaqAccordions() {
  document.querySelectorAll('.faq-trigger').forEach((btn) => {
    if (btn.dataset.faqBound === 'true') return;
    btn.dataset.faqBound = 'true';
    btn.addEventListener('click', () => {
      const item = btn.closest('.faq-item');
      if (!item) return;
      const accordion = item.closest('.faq-accordion') || document;
      const isOpen = btn.getAttribute('aria-expanded') === 'true';

      accordion.querySelectorAll('.faq-item.open').forEach((el) => {
        el.classList.remove('open');
        el.querySelector('.faq-trigger')?.setAttribute('aria-expanded', 'false');
      });

      if (!isOpen) {
        item.classList.add('open');
        btn.setAttribute('aria-expanded', 'true');
      }
    });
  });
}

renderChrome();
wireExtensionsDropdown();
wireLanguageDropdown();
bootFaqAccordions();

document.addEventListener('DOMContentLoaded', async () => {
  renderChrome();
  wireExtensionsDropdown();
  wireLanguageDropdown();
  bootFaqAccordions();

  const t = await loadChromeStrings(currentLang);
  window.VM_TRANSLATIONS = fullTranslations;

  renderChrome(t);
  wireExtensionsDropdown();
  wireLanguageDropdown();

  document.documentElement.setAttribute('lang', currentLang);
  applyPageTranslations();
  bootFaqAccordions();
});
