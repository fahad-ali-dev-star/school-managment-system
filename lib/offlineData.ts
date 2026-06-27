// lib/offlineData.ts
// All data read/write operations go through here.
// Reads always come from IndexedDB (fast, works offline).
// Writes go to IndexedDB immediately and queue for Supabase sync.

import { localDb } from './localDb'
import { createClient } from './supabase/client'

// ─────────────────────────────────────────────────────────────────────────────
// SYNC — Pull latest data from Supabase into IndexedDB
// Call this once on app load when online
// ─────────────────────────────────────────────────────────────────────────────

export async function syncAllDataFromSupabase(schoolId: string): Promise<void> {
  if (typeof window === 'undefined') return
  if (!navigator.onLine) {
    console.log('[OfflineData] Offline — skipping initial sync, using cached IndexedDB data')
    return
  }

  const supabase = createClient()

  try {
    console.log('[OfflineData] Syncing from Supabase into IndexedDB...')

    const [students, attendance, fees, classes, teachers] = await Promise.all([
      supabase.from('students').select('*').eq('school_id', schoolId).eq('is_active', true),
      supabase.from('attendance').select('*').eq('school_id', schoolId),
      supabase.from('fees').select('*').eq('school_id', schoolId),
      supabase.from('classes').select('*').eq('school_id', schoolId),
      supabase.from('users').select('*').eq('school_id', schoolId).eq('role', 'teacher'),
    ])

    // bulkPut: insert or update (idempotent — safe to run multiple times)
    if (students.data?.length)   await localDb.students.bulkPut(students.data)
    if (attendance.data?.length) await localDb.attendance.bulkPut(attendance.data)
    if (fees.data?.length)       await localDb.fees.bulkPut(fees.data)
    if (classes.data?.length)    await localDb.classes.bulkPut(classes.data)
    if (teachers.data?.length)   await localDb.teachers.bulkPut(teachers.data)

    console.log('[OfflineData] Sync complete — all data available offline ✓')
  } catch (err) {
    console.error('[OfflineData] Sync failed:', err)
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// READ OPERATIONS — Always from IndexedDB (works offline)
// ─────────────────────────────────────────────────────────────────────────────

export async function getStudents(schoolId: string) {
  return localDb.students
    .where('school_id').equals(schoolId)
    .filter(s => s.is_active !== false)
    .toArray()
}

export async function getStudentsByClass(schoolId: string, className: string) {
  return localDb.students
    .where('school_id').equals(schoolId)
    .filter(s => s.class_name === className && s.is_active !== false)
    .toArray()
}

export async function getAttendanceByDate(schoolId: string, date: string) {
  return localDb.attendance
    .where('school_id').equals(schoolId)
    .filter(a => a.date === date)
    .toArray()
}

export async function getAttendanceByStudent(studentId: string) {
  return localDb.attendance
    .where('student_id').equals(studentId)
    .toArray()
}

export async function getFees(schoolId: string) {
  return localDb.fees
    .where('school_id').equals(schoolId)
    .toArray()
}

export async function getFeesByStudent(studentId: string) {
  return localDb.fees
    .where('student_id').equals(studentId)
    .toArray()
}

export async function getClasses(schoolId: string) {
  return localDb.classes
    .where('school_id').equals(schoolId)
    .filter(c => c.is_active !== false)
    .toArray()
}

export async function getTeachers(schoolId: string) {
  return localDb.teachers
    .where('school_id').equals(schoolId)
    .toArray()
}

// ─────────────────────────────────────────────────────────────────────────────
// WRITE OPERATIONS — Save locally first, then queue for Supabase
// ─────────────────────────────────────────────────────────────────────────────

export async function saveAttendance(record: any): Promise<void> {
  // Always save locally first (instant, works offline)
  await localDb.attendance.put(record)

  const supabase = createClient()

  if (navigator.onLine) {
    const { error } = await supabase.from('attendance').upsert(record)
    if (error) {
      console.warn('[OfflineData] Supabase write failed, queuing:', error.message)
      await addToSyncQueue('attendance', 'upsert', record)
    }
  } else {
    await addToSyncQueue('attendance', 'upsert', record)
  }
}

export async function saveFeePayment(record: any): Promise<void> {
  await localDb.fees.put(record)

  const supabase = createClient()

  if (navigator.onLine) {
    const { error } = await supabase.from('fees').upsert(record)
    if (error) await addToSyncQueue('fees', 'upsert', record)
  } else {
    await addToSyncQueue('fees', 'upsert', record)
  }
}

export async function saveStudent(record: any): Promise<void> {
  await localDb.students.put(record)

  const supabase = createClient()

  if (navigator.onLine) {
    const { error } = await supabase.from('students').upsert(record)
    if (error) await addToSyncQueue('students', 'upsert', record)
  } else {
    await addToSyncQueue('students', 'upsert', record)
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// SYNC QUEUE HELPERS
// ─────────────────────────────────────────────────────────────────────────────

async function addToSyncQueue(tableName: string, action: 'upsert' | 'insert' | 'update' | 'delete', payload: any) {
  await localDb.syncQueue.add({
    table_name: tableName,
    action,
    payload:   JSON.stringify(payload),
    synced:    false,
    createdAt: new Date().toISOString(),
  })
  console.log(`[OfflineData] Queued offline write: ${action} on ${tableName}`)
}

export async function getPendingSyncCount(): Promise<number> {
  return localDb.syncQueue.where('synced').equals(0 as any).count()
}
