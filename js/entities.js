/* ============================================================
   Panda Heist — Entities
   Player entity: position, movement, dash & costume rendering.
   Guards/cameras are simpler data objects updated directly by
   the Game controller (see game.js) since their AI is tightly
   coupled to level geometry & detection logic.
   ============================================================ */
(function (PH) {
  'use strict';

  const TILE = PH.TILE;

  class Player {
    constructor(character, costume, spawn) {
      this.character = character;      // from PH.CHARACTERS
      this.costume = costume;          // palette object
      this.x = spawn[0];
      this.y = spawn[1];
      this.facing = 1;                 // 1 = right, -1 = left
      this.walkPhase = 0;
      this.moving = false;
      this.speed = 3.1;                // tiles / second
      this.radius = 0.32;              // collision radius in tiles

      this.dashTimer = 0;              // active dash time remaining
      this.dashCooldown = 0;
      this.distractCooldown = 0;
      this.empTimer = 0;               // active EMP effect remaining (blinds guards)
      this.empCooldown = 0;

      this.invuln = 0;                 // brief invulnerability after being caught
      this.caughtFlash = 0;
      this.hiddenInBush = false;
    }

    get abilityCooldown() {
      switch (this.character.passive) {
        case 'vent': return this.dashCooldown;
        case 'distract': return this.distractCooldown;
        case 'hack': return this.empCooldown;
        default: return 0;
      }
    }

    canUseAbility() {
      return this.abilityCooldown <= 0 && this.dashTimer <= 0;
    }

    tickCooldowns(dt) {
      if (this.dashTimer > 0) this.dashTimer -= dt;
      if (this.dashCooldown > 0) this.dashCooldown -= dt;
      if (this.distractCooldown > 0) this.distractCooldown -= dt;
      if (this.empTimer > 0) this.empTimer -= dt;
      if (this.empCooldown > 0) this.empCooldown -= dt;
      if (this.invuln > 0) this.invuln -= dt;
      if (this.caughtFlash > 0) this.caughtFlash -= dt;
    }

    currentSpeed() {
      const base = this.speed;
      if (this.dashTimer > 0) return base * 2.6;
      return base;
    }

    tryMove(dx, dy, dt, grid, width, height) {
      const moveLen = Math.hypot(dx, dy);
      this.moving = moveLen > 0.01;
      if (!this.moving) return;
      if (dx !== 0) this.facing = dx > 0 ? 1 : -1;
      this.walkPhase += dt * (this.dashTimer > 0 ? 2.4 : 1.4);

      const spd = this.currentSpeed();
      const nx = this.x + dx * spd * dt;
      const ny = this.y + dy * spd * dt;

      // resolve per-axis so sliding along walls feels natural
      if (this.canStandAt(nx, this.y, grid, width, height)) this.x = nx;
      if (this.canStandAt(this.x, ny, grid, width, height)) this.y = ny;
    }

    canStandAt(x, y, grid, width, height) {
      const r = this.radius;
      const minX = Math.floor(x - r), maxX = Math.floor(x + r);
      const minY = Math.floor(y - r), maxY = Math.floor(y + r);
      for (let ty = minY; ty <= maxY; ty++) {
        for (let tx = minX; tx <= maxX; tx++) {
          if (tx < 0 || ty < 0 || tx >= width || ty >= height) return false;
          const tile = grid[ty][tx];
          if (tile === TILE.WALL) return false;
          if (tile === TILE.VENT && this.character.passive !== 'vent') return false;
        }
      }
      return true;
    }

    draw(ctx, tileSize) {
      PH.Render.drawPanda(ctx, {
        x: this.x * tileSize,
        y: this.y * tileSize,
        size: tileSize,
        facing: this.facing,
        costume: this.costume,
        walk: this.moving ? this.walkPhase : 0,
        crouch: this.hiddenInBush,
        caught: Math.max(0, this.caughtFlash),
        hidden: this.hiddenInBush
      });
    }
  }

  PH.Player = Player;
})(window.PH = window.PH || {});
