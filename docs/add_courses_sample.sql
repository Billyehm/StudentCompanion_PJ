-- Student Companion course seed samples
-- File: docs/add_courses_sample.sql
--
-- Notes:
-- 1. The current public.courses table stores:
--    course_code, course_title, units, level, semester
-- 2. It does not currently store department/faculty columns.
--    In this sample, department grouping is shown with SQL comments
--    and by the course code prefix.
-- 3. All inserts use ON CONFLICT so you can rerun them safely.

begin;

-- =========================================================
-- NOTE: Routing courses by `level` and `department`
-- =========================================================
-- Current `public.courses` table (see docs/SUPABASE_SETUP.md) contains:
--   course_code, course_title, units, level, semester, created_at, updated_at
-- To route courses by department and faculty you should add two columns:
--   department text, faculty text
-- Run the following migration before using the inserts below (optional):
-- ALTER TABLE public.courses
--   ADD COLUMN department text,
--   ADD COLUMN faculty text;
-- After adding the columns, re-run or use the `INSERT` blocks below which include
-- `department` and `faculty` so courses are explicitly associated with groups.

-- =========================================================
-- COMPUTER SCIENCE (Faculty: Science and Computing)
-- Each insert block specifies `level` and `department` explicitly.
-- =========================================================

-- Computer Science - 200 Level
insert into public.courses (course_code, course_title, units, level, semester, department, faculty)
values
  ('CSC 211', 'Object-Oriented Programming I', 3, '200', 'First Semester', 'Computer Science', 'Science and Computing'),
  ('CSC 212', 'Discrete Structures', 3, '200', 'First Semester', 'Computer Science', 'Science and Computing'),
  ('CSC 213', 'Computer Organization', 2, '200', 'First Semester', 'Computer Science', 'Science and Computing'),
  ('CSC 221', 'Database Fundamentals', 3, '200', 'Second Semester', 'Computer Science', 'Science and Computing'),
  ('CSC 222', 'Web Technology I', 2, '200', 'Second Semester', 'Computer Science', 'Science and Computing')
on conflict (course_code) do update
set
  course_title = excluded.course_title,
  units = excluded.units,
  level = excluded.level,
  semester = excluded.semester,
  department = coalesce(excluded.department, public.courses.department),
  faculty = coalesce(excluded.faculty, public.courses.faculty),
  updated_at = now();

-- Computer Science - 300 Level
-- Entered from your image as a sample block.
insert into public.courses (course_code, course_title, units, level, semester, department, faculty)
values
  ('GST 312', 'Peace and Conflict Resolution', 2, '300', 'First Semester', 'General Studies', 'Science and Computing'),
  ('CYB 211', 'Cyber Security', 3, '200', 'First Semester', 'Computer Science', 'Science and Computing'),
  ('DTS 314', 'Data Management I', 3, '300', 'First Semester', 'Computer Science', 'Science and Computing'),
  ('CSC 314', 'Operating Systems', 3, '300', 'First Semester', 'Computer Science', 'Science and Computing'),
  ('CSC 311', 'Data Structures', 3, '300', 'First Semester', 'Computer Science', 'Science and Computing'),
  ('CSC 315', 'Data Communication Systems and Networks', 3, '300', 'First Semester', 'Computer Science', 'Science and Computing'),
  ('CSC 316', 'Artificial Intelligence', 3, '300', 'First Semester', 'Computer Science', 'Science and Computing'),
  ('CSC 318', 'Logic Programming with Prolog', 2, '300', 'First Semester', 'Computer Science', 'Science and Computing'),
  ('CSC 312', 'Semantics (Ontology)', 2, '300', 'First Semester', 'Computer Science', 'Science and Computing')
on conflict (course_code) do update
set
  course_title = excluded.course_title,
  units = excluded.units,
  level = excluded.level,
  semester = excluded.semester,
  department = coalesce(excluded.department, public.courses.department),
  faculty = coalesce(excluded.faculty, public.courses.faculty),
  updated_at = now();

-- Computer Science - samples for other levels
insert into public.courses (course_code, course_title, units, level, semester, department, faculty)
values
  ('CSC 101', 'Introduction to Computer Science', 3, '100', 'First Semester', 'Computer Science', 'Science and Computing'),
  ('CSC 401', 'Compiler Construction', 3, '400', 'First Semester', 'Computer Science', 'Science and Computing'),
  ('CSC 501', 'Advanced Algorithms', 3, '500', 'First Semester', 'Computer Science', 'Science and Computing')
