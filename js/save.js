/* ============================================================
   Panda Heist — Save/Progress (localStorage)
   ============================================================ */
(function (PH) {
  'use strict';

  const KEY = 'pandaHeistSave_v1';

  function defaultState() {
    return {
      currency: 0,
      unlockedLevels: 1,           // number of levels unlocked from the start
      levelStars: {},              // levelId -> best star count (0-3)
      costumes: { bamboo: ['classic'], bao: ['classic'], mei: ['classic'] },
      equipped: { bamboo: 'classic', bao: 'classic', mei: 'classic' },
      muted: false
    };
  }

  let state = null;

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      state = raw ? Object.assign(defaultState(), JSON.parse(raw)) : defaultState();
      // guard against malformed nested objects from older versions
      state.costumes = Object.assign(defaultState().costumes, state.costumes || {});
      state.equipped = Object.assign(defaultState().equipped, state.equipped || {});
      state.levelStars = state.levelStars || {};
    } catch (e) {
      state = defaultState();
    }
    return state;
  }

  function persist() {
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { /* storage unavailable */ }
  }

  function get() {
    if (!state) load();
    return state;
  }

  function addCurrency(n) {
    get().currency = Math.max(0, get().currency + n);
    persist();
  }

  function spendCurrency(n) {
    if (get().currency < n) return false;
    state.currency -= n;
    persist();
    return true;
  }

  function unlockCostume(charId, costumeId) {
    const list = get().costumes[charId] || (state.costumes[charId] = []);
    if (!list.includes(costumeId)) list.push(costumeId);
    persist();
  }

  function isCostumeUnlocked(charId, costumeId) {
    return (get().costumes[charId] || []).includes(costumeId);
  }

  function setEquipped(charId, costumeId) {
    get().equipped[charId] = costumeId;
    persist();
  }

  function getEquippedCostume(charId) {
    const id = get().equipped[charId] || 'classic';
    return (PH.COSTUMES[charId] || []).find(c => c.id === id) || PH.COSTUMES[charId][0];
  }

  function recordLevelResult(levelIndex, levelId, stars, candyEarned) {
    const s = get();
    s.levelStars[levelId] = Math.max(s.levelStars[levelId] || 0, stars);
    if (stars > 0 && levelIndex + 1 >= s.unlockedLevels && levelIndex + 1 < PH.LEVELS.length) {
      s.unlockedLevels = levelIndex + 2;
    } else if (stars > 0 && s.unlockedLevels < 1) {
      s.unlockedLevels = 1;
    }
    if (candyEarned) s.currency += candyEarned;
    persist();
  }

  function setMuted(m) {
    get().muted = m;
    persist();
  }

  PH.Save = {
    load, get, persist, addCurrency, spendCurrency,
    unlockCostume, isCostumeUnlocked, setEquipped, getEquippedCostume,
    recordLevelResult, setMuted
  };
})(window.PH = window.PH || {});
