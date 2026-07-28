-- ============================================================
-- Holiday Management Module - Supabase SQL Migration
-- Run this in your Supabase SQL Editor (Dashboard > SQL Editor)
-- ============================================================

-- 1. HOLIDAYS TABLE
-- Stores school holidays and closures
CREATE TABLE IF NOT EXISTS holidays (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  school_id   UUID REFERENCES schools(id) ON DELETE CASCADE NOT NULL,
  title       TEXT NOT NULL,
  date        DATE NOT NULL,
  end_date    DATE,                    -- For multi-day holidays (optional)
  type        TEXT DEFAULT 'national'  -- national | school | exam_break | summer | winter
              CHECK (type IN ('national', 'school', 'exam_break', 'summer', 'winter')),
  description TEXT,
  created_at  TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Index for fast queries by school and date
CREATE INDEX IF NOT EXISTS idx_holidays_school_date ON holidays (school_id, date);

-- RLS Policies for holidays
ALTER TABLE holidays ENABLE ROW LEVEL SECURITY;

-- All authenticated users in the same school can view holidays
CREATE POLICY "School members can view holidays"
  ON holidays FOR SELECT
  USING (
    school_id IN (
      SELECT school_id FROM users WHERE id = auth.uid()
    )
  );

-- Only admins/principals can insert holidays
CREATE POLICY "Admins can insert holidays"
  ON holidays FOR INSERT
  WITH CHECK (
    school_id IN (
      SELECT school_id FROM users
      WHERE id = auth.uid() AND role IN ('admin', 'principal')
    )
  );

-- Only admins/principals can update holidays
CREATE POLICY "Admins can update holidays"
  ON holidays FOR UPDATE
  USING (
    school_id IN (
      SELECT school_id FROM users
      WHERE id = auth.uid() AND role IN ('admin', 'principal')
    )
  );

-- Only admins/principals can delete holidays
CREATE POLICY "Admins can delete holidays"
  ON holidays FOR DELETE
  USING (
    school_id IN (
      SELECT school_id FROM users
      WHERE id = auth.uid() AND role IN ('admin', 'principal')
    )
  );

-- ============================================================

-- 2. HOLIDAY HOMEWORK TABLE
-- Teachers assign homework to classes during holidays
CREATE TABLE IF NOT EXISTS holiday_homework (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  school_id    UUID REFERENCES schools(id) ON DELETE CASCADE NOT NULL,
  teacher_id   UUID REFERENCES users(id) ON DELETE SET NULL,
  class_name   TEXT NOT NULL,
  subject      TEXT NOT NULL,
  title        TEXT NOT NULL,
  description  TEXT,
  due_date     DATE NOT NULL,
  attachments  TEXT[],               -- Array of URLs
  created_at   TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Index for fast queries by school and class
CREATE INDEX IF NOT EXISTS idx_holiday_homework_school_class ON holiday_homework (school_id, class_name);
CREATE INDEX IF NOT EXISTS idx_holiday_homework_teacher ON holiday_homework (teacher_id);

-- RLS Policies for holiday_homework
ALTER TABLE holiday_homework ENABLE ROW LEVEL SECURITY;

-- All school members can view homework
CREATE POLICY "School members can view holiday homework"
  ON holiday_homework FOR SELECT
  USING (
    school_id IN (
      SELECT school_id FROM users WHERE id = auth.uid()
    )
  );

-- Teachers and admins can insert homework
CREATE POLICY "Teachers and admins can insert holiday homework"
  ON holiday_homework FOR INSERT
  WITH CHECK (
    school_id IN (
      SELECT school_id FROM users
      WHERE id = auth.uid() AND role IN ('admin', 'principal', 'teacher')
    )
  );

-- Teachers and admins can update homework
CREATE POLICY "Teachers and admins can update holiday homework"
  ON holiday_homework FOR UPDATE
  USING (
    school_id IN (
      SELECT school_id FROM users
      WHERE id = auth.uid() AND role IN ('admin', 'principal', 'teacher')
    )
  );

-- Teachers and admins can delete homework
CREATE POLICY "Teachers and admins can delete holiday homework"
  ON holiday_homework FOR DELETE
  USING (
    school_id IN (
      SELECT school_id FROM users
      WHERE id = auth.uid() AND role IN ('admin', 'principal', 'teacher')
    )
  );

-- ============================================================

-- 3. HOMEWORK SUBMISSIONS TABLE
-- Students' submission records for holiday homework
CREATE TABLE IF NOT EXISTS homework_submissions (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  homework_id  UUID REFERENCES holiday_homework(id) ON DELETE CASCADE NOT NULL,
  student_id   UUID REFERENCES students(id) ON DELETE CASCADE NOT NULL,
  notes        TEXT,
  submitted_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  status       TEXT DEFAULT 'submitted'
               CHECK (status IN ('submitted', 'reviewed', 'late')),
  UNIQUE (homework_id, student_id)  -- One submission per student per assignment
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_submissions_homework ON homework_submissions (homework_id);
CREATE INDEX IF NOT EXISTS idx_submissions_student ON homework_submissions (student_id);

-- RLS Policies for homework_submissions
ALTER TABLE homework_submissions ENABLE ROW LEVEL SECURITY;

-- School members can view submissions
CREATE POLICY "School members can view submissions"
  ON homework_submissions FOR SELECT
  USING (
    homework_id IN (
      SELECT id FROM holiday_homework
      WHERE school_id IN (SELECT school_id FROM users WHERE id = auth.uid())
    )
  );

-- Any authenticated user can insert a submission
CREATE POLICY "Users can submit homework"
  ON homework_submissions FOR INSERT
  WITH CHECK (
    homework_id IN (
      SELECT id FROM holiday_homework
      WHERE school_id IN (SELECT school_id FROM users WHERE id = auth.uid())
    )
  );

-- Users can update their own submissions
CREATE POLICY "Users can update submissions"
  ON homework_submissions FOR UPDATE
  USING (
    homework_id IN (
      SELECT id FROM holiday_homework
      WHERE school_id IN (SELECT school_id FROM users WHERE id = auth.uid())
    )
  );

-- ============================================================

-- 4. STUDY MATERIALS TABLE
-- PDFs, videos, links, and notes uploaded by teachers
CREATE TABLE IF NOT EXISTS study_materials (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  school_id   UUID REFERENCES schools(id) ON DELETE CASCADE NOT NULL,
  teacher_id  UUID REFERENCES users(id) ON DELETE SET NULL,
  class_name  TEXT NOT NULL,
  subject     TEXT NOT NULL,
  title       TEXT NOT NULL,
  type        TEXT DEFAULT 'pdf'
              CHECK (type IN ('pdf', 'video', 'link', 'note')),
  url         TEXT,        -- For pdf, video, link types
  content     TEXT,        -- For note type (inline text content)
  created_at  TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Index for fast queries by school and class
CREATE INDEX IF NOT EXISTS idx_study_materials_school_class ON study_materials (school_id, class_name);
CREATE INDEX IF NOT EXISTS idx_study_materials_teacher ON study_materials (teacher_id);

-- RLS Policies for study_materials
ALTER TABLE study_materials ENABLE ROW LEVEL SECURITY;

-- All school members can view materials
CREATE POLICY "School members can view study materials"
  ON study_materials FOR SELECT
  USING (
    school_id IN (
      SELECT school_id FROM users WHERE id = auth.uid()
    )
  );

-- Teachers and admins can insert materials
CREATE POLICY "Teachers and admins can insert study materials"
  ON study_materials FOR INSERT
  WITH CHECK (
    school_id IN (
      SELECT school_id FROM users
      WHERE id = auth.uid() AND role IN ('admin', 'principal', 'teacher')
    )
  );

-- Teachers and admins can update materials
CREATE POLICY "Teachers and admins can update study materials"
  ON study_materials FOR UPDATE
  USING (
    school_id IN (
      SELECT school_id FROM users
      WHERE id = auth.uid() AND role IN ('admin', 'principal', 'teacher')
    )
  );

-- Teachers and admins can delete materials
CREATE POLICY "Teachers and admins can delete study materials"
  ON study_materials FOR DELETE
  USING (
    school_id IN (
      SELECT school_id FROM users
      WHERE id = auth.uid() AND role IN ('admin', 'principal', 'teacher')
    )
  );

-- ============================================================
-- DONE! All 4 tables created with RLS policies.
-- ============================================================
