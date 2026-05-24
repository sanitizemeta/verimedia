/**
 * Shared nav + footer for all non-main pages.
 * Edit once here — updates every guide, legal, and 404 page.
 */

const NAV_HTML = `
  <div class="logo-container">
    <a href="/" style="text-decoration:none;">
      <span class="logo-text">
        <img src="/icon.svg" alt="VeriMedia" width="24" height="24">
        VeriMedia<span class="dot">.xyz</span>
      </span>
    </a>
  </div>
  <nav>
    <a href="/" class="nav-link">Home</a>
    <a href="/#pricing-section" class="nav-link">Pricing</a>
    <a href="/#faq-section" class="nav-link">FAQ</a>
    <a href="/#calculator-section" class="nav-link nav-cta">Shield my images</a>
    <div class="nav-lang-strip">
      <a href="/" class="nav-link nav-lang-link">EN</a>
      <a href="/es" class="nav-link nav-lang-link">ES</a>
      <a href="/fr" class="nav-link nav-lang-link">FR</a>
      <a href="/de" class="nav-link nav-lang-link">DE</a>
    </div>
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
      <p class="footer-copy">&copy; 2026 VeriMedia.xyz</p>
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
    <span>All files processed 100% locally — nothing ever leaves your browser.</span>
  </div>
`;

document.addEventListener('DOMContentLoaded', () => {
  const header = document.querySelector('header');
  if (header) header.innerHTML = NAV_HTML;

  const footer = document.querySelector('footer');
  if (footer) footer.innerHTML = FOOTER_HTML;

  if (window.lucide) window.lucide.createIcons();
});