on conflict (course_code) do update
set
  course_title = excluded.course_title,
  units = excluded.units,
  level = excluded.level,
  semester = excluded.semester,
  department = coalesce(excluded.department, public.courses.department),
  faculty = coalesce(excluded.faculty, public.courses.faculty),
  updated_at = now();

-- =========================================================
-- SCIENCE AND COMPUTING
-- =========================================================

-- Information Technology
-- Information Technology (Faculty: Science and Computing)
insert into public.courses (course_code, course_title, units, level, semester, department, faculty)
values
  ('IFT 101', 'Introduction to Information Technology', 3, '100', 'First Semester', 'Information Technology', 'Science and Computing'),
  ('IFT 201', 'Systems Analysis and Design', 3, '200', 'First Semester', 'Information Technology', 'Science and Computing'),
  ('IFT 301', 'Network Administration', 3, '300', 'First Semester', 'Information Technology', 'Science and Computing'),
  ('IFT 401', 'Enterprise Systems', 3, '400', 'First Semester', 'Information Technology', 'Science and Computing'),
  ('IFT 501', 'Cloud Computing', 3, '500', 'First Semester', 'Information Technology', 'Science and Computing')
on conflict (course_code) do update
set
  course_title = excluded.course_title,
  units = excluded.units,
  level = excluded.level,
  semester = excluded.semester,
  department = coalesce(excluded.department, public.courses.department),
  faculty = coalesce(excluded.faculty, public.courses.faculty),
  updated_at = now();

-- Software Engineering
-- Software Engineering (Faculty: Science and Computing)
insert into public.courses (course_code, course_title, units, level, semester, department, faculty)
values
  ('SEN 101', 'Introduction to Software Engineering', 3, '100', 'First Semester', 'Software Engineering', 'Science and Computing'),
  ('SEN 201', 'Requirements Engineering', 3, '200', 'First Semester', 'Software Engineering', 'Science and Computing'),
  ('SEN 301', 'Software Architecture', 3, '300', 'First Semester', 'Software Engineering', 'Science and Computing'),
  ('SEN 401', 'Software Testing and Quality Assurance', 3, '400', 'First Semester', 'Software Engineering', 'Science and Computing'),
  ('SEN 501', 'DevOps Engineering', 3, '500', 'First Semester', 'Software Engineering', 'Science and Computing')
on conflict (course_code) do update
set
  course_title = excluded.course_title,
  units = excluded.units,
  level = excluded.level,
  semester = excluded.semester,
  department = coalesce(excluded.department, public.courses.department),
  faculty = coalesce(excluded.faculty, public.courses.faculty),
  updated_at = now();

-- Mathematics
-- Mathematics (Faculty: Science and Computing)
insert into public.courses (course_code, course_title, units, level, semester, department, faculty)
values
  ('MTH 101', 'Elementary Mathematics I', 3, '100', 'First Semester', 'Mathematics', 'Science and Computing'),
  ('MTH 201', 'Linear Algebra I', 3, '200', 'First Semester', 'Mathematics', 'Science and Computing'),
  ('MTH 301', 'Real Analysis I', 3, '300', 'First Semester', 'Mathematics', 'Science and Computing'),
  ('MTH 401', 'Complex Analysis', 3, '400', 'First Semester', 'Mathematics', 'Science and Computing'),
  ('MTH 501', 'Functional Analysis', 3, '500', 'First Semester', 'Mathematics', 'Science and Computing')
on conflict (course_code) do update
set
  course_title = excluded.course_title,
  units = excluded.units,
  level = excluded.level,
  semester = excluded.semester,
  department = coalesce(excluded.department, public.courses.department),
  faculty = coalesce(excluded.faculty, public.courses.faculty),
  updated_at = now();

-- Statistics
-- Statistics (Faculty: Science and Computing)
insert into public.courses (course_code, course_title, units, level, semester, department, faculty)
values
  ('STA 101', 'Introductory Statistics', 3, '100', 'First Semester', 'Statistics', 'Science and Computing'),
  ('STA 201', 'Probability Theory I', 3, '200', 'First Semester', 'Statistics', 'Science and Computing'),
  ('STA 301', 'Statistical Inference I', 3, '300', 'First Semester', 'Statistics', 'Science and Computing'),
  ('STA 401', 'Regression Analysis', 3, '400', 'First Semester', 'Statistics', 'Science and Computing'),
  ('STA 501', 'Multivariate Analysis', 3, '500', 'First Semester', 'Statistics', 'Science and Computing')
