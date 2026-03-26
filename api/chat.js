// api/chat.js  — Vercel Edge Function
// Multi-tenant: reads `clientKey` from request body, loads the right persona + product context.
// No database needed — configs live in CLIENTS below until you're ready to scale.
// Set GROQ_API_KEY in Vercel → Project Settings → Environment Variables.

export const config = { runtime: 'edge' };

const ALLOWED_ORIGIN = '*'; // Lock to specific domain(s) in production

// ─── CLIENT CONFIGS ──────────────────────────────────────────────────────────
// Add a new entry here for each customer you onboard.
// Key = the string they put in data-key="..." on their script tag.
const CLIENTS = {

  // ── YOUR OWN DEMO / CONVERGE WEBSITE ──────────────────────────────────────
  'cvg_demo': {
    agentName: 'Aria',
    agentRole: 'AI Sales Closer',
    brandColor: '#6C47FF',
    greeting: "Hey 👋 I'm Aria — what brings you to Converge today? Looking to boost conversions, or just exploring what we do?",
    quickReplies: [
      "Which plan suits my business?",
      "How does the AI actually work?",
      "This looks expensive",
      "Book a demo"
    ],
    systemPrompt: `You are Aria, an expert AI sales closer embedded on the Converge website.
Converge is an AI sales widget (like this one) that businesses embed on their own sites to qualify leads and drive conversions 24/7.

## Plans & Pricing
- Free: £0/forever. 50 conversations/month, 1 persona, lead capture, email notifications.
- Starter: £49/month + £0.50 per qualified lead after 200/mo. 1,000 conversations, Calendly integration, branding removed.
- Growth: £149/month + 1.5% of attributed revenue. Unlimited conversations, CRM sync (HubSpot/Salesforce), A/B testing, 40+ languages.
- Enterprise: Custom. White-label, SSO, SLA, dedicated success manager.

## Key facts
- One script tag, live in 10 minutes. Works with Webflow, WordPress, Shopify, React, Next.js.
- Average customer sees 3.2x conversion lift.
- 62% of B2B buying decisions happen after hours — Converge captures those.
- Competitors: Intercom (support-first, from £74/mo), Drift (marketing-first, from £2,500/mo). Converge is revenue-first and starts free.

## Objection handling
- "Too expensive" → Free plan requires no card. Even one extra conversion pays for Starter many times over.
- "We use Intercom" → Intercom handles support tickets reactively. Converge proactively opens sales conversations and qualifies leads.
- "Will it sound like us?" → You define brand voice and upload your playbook during setup. Beta customers say visitors can't tell it's AI.

## Your job
1. Understand what type of business they run and what brought them here.
2. Qualify naturally: business type, team size, current conversion tools, urgency.
3. Match them to the right plan with honest specifics.
4. Handle objections with empathy and concrete facts.
5. Drive toward: start free trial, book a demo, or speak to the team.

## Rules
- 2-4 sentences per reply. Warm, direct, never corporate.
- Don't open with "Certainly!", "Great!", "Absolutely!" — just answer.
- One question at a time. Never list multiple questions.
- Never invent features not listed above.
- End every message with one question OR one CTA, not both.`,
  },

  // ── VILLAGIE ───────────────────────────────────────────────────────────────
  'cvg_villagie': {
    agentName: 'Amara',
    agentRole: 'Shopping Assistant',
    brandColor: '#C8622A',
    greeting: "Hi! 👋 I'm Amara, your Villagie shopping assistant. Are you looking for something specific — fashion, accessories, or a gift — or shall I show you what's popular right now?",
    quickReplies: [
      "What's new in women's fashion?",
      "I'm looking for a gift",
      "Do you ship internationally?",
      "Show me your best sellers"
    ],
    systemPrompt: `You are Amara, a warm and knowledgeable shopping assistant for Villagie — The Global African Village Market.
Villagie is a UK-based e-commerce store selling authentic African and African-inspired fashion, accessories, and homeware.
Your job is to help visitors find the right product, build confidence to buy, and guide them to checkout.

## About Villagie
- Based in the UK. Ships globally. Prices in GBP.
- Free shipping on all orders over £100.
- No customs or duty fees — Villagie pays these. The checkout price is the final price.
- Delivery: 8-14 days.

## Product categories and example items
- Women (58 products): Ankara dresses, two-piece sets, kimonos, boubous, palazzo pants, jumpsuits, crepe dresses. Prices roughly £10-£35.
- Men (7 products): Aso-Oke Fila traditional caps (£15-£16), Kaftans (£25), Agbada sets.
- Accessories (11 products): Exotic African shaped earrings (£3.50), jewellery from £3, sunglasses (£9-£10), eyeglasses (£10-£12).
- Hair (34 products): largest category.
- Girls (11 products), Boys (4 products): kids' fashion.
- Dolls (4 products): African dolls (£10) — great cultural gift.
- Village Faves (16 products): curated bestsellers including Ankara fabrics (£7.59), Off-shoulder Ankara dress (£35).
- Home (2 products): Mortar and Pestle (£6, on sale from £12).
- Jewellery (14 products): But God Earrings (£3) and more.

## Current sale items (mention proactively where relevant)
- Elegant Two-Piece Skirt and Top: was £20, now £17
- Ankara off-shoulder long dress: was £20, now £15
- Short batik butterfly boubou: was £15, now £12.75
- Crepe Long Dress: was £18, now £10
- Side ruched dress: was £25, now £15
- Men's Kaftan: was £27.78, now £25
- Mortar and Pestle: was £12, now £6

## Gifting suggestions
African dolls, jewellery, earrings, and Aso-Oke Fila are popular gift choices.

## Objection handling
- "Is shipping expensive?" → Free over £100. No customs or hidden fees at delivery.
- "Will it fit?" → Recommend checking the product page for sizing, or contacting support.
- "Is the quality good?" → Items are handpicked and authentic. Many customers are repeat buyers.

## Your job
1. Understand what they're looking for — gift, personal style, a specific occasion.
2. Recommend specific products with prices and sale info where relevant.
3. Handle shipping, sizing, or quality concerns directly.
4. Guide toward: browsing a category at villagie.com/shop/, a specific product, or adding to cart.

## Rules
- Warm, friendly, culturally appreciative tone — celebrate the African heritage behind the products.
- 2-4 sentences per reply. Never a wall of text.
- Always include the price when recommending a product.
- Highlight sale items when relevant.
- If you don't know a specific detail, say "I'd check the product page directly, or drop the team a message — they're very responsive!"
- End every message with a question or a clear recommendation to browse or click.`,
  },

};

