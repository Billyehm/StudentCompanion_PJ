# Supabase Setup

This app is now database-first.

You still need [js/auth.js](/home/rcherki10/Projects/Companion/js/auth.js), but only as the frontend helper that:

- signs users in and out
- stores the current session token
- calls Supabase Auth and REST endpoints
- enforces role checks on pages

It no longer needs mock students, mock lecturers, or browser-seeded directory data.

## 1. Frontend Config

Copy [js/supabase-config.example.js](/home/rcherki10/Projects/Companion/js/supabase-config.example.js) to `js/supabase-config.js`, then set:

```js
window.SUPABASE_CONFIG = {
  url: 'https://YOUR_PROJECT_REF.supabase.co',
  anonKey: 'YOUR_SUPABASE_ANON_KEY'
};
```

Rules:

- Use only the `anon` key in frontend code.
- Never place the `service_role` key in this project.
- Keep server-only secrets like `OPENAI_API_KEY` in Supabase secrets, not in this repo.
- Add your local URL in Supabase Auth URL settings, for example `http://127.0.0.1:5500`.

## 2. What The App Expects In Supabase

The current code in [js/auth.js](/home/rcherki10/Projects/Companion/js/auth.js) expects Supabase to be the source of truth for:

- `auth.users`
- `public.profiles`
- `public.courses`
- `public.results`
- `public.qr_sessions`
- `public.attendance_records`
- `public.announcements`
- `public.timetables`

## 3. Required App Behavior

The current frontend expects these rules:

- students register through Supabase Auth
- every auth user gets a matching `profiles` row
- lecturers have `role = 'lecturer'`
- course reps are still `role = 'student'`, but `is_course_rep = true`
- students need `faculty`, `department`, and `level`
- lecturers need `faculty`, `department`, and `title`
- profile save locks academic identity with `academic_locked = true`
- lecturers must capture their live GPS location when generating a QR session
- each QR session stores a geofence radius in meters
- each attendance scan stores location verification details and a device token

## 4. Run This Schema Migration

Run this in Supabase SQL Editor.

```sql
create extension if not exists pgcrypto;

create or replace function public.set_timestamp()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique not null,
  name text not null,
  role text not null default 'student' check (role in ('student', 'lecturer')),
  is_course_rep boolean not null default false,
  reg_number text unique,
  faculty text,
  department text,
  level text,
  title text,
  academic_locked boolean not null default false,
  name_changed_at timestamptz,
  email_changed_at timestamptz,
  password_changed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_profiles_updated_at on public.profiles;
create trigger trg_profiles_updated_at
before update on public.profiles
for each row
execute function public.set_timestamp();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (
    id,
    email,
    name,
    role,
    is_course_rep,
    reg_number
  )
  values (
    new.id,
    new.email,
    coalesce(initcap(trim(new.raw_user_meta_data ->> 'name')), split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data ->> 'role', 'student'),
    false,
    upper(nullif(trim(new.raw_user_meta_data ->> 'reg_number'), ''))
  )
  on conflict (id) do update set
    email = excluded.email,
    name = excluded.name,
    role = excluded.role,
    reg_number = excluded.reg_number,
    updated_at = now();

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row
execute function public.handle_new_user();

create table if not exists public.courses (
  id uuid primary key default gen_random_uuid(),
  course_code text unique not null,
  course_title text not null,
  units integer not null check (units > 0),
  level text,
  semester text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_courses_updated_at on public.courses;
create trigger trg_courses_updated_at
before update on public.courses
for each row
execute function public.set_timestamp();

create table if not exists public.results (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete restrict,
  grade text not null check (grade in ('A', 'B', 'C', 'D', 'E', 'F')),
  grade_point numeric(3,2) not null check (grade_point >= 0 and grade_point <= 5),
  semester text not null,
  session_label text not null,
  remark text,
  published_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (student_id, course_id, semester, session_label)
);

drop trigger if exists trg_results_updated_at on public.results;
create trigger trg_results_updated_at
before update on public.results
for each row
execute function public.set_timestamp();

create table if not exists public.qr_sessions (
  id uuid primary key default gen_random_uuid(),
  created_by_user_id uuid not null references public.profiles(id) on delete cascade,
  course_code text not null,
  course_title text not null,
  duration_minutes integer not null default 15 check (duration_minutes > 0),
  geofence_latitude double precision not null,
  geofence_longitude double precision not null,
  geofence_radius_meters double precision not null default 120 check (geofence_radius_meters > 0),
  expires_at timestamptz not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_qr_sessions_updated_at on public.qr_sessions;
create trigger trg_qr_sessions_updated_at
before update on public.qr_sessions
for each row
execute function public.set_timestamp();

create table if not exists public.attendance_records (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.qr_sessions(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  lecturer_id uuid not null references public.profiles(id) on delete cascade,
  course_code text not null,
  course_title text not null,
  location_verified boolean not null default false,
  scan_latitude double precision,
  scan_longitude double precision,
  scan_accuracy_meters double precision,
  geo_distance_meters double precision,
  geofence_radius_meters double precision,
  within_geofence boolean,
  device_token text,
  device_label text,
  scanned_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (session_id, student_id)
);

create table if not exists public.announcements (
  id uuid primary key default gen_random_uuid(),
  course_code text not null,
  text text not null,
  type text not null default 'general',
  created_by_name text not null,
  created_by_user_id uuid not null references public.profiles(id) on delete cascade,
  audience_faculty text,
  audience_department text,
  audience_level text,
  audience_user_id uuid references public.profiles(id) on delete cascade,
  audience_user_name text,
  message_scope text not null default 'broadcast' check (message_scope in ('broadcast', 'direct')),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null
);

create table if not exists public.timetables (
  id uuid primary key default gen_random_uuid(),
  created_by_user_id uuid not null references public.profiles(id) on delete cascade,
  audience_faculty text not null,
  audience_department text not null,
  audience_level text,
  day_of_week text not null check (day_of_week in ('Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday')),
  start_time time not null,
  end_time time not null,
  course_code text not null,
  course_title text not null,
  venue text,
  lecturer_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (audience_faculty, audience_department, audience_level, day_of_week, start_time, end_time)
);

drop trigger if exists trg_timetables_updated_at on public.timetables;
create trigger trg_timetables_updated_at
before update on public.timetables
for each row
execute function public.set_timestamp();
```

