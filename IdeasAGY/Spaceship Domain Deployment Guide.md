---
tags: [deployment, spaceship, hosting, vercel, cloudflare, ssl, verimedia]
difficulty: easy
operating_cost: 0-USD
---

# 🚀 Spaceship Domain & Zero-Cost Deployment Guide

Since **VeriMedia.xyz** is built as a pure client-side application (using Vite + HTML5 + CSS3 + Vanilla JS), it runs entirely in the user's browser. This means you do not need active servers or backends. 

You can host it **100% free** on global edge networks like **Vercel** or **Cloudflare Pages**, with $0/month server overhead, while linking your custom domain from **Spaceship**.

---

## 📦 Step 1: Prepare Your Build for Production

Before deploying, compile your local code into the optimized production bundle:

1. In your project root folder, run:
   ```bash
   npm run build
   ```
2. This creates a `dist/` directory containing:
   * `index.html` (minified HTML with embedded SEO and FAQ schemas)
   * `assets/` (compiled, ultra-compact JS and CSS files)
   * `llms.txt`, `ai-access.json`, `robots.txt`, `openapi.json` (static config engines)

---

## 🌩️ Step 2: Choose Your Free Hosting Platform

Both Vercel and Cloudflare Pages offer extremely generous free tiers. Choose one below:

### Option A: Vercel (Recommended for instant setup)
1. **Sign Up:** Go to [vercel.com](https://vercel.com) and create a free Hobby account using your GitHub account.
2. **Push to GitHub:** Create a private or public GitHub repository (e.g. `verimedia-saas`) and push your project code:
   ```bash
   git init
   git add .
   git commit -m "initial release"
   git branch -M main
   git remote add origin git@github.com:YOUR_USERNAME/verimedia-saas.git
   git push -u origin main
   ```
3. **Import Project:** In Vercel, click **Add New** > **Project** and import your repository.
4. **Build Settings:** Vercel automatically detects **Vite**:
   * **Framework Preset:** Vite
   * **Build Command:** `npm run build`
   * **Output Directory:** `dist`
5. Click **Deploy**. Your app will be live on a free `.vercel.app` subdomain in under a minute!

---

### Option B: Cloudflare Pages (Recommended for extreme speed & bandwidth)
1. **Sign Up:** Create a free account at [cloudflare.com](https://dash.cloudflare.com).
2. Go to **Workers & Pages** > **Pages** > **Create a project** > **Connect to Git**.
3. Select your GitHub repository.
4. Choose **Vite** as the framework preset:
   * **Build command:** `npm run build`
   * **Build output directory:** `dist`
5. Click **Save and Deploy**.

---

## 🛸 Step 3: Link Your Spaceship Custom Domain

Once your hosting is live, connect `verimedia.xyz` purchased from **Spaceship**:

### 1. Retrieve Hosting DNS Records
* **If using Vercel:**
  * Go to your project **Settings** > **Domains**.
  * Type `verimedia.xyz` and click **Add**.
  * Vercel will show the required DNS records:
    * An **A record** pointing `@` to `76.76.21.21`
    * A **CNAME record** pointing `www` to `cname.vercel-dns.com`
* **If using Cloudflare Pages:**
  * Go to project **Custom domains** > **Set up a custom domain**.
  * Type `verimedia.xyz` and follow the prompt to point your CNAME to your pages subdomain.

---

### 2. Configure DNS in Spaceship
1. Log in to your [Spaceship Customer Portal](https://www.spaceship.com).
2. Go to your **Domain Manager** and select `verimedia.xyz`.
3. Click on the **Advanced DNS** tab (or **DNS settings**).
4. Remove any default placeholder records (like park/holding IPs) and add the following:

#### Record 1 (Apex Domain)
* **Type:** `A`
* **Host / Name:** `@` (or leave blank)
* **Value / IP Address:** `76.76.21.21` (If using Vercel)
* **TTL:** `Automatic` or `300` (5 minutes)

#### Record 2 (WWW Subdomain)
* **Type:** `CNAME`
* **Host / Name:** `www`
* **Value / Target:** `cname.vercel-dns.com` (If using Vercel)
* **TTL:** `Automatic` or `300`

> [!NOTE]
> If you are using Cloudflare Pages, Cloudflare will automatically offer to manage your DNS directly. You can simply change your Spaceship **Nameservers** (NS records) to Cloudflare's designated nameservers (e.g. `adam.ns.cloudflare.com`) to manage DNS, SSL, and DDoS shielding in one place.

---

## 🔒 Step 4: Verification and SSL Provisioning

* **DNS Propagation:** DNS changes take anywhere from 2 to 15 minutes to propagate globally.
* **Auto-SSL:** Both Vercel and Cloudflare Pages automatically provision a **free, renewing Let's Encrypt SSL Certificate (HTTPS)** once the domain points to them correctly.
* **Verification:** Visit `https://verimedia.xyz` in your browser. Verify the padlock icon appears in the address bar.

---

## 🎯 Launch Checklist

* [ ] Custom domain loads over secure HTTPS.
* [ ] Drag-and-drop JPEG parser runs locally at the edge.
* [ ] Mock LemonSqueezy billing modal activates on Pro click.
* [ ] Crawler search files are queryable (e.g. `verimedia.xyz/llms.txt`, `/robots.txt`).
