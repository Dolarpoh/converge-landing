
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Converge — Outreach Generator</title>
<link href="https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Mono:wght@400;500&family=DM+Sans:wght@300;400;500&display=swap" rel="stylesheet">
<style>
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  :root {
    --ink: #0f0f0f; --ink-muted: #555; --ink-faint: #999;
    --surface: #fafaf8; --surface-raised: #ffffff; --border: #e2e0da;
    --accent-warm: #c8612a; --success: #2d6a4f; --radius: 2px; --radius-lg: 6px;
  }
  body { font-family: 'DM Sans', sans-serif; background: var(--surface); color: var(--ink); min-height: 100vh; }
  header { border-bottom: 1px solid var(--border); padding: 1.25rem 2rem; display: flex; align-items: center; gap: 1rem; background: var(--surface-raised); }
  .logo { font-family: 'DM Serif Display', serif; font-size: 1.15rem; color: var(--ink); }
  .logo span { color: var(--accent-warm); font-style: italic; }
  .badge { font-family: 'DM Mono', monospace; font-size: 0.65rem; font-weight: 500; letter-spacing: 0.08em; text-transform: uppercase; color: var(--ink-muted); background: #f0ede6; padding: 0.2rem 0.5rem; border-radius: 2px; }
  main { max-width: 860px; margin: 0 auto; padding: 3rem 2rem; }
  h1 { font-family: 'DM Serif Display', serif; font-size: clamp(1.8rem, 4vw, 2.6rem); line-height: 1.15; letter-spacing: -0.02em; margin-bottom: 0.75rem; }
  h1 em { font-style: italic; color: var(--accent-warm); }
  .subhead { font-size: 0.95rem; color: var(--ink-muted); font-weight: 300; line-height: 1.6; max-width: 560px; margin-bottom: 2.5rem; }
  .card { background: var(--surface-raised); border: 1px solid var(--border); border-radius: var(--radius-lg); padding: 2rem; margin-bottom: 1.5rem; }
  .card-label { font-family: 'DM Mono', monospace; font-size: 0.65rem; font-weight: 500; letter-spacing: 0.1em; text-transform: uppercase; color: var(--ink-faint); margin-bottom: 1rem; }
  .input-row { display: flex; gap: 0.75rem; align-items: flex-end; }
  .input-group { flex: 1; }
  label { display: block; font-size: 0.8rem; font-weight: 500; color: var(--ink-muted); margin-bottom: 0.4rem; }
  input[type="text"], textarea { width: 100%; background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius); padding: 0.65rem 0.85rem; font-family: 'DM Sans', sans-serif; font-size: 0.9rem; color: var(--ink); outline: none; transition: border-color 0.15s; }
  input:focus, textarea:focus { border-color: var(--ink); }
  textarea { resize: vertical; min-height: 80px; line-height: 1.5; }
  .btn { display: inline-flex; align-items: center; gap: 0.5rem; background: var(--ink); color: #fff; border: none; border-radius: var(--radius); padding: 0.7rem 1.4rem; font-family: 'DM Sans', sans-serif; font-size: 0.88rem; font-weight: 500; cursor: pointer; transition: background 0.15s, transform 0.1s; white-space: nowrap; }
  .btn:hover { background: #2a2a2a; } .btn:active { transform: scale(0.98); } .btn:disabled { background: #ccc; cursor: not-allowed; transform: none; }
  .btn-outline { background: transparent; color: var(--ink); border: 1px solid var(--border); }
  .btn-outline:hover { background: var(--surface); border-color: var(--ink); }
  .btn-copy { background: var(--surface); color: var(--ink); border: 1px solid var(--border); padding: 0.5rem 1rem; font-size: 0.82rem; }
  .btn-copy:hover { border-color: var(--ink); background: #f0ede6; }
  .btn-copy.copied { background: #e8f5e9; border-color: var(--success); color: var(--success); }
  .two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
  @media (max-width: 600px) { .two-col { grid-template-columns: 1fr; } .input-row { flex-direction: column; align-items: stretch; } main { padding: 2rem 1rem; } }
  .divider { display: flex; align-items: center; gap: 1rem; margin: 1.25rem 0; color: var(--ink-faint); font-size: 0.78rem; font-family: 'DM Mono', monospace; letter-spacing: 0.05em; }
  .divider::before, .divider::after { content: ''; flex: 1; height: 1px; background: var(--border); }
  .output-section { display: none; }
  .output-section.visible { display: block; }
  .output-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 1rem; flex-wrap: wrap; gap: 0.75rem; }
  .output-title { font-family: 'DM Serif Display', serif; font-size: 1.1rem; color: var(--ink); }
  .output-actions { display: flex; gap: 0.5rem; }
  .email-block { background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius); padding: 1.5rem; margin-bottom: 1rem; }
  .email-meta { font-family: 'DM Mono', monospace; font-size: 0.72rem; color: var(--ink-faint); margin-bottom: 0.75rem; }
  .email-subject { font-weight: 500; font-size: 0.88rem; color: var(--ink-muted); margin-bottom: 1rem; padding-bottom: 0.75rem; border-bottom: 1px solid var(--border); }
  .email-body { font-size: 0.9rem; line-height: 1.7; color: var(--ink); white-space: pre-wrap; font-weight: 300; }
  .status-bar { display: flex; align-items: center; gap: 0.6rem; font-size: 0.82rem; color: var(--ink-muted); padding: 0.75rem 0; }
  .spinner { width: 14px; height: 14px; border: 2px solid var(--border); border-top-color: var(--ink); border-radius: 50%; animation: spin 0.7s linear infinite; flex-shrink: 0; }
  @keyframes spin { to { transform: rotate(360deg); } }
  .error-bar { background: #fff3f3; border: 1px solid #f5c6c6; border-radius: var(--radius); padding: 0.75rem 1rem; font-size: 0.85rem; color: #c0392b; display: none; }
  .error-bar.visible { display: block; }
  .tip-row { display: flex; gap: 0.5rem; flex-wrap: wrap; margin-top: 0.75rem; }
  .tip { font-size: 0.75rem; color: var(--ink-muted); background: #f0ede6; padding: 0.25rem 0.6rem; border-radius: 2px; cursor: pointer; transition: background 0.1s; font-family: 'DM Mono', monospace; }
  .tip:hover { background: #e5e0d5; }
  .tone-row { display: flex; gap: 0.5rem; flex-wrap: wrap; }
  .tone-btn { font-size: 0.78rem; padding: 0.3rem 0.7rem; border: 1px solid var(--border); border-radius: 2px; background: transparent; cursor: pointer; font-family: 'DM Sans', sans-serif; color: var(--ink-muted); transition: all 0.1s; }
  .tone-btn.active { background: var(--ink); color: #fff; border-color: var(--ink); }
  .insight-box { background: #fdf8f3; border: 1px solid #e8ddd0; border-left: 3px solid var(--accent-warm); border-radius: var(--radius); padding: 1rem 1.25rem; margin-bottom: 1.25rem; font-size: 0.85rem; line-height: 1.6; color: var(--ink-muted); display: none; }
  .insight-box.visible { display: block; }
  .insight-box strong { color: var(--ink); font-weight: 500; }
  .count-badge { font-family: 'DM Mono', monospace; font-size: 0.7rem; background: #e8f5e9; color: var(--success); padding: 0.15rem 0.4rem; border-radius: 2px; margin-left: 0.5rem; }
  footer { text-align: center; padding: 2rem; font-size: 0.75rem; color: var(--ink-faint); font-family: 'DM Mono', monospace; border-top: 1px solid var(--border); margin-top: 2rem; }
</style>
</head>
<body>

<header>
  <div class="logo">Converge <span>Outreach</span></div>
  <div class="badge">Email Generator</div>
</header>

<main>
  <h1>Write a <em>closing email</em><br>in 30 seconds flat</h1>
  <p class="subhead">Paste a prospect's website. Get a personalised cold email written in Dolapo's voice — sharp, specific, and built to get a reply.</p>

  <div class="card">
    <div class="card-label">01 — Prospect Details</div>
    <div class="input-row" style="margin-bottom: 1rem;">
      <div class="input-group">
        <label>Prospect's website URL *</label>
        <input type="text" id="prospect-url" placeholder="https://theircompany.com" />
      </div>
    </div>
    <div class="two-col" style="margin-bottom: 1rem;">
      <div><label>First name (if known)</label><input type="text" id="prospect-name" placeholder="e.g. Charlie" /></div>
      <div><label>Their role (if known)</label><input type="text" id="prospect-role" placeholder="e.g. Founder, Head of Sales" /></div>
    </div>
    <div style="margin-bottom: 1rem;">
      <label>Anything specific you noticed about their site?</label>
      <textarea id="prospect-notes" placeholder="e.g. No live chat. Contact form only. High-ticket product with no qualification flow." rows="2"></textarea>
      <div class="tip-row">
        <span class="tip" onclick="addTip('No live chat or chatbot visible')">No live chat</span>
        <span class="tip" onclick="addTip('Contact form only, no real-time response')">Form only</span>
        <span class="tip" onclick="addTip('Strong traffic but weak conversion CTA')">Weak CTA</span>
        <span class="tip" onclick="addTip('High-ticket product with no qualification flow')">High-ticket, no qualifier</span>
        <span class="tip" onclick="addTip('Enterprise clients but site feels generic')">Enterprise mismatch</span>
      </div>
    </div>
    <div class="divider">tone</div>
    <div style="margin-bottom: 1.5rem;">
      <label style="margin-bottom: 0.5rem;">Email tone</label>
      <div class="tone-row">
        <button class="tone-btn active" onclick="setTone(this,'direct')">Direct & sharp</button>
        <button class="tone-btn" onclick="setTone(this,'consultative')">Consultative</button>
        <button class="tone-btn" onclick="setTone(this,'brief')">Ultra brief (5 lines)</button>
        <button class="tone-btn" onclick="setTone(this,'founder')">Founder to founder</button>
      </div>
    </div>
    <div class="input-row">
      <button class="btn" onclick="generateEmail()" id="gen-btn">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>
        Generate email
      </button>
      <button class="btn btn-outline" onclick="clearAll()">Clear</button>
    </div>
  </div>

  <div class="status-bar" id="status-bar" style="display:none;"><div class="spinner"></div><span id="status-text">Writing your email…</span></div>
  <div class="error-bar" id="error-bar"></div>

  <div class="output-section" id="output-section">
    <div class="insight-box" id="insight-box"></div>
    <div class="output-header">
      <div class="output-title">Your email <span class="count-badge" id="email-count"></span></div>
      <div class="output-actions">
        <button class="btn btn-copy" id="copy-btn" onclick="copyEmail()">Copy email</button>
        <button class="btn btn-outline" onclick="generateEmail()" style="font-size:0.82rem;padding:0.5rem 1rem;">Regenerate ↺</button>
      </div>
    </div>
    <div class="email-block">
      <div class="email-meta" id="email-meta"></div>
      <div class="email-subject" id="email-subject"></div>
      <div class="email-body" id="email-body"></div>
    </div>
    <div class="card" style="margin-top:1.5rem;padding:1.25rem 1.5rem;">
      <div class="card-label">Follow-up sequence</div>
      <p style="font-size:0.85rem;color:var(--ink-muted);line-height:1.6;margin-bottom:1rem;">No reply after 3 days? Generate a short follow-up that references the first email without being pushy.</p>
      <button class="btn btn-outline" onclick="generateFollowUp()" style="font-size:0.83rem;">Write follow-up email →</button>
    </div>
  </div>
</main>

<footer>Converge Outreach Tool · Built for Dolapo</footer>

<script>
const API_ENDPOINT = 'https://converge-landing-ecru.vercel.app/api/outreach';

let currentTone = 'direct', emailCount = 0, lastEmailBody = '', lastSubject = '', lastProspectUrl = '';

function setTone(btn, tone) {
  document.querySelectorAll('.tone-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active'); currentTone = tone;
}
function addTip(text) {
  const n = document.getElementById('prospect-notes');
  n.value = n.value ? n.value + '. ' + text : text;
}
function clearAll() {
  ['prospect-url','prospect-name','prospect-role','prospect-notes'].forEach(id => document.getElementById(id).value = '');
  document.getElementById('output-section').classList.remove('visible');
  document.getElementById('error-bar').classList.remove('visible');
  document.getElementById('status-bar').style.display = 'none';
}
function showError(msg) {
  const bar = document.getElementById('error-bar');
  bar.textContent = msg; bar.classList.add('visible');
  document.getElementById('status-bar').style.display = 'none';
}
function setStatus(text) {
  document.getElementById('status-text').textContent = text;
  document.getElementById('status-bar').style.display = 'flex';
  document.getElementById('error-bar').classList.remove('visible');
}
function toneDesc(tone) {
  return {
    direct: 'Direct and sharp. One clear observation about their site. One specific pain point. One concrete offer. No fluff.',
    consultative: 'Consultative and warm. Show research. Ask a question that makes them think. Offer comes naturally at the end.',
    brief: 'Ultra brief — 5 lines maximum. Subject, one observation, one offer, one CTA. Nothing more.',
    founder: 'Founder to founder. Peer-level tone. Acknowledge what they built. Candid about the gap. No sales language.'
  }[tone] || 'Direct and sharp.';
}

async function generateEmail() {
  const url = document.getElementById('prospect-url').value.trim();
  if (!url) { showError('Please enter the prospect\'s website URL.'); return; }
  const name  = document.getElementById('prospect-name').value.trim();
  const role  = document.getElementById('prospect-role').value.trim();
  const notes = document.getElementById('prospect-notes').value.trim();
  document.getElementById('gen-btn').disabled = true;
  setStatus('Writing your email…');
  document.getElementById('output-section').classList.remove('visible');
  lastProspectUrl = url;

  const systemPrompt = `You are writing cold outreach emails for Dolapo Durojaiye, founder of Converge — an AI sales closer that sits on websites, engages visitors 24/7, handles objections, qualifies leads, and books calls automatically. One script tag to install. Free 7-day pilot.

Dolapo: 12 years enterprise BD in West Africa, 83 clients across fintech/AI/SaaS, Converge is live at beta with 3.2x conversion lift, already deployed on a live client site.

Converge: built for revenue generation unlike Intercom (support) or Drift ($2,500/mo min). Starts free. Live in 10 minutes.

Rules:
- Open with ONE specific observation about their actual website
- Never "I came across your website" or generic openers
- Offer = FREE 7-day pilot, no card, one script tag
- Sign off as Dolapo
- No buzzwords. No "I hope this finds you well"
- Max 180 words body
- Include a specific subject line

Tone: ${toneDesc(currentTone)}`;

  const userPrompt = `Write a cold outreach email:

Website: ${url}
${name ? `Name: ${name}` : 'Name unknown — no name in opener'}
${role ? `Role: ${role}` : ''}
${notes ? `Observations: ${notes}` : ''}

Format:
SUBJECT: [subject]
---
[body only, no commentary]`;

  try {
    const res = await fetch(API_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ systemPrompt, userPrompt, maxTokens: 1000 })
    });
    if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.error || 'Server error ' + res.status); }
    const data = await res.json();
    const text = data.reply || '';
    const subject = (text.match(/SUBJECT:\s*(.+)/i) || [])[1]?.trim() || 'Following up on your website';
    const body    = (text.match(/---\s*([\s\S]+)/) || [])[1]?.trim() || text;
    lastEmailBody = body; lastSubject = subject; emailCount++;
    document.getElementById('email-subject').textContent = 'Subject: ' + subject;
    document.getElementById('email-body').textContent    = body;
    document.getElementById('email-meta').textContent    = `To: ${url.replace(/https?:\/\//,'').split('/')[0]} · ${new Date().toLocaleTimeString()}`;
    document.getElementById('email-count').textContent   = emailCount + ' generated';
    const ib = document.getElementById('insight-box');
    ib.innerHTML = `<strong>Sending tip:</strong> Don't use Gmail for cold outreach — use <strong>Brevo</strong> (free, 300/day) or send one at a time from your mail client. Follow up in exactly 3 days if no reply.`;
    ib.classList.add('visible');
    document.getElementById('output-section').classList.add('visible');
    document.getElementById('status-bar').style.display = 'none';
    document.getElementById('copy-btn').textContent = 'Copy email';
    document.getElementById('copy-btn').classList.remove('copied');
  } catch (err) {
    showError('Something went wrong: ' + err.message);
  } finally {
    document.getElementById('gen-btn').disabled = false;
  }
}

async function generateFollowUp() {
  if (!lastEmailBody) return;
  setStatus('Writing follow-up…');
  const systemPrompt = `Short follow-up emails for Dolapo Durojaiye (Converge founder). 3 days after initial email, no reply. 3-4 lines max. Reference original briefly. No "just checking in." One new reason to reply. Sign off as Dolapo.`;
  const userPrompt = `Follow-up to:\nSubject: ${lastSubject}\n${lastEmailBody}\n\nProspect: ${lastProspectUrl}\n\nFormat:\nSUBJECT: [subject]\n---\n[body]`;
  try {
    const res  = await fetch(API_ENDPOINT, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ systemPrompt, userPrompt, maxTokens: 400 }) });
    const data = await res.json();
    const text = data.reply || '';
    const subject = (text.match(/SUBJECT:\s*(.+)/i) || [])[1]?.trim() || 'Re: ' + lastSubject;
    const body    = (text.match(/---\s*([\s\S]+)/) || [])[1]?.trim() || text;
    document.getElementById('email-subject').textContent = 'Subject: ' + subject;
    document.getElementById('email-body').textContent    = body;
    document.getElementById('email-meta').textContent    = `Follow-up · Day 3 · ${new Date().toLocaleTimeString()}`;
    lastEmailBody = body; lastSubject = subject; emailCount++;
    document.getElementById('email-count').textContent = emailCount + ' generated';
    document.getElementById('status-bar').style.display = 'none';
    document.getElementById('copy-btn').textContent = 'Copy email';
    document.getElementById('copy-btn').classList.remove('copied');
  } catch (err) { showError('Follow-up failed: ' + err.message); }
}

function copyEmail() {
  const full = `Subject: ${document.getElementById('email-subject').textContent.replace('Subject: ','')}\n\n${document.getElementById('email-body').textContent}`;
  navigator.clipboard.writeText(full).then(() => {
    const btn = document.getElementById('copy-btn');
    btn.textContent = '✓ Copied'; btn.classList.add('copied');
    setTimeout(() => { btn.textContent = 'Copy email'; btn.classList.remove('copied'); }, 2500);
  });
}
</script>
</body>
</html>
