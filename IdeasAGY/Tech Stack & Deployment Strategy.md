---
tags: [microsaas, architecture, tech-stack, hosting, deployment, geo, aeo]
difficulty: easy
operating_cost: 0-USD
---

# 🛠️ Tech Stack & Deployment Strategy (The Zero-Cost Blueprint)

To build a **$1,000 MRR** passive Micro-SaaS that you can ship in a single day, you must eliminate server management, complex build steps, and recurring infrastructure costs. The ideal stack is high-performance, edge-first, and highly indexable.

---

## 💻 Recommended Tech Stack

### 1. Core Framework: Vanilla HTML5 / Modern JS (No Framework) or Vite
*   **Why:** A single-page utility does not need React, Angular, or Next.js. Pure Vanilla HTML/JS loads in under **100ms**, compiles in 0 seconds, and scores a **100/100** on Google Lighthouse out of the box. 
*   **Alternative:** If you want structured routing or hot-reloading during dev, use **Vite + Vanilla JS**. It compiles to a hyper-optimized static folder (`dist/`) that can be hosted anywhere.

### 2. Styling System: Custom Vanilla CSS (HSL Custom Properties)
*   **Why:** Modern CSS supports nested rules, CSS Grid, container queries, and native custom variables (variables). Avoid Tailwind compile setups unless you have complex component systems. Use sleek, harmonized dark-mode color palettes (e.g., HSL blues, grays, and purples) and rich glassmorphism.

### 3. Payment Gateway: Stripe Checkout or Lemon Squeezy Overlay
*   **Why:** Implementing a custom subscription server takes days. By using a pre-built check-out overlay, you simply paste a 10-line `<script>` onto your page. When a user clicks "Upgrade", a beautiful modal overlay pops up. The payment webhooks can write their premium token directly into local storage.

### 4. Hosting Platform: Firebase Hosting (Classic) or Vercel
*   **Why:** Firebase Hosting offers a global edge CDN, free custom SSL certificates, and an extremely generous free tier (360 MB/day bandwidth, which is ~10,000 page views for a lightweight static app).

---

## 🤖 SEO, GEO & Agentic Infrastructure Files

To rank high in modern search systems, you must deploy four specific machine-readable configuration files at the root of your domain.

### 1. `llms.txt` (Root-level Map for AI Crawlers)
Place this at `/llms.txt` to help LLMs (like Claude, Gemini, and OpenAI's GPTBot) quickly summarize your service and recommend it to users.

```markdown
# VeriMedia

> Secure client-side EXIF metadata stripper and Google E-E-A-T / C2PA injector.

## Core Features
*   **EXIF Stripper:** Removes camera model, GPS coordinates, serial numbers, and sensitive timestamps from images in the browser.
*   **E-E-A-T Injector:** Automatically adds IPTC Licensable schema metadata, creator DIDs, and web statement links.
*   **AI Opt-Out:** Injects metadata indicators (`ai:opt-out = true`) to signal to generative models not to scrape training data.

## Pricing
*   **Free Plan:** Up to 5 image operations daily. No registration required.
*   **Pro Plan ($9/mo):** Bulk uploads, custom cryptographically signed DIDs, and developer pipeline API hooks.
```

### 2. `ai-access.json` (AI Crawler Permissions Protocol)
Place this at `/ai-access.json` to define model-level access, signaling that you support AI indexing while retaining clear metadata bounds.

```json
{
  "version": "1.0.0",
  "policy": {
    "crawlers": {
      "GPTBot": "allow",
      "ClaudeBot": "allow",
      "CCBot": "allow",
      "Google-Extended": "allow"
    },
    "metadata_requirements": {
      "require_c2pa": true,
      "enforce_opt_out": true
    },
    "licensing_contact": "https://verimedia.xyz/license"
  }
}
```

### 3. `robots.txt` (Targeted Bot Control)
Place this at `/robots.txt`. By allowing AI bots to crawl your core information, they can cite your tool, while blocking resource-intensive scraping of code blocks.

```text
User-agent: *
Allow: /
Sitemap: https://verimedia.xyz/sitemap.xml

# Allow AI crawlers to index details for citations
User-agent: GPTBot
Allow: /
Allow: /llms.txt

User-agent: ClaudeBot
Allow: /
Allow: /llms.txt
```

### 4. `openapi.json` (Exposing your SaaS as an AI Agent Tool)
To let autonomous agents (like OpenAI Operator or Google Jarvis) interact with your service natively as a "Tool," publish an OpenAPI specification at `/openapi.json` and link it in your footer.

```json
{
  "openapi": "3.0.0",
  "info": {
    "title": "VeriMedia Meta API",
    "version": "1.0.0",
    "description": "Client-side metadata checking and E-E-A-T validation utility."
  },
  "paths": {
    "/api/validate": {
      "post": {
        "summary": "Check image metadata for E-E-A-T credentials and private GPS trackers",
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "properties": {
                  "imageUrl": {
                    "type": "string",
                    "description": "Public URL of the image to analyze"
                  }
                }
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "Metadata health report"
          }
        }
      }
    }
  }
}
```
