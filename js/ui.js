/* ============================================================
   Panda Heist — UI Controller
   Screen navigation, menus, HUD wiring, title/background art.
   ============================================================ */
(function (PH) {
  'use strict';

  const BASE_SCREENS = ['screen-title', 'screen-levels', 'screen-game'];
  const OVERLAY_SCREENS = ['screen-howto', 'screen-crew', 'screen-select', 'screen-pause', 'screen-results'];

  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => Array.from(document.querySelectorAll(sel));
  const el = (id) => document.getElementById(id);

  let selectedLevelIndex = 0;
  let selectedCharacterId = 'bamboo';
  let activeCrewChar = 'bamboo';
  let toastHideHandle = null;
  let crewAnimHandle = null;

  function showBase(id) {
    BASE_SCREENS.forEach(s => el(s).classList.toggle('active', s === id));
  }
  function hideAllOverlays() {
    OVERLAY_SCREENS.forEach(s => el(s).classList.remove('active'));
    if (crewAnimHandle) { cancelAnimationFrame(crewAnimHandle); crewAnimHandle = null; }
  }
  function showOverlay(id) {
    hideAllOverlays();
    el(id).classList.add('active');
  }

  function ensureAudio() {
    PH.Audio.init();
    PH.Audio.resume();
  }

  /* ==================== Title / static background art ==================== */
  function paintGradient(ctx, w, h) {
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, '#2a1450');
    g.addColorStop(0.55, '#241040');
    g.addColorStop(1, '#160a2c');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    // distant rooftops silhouette
    ctx.fillStyle = 'rgba(10,4,22,0.65)';
    let x = 0;
    let seed = 1;
    while (x < w) {
      seed = (seed * 9301 + 49297) % 233280;
      const bw = 40 + (seed / 233280) * 70;
      const bh = 60 + ((seed * 7) % 233280) / 233280 * (h * 0.35);
      ctx.fillRect(x, h - bh, bw, bh);
      x += bw + 4;
    }
  }

  function initTitleCanvas() {
    const canvas = el('bg-canvas');
    const ctx = canvas.getContext('2d');
    const candies = [];
    const emojis = ['🍬', '🍭', '🍫', '🧁', '🍩'];
    function resize() {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      if (candies.length === 0) {
        for (let i = 0; i < 22; i++) {
          candies.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            r: 10 + Math.random() * 14,
            vy: 8 + Math.random() * 14,
            drift: Math.random() * Math.PI * 2,
            emoji: emojis[i % emojis.length],
            spin: (Math.random() - 0.5) * 0.6
          });
        }
      }
    }
    window.addEventListener('resize', resize);
    resize();
    let last = performance.now();
    function frame(t) {
      const dt = Math.min(0.05, (t - last) / 1000); last = t;
      paintGradient(ctx, canvas.width, canvas.height);
      candies.forEach(c => {
        c.y -= c.vy * dt;
        c.drift += dt;
        c.x += Math.sin(c.drift) * 10 * dt;
        if (c.y < -30) { c.y = canvas.height + 30; c.x = Math.random() * canvas.width; }
        ctx.save();
        ctx.translate(c.x, c.y);
        ctx.rotate(c.drift * c.spin);
        ctx.font = `${c.r * 2}px sans-serif`;
        ctx.globalAlpha = 0.85;
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(c.emoji, 0, 0);
        ctx.restore();
      });
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }

  function initStaticCanvases() {
    $$('.bg-canvas-static').forEach(canvas => {
      const ctx = canvas.getContext('2d');
      function resize() {
        canvas.width = canvas.parentElement.clientWidth || window.innerWidth;
        canvas.height = canvas.parentElement.clientHeight || window.innerHeight;
        paintGradient(ctx, canvas.width, canvas.height);
      }
      window.addEventListener('resize', resize);
      resize();
    });
  }

  /* ==================== Level select ==================== */
  function renderLevelGrid() {
    const save = PH.Save.get();
    const grid = el('level-grid');
    grid.innerHTML = '';
    PH.LEVELS.forEach((lvl, i) => {
      const locked = (i + 1) > save.unlockedLevels;
      const stars = save.levelStars[lvl.id] || 0;
      const card = document.createElement('div');
      card.className = 'level-card' + (locked ? ' locked' : '');
      card.innerHTML = locked
        ? `<h3>${lvl.name}</h3><span class="lvl-theme">${lvl.theme}</span><div class="lvl-lock">🔒</div><p class="lvl-desc">Complete the previous job to unlock.</p>`
        : `<h3>${lvl.name}</h3><span class="lvl-theme">${lvl.theme}</span><p class="lvl-desc">${lvl.desc}</p><div class="lvl-stars">${starString(stars)}</div>`;
      if (!locked) {
        card.addEventListener('click', () => {
          PH.Audio.play('ui-click');
          selectedLevelIndex = i;
          showOverlay('screen-select');
          renderCharSelect();
        });
      }
      grid.appendChild(card);
    });
  }
  function starString(n) {
    let s = '';
    for (let i = 0; i < 3; i++) s += i < n ? '⭐' : '☆';
    return s;
  }

  /* ==================== Character select ==================== */
  function renderCharSelect() {
    const grid = el('char-select-grid');
    grid.innerHTML = '';
    Object.values(PH.CHARACTERS).forEach(ch => {
      const costume = PH.Save.getEquippedCostume(ch.id);
      const card = document.createElement('div');
      card.className = 'char-card' + (ch.id === selectedCharacterId ? ' selected' : '');
      const canvas = document.createElement('canvas');
      canvas.width = 90; canvas.height = 90;
      card.appendChild(canvas);
      const h4 = document.createElement('h4'); h4.textContent = `${ch.name} — ${ch.title}`;
      const p = document.createElement('p'); p.textContent = ch.desc;
      card.appendChild(h4); card.appendChild(p);
      card.addEventListener('click', () => {
        PH.Audio.play('ui-click');
        selectedCharacterId = ch.id;
        renderCharSelect();
      });
      grid.appendChild(card);
      const ctx = canvas.getContext('2d');
      PH.Render.drawPanda(ctx, { x: 45, y: 62, size: 46, facing: 1, costume, walk: 0 });
    });
  }

  /* ==================== Crew & costumes ==================== */
  function renderCrewTabs() {
    const tabs = el('crew-tabs');
    tabs.innerHTML = '';
    Object.values(PH.CHARACTERS).forEach(ch => {
      const btn = document.createElement('button');
      btn.className = 'crew-tab' + (ch.id === activeCrewChar ? ' active' : '');
      btn.textContent = ch.name;
      btn.addEventListener('click', () => { activeCrewChar = ch.id; PH.Audio.play('ui-click'); renderCrewTabs(); renderCrewDetail(); renderCostumeGrid(); });
      tabs.appendChild(btn);
    });
  }

  function renderCrewDetail() {
    const ch = PH.CHARACTERS[activeCrewChar];
    const costume = PH.Save.getEquippedCostume(activeCrewChar);
    const wrap = el('crew-detail');
    wrap.innerHTML = '';
    const canvas = document.createElement('canvas');
    canvas.width = 100; canvas.height = 120;
    wrap.appendChild(canvas);
    const text = document.createElement('div');
    text.className = 'crew-detail-text';
    text.innerHTML = `<h3>${ch.name} — ${ch.title}</h3><p>${ch.desc}</p><p class="crew-ability">✨ ${ch.ability}: ${ch.abilityDesc}</p>`;
    wrap.appendChild(text);
    const ctx = canvas.getContext('2d');
    let phase = 0;
    function frame() {
      phase += 0.04;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      PH.Render.drawPanda(ctx, { x: 50, y: 90, size: 60, facing: 1, costume, walk: phase });
      crewAnimHandle = requestAnimationFrame(frame);
    }
    frame();
  }

  function renderCostumeGrid() {
    const list = PH.COSTUMES[activeCrewChar];
    const save = PH.Save.get();
    const grid = el('costume-grid');
    grid.innerHTML = '';
    list.forEach(costume => {
      const unlocked = PH.Save.isCostumeUnlocked(activeCrewChar, costume.id);
      const equipped = save.equipped[activeCrewChar] === costume.id;
      const item = document.createElement('div');
      item.className = 'costume-item' + (equipped ? ' equipped' : '') + (unlocked ? '' : ' locked');
      const canvas = document.createElement('canvas');
      canvas.width = 64; canvas.height = 64;
      item.appendChild(canvas);
      const name = document.createElement('span'); name.className = 'costume-name'; name.textContent = costume.name;
      item.appendChild(name);
      if (!unlocked) {
        const cost = document.createElement('span'); cost.className = 'costume-cost'; cost.textContent = `🍬 ${costume.cost}`;
        item.appendChild(cost);
        const lock = document.createElement('span'); lock.className = 'costume-lock-icon'; lock.textContent = '🔒';
        item.appendChild(lock);
      }
      item.addEventListener('click', () => {
        if (unlocked) {
          PH.Save.setEquipped(activeCrewChar, costume.id);
          PH.Audio.play('ui-click');
          renderCrewDetail(); renderCostumeGrid();
        } else if (PH.Save.spendCurrency(costume.cost)) {
          PH.Save.unlockCostume(activeCrewChar, costume.id);
          PH.Save.setEquipped(activeCrewChar, costume.id);
          PH.Audio.play('star');
          renderCrewDetail(); renderCostumeGrid(); updateCrewCurrency();
        } else {
          item.animate([{ transform: 'translateX(0)' }, { transform: 'translateX(-6px)' }, { transform: 'translateX(6px)' }, { transform: 'translateX(0)' }], { duration: 260 });
          PH.Audio.play('hack-fail');
        }
      });
      grid.appendChild(item);
      const ctx = canvas.getContext('2d');
      PH.Render.drawPanda(ctx, { x: 32, y: 46, size: 32, facing: 1, costume, walk: 0 });
    });
    updateCrewCurrency();
  }
  function updateCrewCurrency() { el('crew-currency').textContent = PH.Save.get().currency; }

  /* ==================== In-game HUD ==================== */
  function fmtTime(s) {
    s = Math.max(0, Math.ceil(s));
    const m = Math.floor(s / 60), r = s % 60;
    return `${m}:${r.toString().padStart(2, '0')}`;
  }

  function bindGameCallbacks() {
    PH.Game.onHud = (data) => {
      el('hud-timer-val').textContent = fmtTime(data.timeRemaining);
      el('hud-timer-val').parentElement.classList.toggle('warn', data.timeRemaining / data.timeLimit < 0.2);
      el('hud-candy-val').textContent = data.candyCollected;
      el('hud-candy-total').textContent = data.totalCandy;
      const strikesWrap = el('hud-strikes');
      strikesWrap.innerHTML = '';
      for (let i = 0; i < data.maxStrikes; i++) {
        const span = document.createElement('span');
        span.textContent = '🐾';
        span.style.opacity = i < data.strikes ? 0.25 : 1;
        strikesWrap.appendChild(span);
      }
      el('btn-special').classList.toggle('cooldown', !data.ability.ready);
    };
    PH.Game.onToast = (msg, type) => showToast(msg, type);
    PH.Game.onSpotted = (strikes, max) => showToast(`SPOTTED! Strike ${strikes}/${max}`, 'spot');
    PH.Game.onEnded = (result) => showResults(result);
    PH.Game.onPauseRequest = () => { PH.Game.pause(); showOverlay('screen-pause'); };
  }

  function showToast(msg, type) {
    const banner = el('alert-banner');
    banner.textContent = msg;
    banner.style.background = type === 'spot' ? 'var(--candy-red)' : (type === 'success' ? 'var(--safe-green)' : 'var(--candy-purple)');
    banner.classList.add('show');
    if (toastHideHandle) clearTimeout(toastHideHandle);
    toastHideHandle = setTimeout(() => banner.classList.remove('show'), 1700);
  }

  function showResults(result) {
    showOverlay('screen-results');
    el('results-title').textContent = result.success
      ? (result.levelIndex === PH.LEVELS.length - 1 ? '🎉 Grand Heist Complete!' : 'Heist Complete!')
      : (result.reason === 'sunrise' ? '🌅 Sunrise Caught You!' : '🚔 Busted!');
    el('results-stars').textContent = result.success ? starString(result.stars) : '💤 💤 💤';
    const pct = Math.round((result.candyCollected / Math.max(1, result.totalCandy)) * 100);
    el('results-stats').innerHTML = `
      🍬 Candy: <b>${result.candyCollected}/${result.totalCandy}</b> (${pct}%)<br>
      ⏱ Time left: <b>${fmtTime(result.timeRemaining)}</b><br>
      🐾 Strikes: <b>${result.strikes}/3</b>
    `;
    PH.Audio.play(result.success ? 'win' : 'lose');
    if (result.success && result.stars > 0) setTimeout(() => PH.Audio.play('star'), 300);

    const nextBtn = el('btn-next-level');
    const hasNext = result.success && result.levelIndex + 1 < PH.LEVELS.length && (result.levelIndex + 2) <= PH.Save.get().unlockedLevels;
    nextBtn.hidden = !hasNext;
    nextBtn.onclick = () => {
      hideAllOverlays();
      selectedLevelIndex = result.levelIndex + 1;
      PH.Game.startLevel(selectedLevelIndex, selectedCharacterId);
    };
  }

  /* ==================== Wiring ==================== */
  function wireButtons() {
    el('btn-play').addEventListener('click', () => { ensureAudio(); PH.Audio.play('ui-click'); showBase('screen-levels'); renderLevelGrid(); });
    el('btn-howto').addEventListener('click', () => { ensureAudio(); showOverlay('screen-howto'); });
    el('btn-costumes').addEventListener('click', () => { ensureAudio(); showOverlay('screen-crew'); renderCrewTabs(); renderCrewDetail(); renderCostumeGrid(); });
    $$('.btn-close-overlay').forEach(btn => btn.addEventListener('click', () => { PH.Audio.play('ui-click'); hideAllOverlays(); }));

    el('btn-back-title').addEventListener('click', () => { PH.Audio.play('ui-click'); showBase('screen-title'); });
    el('btn-back-levels').addEventListener('click', () => { PH.Audio.play('ui-click'); hideAllOverlays(); });
    el('btn-launch').addEventListener('click', () => {
      PH.Audio.play('ui-click');
      hideAllOverlays();
      showBase('screen-game');
      bindGameCallbacks();
      PH.Game.startLevel(selectedLevelIndex, selectedCharacterId);
    });

    el('btn-pause').addEventListener('click', () => { PH.Game.pause(); showOverlay('screen-pause'); });
    el('btn-resume').addEventListener('click', () => { PH.Audio.play('ui-click'); hideAllOverlays(); PH.Game.resume(); });
    el('btn-restart-level').addEventListener('click', () => { PH.Audio.play('ui-click'); hideAllOverlays(); PH.Game.restart(); });
    el('btn-quit-level').addEventListener('click', () => { PH.Audio.play('ui-click'); hideAllOverlays(); PH.Game.stop(); showBase('screen-levels'); renderLevelGrid(); });

    el('btn-retry').addEventListener('click', () => { PH.Audio.play('ui-click'); hideAllOverlays(); PH.Game.restart(); });
    el('btn-results-levels').addEventListener('click', () => { PH.Audio.play('ui-click'); hideAllOverlays(); PH.Game.stop(); showBase('screen-levels'); renderLevelGrid(); });

    el('btn-mute').addEventListener('click', () => {
      const muted = !PH.Save.get().muted;
      PH.Save.setMuted(muted);
      PH.Audio.setMuted(muted);
      el('btn-mute').textContent = muted ? '🔇' : '🔊';
    });
  }

  function init() {
    PH.Save.load();
    el('btn-mute').textContent = PH.Save.get().muted ? '🔇' : '🔊';
    PH.Audio.setMuted(PH.Save.get().muted);
    initTitleCanvas();
    initStaticCanvases();
    wireButtons();
    showBase('screen-title');
  }

  PH.UI = { init };
})(window.PH = window.PH || {});
