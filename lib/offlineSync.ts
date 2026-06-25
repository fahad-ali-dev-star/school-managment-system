export interface SyncItem {
  id: string;
  timestamp: number;
  type: 'supabase' | 'fetch';
  target: string; // e.g. 'students' table, or '/api/classes' endpoint
  operation: 'insert' | 'update' | 'upsert' | 'delete' | 'POST' | 'PUT' | 'DELETE';
  payload?: any;
  matchKey?: string;
  matchValue?: any;
}

// Generate RFC4122 v4 compliant UUID
export function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// Check if currently offline
export function isOffline(): boolean {
  if (typeof window === 'undefined') return false;
  return !navigator.onLine;
}

// Read the offline queue from localStorage
export function getOfflineQueue(): SyncItem[] {
  if (typeof window === 'undefined') return [];
  const raw = localStorage.getItem('sms_offline_sync_queue');
  return raw ? JSON.parse(raw) : [];
}

// Save the offline queue to localStorage
export function saveOfflineQueue(queue: SyncItem[]) {
  if (typeof window === 'undefined') return;
  localStorage.setItem('sms_offline_sync_queue', JSON.stringify(queue));
  
  // Dispatch event to notify listeners (e.g., Sidebar) of queue size changes
  window.dispatchEvent(new CustomEvent('sms-queue-changed', { detail: { count: queue.length } }));
}

// Queue a mutation for offline synchronization
export function queueOfflineMutation(item: Omit<SyncItem, 'id' | 'timestamp'>): SyncItem {
  const syncItem: SyncItem = {
    ...item,
    id: generateUUID(),
    timestamp: Date.now(),
  };

  const queue = getOfflineQueue();
  queue.push(syncItem);
  saveOfflineQueue(queue);

  console.log(`[Offline Sync] Queued mutation:`, syncItem);
  return syncItem;
}

// Merge server data with the local offline queue (for UI optimistic updates)
export function getMergedOfflineState(tableNameOrUrl: string, serverData: any[]): any[] {
  if (typeof window === 'undefined') return serverData;
  const queue = getOfflineQueue();
  if (queue.length === 0) return serverData;

  let data = [...serverData];

  // Filter items targeting this table or URL
  const relevantItems = queue.filter(item => 
    item.target === tableNameOrUrl ||
    (tableNameOrUrl.startsWith('/') && item.target.startsWith(tableNameOrUrl + '/'))
  );

  relevantItems.forEach(item => {
    if (item.operation === 'insert' || item.operation === 'POST') {
      const payloads = Array.isArray(item.payload) ? item.payload : [item.payload];
      payloads.forEach(p => {
        if (!data.some(d => d.id === p.id)) {
          data.push(p);
        }
      });
    } else if (item.operation === 'update' || item.operation === 'PUT') {
      const matchValue = item.matchValue || item.payload.id;
      const matchKey = item.matchKey || 'id';
      data = data.map(d => {
        if (d[matchKey] === matchValue) {
          return { ...d, ...item.payload };
        }
        return d;
      });
    } else if (item.operation === 'upsert') {
      const payloads = Array.isArray(item.payload) ? item.payload : [item.payload];
      payloads.forEach(p => {
        const idx = data.findIndex(d => d.id === p.id);
        if (idx > -1) {
          data[idx] = { ...data[idx], ...p };
        } else {
          data.push(p);
        }
      });
    } else if (item.operation === 'delete' || item.operation === 'DELETE') {
      const matchValue = item.matchValue;
      const matchKey = item.matchKey || 'id';
      data = data.filter(d => d[matchKey] !== matchValue);
    }
  });

  // Filter out soft deleted records (is_active === false)
  return data.filter(d => d.is_active !== false);
}

// Synchronize all queued changes to the server
let isSyncing = false;
export async function syncOfflineQueue(supabase: any) {
  if (typeof window === 'undefined' || isSyncing) return;
  const queue = getOfflineQueue();
  if (queue.length === 0) return;

  isSyncing = true;
  console.log(`[Offline Sync] Syncing ${queue.length} offline changes...`);
  
  window.dispatchEvent(new CustomEvent('sms-sync-status', { detail: { syncing: true } }));

  const remainingQueue: SyncItem[] = [];

  for (const item of queue) {
    try {
      if (item.type === 'supabase') {
        const query = supabase.from(item.target);
        if (item.operation === 'insert') {
          const { error } = await query.insert(item.payload);
          if (error) throw error;
        } else if (item.operation === 'update') {
          const { error } = await query.update(item.payload).eq(item.matchKey || 'id', item.matchValue);
          if (error) throw error;
        } else if (item.operation === 'upsert') {
          const { error } = await query.upsert(item.payload);
          if (error) throw error;
        } else if (item.operation === 'delete') {
          const { error } = await query.delete().eq(item.matchKey || 'id', item.matchValue);
          if (error) throw error;
        }
      } else if (item.type === 'fetch') {
        const res = await fetch(item.target, {
          method: item.operation,
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(item.payload),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || `Request failed with status ${res.status}`);
        }
      }
      console.log(`[Offline Sync] Synced item successfully: ${item.id}`);
    } catch (err: any) {
      console.error(`[Offline Sync] Failed to sync item ${item.id}:`, err);
      remainingQueue.push(item);
    }
  }

  saveOfflineQueue(remainingQueue);
  isSyncing = false;
  
  window.dispatchEvent(new CustomEvent('sms-sync-status', { 
    detail: { syncing: false, remaining: remainingQueue.length } 
  }));
}
