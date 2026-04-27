# Campus AI Setup

This project now includes a frontend campus assistant in [pages/chatbot.html](/home/rcherki10/Projects/Companion/pages/chatbot.html) and a secure Supabase Edge Function in [supabase/functions/chat-assistant/index.ts](/home/rcherki10/Projects/Companion/supabase/functions/chat-assistant/index.ts).

## What changed

- The chatbot now keeps conversational context.
- The map is data-driven and supports clickable stops, highlighted locations, and pinned routes.
- Course and timetable data are loaded from the existing Supabase-backed frontend APIs.
- OpenAI calls are routed through a Supabase Edge Function so the API key stays off the client.
- The local parser now repairs common typos and handles looser question phrasing such as `my next clas`, `what time is my next class`, or incomplete route requests.
- The edge function rewrites grounded answers more naturally so replies are less repetitive.

## Secrets needed

Set these in your Supabase project before deploying the edge function:

```bash
supabase secrets set OPENAI_API_KEY=your_openai_api_key
supabase secrets set OPENAI_MODEL=gpt-5.4-mini
```

Then deploy:

```bash
supabase functions deploy chat-assistant
```

## Frontend config

The browser config should be created from [js/supabase-config.example.js](/home/rcherki10/Projects/Companion/js/supabase-config.example.js) into `js/supabase-config.js`.

- `enabled`: turn AI calls on or off
- `functionName`: Supabase function name
- `campusName`: label shown in the UI
- `mapVersion`: useful for distinguishing starter vs official map layouts

## Important map note

The current University of Uyo map is a starter interactive layout, not an official surveyed campus map. For accurate real-world routing, replace the location list and coordinates in [js/chatbot.js](/home/rcherki10/Projects/Companion/js/chatbot.js) with:

- an official campus map image or SVG
- confirmed building names
- confirmed landmark coordinates
- confirmed walk connections between points

The key structures to update are:

- `CAMPUS_LOCATIONS`
- `aliases`
- `neighbors`
- `x` and `y` coordinates

## How the assistant answers directions

1. The browser matches places or course venues to map nodes.
2. A shortest-path route is computed locally from the map graph.
3. The route is pinned on the map.
4. The local route context is sent to the edge function.
5. The model turns that grounded context into a natural response.

If the AI backend is unavailable, the page falls back to local route and venue answers.