## 5. Enable RLS

```sql
alter table public.profiles enable row level security;
alter table public.courses enable row level security;
alter table public.results enable row level security;
alter table public.qr_sessions enable row level security;
alter table public.attendance_records enable row level security;
alter table public.announcements enable row level security;
alter table public.timetables enable row level security;
```

## 6. Create Policies

Run all of these.

```sql
drop policy if exists "profiles read authenticated" on public.profiles;
create policy "profiles read authenticated"
on public.profiles
for select
to authenticated
using (true);

drop policy if exists "profiles insert self" on public.profiles;
create policy "profiles insert self"
on public.profiles
for insert
to authenticated
with check (auth.uid() = id);

drop policy if exists "profiles update self" on public.profiles;
create policy "profiles update self"
on public.profiles
for update
to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);

drop policy if exists "courses read authenticated" on public.courses;
create policy "courses read authenticated"
on public.courses
for select
to authenticated
using (true);

drop policy if exists "lecturers manage courses" on public.courses;
create policy "lecturers manage courses"
on public.courses
for all
to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'lecturer'
  )
)
with check (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'lecturer'
  )
);

drop policy if exists "students read own results" on public.results;
create policy "students read own results"
on public.results
for select
to authenticated
using (
  student_id = auth.uid()
  or exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'lecturer'
  )
);

drop policy if exists "lecturers manage results" on public.results;
create policy "lecturers manage results"
on public.results
for all
to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'lecturer'
  )
)
with check (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'lecturer'
  )
);

drop policy if exists "qr sessions read authenticated" on public.qr_sessions;
create policy "qr sessions read authenticated"
on public.qr_sessions
for select
to authenticated
using (true);

drop policy if exists "lecturers manage qr sessions" on public.qr_sessions;
create policy "lecturers manage qr sessions"
on public.qr_sessions
for all
to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'lecturer'
  )
)
with check (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'lecturer'
  )
);

drop policy if exists "attendance read own or lecturer" on public.attendance_records;
create policy "attendance read own or lecturer"
on public.attendance_records
for select
to authenticated
using (
  student_id = auth.uid()
  or lecturer_id = auth.uid()
);

drop policy if exists "students insert own attendance" on public.attendance_records;
create policy "students insert own attendance"
on public.attendance_records
for insert
to authenticated
with check (student_id = auth.uid());

drop policy if exists "announcements read authenticated" on public.announcements;
create policy "announcements read authenticated"
on public.announcements
for select
to authenticated
using (
  created_by_user_id = auth.uid()
  or
  audience_user_id = auth.uid()
  or (
    audience_user_id is null
    and exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.faculty = announcements.audience_faculty
        and p.department = announcements.audience_department
        and (
          announcements.audience_level is null
          or announcements.audience_level = p.level
          or p.role = 'lecturer'
        )
    )
  )
);

drop policy if exists "course reps and lecturers insert announcements" on public.announcements;
create policy "course reps and lecturers insert announcements"
on public.announcements
for insert
to authenticated
with check (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and (p.role = 'lecturer' or p.is_course_rep = true)
  )
  and created_by_user_id = auth.uid()
  and (
    audience_user_id is null
    or exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.role = 'lecturer'
    )
  )
);

drop policy if exists "timetables read authenticated" on public.timetables;
create policy "timetables read authenticated"
on public.timetables
for select
to authenticated
using (true);

drop policy if exists "course reps and lecturers manage timetables" on public.timetables;
create policy "course reps and lecturers manage timetables"
on public.timetables
for all
to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and (p.role = 'lecturer' or p.is_course_rep = true)
  )
)
with check (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and (p.role = 'lecturer' or p.is_course_rep = true)
  )
);
```