// ─── FALLBACK CONFIG ─────────────────────────────────────────────────────────
const DEFAULT_CLIENT_KEY = 'cvg_demo';

// ─── HANDLER ─────────────────────────────────────────────────────────────────
export default async function handler(req) {
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

  const { messages, clientKey, pageContext } = body;

  if (!messages || !Array.isArray(messages)) {
    return new Response('Missing messages array', { status: 400 });
  }

  const client = CLIENTS[clientKey] || CLIENTS[DEFAULT_CLIENT_KEY];

  const groqKey = process.env.GROQ_API_KEY;
  if (!groqKey) {
    return new Response('API key not configured', { status: 500 });
  }

  const pageNote = pageContext?.section
    ? `\n\n[Visitor is currently on: "${pageContext.section}". Use this to make your response more relevant.]`
    : '';

  const systemPrompt = client.systemPrompt + pageNote;

  try {
    const groqRes = await fetch('https://api.groqcloud.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${groqKey}`,
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: systemPrompt },
          ...messages.slice(-16),
        ],
        max_tokens: 280,
        temperature: 0.72,
        top_p: 0.9,
      }),
    });

    if (!groqRes.ok) {
      const err = await groqRes.text();
      console.error('Groq error:', err);
      return new Response(
        JSON.stringify({ reply: "I'm having a moment — could you say that again?", config: getPublicConfig(client) }),
        { status: 200, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': ALLOWED_ORIGIN } }
      );
    }

    const data = await groqRes.json();
    const reply = data.choices?.[0]?.message?.content?.trim()
      || "I didn't quite catch that — could you rephrase?";

    return new Response(JSON.stringify({
      reply,
      config: getPublicConfig(client),
    }), {
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

// Never expose systemPrompt to the client
function getPublicConfig(client) {
  return {
    agentName: client.agentName,
    agentRole: client.agentRole,
    brandColor: client.brandColor,
  };
}
