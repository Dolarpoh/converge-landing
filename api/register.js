// api/register.js — Vercel Edge Function
// Called by widget.js on first load.
// Always returns the latest config from clients.json for known keys.
// Only scrapes + generates if the key is truly unknown.
//
// Required env vars in Vercel:
//   GROQ_API_KEY
//   GITHUB_TOKEN
//   GITHUB_REPO
//   GITHUB_BRANCH

export const config = { runtime: 'edge' };

const ALLOWED_ORIGIN = '*';

const PAGES_TO_SCRAPE = ['', '/about', '/pricing', '/products', '/shop', '/services', '/faq'];
const MAX_CHARS_PER_PAGE = 6000;
const MAX_TOTAL_CHARS = 20000;

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

  const { clientKey, siteUrl } = body;

  if (!clientKey || !siteUrl) {
    return new Response('Missing clientKey or siteUrl', { status: 400 });
  }

  let parsedUrl;
  try {
    parsedUrl = new URL(siteUrl.startsWith('http') ? siteUrl : `https://${siteUrl}`);
  } catch {
    return new Response('Invalid siteUrl', { status: 400 });
  }

  const baseUrl = `${parsedUrl.protocol}//${parsedUrl.hostname}`;

  try {
    // ── ALWAYS read the latest clients.json first ──────────────────────────
    // This means edits to clients.json take effect immediately on next load.
    // The old behaviour (early return on existing key) was preventing updates.
    const allClients = await getAllClients();
    
    if (allClients[clientKey]) {
      // Key exists — return the CURRENT value from clients.json, not a cached copy
      return new Response(JSON.stringify({
        success: true,
        config: getPublicConfig(allClients[clientKey]),
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders() },
      });
    }

    // ── NEW KEY — scrape, generate, save ────────────────────────────────────
    const siteContent = await scrapeSite(baseUrl);
    const generatedConfig = await generateConfig(clientKey, baseUrl, siteContent);
    await saveClientConfig(clientKey, generatedConfig, allClients);

    return new Response(JSON.stringify({
      success: true,
      config: getPublicConfig(generatedConfig),
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...corsHeaders() },
    });

  } catch (err) {
    console.error('Register error:', err);
    return new Response(JSON.stringify({
      success: false,
      config: {
        agentName: 'Aria',
        agentRole: 'Sales Assistant',
        brandColor: '#6C47FF',
      },
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...corsHeaders() },
    });
  }
}

// ─── FETCH ALL CLIENTS FROM GITHUB ───────────────────────────────────────────
// Returns the full clients.json object. Always fetches fresh — no in-memory
// cache here so edits to the file are always reflected on next widget load.
async function getAllClients() {
  const token  = process.env.GITHUB_TOKEN;
  const repo   = process.env.GITHUB_REPO;
  const branch = process.env.GITHUB_BRANCH || 'main';

  if (!token || !repo) return {};

  try {
    const res = await fetch(
      `https://api.github.com/repos/${repo}/contents/public/clients.json?ref=${branch}`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/vnd.github+json',
          'X-GitHub-Api-Version': '2022-11-28',
        },
      }
    );
    if (!res.ok) return {};
    const file = await res.json();
    return JSON.parse(atob(file.content.replace(/\n/g, '')));
  } catch {
    return {};
  }
}

// ─── SCRAPER ─────────────────────────────────────────────────────────────────
async function scrapeSite(baseUrl) {
  let combined = '';

  for (const path of PAGES_TO_SCRAPE) {
    if (combined.length >= MAX_TOTAL_CHARS) break;

    try {
      const res = await fetch(`${baseUrl}${path}`, {
        headers: { 'User-Agent': 'Converge-Bot/1.0 (AI sales assistant setup)' },
        signal: AbortSignal.timeout(6000),
      });

      if (!res.ok) continue;

      const html = await res.text();
      const text = extractText(html);

      if (text.length > 50) {
        combined += `\n\n--- Page: ${baseUrl}${path || '/'} ---\n${text.slice(0, MAX_CHARS_PER_PAGE)}`;
      }
    } catch {
      continue;
    }
  }

  return combined.slice(0, MAX_TOTAL_CHARS);
}

