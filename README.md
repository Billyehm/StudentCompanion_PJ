# Companion

Companion is a student and lecturer portal built with static HTML, CSS, and vanilla JavaScript, backed by Supabase Auth, REST, and Edge Functions.

## What It Includes

- student and lecturer authentication
- profile management with role-aware restrictions
- course rep and lecturer announcements
- lecturer-to-student direct messaging through announcements
- attendance QR sessions with geofence checks
- results, directory, timetable, and dashboard views
- an AI assistant powered by a Supabase Edge Function

## Project Structure

- [pages](/home/rcherki10/Projects/Companion/pages): app screens
- [js](/home/rcherki10/Projects/Companion/js): frontend logic
- [css](/home/rcherki10/Projects/Companion/css): styling
- [supabase/functions/chat-assistant](/home/rcherki10/Projects/Companion/supabase/functions/chat-assistant): Edge Function for AI responses
- [docs](/home/rcherki10/Projects/Companion/docs): setup guides, policies, and SQL helpers

## Local Setup

1. Copy [js/supabase-config.example.js](/home/rcherki10/Projects/Companion/js/supabase-config.example.js) to `js/supabase-config.js`.
2. Fill in your Supabase project URL and anon key in `js/supabase-config.js`.
3. Review [docs/SUPABASE_SETUP.md](/home/rcherki10/Projects/Companion/docs/SUPABASE_SETUP.md) and run the required SQL in Supabase.
4. If you want the AI assistant, set the Edge Function secrets described in [docs/CHATBOT_AI_SETUP.md](/home/rcherki10/Projects/Companion/docs/CHATBOT_AI_SETUP.md).
5. Serve the project with your preferred static server.

## Config Notes

- `.env.example` documents the values that should stay local.
- `SUPABASE_ANON_KEY` is safe for frontend use.
- Never commit a `service_role` key or `OPENAI_API_KEY`.
- `supabase/.temp/` and local function env files are ignored on purpose.

## Push Checklist

- confirm `js/supabase-config.js` does not contain personal or production-only values you do not want public
- keep `OPENAI_API_KEY` only in Supabase secrets
- make sure local Supabase temp files and archives are not staged
- review `git status` before pushing
