# NC Labs — Central Project Registry

NC Labs is a modern, responsive showcase and central project registry designed for high-performance web applications, experimental tools, and digital prototypes.

It is architected using **plain HTML5, modern CSS, and vanilla JavaScript (ES6+)**.
- **Zero build step required** (100% static hosting compatible).
- **Zero runtime dependencies**.
- **Central dynamic registry**: applications and prototypes are registered solely in `projects.json`.
- **Zero-pill typographic design**: clean unboxed metadata with subtle dividers (`/`, `·`), accessible contrast (WCAG AA), full keyboard navigation, dark/light theme persistence, and deep linking (`#project-id`).

---

## Architecture Overview

```
├── index.html          # Primary site entry point & semantic structure
├── projects.json       # Central application registry (single source of truth)
├── assets/
│   ├── style.css       # Responsive design system & CSS variables
│   ├── app.js          # Pure vanilla JS registry loader, filters & modal controller
│   ├── logo.svg        # NC Labs geometric emblem
│   ├── favicon.svg     # Browser tab icon
│   └── images/         # Project preview illustrations
└── README.md           # Deployment & maintenance guide
```

---

## Deploying to Vercel (Hobby Free Tier)

Deploying NC Labs to Vercel takes less than 2 minutes and requires no paid services, backend databases, or build pipelines.

