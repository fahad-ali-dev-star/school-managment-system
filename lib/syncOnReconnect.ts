// lib/syncOnReconnect.ts
// Listens for internet reconnection and auto-processes the Dexie sync queue
// Also re-pulls fresh data from Supabase after reconnecting

import { processSyncQueue, cleanSyncedQueue } from './syncQueue'
import { syncAllDataFromSupabase } from './offlineData'

let isListening = false
let schoolIdRef: string | null = null

export function startSyncListener(schoolId: string): void {
  if (typeof window === 'undefined') return

  // Prevent duplicate listeners (e.g. React StrictMode double-mount)
  if (isListening) return
  isListening = true
  schoolIdRef = schoolId

  window.addEventListener('online',  handleReconnect)
  window.addEventListener('offline', handleDisconnect)

  console.log('[SyncListener] Started — watching for connectivity changes')
}

export function stopSyncListener(): void {
  if (typeof window === 'undefined') return
  window.removeEventListener('online',  handleReconnect)
  window.removeEventListener('offline', handleDisconnect)
  isListening = false
  console.log('[SyncListener] Stopped')
}

async function handleReconnect(): Promise<void> {
  console.log('[SyncListener] Internet restored — starting sync...')

  // 1. Push all queued offline writes to Supabase
  const result = await processSyncQueue()

  // 2. Pull fresh data from Supabase into IndexedDB
  if (schoolIdRef) {
    await syncAllDataFromSupabase(schoolIdRef)
  }

  // 3. Clean up old synced records (housekeeping)
  await cleanSyncedQueue()

  // 4. Dispatch custom event so UI components can react (e.g. show banner)
  window.dispatchEvent(new CustomEvent('sms:synced', {
    detail: { ...result }
  }))
}

function handleDisconnect(): void {
  console.log('[SyncListener] Internet lost — app continues working offline via IndexedDB')
  window.dispatchEvent(new CustomEvent('sms:offline'))
}
