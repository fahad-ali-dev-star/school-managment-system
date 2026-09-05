-- ==============================================================================
-- PRODUCTION MULTI-TENANT ROW LEVEL SECURITY (RLS) POLICIES
-- Run this in Supabase Dashboard -> SQL Editor
-- ==============================================================================

-- 1. Helper functions (SECURITY DEFINER to prevent infinite recursion on users table)
CREATE OR REPLACE FUNCTION public.get_user_school_id()
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT school_id FROM public.users WHERE id = auth.uid() LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS text
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT role FROM public.users WHERE id = auth.uid() LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.get_user_email()
RETURNS text
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT email FROM public.users WHERE id = auth.uid() LIMIT 1;
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
DROP POLICY IF EXISTS "School staff can manage students" ON public.students;
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

-- Students: Staff view all school students; Parents only view their own registered children
CREATE POLICY "School members can view students"
  ON public.students FOR SELECT
  USING (
    school_id = public.get_user_school_id()
    AND (
      public.get_user_role() IN ('admin', 'principal', 'teacher')
      OR parent_email ILIKE public.get_user_email()
    )
  );

CREATE POLICY "School staff can manage students"
  ON public.students FOR ALL
  USING (
    school_id = public.get_user_school_id()
    AND public.get_user_role() IN ('admin', 'principal')
  );

-- Fees: Staff view all school fees; Parents only view fees for their children
CREATE POLICY "School members can view fees"
  ON public.fees FOR SELECT
  USING (
    school_id = public.get_user_school_id()
    AND (
      public.get_user_role() IN ('admin', 'principal', 'teacher')
      OR student_id IN (
        SELECT id FROM public.students
        WHERE school_id = public.get_user_school_id()
          AND parent_email ILIKE public.get_user_email()
      )
    )
  );

CREATE POLICY "School members can manage fees"
  ON public.fees FOR ALL
  USING (
    school_id = public.get_user_school_id()
    AND public.get_user_role() IN ('admin', 'principal')
  );

-- Attendance: Staff view all school attendance; Parents only view attendance for their children
CREATE POLICY "School members can view attendance"
  ON public.attendance FOR SELECT
  USING (
    school_id = public.get_user_school_id()
    AND (
      public.get_user_role() IN ('admin', 'principal', 'teacher')
      OR student_id IN (
        SELECT id FROM public.students
        WHERE school_id = public.get_user_school_id()
          AND parent_email ILIKE public.get_user_email()
      )
    )
  );

CREATE POLICY "School members can manage attendance"
  ON public.attendance FOR ALL
  USING (
    school_id = public.get_user_school_id()
    AND public.get_user_role() IN ('admin', 'principal', 'teacher')
  );

-- Classes
CREATE POLICY "School members can view classes"
  ON public.classes FOR SELECT
  USING (school_id = public.get_user_school_id());

CREATE POLICY "School members can manage classes"
  ON public.classes FOR ALL
  USING (
    school_id = public.get_user_school_id()
    AND public.get_user_role() IN ('admin', 'principal')
  );

-- Teachers
CREATE POLICY "School members can view teachers"
  ON public.teachers FOR SELECT
  USING (school_id = public.get_user_school_id());

CREATE POLICY "School members can manage teachers"
  ON public.teachers FOR ALL
  USING (
    school_id = public.get_user_school_id()
    AND public.get_user_role() IN ('admin', 'principal')
  );

-- Exams & Marks
CREATE POLICY "School members can view exams"
  ON public.exams FOR SELECT
  USING (school_id = public.get_user_school_id());

CREATE POLICY "School members can manage exams"
  ON public.exams FOR ALL
  USING (
    school_id = public.get_user_school_id()
    AND public.get_user_role() IN ('admin', 'principal', 'teacher')
  );

CREATE POLICY "School members can view marks"
  ON public.marks FOR SELECT
  USING (
    school_id = public.get_user_school_id()
    AND (
      public.get_user_role() IN ('admin', 'principal', 'teacher')
      OR student_id IN (
        SELECT id FROM public.students
        WHERE school_id = public.get_user_school_id()
          AND parent_email ILIKE public.get_user_email()
      )
    )
  );

CREATE POLICY "School members can manage marks"
  ON public.marks FOR ALL
  USING (
    school_id = public.get_user_school_id()
    AND public.get_user_role() IN ('admin', 'principal', 'teacher')
  );

-- Leaves
CREATE POLICY "School members can view leaves"
  ON public.leave_applications FOR SELECT
  USING (
    school_id = public.get_user_school_id()
    AND (
      public.get_user_role() IN ('admin', 'principal', 'teacher')
      OR student_id IN (
        SELECT id FROM public.students
        WHERE school_id = public.get_user_school_id()
          AND parent_email ILIKE public.get_user_email()
      )
    )
  );

CREATE POLICY "School members can insert leaves"
  ON public.leave_applications FOR INSERT
  WITH CHECK (school_id = public.get_user_school_id());

-- Notification Logs
CREATE POLICY "School members can view logs"
  ON public.notification_logs FOR SELECT
  USING (
    school_id = public.get_user_school_id()
    AND (
      public.get_user_role() IN ('admin', 'principal', 'teacher')
      OR recipient ILIKE public.get_user_email()
      OR student_id IN (
        SELECT id FROM public.students
        WHERE school_id = public.get_user_school_id()
          AND parent_email ILIKE public.get_user_email()
      )
    )
  );

CREATE POLICY "School members can insert logs"
  ON public.notification_logs FOR INSERT
  WITH CHECK (school_id = public.get_user_school_id());