on conflict (course_code) do update
set
  course_title = excluded.course_title,
  units = excluded.units,
  level = excluded.level,
  semester = excluded.semester,
  department = coalesce(excluded.department, public.courses.department),
  faculty = coalesce(excluded.faculty, public.courses.faculty),
  updated_at = now();

-- Physics
-- Physics (Faculty: Science and Computing)
insert into public.courses (course_code, course_title, units, level, semester, department, faculty)
values
  ('PHY 101', 'General Physics I', 3, '100', 'First Semester', 'Physics', 'Science and Computing'),
  ('PHY 201', 'Mechanics I', 3, '200', 'First Semester', 'Physics', 'Science and Computing'),
  ('PHY 301', 'Electromagnetism I', 3, '300', 'First Semester', 'Physics', 'Science and Computing'),
  ('PHY 401', 'Quantum Physics', 3, '400', 'First Semester', 'Physics', 'Science and Computing'),
  ('PHY 501', 'Advanced Solid State Physics', 3, '500', 'First Semester', 'Physics', 'Science and Computing')
on conflict (course_code) do update
set
  course_title = excluded.course_title,
  units = excluded.units,
  level = excluded.level,
  semester = excluded.semester,
  department = coalesce(excluded.department, public.courses.department),
  faculty = coalesce(excluded.faculty, public.courses.faculty),
  updated_at = now();

-- Chemistry
-- Chemistry (Faculty: Science and Computing)
insert into public.courses (course_code, course_title, units, level, semester, department, faculty)
values
  ('CHM 101', 'General Chemistry I', 3, '100', 'First Semester', 'Chemistry', 'Science and Computing'),
  ('CHM 201', 'Organic Chemistry I', 3, '200', 'First Semester', 'Chemistry', 'Science and Computing'),
  ('CHM 301', 'Physical Chemistry I', 3, '300', 'First Semester', 'Chemistry', 'Science and Computing'),
  ('CHM 401', 'Analytical Chemistry', 3, '400', 'First Semester', 'Chemistry', 'Science and Computing'),
  ('CHM 501', 'Industrial Chemistry', 3, '500', 'First Semester', 'Chemistry', 'Science and Computing')
on conflict (course_code) do update
set
  course_title = excluded.course_title,
  units = excluded.units,
  level = excluded.level,
  semester = excluded.semester,
  department = coalesce(excluded.department, public.courses.department),
  faculty = coalesce(excluded.faculty, public.courses.faculty),
  updated_at = now();

-- Biology
-- Biology (Faculty: Science and Computing)
insert into public.courses (course_code, course_title, units, level, semester, department, faculty)
values
  ('BIO 101', 'General Biology I', 3, '100', 'First Semester', 'Biology', 'Science and Computing'),
  ('BIO 201', 'Cell Biology', 3, '200', 'First Semester', 'Biology', 'Science and Computing'),
  ('BIO 301', 'Genetics', 3, '300', 'First Semester', 'Biology', 'Science and Computing'),
  ('BIO 401', 'Molecular Biology', 3, '400', 'First Semester', 'Biology', 'Science and Computing'),
  ('BIO 501', 'Advanced Ecology', 3, '500', 'First Semester', 'Biology', 'Science and Computing')
on conflict (course_code) do update
set
  course_title = excluded.course_title,
  units = excluded.units,
  level = excluded.level,
  semester = excluded.semester,
  department = coalesce(excluded.department, public.courses.department),
  faculty = coalesce(excluded.faculty, public.courses.faculty),
  updated_at = now();

-- =========================================================
-- ENGINEERING
-- =========================================================

-- Electrical Engineering
-- Electrical Engineering (Faculty: Engineering)
insert into public.courses (course_code, course_title, units, level, semester, department, faculty)
values
  ('EEE 101', 'Introduction to Electrical Engineering', 3, '100', 'First Semester', 'Electrical Engineering', 'Engineering'),
  ('EEE 201', 'Circuit Theory I', 3, '200', 'First Semester', 'Electrical Engineering', 'Engineering'),
  ('EEE 301', 'Electrical Machines I', 3, '300', 'First Semester', 'Electrical Engineering', 'Engineering'),
  ('EEE 401', 'Power Systems I', 3, '400', 'First Semester', 'Electrical Engineering', 'Engineering'),
  ('EEE 501', 'Advanced Control Systems', 3, '500', 'First Semester', 'Electrical Engineering', 'Engineering')
