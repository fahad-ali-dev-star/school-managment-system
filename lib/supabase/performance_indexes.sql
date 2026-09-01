-- ==============================================================================
-- DATABASE PERFORMANCE OPTIMIZATION INDEXES
-- Run these in Supabase Dashboard -> SQL Editor to accelerate all multi-tenant queries
-- ==============================================================================

-- 1. Students table (filters by school, active status, class & roll number)
CREATE INDEX IF NOT EXISTS idx_students_school_active 
  ON public.students(school_id, is_active);

CREATE INDEX IF NOT EXISTS idx_students_school_class 
  ON public.students(school_id, class_name, section);

CREATE INDEX IF NOT EXISTS idx_students_parent_email
  ON public.students(school_id, parent_email);

-- 2. Attendance table (filters by date ranges and student lookups)
CREATE INDEX IF NOT EXISTS idx_attendance_school_date 
  ON public.attendance(school_id, date DESC);

CREATE INDEX IF NOT EXISTS idx_attendance_student_date 
  ON public.attendance(student_id, date DESC);

-- 3. Fees table (filters by month, status, student)
CREATE INDEX IF NOT EXISTS idx_fees_school_status 
  ON public.fees(school_id, status);

CREATE INDEX IF NOT EXISTS idx_fees_student_month 
  ON public.fees(student_id, month);

-- 4. Users & Teachers table (auth profile lookups & class assignments)
CREATE INDEX IF NOT EXISTS idx_users_school_role 
  ON public.users(school_id, role);

CREATE INDEX IF NOT EXISTS idx_teachers_school_email 
  ON public.teachers(school_id, email);

-- 5. Exams & Marks (report card generation & grading)
CREATE INDEX IF NOT EXISTS idx_exams_school_date 
  ON public.exams(school_id, exam_date DESC);

CREATE INDEX IF NOT EXISTS idx_marks_student_exam 
  ON public.marks(student_id, exam_id);

CREATE INDEX IF NOT EXISTS idx_marks_school_exam 
  ON public.marks(school_id, exam_id);

-- 6. Leave Applications & Notification Logs
CREATE INDEX IF NOT EXISTS idx_leaves_school_status 
  ON public.leave_applications(school_id, status);

CREATE INDEX IF NOT EXISTS idx_notifs_school_created 
  ON public.notification_logs(school_id, created_at DESC);
