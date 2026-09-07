/* ============================================================
   Panda Heist — Input
   Unified keyboard + virtual joystick + touch button handling.
   ============================================================ */
(function (PH) {
  'use strict';

  const state = {
    dx: 0, dy: 0,               // movement vector, -1..1 each axis
    actionDown: false,
    actionPressed: false,       // edge-triggered (cleared each frame read)
    specialPressed: false,      // edge-triggered
    pausePressed: false
  };

  const keys = {};
  const KEY_MAP = {
    up: ['ArrowUp', 'KeyW'],
    down: ['ArrowDown', 'KeyS'],
    left: ['ArrowLeft', 'KeyA'],
    right: ['ArrowRight', 'KeyD']
  };

  function isDown(list) { return list.some(k => keys[k]); }

  function updateKeyboardVector() {
    let x = 0, y = 0;
    if (isDown(KEY_MAP.left)) x -= 1;
    if (isDown(KEY_MAP.right)) x += 1;
    if (isDown(KEY_MAP.up)) y -= 1;
    if (isDown(KEY_MAP.down)) y += 1;
    keyboardVector.x = x; keyboardVector.y = y;
  }

  const keyboardVector = { x: 0, y: 0 };
  const joystickVector = { x: 0, y: 0 };
  let joystickActive = false;

  function init() {
    window.addEventListener('keydown', (e) => {
      keys[e.code] = true;
      updateKeyboardVector();
      if (e.code === 'Space' || e.code === 'KeyE') { state.actionDown = true; state.actionPressed = true; }
      if (e.code === 'KeyF' || e.code === 'ShiftLeft' || e.code === 'ShiftRight') { state.specialPressed = true; }
      if (e.code === 'Escape' || e.code === 'KeyP') { state.pausePressed = true; }
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) e.preventDefault();
    }, { passive: false });

    window.addEventListener('keyup', (e) => {
      keys[e.code] = false;
      updateKeyboardVector();
      if (e.code === 'Space' || e.code === 'KeyE') { state.actionDown = false; }
    });

    // Detect touch capability to reveal on-screen controls
    const hasTouch = ('ontouchstart' in window) || navigator.maxTouchPoints > 0 || window.innerWidth < 900;
    if (hasTouch) document.body.classList.add('touch-device');

    setupJoystick();
    setupButtons();
  }

  function setupJoystick() {
    const zone = document.getElementById('joystick-zone');
    const nub = document.getElementById('joystick-nub');
    if (!zone || !nub) return;
    let originX = 0, originY = 0, radius = 60, pointerId = null;

    function start(e) {
      const rect = zone.getBoundingClientRect();
      originX = rect.left + rect.width / 2;
      originY = rect.top + rect.height / 2;
      radius = rect.width / 2;
      pointerId = e.pointerId;
      joystickActive = true;
      zone.setPointerCapture(pointerId);
      move(e);
    }
    function move(e) {
      if (!joystickActive || e.pointerId !== pointerId) return;
      let dx = e.clientX - originX;
      let dy = e.clientY - originY;
      const dist = Math.hypot(dx, dy);
      const clamped = Math.min(dist, radius);
      const angle = Math.atan2(dy, dx);
      const nx = Math.cos(angle) * clamped;
      const ny = Math.sin(angle) * clamped;
      nub.style.transform = `translate(${nx}px, ${ny}px)`;
      const norm = clamped / radius;
      joystickVector.x = norm < 0.12 ? 0 : Math.cos(angle) * norm;
      joystickVector.y = norm < 0.12 ? 0 : Math.sin(angle) * norm;
    }
    function end(e) {
      if (e.pointerId !== pointerId) return;
      joystickActive = false;
      pointerId = null;
      joystickVector.x = 0; joystickVector.y = 0;
      nub.style.transform = 'translate(0,0)';
    }
    zone.addEventListener('pointerdown', start);
    zone.addEventListener('pointermove', move);
    zone.addEventListener('pointerup', end);
    zone.addEventListener('pointercancel', end);
  }

  function setupButtons() {
    const actionBtn = document.getElementById('btn-action');
    const specialBtn = document.getElementById('btn-special');
    if (actionBtn) {
      actionBtn.addEventListener('pointerdown', (e) => { e.preventDefault(); state.actionDown = true; state.actionPressed = true; });
      actionBtn.addEventListener('pointerup', () => { state.actionDown = false; });
      actionBtn.addEventListener('pointercancel', () => { state.actionDown = false; });
    }
    if (specialBtn) {
      specialBtn.addEventListener('pointerdown', (e) => { e.preventDefault(); state.specialPressed = true; });
    }
  }

  function getMoveVector() {
    // Prefer active joystick input, otherwise keyboard
    let x = joystickActive ? joystickVector.x : keyboardVector.x;
    let y = joystickActive ? joystickVector.y : keyboardVector.y;
    const len = Math.hypot(x, y);
    if (len > 1) { x /= len; y /= len; }
    return { x, y };
  }

  // Consume edge-triggered flags (call once per frame from game loop)
  function consumeFrame() {
    const out = {
      action: state.actionPressed,
      actionDown: state.actionDown,
      special: state.specialPressed,
      pause: state.pausePressed
    };
    state.actionPressed = false;
    state.specialPressed = false;
    state.pausePressed = false;
    return out;
  }

  PH.Input = { init, getMoveVector, consumeFrame };
})(window.PH = window.PH || {});
