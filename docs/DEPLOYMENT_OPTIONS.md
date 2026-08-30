# Deployment Options for SalsaNor Beat Machine

## 📋 Project Overview

**Technology Stack:**
- **Framework:** Next.js 15.3.2 (React 18.3.1)
- **Runtime:** Node.js 20.19.2
- **Type:** SSR/SSG Hybrid Application
- **Build Output:** Static files + API routes (if used)
- **Assets:** Large audio files (~5.6 MB total: main.webm + main.mp3)

**Key Requirements:**
- Serve static HTML/CSS/JS
- Host audio files (WebM/MP3)
- Fast content delivery for audio samples

---

## 🎯 Deployment Options

### Option 1: Static Export to Shared Host (RECOMMENDED) ⭐

**Approach:** Build as static HTML and upload via FTP/cPanel File Manager

#### Steps:
```bash
# 1. Update next.config.js to enable static export
# Add: output: 'export'

# 2. Build static files
npm run build
npm run export

# 3. Upload 'out' folder contents to public_html via:
#    - cPanel File Manager
#    - FTP (FileZilla)
#    - SSH/rsync if available
```

#### Configuration Required:

**next.config.js:**
```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  trailingSlash: true,
  images: {
    unoptimized: true, // Required for static export
  },
  // Base path if not at domain root
  basePath: process.env.BASE_PATH || '',
}

export default nextConfig;
```

**.htaccess (for Apache):**
```apache
# Enable CORS for cross-domain asset loading
<IfModule mod_headers.c>
    Header set Access-Control-Allow-Origin "*"
    Header set Access-Control-Allow-Methods "GET, OPTIONS"
    Header set Access-Control-Allow-Headers "Content-Type"
</IfModule>

# Serve correct MIME types
<IfModule mod_mime.c>
    AddType audio/webm .webm
    AddType audio/mpeg .mp3
    AddType application/json .json
</IfModule>

# Enable compression
<IfModule mod_deflate.c>
    AddOutputFilterByType DEFLATE text/html text/css application/javascript application/json
</IfModule>

# Cache audio files (1 year)
<IfModule mod_expires.c>
    ExpiresActive On
    ExpiresByType audio/webm "access plus 1 year"
    ExpiresByType audio/mpeg "access plus 1 year"
    ExpiresByType application/json "access plus 1 week"
</IfModule>

# Redirect to index.html for SPA routing (if needed)
<IfModule mod_rewrite.c>
    RewriteEngine On
    RewriteBase /
    RewriteRule ^index\.html$ - [L]
    RewriteCond %{REQUEST_FILENAME} !-f
    RewriteCond %{REQUEST_FILENAME} !-d
    RewriteRule . /index.html [L]
</IfModule>
```

#### Pros:
✅ Works on any shared hosting (ProISP, One.com, etc.)  
✅ No Node.js runtime required  
✅ Fast page loads (pre-rendered HTML)  
✅ Easy to deploy (just upload files)  
✅ Very affordable hosting  
✅ CDN-friendly  

#### Cons:
❌ No server-side API routes  
❌ No dynamic rendering  
❌ Must rebuild for content changes  
❌ Large initial upload (~50 MB with audio files)  

#### Cost: **~50-100 NOK/month** (shared hosting)

---

### Option 2: cPanel Node.js App

**Approach:** Use cPanel's Node.js manager to run Next.js server

#### Steps via cPanel:
```
1. Log into cPanel
2. Go to "Setup Node.js App"
3. Create New Application:
   - Node.js version: 20.x
   - Application mode: Production
   - Application root: /home/username/beat-machine
   - Application URL: beat.salsanor.no
   - Application startup file: server.js
4. Install dependencies via terminal
5. Start application
```

#### Required Files:

**server.js:**
```javascript
const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');

const dev = process.env.NODE_ENV !== 'production';
const hostname = 'localhost';
const port = process.env.PORT || 3000;

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true);
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error('Error occurred handling', req.url, err);
      res.statusCode = 500;
      res.end('internal server error');
    }
  }).listen(port, (err) => {
    if (err) throw err;
    console.log(`> Ready on http://${hostname}:${port}`);
  });
});
```

#### Pros:
✅ Full Next.js features (SSR, API routes)  
✅ Dynamic content possible  
✅ Easy updates via Git  
✅ Can use Node.js ecosystem  

#### Cons:
❌ cPanel Node.js support varies by host  
❌ Memory limits (often 512 MB - 1 GB)  
❌ CPU throttling on shared hosting  
❌ More complex setup  
❌ Process may restart/crash on shared hosting  
❌ ProISP may not support Node.js apps  

#### Cost: **~150-300 NOK/month** (cPanel with Node.js)

---

### Option 3: Git Deploy + Build on Server

**Approach:** Push to Git, trigger build on server

#### Setup:
```bash
# 1. Initialize Git repo locally
git init
git add .
git commit -m "Initial commit"

