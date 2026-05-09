export type UserRole = 'principal' | 'teacher' | 'admin' | 'parent'

export interface School {
  id: string; name: string; address: string; phone: string; logo_url?: string; created_at: string
}
export interface AuthUser {
  id: string; school_id: string; full_name: string; email: string; role: UserRole; school_name: string
}
export interface Student {
  id: string; school_id: string; roll_number: string; full_name: string
  class_name: string; section: string; date_of_birth?: string
  gender: 'male' | 'female' | 'other'; parent_name: string; parent_phone: string
  parent_email?: string; address?: string; photo_url?: string
  fee_status: 'paid' | 'pending' | 'overdue'; is_active: boolean
  admission_date: string; created_at: string
}
export interface AttendanceRecord {
  id: string; school_id: string; student_id: string; teacher_id: string
  date: string; status: 'present' | 'absent' | 'late' | 'leave'
  notes?: string; created_at: string; student?: Student
}
export interface FeeRecord {
  id: string; school_id: string; student_id: string; amount: number
  fee_type: 'monthly' | 'admission' | 'exam' | 'other'; month?: string
  due_date: string; paid_date?: string; status: 'paid' | 'pending' | 'overdue'
  payment_method?: 'cash' | 'bank' | 'jazzcash' | 'easypaisa'
  receipt_number?: string; notes?: string; created_at: string; student?: Student
}

export interface Class {
  id: string
  school_id: string
  name: string
  section: string
  class_teacher?: string
  capacity: number
  description?: string
  is_active: boolean
  created_at: string
  student_count?: number
}

export interface Teacher {
  id: string
  school_id: string
  full_name: string
  email?: string
  phone?: string
  employee_id?: string
  qualification?: string
  subject?: string
  class_assigned?: string
  experience_years: number
  gender?: 'male' | 'female' | 'other'
  join_date?: string
  salary?: number
  is_active: boolean
  created_at: string
}

export interface Exam {
  id: string
  school_id: string
  title: string
  exam_type: 'midterm' | 'final' | 'unit' | 'monthly' | 'other'
  class_name: string
  section: string
  total_marks: number
  passing_marks: number
  exam_date: string
  status: 'upcoming' | 'ongoing' | 'completed' | 'published'
  description?: string
  created_at: string
  subjects?: Subject[]
}

export interface Subject {
  id: string
  school_id: string
  exam_id: string
  name: string
  total_marks: number
  passing_marks: number
  created_at: string
}

export interface Mark {
  id: string
  school_id: string
  exam_id: string
  subject_id: string
  student_id: string
  marks_obtained: number
  grade?: string
  remarks?: string
  created_at: string
  student?: Student
  subject?: Subject
}

export interface LeaveType {
  id: string
  school_id: string
  name: string
  max_days: number
  color: string
  description?: string
  created_at: string
}

export interface LeaveApplication {
  id: string
  school_id: string
  student_id: string
  leave_type_id: string
  from_date: string
  to_date: string
  total_days: number
  reason: string
  status: 'pending' | 'approved' | 'rejected' | 'cancelled'
  reviewed_by?: string
  reviewed_at?: string
  remarks?: string
  created_at: string
  student?: { full_name: string; roll_number: string; class_name: string; section: string }
  leave_type?: LeaveType
}

export interface LeaveBalance {
  id: string
  school_id: string
  student_id: string
  leave_type_id: string
  academic_year: string
  total_allowed: number
  used_days: number
  leave_type?: LeaveType
}

export interface NotificationLog {
  id: string
  school_id: string
  student_id?: string
  type: 'attendance' | 'fee' | 'exam' | 'leave' | 'announcement' | 'custom'
  channel: 'whatsapp' | 'sms' | 'both'
  recipient: string
  message: string
  status: 'pending' | 'sent' | 'failed'
  provider?: string
  error_msg?: string
  sent_at?: string
  created_at: string
  student?: { full_name: string; roll_number: string; class_name: string }
}

export interface NotificationTemplate {
  id: string
  school_id: string
  type: string
  name: string
  message: string
  is_active: boolean
  created_at: string
}
