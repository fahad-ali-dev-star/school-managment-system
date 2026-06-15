# 🏫 Beacon Light School ERP

A comprehensive, multi-tenant SaaS School Management System built with **Next.js 14**, **Supabase**, and **Stripe**. Designed for school administrators, principals, teachers, and parents.

---

## 🚀 Features

- **Multi-Tenant Architecture:** Host multiple schools under a single deployment.
- **Super Admin Portal:** Global view for managing onboarding, monitoring tenant activity, and configuring platform settings.
- **Role-Based Dashboards:** Dedicated experiences for Principals (Admins), Teachers, and Parents.
- **Student & Class Management:** Complete profiles, roll numbers, and class allocations.
- **Attendance Tracking:** Mark daily attendance with status (Present, Absent, Late, Leave).
- **Exam & Report Cards:** Manage exams, enter marks, and automatically generate PDF report cards.
- **Fee Management:** Track fee statuses (Paid, Pending, Overdue) with seamless integrations.
- **Billing & Subscriptions (Stripe):** Integrated Stripe subscriptions with automated webhooks and tiered plans (Basic & Pro limits). Plan gating restricts features for basic users.
- **Notifications & Alerts (Twilio):** Real-time SMS and WhatsApp notifications for parents.
- **Error Tracking (Sentry):** Comprehensive error tracking and monitoring.
- **Analytics:** Data visualizations using Recharts for attendance and performance.

---

## 🔧 Tech Stack

- **Framework:** Next.js 14 (App Router)
- **Database & Auth:** Supabase (PostgreSQL)
- **Payments & Billing:** Stripe
- **Communication:** Twilio (SMS & WhatsApp API)
- **Error Monitoring:** Sentry
- **Styling:** Tailwind CSS + Framer Motion
- **Language:** TypeScript

---

## ⚙️ Environment Variables

Create a `.env.local` file in the root of your project. Add the following keys (DO NOT include actual secret values in public repositories):

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Twilio Configuration (Notifications)
TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_WHATSAPP_NUMBER=whatsapp:+1234567890
TWILIO_SMS_NUMBER=+1234567890

# Super Admin Access
NEXT_PUBLIC_SUPER_ADMIN_KEY=your_secure_super_admin_key

# Stripe Configuration (Billing & Subscriptions)
STRIPE_SECRET_KEY=your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=your_stripe_webhook_secret
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key
STRIPE_PRICE_BASIC=your_stripe_price_basic_id
STRIPE_PRICE_PRO=your_stripe_price_pro_id

# Sentry Configuration (Error Tracking)
SENTRY_AUTH_TOKEN=your_sentry_auth_token
```

---

## 🏃 Getting Started

### 1. Install dependencies
```bash
npm install
```

### 2. Configure Environment Variables
Copy the keys from the **Environment Variables** section above into a `.env.local` file and fill in your actual credentials.

### 3. Start the development server
```bash
npm run dev
```
Navigate to `http://localhost:3000` to view the application.

---

## 📁 Project Structure

```text
beacon-erp/
├── app/
│   ├── analytics/      → Analytics and charts
│   ├── api/            → Next.js Route Handlers (Stripe, Twilio, Supabase)
│   ├── attendance/     → Daily attendance tracking
│   ├── classes/        → Class management
│   ├── dashboard/      → Principal/Admin dashboard
│   ├── exams/          → Exam creation & marks
│   ├── fees/           → Fee collection system
│   ├── leaves/         → Leave requests
│   ├── login/          → Authentication pages
│   ├── notifications/  → Twilio SMS/WhatsApp alerts
│   ├── parent/         → Dedicated Parent Portal
│   ├── parents/        → Parent management (Admin)
│   ├── report-cards/   → PDF report generation
│   ├── students/       → Student profiles
│   ├── super-admin/    → Platform-wide super admin panel
│   ├── teacher/        → Dedicated Teacher Portal
│   └── teachers/       → Teacher management (Admin)
├── components/         → Reusable React components (Sidebar, PlanGate, etc.)
├── lib/                → Core logic (Supabase clients, Stripe config, Plans limits)
├── scripts/            → Helper scripts (e.g., onboarding schools)
├── types/              → TypeScript interface definitions
└── middleware.ts       → Next.js middleware for route protection
```

---

## 🔄 Deployment

### Vercel Deployment
This project is optimized for deployment on Vercel:
1. Push your code to GitHub.
2. Import the project into your Vercel dashboard.
3. Add all the required **Environment Variables** in the Vercel project settings.
4. Deploy!

```bash
npx vercel
```
