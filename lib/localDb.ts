// lib/localDb.ts
// Local IndexedDB database using Dexie.js
// Lives entirely in the browser — no server needed
// Stores: students, attendance, fees, classes, teachers, and a syncQueue for offline writes

import Dexie, { type Table } from 'dexie'

// ── Type definitions ────────────────────────────────────────────────────────

export interface LocalStudent {
  id: string
  full_name: string
  roll_number: string
  class_name: string
  section?: string
  school_id: string
  fee_status?: string
  is_active?: boolean
  [key: string]: any
}

export interface LocalAttendance {
  id?: string
  student_id: string
  teacher_id?: string
  school_id: string
  date: string
  status: 'present' | 'absent' | 'late' | 'leave'
  [key: string]: any
}

export interface LocalFee {
  id: string
  student_id: string
  school_id: string
  amount: number
  paid: boolean
  paid_at?: string
  due_date?: string
  created_at?: string
  [key: string]: any
}

export interface LocalClass {
  id: string
  name: string
  section?: string
  school_id: string
  teacher_id?: string
  is_active?: boolean
  [key: string]: any
}

export interface LocalTeacher {
  id: string
  full_name: string
  email?: string
  school_id: string
  [key: string]: any
}

export interface SyncQueueItem {
  id?: number          // auto-increment — never set manually
  table_name: string
  action: 'upsert' | 'insert' | 'update' | 'delete'
  payload: string      // JSON stringified
  synced: boolean
  createdAt: string
}

// ── Dexie database class ────────────────────────────────────────────────────

class SchoolManagementDB extends Dexie {
  students!:   Table<LocalStudent>
  attendance!: Table<LocalAttendance>
  fees!:       Table<LocalFee>
  classes!:    Table<LocalClass>
  teachers!:   Table<LocalTeacher>
  syncQueue!:  Table<SyncQueueItem>

  constructor() {
    super('SchoolManagementERP')

    this.version(1).stores({
      // Format: 'primaryKey, indexedField1, indexedField2, ...'
      students:   'id, full_name, class_name, school_id, roll_number, is_active',
      attendance: '[student_id+date], student_id, date, school_id, status',
      fees:       'id, student_id, school_id, paid, due_date',
      classes:    'id, name, school_id, is_active',
      teachers:   'id, full_name, school_id, email',

      // ++id = auto-increment primary key — never set manually
      syncQueue:  '++id, table_name, action, synced, createdAt',
    })
  }
}

export const localDb = new SchoolManagementDB()

export default localDb
