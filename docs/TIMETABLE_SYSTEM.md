# Timetable System Implementation Guide

## Overview
A new **Class Timetable Management System** has been added to the Student Companion app. This allows course representatives to set up and manage class timetables (Monday-Friday, 8am-6pm), with students having read-only access to view their schedules.

---

## Database Changes

### SQL Queries to Add Timetable Support

**Location:** [docs/SUPABASE_SETUP.md](SUPABASE_SETUP.md#timetable-table-schema) (lines added after announcements table definition)

#### 1. Create Timetables Table (Line ~255)
```sql
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

#### 2. Enable RLS (Line ~273)
```sql
alter table public.timetables enable row level security;
```

#### 3. Add RLS Policies (Lines ~461-489)
```sql
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

---

## Frontend Changes

### Updated Files

#### 1. [pages/course-rep.html](pages/course-rep.html)
**Added:** Timetable panel section (lines ~268-278) with:
- Section title "📅 Manage Class Timetable"
- Container for timetable grid display
- "Add Timetable Entry" button
- Timetable modal form (lines ~285-330) with fields for:
  - Day of week (Monday-Friday)
  - Start/End times (8am-6pm)
  - Course code & title
  - Venue & Lecturer name
  - Modal controls (Save/Cancel buttons)

#### 2. [js/course-rep.js](js/course-rep.js)
**Added Functions:**
- `loadTimetable()` - Fetches timetable from database
- `renderTimetable()` - Displays week 8am-6pm grid
- `openTimetableModal()` - Opens add/edit modal
- `closeTimetableModal()` - Closes modal
- `addTimetableEntry()` - Prepares modal for adding new entry
- `editTimetableEntry()` - Prepares modal for editing (with delete button on grid)
- `saveTimetableEntry()` - Creates or updates entry
- `deleteTimetableEntry()` - Deletes timetable entry
- Updated `initCourseRepPage()` - Now loads timetable after checking profile

**Lines:** 161-268 (new functions added)

#### 3. [pages/dashboard.html](pages/dashboard.html)
**Added:** Timetable preview card (lines ~91-97) showing:
- 📅 Class Timetable tile link
- Next class preview (time, course, venue)
- Clickable navigation to full timetable view

#### 4. [js/dashboard.js](js/dashboard.js)
**Added Function:**
- `loadTimetablePreview()` - Shows today's next class on dashboard (lines 81-120)
- Updated `initDashboard()` - Calls loadTimetablePreview for students

**Lines:** 50-52, 81-120 (updated and added functions)

#### 5. [pages/timetable.html](pages/timetable.html) - **NEW FILE**
Full page view for students to see their class timetable:
- Week grid (Monday-Friday)
- Time slots (8am-6pm)
- All their scheduled classes
- Read-only display with class details

#### 6. [js/timetable.js](js/timetable.js) - **NEW FILE**
Student timetable view logic:
- `initTimetablePage()` - Protects route, checks profile
- `loadTimetable()` - Fetches timetable entries
- `renderTimetable()` - Displays week grid with all classes
- HTML escaping for security

---

## Backend Changes

### [js/auth.js](js/auth.js)
**Added Methods (lines 611-721):**

1. **`mapTimetableRow(row)`** - Maps database row to object
   - Returns: id, createdByUserId, audience*, dayOfWeek, startTime, endTime, courseCode, courseTitle, venue, lecturerName, timestamps

2. **`canReceiveTimetable(user, timetable)`** - Checks if user can view entry
   - Validates: academic profile complete, faculty/department/level match

3. **`getTimetablesDb()`** - Gets all visible timetable entries
   - Returns: Filtered array of timetable entries user can access
   - **Query:** `timetables?select=...&order=day_of_week,start_time`

4. **`createTimetableEntryDb(payload)`** - Creates new entry
   - Required fields: dayOfWeek, startTime, endTime, courseCode, courseTitle
   - Optional: venue, lecturerName
   - Audience scope: Faculty, Department, Level (level only for course reps)
   - **Query:** POST to `timetables` table

5. **`updateTimetableEntryDb(id, payload)`** - Updates entry
   - Same validation as create
   - **Query:** PATCH `timetables?id=eq.{id}`

6. **`deleteTimetableEntryDb(id)`** - Deletes entry
   - Only course reps/lecturers can delete
   - **Query:** DELETE `timetables?id=eq.{id}`

---

## Key Features

### Course Rep Panel
- **Setup timetable for own class** (scoped by faculty/department/level)
- **Week grid (Mon-Fri, 8am-6pm)** with time slots
- **Add/Edit/Delete** individual classes
- **Modal form** for data entry
- **Input validation** (required fields, time constraints)

### Student View
- **Read-only timetable panel** on dashboard (shows next class preview)
- **Full timetable page** ([timetable.html](pages/timetable.html)) with week grid
- **Scoped by class** (faculty, department, level)
- **Click to view** class details (venue, lecturer, times)

### Database Security
- **RLS Policies:** Students read all visible timetables, only course reps/lecturers can create/modify
- **Row-level filtering:** Respects faculty/department/level boundaries
- **Unique constraint:** Prevents double-booking same time slot for a class

---

## User Workflows

### Course Rep (Setup Timetable)
1. Navigate to Course Rep panel
2. Scroll to "Manage Class Timetable" section
3. See week grid (8am-6pm, Mon-Fri)
4. Click "Add Timetable Entry" or click on time slot
5. Fill modal form (day, times, course, venue, lecturer)
6. Click "Save Entry"
7. Grid updates with new class
8. Can click class to edit or delete

### Student (View Timetable)
1. On dashboard, see "Class Timetable" card
2. Shows preview of next class for today
3. Click card to go to full timetable view
4. See complete week schedule with all classes
5. Details include: course code, title, venue, lecturer, times

---

## Notes for Future Querries

**If you need additional queries for:**
- Generating timetable conflict reports
- Bulk updating time slots
- Timetable history/audit trails
- Exporting timetable as PDF/CSV
- Recurring/template timetables

**Just ask and specify where in [docs/SUPABASE_SETUP.md](docs/SUPABASE_SETUP.md) to add them!**

---

## Testing Checklist

- [ ] Course rep can add timetable entries
- [ ] Course rep sees week grid with Mon-Fri, 8am-6pm
- [ ] Students only see classes for their own class
- [ ] Dashboard shows next class preview
- [ ] Timetable page shows full week grid
- [ ] Can edit and delete entries
- [ ] Form validation works (required fields, time constraints)
- [ ] Unique constraint prevents double-booking
- [ ] Modal opens/closes properly