# 2. Add remote (cPanel Git Version Control)
git remote add production ssh://user@host/~/repositories/beat-machine.git

# 3. Push to server
git push production master

# 4. SSH into server and build
ssh user@host
cd ~/beat-machine
npm install
npm run build
npm run start # or export for static
```

#### Pros:
✅ Version control integration  
✅ Easy rollbacks  
✅ Automated deployments possible  
✅ Clean workflow  

#### Cons:
❌ Requires SSH access  
❌ Server must have Node.js  
❌ Build process consumes resources  
❌ ProISP may not allow SSH/Git  

#### Cost: **~150-300 NOK/month** (hosting with SSH)

---

### Option 4: Vercel/Netlify (BEST for Next.js) ⭐⭐⭐

**Approach:** Deploy to specialized Next.js platform

#### Vercel (by Next.js creators):
```bash
# 1. Install Vercel CLI
npm i -g vercel

# 2. Deploy
vercel

# 3. Connect custom domain
vercel domains add beat.salsanor.no
```

#### Pros:
✅ **Zero configuration** for Next.js  
✅ Automatic builds on Git push  
✅ Global CDN (fast worldwide)  
✅ Free SSL/HTTPS  
✅ Preview deployments  
✅ Built-in analytics  
✅ Automatic scaling  
✅ Edge functions support  
✅ **FREE tier sufficient for this project**  

#### Cons:
❌ Audio files may count toward bandwidth limits  
❌ Need separate domain DNS setup  
❌ Vendor lock-in (but easy to migrate)  

#### Cost: **FREE** (Hobby tier) or **$20/month** (Pro)  
**Bandwidth:** 100 GB/month free (plenty for this app)

---

### Option 5: Static CDN + Cloudflare

**Approach:** Static export + Cloudflare CDN

#### Setup:
```bash
# 1. Build static
npm run build && npm run export

# 2. Upload to:
   - Bunny CDN (~1 EUR/month)
   - Cloudflare R2 Storage (~5 USD/month)
   - AWS S3 + CloudFront

# 3. Configure Cloudflare:
   - Add domain
   - Point to storage URL
   - Enable caching rules
```

#### Pros:
✅ Ultra-fast global delivery  
✅ Excellent caching  
✅ DDoS protection  
✅ Very affordable  
✅ Unlimited bandwidth (Cloudflare)  

#### Cons:
❌ More complex setup  
❌ Multiple services to configure  
❌ Overkill for small project  

#### Cost: **~50-100 NOK/month**

---

## 🎯 Recommendation for ProISP Shared Hosting

### Primary Recommendation: **Option 1 - Static Export**

**Why:**
1. ProISP shared hosting typically **does NOT** support Node.js apps
2. Static files work on **any web host**
3. **Simplest deployment** - just upload via FTP
4. **Fast performance** - no server processing
5. **Most affordable** - works with basic shared hosting

### Implementation Plan:

#### Phase 1: Enable Static Export
```bash
# 1. Modify next.config.js
cat >> next.config.js << 'EOF'
/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
  // Remove if at root domain
  // basePath: '/beat',
}

export default nextConfig;
EOF

# 2. Update package.json scripts
"export": "next export",
"deploy": "npm run build && npm run export"
```

#### Phase 2: Build & Test Locally
```bash
npm run deploy

# Test the output
cd out
npx serve
# Visit http://localhost:3000
```

#### Phase 3: Upload to ProISP
```
Option A - cPanel File Manager:
1. Login to cPanel
2. Navigate to public_html (or subdomain folder)
3. Upload entire 'out' folder contents
4. Add .htaccess file (see configuration above)

Option B - FTP (FileZilla):
1. Connect to FTP server
2. Navigate to web root
3. Upload 'out' folder contents
4. Set permissions: folders 755, files 644
```

#### Phase 4: Configure Domain
```
DNS Settings (in ProISP or domain registrar):
- A Record: beat.salsanor.no → ProISP server IP
- CNAME: www → beat.salsanor.no

