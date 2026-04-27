-- Server-side RLS policies for targeted and class-wide announcements
-- Run this after adding audience_user_id, audience_user_name, and message_scope
-- columns to public.announcements.

ALTER TABLE IF EXISTS public.announcements ENABLE ROW LEVEL SECURITY;

ALTER TABLE IF EXISTS public.announcements
  ADD COLUMN IF NOT EXISTS audience_user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS audience_user_name text,
  ADD COLUMN IF NOT EXISTS message_scope text NOT NULL DEFAULT 'broadcast';

ALTER TABLE IF EXISTS public.announcements
  DROP CONSTRAINT IF EXISTS announcements_message_scope_check;

ALTER TABLE IF EXISTS public.announcements
  ADD CONSTRAINT announcements_message_scope_check
  CHECK (message_scope IN ('broadcast', 'direct'));

DROP POLICY IF EXISTS "announcements read authenticated" ON public.announcements;
DROP POLICY IF EXISTS "course reps and lecturers insert announcements" ON public.announcements;
DROP POLICY IF EXISTS "announcements_select_scoped" ON public.announcements;
CREATE POLICY "announcements_select_scoped"
ON public.announcements
FOR SELECT
TO authenticated
USING (
  created_by_user_id = auth.uid()
  OR
  audience_user_id = auth.uid()
  OR (
    audience_user_id IS NULL
    AND EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.faculty = announcements.audience_faculty
        AND p.department = announcements.audience_department
        AND (
          announcements.audience_level IS NULL
          OR announcements.audience_level = p.level
          OR p.role = 'lecturer'
        )
    )
  )
);

DROP POLICY IF EXISTS "announcements_insert_scoped" ON public.announcements;
CREATE POLICY "announcements_insert_scoped"
ON public.announcements
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND (p.role = 'lecturer' OR p.is_course_rep = true)
  )
  AND created_by_user_id = auth.uid()
  AND (
    audience_user_id IS NULL
    OR EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role = 'lecturer'
    )
  )
);