on conflict (course_code) do update
set
  course_title = excluded.course_title,
  units = excluded.units,
  level = excluded.level,
  semester = excluded.semester,
  department = coalesce(excluded.department, public.courses.department),
  faculty = coalesce(excluded.faculty, public.courses.faculty),
  updated_at = now();

-- Mechanical Engineering (Faculty: Engineering)
-- Department: Mechanical Engineering
insert into public.courses (course_code, course_title, units, level, semester, department, faculty)
values
  ('MEE 101', 'Introduction to Mechanical Engineering', 3, '100', 'First Semester', 'Mechanical Engineering', 'Engineering'),
  ('MEE 201', 'Engineering Thermodynamics I', 3, '200', 'First Semester', 'Mechanical Engineering', 'Engineering'),
  ('MEE 301', 'Fluid Mechanics I', 3, '300', 'First Semester', 'Mechanical Engineering', 'Engineering'),
  ('MEE 401', 'Machine Design I', 3, '400', 'First Semester', 'Mechanical Engineering', 'Engineering'),
  ('MEE 501', 'Advanced Manufacturing Systems', 3, '500', 'First Semester', 'Mechanical Engineering', 'Engineering')
on conflict (course_code) do update
set
  course_title = excluded.course_title,
  units = excluded.units,
  level = excluded.level,
  semester = excluded.semester,
  department = coalesce(excluded.department, public.courses.department),
  faculty = coalesce(excluded.faculty, public.courses.faculty),
  updated_at = now();

-- Civil Engineering (Faculty: Engineering)
-- Department: Civil Engineering
insert into public.courses (course_code, course_title, units, level, semester, department, faculty)
values
  ('CVE 101', 'Introduction to Civil Engineering', 3, '100', 'First Semester', 'Civil Engineering', 'Engineering'),
  ('CVE 201', 'Engineering Surveying', 3, '200', 'First Semester', 'Civil Engineering', 'Engineering'),
  ('CVE 301', 'Structural Analysis I', 3, '300', 'First Semester', 'Civil Engineering', 'Engineering'),
  ('CVE 401', 'Reinforced Concrete Design', 3, '400', 'First Semester', 'Civil Engineering', 'Engineering'),
  ('CVE 501', 'Transportation Engineering', 3, '500', 'First Semester', 'Civil Engineering', 'Engineering')
on conflict (course_code) do update
set
  course_title = excluded.course_title,
  units = excluded.units,
  level = excluded.level,
  semester = excluded.semester,
  department = coalesce(excluded.department, public.courses.department),
  faculty = coalesce(excluded.faculty, public.courses.faculty),
  updated_at = now();

-- Chemical Engineering (Faculty: Engineering)
-- Department: Chemical Engineering
insert into public.courses (course_code, course_title, units, level, semester, department, faculty)
values
  ('CHE 101', 'Introduction to Chemical Engineering', 3, '100', 'First Semester', 'Chemical Engineering', 'Engineering'),
  ('CHE 201', 'Material and Energy Balances', 3, '200', 'First Semester', 'Chemical Engineering', 'Engineering'),
  ('CHE 301', 'Chemical Reaction Engineering I', 3, '300', 'First Semester', 'Chemical Engineering', 'Engineering'),
  ('CHE 401', 'Process Design I', 3, '400', 'First Semester', 'Chemical Engineering', 'Engineering'),
  ('CHE 501', 'Petrochemical Technology', 3, '500', 'First Semester', 'Chemical Engineering', 'Engineering')
on conflict (course_code) do update
set
  course_title = excluded.course_title,
  units = excluded.units,
  level = excluded.level,
  semester = excluded.semester,
  department = coalesce(excluded.department, public.courses.department),
  faculty = coalesce(excluded.faculty, public.courses.faculty),
  updated_at = now();

-- =========================================================
-- SOCIAL AND MANAGEMENT SCIENCES
-- =========================================================

