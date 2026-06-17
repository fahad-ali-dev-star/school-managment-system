# 📱 PWA Setup — Beacon Light School ERP

Complete step-by-step guide to make your Next.js ERP installable on mobile.

---

## 1. Install the package

```bash
npm install next-pwa
npm install --save-dev sharp   # for icon generation
```

---

## 2. Copy these files into your project

| File from this package          | Copy to your project             |
|---------------------------------|----------------------------------|
| `next.config.js`                | `/next.config.js` (merge yours)  |
| `public/manifest.json`          | `/public/manifest.json`          |
| `app/layout.tsx`                | `/app/layout.tsx` (merge yours)  |
| `app/offline/page.tsx`          | `/app/offline/page.tsx`          |
| `components/PWAInstallBanner.tsx` | `/components/PWAInstallBanner.tsx` |
| `scripts/generate-icons.js`     | `/scripts/generate-icons.js`     |

---

## 3. Generate icons

1. Put your school logo (min **512×512 PNG**) at `public/logo-source.png`
2. Run:

```bash
node scripts/generate-icons.js
```

This creates all 8 icon sizes in `public/icons/`.

---

## 4. Add the install banner to your layout

In your `app/layout.tsx`, import and add the banner inside `<body>`:

```tsx
import { PWAInstallBanner } from '@/components/PWAInstallBanner';

// inside <body>:
<PWAInstallBanner />
{children}
```

---

## 5. Add `.gitignore` entries

```gitignore
# PWA generated files
public/sw.js
public/sw.js.map
public/workbox-*.js
public/workbox-*.js.map
public/worker-*.js
public/worker-*.js.map
```

---

## 6. Update `next.config.js`

Merge the `withPWA` wrapper with your existing config.
The file already shows the pattern — just move your existing config
options inside the `nextConfig` object.

---

## 7. Deploy to Vercel

PWA requires HTTPS — Vercel provides this automatically.

```bash
git add .
git commit -m "feat: add PWA support for mobile install"
git push
```

---

## 8. Test on mobile

**Android:**
1. Open your deployed URL in Chrome
2. Tap the **⋮** menu → "Add to Home screen"
3. Or the install banner at the bottom will appear automatically

**iOS (Safari):**
1. Open your deployed URL in Safari
2. Tap the **Share** button (box with arrow)
3. Scroll down → "Add to Home Screen"
4. Tap "Add"

---

## What users get after installing

- ✅ App icon on home screen
- ✅ Full-screen (no browser UI)  
- ✅ Splash screen on launch
- ✅ Offline fallback page
- ✅ Cached dashboard & student pages
- ✅ Push notifications (future — add via Supabase Edge Functions)

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| Install banner not showing | Must be on HTTPS + visited twice |
| Icons not showing | Run `generate-icons.js`, check `public/icons/` |
| Old cache loading | Hard refresh: Shift+Reload or clear site data |
| iOS "Add to Screen" missing | Must use Safari, not Chrome on iOS |
| `next-pwa` build error | Ensure `disable: true` in development |
