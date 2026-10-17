// TYPE//TANK - localStorage Engine
const Storage = (function() {
  var PREFIX = 'typetank_';

  function key(k) { return PREFIX + k; }

  // ---- Callsign / Profile ----
  function getCallsign() { return localStorage.getItem(key('callsign')) || ''; }
  function setCallsign(name) { localStorage.setItem(key('callsign'), name); }

  // ---- Settings ----
  function getSettings() {
    var def = { mode: 1, aspectRatio: 'auto', crtOn: true, muted: false };
    try {
      var stored = JSON.parse(localStorage.getItem(key('settings')) || '{}');
      return Object.assign(def, stored);
    } catch(e) { return def; }
  }
  function saveSettings(s) { localStorage.setItem(key('settings'), JSON.stringify(s)); }

  // ---- Records ----
  function getRecords() {
    try { return JSON.parse(localStorage.getItem(key('records')) || '[]'); }
    catch(e) { return []; }
  }
  function saveRecords(records) { localStorage.setItem(key('records'), JSON.stringify(records)); }

  function addRecord(rec) {
    var records = getRecords();
    rec.timestamp = Date.now();
    records.unshift(rec);
    if (records.length > 200) records = records.slice(0, 200);
    saveRecords(records);
  }

  // ---- Personal Bests ----
  function getPersonalBests() {
    try { return JSON.parse(localStorage.getItem(key('bests')) || '{}'); }
    catch(e) { return {}; }
  }

  function updatePersonalBest(mode, rec) {
    var bests = getPersonalBests();
    var k = 'mode' + mode;
    var prev = bests[k] || null;
    var isNew = false;
    if (!prev || rec.score > prev.score) {
      bests[k] = rec;
      isNew = true;
    }
    localStorage.setItem(key('bests'), JSON.stringify(bests));
    return isNew;
  }

  function getPersonalBest(mode) {
    var bests = getPersonalBests();
    return bests['mode' + mode] || null;
  }

  // ---- Lifetime Stats ----
  function getLifetimeStats() {
    try { return JSON.parse(localStorage.getItem(key('lifetime')) || '{}'); }
    catch(e) { return {}; }
  }

  function updateLifetimeStats(rec) {
    var stats = getLifetimeStats();
    stats.totalWords = (stats.totalWords || 0) + (rec.wordsDestroyed || 0);
    stats.bestScore = Math.max(stats.bestScore || 0, rec.score || 0);
    stats.bestWpm = Math.max(stats.bestWpm || 0, rec.wpm || 0);
    stats.bestAccuracy = Math.max(stats.bestAccuracy || 0, rec.accuracy || 0);
    stats.totalGames = (stats.totalGames || 0) + 1;
    localStorage.setItem(key('lifetime'), JSON.stringify(stats));
  }

  // ---- Purge ----
  function purgeAll() {
    localStorage.removeItem(key('records'));
    localStorage.removeItem(key('bests'));
    localStorage.removeItem(key('lifetime'));
  }

  return { getCallsign, setCallsign, getSettings, saveSettings, getRecords, addRecord, getPersonalBest, updatePersonalBest, getLifetimeStats, updateLifetimeStats, purgeAll };
})();