-- Economics
-- Economics (Faculty: Social and Management Sciences)
insert into public.courses (course_code, course_title, units, level, semester, department, faculty)
values
  ('ECO 101', 'Principles of Economics I', 3, '100', 'First Semester', 'Economics', 'Social and Management Sciences'),
  ('ECO 201', 'Microeconomics I', 3, '200', 'First Semester', 'Economics', 'Social and Management Sciences'),
  ('ECO 301', 'Macroeconomics I', 3, '300', 'First Semester', 'Economics', 'Social and Management Sciences'),
  ('ECO 401', 'Econometrics I', 3, '400', 'First Semester', 'Economics', 'Social and Management Sciences'),
  ('ECO 501', 'Development Economics', 3, '500', 'First Semester', 'Economics', 'Social and Management Sciences')
on conflict (course_code) do update
set
  course_title = excluded.course_title,
  units = excluded.units,
  level = excluded.level,
  semester = excluded.semester,
  department = coalesce(excluded.department, public.courses.department),
  faculty = coalesce(excluded.faculty, public.courses.faculty),
  updated_at = now();

-- Accounting
-- Accounting (Faculty: Social and Management Sciences)
insert into public.courses (course_code, course_title, units, level, semester, department, faculty)
values
  ('ACC 101', 'Principles of Accounting I', 3, '100', 'First Semester', 'Accounting', 'Social and Management Sciences'),
  ('ACC 201', 'Financial Accounting I', 3, '200', 'First Semester', 'Accounting', 'Social and Management Sciences'),
  ('ACC 301', 'Cost Accounting', 3, '300', 'First Semester', 'Accounting', 'Social and Management Sciences'),
  ('ACC 401', 'Auditing and Assurance', 3, '400', 'First Semester', 'Accounting', 'Social and Management Sciences'),
  ('ACC 501', 'Advanced Taxation', 3, '500', 'First Semester', 'Accounting', 'Social and Management Sciences')
on conflict (course_code) do update
set
  course_title = excluded.course_title,
  units = excluded.units,
  level = excluded.level,
  semester = excluded.semester,
  department = coalesce(excluded.department, public.courses.department),
  faculty = coalesce(excluded.faculty, public.courses.faculty),
  updated_at = now();

-- Business Administration
-- Business Administration (Faculty: Social and Management Sciences)
insert into public.courses (course_code, course_title, units, level, semester, department, faculty)
values
  ('BUS 101', 'Introduction to Business', 3, '100', 'First Semester', 'Business Administration', 'Social and Management Sciences'),
  ('BUS 201', 'Principles of Management', 3, '200', 'First Semester', 'Business Administration', 'Social and Management Sciences'),
  ('BUS 301', 'Organizational Behaviour', 3, '300', 'First Semester', 'Business Administration', 'Social and Management Sciences'),
  ('BUS 401', 'Strategic Management', 3, '400', 'First Semester', 'Business Administration', 'Social and Management Sciences'),
  ('BUS 501', 'Entrepreneurship and Innovation', 3, '500', 'First Semester', 'Business Administration', 'Social and Management Sciences')
on conflict (course_code) do update
set
  course_title = excluded.course_title,
  units = excluded.units,
  level = excluded.level,
  semester = excluded.semester,
  department = coalesce(excluded.department, public.courses.department),
  faculty = coalesce(excluded.faculty, public.courses.faculty),
  updated_at = now();

-- Political Science
-- Political Science (Faculty: Social and Management Sciences)
insert into public.courses (course_code, course_title, units, level, semester, department, faculty)
values
  ('POS 101', 'Introduction to Political Science', 3, '100', 'First Semester', 'Political Science', 'Social and Management Sciences'),
  ('POS 201', 'Comparative Politics', 3, '200', 'First Semester', 'Political Science', 'Social and Management Sciences'),
  ('POS 301', 'Public Administration', 3, '300', 'First Semester', 'Political Science', 'Social and Management Sciences'),
  ('POS 401', 'International Relations', 3, '400', 'First Semester', 'Political Science', 'Social and Management Sciences'),
  ('POS 501', 'Political Theory', 3, '500', 'First Semester', 'Political Science', 'Social and Management Sciences')
on conflict (course_code) do update
set
  course_title = excluded.course_title,
  units = excluded.units,
  level = excluded.level,
  semester = excluded.semester,
  department = coalesce(excluded.department, public.courses.department),
  faculty = coalesce(excluded.faculty, public.courses.faculty),
  updated_at = now();