### 1. How to Create a Vercel Account
1. Visit [vercel.com/signup](https://vercel.com/signup).
2. Choose **Continue with GitHub** (or GitLab / Bitbucket) to easily link your source code repository.
3. Complete the email verification and select the **Hobby (Free)** plan for non-commercial or personal projects.

### 2. How to Import the Project from a Git Repository
1. Push this repository to your GitHub, GitLab, or Bitbucket account.
2. From the Vercel Dashboard, click **Add New...** in the top right, then select **Project**.
3. Under **Import Git Repository**, find your repository and click **Import**.

### 3. How to Configure the Deployment
In the **Configure Project** screen, set the following options:

| Setting | Value | Why |
| :--- | :--- | :--- |
| **Project Name** | `nc-labs` (or your preferred name) | Sets your default `*.vercel.app` domain |
| **Framework Preset** | **Other** | Signals to Vercel that this is a pure static site with no framework |
| **Root Directory** | `./` (Repository root) | Ensures `index.html` and `projects.json` are served from the root |
| **Build Command** | *Leave empty / Override: Off* | Pure static HTML/CSS/JS requires no build step |
| **Output Directory** | *Leave empty / Override: Off* | Serves the root directory directly |
| **Environment Variables** | None required | Fully client-side architecture |

> **Note on Framework Preset**: If Vercel auto-detects `Vite` due to the root `vite.config.ts`, you can either leave it as `Vite` (Vite's build is configured to bundle `dist/` seamlessly) or select **Other** to bypass all building and serve static files directly.

### 4. How to Publish the Website
1. Click the blue **Deploy** button.
2. Vercel will process the deployment in roughly 10–15 seconds.
3. Once completed, confetti will appear with your live deployment URL (e.g., `https://nc-labs-yourname.vercel.app`).
4. Click the preview thumbnail or URL to verify your live website!

### 5. How to Connect a Custom Domain Later
If you want to attach your own domain (e.g., `labs.yourname.com` or `nclabs.dev`):
1. Navigate to your project on the Vercel dashboard and click **Settings**.
2. Select **Domains** in the left sidebar.
3. Enter your domain name and click **Add**.
4. Configure your domain registrar's DNS records as shown by Vercel:
   - For an **Apex domain** (`example.com`): Add an `A` record pointing to `76.76.21.21`.
   - For a **Subdomain** (`labs.example.com`): Add a `CNAME` record pointing to `cname.vercel-dns.com`.
5. Vercel automatically provisions and renews free SSL/TLS certificates via Let's Encrypt.

### 6. How to Update the Site
Because Vercel is connected to your Git repository:
1. Whenever you add a new project to `projects.json` or update assets, commit and push your changes:
   ```bash
   git add projects.json assets/
   git commit -m "feat: register new prototype in NC Labs"
   git push origin main
   ```
2. Vercel automatically detects the push, deploys the update in seconds, and updates your production URL with zero downtime.

---

## How to Add or Edit Applications in `projects.json`

Adding a new application requires editing **only `projects.json`** and optionally placing an image in `assets/images/`.

### JSON Schema & Field Reference

```json
{
  "id": "my-tool",
  "title": "My Tool Name",
  "tagline": "Brief one-line summary of what this tool does",
  "description": "Comprehensive explanation of capabilities, architecture, and intent.",
  "category": "Systems & Tools",
  "featured": true,
  "status": "Active",
  "version": "v1.0.0",
  "releaseDate": "2026-11-01",
  "image": "assets/images/my-tool.svg",
  "demoUrl": "https://example.com/demo",
  "repoUrl": "https://github.com/nclabs/my-tool",
  "docsUrl": "https://docs.example.com",
  "techStack": ["JavaScript", "HTML5", "CSS3"],
  "highlights": [
    "Sub-millisecond processing speed",
    "100% client-side memory safety",
    "Zero external runtime dependencies"
  ],
  "author": {
    "name": "Alex Mercer",
    "role": "Security Researcher"
  }
}
```

### Field Requirements & Fallbacks
- `id` *(required)*: Unique slug used for deep-linking (`#project-{id}`).
- `title` *(required)*: Primary display name.
- `description` *(required)*: Body copy displayed in cards and modal.
- `category` *(required)*: Automatically generates filter tabs and counts.
- `tagline` *(optional)*: Sub-heading displayed beneath title.
- `featured` *(optional)*: When `true`, displays project in the hero featured showcase.
- `status` *(optional)*: e.g. `"Active"`, `"Beta"`, `"Experimental"`, `"Archived"`.
- `releaseDate` *(optional)*: ISO formatted date (`"YYYY-MM-DD"`).
- `image` *(optional)*: Relative path to an asset (`assets/images/my-tool.svg`). If omitted or failed, an automatic clean geometric fallback badge is generated in real-time.
- `demoUrl` / `repoUrl` / `docsUrl` *(optional)*: Action links rendered on cards and detail modals.
- `techStack` *(optional)*: Array of technology strings rendered as subtle monospace badges.
- `highlights` *(optional)*: Key architectural takeaways rendered in the inspection modal.

---

## Troubleshooting & Diagnostics

### 1. `projects.json` Failed to Load / "Registry: Offline"
- **Verify file path**: Ensure `projects.json` is located in the repository root alongside `index.html`.
- **Verify JSON validity**: JSON requires double quotes for keys and strings. A trailing comma (e.g. `[...,]`) will cause a syntax error. Use an online JSON validator (like [jsonlint.com](https://jsonlint.com)) or click **Registry Spec** in the website header to view the built-in diagnostic report.
- **Check browser DevTools console**: Open Developer Tools (F12) &rarr; Console tab to inspect the exact fetch or parsing error message.

### 2. Missing Images / Broken Thumbnails
- Ensure image paths are relative from the root (e.g., `assets/images/latent-canvas.svg`, **not** `/assets/...` or `../assets/...`).
- If an image fails to load, NC Labs' built-in `onerror` handler automatically renders a dynamic SVG canvas preview displaying the project's title and category.

### 3. Vercel Shows 404 on Deployment
- Ensure **Root Directory** is set to `./` in your Vercel Project Settings.
- Ensure `index.html` is located directly in the root of your repository.

---

## Local Development & Preview

You can run and test NC Labs locally using any static file server:

```bash
# Using Python
python3 -m http.server 3000

# Or using Node.js
npx serve .

# Or using Vite (if installed)
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.