## 7. Supabase Auth Settings

In Supabase:

1. Enable Email authentication.
2. Add your local dev URL in `Authentication -> URL Configuration`.
3. Set the redirect URL used by password reset pages.
4. If you want instant test signup, disable email confirmation temporarily.

The app’s password reset flow uses:

- [js/forgot-password.js](/home/rcherki10/Projects/Companion/js/forgot-password.js)
- [js/reset-password.js](/home/rcherki10/Projects/Companion/js/reset-password.js)

## 8. Seed Real Data

Do this in the database, not in code.

### Lecturer

Create the auth user first in Supabase Auth, then update the profile:

```sql
update public.profiles
set
  name = 'Dr. James Smith',
  role = 'lecturer',
  title = 'Lecturer',
  faculty = 'Science and Computing',
  department = 'Computer Science',
  level = null,
  academic_locked = true
where lower(email) = lower('james.smith@university.edu');
```

### Course Rep

Create the student normally, then promote:

```sql
update public.profiles
set
  is_course_rep = true
where lower(email) = lower('student@example.com');
```

### Courses

Use [docs/add_courses_sample.sql](/home/rcherki10/Projects/Companion/docs/add_courses_sample.sql).

Important:

- the current `public.courses` table has `course_code`, `course_title`, `units`, `level`, and `semester`
- it does not have a `department` column
- department matching in the app is inferred from the course code prefix in [js/auth.js](/home/rcherki10/Projects/Companion/js/auth.js)

### Results

Use [docs/add_student_grades_sample.sql](/home/rcherki10/Projects/Companion/docs/add_student_grades_sample.sql), but make sure it matches the current schema before running it.

## 9. Verify Setup

Check profiles:

```sql
select id, email, role, is_course_rep, reg_number, faculty, department, level, title, academic_locked
from public.profiles
order by created_at desc;
```

Check courses:

```sql
select id, course_code, course_title, units, level, semester
from public.courses
order by course_code asc;
```

Check results:

```sql
select student_id, course_id, grade, grade_point, semester, session_label, published_at
from public.results
order by published_at desc;
```

Check QR sessions:

```sql
select id, created_by_user_id, course_code, course_title, duration_minutes, geofence_latitude, geofence_longitude, geofence_radius_meters, expires_at, is_active, created_at
from public.qr_sessions
order by created_at desc;
```

Check attendance:

```sql
select id, session_id, student_id, lecturer_id, course_code, course_title, location_verified, geo_distance_meters, geofence_radius_meters, within_geofence, device_token, scanned_at
from public.attendance_records
order by scanned_at desc;
```

Check announcements:

```sql
select id, course_code, created_by_name, audience_faculty, audience_department, audience_level, created_at, expires_at
from public.announcements
order by created_at desc;
```

Check timetables:

```sql
select id, audience_faculty, audience_department, audience_level, day_of_week, start_time, end_time, course_code
from public.timetables
order by day_of_week, start_time;
```

Check policies:

```sql
select tablename, policyname, cmd
from pg_policies
where schemaname = 'public'
order by tablename, policyname, cmd;
```

