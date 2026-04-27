import "@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Content-Type": "application/json"
};

const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY") || "";
const OPENAI_MODEL = Deno.env.get("OPENAI_MODEL") || "gpt-5.4-mini";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed." }, 405);
  }

  let payload: {
    messages?: Array<{ role?: string; content?: string }>;
    localContext?: unknown;
    localReply?: string;
  } = {};

  try {
    payload = await req.json();
  } catch (_) {
    return jsonResponse({ error: "Invalid JSON payload." }, 400);
  }

  const messages = Array.isArray(payload.messages) ? payload.messages.slice(-10) : [];
  const localReply = String(payload.localReply || "").trim();
  const localContext = payload.localContext ?? {};

  if (!OPENAI_API_KEY) {
    return jsonResponse({
      reply: localReply || "I can still help locally, but the AI secret is not configured on the server."
    });
  }

  const prompt = buildPrompt({ messages, localContext, localReply });

  try {
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: OPENAI_MODEL,
        input: prompt
      })
    });

    const data = await response.json().catch(() => null);
    if (!response.ok) {
      console.error("OpenAI error", data);
      return jsonResponse({
        reply: localReply || "I couldn't reach the AI service just now, so I’m falling back to the local campus guide."
      });
    }

    const reply = extractOutputText(data);
    return jsonResponse({
      reply: reply || localReply || "I’m here and ready to help with campus routes, timetable questions, and venue lookups."
    });
  } catch (error) {
    console.error("chat-assistant failure", error);
    return jsonResponse({
      reply: localReply || "I hit a server issue while preparing the answer, so I’m using the local campus guide."
    });
  }
});

function buildPrompt({
  messages,
  localContext,
  localReply
}: {
  messages: Array<{ role?: string; content?: string }>;
  localContext: unknown;
  localReply: string;
}) {
  const transcript = messages
    .map((message) => `${String(message.role || "user").toUpperCase()}: ${String(message.content || "").trim()}`)
    .join("\n");

  return [
    "You are Student Companion's campus AI assistant.",
    "Your job is to answer naturally, flexibly, and helpfully using the grounded campus context below.",
    "Important behavior rules:",
    "- Infer the user's intended meaning when the text is incomplete, misspelled, broken, or phrased awkwardly, as long as the intent is still reasonably clear.",
    "- Do not complain about minor typos.",
    "- Do not be repetitive or robotic. Vary your wording naturally from answer to answer.",
    "- Do not hallucinate buildings, timetable entries, or routes that are not supported by the supplied local context.",
    "- If the local reply already contains the answer, you may rewrite it more naturally and clearly.",
    "- If the user seems to be asking for time, venue, next class, directions, or a place description, prefer the grounded local context.",
    "- If the request is still genuinely ambiguous, ask one short follow-up question.",
    "",
    "Grounded local context JSON:",
    safeJson(localContext),
    "",
    "Local fallback answer:",
    localReply || "(none)",
    "",
    "Recent conversation:",
    transcript || "(empty)",
    "",
    "Return only the assistant reply as plain text."
  ].join("\n");
}

function extractOutputText(data: unknown) {
  if (data && typeof data === "object" && "output_text" in data) {
    const direct = String((data as { output_text?: string }).output_text || "").trim();
    if (direct) {
      return direct;
    }
  }

  const output = data && typeof data === "object" && Array.isArray((data as { output?: unknown[] }).output)
    ? (data as { output: unknown[] }).output
    : [];

  const parts: string[] = [];
  output.forEach((item) => {
    if (!item || typeof item !== "object") {
      return;
    }
    const content = Array.isArray((item as { content?: unknown[] }).content)
      ? (item as { content: unknown[] }).content
      : [];
    content.forEach((entry) => {
      if (!entry || typeof entry !== "object") {
        return;
      }
      const text = String((entry as { text?: string }).text || "").trim();
      if (text) {
        parts.push(text);
      }
    });
  });

  return parts.join("\n").trim();
}

function safeJson(value: unknown) {
  try {
    return JSON.stringify(value, null, 2);
  } catch (_) {
    return "{}";
  }
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: corsHeaders
  });
}
