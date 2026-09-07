/* ============================================================
   Panda Heist — Render helpers
   All game art is procedurally drawn on <canvas> - cute, chunky,
   candy-noir style pandas, guards, props & environment tiles.
   ============================================================ */
(function (PH) {
  'use strict';

  const TAU = Math.PI * 2;

  function roundRect(ctx, x, y, w, h, r) {
    if (typeof r === 'number') r = { tl: r, tr: r, br: r, bl: r };
    ctx.beginPath();
    ctx.moveTo(x + r.tl, y);
    ctx.lineTo(x + w - r.tr, y);
    ctx.arcTo(x + w, y, x + w, y + r.tr, r.tr);
    ctx.lineTo(x + w, y + h - r.br);
    ctx.arcTo(x + w, y + h, x + w - r.br, y + h, r.br);
    ctx.lineTo(x + r.bl, y + h);
    ctx.arcTo(x, y + h, x, y + h - r.bl, r.bl);
    ctx.lineTo(x, y + r.tl);
    ctx.arcTo(x, y, x + r.tl, y, r.tl);
    ctx.closePath();
  }

  /* -------------------- Panda character -------------------- */
  // Draws a cute top-down-ish panda (3/4 view) centered at (x,y), size = height in px.
  function drawPanda(ctx, opts) {
    const { x, y, size = 40, facing = 1, costume, walk = 0, crouch = false, caught = 0, hidden = false } = opts;
    const s = size / 40; // scale factor relative to base 40px design
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(facing < 0 ? -s : s, s);
    const bob = Math.sin(walk * 6) * 1.6;
    const legSwing = Math.sin(walk * 6) * 5;
    const bodyY = crouch ? 3 : 0;

    ctx.globalAlpha = hidden ? 0.45 : 1;

    // shadow
    ctx.beginPath();
    ctx.ellipse(0, 16, 13, 4.5, 0, 0, TAU);
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.fill();

    // legs
    ctx.fillStyle = costume.patch;
    ctx.beginPath();
    roundRect(ctx, -9, 6 + bodyY, 6, 9 - legSwing * 0.2, 3);
    ctx.fill();
    roundRect(ctx, 3, 6 + bodyY, 6, 9 + legSwing * 0.2, 3);
    ctx.fill();

    // body
    ctx.fillStyle = costume.body;
    ctx.beginPath();
    ctx.ellipse(0, -2 + bodyY + bob * 0.3, 12, 11, 0, 0, TAU);
    ctx.fill();

    // arms
    ctx.fillStyle = costume.patch;
    ctx.beginPath();
    ctx.ellipse(-11, 1 + bodyY, 4, 7, -0.2 + legSwing * 0.02, 0, TAU);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(11, 1 + bodyY, 4, 7, 0.2 - legSwing * 0.02, 0, TAU);
    ctx.fill();

    // ears
    ctx.fillStyle = costume.patch;
    ctx.beginPath(); ctx.arc(-8, -14 + bodyY, 4.6, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.arc(8, -14 + bodyY, 4.6, 0, TAU); ctx.fill();

    // head
    ctx.fillStyle = costume.body;
    ctx.beginPath();
    ctx.ellipse(0, -14 + bodyY + bob * 0.4, 10.5, 9.5, 0, 0, TAU);
    ctx.fill();

    // eye patches
    ctx.fillStyle = costume.patch;
    ctx.beginPath(); ctx.ellipse(-4.6, -14 + bodyY, 3.4, 4.4, -0.25, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.ellipse(4.6, -14 + bodyY, 3.4, 4.4, 0.25, 0, TAU); ctx.fill();

    // eyes
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(-4.3, -14.5 + bodyY, 1.5, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.arc(4.3, -14.5 + bodyY, 1.5, 0, TAU); ctx.fill();
    ctx.fillStyle = '#111';
    ctx.beginPath(); ctx.arc(-3.9, -14.3 + bodyY, 0.85, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.arc(4.7, -14.3 + bodyY, 0.85, 0, TAU); ctx.fill();

    // nose
    ctx.fillStyle = '#111';
    ctx.beginPath(); ctx.ellipse(0, -10.5 + bodyY, 1.4, 1, 0, 0, TAU); ctx.fill();

    // accessory
    drawAccessory(ctx, costume.accessory, costume.accent, bodyY);

    // alert flash overlay
    if (caught > 0) {
      ctx.globalAlpha = caught * 0.5;
      ctx.fillStyle = '#ff3050';
      ctx.beginPath(); ctx.ellipse(0, -8 + bodyY, 16, 20, 0, 0, TAU); ctx.fill();
    }

    ctx.restore();
  }

  function drawAccessory(ctx, accessory, accent, bodyY) {
    if (!accessory) return;
    ctx.fillStyle = accent;
    switch (accessory) {
      case 'cap':
        ctx.beginPath(); ctx.ellipse(0, -19 + bodyY, 9, 4, 0, Math.PI, TAU); ctx.fill();
        ctx.beginPath(); roundRect(ctx, -2, -23 + bodyY, 10, 3, 1); ctx.fill();
        break;
      case 'chefhat':
        ctx.fillStyle = '#fff';
        ctx.beginPath(); roundRect(ctx, -7, -27 + bodyY, 14, 8, 4); ctx.fill();
        ctx.beginPath(); ctx.ellipse(0, -19 + bodyY, 8, 3, 0, 0, TAU); ctx.fill();
        break;
      case 'partyhat':
        ctx.beginPath();
        ctx.moveTo(-6, -18 + bodyY); ctx.lineTo(6, -18 + bodyY); ctx.lineTo(0, -30 + bodyY);
        ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.beginPath(); ctx.arc(0, -30 + bodyY, 1.6, 0, TAU); ctx.fill();
        break;
      case 'mask':
        ctx.beginPath(); roundRect(ctx, -8, -17 + bodyY, 16, 5, 2); ctx.fill();
        break;
      case 'bandana':
        ctx.beginPath(); roundRect(ctx, -9, -18 + bodyY, 18, 3.6, 2); ctx.fill();
        break;
      case 'scarf':
        ctx.beginPath(); roundRect(ctx, -8, -6 + bodyY, 16, 5, 2); ctx.fill();
        break;
      case 'leaf':
        ctx.beginPath(); ctx.ellipse(9, -22 + bodyY, 5, 2.4, 0.6, 0, TAU); ctx.fill();
        break;
      case 'visor':
        ctx.fillStyle = accent;
        ctx.globalAlpha = 0.85;
        ctx.beginPath(); roundRect(ctx, -8, -16.5 + bodyY, 16, 4.2, 2); ctx.fill();
        ctx.globalAlpha = 1;
        break;
      case 'bow':
        ctx.beginPath();
        ctx.moveTo(-6, -21 + bodyY); ctx.lineTo(0, -18 + bodyY); ctx.lineTo(-6, -15 + bodyY); ctx.closePath(); ctx.fill();
        ctx.beginPath();
        ctx.moveTo(6, -21 + bodyY); ctx.lineTo(0, -18 + bodyY); ctx.lineTo(6, -15 + bodyY); ctx.closePath(); ctx.fill();
        break;
      case 'crown':
        ctx.beginPath();
        ctx.moveTo(-7, -19 + bodyY); ctx.lineTo(-7, -25 + bodyY); ctx.lineTo(-3, -20 + bodyY);
        ctx.lineTo(0, -26 + bodyY); ctx.lineTo(3, -20 + bodyY); ctx.lineTo(7, -25 + bodyY); ctx.lineTo(7, -19 + bodyY);
        ctx.closePath(); ctx.fill();
        break;
      case 'headphones':
        ctx.strokeStyle = accent; ctx.lineWidth = 2.4;
        ctx.beginPath(); ctx.arc(0, -14 + bodyY, 10, Math.PI * 1.15, Math.PI * 1.85); ctx.stroke();
        ctx.fillStyle = accent;
        ctx.beginPath(); ctx.ellipse(-9.5, -12 + bodyY, 2.6, 3.4, 0, 0, TAU); ctx.fill();
        ctx.beginPath(); ctx.ellipse(9.5, -12 + bodyY, 2.6, 3.4, 0, 0, TAU); ctx.fill();
        break;
      case 'cape':
        ctx.beginPath();
        ctx.moveTo(-9, -6 + bodyY); ctx.lineTo(9, -6 + bodyY); ctx.lineTo(6, 10 + bodyY); ctx.lineTo(-6, 10 + bodyY);
        ctx.closePath(); ctx.globalAlpha = 0.9; ctx.fill(); ctx.globalAlpha = 1;
        break;
      case 'shades':
        ctx.fillStyle = '#111';
        ctx.beginPath(); roundRect(ctx, -8, -15.5 + bodyY, 16, 3.6, 2); ctx.fill();
        break;
      case 'labcoat':
        ctx.fillStyle = accent;
        ctx.globalAlpha = 0.55;
        ctx.beginPath(); roundRect(ctx, -10, -4 + bodyY, 20, 12, 4); ctx.fill();
        ctx.globalAlpha = 1;
        break;
    }
  }

  /* -------------------- Guard -------------------- */
  function drawGuard(ctx, opts) {
    const { x, y, size = 40, facing = 1, walk = 0, alert = 0, state = 'patrol' } = opts;
    const s = size / 40;
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(facing < 0 ? -s : s, s);
    const legSwing = Math.sin(walk * 6) * 5;

    // shadow
    ctx.beginPath();
    ctx.ellipse(0, 16, 13, 4.5, 0, 0, TAU);
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.fill();

    // legs
    ctx.fillStyle = '#2b3350';
    roundRect(ctx, -9, 6, 6, 9 - legSwing * 0.2, 3); ctx.fill();
    roundRect(ctx, 3, 6, 6, 9 + legSwing * 0.2, 3); ctx.fill();

    // body (uniform)
    const bodyColor = state === 'suspicious' ? '#7a4030' : (state === 'alerted' ? '#8a2a2a' : '#3b4a78');
    ctx.fillStyle = bodyColor;
    ctx.beginPath(); ctx.ellipse(0, -2, 12.5, 11.5, 0, 0, TAU); ctx.fill();

    // belt
    ctx.fillStyle = '#22223a';
    roundRect(ctx, -11, 2, 22, 3.4, 1.5); ctx.fill();

    // arms
    ctx.fillStyle = bodyColor;
    ctx.beginPath(); ctx.ellipse(-12, 1, 4, 7, -0.2, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.ellipse(12, 1, 4, 7, 0.2, 0, TAU); ctx.fill();

    // head
    ctx.fillStyle = '#e7b98f';
    ctx.beginPath(); ctx.ellipse(0, -15, 8.6, 8, 0, 0, TAU); ctx.fill();

    // cap
    ctx.fillStyle = '#22223a';
    ctx.beginPath(); ctx.ellipse(0, -20, 9, 4, 0, Math.PI, TAU); ctx.fill();
    roundRect(ctx, -2, -24, 11, 3, 1); ctx.fill();

    // eyes
    ctx.fillStyle = '#111';
    const eyeY = -16;
    ctx.beginPath(); ctx.arc(-3.4, eyeY, 1.1, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.arc(3.4, eyeY, 1.1, 0, TAU); ctx.fill();

    // alert bubble
    if (alert > 0.05) {
      ctx.save();
      ctx.scale(facing < 0 ? -1 : 1, 1);
      ctx.font = 'bold 15px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = alert >= 0.99 ? '#ff3050' : '#ffd23f';
      const label = alert >= 0.99 ? '!' : '?';
      ctx.globalAlpha = 0.5 + Math.min(0.5, alert);
      ctx.fillText(label, 0, -30 - Math.sin(walk * 8) * 2);
      ctx.restore();
    }

    ctx.restore();
  }

  /* -------------------- Vision cone -------------------- */
  function drawVisionCone(ctx, x, y, angle, range, spread, alertRatio, lit) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, range);
    const hue = alertRatio > 0.99 ? '255,48,80' : (lit ? '255,180,60' : '255,210,63');
    grad.addColorStop(0, `rgba(${hue},${0.28 + alertRatio * 0.25})`);
    grad.addColorStop(1, `rgba(${hue},0)`);
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, range, -spread / 2, spread / 2);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  /* -------------------- Environment tiles -------------------- */
  function drawFloor(ctx, x, y, size, variant) {
    ctx.fillStyle = variant % 2 === 0 ? '#3a2456' : '#3d2759';
    ctx.fillRect(x, y, size, size);
    ctx.strokeStyle = 'rgba(255,255,255,0.03)';
    ctx.strokeRect(x + 0.5, y + 0.5, size - 1, size - 1);
  }

  function drawWall(ctx, x, y, size) {
    const grad = ctx.createLinearGradient(x, y, x, y + size);
    grad.addColorStop(0, '#5a3a86');
    grad.addColorStop(1, '#432a63');
    ctx.fillStyle = grad;
    ctx.fillRect(x, y, size, size);
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.fillRect(x, y + size - 5, size, 5);
    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.strokeRect(x + 1, y + 1, size - 2, size - 2);
  }

  function drawVent(ctx, x, y, size) {
    drawFloor(ctx, x, y, size, 0);
    ctx.fillStyle = '#26314a';
    roundRect(ctx, x + 4, y + 4, size - 8, size - 8, 4);
    ctx.fill();
    ctx.strokeStyle = '#5a708f';
    ctx.lineWidth = 1.4;
    for (let i = 1; i < 4; i++) {
      ctx.beginPath();
      ctx.moveTo(x + 4, y + 4 + (i * (size - 8)) / 4);
      ctx.lineTo(x + size - 4, y + 4 + (i * (size - 8)) / 4);
      ctx.stroke();
    }
  }

  function drawBush(ctx, x, y, size) {
    drawFloor(ctx, x, y, size, 1);
    const cx = x + size / 2, cy = y + size / 2 + 3;
    ctx.fillStyle = '#2f6e3f';
    ctx.beginPath(); ctx.arc(cx - 8, cy, 9, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.arc(cx + 8, cy, 9, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.arc(cx, cy - 8, 10, 0, TAU); ctx.fill();
    ctx.fillStyle = '#3f8f52';
    ctx.beginPath(); ctx.arc(cx - 3, cy - 6, 5, 0, TAU); ctx.fill();
  }

  function drawLamp(ctx, x, y, size, lit) {
    drawFloor(ctx, x, y, size, 0);
    const cx = x + size / 2, cy = y + size / 2;
    if (lit) {
      const grad = ctx.createRadialGradient(cx, cy, 4, cx, cy, size * 2.2);
      grad.addColorStop(0, 'rgba(255,220,140,0.32)');
      grad.addColorStop(1, 'rgba(255,220,140,0)');
      ctx.fillStyle = grad;
      ctx.beginPath(); ctx.arc(cx, cy, size * 2.2, 0, TAU); ctx.fill();
    }
    ctx.fillStyle = '#1c1c26';
    ctx.fillRect(cx - 2, cy - 4, 4, 18);
    ctx.fillStyle = lit ? '#ffe28a' : '#4a4a56';
    ctx.beginPath(); ctx.arc(cx, cy - 6, 6, 0, TAU); ctx.fill();
    if (lit) {
      ctx.fillStyle = 'rgba(255,220,140,0.5)';
      ctx.beginPath(); ctx.arc(cx, cy - 6, 9, 0, TAU); ctx.fill();
    }
  }

  function drawCandy(ctx, x, y, size, bob) {
    const cx = x + size / 2, cy = y + size / 2 + (bob || 0);
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(Math.sin((bob || 0) * 2) * 0.15);
    ctx.fillStyle = '#ff5fa2';
    ctx.beginPath(); ctx.arc(0, 0, 6.5, 0, TAU); ctx.fill();
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.moveTo(-4, -2); ctx.lineTo(4, 2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-4, 2); ctx.lineTo(4, -2); ctx.stroke();
    // wrapper twists
    ctx.fillStyle = '#ffd23f';
    ctx.beginPath(); ctx.moveTo(-6.5, 0); ctx.lineTo(-11, -4); ctx.lineTo(-11, 4); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(6.5, 0); ctx.lineTo(11, -4); ctx.lineTo(11, 4); ctx.closePath(); ctx.fill();
    ctx.restore();
  }

  function drawSafe(ctx, x, y, size, opened, progress) {
    drawFloor(ctx, x, y, size, 0);
    const pad = size * 0.12;
    ctx.fillStyle = opened ? '#3f2a1a' : '#d179a0';
    roundRect(ctx, x + pad, y + pad, size - pad * 2, size - pad * 2, 6);
    ctx.fill();
    ctx.strokeStyle = '#5a2f45'; ctx.lineWidth = 2;
    ctx.stroke();
    const cx = x + size / 2, cy = y + size / 2;
    if (opened) {
      ctx.fillStyle = '#ffd23f';
      ctx.beginPath(); ctx.arc(cx, cy, size * 0.16, 0, TAU); ctx.fill();
      ctx.fillStyle = '#fff8';
      ctx.font = 'bold 12px sans-serif'; ctx.textAlign = 'center';
      ctx.fillText('OPEN', cx, cy + 4);
    } else {
      ctx.strokeStyle = '#7a3a58'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(cx, cy, size * 0.22, 0, TAU); ctx.stroke();
      ctx.fillStyle = '#7a3a58';
      ctx.beginPath(); ctx.arc(cx, cy, 3, 0, TAU); ctx.fill();
      if (progress > 0) {
        ctx.strokeStyle = '#3ddc84'; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(cx, cy, size * 0.32, -Math.PI / 2, -Math.PI / 2 + TAU * progress); ctx.stroke();
      }
    }
  }

  function drawExit(ctx, x, y, size, active) {
    drawFloor(ctx, x, y, size, 0);
    ctx.save();
    ctx.globalAlpha = active ? 1 : 0.55;
    ctx.fillStyle = '#ffd23f';
    roundRect(ctx, x + 3, y + 3, size - 6, size - 6, 8);
    ctx.fill();
    ctx.fillStyle = '#241540';
    ctx.font = `bold ${Math.round(size * 0.3)}px sans-serif`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('🚐', x + size / 2, y + size / 2 + 1);
    ctx.restore();
  }

  function drawDecoy(ctx, x, y, size, phase) {
    const cx = x + size / 2, cy = y + size / 2;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.fillStyle = 'rgba(255,210,63,0.35)';
    ctx.beginPath(); ctx.arc(0, 0, 14 + Math.sin(phase * 6) * 3, 0, TAU); ctx.fill();
    ctx.font = '16px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('🍬', 0, 0);
    ctx.restore();
  }

  function drawCamera(ctx, x, y, size, angle) {
    const cx = x + size / 2, cy = y + size / 2;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.fillStyle = '#26314a';
    ctx.beginPath(); ctx.arc(0, 0, 8, 0, TAU); ctx.fill();
    ctx.rotate(angle);
    ctx.fillStyle = '#e63950';
    ctx.beginPath(); ctx.arc(6, 0, 2.5, 0, TAU); ctx.fill();
    ctx.fillStyle = '#3a4a70';
    roundRect(ctx, 0, -4, 10, 8, 2); ctx.fill();
    ctx.restore();
  }

  PH.Render = {
    roundRect, drawPanda, drawGuard, drawVisionCone, drawFloor, drawWall,
    drawVent, drawBush, drawLamp, drawCandy, drawSafe, drawExit, drawDecoy, drawCamera
  };
})(window.PH = window.PH || {});
