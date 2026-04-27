-- Server-side RLS policies for the `timetables` table
-- Enforces that:
--  - Students can only SELECT timetable rows that match their faculty, department
--    and (either have no audience_level or match their level).
--  - Course reps (p.is_course_rep = true) can INSERT/UPDATE/DELETE only for their
--    own faculty & department and only for their own `level` (audience_level = p.level).
--  - Lecturers (p.role = 'lecturer') can manage timetables for their faculty/department
--    (and any level) and can see rows in their faculty/department.

-- NOTE: Run this in the Supabase SQL editor for your project.

-- Enable RLS (if not already enabled)
ALTER TABLE IF EXISTS public.timetables ENABLE ROW LEVEL SECURITY;

-- SELECT policy: allow authenticated users to read only rows scoped to them
DROP POLICY IF EXISTS "timetables_select_scoped" ON public.timetables;
CREATE POLICY "timetables_select_scoped"
ON public.timetables
FOR SELECT
TO authenticated
USING (
  -- Lecturers can see rows in their faculty/department
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.role = 'lecturer'
      and p.faculty = timetables.audience_faculty
      and p.department = timetables.audience_department
  )
  OR
  -- Students / course reps can see rows that match their faculty/department
  -- and either have no audience_level (class-wide) or match their level
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.faculty = timetables.audience_faculty
      and p.department = timetables.audience_department
      and (timetables.audience_level IS NULL OR timetables.audience_level = p.level)
  )
);

-- INSERT policy: only lecturers or course reps can insert, and the inserted
-- row must be scoped to the user's faculty/department and (for course reps)
-- must have audience_level equal to the rep's level.
DROP POLICY IF EXISTS "timetables_insert_reps_lecturers" ON public.timetables;
CREATE POLICY "timetables_insert_reps_lecturers"
ON public.timetables
FOR INSERT
TO authenticated
USING (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and (p.role = 'lecturer' or p.is_course_rep = true)
  )
)
WITH CHECK (
  -- faculty & department must match the user's profile
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.faculty = timetables.audience_faculty
      and p.department = timetables.audience_department
      and (
        -- lecturers may set any audience_level
        p.role = 'lecturer'
        OR
        -- course reps must set audience_level equal to their profile level
        (p.is_course_rep = true AND timetables.audience_level = p.level)
      )
  )
  -- optionally ensure created_by_user_id is the authenticated user
  AND (timetables.created_by_user_id = auth.uid())
);

-- UPDATE policy: only lecturers or course reps can update, and resulting row
-- must remain within the same scoping rules (faculty/department and level for reps).
DROP POLICY IF EXISTS "timetables_update_reps_lecturers" ON public.timetables;
CREATE POLICY "timetables_update_reps_lecturers"
ON public.timetables
FOR UPDATE
TO authenticated
USING (
  -- allow if the user is lecturer in the same faculty/department
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.role = 'lecturer'
      and p.faculty = timetables.audience_faculty
      and p.department = timetables.audience_department
  )
  OR
  -- or allow if the user is the course rep who created the row
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.is_course_rep = true
      and p.faculty = timetables.audience_faculty
      and p.department = timetables.audience_department
      and timetables.created_by_user_id = auth.uid()
  )
)
WITH CHECK (
  -- After update, the row must stilll be scoped to the user's faculty/department
  -- and (for course reps) audience_level must equal their profile level.
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.faculty = timetables.audience_faculty
      and p.department = timetables.audience_department
      and (
        p.role = 'lecturer'
        OR (p.is_course_rep = true AND timetables.audience_level = p.level)
      )
  )
);

-- DELETE policy: lecturers can delete rows in their faculty/department; course reps
-- can delete rows they created and that are scoped to their faculty/department and level.
DROP POLICY IF EXISTS "timetables_delete_reps_lecturers" ON public.timetables;
CREATE POLICY "timetables_delete_reps_lecturers"
ON public.timetables
FOR DELETE
TO authenticated
USING (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and (
        -- lecturers may delete any row in their faculty/department
        (p.role = 'lecturer' and p.faculty = timetables.audience_faculty and p.department = timetables.audience_department)
        OR
        -- course reps may delete rows they created that match their leveluploaded
        (p.is_course_rep = true and p.faculty = timetables.audience_faculty and p.department = timetables.audience_department and timetables.created_by_user_id = auth.uid() and timetables.audience_level = p.level)
      )
  )
);

-- End of policies...