## 10. What Each Page Uses

These are the main database-backed flows right now:

- `register.html` -> `AUTH.registerStudentDb()`
- `login.html` -> `AUTH.loginDb()`
- `profile.html` -> `AUTH.saveAcademicProfileDb()`, `AUTH.updateEmailInDb()`, `AUTH.updatePasswordInDb()`
- `directory.html` -> `AUTH.getDirectoryDataDb()`
- `results.html` -> `AUTH.getStudentResultSheetDb()`
- `notifications.html` -> `AUTH.getAnnouncementsDb()`
- `course-rep.html` -> `AUTH.createAnnouncementDb()`, `AUTH.getMyAnnouncementsDb()`, timetable CRUD
- `timetable.html` -> `AUTH.getTimetablesDb()`
- `lecturer-qr.html` -> `AUTH.createQRSessionDb()`, `AUTH.getMyQRSessionsDb()`, `AUTH.deactivateQRSessionDb()`
- `attendance.html` -> `AUTH.getQRSessionDb()`, `AUTH.recordAttendanceDb()`, `AUTH.getMyAttendanceRecordsDb()`
- `lecturer-attendance.html` -> `AUTH.getLecturerAttendanceRecordsDb()`

## 10.1 Attendance Integrity Rules

The QR attendance flow now does more than a plain camera scan:

- the student scanner reads the QR code automatically once the camera sees it
- the lecturer QR session stores the lecturer's live GPS position
- each student attendance row stores its own scan location snapshot
- scans outside the lecturer geofence still record successfully, but are flagged for lecturer review
- each browser stores a persistent device token in local storage
- if one device token is used for multiple student accounts in the same session, those records are flagged together
- the lecturer attendance page can export all records, legit-only records, or flagged-only records

## 11. Troubleshooting

### `Supabase is not configured yet`

Fix:

- confirm `window.SUPABASE_CONFIG` exists in [js/supabase-config.js](/home/rcherki10/Projects/Companion/js/supabase-config.js)select tablename, policyname, cmd
from pg_policies
where schemaname = 'public'
order by tablename, policyname, cmd;
- confirm the page loads that script before `auth.js`

### `Profile record not found for this account`

Fix:

- confirm `public.handle_new_user()` exists
- confirm the auth trigger exists
- if the user was created before the trigger, manually insert the missing profile row

### `permission denied for table profiles`

Fix:

1. Confirm RLS is enabled.
2. Confirm the `profiles` policies exist.
3. Confirm the request is authenticated.
4. Confirm the row belongs to `auth.uid()`.

### Course rep cannot send announcements

Fix:

- confirm `is_course_rep = true`
- confirm faculty, department, and level are filled
- confirm the insert policy exists on `public.announcements`

### Student sees no results

Fix:

- confirm the student profile has the correct `department` and `level`
- confirm the course code prefixes match the department logic in `AUTH.getDepartmentCoursePrefixes()`
- confirm rows exist in `public.results`

### Student cannot scan attendance

Fix:

- confirm the QR session exists in `public.qr_sessions`
- confirm `is_active = true`
- confirm `expires_at` is still in the future
- confirm the student has not already inserted a row for that same session
- confirm the browser has camera permission
- confirm the browser allows location permission if you want a clean geofence verification

### Existing project already has the older QR schema

If your database already exists, run this patch to add the new QR integrity fields:

```sql
alter table public.qr_sessions
  add column if not exists geofence_latitude double precision,
  add column if not exists geofence_longitude double precision,
  add column if not exists geofence_radius_meters double precision not null default 120;

alter table public.attendance_records
  add column if not exists location_verified boolean not null default false,
  add column if not exists scan_latitude double precision,
  add column if not exists scan_longitude double precision,
  add column if not exists scan_accuracy_meters double precision,
  add column if not exists geo_distance_meters double precision,
  add column if not exists geofence_radius_meters double precision,
  add column if not exists within_geofence boolean,
  add column if not exists device_token text,
  add column if not exists device_label text;
```

## 12. Cleanup Note

Legacy browser-seeded accounts and browser-only attendance/session storage have been removed from the main auth flow.

That means:

- users should be created in Supabase Auth
- lecturers should be promoted in `public.profiles`
- course reps should be promoted in `public.profiles`
- courses, results, announcements, attendance, QR sessions, and timetables should all come from Supabase