function extractText(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<nav[\s\S]*?<\/nav>/gi, '')
    .replace(/<footer[\s\S]*?<\/footer>/gi, '')
    .replace(/<header[\s\S]*?<\/header>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

// ─── PROMPT GENERATOR ────────────────────────────────────────────────────────
async function generateConfig(clientKey, siteUrl, siteContent) {
  const groqKey = process.env.GROQ_API_KEY;

  const metaPrompt = `You are setting up an AI sales assistant for a business website.
Based on the website content below, generate a JSON config object for their AI sales assistant.

Website URL: ${siteUrl}
Website content:
${siteContent}

Return ONLY valid JSON (no markdown, no explanation) with this exact structure:
{
  "agentName": "A friendly first name that fits the brand (e.g. Aria, Sam, Max, Nova)",
  "agentRole": "A short role title (e.g. Sales Assistant, Shopping Guide, AI Advisor)",
  "brandColor": "A hex color that matches the brand aesthetic (e.g. #6C47FF). Default to #6C47FF if unsure.",
  "greeting": "A warm, specific opening message (1-2 sentences) that references the business by name and asks what the visitor needs",
  "quickReplies": ["4 short button labels relevant to this specific business"],
  "systemPrompt": "A detailed system prompt (300-500 words) that includes:\\n- What the business does and who it serves\\n- Key products, services, or offerings with any prices mentioned\\n- Tone and personality guidance that matches the brand\\n- How to handle common questions and objections\\n- Clear CTA: what action should the visitor take (buy, book, sign up, etc.)\\n\\nRules to embed in the prompt:\\n- 2-4 sentences per reply\\n- End every message with one question or one CTA\\n- Never invent details not found on the site\\n- Warm and human, never corporate"
}`;

  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${groqKey}`,
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages: [{ role: 'user', content: metaPrompt }],
      max_tokens: 1200,
      temperature: 0.4,
    }),
  });

  const data = await res.json();
  const raw = data.choices?.[0]?.message?.content?.trim() || '';
  const cleaned = raw.replace(/```json|```/g, '').trim();

  let parsed;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    parsed = {
      agentName: 'Aria',
      agentRole: 'Sales Assistant',
      brandColor: '#6C47FF',
      greeting: `Hi! I'm Aria — happy to help you find what you're looking for. What brings you here today?`,
      quickReplies: ['Tell me more', 'How does this work?', 'Pricing?', 'Get in touch'],
      systemPrompt: `You are Aria, a helpful AI sales assistant for ${siteUrl}. Help visitors understand the business and guide them toward a next step. Keep replies to 2-4 sentences. End every message with a question or CTA.`,
    };
  }

  parsed.siteUrl = siteUrl;
  parsed.generatedAt = new Date().toISOString();

  return parsed;
}

// ─── GITHUB STORAGE ──────────────────────────────────────────────────────────
// Receives the already-fetched allClients object to avoid a second API call.
async function saveClientConfig(clientKey, config, allClients = {}) {
  const token  = process.env.GITHUB_TOKEN;
  const repo   = process.env.GITHUB_REPO;
  const branch = process.env.GITHUB_BRANCH || 'main';
  const path   = 'public/clients.json';

  if (!token || !repo) {
    console.warn('GitHub env vars not set — skipping save');
    return;
  }

  const apiBase = `https://api.github.com/repos/${repo}/contents/${path}`;
  const headers = {
    'Authorization': `Bearer ${token}`,
    'Accept': 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'Content-Type': 'application/json',
  };

  let sha;
  try {
    const getRes = await fetch(`${apiBase}?ref=${branch}`, { headers });
    if (getRes.ok) {
      const file = await getRes.json();
      sha = file.sha;
    }
  } catch {
    // File doesn't exist yet — will be created
  }

  // Only write if key doesn't already exist
  if (allClients[clientKey]) return;

  allClients[clientKey] = config;

  const content = btoa(unescape(encodeURIComponent(JSON.stringify(allClients, null, 2))));

  await fetch(apiBase, {
    method: 'PUT',
    headers,
    body: JSON.stringify({
      message: `Add client config: ${clientKey}`,
      content,
      branch,
      ...(sha ? { sha } : {}),
    }),
  });
}

function getPublicConfig(config) {
  return {
    agentName:    config.agentName,
    agentRole:    config.agentRole,
    brandColor:   config.brandColor,
    greeting:     config.greeting,
    quickReplies: config.quickReplies,
  };
}

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin':  ALLOWED_ORIGIN,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
}
