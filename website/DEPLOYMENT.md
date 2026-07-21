# Website Deployment Guide (Vercel CLI)

This website is configured to deploy to **Vercel**. Because the website references the parent library package (`../../src`), the Vercel deployment must be initiated from the repository root directory.

---

### Step 1: Log in to Vercel (First time only)
In your terminal, go to the repository root directory and log in:
```bash
npx --prefix website vercel login
```
*(Select **Email** to receive a quick verification link).*

---

### Step 2: Deploy to Production
To compile and publish the website live:
```bash
npx --prefix website vercel --prod --yes
```
*(The `--yes` flag will skip all interactive prompts and automatically deploy using the pre-configured settings in `vercel.json`).*

---

### Step 3: Configure Custom Domains
To bind custom domains to your Vercel project:

1. Open your project on the Vercel Dashboard.
2. Go to **Settings > Domains**.
3. Add your custom domains.
4. Update the DNS records at your domain registrar so they point to Vercel's edge network:
   - **A Record**: Name: `@`, Value: `76.76.21.21` (for each domain)
   - **CNAME Record**: Name: `www`, Value: `cname.vercel-dns.com` (for each domain)

---

### Single-Page Routing Note
Vercel is pre-configured via the root `vercel.json` file to rewrite all sub-paths (like `/notebook`, `/about`) to `index.html`. This ensures browser refreshes on subpages do not trigger 404 errors.
