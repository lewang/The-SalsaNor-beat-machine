# Deployment Guide - Static Export to Shared Hosting

This guide explains how to deploy the SalsaNor Beat Machine to shared hosting (ProISP, One.com, etc.) using Next.js static export.

## 📋 Prerequisites

- Node.js 20.x installed locally
- FTP/SFTP access to your web host OR cPanel File Manager
- Domain configured: `beat.salsanor.no`

## 🚀 Quick Start

### 1. Build the Static Site

```bash
# Install dependencies (if not already done)
npm install

# Build static files for production
npm run deploy

# Optional: Preview locally before uploading
npm run deploy:preview
```

This creates an `out/` folder containing all static files ready for deployment.

## 📁 What Gets Built

The `out/` folder contains:

```
out/
├── index.html              # Main page
├── 404.html               # 404 error page
├── _next/                 # Next.js assets (CSS, JS)
│   ├── static/
│   └── ...
├── assets/                # Audio files and resources
│   ├── audio/
│   │   ├── main.webm     (~2.8 MB)
│   │   ├── main.mp3      (~2.8 MB)
│   │   └── main.json
│   ├── machines/         # XML configurations
│   └── instruments/      # Instrument icons
└── ...
```

**Total size:** ~50-60 MB

## 📤 Upload to ProISP (or any shared host)

### Option A: cPanel File Manager

1. **Login to cPanel**
   - Navigate to your hosting control panel
   - Click "File Manager"

2. **Navigate to web root**
   - Usually `public_html` or `www`
   - For subdomain: `public_html/beat` or similar

3. **Upload files**
   - Click "Upload"
   - Drag the entire contents of `out/` folder
   - OR select files and upload
   - Wait for completion (may take 5-10 minutes due to audio files)

4. **Copy .htaccess**
   - Upload `public/.htaccess` to the root of your domain
   - This enables CORS and caching

### Option B: FTP (FileZilla)

1. **Connect via FTP**
   ```
   Host: ftp.yourdomain.com
   Username: your_username
   Password: your_password
   Port: 21
   ```

2. **Navigate to web root**
   - Remote site: `/public_html` or `/www`

3. **Upload files**
   - Drag contents of `out/` folder to remote site
   - Upload `public/.htaccess` to root
   - Set file permissions: 644 for files, 755 for folders

### Option C: SFTP/rsync (if SSH available)

```bash
# Upload via rsync (fastest)
rsync -avz --delete out/ user@host:/path/to/public_html/

# Copy .htaccess
scp public/.htaccess user@host:/path/to/public_html/.htaccess
```

## 🔧 Configuration

### .htaccess (Already included)

The `.htaccess` file in `public/` folder provides:

✅ **CORS headers** - Required for cross-domain asset loading  
✅ **Compression** - Reduces bandwidth by ~60%  
✅ **Caching** - Faster load times (1 year for audio, 1 hour for HTML)  
✅ **Security headers** - XSS protection, clickjacking prevention  
✅ **Correct MIME types** - Ensures browsers handle files correctly  

**Important:** Make sure your host allows `.htaccess` overrides. Most shared hosts do by default.

### DNS Configuration

Point your domain to the hosting server:

```
Type: A Record
Name: beat (or @)
Value: [Your ProISP server IP]
TTL: 3600
```

Wait 5-60 minutes for DNS propagation.

### SSL Certificate (Recommended)

Most hosts offer free SSL via Let's Encrypt in cPanel:

1. Go to cPanel > SSL/TLS > Manage SSL
2. Click "Issue Certificate" for your domain
3. Wait 5-10 minutes for activation
4. Uncomment HTTPS redirect in `.htaccess`

## ✅ Verify Deployment

### 1. Test Main Site

Visit: `https://beat.salsanor.no`

You should see the beat machine interface.

### 2. Test Audio Loading

Open browser console (F12) and check:
- No 404 errors for audio files
- `main.json` loads correctly
- Audio plays when clicking instruments

## 🔄 Updating the Site

When you make changes:

```bash
# 1. Make your code changes
# 2. Build again
npm run deploy

# 3. Upload only changed files:
#    - Upload modified files from out/ folder
#    - Usually just _next/static/*.js and HTML files
#    - Audio files rarely change, no need to re-upload
```

