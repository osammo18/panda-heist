/* ============================================================
   Panda Heist — Game Controller
   Core loop, stealth AI, abilities, vault hacking, scoring.
   ============================================================ */
(function (PH) {
  'use strict';

  const TILE_PX = 40;
  const TAU = Math.PI * 2;
  const EXIT_UNLOCK_PCT = 0.5;

  function normalizeAngle(a) {
    while (a > Math.PI) a -= TAU;
    while (a < -Math.PI) a += TAU;
    return a;
  }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function dist(x1, y1, x2, y2) { return Math.hypot(x2 - x1, y2 - y1); }
  function cloneLevel(def) {
    return (window.structuredClone) ? structuredClone(def) : JSON.parse(JSON.stringify(def));
  }

  const Game = {
    canvas: null, ctx: null,
    dpr: 1,
    state: 'idle',      // idle | playing | paused | ended
    rafId: null,
    lastTime: 0,

    level: null, levelIndex: 0,
    player: null,
    strikes: 0, maxStrikes: 3,
    candyCollected: 0,
    timeRemaining: 0,

    particles: [],
    decoys: [],
    hack: { active: false },
    toastTimer: 0,

    // callbacks the UI layer can hook into
    onHud: null, onToast: null, onSpotted: null, onEnded: null,

    init(canvasEl) {
      this.canvas = canvasEl;
      this.ctx = canvasEl.getContext('2d');
    },

    startLevel(levelIndex, characterId) {
      this.levelIndex = levelIndex;
      this.level = cloneLevel(PH.LEVELS[levelIndex]);
      this.characterId = characterId;
      const character = PH.CHARACTERS[characterId];
      const costume = PH.Save.getEquippedCostume(characterId);
      this.player = new PH.Player(character, costume, this.level.playerStart);
      this.player.lastDir = { x: 1, y: 0 };

      this.level.guards.forEach(g => {
        g.idx = 1 % g.patrol.length;
        g.waitTimer = 0;
        g.alert = 0;
        g.facingAngle = 0;
        g.state = 'patrol';
        g.investigateTarget = null;
      });
      this.level.cameras.forEach(c => { c.alert = 0; c.phase = c.from > c.to ? Math.PI : 0; });

      this.strikes = 0;
      this.candyCollected = 0;
      this.timeRemaining = this.level.timeLimit;
      this.particles = [];
      this.decoys = [];
      this.hack = { active: false };
      this.toastTimer = 0;
      this.state = 'playing';

      this._resizeCanvas();
      this.lastTime = performance.now();
      if (this.rafId) cancelAnimationFrame(this.rafId);
      const loop = (t) => {
        this.rafId = requestAnimationFrame(loop);
        const dt = clamp((t - this.lastTime) / 1000, 0, 0.05);
        this.lastTime = t;
        if (this.state === 'playing') this._update(dt);
        this._render();
      };
      this.rafId = requestAnimationFrame(loop);
    },

    restart() { this.startLevel(this.levelIndex, this.characterId); },

    pause() { if (this.state === 'playing') this.state = 'paused'; },
    resume() { if (this.state === 'paused') { this.state = 'playing'; this.lastTime = performance.now(); } },

    stop() {
      this.state = 'idle';
      if (this.rafId) cancelAnimationFrame(this.rafId);
      this.rafId = null;
    },

    _resizeCanvas() {
      this.dpr = Math.min(2, window.devicePixelRatio || 1);
      const w = this.level.width * TILE_PX, h = this.level.height * TILE_PX;
      this.canvas.width = w * this.dpr;
      this.canvas.height = h * this.dpr;
      this.canvas.style.width = w + 'px';
      this.canvas.style.height = h + 'px';
    },

    /* ============================= UPDATE ============================= */
    _update(dt) {
      const input = PH.Input.consumeFrame();
      if (input.pause && this.onPauseRequest) this.onPauseRequest();

      this.timeRemaining -= dt;
      if (this.timeRemaining <= 0) { this.timeRemaining = 0; this._endLevel(false, 'sunrise'); }

      const move = PH.Input.getMoveVector();
      const grid = this.level.grid, w = this.level.width, h = this.level.height;

      if (!this.hack.active) {
        this.player.tryMove(move.x, move.y, dt, grid, w, h);
        if (Math.hypot(move.x, move.y) > 0.1) this.player.lastDir = { x: move.x, y: move.y };
        this._handleAbility(input);
        this._handleAction(input);
      } else {
        this._updateHack(dt, input);
      }
      this.player.tickCooldowns(dt);

      this._updateHiddenState();
      this._updateDecoys(dt);
      this._updateGuards(dt);
      this._updateCameras(dt);
      this._updateCandy();
      this._updateExit();
      this._updateParticles(dt);
      if (this.toastTimer > 0) this.toastTimer -= dt;

      if (this.onHud) {
        this.onHud({
          timeRemaining: this.timeRemaining, timeLimit: this.level.timeLimit,
          candyCollected: this.candyCollected, totalCandy: this.level.totalCandyValue,
          strikes: this.strikes, maxStrikes: this.maxStrikes,
          ability: {
            name: this.player.character.ability,
            cooldown: this.player.abilityCooldown, max: this.player.character.cooldown,
            ready: this.player.canUseAbility()
          }
        });
      }
    },

    _updateHiddenState() {
      const p = this.player;
      p.hiddenInBush = this.level.bushes.some(b => dist(p.x + 0.5, p.y + 0.5, b.x + 0.5, b.y + 0.5) < 0.55);
      p.litUp = this.level.lamps.some(l => dist(p.x + 0.5, p.y + 0.5, l.x + 0.5, l.y + 0.5) < 1.6);
    },

    _handleAbility(input) {
      if (!input.special || !this.player.canUseAbility()) return;
      const p = this.player, ch = p.character;
      PH.Audio.play('ability');
      if (ch.passive === 'vent') {
        p.dashTimer = 0.32;
        p.dashCooldown = ch.cooldown / 1000;
      } else if (ch.passive === 'distract') {
        const dirx = p.lastDir.x || 1, diry = p.lastDir.y || 0;
        const len = Math.hypot(dirx, diry) || 1;
        let tx = p.x + (dirx / len) * 2.2, ty = p.y + (diry / len) * 2.2;
        tx = clamp(tx, 1, this.level.width - 2); ty = clamp(ty, 1, this.level.height - 2);
        if (this.level.grid[Math.round(ty)] && this.level.grid[Math.round(ty)][Math.round(tx)] === PH.TILE.WALL) { tx = p.x; ty = p.y; }
        const decoy = { x: tx, y: ty, timer: 4.5 };
        this.decoys.push(decoy);
        p.distractCooldown = ch.cooldown / 1000;
        this.level.guards.forEach(g => {
          if (g.alert < 0.9 && dist(g.x, g.y, decoy.x, decoy.y) < 8) {
            g.investigateTarget = { x: decoy.x, y: decoy.y };
            g.waitTimer = 0;
          }
        });
        this._toast('🍬 Decoy deployed!', 'info');
        PH.Audio.play('distract');
      } else if (ch.passive === 'hack') {
        p.empTimer = 3.0;
        p.empCooldown = ch.cooldown / 1000;
        this._toast('⚡ EMP blast! Guards blinded', 'info');
        this._spawnBurst(p.x, p.y, '#4fe0c5', 16);
      }
    },

    _handleAction(input) {
      if (!input.action) return;
      const p = this.player;
      const safe = this.level.safes.find(s => !s.opened && dist(p.x + 0.5, p.y + 0.5, s.x + 0.5, s.y + 0.5) < 1.0);
      if (safe) this._startHack(safe);
    },

    _startHack(safe) {
      const mei = this.player.character.passive === 'hack';
      this.hack = {
        active: true, safe,
        phase: 0,
        speed: mei ? 1.1 : 1.8,
        zoneWidth: mei ? 0.34 : 0.2,
        zoneCenter: 0.25 + Math.random() * 0.5
      };
    },

    _updateHack(dt, input) {
      const p = this.player;
      if (dist(p.x + 0.5, p.y + 0.5, this.hack.safe.x + 0.5, this.hack.safe.y + 0.5) > 1.3) {
        this.hack.active = false;
        return;
      }
      this.hack.phase += dt * this.hack.speed;
      const needle = (Math.sin(this.hack.phase) + 1) / 2;
      if (input.action) {
        const success = Math.abs(needle - this.hack.zoneCenter) < this.hack.zoneWidth / 2;
        if (success) {
          this.hack.safe.opened = true;
          this.candyCollected += this.hack.safe.value;
          PH.Audio.play('hack-success');
          this._spawnBurst(this.hack.safe.x + 0.5, this.hack.safe.y + 0.5, '#ffd23f', 22);
          this._toast(`💰 Vault cracked! +${this.hack.safe.value} candy`, 'success');
        } else {
          PH.Audio.play('hack-fail');
          this._toast('🚨 Wrong move! Guards stirred...', 'spot');
          this.level.guards.forEach(g => {
            if (dist(g.x, g.y, this.hack.safe.x, this.hack.safe.y) < 6) g.alert = Math.min(1, g.alert + 0.35);
          });
        }
        this.hack.active = false;
      }
    },

    _updateDecoys(dt) {
      this.decoys.forEach(d => d.timer -= dt);
      this.decoys = this.decoys.filter(d => d.timer > 0);
    },

    /* ---------------------- Guard AI ---------------------- */
    _updateGuards(dt) {
      const p = this.player;
      this.level.guards.forEach(g => {
        const canSee = this._canSee(g.x, g.y, g.facingAngle, g.visionRange, g.visionSpread);
        if (canSee) {
          g.alert = Math.min(1, g.alert + dt / 1.1);
          g.facingAngle = Math.atan2((p.y + 0.5) - g.y, (p.x + 0.5) - g.x);
          g.state = g.alert >= 0.999 ? 'alerted' : 'suspicious';
        } else {
          g.alert = Math.max(0, g.alert - dt * 0.55);
          this._moveGuard(g, dt);
        }
        if (g.alert >= 0.999) this._onCaught();
      });
    },

    _moveGuard(g, dt) {
      let target;
      if (g.investigateTarget) {
        target = g.investigateTarget;
        g.state = 'investigating';
      } else {
        if (g.waitTimer > 0) { g.waitTimer -= dt; return; }
        target = { x: g.patrol[g.idx][0], y: g.patrol[g.idx][1] };
        g.state = 'patrol';
      }
      const dx = target.x - g.x, dy = target.y - g.y;
      const d = Math.hypot(dx, dy);
      if (d < 0.12) {
        if (g.investigateTarget) {
          g.investigateTarget = null;
          g.waitTimer = 2.2;
        } else {
          g.waitTimer = g.wait;
          g.idx = (g.idx + 1) % g.patrol.length;
        }
        return;
      }
      const speed = g.investigateTarget ? g.speed * 1.15 : g.speed;
      const vx = (dx / d) * speed * dt, vy = (dy / d) * speed * dt;
      g.x += vx; g.y += vy;
      g.facingAngle = Math.atan2(dy, dx);
    },

    /* ---------------------- Camera AI ---------------------- */
    _updateCameras(dt) {
      this.level.cameras.forEach(c => {
        c.phase += dt * c.speed;
        const t = (Math.sin(c.phase) + 1) / 2;
        c.angle = c.from + (c.to - c.from) * t;
        const canSee = this._canSee(c.x, c.y, c.angle, c.visionRange, c.visionSpread);
        if (canSee) {
          c.alert = Math.min(1, c.alert + dt / 1.3);
        } else {
          c.alert = Math.max(0, c.alert - dt * 0.5);
        }
        if (c.alert >= 0.999) this._onCaught();
      });
    },

    /* ---------------------- Detection core ---------------------- */
    _canSee(sx, sy, facingAngle, range, spread) {
      const p = this.player;
      if (p.invuln > 0 || p.empTimer > 0) return false;
      const px = p.x + 0.5, py = p.y + 0.5;
      const effRange = range * (p.litUp ? 1.3 : 1);
      const d = dist(sx, sy, px, py);
      if (d > effRange) return false;
      if (p.hiddenInBush && d > 1.0) return false;
      const angleTo = Math.atan2(py - sy, px - sx);
      const diff = Math.abs(normalizeAngle(angleTo - facingAngle));
      if (diff > spread / 2) return false;
      return this._lineOfSightClear(sx, sy, px, py);
    },

    _lineOfSightClear(x1, y1, x2, y2) {
      const grid = this.level.grid;
      const d = dist(x1, y1, x2, y2);
      const steps = Math.max(1, Math.ceil(d * 4));
      for (let i = 1; i < steps; i++) {
        const t = i / steps;
        const x = x1 + (x2 - x1) * t, y = y1 + (y2 - y1) * t;
        const tx = Math.floor(x), ty = Math.floor(y);
        if (grid[ty] && grid[ty][tx] === PH.TILE.WALL) return false;
      }
      return true;
    },

    _onCaught() {
      if (this.player.invuln > 0) return;
      this.strikes++;
      this.player.invuln = 1.8;
      this.player.caughtFlash = 1;
      this.level.guards.forEach(g => { g.alert = 0; g.investigateTarget = null; });
      this.level.cameras.forEach(c => c.alert = 0);
      PH.Audio.play('caught');
      if (navigator.vibrate) navigator.vibrate(120);
      if (this.onSpotted) this.onSpotted(this.strikes, this.maxStrikes);
      if (this.strikes >= this.maxStrikes) this._endLevel(false, 'caught');
    },

    /* ---------------------- Candy / Exit ---------------------- */
    _updateCandy() {
      const p = this.player;
      this.level.candies.forEach(c => {
        if (c.taken) return;
        if (dist(p.x + 0.5, p.y + 0.5, c.x + 0.5, c.y + 0.5) < 0.55) {
          c.taken = true;
          this.candyCollected += 1;
          PH.Audio.play('collect');
          this._spawnBurst(c.x + 0.5, c.y + 0.5, '#ff5fa2', 8);
        }
      });
    },

    _updateExit() {
      const p = this.player, e = this.level.exit;
      if (dist(p.x + 0.5, p.y + 0.5, e[0] + 0.5, e[1] + 0.5) < 0.7) {
        const pct = this.candyCollected / Math.max(1, this.level.totalCandyValue);
        if (pct >= EXIT_UNLOCK_PCT) this._endLevel(true, 'exit');
        else if (this.toastTimer <= 0) this._toast(`🚐 Need ${Math.round(EXIT_UNLOCK_PCT * 100)}% of the candy to bail!`, 'info');
      }
    },

    _toast(msg, type) {
      this.toastTimer = 1.8;
      if (this.onToast) this.onToast(msg, type);
    },

    /* ---------------------- Particles ---------------------- */
    _spawnBurst(x, y, color, count) {
      for (let i = 0; i < count; i++) {
        const a = Math.random() * TAU;
        const speed = 1 + Math.random() * 2.4;
        this.particles.push({
          x, y, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed,
          life: 0.5 + Math.random() * 0.4, maxLife: 0.9, color
        });
      }
    },
    _updateParticles(dt) {
      this.particles.forEach(pt => { pt.x += pt.vx * dt; pt.y += pt.vy * dt; pt.vy += dt * 2; pt.life -= dt; });
      this.particles = this.particles.filter(pt => pt.life > 0);
    },

    /* ---------------------- End of level ---------------------- */
    _endLevel(success, reason) {
      if (this.state === 'ended') return;
      this.state = 'ended';
      const lvl = this.level;
      const pct = this.candyCollected / Math.max(1, lvl.totalCandyValue);
      let stars = 0;
      if (success) {
        stars = 1;
        if (pct >= 0.7) stars++;
        if (this.strikes === 0 && pct >= 0.95) stars++;
      }
      PH.Save.addCurrency(this.candyCollected);
      if (success) PH.Save.recordLevelResult(this.levelIndex, lvl.id, stars, 0);
      if (this.onEnded) {
        this.onEnded({
          success, reason, stars,
          candyCollected: this.candyCollected, totalCandy: lvl.totalCandyValue,
          strikes: this.strikes, timeRemaining: this.timeRemaining, timeLimit: lvl.timeLimit,
          levelIndex: this.levelIndex, levelName: lvl.name
        });
      }
    },

    /* ============================= RENDER ============================= */
    _render() {
      const ctx = this.ctx, T = TILE_PX, lvl = this.level;
      ctx.save();
      ctx.scale(this.dpr, this.dpr);
      ctx.clearRect(0, 0, lvl.width * T, lvl.height * T);

      for (let y = 0; y < lvl.height; y++) {
        for (let x = 0; x < lvl.width; x++) {
          const tile = lvl.grid[y][x];
          if (tile === PH.TILE.WALL) PH.Render.drawWall(ctx, x * T, y * T, T);
          else if (tile === PH.TILE.VENT) PH.Render.drawVent(ctx, x * T, y * T, T);
          else PH.Render.drawFloor(ctx, x * T, y * T, T, (x + y) % 2);
        }
      }
      lvl.lamps.forEach(l => PH.Render.drawLamp(ctx, l.x * T, l.y * T, T, true));
      lvl.bushes.forEach(b => PH.Render.drawBush(ctx, b.x * T, b.y * T, T));
      const exitActive = (this.candyCollected / Math.max(1, lvl.totalCandyValue)) >= EXIT_UNLOCK_PCT;
      PH.Render.drawExit(ctx, lvl.exit[0] * T, lvl.exit[1] * T, T, exitActive);
      lvl.safes.forEach(s => {
        const hacking = this.hack.active && this.hack.safe === s;
        PH.Render.drawSafe(ctx, s.x * T, s.y * T, T, s.opened, hacking ? (Math.sin(this.hack.phase) + 1) / 2 : 0);
      });
      lvl.candies.forEach(c => { if (!c.taken) PH.Render.drawCandy(ctx, c.x * T, c.y * T, T, Math.sin(performance.now() / 300 + c.x)); });
      this.decoys.forEach(d => PH.Render.drawDecoy(ctx, (d.x - 0.5) * T, (d.y - 0.5) * T, T, performance.now() / 400));
      lvl.cameras.forEach(c => {
        PH.Render.drawVisionCone(ctx, (c.x) * T, (c.y) * T, c.angle, c.visionRange * T, c.visionSpread, c.alert, false);
        PH.Render.drawCamera(ctx, (c.x - 0.5) * T, (c.y - 0.5) * T, T, c.angle);
      });
      lvl.guards.forEach(g => {
        const empBlind = this.player.empTimer > 0;
        PH.Render.drawVisionCone(ctx, (g.x + 0.5) * T, (g.y + 0.5) * T, g.facingAngle, g.visionRange * T, g.visionSpread, empBlind ? 0 : g.alert, this.player.litUp);
      });

      // depth-sort dynamic entities (player + guards) by y for correct overlap
      const dynamic = lvl.guards.map(g => ({ y: g.y, draw: () => PH.Render.drawGuard(ctx, { x: (g.x + 0.5) * T, y: (g.y + 0.5) * T, size: T, facing: Math.cos(g.facingAngle) < 0 ? -1 : 1, walk: performance.now() / 500, alert: g.alert, state: g.state }) }));
      dynamic.push({ y: this.player.y, draw: () => this.player.draw(ctx, T) });
      dynamic.sort((a, b) => a.y - b.y).forEach(d => d.draw());

      this._drawParticles(ctx);

      ctx.restore();

      // screen-space danger vignette (drawn without dpr scale, uses CSS-size canvas via displayed size handled by CSS)
      const maxAlert = Math.max(0, ...lvl.guards.map(g => g.alert), ...lvl.cameras.map(c => c.alert));
      if (maxAlert > 0.05) {
        ctx.save();
        ctx.globalAlpha = maxAlert * 0.35;
        const w = this.canvas.width, h = this.canvas.height;
        const grad = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) / 3, w / 2, h / 2, Math.max(w, h) / 1.3);
        grad.addColorStop(0, 'rgba(255,0,0,0)');
        grad.addColorStop(1, 'rgba(255,0,0,0.8)');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, w, h);
        ctx.restore();
      }
    },

    _drawParticles(ctx) {
      const T = TILE_PX;
      this.particles.forEach(pt => {
        ctx.save();
        ctx.globalAlpha = Math.max(0, pt.life / pt.maxLife);
        ctx.fillStyle = pt.color;
        ctx.beginPath();
        ctx.arc(pt.x * T, pt.y * T, 3.2, 0, TAU);
        ctx.fill();
        ctx.restore();
      });
    }
  };

  PH.Game = Game;
})(window.PH = window.PH || {});