-- Mass Communication
-- Mass Communication (Faculty: Social and Management Sciences)
insert into public.courses (course_code, course_title, units, level, semester, department, faculty)
values
  ('MAC 101', 'Introduction to Mass Communication', 3, '100', 'First Semester', 'Mass Communication', 'Social and Management Sciences'),
  ('MAC 201', 'News Writing and Reporting', 3, '200', 'First Semester', 'Mass Communication', 'Social and Management Sciences'),
  ('MAC 301', 'Broadcast Journalism', 3, '300', 'First Semester', 'Mass Communication', 'Social and Management Sciences'),
  ('MAC 401', 'Public Relations Practice', 3, '400', 'First Semester', 'Mass Communication', 'Social and Management Sciences'),
  ('MAC 501', 'Media Research Methods', 3, '500', 'First Semester', 'Mass Communication', 'Social and Management Sciences')
on conflict (course_code) do update
set
  course_title = excluded.course_title,
  units = excluded.units,
  level = excluded.level,
  semester = excluded.semester,
  department = coalesce(excluded.department, public.courses.department),
  faculty = coalesce(excluded.faculty, public.courses.faculty),
  updated_at = now();

-- =========================================================
-- ARTS
-- =========================================================

-- English
-- English (Faculty: Arts)
insert into public.courses (course_code, course_title, units, level, semester, department, faculty)
values
  ('ENG 101', 'Use of English I', 2, '100', 'First Semester', 'English', 'Arts'),
  ('ENG 201', 'English Phonetics', 3, '200', 'First Semester', 'English', 'Arts'),
  ('ENG 301', 'English Syntax', 3, '300', 'First Semester', 'English', 'Arts'),
  ('ENG 401', 'African Literature', 3, '400', 'First Semester', 'English', 'Arts'),
  ('ENG 501', 'Advanced Stylistics', 3, '500', 'First Semester', 'English', 'Arts')
on conflict (course_code) do update
set
  course_title = excluded.course_title,
  units = excluded.units,
  level = excluded.level,
  semester = excluded.semester,
  department = coalesce(excluded.department, public.courses.department),
  faculty = coalesce(excluded.faculty, public.courses.faculty),
  updated_at = now();

-- History
-- History (Faculty: Arts)
insert into public.courses (course_code, course_title, units, level, semester, department, faculty)
values
  ('HIS 101', 'Introduction to African History', 3, '100', 'First Semester', 'History', 'Arts'),
  ('HIS 201', 'Economic History of West Africa', 3, '200', 'First Semester', 'History', 'Arts'),
  ('HIS 301', 'Modern European History', 3, '300', 'First Semester', 'History', 'Arts'),
  ('HIS 401', 'Nigerian Political History', 3, '400', 'First Semester', 'History', 'Arts'),
  ('HIS 501', 'Historical Research Methods', 3, '500', 'First Semester', 'History', 'Arts')
on conflict (course_code) do update
set
  course_title = excluded.course_title,
  units = excluded.units,
  level = excluded.level,
  semester = excluded.semester,
  department = coalesce(excluded.department, public.courses.department),
  faculty = coalesce(excluded.faculty, public.courses.faculty),
  updated_at = now();

-- Theatre Arts
-- Theatre Arts (Faculty: Arts)
insert into public.courses (course_code, course_title, units, level, semester, department, faculty)
values
  ('THA 101', 'Introduction to Theatre Arts', 3, '100', 'First Semester', 'Theatre Arts', 'Arts'),
  ('THA 201', 'Acting Techniques I', 3, '200', 'First Semester', 'Theatre Arts', 'Arts'),
  ('THA 301', 'Directing for Stage', 3, '300', 'First Semester', 'Theatre Arts', 'Arts'),
  ('THA 401', 'Play Production', 3, '400', 'First Semester', 'Theatre Arts', 'Arts'),
  ('THA 501', 'Advanced Dramatic Theory', 3, '500', 'First Semester', 'Theatre Arts', 'Arts')
on conflict (course_code) do update
set
  course_title = excluded.course_title,
  units = excluded.units,
  level = excluded.level,
  semester = excluded.semester,
  department = coalesce(excluded.department, public.courses.department),
  faculty = coalesce(excluded.faculty, public.courses.faculty),
  updated_at = now();