**Tip:** Use FTP client's "sync" feature to only upload changed files.

## 📊 Performance Tips

### 1. Enable Compression

Already configured in `.htaccess`. Verify it's working:

```bash
curl -H "Accept-Encoding: gzip" -I https://beat.salsanor.no
# Should return: Content-Encoding: gzip
```

### 2. Cache Audio Files

Audio files are cached for 1 year. Clear browser cache to force reload during testing:

- Chrome: Ctrl+Shift+R (Cmd+Shift+R on Mac)
- Firefox: Ctrl+F5

### 3. Use WebM Only (Optional)

Modern browsers support WebM. To reduce size, consider removing MP3:

1. Delete `public/assets/audio/main.mp3`
2. Update audio loading logic to use WebM only
3. Saves ~2.8 MB

## 🐛 Troubleshooting

### Issue: "404 Not Found" for pages

**Cause:** HTML files not uploaded or wrong directory  
**Solution:**
- Verify `index.html` exists in web root
- Check file permissions (644)

### Issue: Audio doesn't play

**Cause:** MIME types not set or CORS blocked  
**Solution:**
- Verify `.htaccess` is uploaded and active
- Check server error logs in cPanel
- Test audio URL directly: `https://beat.salsanor.no/assets/audio/main.webm`

### Issue: Site works locally but not on server

**Cause:** Base path or asset path mismatch  
**Solution:**
- Check `next.config.js` - ensure `basePath` is correct
- Verify asset URLs in HTML start with `/` or full domain
- Check browser console for 404 errors

### Issue: Large upload takes forever

**Cause:** 50 MB upload over slow connection  
**Solution:**
- Use FTP/SFTP instead of web uploader
- Upload audio files separately (one-time only)
- Consider compressing with zip and extracting on server (if SSH available)

### Issue: Page looks broken/unstyled

**Cause:** CSS not loading  
**Solution:**
- Check network tab for 404 errors on CSS files
- Verify `_next/static/` folder uploaded correctly
- Clear browser cache and reload

## 🔐 Security Checklist

- [ ] `.htaccess` uploaded and active
- [ ] Directory browsing disabled (`Options -Indexes`)
- [ ] SSL certificate installed
- [ ] HTTPS redirect enabled (uncomment in `.htaccess`)
- [ ] Security headers active (X-Content-Type-Options, etc.)
- [ ] No sensitive data in public files

## 📈 Monitoring

### Bandwidth Usage

Audio files are heavy. Monitor bandwidth in cPanel:
- Expected: ~5-10 GB/month for moderate traffic
- If exceeding: Consider CDN (Cloudflare)

### Error Logs

Check cPanel error logs for:
- 404 errors (missing files)
- 500 errors (server configuration issues)
- CORS errors (cross-domain problems)

### Analytics (Optional)

Add Google Analytics or similar to track:
- Page views
- Audio plays
- Geographic distribution

## 🆘 Support

If deployment fails:

1. **Check host compatibility:**
   - Does it support `.htaccess`?
   - Is `mod_rewrite` enabled?
   - Is `mod_headers` enabled?

2. **Contact ProISP support:**
   - Ask about `.htaccess` support
   - Request CORS header configuration
   - Ask about Node.js (if considering server-side)

3. **Alternative: Use Vercel (free)**
   ```bash
   npm i -g vercel
   vercel login
   vercel --prod
   ```

## 📚 Additional Resources

- [Next.js Static Export Documentation](https://nextjs.org/docs/app/building-your-application/deploying/static-exports)
- [Apache .htaccess Guide](https://httpd.apache.org/docs/current/howto/htaccess.html)
- [CORS Configuration](https://enable-cors.org/server_apache.html)
- Main deployment options: See [DEPLOYMENT_OPTIONS.md](./DEPLOYMENT_OPTIONS.md)

---

**Need help?** Check the full deployment analysis in [DEPLOYMENT_OPTIONS.md](./DEPLOYMENT_OPTIONS.md) for alternative hosting solutions including Vercel (free, recommended for automatic deployments).
