// lib/syncQueue.ts
// Processes the Dexie syncQueue — pushes all offline writes to Supabase
// Called automatically when internet connection is restored

import { localDb } from './localDb'
import { createClient } from './supabase/client'

export interface SyncResult {
  success: number
  failed: number
}

export async function processSyncQueue(): Promise<SyncResult> {
  // Get all unsynced items in chronological order
  const queue = await localDb.syncQueue
    .where('synced').equals(0 as any)
    .toArray()

  if (queue.length === 0) {
    console.log('[SyncQueue] Queue is empty — nothing to sync')
    return { success: 0, failed: 0 }
  }

  console.log(`[SyncQueue] Processing ${queue.length} offline change(s)...`)

  const supabase = createClient()
  let successCount = 0
  let failedCount  = 0

  for (const item of queue) {
    try {
      const payload = JSON.parse(item.payload)

      if (item.action === 'upsert') {
        const { error } = await supabase.from(item.table_name).upsert(payload)
        if (error) throw error
      } else if (item.action === 'insert') {
        const { error } = await supabase.from(item.table_name).insert(payload)
        if (error) throw error
      } else if (item.action === 'update') {
        const { error } = await supabase.from(item.table_name).update(payload).eq('id', payload.id)
        if (error) throw error
      } else if (item.action === 'delete') {
        const { error } = await supabase.from(item.table_name).delete().eq('id', payload.id)
        if (error) throw error
      }

      // Mark as synced (keep record for audit trail — do not delete)
      await localDb.syncQueue.update(item.id!, { synced: true })
      successCount++
      console.log(`[SyncQueue] ✓ Synced item #${item.id} (${item.action} on ${item.table_name})`)

    } catch (err: any) {
      console.error(`[SyncQueue] ✗ Failed to sync item #${item.id}:`, err?.message ?? err)
      failedCount++
      // Leave in queue — will retry on next reconnect
    }
  }

  console.log(`[SyncQueue] Done: ${successCount} succeeded, ${failedCount} failed`)
  return { success: successCount, failed: failedCount }
}

// Clean up old synced items older than 7 days to keep IndexedDB lean
export async function cleanSyncedQueue(): Promise<void> {
  const oneWeekAgo = new Date()
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7)

  await localDb.syncQueue
    .where('synced').equals(1 as any)
    .filter(item => new Date(item.createdAt) < oneWeekAgo)
    .delete()

  console.log('[SyncQueue] Cleaned up old synced records')
}
