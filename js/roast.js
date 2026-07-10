/* ROAST ENGINE — modern brainrot violence for when you lose.
   - AURA: site-wide score economy (persisted). Deaths drain it. Wins farm it.
   - Tiered roasts: play badly → violated; mid → dismissed; new best → grudging respect.
   - Fake chat: reacts to your Ls in real time like a stream chat.
   - Skull rain + damage flash for maximum disrespect. */
window.PLAYLAB = window.PLAYLAB || { vis: {} };

(() => {
  const ROASTS = {
    brutal: [
      'NPC behavior detected 💀',
      'bro got fanum taxed by the game',
      'chat, he\'s cooked. actually cooked.',
      'L + ratio + no rizz + extinct',
      'certified Ohio gameplay',
      'you fell off before you even got on',
      'caught lacking in 4K ultra HD',
      'skill issue. terminal case.',
      'bro thought he was him. he was NOT him.',
      'gg go next. (next won\'t help)',
      'that was NOT very sigma of you',
      'my brother in christ you had ONE job',
      'bro is farming Ls like it\'s a side quest',
      'negative aura speedrun any% WR',
    ],
    mid: [
      'mid run. mid aura. mid everything.',
      'aight, that was almost something',
      'lowkey decent. highkey still dead.',
      'the grind is grinding YOU rn',
      'respectable L. still an L.',
      'so close to being him. so far.',
      'not cooked, just… lightly toasted',
    ],
    respect: [
      'ok lowkey that was kinda tuff 🔥',
      'aura restored. sigma grindset confirmed.',
      'W rizz, W run. still died tho.',
      'chat, is this real?? NEW BEST??',
      'certified HIM moment',
      'the glow up is real. the death is also real.',
    ],
    win: [
      'HE\'S HIM. aura payout incoming.',
      'W cleared. chat going wild.',
      'sigma arc completed. for now.',
    ],
  };

  const CHAT_USERS = ['xX_sigma_grindset', 'ohioRizzler', 'NPC_4711', 'auraFarmer99', 'skibidiCEO', 'lil_bro_L', 'gyattgpt', 'mewing_intern'];
  const CHAT_L = ['💀💀💀', 'bro??', 'he\'s NOT him', '-999 aura', 'cooked.', 'GGs in chat', 'caught in 4k', 'npc arc confirmed', 'someone clip that L', 'skill issue fr', 'bro is a background character', 'unc status', 'chat is this real', 'L detected, opinion rejected'];
  const CHAT_W = ['W', 'HE\'S HIM', 'aura farming fr', 'CLIP IT', 'sigma arc', 'no shot??', 'chat is this REAL', 'certified banger run', 'the rizzness is real'];

  let aura = parseInt(localStorage.getItem('playlab.aura'), 10);
  if (Number.isNaN(aura)) aura = 1000;
  let auraEl = null;

  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

  function syncAura() {
    if (auraEl) {
      auraEl.textContent = aura.toLocaleString();
      auraEl.parentElement.classList.toggle('aura--neg', aura < 0);
    }
    localStorage.setItem('playlab.aura', String(aura));
  }

  /* Floating "+250 AURA" / "-500 AURA" popup over a stage element. */
  function auraPopup(anchor, delta) {
    if (!anchor) return;
    const el = document.createElement('span');
    el.className = 'aura-pop ' + (delta < 0 ? 'aura-pop--neg' : 'aura-pop--pos');
    el.textContent = (delta > 0 ? '+' : '') + delta + ' AURA';
    el.style.left = (28 + Math.random() * 44) + '%';
    anchor.appendChild(el);
    setTimeout(() => el.remove(), 1900);
  }

  function addAura(delta, anchor) {
    aura += delta;
    syncAura();
    auraPopup(anchor, delta);
  }

  /* Fake stream chat — bottom-left column of reactions. */
  function chat(kind, n = 3) {
    const host = document.getElementById('chatFeed');
    if (!host) return;
    const pool = kind === 'win' ? CHAT_W : CHAT_L;
    for (let i = 0; i < n; i++) {
      setTimeout(() => {
        const li = document.createElement('div');
        li.className = 'chat__msg';
        li.innerHTML = `<b>${pick(CHAT_USERS)}</b> ${pick(pool)}`;
        host.appendChild(li);
        while (host.children.length > 5) host.firstChild.remove();
        setTimeout(() => li.classList.add('gone'), 3400);
        setTimeout(() => li.remove(), 3900);
      }, i * (260 + Math.random() * 300));
    }
  }

  /* Skull rain over a stage. */
  function skulls(anchor, n = 9) {
    if (!anchor) return;
    for (let i = 0; i < n; i++) {
      const s = document.createElement('span');
      s.className = 'skull';
      s.textContent = pick(['💀', '💀', '🪦', '😭', '📉']);
      s.style.left = Math.random() * 92 + '%';
      s.style.animationDelay = (Math.random() * 0.35) + 's';
      s.style.fontSize = (14 + Math.random() * 18) + 'px';
      anchor.appendChild(s);
      setTimeout(() => s.remove(), 2000);
    }
  }

  /* Red damage flash on the whole page. */
  function dmgFlash() {
    document.body.classList.add('dmg');
    setTimeout(() => document.body.classList.remove('dmg'), 320);
  }

  /* The main API — call on a loss. Returns {headline, line} for the overlay.
     tier: 'brutal' | 'mid' | 'respect' picked from performance by caller. */
  function loss({ tier = 'brutal', anchor = null, auraHit = -500 } = {}) {
    const headline = tier === 'respect' ? 'DEAD, BUT HIM' : tier === 'mid' ? 'COOKED (MEDIUM RARE)' : 'YOU\'RE COOKED';
    const line = pick(ROASTS[tier] || ROASTS.brutal);
    addAura(auraHit, anchor);
    chat(tier === 'respect' ? 'win' : 'loss', tier === 'brutal' ? 4 : 2);
    skulls(anchor, tier === 'brutal' ? 11 : 6);
    dmgFlash();
    window.PLAYLAB.Sound?.trap?.();
    return { headline, line };
  }

  function win({ anchor = null, auraGain = 750 } = {}) {
    addAura(auraGain, anchor);
    chat('win', 4);
    return { headline: 'CERTIFIED W', line: pick(ROASTS.win) };
  }

  window.PLAYLAB.Roast = {
    loss, win, addAura, chat, skulls,
    get aura() { return aura; },
    initHud() {
      auraEl = document.querySelector('#auraPill b');
      syncAura();
      document.getElementById('auraPill')?.addEventListener('click', () => {
        window.PLAYLAB.toast?.('aura is earned, not clicked.');
        window.PLAYLAB.Sound?.click?.();
      });
    },
  };
})();