-- Linguistics
-- Linguistics (Faculty: Arts)
insert into public.courses (course_code, course_title, units, level, semester, department, faculty)
values
  ('LIN 101', 'Introduction to Linguistics', 3, '100', 'First Semester', 'Linguistics', 'Arts'),
  ('LIN 201', 'Phonology I', 3, '200', 'First Semester', 'Linguistics', 'Arts'),
  ('LIN 301', 'Syntax I', 3, '300', 'First Semester', 'Linguistics', 'Arts'),
  ('LIN 401', 'Semantics and Pragmatics', 3, '400', 'First Semester', 'Linguistics', 'Arts'),
  ('LIN 501', 'Applied Linguistics', 3, '500', 'First Semester', 'Linguistics', 'Arts')
on conflict (course_code) do update
set
  course_title = excluded.course_title,
  units = excluded.units,
  level = excluded.level,
  semester = excluded.semester,
  department = coalesce(excluded.department, public.courses.department),
  faculty = coalesce(excluded.faculty, public.courses.faculty),
  updated_at = now();

-- =========================================================
-- EDUCATION
-- =========================================================

-- Educational Management
-- Educational Management (Faculty: Education)
insert into public.courses (course_code, course_title, units, level, semester, department, faculty)
values
  ('EDM 101', 'Introduction to Educational Management', 3, '100', 'First Semester', 'Educational Management', 'Education'),
  ('EDM 201', 'School Administration', 3, '200', 'First Semester', 'Educational Management', 'Education'),
  ('EDM 301', 'Educational Planning', 3, '300', 'First Semester', 'Educational Management', 'Education'),
  ('EDM 401', 'Personnel Management in Education', 3, '400', 'First Semester', 'Educational Management', 'Education'),
  ('EDM 501', 'Education Policy Analysis', 3, '500', 'First Semester', 'Educational Management', 'Education')
on conflict (course_code) do update
set
  course_title = excluded.course_title,
  units = excluded.units,
  level = excluded.level,
  semester = excluded.semester,
  department = coalesce(excluded.department, public.courses.department),
  faculty = coalesce(excluded.faculty, public.courses.faculty),
  updated_at = now();

-- Guidance and Counselling
-- Guidance and Counselling (Faculty: Education)
insert into public.courses (course_code, course_title, units, level, semester, department, faculty)
values
  ('GCE 101', 'Introduction to Guidance and Counselling', 3, '100', 'First Semester', 'Guidance and Counselling', 'Education'),
  ('GCE 201', 'Counselling Theories', 3, '200', 'First Semester', 'Guidance and Counselling', 'Education'),
  ('GCE 301', 'Career Counselling', 3, '300', 'First Semester', 'Guidance and Counselling', 'Education'),
  ('GCE 401', 'Group Counselling', 3, '400', 'First Semester', 'Guidance and Counselling', 'Education'),
  ('GCE 501', 'Advanced Counselling Practicum', 3, '500', 'First Semester', 'Guidance and Counselling', 'Education')
on conflict (course_code) do update
set
  course_title = excluded.course_title,
  units = excluded.units,
  level = excluded.level,
  semester = excluded.semester,
  department = coalesce(excluded.department, public.courses.department),
  faculty = coalesce(excluded.faculty, public.courses.faculty),
  updated_at = now();

-- Science Education
-- Science Education (Faculty: Education)
insert into public.courses (course_code, course_title, units, level, semester, department, faculty)
values
  ('SED 101', 'Introduction to Science Education', 3, '100', 'First Semester', 'Science Education', 'Education'),
  ('SED 201', 'Curriculum and Instruction in Science', 3, '200', 'First Semester', 'Science Education', 'Education'),
  ('SED 301', 'Teaching Methods in Science', 3, '300', 'First Semester', 'Science Education', 'Education'),
  ('SED 401', 'Science Laboratory Management', 3, '400', 'First Semester', 'Science Education', 'Education'),
  ('SED 501', 'Evaluation in Science Education', 3, '500', 'First Semester', 'Science Education', 'Education')
on conflict (course_code) do update
set
  course_title = excluded.course_title,
  units = excluded.units,
  level = excluded.level,
  semester = excluded.semester,
  department = coalesce(excluded.department, public.courses.department),
  faculty = coalesce(excluded.faculty, public.courses.faculty),
  updated_at = now();

-- =========================================================
-- LAW
-- =========================================================