Wait for DNS propagation (5-60 minutes)
```

# Test from browser console on different domain
fetch('https://beat.salsanor.no/assets/audio/main.json')
  .then(r => r.json())
  .then(console.log)
  .catch(console.error);

# Should return JSON, not CORS error
```

---

## ⚠️ Potential Issues & Solutions

### Issue 1: Next.js API Routes Don't Work

**Problem:** Static export doesn't support API routes  
**Solution:** Move any API logic to client-side or external service  
**Status:** ✅ **Not a problem** - this app has no API routes

### Issue 2: Dynamic Routing

**Problem:** Dynamic routes need special handling  
**Solution:** Pre-generate all routes or use hash routing  
**Status:** ✅ **Not a problem** - all pages are static

### Issue 3: Large Audio Files

**Problem:** 5.6 MB audio files slow upload  
**Solution:**  
- Upload once, only update HTML/JS/CSS on changes
- Use FTP resume if connection drops
- Consider Git LFS for version control

### Issue 4: Build Size

**Problem:** `out` folder is ~50 MB  
**Solution:**  
- Add `.htaccess` gzip compression
- Serve WebM only (modern browsers)
- Lazy-load audio on demand

### Issue 5: CORS Errors

**Problem:** Assets fail to load from another domain  
**Solution:**  
- Add `.htaccess` CORS headers (see above)
- Test with browser dev tools
- Ensure ProISP doesn't override headers

---

## 📊 Quick Comparison

| Solution | Cost/Month | Complexity | Node.js | Auto-Deploy | CORS | Speed |
|----------|-----------|------------|---------|-------------|------|-------|
| **Static Export (ProISP)** | **50-100 kr** | ⭐ Low | ❌ No | Manual | ✅ Yes | ⚡ Fast |
| cPanel Node.js | 150-300 kr | ⭐⭐⭐ High | ✅ Yes | Manual | ✅ Yes | 🐢 Slow |
| Git + Build | 150-300 kr | ⭐⭐⭐ High | ✅ Yes | ✅ Auto | ✅ Yes | ⚡ Fast |
| **Vercel** | **FREE** | ⭐ Low | ✅ Yes | ✅ Auto | ✅ Yes | ⚡⚡ Very Fast |
| CDN + Cloudflare | 50-100 kr | ⭐⭐⭐⭐ Very High | ❌ No | Manual | ✅ Yes | ⚡⚡⚡ Ultra Fast |

---

## 🚀 Final Recommendation

### For ProISP Shared Hosting:
**Use Option 1: Static Export** ⭐

**Steps:**
1. Run `npm run build && npm run export`
2. Upload `out/` folder to ProISP via cPanel File Manager
3. Add `.htaccess` with CORS headers
4. Point DNS to ProISP server

**Pros:** Simple, cheap, works everywhere  
**Cons:** Manual updates required

---

### Alternative: Vercel (Highly Recommended) ⭐⭐⭐

If you want:
- Automatic deployments on Git push
- Zero configuration
- Free hosting
- Global CDN

**Then use Vercel:**
```bash
npm i -g vercel
vercel login
vercel --prod
vercel domains add beat.salsanor.no
```

**Cost:** FREE (sufficient for this project)  
**Time to deploy:** 5 minutes  
**Updates:** Push to Git, auto-deploys

---

## 📝 Next Steps

1. **Verify ProISP supports:**
   - Custom .htaccess
   - CORS headers
   - Large file uploads (50 MB)

2. **Choose deployment method:**
   - Static export for simplicity
   - Vercel for best developer experience

3. **Test audio file delivery:**
   - Check gzip compression works
   - Verify CORS headers
   - Test load times from Norway

4. **Set up continuous deployment:**
   - Git repository
   - Build script
   - Upload automation (optional)

---

**Questions to answer:**
1. Does ProISP hosting support Node.js apps? (probably no)
2. Is FTP/SSH access available? (probably FTP only)
3. Are there bandwidth limits? (check if audio files count)
4. Can .htaccess override server config? (needed for CORS)

**Recommended:** Start with **Static Export** to ProISP. It's the safest, simplest option that works on any host. If you need automatic deployments later, migrate to Vercel (very easy).
