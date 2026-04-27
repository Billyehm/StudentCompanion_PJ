// Frontend runtime configuration.
// Copy values from .env.example into this file for local development.
// Keep only the Supabase anon key here. Never place the service_role key in frontend code.
window.SUPABASE_CONFIG = {
  url: 'https://zdlypdwjguvvknrlcssh.supabase.co',
  anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpkbHlwZHdqZ3V2dmtucmxjc3NoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY4NjMzNjcsImV4cCI6MjA5MjQzOTM2N30.IPS-ZPa7q6tQJ2gHc1MaaUsGbjCJmoCb9KRlciAz0e4'
};

window.AI_ASSISTANT_CONFIG = {
  enabled: true,
  functionName: 'chat-assistant',
  modelLabel: 'OpenAI Responses API',
  campusName: 'University of Uyo',
  mapVersion: 'starter-campus-layout'
};
