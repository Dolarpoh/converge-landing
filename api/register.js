// api/register.js — Vercel Edge Function
// Called by widget.js on first load for any unknown key.
// Scrapes the customer's site, generates a system prompt, saves to clients.json via GitHub API.
//
// Required env vars in Vercel:
//   GROQ_API_KEY       — for prompt generation
//   GITHUB_TOKEN       — personal access token with repo write access
//   GITHUB_REPO        — e.g. "yourname/converge"
//   GITHUB_BRANCH      — e.g. "main"

export const config = { runtime: 'edge' };

const ALLOWED_ORIGIN = '*';

const PAGES_TO_SCRAPE = ['', '/about', '/pricing', '/products', '/shop', '/services', '/faq'];
const MAX_CHARS_PER_PAGE = 6000;
const MAX_TOTAL_CHARS = 20000;

export default async function handler(req) {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: corsHeaders(),
    });
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

  // Basic URL validation
  let parsedUrl;
  try {
    parsedUrl = new URL(siteUrl.startsWith('http') ? siteUrl : `https://${siteUrl}`);
  } catch {
    return new Response('Invalid siteUrl', { status: 400 });
  }

  const baseUrl = `${parsedUrl.protocol}//${parsedUrl.hostname}`;

  try {
    // 1. Scrape the site
    const siteContent = await scrapeSite(baseUrl);

    // 2. Generate system prompt via Groq
    const config = await generateConfig(clientKey, baseUrl, siteContent);

    // 3. Save to clients.json via GitHub API
    await saveClientConfig(clientKey, config);

    return new Response(JSON.stringify({
      success: true,
      config: getPublicConfig(config),
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...corsHeaders() },
    });

  } catch (err) {
    console.error('Register error:', err);
    // Return a generic fallback so the widget still works
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
      // Skip pages that time out or fail
      continue;
    }
  }

  return combined.slice(0, MAX_TOTAL_CHARS);
}

// Strip HTML tags and collapse whitespace
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

  // Strip any accidental markdown fences
  const cleaned = raw.replace(/```json|```/g, '').trim();

  let parsed;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    // If JSON parse fails, return a sensible fallback
    parsed = {
      agentName: 'Aria',
      agentRole: 'Sales Assistant',
      brandColor: '#6C47FF',
      greeting: `Hi! I'm Aria — happy to help you find what you're looking for. What brings you here today?`,
      quickReplies: ['Tell me more', 'How does this work?', 'Pricing?', 'Get in touch'],
      systemPrompt: `You are Aria, a helpful AI sales assistant for ${siteUrl}. Help visitors understand the business and guide them toward a next step. Keep replies to 2-4 sentences. End every message with a question or CTA.`,
    };
  }

  // Always store the source URL
  parsed.siteUrl = siteUrl;
  parsed.generatedAt = new Date().toISOString();

  return parsed;
}

// ─── GITHUB STORAGE ──────────────────────────────────────────────────────────
async function saveClientConfig(clientKey, config) {
  const token  = process.env.GITHUB_TOKEN;
  const repo   = process.env.GITHUB_REPO;   // e.g. "yourname/converge"
  const branch = process.env.GITHUB_BRANCH || 'main';
  const path   = 'clients.json';

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

  // Fetch current file (need its SHA to update)
  let currentData = {};
  let sha;
  try {
    const getRes = await fetch(`${apiBase}?ref=${branch}`, { headers });
    if (getRes.ok) {
      const file = await getRes.json();
      sha = file.sha;
      currentData = JSON.parse(atob(file.content.replace(/\n/g, '')));
    }
  } catch {
    // File doesn't exist yet — will be created
  }

  // Merge new client in
  currentData[clientKey] = config;

  const content = btoa(unescape(encodeURIComponent(JSON.stringify(currentData, null, 2))));

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
    agentName:   config.agentName,
    agentRole:   config.agentRole,
    brandColor:  config.brandColor,
    greeting:    config.greeting,
    quickReplies: config.quickReplies,
  };
}

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
}
