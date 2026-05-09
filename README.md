# 🏫 Beacon Light School ERP

A complete school management system built with Next.js 14 + Supabase.

## ✅ Login Credentials

| Field    | Value                        |
|----------|------------------------------|
| Email    | ``    |
| Password | *(the password you set in Supabase dashboard)* |

---

## 🚀 Run Locally

### Step 1 — Install dependencies
```bash
npm install
```

### Step 2 — Create `.env.local` file
Create a file named `.env.local` in the project root:
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

### Step 3 — Start development server
```bash
npm run dev
```



---

## 📁 Project Structure

```
beacon-erp/
├── app/
│   ├── login/          → Login page
│   ├── dashboard/      → Dashboard + layout
│   ├── students/       → Student management
│   ├── attendance/     → Attendance marking
│   ├── fees/           → Fee collection
│   └── api/            → REST API routes
├── components/
│   └── Sidebar.tsx     → Navigation sidebar
├── lib/supabase/
│   ├── client.ts       → Browser client
│   └── server.ts       → Server client
├── types/index.ts      → TypeScript types
├── middleware.ts        → Auth protection
└── .env.local          → Your credentials (never commit this)
```

## 🔧 Tech Stack
- **Framework:** Next.js 14 (App Router)
- **Database:** Supabase (PostgreSQL)
- **Auth:** Supabase Auth
- **Styling:** Tailwind CSS + inline styles
- **Language:** TypeScript

## 📊 Features (Phase 1)
- ✅ Secure login with Supabase Auth
- ✅ Principal dashboard with live stats
- ✅ Student profiles — add, search, filter by class
- ✅ Daily attendance — present/absent/late/leave per class
- ✅ Fee collection — record payments, track status
- ✅ Role-based access (principal / teacher / admin)
- ✅ Multi-tenant — one deployment, multiple schools

## 🔄 Push Updates to GitHub
```bash
git add .
git commit -m "your message here"
git push origin main
```

## ☁️ Deploy to Vercel
```bash
npx vercel
# Add environment variables in Vercel dashboard
```
