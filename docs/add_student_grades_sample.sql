-- ====================================================================
-- Student Companion - Database Maintenance Queries
-- ====================================================================
-- This file contains cleaned and organized queries for:
-- 1. Setting up test data
-- 2. Inserting student grades
-- 3. Managing courses and timetables
-- 4. Utility queries for data verification
-- ====================================================================


-- ====================================================================
-- SECTION 1: SETUP COURSES
-- ====================================================================
-- Insert or update courses with code, title, and unit value

insert into public.courses (course_code, course_title, units, level, department)
values 
  ('CSC 311', 'Data Structures', 3, '300', 'Computer Science'),
  ('CSC 312', 'Algorithms', 3, '300', 'Computer Science'),
  ('CSC 314', 'Database Systems', 4, '300', 'Computer Science'),
  ('CSC 315', 'Operating Systems', 3, '300', 'Computer Science'),
  ('CSC 316', 'Web Development', 3, '300', 'Computer Science'),
  ('CSC 318', 'Software Engineering', 3, '300', 'Computer Science'),
  ('GST 312', 'General Studies', 2, '300', 'General Studies')
on conflict (course_code) do nothing;


-- ====================================================================
-- SECTION 2: INSERT STUDENT GRADES BY EMAIL
-- ====================================================================
-- Replace 'student@example.com' with actual student email
-- Adjust grades, course codes, and semester as needed

insert into public.results (
  student_id,
  course_id,
  grade,
  grade_point,
  semester,
  session_label
)
select
  p.id as student_id,
  c.id as course_id,
  v.grade,
  v.grade_point,
  'First Semester' as semester,
  '2025/2026' as session_label
from public.profiles p
join (
  values
    ('CSC 311', 'A', 5),
    ('CSC 314', 'B', 4),
    ('CSC 315', 'B', 4),
    ('CSC 316', 'A', 5),
    ('GST 312', 'C', 3)
) as v(course_code, grade, grade_point)
  on true
join public.courses c
  on c.course_code = v.course_code
where lower(p.email) = lower('student@example.com')
on conflict (student_id, course_id, semester, session_label) do update
set
  grade = excluded.grade,
  grade_point = excluded.grade_point,
  updated_at = now();


-- ====================================================================
-- SECTION 3: INSERT STUDENT GRADES BY REGISTRATION NUMBER
-- ====================================================================
-- Replace 'CSC/23/014' with actual registration number
-- Adjust grades and course codes as needed

insert into public.results (
  student_id,
  course_id,
  grade,
  grade_point,
  semester,
  session_label
)
select
  p.id as student_id,
  c.id as course_id,
  v.grade,
  v.grade_point,
  'Second Semester' as semester,
  '2025/2026' as session_label
from public.profiles p
join (
  values
    ('CSC 312', 'A', 5),
    ('CSC 318', 'B', 4)
) as v(course_code, grade, grade_point)
  on true
join public.courses c
  on c.course_code = v.course_code
where upper(p.reg_number) = upper('CSC/23/014')
on conflict (student_id, course_id, semester, session_label) do update
set
  grade = excluded.grade,
  grade_point = excluded.grade_point,
  updated_at = now();


-- ====================================================================
-- SECTION 4: SETUP TIMETABLE / COURSE SCHEDULES
-- ====================================================================
-- Create or update course schedules (lectures, practicals, tutorials)
-- Days: Monday, Tuesday, Wednesday, Thursday, Friday
-- Start times in 24-hour format (e.g., '08:00', '14:30')

insert into public.course_schedules (course_id, day, start_time, end_time, venue, session_label)
select
  c.id,
  v.day,
  v.start_time,
  v.end_time,
  v.venue,
  '2025/2026' as session_label
from public.courses c
join (
  values
    ('CSC 311', 'Monday', '08:00', '09:30', 'Room 101'),
    ('CSC 311', 'Wednesday', '10:00', '11:30', 'Room 101'),
    ('CSC 312', 'Tuesday', '08:00', '09:30', 'Lab 205'),
    ('CSC 312', 'Thursday', '14:00', '16:00', 'Lab 205'),
    ('CSC 314', 'Monday', '10:00', '12:00', 'Room 201'),
    ('CSC 314', 'Friday', '10:00', '12:00', 'Room 201'),
    ('CSC 315', 'Wednesday', '14:00', '15:30', 'Room 102'),
    ('CSC 316', 'Tuesday', '10:00', '12:00', 'Lab 101'),
    ('CSC 318', 'Thursday', '10:00', '11:30', 'Room 301')
) as v(course_code, day, start_time, end_time, venue)
  on c.course_code = v.course_code
on conflict (course_id, day, start_time, session_label) do nothing;


-- ====================================================================
-- SECTION 5: UTILITY QUERIES - VIEW/VERIFY DATA
-- ====================================================================

-- View all courses
-- select id, course_code, course_title, units, level from public.courses;

-- View all student grades
-- select p.email, p.reg_number, c.course_code, r.grade, r.semester, r.session_label
-- from public.results r
-- join public.profiles p on p.id = r.student_id
-- join public.courses c on c.id = r.course_id
-- order by p.email, r.session_label, r.semester;

-- View student GPA for a specific session/semester
-- select p.email, r.semester, r.session_label, 
--   avg(r.grade_point) as gpa,
--   sum(c.units * r.grade_point) / sum(c.units) as cgpa
-- from public.results r
-- join public.profiles p on p.id = r.student_id
-- join public.courses c on c.id = r.course_id
-- where lower(p.email) = lower('student@example.com')
-- group by p.email, r.semester, r.session_label;

-- View timetable for a course
-- select c.course_code, c.course_title, cs.day, cs.start_time, cs.end_time, cs.venue
-- from public.course_schedules cs
-- join public.courses c on c.id = cs.course_id
-- where c.course_code = 'CSC 311'
-- order by cs.day, cs.start_time;
