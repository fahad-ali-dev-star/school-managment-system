-- ============================================================
-- SEED DEMO EXAMS & MARKS
-- Run this in Supabase Dashboard → SQL Editor
-- ============================================================

-- Insert demo exams
INSERT INTO exams (school_id, title, exam_type, class_name, section, total_marks, passing_marks, exam_date, status)
VALUES
  ('aaaaaaaa-0000-0000-0000-000000000001','Mid Term Exam 2026','midterm','Grade 5','A',500,200,'2026-03-15','published'),
  ('aaaaaaaa-0000-0000-0000-000000000001','Mid Term Exam 2026','midterm','Grade 6','A',500,200,'2026-03-16','completed'),
  ('aaaaaaaa-0000-0000-0000-000000000001','Final Term Exam 2026','final','Grade 5','A',600,240,'2026-05-20','upcoming'),
  ('aaaaaaaa-0000-0000-0000-000000000001','Unit Test - April','unit','Grade 7','A',100,40,'2026-04-10','completed')
ON CONFLICT DO NOTHING;

-- Insert subjects for Mid Term Grade 5-A
INSERT INTO subjects (school_id, exam_id, name, total_marks, passing_marks)
SELECT
  'aaaaaaaa-0000-0000-0000-000000000001',
  e.id, s.name, s.total_marks, s.passing_marks
FROM exams e
CROSS JOIN (
  VALUES
    ('English', 100, 40),
    ('Mathematics', 100, 40),
    ('Science', 100, 40),
    ('Urdu', 100, 40),
    ('Social Study', 100, 40)
) AS s(name, total_marks, passing_marks)
WHERE e.title = 'Mid Term Exam 2026'
  AND e.class_name = 'Grade 5'
  AND e.school_id = 'aaaaaaaa-0000-0000-0000-000000000001'
ON CONFLICT DO NOTHING;

-- Insert subjects for Unit Test Grade 7-A
INSERT INTO subjects (school_id, exam_id, name, total_marks, passing_marks)
SELECT
  'aaaaaaaa-0000-0000-0000-000000000001',
  e.id, 'Mathematics', 100, 40
FROM exams e
WHERE e.title = 'Unit Test - April'
  AND e.school_id = 'aaaaaaaa-0000-0000-0000-000000000001'
ON CONFLICT DO NOTHING;

-- Verify
SELECT e.title, e.class_name, e.section, e.status,
       COUNT(s.id) as subject_count
FROM exams e
LEFT JOIN subjects s ON s.exam_id = e.id
WHERE e.school_id = 'aaaaaaaa-0000-0000-0000-000000000001'
GROUP BY e.id, e.title, e.class_name, e.section, e.status
ORDER BY e.exam_date;