-- Law (Faculty: Law)
insert into public.courses (course_code, course_title, units, level, semester, department, faculty)
values
  ('LAW 101', 'Introduction to Nigerian Legal System', 3, '100', 'First Semester', 'Law', 'Law'),
  ('LAW 201', 'Constitutional Law I', 3, '200', 'First Semester', 'Law', 'Law'),
  ('LAW 301', 'Law of Contract I', 3, '300', 'First Semester', 'Law', 'Law'),
  ('LAW 401', 'Criminal Law I', 3, '400', 'First Semester', 'Law', 'Law'),
  ('LAW 501', 'Jurisprudence and Legal Theory', 3, '500', 'First Semester', 'Law', 'Law')
on conflict (course_code) do update
set
  course_title = excluded.course_title,
  units = excluded.units,
  level = excluded.level,
  semester = excluded.semester,
  department = coalesce(excluded.department, public.courses.department),
  faculty = coalesce(excluded.faculty, public.courses.faculty),
  updated_at = now();

-- =========================================================
-- MEDICINE
-- =========================================================

-- Medicine
-- Medicine (Faculty: Medicine)
insert into public.courses (course_code, course_title, units, level, semester, department, faculty)
values
  ('MED 101', 'Introduction to Basic Medical Sciences', 3, '100', 'First Semester', 'Medicine', 'Medicine'),
  ('MED 201', 'Human Anatomy I', 3, '200', 'First Semester', 'Medicine', 'Medicine'),
  ('MED 301', 'Human Physiology I', 3, '300', 'First Semester', 'Medicine', 'Medicine'),
  ('MED 401', 'General Pathology', 3, '400', 'First Semester', 'Medicine', 'Medicine'),
  ('MED 501', 'Clinical Medicine I', 3, '500', 'First Semester', 'Medicine', 'Medicine')
on conflict (course_code) do update
set
  course_title = excluded.course_title,
  units = excluded.units,
  level = excluded.level,
  semester = excluded.semester,
  department = coalesce(excluded.department, public.courses.department),
  faculty = coalesce(excluded.faculty, public.courses.faculty),
  updated_at = now();

-- Nursing
-- Nursing (Faculty: Medicine)
insert into public.courses (course_code, course_title, units, level, semester, department, faculty)
values
  ('NUR 101', 'Introduction to Nursing Science', 3, '100', 'First Semester', 'Nursing', 'Medicine'),
  ('NUR 201', 'Fundamentals of Nursing Practice', 3, '200', 'First Semester', 'Nursing', 'Medicine'),
  ('NUR 301', 'Medical-Surgical Nursing I', 3, '300', 'First Semester', 'Nursing', 'Medicine'),
  ('NUR 401', 'Maternal and Child Health Nursing', 3, '400', 'First Semester', 'Nursing', 'Medicine'),
  ('NUR 501', 'Community Health Nursing', 3, '500', 'First Semester', 'Nursing', 'Medicine')
on conflict (course_code) do update
set
  course_title = excluded.course_title,
  units = excluded.units,
  level = excluded.level,
  semester = excluded.semester,
  department = coalesce(excluded.department, public.courses.department),
  faculty = coalesce(excluded.faculty, public.courses.faculty),
  updated_at = now();

-- Medical Laboratory Science
-- Medical Laboratory Science (Faculty: Medicine)
insert into public.courses (course_code, course_title, units, level, semester, department, faculty)
values
  ('MLS 101', 'Introduction to Medical Laboratory Science', 3, '100', 'First Semester', 'Medical Laboratory Science', 'Medicine'),
  ('MLS 201', 'Clinical Chemistry I', 3, '200', 'First Semester', 'Medical Laboratory Science', 'Medicine'),
  ('MLS 301', 'Haematology I', 3, '300', 'First Semester', 'Medical Laboratory Science', 'Medicine'),
  ('MLS 401', 'Medical Microbiology I', 3, '400', 'First Semester', 'Medical Laboratory Science', 'Medicine'),
  ('MLS 501', 'Histopathology Techniques', 3, '500', 'First Semester', 'Medical Laboratory Science', 'Medicine')
on conflict (course_code) do update
set
  course_title = excluded.course_title,
  units = excluded.units,
  level = excluded.level,
  semester = excluded.semester,
  department = coalesce(excluded.department, public.courses.department),
  faculty = coalesce(excluded.faculty, public.courses.faculty),
  updated_at = now();

-- PREFIX MAPPING REMOVED
-- Departments and faculties are now specified inline for every insert.
-- This file no longer relies on course-code prefix updates to assign departments.

commit;
