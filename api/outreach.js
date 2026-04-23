// api/outreach.js — Vercel Edge Function
// Called by converge-outreach.html
// Accepts { systemPrompt, userPrompt, maxTokens } and returns { reply }
//
// Required env var (already set): GROQ_API_KEY

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
  try {
    body = await req.json();
  } catch {
    return new Response('Invalid JSON', { status: 400 });
  }

  const { systemPrompt, userPrompt, maxTokens } = body;

  if (!systemPrompt || !userPrompt) {
    return new Response(
      JSON.stringify({ error: 'Missing systemPrompt or userPrompt' }),
      { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders() } }
    );
  }

  const groqKey = process.env.GROQ_API_KEY;
  if (!groqKey) {
    return new Response(
      JSON.stringify({ error: 'API key not configured' }),
      { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders() } }
    );
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
          { role: 'user',   content: userPrompt },
        ],
        max_tokens:  maxTokens || 1000,
        temperature: 0.72,
        top_p:       0.9,
      }),
    });

    if (!groqRes.ok) {
      const errText = await groqRes.text();
      console.error('Groq error:', errText);
      return new Response(
        JSON.stringify({ error: 'Groq API error', detail: errText }),
        { status: 502, headers: { 'Content-Type': 'application/json', ...corsHeaders() } }
      );
    }

    const data  = await groqRes.json();
    const reply = data.choices?.[0]?.message?.content?.trim() || '';

    return new Response(
      JSON.stringify({ reply }),
      { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders() } }
    );

  } catch (err) {
    console.error('Outreach handler error:', err);
    return new Response(
      JSON.stringify({ error: 'Internal error', detail: err.message }),
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
