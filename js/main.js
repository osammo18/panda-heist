/* ============================================================
   Panda Heist — Entry point
   ============================================================ */
(function (PH) {
  'use strict';

  function boot() {
    PH.Input.init();
    PH.Game.init(document.getElementById('game-canvas'));
    PH.UI.init();

    // Any first user gesture unlocks WebAudio (required by mobile browsers)
    const unlock = () => { PH.Audio.init(); PH.Audio.resume(); window.removeEventListener('pointerdown', unlock); };
    window.addEventListener('pointerdown', unlock, { once: true });

    // Prevent iOS/Android page bounce & pinch-zoom during play
    document.addEventListener('touchmove', (e) => { e.preventDefault(); }, { passive: false });
    document.addEventListener('gesturestart', (e) => e.preventDefault());
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})(window.PH = window.PH || {});
