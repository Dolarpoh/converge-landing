// api/outreach.js — Vercel Edge Function
// Generates personalised cold outreach emails for Dolapo via Groq/Claude.
// Called by public/outreach.html — keeps the API key server-side.
//
// Required env vars:
//   GROQ_API_KEY

export const config = { runtime: 'edge' };

const ALLOWED_ORIGIN = '*';

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

  const { systemPrompt, userPrompt, maxTokens } = body;

  if (!systemPrompt || !userPrompt) {
    return new Response('Missing systemPrompt or userPrompt', { status: 400 });
  }

  const groqKey = process.env.GROQ_API_KEY;
  if (!groqKey) {
    return new Response('API key not configured', { status: 500 });
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
          { role: 'system', content: systemPrompt },
          { role: 'user',   content: userPrompt   },
        ],
        max_tokens:  maxTokens || 1000,
        temperature: 0.75,
        top_p:       0.9,
      }),
    });

    if (!groqRes.ok) {
      console.error('Groq error:', await groqRes.text());
      return new Response(
        JSON.stringify({ error: 'Generation failed — try again.' }),
        { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders() } }
      );
    }

    const data  = await groqRes.json();
    const reply = data.choices?.[0]?.message?.content?.trim() || '';

    return new Response(JSON.stringify({ reply }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...corsHeaders() },
    });

  } catch (err) {
    console.error('Outreach handler error:', err);
    return new Response(
      JSON.stringify({ error: 'Server error — try again in a moment.' }),
      { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders() } }
    );
  }
}

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin':  ALLOWED_ORIGIN,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
}
