(function () {
  'use strict';

  const scriptTag =
    document.currentScript ||
    document.querySelector('script[src*="converge-landing-ecru"]') ||
    document.querySelector('script[data-key]');

  const CLIENT_KEY    = scriptTag?.dataset?.key || 'cvg_demo';
  const SITE_URL      = window.location.origin;
  const CHAT_ENDPOINT = 'https://converge-landing-ecru.vercel.app/api/chat';
  const REG_ENDPOINT  = 'https://converge-landing-ecru.vercel.app/api/register';

  // ─── STATE ────────────────────────────────────────────────────────────────
  let isOpen = false;
  let isTyping = false;
  let conversationHistory = [];

  let CONFIG = {
    agentName:    'Aria',
    agentRole:    'Sales Assistant',
    brandColor:   scriptTag?.dataset?.color || '#6C47FF',
    greeting:     null,
    quickReplies: ['Tell me more', 'How does this work?', 'Pricing?', 'I have a question'],
  };

  // ─── REGISTRATION ─────────────────────────────────────────────────────────
  // Register fires before the widget is rendered. Once we have the config
  // (or have timed out) we build the DOM with the correct values already in
  // CONFIG, then call showGreeting(). This eliminates the race where buildWidget
  // hard-codes "Aria" into the DOM before applyConfig() can correct it.
  async function register() {
    try {
      const res = await fetch(REG_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientKey: CLIENT_KEY, siteUrl: SITE_URL }),
      });
      const data = await res.json();
      if (data.config) applyConfig(data.config); // mutates CONFIG in-place
    } catch {
      // Falls back to defaults — widget still works
    }
  }

  // Mutates CONFIG. Called before DOM build (from register) or after
  // (from chat responses that return a config object).
  function applyConfig(cfg) {
    if (cfg.brandColor)   CONFIG.brandColor   = cfg.brandColor;
    if (cfg.agentName)    CONFIG.agentName    = cfg.agentName;
    if (cfg.agentRole)    CONFIG.agentRole    = cfg.agentRole;
    if (cfg.greeting)     CONFIG.greeting     = cfg.greeting;
    if (cfg.quickReplies) CONFIG.quickReplies = cfg.quickReplies;

    // If the DOM is already built, patch it live (e.g. config returned mid-chat)
    const nameEl   = document.getElementById('cvg-header-name');
    const avatarEl = document.getElementById('cvg-avatar-letter');
    const subEl    = document.getElementById('cvg-header-sub');
    if (nameEl)   nameEl.textContent   = CONFIG.agentName;
    if (avatarEl) avatarEl.textContent = CONFIG.agentName[0];
    if (subEl)    subEl.textContent    = CONFIG.agentRole + ' · Active now';

    // Re-apply colour tokens if colour changed after build
    if (cfg.brandColor && styleEl) applyStyles(cfg.brandColor);
  }

  // ─── PAGE CONTEXT ─────────────────────────────────────────────────────────
  function getPageContext() {
    const hash = window.location.hash?.replace('#', '') || '';
    const labels = {
      compare:  'Comparison vs Alternatives',
      pricing:  'Pricing',
      faq:      'FAQ',
      showcase: 'Product Demo',
      for:      "Who It's For",
      shop:     'Shop',
      cart:     'Cart',
      product:  'Product Page',
    };
    if (hash && labels[hash]) return { section: labels[hash] };
    if (window.__cvgActiveSection)
      return { section: labels[window.__cvgActiveSection] || window.__cvgActiveSection };
    const path = window.location.pathname;
    if (path.includes('/shop'))    return { section: 'Shop' };
    if (path.includes('/cart'))    return { section: 'Cart' };
    if (path.includes('/product')) return { section: 'Product Page' };
    if (path.includes('/contact')) return { section: 'Contact Page' };
    if (path.includes('/hair'))    return { section: 'Hair & Wigs category page' };
    if (path.includes('/women'))   return { section: "Women's category page" };
    if (path.includes('/men'))     return { section: "Men's category page" };
    if (path.includes('/jewellery') || path.includes('/jewelry'))
      return { section: 'Jewellery category page' };
    if (path.includes('/accessories')) return { section: 'Accessories category page' };
    if (path.includes('/kids') || path.includes('/girls') || path.includes('/boys'))
      return { section: "Kids' category page" };
    if (path.includes('/home'))    return { section: 'Homeware category page' };
    return { section: 'Homepage' };
  }

  function initSectionObserver() {
    const ids = ['compare', 'pricing', 'faq', 'showcase', 'for', 'shop'];
    const obs = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (e.isIntersecting && ids.includes(e.target.id))
          window.__cvgActiveSection = e.target.id;
      });
    }, { threshold: 0.3 });
    document.querySelectorAll('[id]').forEach(el => {
      if (ids.includes(el.id)) obs.observe(el);
    });
  }

  // ─── STYLES ───────────────────────────────────────────────────────────────
  function buildStyles(color) {
    return `
    #cvg-root * { box-sizing: border-box; margin: 0; padding: 0; font-family: 'DM Sans', -apple-system, BlinkMacSystemFont, sans-serif; }
    #cvg-root { position: fixed; bottom: 24px; right: 24px; z-index: 999999; display: flex; flex-direction: column; align-items: flex-end; gap: 12px; }
    #cvg-launcher { width: 56px; height: 56px; border-radius: 50%; background: ${color}; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 24px ${color}70; transition: transform 0.2s ease, box-shadow 0.2s ease; position: relative; flex-shrink: 0; }
    #cvg-launcher:hover { transform: scale(1.07); }
    #cvg-launcher:active { transform: scale(0.96); }
    #cvg-launcher-icon, #cvg-close-icon { position: absolute; transition: opacity 0.2s, transform 0.2s; }
    #cvg-launcher-icon { opacity: 1; transform: scale(1); }
    #cvg-close-icon    { opacity: 0; transform: scale(0.5); }
    #cvg-root.open #cvg-launcher-icon { opacity: 0; transform: scale(0.5); }
    #cvg-root.open #cvg-close-icon    { opacity: 1; transform: scale(1); }
    #cvg-unread { position: absolute; top: -2px; right: -2px; width: 16px; height: 16px; border-radius: 50%; background: #FF4D6D; border: 2px solid #fff; font-size: 9px; font-weight: 700; color: #fff; display: flex; align-items: center; justify-content: center; opacity: 0; transform: scale(0); transition: all 0.2s; }
    #cvg-unread.show { opacity: 1; transform: scale(1); }
    #cvg-window { width: 360px; height: 520px; background: #ffffff; border-radius: 20px; box-shadow: 0 8px 40px rgba(0,0,0,0.18), 0 0 0 1px rgba(0,0,0,0.06); display: flex; flex-direction: column; overflow: hidden; opacity: 0; transform: translateY(16px) scale(0.96); pointer-events: none; transition: opacity 0.25s ease, transform 0.25s ease; transform-origin: bottom right; }
    #cvg-root.open #cvg-window { opacity: 1; transform: translateY(0) scale(1); pointer-events: all; }
    #cvg-header { background: ${color}; padding: 16px 18px; display: flex; align-items: center; gap: 12px; flex-shrink: 0; }
    #cvg-avatar { width: 40px; height: 40px; border-radius: 50%; background: rgba(255,255,255,0.2); display: flex; align-items: center; justify-content: center; font-size: 16px; font-weight: 600; color: #fff; flex-shrink: 0; position: relative; }
    #cvg-status-dot { position: absolute; bottom: 1px; right: 1px; width: 10px; height: 10px; border-radius: 50%; background: #2ECC71; border: 2px solid ${color}; }
    #cvg-header-info { flex: 1; }
    #cvg-header-name { font-size: 15px; font-weight: 600; color: #fff; line-height: 1.2; }
    #cvg-header-sub  { font-size: 11px; color: rgba(255,255,255,0.7); margin-top: 1px; }
    #cvg-powered { font-size: 10px; color: rgba(255,255,255,0.45); border: 1px solid rgba(255,255,255,0.2); padding: 2px 7px; border-radius: 20px; letter-spacing: 0.02em; }
    #cvg-messages { flex: 1; overflow-y: auto; padding: 16px; display: flex; flex-direction: column; gap: 10px; background: #F8F7FF; scroll-behavior: smooth; }
    #cvg-messages::-webkit-scrollbar { width: 4px; }
    #cvg-messages::-webkit-scrollbar-thumb { background: #ddd; border-radius: 4px; }
    .cvg-msg { max-width: 82%; font-size: 13.5px; line-height: 1.55; padding: 10px 13px; border-radius: 14px; animation: cvgFadeIn 0.2s ease; word-wrap: break-word; }
    @keyframes cvgFadeIn { from { opacity:0; transform:translateY(6px); } to { opacity:1; transform:translateY(0); } }
    .cvg-msg.ai { background: #ffffff; color: #1a1a2e; align-self: flex-start; border-bottom-left-radius: 4px; box-shadow: 0 1px 4px rgba(0,0,0,0.07); }
    .cvg-msg.user { background: ${color}; color: #ffffff; align-self: flex-end; border-bottom-right-radius: 4px; }
    #cvg-typing { display: none; align-self: flex-start; background: #ffffff; border-radius: 14px; border-bottom-left-radius: 4px; padding: 12px 16px; box-shadow: 0 1px 4px rgba(0,0,0,0.07); gap: 4px; align-items: center; }
    #cvg-typing.show { display: flex; }
    .cvg-dot { width: 7px; height: 7px; border-radius: 50%; background: #bbb; animation: cvgBounce 1.2s infinite ease-in-out; }
    .cvg-dot:nth-child(2) { animation-delay: 0.15s; }
    .cvg-dot:nth-child(3) { animation-delay: 0.3s; }
    @keyframes cvgBounce { 0%,60%,100%{transform:translateY(0)} 30%{transform:translateY(-5px)} }
    #cvg-quick-replies { display: flex; flex-wrap: wrap; gap: 6px; padding: 8px 14px; background: #F8F7FF; flex-shrink: 0; }
    .cvg-qr { font-size: 12px; padding: 6px 12px; border-radius: 20px; border: 1.5px solid ${color}; color: ${color}; background: rgba(0,0,0,0.02); cursor: pointer; transition: all 0.15s; font-family: inherit; font-weight: 500; white-space: nowrap; }
    .cvg-qr:hover { background: ${color}; color: #fff; }
    #cvg-input-area { display: flex; align-items: center; gap: 8px; padding: 10px 14px 14px; background: #fff; border-top: 1px solid rgba(0,0,0,0.06); flex-shrink: 0; }
    #cvg-input { flex: 1; border: 1.5px solid #e8e8f0; border-radius: 22px; padding: 9px 14px; font-size: 13px; outline: none; font-family: inherit; color: #1a1a2e; background: #fafafa; transition: border-color 0.15s; }
    #cvg-input:focus { border-color: ${color}; background: #fff; }
    #cvg-input::placeholder { color: #aaa; }
    #cvg-send { width: 36px; height: 36px; border-radius: 50%; background: ${color}; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; flex-shrink: 0; transition: transform 0.15s, opacity 0.15s; }
    #cvg-send:hover { transform: scale(1.08); }
    #cvg-send:active { transform: scale(0.94); }
    #cvg-send:disabled { opacity: 0.45; cursor: not-allowed; transform: none; }
    @media (max-width: 420px) { #cvg-window { width: calc(100vw - 24px); height: 480px; } #cvg-root { right: 12px; bottom: 12px; } }
    `;
  }

  let styleEl;
  function applyStyles(color) {
    if (!styleEl) { styleEl = document.createElement('style'); document.head.appendChild(styleEl); }
    styleEl.textContent = buildStyles(color);
  }

  // ─── BUILD DOM ────────────────────────────────────────────────────────────
  // Called AFTER register() resolves so CONFIG already holds the correct
  // agentName / agentRole / brandColor for this client. No more "Aria" flash.
  function buildWidget() {
    const font = document.createElement('link');
    font.rel = 'stylesheet';
    font.href = 'https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600&display=swap';
    document.head.appendChild(font);

    applyStyles(CONFIG.brandColor);

    const root = document.createElement('div');
    root.id = 'cvg-root';
    root.innerHTML = `
      <div id="cvg-window">
        <div id="cvg-header">
          <div id="cvg-avatar">
            <span id="cvg-avatar-letter">${CONFIG.agentName[0]}</span>
            <div id="cvg-status-dot"></div>
          </div>
          <div id="cvg-header-info">
            <div id="cvg-header-name">${CONFIG.agentName}</div>
            <div id="cvg-header-sub">${CONFIG.agentRole} · Active now</div>
          </div>
          <div id="cvg-powered">Converge</div>
        </div>
        <div id="cvg-messages">
          <div id="cvg-typing">
            <div class="cvg-dot"></div><div class="cvg-dot"></div><div class="cvg-dot"></div>
          </div>
        </div>
        <div id="cvg-quick-replies"></div>
        <div id="cvg-input-area">
          <input id="cvg-input" placeholder="Type a message..." autocomplete="off" />
          <button id="cvg-send" disabled>
            <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
              <path d="M1.5 7.5L13.5 1.5L9.5 7.5L13.5 13.5L1.5 7.5Z" fill="white" stroke="white" stroke-width="0.5" stroke-linejoin="round"/>
            </svg>
          </button>
        </div>
      </div>
      <button id="cvg-launcher" aria-label="Open chat">
        <span id="cvg-unread"></span>
        <span id="cvg-launcher-icon">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d="M21 15C21 15.5304 20.7893 16.0391 20.4142 16.4142C20.0391 16.7893 19.5304 17 19 17H7L3 21V5C3 4.46957 3.21071 3.96086 3.58579 3.58579C3.96086 3.21071 4.46957 3 5 3H19C19.5304 3 20.0391 3.21071 20.4142 3.58579C20.7893 3.96086 21 4.46957 21 5V15Z" fill="white" stroke="white" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </span>
        <span id="cvg-close-icon">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M15 5L5 15M5 5L15 15" stroke="white" stroke-width="2" stroke-linecap="round"/>
          </svg>
        </span>
      </button>
    `;
    document.body.appendChild(root);
    initSectionObserver();

    document.getElementById('cvg-launcher').addEventListener('click', toggleWidget);
    document.getElementById('cvg-send').addEventListener('click', sendMessage);
    document.getElementById('cvg-input').addEventListener('keydown', e => {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
    });
    document.getElementById('cvg-input').addEventListener('input', () => {
      document.getElementById('cvg-send').disabled =
        document.getElementById('cvg-input').value.trim() === '' || isTyping;
    });

    showGreeting();
  }

  function showGreeting() {
    const greeting = CONFIG.greeting ||
      `Hi! I'm ${CONFIG.agentName} — what brings you here today?`;
    addMessage('ai', greeting);
    showQuickReplies(CONFIG.quickReplies);
    showUnread();
  }

  // ─── WIDGET TOGGLE ────────────────────────────────────────────────────────
  function toggleWidget() {
    isOpen = !isOpen;
    document.getElementById('cvg-root').classList.toggle('open', isOpen);
    if (isOpen) {
      hideUnread();
      setTimeout(() => document.getElementById('cvg-input').focus(), 300);
    }
  }

  function showUnread() { const el = document.getElementById('cvg-unread'); el.textContent = '1'; el.classList.add('show'); }
  function hideUnread() { document.getElementById('cvg-unread').classList.remove('show'); }

  // ─── MESSAGES ─────────────────────────────────────────────────────────────
  function addMessage(role, text) {
    const msgs   = document.getElementById('cvg-messages');
    const typing = document.getElementById('cvg-typing');
    typing.classList.remove('show');
    const div = document.createElement('div');
    div.className = `cvg-msg ${role}`;
    div.textContent = text;
    msgs.insertBefore(div, typing);
    scrollToBottom();
    conversationHistory.push({ role: role === 'ai' ? 'assistant' : 'user', content: text });
  }

  function scrollToBottom() {
    const msgs = document.getElementById('cvg-messages');
    requestAnimationFrame(() => { msgs.scrollTop = msgs.scrollHeight; });
  }

  function showTyping() {
    isTyping = true;
    document.getElementById('cvg-typing').classList.add('show');
    document.getElementById('cvg-send').disabled = true;
    scrollToBottom();
  }

  function hideTyping() {
    isTyping = false;
    document.getElementById('cvg-typing').classList.remove('show');
    document.getElementById('cvg-send').disabled =
      document.getElementById('cvg-input').value.trim() === '';
  }

  // ─── QUICK REPLIES ────────────────────────────────────────────────────────
  function showQuickReplies(replies) {
    const container = document.getElementById('cvg-quick-replies');
    container.innerHTML = '';
    (replies || []).forEach(r => {
      const btn = document.createElement('button');
      btn.className = 'cvg-qr';
      btn.textContent = r;
      btn.addEventListener('click', () => { container.innerHTML = ''; sendMessageText(r); });
      container.appendChild(btn);
    });
  }

  // ─── SEND MESSAGE ─────────────────────────────────────────────────────────
  function sendMessage() {
    const input = document.getElementById('cvg-input');
    const text = input.value.trim();
    if (!text || isTyping) return;
    input.value = '';
    document.getElementById('cvg-send').disabled = true;
    document.getElementById('cvg-quick-replies').innerHTML = '';
    sendMessageText(text);
  }

  async function sendMessageText(text) {
    addMessage('user', text);
    showTyping();

    try {
      const res = await fetch(CHAT_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages:    conversationHistory.slice(-16),
          clientKey:   CLIENT_KEY,
          pageContext: getPageContext(),
        }),
      });

      const data = await res.json();
      hideTyping();

      if (data.config) applyConfig(data.config);

      const reply = data.reply || "I didn't quite catch that — could you rephrase?";
      addMessage('ai', reply);

    } catch {
      hideTyping();
      addMessage('ai', "Connection issue on my end — try again in a moment.");
    }
  }

  // ─── INIT ─────────────────────────────────────────────────────────────────
  // Register first, build widget after — guarantees correct name on first render.
  async function init() {
    await register();
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', buildWidget);
    } else {
      buildWidget();
    }
  }

  init();

})();
