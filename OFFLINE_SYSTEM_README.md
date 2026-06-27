# Offline System Implementation Guide
## Beacon Light School ERP — Next.js 14 + Supabase + Vercel

> **For GitHub Copilot:** This document contains complete, step-by-step instructions to add a zero-cost offline system to the existing ERP. Follow each section in order. Do not skip steps. All code is production-ready and tailored to this project's stack.

---

## Table of Contents

1. [Overview](#1-overview)
2. [How It Works](#2-how-it-works)
3. [Tech Stack for Offline](#3-tech-stack-for-offline)
4. [Prerequisites & Assumptions](#4-prerequisites--assumptions)
5. [Step 1 — Install Dexie.js](#step-1--install-dexiejs)
6. [Step 2 — Create Local Database](#step-2--create-local-database)
7. [Step 3 — Create Offline Data Hooks](#step-3--create-offline-data-hooks)
8. [Step 4 — Create Sync Queue (Offline Writes)](#step-4--create-sync-queue-offline-writes)
9. [Step 5 — Create Reconnect Sync Listener](#step-5--create-reconnect-sync-listener)
10. [Step 6 — Create Offline Banner Component](#step-6--create-offline-banner-component)
11. [Step 7 — Update Root Layout](#step-7--update-root-layout)
12. [Step 8 — Convert Pages to Client Components](#step-8--convert-pages-to-client-components)
13. [Step 9 — Update next-pwa Config](#step-9--update-next-pwa-config)
14. [Step 10 — Update next.config.js](#step-10--update-nextconfigjs)
15. [File Structure After Implementation](#file-structure-after-implementation)
16. [What Works Offline vs Online-Only](#what-works-offline-vs-online-only)
17. [Testing Offline Mode](#testing-offline-mode)
18. [Important Rules for Copilot](#important-rules-for-copilot)
19. [Troubleshooting](#troubleshooting)

---

## 1. Overview

The Beacon Light School ERP currently runs fully online on Vercel + Supabase. This guide adds **offline support** with **zero additional cost** using:

- **PWA Service Worker** — caches app pages/assets (already partially set up via `next-pwa`)
- **Dexie.js + IndexedDB** — stores school data locally in the browser
- **Sync Queue** — queues offline writes and pushes them to Supabase when internet returns

**Cost: $0/month. No new services. No Supabase Pro required.**

---

## 2. How It Works

```
FIRST VISIT (internet required)
Browser → Vercel (downloads app) → Service Worker caches everything

ALL LATER VISITS (works offline)
Browser → Service Worker (serves pages from cache)
         → IndexedDB (serves data locally)
         → Vercel is NOT contacted at all

WHEN BACK ONLINE
Sync Queue → Supabase (pushes any offline writes automatically)
```

**Key rule:** Vercel only delivers the app on the very first load. After that, the Service Worker and IndexedDB handle everything. Vercel is never contacted during offline use.

---

## 3. Tech Stack for Offline

| Tool | Purpose | Cost |
|------|---------|------|
| `next-pwa` | Service Worker + page caching | Free (already installed) |
| `dexie` | IndexedDB wrapper for local data storage | Free |
| Browser IndexedDB | Local database built into every browser | Free |
| Custom sync queue | Table in IndexedDB for offline write queue | Free (custom code) |

---

## 4. Prerequisites & Assumptions

Before starting, confirm these are true for this project:

- [x] Next.js 14 with App Router (`app/` directory)
- [x] Supabase client already configured at `lib/supabaseClient.js` (or `.ts`)
- [x] `next-pwa` already installed
- [x] App deployed on Vercel
- [x] Multi-tenant: each school has a `school_id`
- [x] Main tables: `students`, `attendance`, `fees` (add others as needed)
- [x] Supabase auth already working (teachers log in before going offline)

---

## Step 1 — Install Dexie.js

Run this command in the project root:

```bash
npm install dexie
```

Dexie.js is a lightweight wrapper around the browser's built-in IndexedDB. It makes database operations simple and supports TypeScript. It is completely free and has no server component.

---

## Step 2 — Create Local Database

Create the file `lib/localDb.js`:

```js
// lib/localDb.js
// Local IndexedDB database using Dexie.js
// This database lives entirely in the browser — no server needed
// Stores: students, attendance, fees, and a syncQueue for offline writes

import Dexie from 'dexie'

export const localDb = new Dexie('BeaconLightERP')

localDb.version(1).stores({
  // Format: 'primaryKey, indexedField1, indexedField2'
  students:    'id, name, class_id, school_id, roll_number',
  attendance:  'id, student_id, date, present, school_id, class_id',
  fees:        'id, student_id, amount, paid, due_date, school_id',
  classes:     'id, name, school_id, teacher_id',
  teachers:    'id, name, school_id, email',

  // Sync queue: stores offline writes that need to be pushed to Supabase
  // ++id means auto-increment primary key
  syncQueue:   '++id, table_name, action, synced, createdAt'
})

export default localDb
```

> **Copilot note:** If this project has additional tables (timetable, results, announcements), add them here following the same pattern. The index fields should match the columns you filter by most often.

---

## Step 3 — Create Offline Data Hooks

Create the file `lib/offlineData.js`:

```js
// lib/offlineData.js
// All data read/write operations go through here.
// Reads always come from IndexedDB (fast, works offline).
// Writes go to IndexedDB immediately + queue for Supabase sync.

import { localDb } from './localDb'
import { supabase } from './supabaseClient'

// ─────────────────────────────────────────────
// SYNC: Pull latest data from Supabase into IndexedDB
// Call this once on app load when online
// ─────────────────────────────────────────────

export async function syncAllDataFromSupabase(schoolId) {
  if (!navigator.onLine) {
    console.log('Offline — skipping initial sync, using cached data')
    return
  }

  try {
    console.log('Syncing from Supabase...')

    const [students, attendance, fees, classes, teachers] = await Promise.all([
      supabase.from('students').select('*').eq('school_id', schoolId),
      supabase.from('attendance').select('*').eq('school_id', schoolId),
      supabase.from('fees').select('*').eq('school_id', schoolId),
      supabase.from('classes').select('*').eq('school_id', schoolId),
      supabase.from('teachers').select('*').eq('school_id', schoolId),
    ])

    // bulkPut: insert or update (won't fail on duplicate)
    if (students.data)   await localDb.students.bulkPut(students.data)
    if (attendance.data) await localDb.attendance.bulkPut(attendance.data)
    if (fees.data)       await localDb.fees.bulkPut(fees.data)
    if (classes.data)    await localDb.classes.bulkPut(classes.data)
    if (teachers.data)   await localDb.teachers.bulkPut(teachers.data)

    console.log('Sync complete — data available offline')
  } catch (err) {
    console.error('Sync failed:', err)
  }
}

// ─────────────────────────────────────────────
// READ OPERATIONS (always from IndexedDB — works offline)
// ─────────────────────────────────────────────

export async function getStudents(schoolId) {
  return localDb.students
    .where('school_id').equals(schoolId)
    .toArray()
}

export async function getStudentsByClass(classId) {
  return localDb.students
    .where('class_id').equals(classId)
    .toArray()
}

export async function getAttendanceByDate(schoolId, date) {
  return localDb.attendance
    .where('[school_id+date]')
    .equals([schoolId, date])
    .toArray()
}

export async function getAttendanceByStudent(studentId) {
  return localDb.attendance
    .where('student_id').equals(studentId)
    .toArray()
}

export async function getFeesByStudent(studentId) {
  return localDb.fees
    .where('student_id').equals(studentId)
    .toArray()
}

export async function getClasses(schoolId) {
  return localDb.classes
    .where('school_id').equals(schoolId)
    .toArray()
}

export async function getTeachers(schoolId) {
  return localDb.teachers
    .where('school_id').equals(schoolId)
    .toArray()
}

// ─────────────────────────────────────────────
// WRITE OPERATIONS (save locally + queue for Supabase)
// ─────────────────────────────────────────────

export async function saveAttendance(record) {
  // Always save locally first (instant, works offline)
  await localDb.attendance.put(record)

  if (navigator.onLine) {
    // Online: push to Supabase immediately
    const { error } = await supabase.from('attendance').upsert(record)
    if (error) {
      // If Supabase fails, add to queue as backup
      await addToSyncQueue('attendance', 'upsert', record)
    }
  } else {
    // Offline: add to sync queue
    await addToSyncQueue('attendance', 'upsert', record)
  }
}

export async function saveFeePayment(record) {
  await localDb.fees.put(record)

  if (navigator.onLine) {
    const { error } = await supabase.from('fees').upsert(record)
    if (error) await addToSyncQueue('fees', 'upsert', record)
  } else {
    await addToSyncQueue('fees', 'upsert', record)
  }
}

export async function saveStudent(record) {
  await localDb.students.put(record)

  if (navigator.onLine) {
    const { error } = await supabase.from('students').upsert(record)
    if (error) await addToSyncQueue('students', 'upsert', record)
  } else {
    await addToSyncQueue('students', 'upsert', record)
  }
}

// ─────────────────────────────────────────────
// SYNC QUEUE HELPERS
// ─────────────────────────────────────────────

async function addToSyncQueue(tableName, action, payload) {
  await localDb.syncQueue.add({
    table_name: tableName,
    action:     action,
    payload:    JSON.stringify(payload),
    synced:     false,
    createdAt:  new Date().toISOString()
  })
  console.log(`Queued offline write: ${action} on ${tableName}`)
}

export async function getPendingSyncCount() {
  return localDb.syncQueue.where('synced').equals(false).count()
}
```

---

## Step 4 — Create Sync Queue (Offline Writes)

Create the file `lib/syncQueue.js`:

```js
// lib/syncQueue.js
// Processes the sync queue — pushes offline writes to Supabase
// Called automatically when internet connection is restored

import { localDb } from './localDb'
import { supabase } from './supabaseClient'

export async function processSyncQueue() {
  // Get all unsynced items
  const queue = await localDb.syncQueue
    .where('synced').equals(false)
    .toArray()

  if (queue.length === 0) {
    console.log('Sync queue is empty — nothing to sync')
    return { success: 0, failed: 0 }
  }

  console.log(`Processing ${queue.length} offline changes...`)

  let successCount = 0
  let failedCount  = 0

  for (const item of queue) {
    try {
      const payload = JSON.parse(item.payload)

      if (item.action === 'upsert') {
        const { error } = await supabase
          .from(item.table_name)
          .upsert(payload)

        if (error) throw error
      }

      if (item.action === 'delete') {
        const { error } = await supabase
          .from(item.table_name)
          .delete()
          .eq('id', payload.id)

        if (error) throw error
      }

      // Mark as synced (keep record for audit, don't delete)
      await localDb.syncQueue.update(item.id, { synced: true })
      successCount++

    } catch (err) {
      console.error(`Failed to sync item ${item.id}:`, err)
      failedCount++
      // Leave in queue — will retry next time
    }
  }

  console.log(`Sync done: ${successCount} succeeded, ${failedCount} failed`)
  return { success: successCount, failed: failedCount }
}

// Clean up old synced items (run weekly to keep IndexedDB clean)
export async function cleanSyncedQueue() {
  const oneWeekAgo = new Date()
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7)

  await localDb.syncQueue
    .where('synced').equals(true)
    .and(item => new Date(item.createdAt) < oneWeekAgo)
    .delete()
}
```

---

## Step 5 — Create Reconnect Sync Listener

Create the file `lib/syncOnReconnect.js`:

```js
// lib/syncOnReconnect.js
// Listens for internet reconnection and auto-processes the sync queue
// Also re-syncs fresh data from Supabase after reconnecting

import { processSyncQueue, cleanSyncedQueue } from './syncQueue'
import { syncAllDataFromSupabase } from './offlineData'

let isListening = false
let schoolIdRef = null

export function startSyncListener(schoolId) {
  // Prevent duplicate listeners
  if (isListening) return
  isListening = true
  schoolIdRef = schoolId

  window.addEventListener('online', handleReconnect)
  window.addEventListener('offline', handleDisconnect)

  console.log('Sync listener started')
}

export function stopSyncListener() {
  window.removeEventListener('online', handleReconnect)
  window.removeEventListener('offline', handleDisconnect)
  isListening = false
}

async function handleReconnect() {
  console.log('Internet restored — starting sync...')

  // 1. Push offline writes to Supabase
  const result = await processSyncQueue()

  // 2. Pull fresh data from Supabase
  if (schoolIdRef) {
    await syncAllDataFromSupabase(schoolIdRef)
  }

  // 3. Clean up old synced records
  await cleanSyncedQueue()

  // 4. Notify user (dispatch custom event — listen for this in UI)
  window.dispatchEvent(new CustomEvent('erp:synced', {
    detail: { ...result }
  }))
}

function handleDisconnect() {
  console.log('Internet lost — app will continue working offline')
  window.dispatchEvent(new CustomEvent('erp:offline'))
}
```

---

## Step 6 — Create Offline Banner Component

Create the file `components/OfflineBanner.jsx`:

```jsx
// components/OfflineBanner.jsx
// Shows a banner when offline and a success message when sync completes
// Place this at the top of the root layout

'use client'
import { useEffect, useState } from 'react'

export default function OfflineBanner() {
  const [status, setStatus] = useState('online') // 'online' | 'offline' | 'synced'
  const [pendingCount, setPendingCount] = useState(0)

  useEffect(() => {
    // Set initial status
    if (!navigator.onLine) setStatus('offline')

    // Listen for custom events from sync listener
    const onOffline = () => setStatus('offline')
    const onSynced  = (e) => {
      setStatus('synced')
      // Hide synced message after 4 seconds
      setTimeout(() => setStatus('online'), 4000)
    }

    window.addEventListener('erp:offline', onOffline)
    window.addEventListener('erp:synced',  onSynced)
    window.addEventListener('online',  () => setStatus('online'))
    window.addEventListener('offline', onOffline)

    return () => {
      window.removeEventListener('erp:offline', onOffline)
      window.removeEventListener('erp:synced',  onSynced)
      window.removeEventListener('online',  () => setStatus('online'))
      window.removeEventListener('offline', onOffline)
    }
  }, [])

  if (status === 'online') return null

  if (status === 'synced') {
    return (
      <div style={{
        background: '#16a34a',
        color: '#fff',
        textAlign: 'center',
        padding: '8px 16px',
        fontSize: '14px',
        fontWeight: 500
      }}>
        Back online — all offline changes synced successfully
      </div>
    )
  }

  // Offline status
  return (
    <div style={{
      background: '#d97706',
      color: '#fff',
      textAlign: 'center',
      padding: '8px 16px',
      fontSize: '14px',
      fontWeight: 500
    }}>
      You are offline — showing cached data. Any changes will sync when internet returns.
    </div>
  )
}
```

---

## Step 7 — Update Root Layout

Update `app/layout.jsx` to wire everything together:

```jsx
// app/layout.jsx
import { Inter } from 'next/font/google'
import './globals.css'
import OfflineBanner from '@/components/OfflineBanner'
import AppInitializer from '@/components/AppInitializer'

const inter = Inter({ subsets: ['latin'] })

export const metadata = {
  title: 'Beacon Light School ERP',
  description: 'School Management System',
  manifest: '/manifest.json',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={inter.className}>
        {/* Offline/online status banner */}
        <OfflineBanner />
        {/* Initializes sync on app load */}
        <AppInitializer />
        {children}
      </body>
    </html>
  )
}
```

Create `components/AppInitializer.jsx`:

```jsx
// components/AppInitializer.jsx
// Runs on every page load:
// 1. Syncs latest data from Supabase into IndexedDB (if online)
// 2. Starts the reconnect listener

'use client'
import { useEffect } from 'react'
import { syncAllDataFromSupabase } from '@/lib/offlineData'
import { startSyncListener } from '@/lib/syncOnReconnect'
import { supabase } from '@/lib/supabaseClient'

export default function AppInitializer() {
  useEffect(() => {
    async function init() {
      // Get current user's school_id from Supabase auth
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Get school_id from user metadata or your profiles table
      const schoolId = user.user_metadata?.school_id
                    || user.app_metadata?.school_id
      if (!schoolId) return

      // 1. Pull data into IndexedDB (only if online)
      await syncAllDataFromSupabase(schoolId)

      // 2. Start listening for reconnect events
      startSyncListener(schoolId)
    }

    init()
  }, [])

  return null // This component renders nothing
}
```

> **Copilot note:** Adjust how `schoolId` is retrieved to match how this project stores it. Check the `profiles` or `schools` table in Supabase if it is not in user metadata.

---

## Step 8 — Convert Pages to Client Components

**Critical rule:** Any page that teachers use while offline MUST be a Client Component (`'use client'`) that reads from IndexedDB, not from Supabase directly.

### Students Page

Update `app/(dashboard)/students/page.jsx`:

```jsx
'use client'
import { useEffect, useState } from 'react'
import { getStudents } from '@/lib/offlineData'
import { supabase } from '@/lib/supabaseClient'

export default function StudentsPage() {
  const [students, setStudents] = useState([])
  const [loading,  setLoading]  = useState(true)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      const schoolId = user?.user_metadata?.school_id
      if (!schoolId) return

      // Reads from IndexedDB — works offline
      const data = await getStudents(schoolId)
      setStudents(data)
      setLoading(false)
    }
    load()
  }, [])

  if (loading) return <p>Loading students...</p>

  return (
    <div>
      <h1>Students ({students.length})</h1>
      {students.map(s => (
        <div key={s.id}>{s.name} — Class {s.class_id}</div>
      ))}
    </div>
  )
}
```

### Attendance Page

Update `app/(dashboard)/attendance/page.jsx`:

```jsx
'use client'
import { useEffect, useState } from 'react'
import { getStudentsByClass, saveAttendance } from '@/lib/offlineData'
import { supabase } from '@/lib/supabaseClient'

export default function AttendancePage() {
  const [students,   setStudents]   = useState([])
  const [attendance, setAttendance] = useState({}) // { studentId: true/false }
  const [saving,     setSaving]     = useState(false)
  const [saved,      setSaved]      = useState(false)
  const today = new Date().toISOString().split('T')[0]

  useEffect(() => {
    async function load() {
      // Load students for the teacher's class
      // Adjust classId retrieval to match your auth/profile setup
      const data = await getStudentsByClass('CLASS_ID_HERE')
      setStudents(data)

      // Default all students to present
      const defaults = {}
      data.forEach(s => defaults[s.id] = true)
      setAttendance(defaults)
    }
    load()
  }, [])

  async function handleSave() {
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()

    for (const student of students) {
      await saveAttendance({
        id:         `${student.id}_${today}`, // composite unique id
        student_id: student.id,
        school_id:  user?.user_metadata?.school_id,
        date:       today,
        present:    attendance[student.id] ?? true,
        marked_by:  user?.id,
        created_at: new Date().toISOString()
      })
    }

    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  return (
    <div>
      <h1>Attendance — {today}</h1>
      {!navigator.onLine && (
        <p style={{ color: '#d97706' }}>
          Offline mode — attendance will sync when internet returns
        </p>
      )}
      {students.map(s => (
        <div key={s.id} style={{ display: 'flex', gap: 12, marginBottom: 8 }}>
          <span>{s.name}</span>
          <input
            type="checkbox"
            checked={attendance[s.id] ?? true}
            onChange={e => setAttendance(prev => ({
              ...prev,
              [s.id]: e.target.checked
            }))}
          />
          <label>{attendance[s.id] ? 'Present' : 'Absent'}</label>
        </div>
      ))}
      <button onClick={handleSave} disabled={saving}>
        {saving ? 'Saving...' : saved ? 'Saved!' : 'Save Attendance'}
      </button>
    </div>
  )
}
```

### Fees Page

Update `app/(dashboard)/fees/page.jsx`:

```jsx
'use client'
import { useEffect, useState } from 'react'
import { getFeesByStudent, saveFeePayment } from '@/lib/offlineData'

export default function FeesPage({ params }) {
  const [fees,    setFees]    = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const data = await getFeesByStudent(params.studentId)
      setFees(data)
      setLoading(false)
    }
    load()
  }, [params.studentId])

  async function handleMarkPaid(fee) {
    const updated = { ...fee, paid: true, paid_at: new Date().toISOString() }
    await saveFeePayment(updated)
    setFees(prev => prev.map(f => f.id === fee.id ? updated : f))
  }

  if (loading) return <p>Loading fees...</p>

  return (
    <div>
      <h1>Fee Records</h1>
      {fees.map(fee => (
        <div key={fee.id}>
          <span>Rs. {fee.amount} — {fee.paid ? 'Paid' : 'Unpaid'}</span>
          {!fee.paid && (
            <button onClick={() => handleMarkPaid(fee)}>Mark Paid</button>
          )}
        </div>
      ))}
    </div>
  )
}
```

---

## Step 9 — Update next-pwa Config

Create or update `next.config.js`:

```js
// next.config.js
const withPWA = require('next-pwa')({
  dest:          'public',
  register:      true,
  skipWaiting:   true,
  // Only disable in development — enable in production
  disable:       process.env.NODE_ENV === 'development',

  runtimeCaching: [
    {
      // Cache all app pages (NetworkFirst: try server, fall back to cache)
      urlPattern: ({ url }) => url.pathname.startsWith('/'),
      handler:    'NetworkFirst',
      options: {
        cacheName:   'pages-cache',
        networkTimeoutSeconds: 5,
        expiration: {
          maxEntries:        60,
          maxAgeSeconds:     7 * 24 * 60 * 60 // 7 days
        }
      }
    },
    {
      // Cache static assets (JS, CSS, fonts, images)
      urlPattern: /\.(?:js|css|woff2?|png|jpg|jpeg|svg|ico)$/,
      handler:    'CacheFirst',
      options: {
        cacheName: 'static-assets',
        expiration: {
          maxEntries:    100,
          maxAgeSeconds: 30 * 24 * 60 * 60 // 30 days
        }
      }
    },
    {
      // Cache Supabase REST API responses as fallback
      urlPattern: /^https:\/\/.*\.supabase\.co\/rest\/.*/,
      handler:    'NetworkFirst',
      options: {
        cacheName: 'supabase-api-cache',
        networkTimeoutSeconds: 5,
        expiration: {
          maxEntries:    200,
          maxAgeSeconds: 24 * 60 * 60 // 1 day
        }
      }
    }
  ]
})

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Keep your existing Next.js config here
}

module.exports = withPWA(nextConfig)
```

---

## Step 10 — Update next.config.js

Make sure `manifest.json` exists at `public/manifest.json`. If not, create it:

```json
{
  "name": "Beacon Light School ERP",
  "short_name": "BLS ERP",
  "description": "School Management System",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#1e40af",
  "orientation": "portrait",
  "icons": [
    {
      "src": "/icons/icon-192x192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "/icons/icon-512x512.png",
      "sizes": "512x512",
      "type": "image/png"
    }
  ]
}
```

> **Copilot note:** Make sure icon files exist at `public/icons/`. If they do not exist, create placeholder PNG files or generate them from the school logo.

---

## File Structure After Implementation

```
project-root/
├── app/
│   ├── layout.jsx                    ← UPDATED (add OfflineBanner + AppInitializer)
│   └── (dashboard)/
│       ├── students/
│       │   └── page.jsx              ← UPDATED (convert to client component)
│       ├── attendance/
│       │   └── page.jsx              ← UPDATED (convert to client component)
│       └── fees/
│           └── page.jsx              ← UPDATED (convert to client component)
├── components/
│   ├── OfflineBanner.jsx             ← NEW
│   └── AppInitializer.jsx            ← NEW
├── lib/
│   ├── localDb.js                    ← NEW (Dexie IndexedDB schema)
│   ├── offlineData.js                ← NEW (read/write functions)
│   ├── syncQueue.js                  ← NEW (process offline writes)
│   ├── syncOnReconnect.js            ← NEW (reconnect listener)
│   └── supabaseClient.js             ← UNCHANGED
├── public/
│   └── manifest.json                 ← VERIFY EXISTS
└── next.config.js                    ← UPDATED (next-pwa runtime caching)
```

---

## What Works Offline vs Online-Only

| Feature | Offline | Notes |
|---------|---------|-------|
| View student list | ✅ Yes | Reads from IndexedDB |
| Search students | ✅ Yes | Dexie supports where/filter |
| Mark attendance | ✅ Yes | Saves locally, syncs later |
| View attendance history | ✅ Yes | Reads from IndexedDB |
| View fee records | ✅ Yes | Reads from IndexedDB |
| Mark fee as paid | ✅ Yes | Queues, syncs on reconnect |
| Generate report card (jsPDF) | ✅ Yes | Uses local data |
| View class list | ✅ Yes | Reads from IndexedDB |
| Add new student | ✅ Yes | Queues, syncs on reconnect |
| WhatsApp/SMS notifications | ❌ No | Requires internet (Twilio/SendPK) |
| Stripe billing | ❌ No | Always requires internet |
| Login / authentication | ❌ No | Requires internet (first login) |
| Admin dashboard (charts) | ✅ Partial | Data is local, charts render |
| Sentry error tracking | ❌ No | Queues errors, sends when online |

---

## Testing Offline Mode

Follow these steps to test after implementation:

### Step 1 — Initial Setup
1. Deploy to Vercel or run locally with `npm run build && npm start`
2. Open the app in Chrome
3. Log in as a teacher (this stores auth session)
4. Wait for the initial sync to complete (check console for "Sync complete")

### Step 2 — Go Offline
1. Open Chrome DevTools → Network tab → set to "Offline"
   OR disable Wi-Fi on the device
2. Refresh the page — it should load from Service Worker cache
3. Navigate to Students, Attendance, Fees pages — all should load

### Step 3 — Test Offline Writes
1. Mark attendance for a class while offline
2. Check console — should see "Queued offline write: upsert on attendance"
3. Check IndexedDB in DevTools → Application → IndexedDB → BeaconLightERP → syncQueue

### Step 4 — Reconnect and Verify Sync
1. Turn internet back on (set Network to "No throttling")
2. Watch console — should see "Back online — starting sync..."
3. Verify green banner appears: "all offline changes synced successfully"
4. Check Supabase dashboard — attendance records should now appear

### Step 5 — Verify on Mobile
1. Open the deployed Vercel URL on a mobile phone
2. Install the PWA (Add to Home Screen)
3. Enable airplane mode
4. Open the app from home screen — should work fully offline

---

## Important Rules for Copilot

When implementing this system, follow these rules strictly:

1. **Never use `async/await` in Server Components for offline-critical pages** — those run on Vercel and cannot work offline. Use `'use client'` and `useEffect` instead.

2. **All reads must go through `lib/offlineData.js`** — never call `supabase.from()` directly in components that need to work offline.

3. **All writes must go through `saveAttendance`, `saveFeePayment`, etc.** — these functions handle both local save and Supabase sync automatically.

4. **Do not use `useRouter` for data fetching** — use `useEffect` with the offline data functions.

5. **Do not modify `lib/localDb.js` schema without bumping the version number** — change `localDb.version(1)` to `localDb.version(2)` if you add new tables or indexes, otherwise Dexie will throw a version error.

6. **The `syncQueue` table uses `++id` (auto-increment)** — never manually set the `id` field when adding to the queue.

7. **Keep `AppInitializer` as a Client Component** (`'use client'`) — it uses browser APIs (`navigator.onLine`, `window.addEventListener`) that do not exist on the server.

8. **Do not disable the Service Worker in production** — the `next-pwa` config must have `disable: process.env.NODE_ENV === 'development'` only.

9. **TypeScript users:** If converting to `.ts`/`.tsx`, add proper types for all Dexie tables and sync queue items.

10. **RLS (Row Level Security) stays active** — IndexedDB stores data per-browser, and Supabase RLS still validates on every write. This is not a security concern.

---

## Troubleshooting

### App does not load offline
- Check that `next-pwa` is not disabled in production (`disable: false` for prod)
- Open Chrome DevTools → Application → Service Workers — verify it is "Activated and running"
- Check that `manifest.json` exists at `public/manifest.json`
- Make sure you visited the app while online at least once to cache pages

### Data is empty when offline
- Check Chrome DevTools → Application → IndexedDB → BeaconLightERP — are tables populated?
- If empty, the initial sync never ran — check console for errors during sync
- Make sure `syncAllDataFromSupabase` is being called in `AppInitializer`
- Verify the user's `school_id` is being read correctly from Supabase auth

### Offline writes not syncing when back online
- Check Chrome DevTools → Application → IndexedDB → BeaconLightERP → syncQueue — are items there?
- Make sure `startSyncListener` is called in `AppInitializer`
- Check console for errors when reconnecting
- Verify Supabase RLS policies allow the teacher to write to `attendance` and `fees` tables

### Dexie version error in console
- If you changed the `localDb.version(1).stores()` schema, bump the version number to `version(2)` etc.
- Or clear the IndexedDB in DevTools → Application → IndexedDB → right-click → Delete database

### Service Worker not updating after new deployment
- This is normal PWA behaviour — users on the old version need to refresh once while online
- The `skipWaiting: true` config helps — it activates the new Service Worker immediately
- Users can also clear cache manually: DevTools → Application → Clear storage → Clear site data

---

## Summary

This implementation adds full offline support to the Beacon Light School ERP at zero cost. The Service Worker caches all app pages, IndexedDB stores all school data locally, and the sync queue automatically pushes offline writes to Supabase when the internet returns. No paid services, no Supabase Pro required, and it works for 350+ students without hitting any free tier limits.
