-- ==============================================================================
-- PRODUCTION MULTI-TENANT ROW LEVEL SECURITY (RLS) POLICIES
-- Run this in Supabase Dashboard → SQL Editor
-- ==============================================================================

-- 1. Helper function (SECURITY DEFINER to prevent infinite recursion on users table)
CREATE OR REPLACE FUNCTION public.get_user_school_id()
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT school_id FROM public.users WHERE id = auth.uid() LIMIT 1;
$$;

-- 2. Enable RLS on all tables
ALTER TABLE IF EXISTS public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.schools ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.fees ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.teachers ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.exams ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.marks ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.leave_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.notification_logs ENABLE ROW LEVEL SECURITY;

-- 3. Drop previous policies to avoid conflicts
DROP POLICY IF EXISTS "Users can view users in same school" ON public.users;
DROP POLICY IF EXISTS "Users can view own profile" ON public.users;
DROP POLICY IF EXISTS "Users can view own profile and school users" ON public.users;
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
DROP POLICY IF EXISTS "Users can view own school" ON public.schools;
DROP POLICY IF EXISTS "School members can view students" ON public.students;
DROP POLICY IF EXISTS "Admins and teachers can manage students" ON public.students;
DROP POLICY IF EXISTS "School members can manage students" ON public.students;
DROP POLICY IF EXISTS "School members can view fees" ON public.fees;
DROP POLICY IF EXISTS "Admins can manage fees" ON public.fees;
DROP POLICY IF EXISTS "School members can manage fees" ON public.fees;
DROP POLICY IF EXISTS "School members can view attendance" ON public.attendance;
DROP POLICY IF EXISTS "Admins and teachers can manage attendance" ON public.attendance;
DROP POLICY IF EXISTS "School members can manage attendance" ON public.attendance;
DROP POLICY IF EXISTS "School members can view classes" ON public.classes;
DROP POLICY IF EXISTS "Admins can manage classes" ON public.classes;
DROP POLICY IF EXISTS "School members can manage classes" ON public.classes;
DROP POLICY IF EXISTS "School members can view teachers" ON public.teachers;
DROP POLICY IF EXISTS "School members can manage teachers" ON public.teachers;
DROP POLICY IF EXISTS "School members can view exams" ON public.exams;
DROP POLICY IF EXISTS "School members can manage exams" ON public.exams;
DROP POLICY IF EXISTS "School members can view marks" ON public.marks;
DROP POLICY IF EXISTS "Teachers and admins can manage marks" ON public.marks;
DROP POLICY IF EXISTS "School members can manage marks" ON public.marks;
DROP POLICY IF EXISTS "School members can view leaves" ON public.leave_applications;
DROP POLICY IF EXISTS "Users can insert leaves in their school" ON public.leave_applications;
DROP POLICY IF EXISTS "School members can insert leaves" ON public.leave_applications;
DROP POLICY IF EXISTS "School members can view logs" ON public.notification_logs;
DROP POLICY IF EXISTS "School members can insert logs" ON public.notification_logs;

-- 4. Apply clean non-recursive policies

-- Users & Schools
CREATE POLICY "Users can view own profile and school users"
  ON public.users FOR SELECT
  USING (id = auth.uid() OR school_id = public.get_user_school_id());

CREATE POLICY "Users can update own profile"
  ON public.users FOR UPDATE
  USING (id = auth.uid());

CREATE POLICY "Users can view own school"
  ON public.schools FOR SELECT
  USING (id = public.get_user_school_id());

-- Students
CREATE POLICY "School members can view students"
  ON public.students FOR SELECT
  USING (school_id = public.get_user_school_id());

CREATE POLICY "School members can manage students"
  ON public.students FOR ALL
  USING (school_id = public.get_user_school_id());

-- Fees
CREATE POLICY "School members can view fees"
  ON public.fees FOR SELECT
  USING (school_id = public.get_user_school_id());

CREATE POLICY "School members can manage fees"
  ON public.fees FOR ALL
  USING (school_id = public.get_user_school_id());

-- Attendance
CREATE POLICY "School members can view attendance"
  ON public.attendance FOR SELECT
  USING (school_id = public.get_user_school_id());

CREATE POLICY "School members can manage attendance"
  ON public.attendance FOR ALL
  USING (school_id = public.get_user_school_id());

-- Classes
CREATE POLICY "School members can view classes"
  ON public.classes FOR SELECT
  USING (school_id = public.get_user_school_id());

CREATE POLICY "School members can manage classes"
  ON public.classes FOR ALL
  USING (school_id = public.get_user_school_id());

-- Teachers
CREATE POLICY "School members can view teachers"
  ON public.teachers FOR SELECT
  USING (school_id = public.get_user_school_id());

CREATE POLICY "School members can manage teachers"
  ON public.teachers FOR ALL
  USING (school_id = public.get_user_school_id());

-- Exams & Marks
CREATE POLICY "School members can view exams"
  ON public.exams FOR SELECT
  USING (school_id = public.get_user_school_id());

CREATE POLICY "School members can manage exams"
  ON public.exams FOR ALL
  USING (school_id = public.get_user_school_id());

-- Leaves
CREATE POLICY "School members can view leaves"
  ON public.leave_applications FOR SELECT
  USING (school_id = public.get_user_school_id());

CREATE POLICY "School members can insert leaves"
  ON public.leave_applications FOR INSERT
  WITH CHECK (school_id = public.get_user_school_id());

-- Notification Logs
CREATE POLICY "School members can view logs"
  ON public.notification_logs FOR SELECT
  USING (school_id = public.get_user_school_id());

CREATE POLICY "School members can insert logs"
  ON public.notification_logs FOR INSERT
  WITH CHECK (school_id = public.get_user_school_id());
