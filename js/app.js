// TYPE//TANK - App State Machine & Controller
(function() {
  var state = 'login';
  var settings = { mode: 1, aspectRatio: 'auto', crtOn: true, muted: false };
  var callsign = '';
  var gameResult = null;
  var confettiAnimId = null;
  var confettiParticles = [];

  // --- DOM refs ---
  var screens = {};
  var el = function(id) { return document.getElementById(id); };

  function init() {
    settings = Storage.getSettings();
    callsign = Storage.getCallsign();

    screens = {
      login: el('screen-login'),
      settings: el('screen-settings'),
      instructions: el('screen-instructions'),
      game: el('screen-game'),
      result: el('screen-result'),
      records: el('screen-records')
    };

    applyAspectRatio(settings.aspectRatio);
    applyCRT(settings.crtOn);
    applyMute(settings.muted);
    updateHeaderHUD();
    setupHeader();
    setupLogin();
    setupSettings();
    setupInstructions();
    setupResult();
    setupRecords();

    document.addEventListener('keydown', globalKeydown);
    window.addEventListener('resize', onWindowResize);

    if (callsign) {
      showScreen('settings');
    } else {
      showScreen('login');
    }
  }

  function showScreen(name) {
    state = name;
    Object.keys(screens).forEach(function(k) {
      screens[k].classList.toggle('active', k === name);
    });
    updateHeaderHUD();
    if (name === 'settings') renderSettingsScreen();
    if (name === 'result') renderResultScreen();
    if (name === 'records') renderRecordsScreen();
    if (name === 'game') startGame();
  }

  function updateHeaderHUD() {
    var cs = el('hud-callsign');
    if (cs) cs.textContent = callsign || '---';
    var modeEl = el('hud-mode');
    if (modeEl) modeEl.textContent = 'M' + settings.mode;
  }

  // ---- ASPECT RATIO ----
  function applyAspectRatio(ar) {
    settings.aspectRatio = ar;
    var root = el('app-root');
    root.className = 'ar-' + ar;
    el('btn-ar').textContent = ar === 'auto' ? 'AUTO' : ar === '16:9' ? '16:9' : '4:3';
    Storage.saveSettings(settings);
    if (state === 'game') Game.resize();
  }

  function cycleAspectRatio() {
    var options = ['auto', '16:9', '4:3'];
    var idx = options.indexOf(settings.aspectRatio);
    applyAspectRatio(options[(idx + 1) % options.length]);
    AudioEngine.playClick();
  }

  // ---- CRT ----
  function applyCRT(on) {
    settings.crtOn = on;
    el('crt-overlay').style.display = on ? 'block' : 'none';
    el('btn-crt').textContent = on ? 'CRT:ON' : 'CRT:OFF';
    Storage.saveSettings(settings);
  }

  function toggleCRT() {
    applyCRT(!settings.crtOn);
    AudioEngine.playClick();
  }

  // ---- MUTE ----
  function applyMute(muted) {
    settings.muted = muted;
    AudioEngine.setMuted(muted);
    el('btn-mute').textContent = muted ? 'SND:OFF' : 'SND:ON';
    Storage.saveSettings(settings);
  }

  function toggleMute() {
    applyMute(!settings.muted);
  }

  // ---- HEADER ----
  function setupHeader() {
    el('btn-crt').addEventListener('click', toggleCRT);
    el('btn-mute').addEventListener('click', toggleMute);
    el('btn-ar').addEventListener('click', cycleAspectRatio);
    el('btn-switch').addEventListener('click', function() {
      AudioEngine.playClick();
      if (state === 'game') { Game.abort(); return; }
      callsign = '';
      Storage.setCallsign('');
      el('login-input').value = '';
      showScreen('login');
    });
  }

  // ---- LOGIN ----
  function setupLogin() {
    var inp = el('login-input');
    var btn = el('login-btn');
    inp.addEventListener('keydown', function(e) {
      if (e.key === 'Enter') doLogin();
    });
    btn.addEventListener('click', function() {
      AudioEngine.playClick();
      doLogin();
    });
    inp.focus();
  }

  function doLogin() {
    var val = el('login-input').value.trim();
    if (!val) {
      el('login-input').classList.add('error');
      setTimeout(function() { el('login-input').classList.remove('error'); }, 600);
      return;
    }
    callsign = val.toUpperCase();
    Storage.setCallsign(callsign);
    AudioEngine.playClick();
    updateHeaderHUD();
    showScreen('settings');
  }

  // ---- SETTINGS ----
  var modeLabels = ['ALPHA','BRAVO','CHARLIE','DELTA'];
  var modeSamples = [
    ['tank','radar','artillery','phantom','surge'],
    ['Tank','RadarX','DeltaForce','AlphaTeam','HawkEye'],
    ['Tank99','M1A2','Radar7','Alpha01','Port443'],
    ['[tank-01]','(8+9)','{cmd-9}','!alert!','[F-16]']
  ];

  function setupSettings() {
    el('settings-btn').addEventListener('click', function() {
      AudioEngine.playClick();
      settings.mode = parseInt(el('settings-btn').dataset.mode || '1');
      Storage.saveSettings(settings);
      showScreen('instructions');
    });
    // aspect buttons
    ['auto','16:9','4:3'].forEach(function(ar) {
      var b = el('ar-btn-' + ar.replace(':','-'));
      if (b) b.addEventListener('click', function() {
        AudioEngine.playClick();
        applyAspectRatio(ar);
        renderSettingsScreen();
      });
    });
  }

  function renderSettingsScreen() {
    var grid = el('mode-cards');
    grid.innerHTML = '';
    for (var m = 1; m <= 4; m++) {
      (function(mm) {
        var card = document.createElement('div');
        card.className = 'mode-card' + (settings.mode === mm ? ' selected' : '');
        card.innerHTML =
          '<div class="mode-badge">MODE ' + mm + ' [' + modeLabels[mm-1] + ']</div>' +
          '<div class="mode-chars">' + getModeChars(mm) + '</div>' +
          '<div class="mode-preview">' +
            modeSamples[mm-1].slice(0,3).map(function(s){ return '<span>' + s + '</span>'; }).join('') +
          '</div>';
        card.addEventListener('click', function() {
          AudioEngine.playClick();
          settings.mode = mm;
          Storage.saveSettings(settings);
          renderSettingsScreen();
        });
        grid.appendChild(card);
      })(m);
    }

    // update preview bar
    var pb = el('preview-bar');
    pb.innerHTML = modeSamples[settings.mode - 1].map(function(s){ return '<span class="preview-word">' + s + '</span>'; }).join('');

    // matrix toggles
    el('tog-upper').classList.toggle('on', settings.mode >= 2);
    el('tog-nums').classList.toggle('on', settings.mode >= 3);
    el('tog-specials').classList.toggle('on', settings.mode >= 4);

    // ar buttons
    ['auto','16:9','4:3'].forEach(function(ar) {
      var b = el('ar-btn-' + ar.replace(':','-'));
      if (b) b.classList.toggle('selected', settings.aspectRatio === ar);
    });

    // proceed btn data
    el('settings-btn').dataset.mode = settings.mode;
    el('settings-label').textContent = 'MODE ' + settings.mode + ' [' + modeLabels[settings.mode-1] + ']';
  }

  function getModeChars(m) {
    var s = 'a-z';
    if (m >= 2) s += ' · A-Z';
    if (m >= 3) s += ' · 0-9';
    if (m >= 4) s += ' · !@#$[]{}()';
    return s;
  }

  // matrix toggle buttons
  document.addEventListener('DOMContentLoaded', function() {
    var togMap = { 'tog-upper': 2, 'tog-nums': 3, 'tog-specials': 4 };
    Object.keys(togMap).forEach(function(id) {
      var btn = el(id);
      if (btn) btn.addEventListener('click', function() {
        AudioEngine.playClick();
        var target = togMap[id];
        if (settings.mode >= target) {
          settings.mode = target - 1;
        } else {
          settings.mode = target;
        }
        if (settings.mode < 1) settings.mode = 1;
        Storage.saveSettings(settings);
        renderSettingsScreen();
      });
    });
  });

  // ---- INSTRUCTIONS ----
  function setupInstructions() {
    var btn = el('instr-btn');
    btn.addEventListener('click', function() {
      AudioEngine.playClick();
      showScreen('game');
    });
  }

  // ---- GAME ----
  function startGame() {
    AudioEngine.init();
    AudioEngine.resume();
    var canvas = el('game-canvas');
    setTimeout(function() {
      resizeCanvas(canvas);
      Game.init(canvas, settings.mode, onGameOver);
      Game.start();
    }, 60);
  }

  function resizeCanvas(canvas) {
    var container = el('game-arena');
    canvas.width = container.clientWidth || 800;
    canvas.height = container.clientHeight || 500;
    if (Game && Game.resize) Game.resize();
  }

  function onWindowResize() {
    if (state === 'game') {
      var canvas = el('game-canvas');
      resizeCanvas(canvas);
      Game.resize();
    }
  }

  function onGameOver(result) {
    gameResult = result;
    var isNew = Storage.updatePersonalBest(result.mode, result);
    gameResult.isNewRecord = isNew;
    Storage.addRecord(Object.assign({}, result, { isNew: isNew }));
    Storage.updateLifetimeStats(result);
    showScreen('result');
  }

  // ---- RESULT ----
  function renderResultScreen() {
    if (!gameResult) return;
    var r = gameResult;
    var pb = Storage.getPersonalBest(r.mode);

    el('res-score').textContent = String(r.score).padStart(6,'0');
    el('res-wpm').textContent = r.wpm;
    el('res-acc').textContent = r.accuracy + '%';
    el('res-words').textContent = r.wordsDestroyed;
    el('res-combo').textContent = 'x' + r.maxCombo;
    el('res-mode').textContent = 'MODE ' + r.mode + ' [' + modeLabels[r.mode-1] + ']';

    var celebEl = el('result-celebration');
    var pbEl = el('result-pb');

    if (r.isNewRecord && !r.aborted) {
      celebEl.style.display = 'block';
      pbEl.style.display = 'none';
      AudioEngine.playVictory();
      startConfetti();
    } else {
      celebEl.style.display = 'none';
      pbEl.style.display = 'block';
      stopConfetti();
      if (pb && pb.score > r.score) {
        el('pb-score').textContent = String(pb.score).padStart(6,'0');
        el('pb-delta').textContent = '+' + (pb.score - r.score) + ' PTS NEEDED';
      } else {
        el('pb-score').textContent = '------';
        el('pb-delta').textContent = 'SET A NEW RECORD!';
      }
    }
  }

  function setupResult() {
    el('result-play-btn').addEventListener('click', function() {
      AudioEngine.playClick();
      stopConfetti();
      showScreen('settings');
    });
    el('result-records-btn').addEventListener('click', function() {
      AudioEngine.playClick();
      stopConfetti();
      showScreen('records');
    });
  }

  // ---- CONFETTI ----
  var confettiCanvas, confettiCtx;
  function startConfetti() {
    confettiCanvas = el('confetti-canvas');
    confettiCtx = confettiCanvas.getContext('2d');
    confettiCanvas.width = window.innerWidth;
    confettiCanvas.height = window.innerHeight;
    confettiCanvas.style.display = 'block';
    confettiParticles = [];
    var colors = ['#ff3333','#33ff77','#ffff33','#3399ff','#ff66ff','#ff9933','#aaffcc'];
    for (var i = 0; i < 120; i++) {
      confettiParticles.push({
        x: Math.random() * confettiCanvas.width,
        y: -10 - Math.random() * 200,
        vx: (Math.random() - 0.5) * 3,
        vy: 2 + Math.random() * 4,
        color: colors[Math.floor(Math.random() * colors.length)],
        w: 6 + Math.random() * 8,
        h: 4 + Math.random() * 6,
        rot: Math.random() * Math.PI,
        vrot: (Math.random() - 0.5) * 0.2
      });
    }
    animateConfetti();
  }

  function stopConfetti() {
    cancelAnimationFrame(confettiAnimId);
    if (confettiCanvas) confettiCanvas.style.display = 'none';
    confettiParticles = [];
  }

  function animateConfetti() {
    confettiCtx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
    for (var i = 0; i < confettiParticles.length; i++) {
      var p = confettiParticles[i];
      p.x += p.vx; p.y += p.vy; p.rot += p.vrot;
      if (p.y > confettiCanvas.height + 20) {
        p.y = -10; p.x = Math.random() * confettiCanvas.width;
      }
      confettiCtx.save();
      confettiCtx.translate(p.x, p.y);
      confettiCtx.rotate(p.rot);
      confettiCtx.fillStyle = p.color;
      confettiCtx.fillRect(-p.w/2, -p.h/2, p.w, p.h);
      confettiCtx.restore();
    }
    confettiAnimId = requestAnimationFrame(animateConfetti);
  }

  // ---- RECORDS ----
  var recordFilter = 'all';
  function renderRecordsScreen() {
    var lifetime = Storage.getLifetimeStats();
    var bests = {};
    for (var m = 1; m <= 4; m++) bests[m] = Storage.getPersonalBest(m);
    var records = Storage.getRecords();

    el('lt-score').textContent = String(lifetime.bestScore || 0).padStart(6,'0');
    el('lt-wpm').textContent = lifetime.bestWpm || 0;
    el('lt-acc').textContent = (lifetime.bestAccuracy || 0) + '%';
    el('lt-words').textContent = lifetime.totalWords || 0;

    // Mode bests
    for (var mm = 1; mm <= 4; mm++) {
      var b = bests[mm];
      var bsEl = el('mb-score-' + mm);
      var bwEl = el('mb-wpm-' + mm);
      if (bsEl) bsEl.textContent = b ? String(b.score).padStart(6,'0') : '------';
      if (bwEl) bwEl.textContent = b ? b.wpm : '--';
    }

    renderFlightLog(records);
    setupFilterBtns();
  }

  function setupFilterBtns() {
    ['all','1','2','3','4'].forEach(function(f) {
      var b = el('filter-' + f);
      if (b) {
        b.classList.toggle('selected', recordFilter === f);
        b.onclick = function() {
          recordFilter = f;
          AudioEngine.playClick();
          renderFlightLog(Storage.getRecords());
          setupFilterBtns();
        };
      }
    });
  }

  function renderFlightLog(records) {
    var filtered = recordFilter === 'all' ? records : records.filter(function(r){ return String(r.mode) === recordFilter; });
    var tbody = el('log-tbody');
    tbody.innerHTML = '';
    var bests = {};
    for (var m = 1; m <= 4; m++) {
      var pb = Storage.getPersonalBest(m);
      if (pb) bests[m] = pb.score;
    }
    filtered.slice(0, 50).forEach(function(r) {
      var tr = document.createElement('tr');
      var date = new Date(r.timestamp);
      var dateStr = date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'});
      var isPB = bests[r.mode] && r.score >= bests[r.mode];
      tr.innerHTML =
        '<td class="log-date">' + dateStr + '</td>' +
        '<td><span class="mode-chip mode-chip-' + r.mode + '">M' + r.mode + '</span></td>' +
        '<td class="log-score' + (isPB ? ' pb-mark' : '') + '">' + String(r.score).padStart(6,'0') + (isPB ? ' <span class="pb-star">★ PB</span>' : '') + '</td>' +
        '<td>' + r.wpm + '</td>' +
        '<td>' + r.accuracy + '%</td>' +
        '<td>x' + r.maxCombo + '</td>';
      tbody.appendChild(tr);
    });
    if (filtered.length === 0) {
      var tr = document.createElement('tr');
      tr.innerHTML = '<td colspan="6" class="log-empty">NO RECORDS FOUND</td>';
      tbody.appendChild(tr);
    }
  }

  function setupRecords() {
    el('records-back-btn').addEventListener('click', function() {
      AudioEngine.playClick();
      showScreen(gameResult ? 'result' : 'settings');
    });
    el('purge-btn').addEventListener('click', function() {
      AudioEngine.playClick();
      var conf = el('purge-confirm');
      conf.style.display = conf.style.display === 'flex' ? 'none' : 'flex';
    });
    el('purge-yes').addEventListener('click', function() {
      Storage.purgeAll();
      AudioEngine.playClick();
      el('purge-confirm').style.display = 'none';
      renderRecordsScreen();
    });
    el('purge-no').addEventListener('click', function() {
      el('purge-confirm').style.display = 'none';
    });
  }

  // ---- GLOBAL KEYBOARD ----
  function globalKeydown(e) {
    if (state === 'login') {
      // handled by input element
      return;
    }
    if (state === 'settings') {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        AudioEngine.playClick();
        showScreen('instructions');
      }
      if (e.key === 'Escape') showScreen('login');
      return;
    }
    if (state === 'instructions') {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        AudioEngine.playClick();
        showScreen('game');
      }
      if (e.key === 'Escape') showScreen('settings');
      return;
    }
    if (state === 'game') {
      if (e.key === 'Escape') {
        Game.abort();
        return;
      }
      if (e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey) {
        e.preventDefault();
        Game.handleKey(e.key);
      }
      return;
    }
    if (state === 'result') {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        stopConfetti();
        showScreen('settings');
      }
      if (e.key === 'r' || e.key === 'R') {
        e.preventDefault();
        stopConfetti();
        showScreen('records');
      }
      return;
    }
    if (state === 'records') {
      if (e.key === 'Escape' || e.key === 'Backspace') {
        showScreen(gameResult ? 'result' : 'settings');
      }
      return;
    }
  }

  document.addEventListener('DOMContentLoaded', init);
})();

