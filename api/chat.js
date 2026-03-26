// api/chat.js  — Vercel Edge Function
// Deploy this inside an /api folder at the root of your Vercel project.
// Set GROQ_API_KEY in Vercel → Project Settings → Environment Variables.

export const config = { runtime: 'edge' };

const ALLOWED_ORIGIN = '*'; // Lock this down to your domain in production e.g. 'https://converge-landing-mbgp.vercel.app'

const SYSTEM_PROMPT = `You are Aria, an expert AI sales closer embedded on this website. Your job is to:
1. Warmly greet visitors and understand what brought them here
2. Ask smart qualifying questions (team size, use case, urgency) — one at a time, never interrogate
3. Match their needs to the right plan or service
4. Handle objections about price, timing, and competitors with empathy and concrete value framing
5. Guide them toward a clear next step: start a trial, book a demo, or speak to a human

Rules:
- Keep every reply to 2-3 sentences max. Be human, warm, and direct.
- Never sound robotic or use corporate jargon
- If someone asks to speak to a human, say "Absolutely — I'll flag you as a priority lead. Can I grab your email so the team can reach out?"
- If someone asks about pricing, give a direct honest answer then bridge to value
- If the user says 'Yes' or 'Start trial', do not repeat the offer. Instead, provide the next steps or ask for their email
- Never make up features or prices you don't know — say "Great question — the team can confirm that exactly, want me to get them to reach out?"
- End each message with either a question or a clear call to action`;

export default async function handler(req) {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });
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

  const { messages } = body;
  if (!messages || !Array.isArray(messages)) {
    return new Response('Missing messages array', { status: 400 });
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
          { role: 'system', content: SYSTEM_PROMPT },
          ...messages.slice(-12), // last 12 turns for context window
        ],
        max_tokens: 180,
        temperature: 0.7,
      }),
    });

    if (!groqRes.ok) {
      const err = await groqRes.text();
      console.error('Groq error:', err);
      // Return a graceful fallback so the widget doesn't break
      return new Response(
        JSON.stringify({ reply: "Sorry, I'm having a moment — could you say that again?" }),
        { status: 200, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': ALLOWED_ORIGIN } }
      );
    }

    const data = await groqRes.json();
    const reply = data.choices?.[0]?.message?.content?.trim()
      || "I didn't quite catch that — could you rephrase?";

    return new Response(JSON.stringify({ reply }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
      },
    });
  } catch (err) {
    console.error('Handler error:', err);
    return new Response(
      JSON.stringify({ reply: "Connection issue on my end — try again in a moment." }),
      { status: 200, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': ALLOWED_ORIGIN } }
    );
  }
}
