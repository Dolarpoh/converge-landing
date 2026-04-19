// api/chat.js — Vercel Edge Function
// Reads client configs from public/clients.json (via GitHub raw).
// Falls back to a sensible generic prompt if the key is unknown.
//
// Required env vars:
//   GROQ_API_KEY
//   GITHUB_REPO   — e.g. "Dolarpoh/converge-landing"
//   GITHUB_BRANCH — e.g. "main"

export const config = { runtime: 'edge' };

const ALLOWED_ORIGIN = '*';

// ─── FALLBACK CONFIG ─────────────────────────────────────────────────────────
const FALLBACK = {
  agentName: 'Aria',
  agentRole: 'AI Sales Closer',
  systemPrompt: `You are Aria, an AI sales closer embedded on a business website.
Your job is to warmly greet visitors, understand what they need, and guide them toward a next step.
Keep replies to 2-4 sentences. End every message with one question or one clear CTA.
Never invent prices or features. Be warm, direct, and human.`,
};

// ─── LOAD CLIENTS ────────────────────────────────────────────────────────────
let clientsCache = null;
let cacheTime = 0;
const CACHE_TTL = 60_000;

async function getClients() {
  const now = Date.now();
  if (clientsCache && now - cacheTime < CACHE_TTL) return clientsCache;

  const repo   = process.env.GITHUB_REPO;
  const branch = process.env.GITHUB_BRANCH || 'main';

  if (!repo) return {};

  try {
    const res = await fetch(
      `https://raw.githubusercontent.com/${repo}/${branch}/public/clients.json`,
      { signal: AbortSignal.timeout(4000) }
    );
    if (!res.ok) return {};
    const data = await res.json();
    clientsCache = data;
    cacheTime = now;
    return data;
  } catch {
    return clientsCache || {};
  }
}

// ─── HANDLER ─────────────────────────────────────────────────────────────────
export default async function handler(req) {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders() });
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  let body;
  try { body = await req.json(); } catch {
    return new Response('Invalid JSON', { status: 400 });
  }

  const { messages, clientKey, pageContext } = body;

  if (!messages || !Array.isArray(messages)) {
    return new Response('Missing messages array', { status: 400 });
  }

  const groqKey = process.env.GROQ_API_KEY;
  if (!groqKey) {
    return new Response('API key not configured', { status: 500 });
  }

  // Resolve client config
  const clients = await getClients();
  const client  = clients[clientKey] || FALLBACK;
  const systemPrompt = client.systemPrompt || FALLBACK.systemPrompt;

  // ── Page context injection ──────────────────────────────────────────────
  // We tell the AI exactly where the visitor IS right now.
  // We do NOT tell it where they went after a suggestion — the AI can't know that.
  // The note is phrased as a confirmed present-tense fact so the AI uses it
  // naturally ("since you're on the cart page…") rather than hallucinating
  // navigation ("you're now on the Hair page" after suggesting they go there).
  let pageNote = '';
  if (pageContext?.section) {
    pageNote = `\n\n[CURRENT PAGE: The visitor is right now on: "${pageContext.section}". ` +
      `Use this to make your response relevant to where they actually are. ` +
      `Do NOT reference any page they have not yet confirmed they are on — ` +
      `you only know their current page from this context tag, not from anything you suggested.]`;
  }

  try {
    const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${groqKey}`,
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: systemPrompt + pageNote },
          ...messages.slice(-16),
        ],
        max_tokens: 280,
        temperature: 0.72,
        top_p: 0.9,
      }),
    });

    if (!groqRes.ok) {
      console.error('Groq error:', await groqRes.text());
      return fallbackResponse(corsHeaders());
    }

    const data  = await groqRes.json();
    const reply = data.choices?.[0]?.message?.content?.trim()
      || "I didn't quite catch that. Could you rephrase?";

    return new Response(JSON.stringify({
      reply,
      config: getPublicConfig(client),
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...corsHeaders() },
    });

  } catch (err) {
    console.error('Handler error:', err);
    return fallbackResponse(corsHeaders());
  }
}

function fallbackResponse(headers) {
  return new Response(
    JSON.stringify({ reply: "Connection issue on my end. Try again in a moment." }),
    { status: 200, headers: { 'Content-Type': 'application/json', ...headers } }
  );
}

function getPublicConfig(client) {
  return {
    agentName:    client.agentName   || FALLBACK.agentName,
    agentRole:    client.agentRole   || FALLBACK.agentRole,
    brandColor:   client.brandColor  || '#6C47FF',
    greeting:     client.greeting,
    quickReplies: client.quickReplies,
  };
}

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin':  ALLOWED_ORIGIN,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
}
