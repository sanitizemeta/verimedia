# Search Optimization (Super Tier - Adaptive)

This skill is the world-leading framework for discovery. It is **Adaptive**: it rates your site before and after optimization to measure impact.

## ⚠️ Core Adaptive Mandates
- **URL Precision**: Always verify the project's URL convention (e.g., trailing slashes). Default to trailing slashes (`/`) unless the project config explicitly forbids it.
- **Dynamic Grounding**: Before suggesting changes, read `package.json`, `index.html`, or similar to understand the domain and routing logic.
- **Rating Baseline**: ALWAYS run the rating script before any implementation to establish a baseline.

## Quick Start (The Super Workflow)

1.  **Phase 0: Pre-Optimization Rating**: Run the rating script to evaluate the current state.
    ```bash
    node search-optimization/scripts/rate_site.cjs
    ```
2.  **Phase 1: Project Grounding**: Analyze the project's domain, routing, and URL conventions.
3.  **Phase 2: Multi-Surface Audit**: Run basic, pro, and super-tier audit scripts.
    ```bash
    node search-optimization/scripts/audit_structural_health.cjs <file>
    node search-optimization/scripts/analyze_content_pro.cjs <file>
    ```
4.  **Phase 3: Implementation**: Transform content with **Elite Specificity** and inject semantic JSON-LD.
5.  **Phase 4: Post-Optimization Rating**: Run the rating script again to measure improvements.
    ```bash
    node search-optimization/scripts/rate_site.cjs
    ```

## Super Tier Core Resources

- **SEO & AI Optimization (AIO)**: Foundations and "People-First" expertise.
  - See [references/seo.md](references/seo.md)
- **Generative & Answer Engines (GEO/AEO)**: Winning citations and AI citations.
  - See [references/geo-aeo.md](references/geo-aeo.md)
- **Verifiable Authority (E-E-A-T)**: Cryptographic provenance and DID integration.
  - See [references/verifiable.md](references/verifiable.md)

## Automation & Assets

- **Rating Tool**: [scripts/rate_site.cjs](scripts/rate_site.cjs)
- **Structural Auditor**: [scripts/audit_structural_health.cjs](scripts/audit_structural_health.cjs)
- **JSON-LD Templates**: Located in `assets/templates/` (Product, HowTo).
