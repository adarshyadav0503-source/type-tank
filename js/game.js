// TYPE//TANK - Canvas 2D Game Engine
var Game = (function() {
  var canvas, ctx;
  var W, H;
  var running = false;
  var words = [];
  var bullets = [];
  var particles = [];
  var locked = null;
  var score = 0;
  var combo = 0;
  var maxCombo = 0;
  var health = 100;
  var mode = 1;
  var startTime = 0;
  var keystrokes = 0;
  var hits = 0;
  var misses = 0;
  var wordsDestroyed = 0;
  var shakeAmt = 0;
  var shakeTimer = 0;
  var turretAngle = -Math.PI / 2;
  var turretTargetAngle = -Math.PI / 2;
  var spawnTimer = 0;
  var spawnInterval = 3000;
  var baseSpeed = 28;
  var difficultyTimer = 0;
  var onGameOver = null;
  var animId = null;
  var lastTime = 0;
  var muzzleFlash = 0;
  var recoil = 0;
  var tankX = 0;
  var tankY = 0;
  var tankR = 0;
  var wpmHistory = [];
  var lastWpmCheck = 0;

  // Word entity
  function WordEntity(text, isRed, spawnX) {
    this.text = text;
    this.isRed = isRed;
    this.x = spawnX;
    this.y = -10;
    this.typed = 0;
    this.speed = isRed ? baseSpeed * 1.8 : baseSpeed;
    this.opacity = 1;
    this.hit = false;
    this.id = Math.random();
  }

  // Bullet entity
  function Bullet(sx, sy, tx, ty, isRed) {
    this.x = sx; this.y = sy;
    this.tx = tx; this.ty = ty;
    var dx = tx - sx, dy = ty - sy;
    var dist = Math.sqrt(dx*dx + dy*dy);
    var speed = 520;
    this.vx = (dx/dist) * speed;
    this.vy = (dy/dist) * speed;
    this.isRed = isRed;
    this.alive = true;
    this.trail = [];
  }

  // Particle entity
  function Particle(x, y, vx, vy, color, life, size) {
    this.x = x; this.y = y;
    this.vx = vx; this.vy = vy;
    this.color = color; this.life = life; this.maxLife = life;
    this.size = size || 3;
  }

  function spawnParticles(x, y, count, color, speed, size) {
    for (var i = 0; i < count; i++) {
      var angle = Math.random() * Math.PI * 2;
      var spd = speed * (0.5 + Math.random() * 0.5);
      particles.push(new Particle(x, y, Math.cos(angle)*spd, Math.sin(angle)*spd, color, 0.6 + Math.random()*0.5, size || 3));
    }
  }

  function spawnExplosion(x, y, isRed) {
    var colors = isRed
      ? ['#ff2233','#ff6644','#ffaa22','#ffffff']
      : ['#33ff88','#aaffcc','#ffff55','#ffffff'];
    for (var c = 0; c < colors.length; c++) {
      spawnParticles(x, y, 8, colors[c], 180 + Math.random()*80, 4);
    }
  }

  function getWordStartX(w) {
    var textW = w.text.length * 10;
    return Math.max(textW/2+10, Math.min(W - textW/2 - 10, w.x));
  }

  function getWordCharX(w, charIdx) {
    var fontSize = 14;
    var startX = getWordStartX(w) - (w.text.length * (fontSize * 0.65)) / 2;
    return startX + charIdx * (fontSize * 0.65) + (fontSize * 0.32);
  }

  function fireBullet(word, charIdx) {
    var bx = tankX;
    var by = tankY - tankR - 6;
    var cos = Math.cos(turretAngle);
    var sin = Math.sin(turretAngle);
    var bbl = 46;
    bx += cos * bbl;
    by += sin * bbl;
    var tx = getWordCharX(word, charIdx);
    var ty = word.y;
    bullets.push(new Bullet(bx, by, tx, ty, word.isRed));
    muzzleFlash = 0.12;
    recoil = 0.15;
    AudioEngine.playShot();
  }

  function getLowestWordForChar(ch) {
    var best = null;
    for (var i = 0; i < words.length; i++) {
      var w = words[i];
      if (w.typed === 0 && w.text[0].toLowerCase() === ch.toLowerCase()) {
        if (!best || w.y > best.y) best = w;
      }
    }
    return best;
  }

  function handleKey(ch) {
    if (!running) return;
    keystrokes++;

    // If locked on a word, continue typing it
    if (locked) {
      var expected = locked.text[locked.typed];
      if (expected === ch || (ch === expected.toLowerCase()) || (ch === expected.toUpperCase())) {
        // accept exact or case matches based on mode
        if (mode === 1) { if (ch !== expected) { missKey(); return; } }
        else { if (ch !== expected) { missKey(); return; } }
        hits++;
        fireBullet(locked, locked.typed);
        locked.typed++;
        if (locked.typed >= locked.text.length) {
          eliminateWord(locked);
        }
      } else {
        missKey();
      }
      return;
    }

    // No lock, find word starting with ch
    var target = getLowestWordForChar(ch);
    if (target) {
      locked = target;
      locked.typed = 1;
      hits++;
      fireBullet(locked, 0);
      if (locked.typed >= locked.text.length) {
        eliminateWord(locked);
      }
    } else {
      missKey();
    }
  }

  function missKey() {
    misses++;
    combo = 0;
  }

  function eliminateWord(w) {
    score += Math.round((w.isRed ? 350 : 100) * (1 + combo * 0.1));
    wordsDestroyed++;
    combo++;
    if (combo > maxCombo) maxCombo = combo;
    if (combo > 0 && combo % 5 === 0) AudioEngine.playCombo();
    AudioEngine.playEliminate();
    spawnExplosion(w.x, w.y, w.isRed);
    if (w.isRed) RedSuppression.release(w.text[0]);
    words = words.filter(function(x) { return x !== w; });
    locked = null;
  }

  function spawnWord() {
    var existingChars = words.map(function(w) { return w.text[0].toLowerCase(); });
    // red bonus chance
    var isRed = (Math.random() < 0.12) && words.filter(function(w){ return w.isRed; }).length === 0;
    var text;
    if (isRed) {
      text = getRedBonusWord(mode);
      RedSuppression.suppress(text[0]);
      AudioEngine.playRedSpawn();
    } else {
      text = getRandomWord(mode, existingChars);
    }
    var textW = text.length * 10;
    var px = textW/2 + 20 + Math.random() * (W - textW - 40);
    var w = new WordEntity(text, isRed, px);
    words.push(w);
  }

  function update(dt) {
    var secs = dt / 1000;

    // Difficulty scaling
    difficultyTimer += dt;
    var diff = 1 + difficultyTimer / 60000;
    spawnInterval = Math.max(1200, 3000 / diff);
    var currentSpeed = baseSpeed * diff;

    // Spawn
    spawnTimer += dt;
    if (spawnTimer >= spawnInterval && words.length < 10) {
      spawnTimer = 0;
      spawnWord();
    }

    // Update words
    for (var i = words.length - 1; i >= 0; i--) {
      var w = words[i];
      w.y += w.speed * secs * (w.isRed ? 1.8 : 1);
      if (w.y > H - 70) {
        // breach!
        var dmg = w.isRed ? 30 : 20;
        health = Math.max(0, health - dmg);
        shakeAmt = w.isRed ? 14 : 8;
        shakeTimer = 0.3;
        AudioEngine.playDamage();
        spawnExplosion(w.x, H - 70, w.isRed);
        if (w.isRed) RedSuppression.release(w.text[0]);
        if (locked === w) locked = null;
        combo = 0;
        words.splice(i, 1);
        if (health <= 0) { gameOver(); return; }
      }
    }

    // Update bullets
    for (var j = bullets.length - 1; j >= 0; j--) {
      var b = bullets[j];
      b.trail.push({x: b.x, y: b.y});
      if (b.trail.length > 6) b.trail.shift();
      b.x += b.vx * secs;
      b.y += b.vy * secs;
      if (b.x < 0 || b.x > W || b.y < 0 || b.y > H) {
        bullets.splice(j, 1);
      }
    }

    // Update particles
    for (var k = particles.length - 1; k >= 0; k--) {
      var p = particles[k];
      p.x += p.vx * secs;
      p.y += p.vy * secs;
      p.vy += 120 * secs;
      p.life -= secs;
      if (p.life <= 0) particles.splice(k, 1);
    }

    // Turret aim
    if (locked) {
      var dx = locked.x - tankX;
      var dy = locked.y - tankY;
      turretTargetAngle = Math.atan2(dy, dx);
      turretTargetAngle = Math.max(-Math.PI, Math.min(0, turretTargetAngle));
    } else {
      turretTargetAngle = -Math.PI / 2;
    }
    turretAngle += (turretTargetAngle - turretAngle) * Math.min(1, secs * 8);

    // Screen shake decay
    if (shakeTimer > 0) { shakeTimer -= secs; if (shakeTimer < 0) { shakeTimer = 0; shakeAmt = 0; } }

    // Muzzle flash / recoil decay
    muzzleFlash = Math.max(0, muzzleFlash - secs * 4);
    recoil = Math.max(0, recoil - secs * 4);

    // WPM tracking
    lastWpmCheck += dt;
    if (lastWpmCheck > 2000) {
      lastWpmCheck = 0;
      var elapsed = (Date.now() - startTime) / 60000;
      var wpm = elapsed > 0 ? Math.round(wordsDestroyed / elapsed) : 0;
      wpmHistory.push(wpm);
    }
  }

  function getWPM() {
    var elapsed = (Date.now() - startTime) / 60000;
    return elapsed > 0 ? Math.round(wordsDestroyed / elapsed) : 0;
  }

  function getAccuracy() {
    var total = hits + misses;
    return total > 0 ? Math.round((hits / total) * 100) : 100;
  }

  function drawTank(ox, oy) {
    var x = tankX + ox;
    var y = tankY + oy;
    var r = tankR;

    // Tread chassis
    ctx.save();
    ctx.translate(x, y);

    // Base platform
    var grad = ctx.createLinearGradient(-r-10, -10, r+10, 10);
    grad.addColorStop(0, '#1a2a1a');
    grad.addColorStop(0.5, '#2d4a2d');
    grad.addColorStop(1, '#1a2a1a');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.rect(-r-12, -8, (r+12)*2, 22);
    ctx.fill();
    ctx.strokeStyle = '#3a7a3a';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Tread marks
    ctx.strokeStyle = '#4a9a4a';
    ctx.lineWidth = 1;
    for (var i = -r-8; i < r+8; i += 8) {
      ctx.beginPath();
      ctx.moveTo(i, -6); ctx.lineTo(i, 12);
      ctx.stroke();
    }

    // Hull dome
    var hullGrad = ctx.createRadialGradient(-r*0.2, -r*0.3, r*0.1, 0, 0, r);
    hullGrad.addColorStop(0, '#3a6a3a');
    hullGrad.addColorStop(0.6, '#1e3a1e');
    hullGrad.addColorStop(1, '#0a1a0a');
    ctx.fillStyle = hullGrad;
    ctx.beginPath();
    ctx.arc(0, 0, r, Math.PI, 0);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#4a9a4a';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Armor plates
    ctx.strokeStyle = '#5aaa5a';
    ctx.lineWidth = 1;
    for (var a = 0; a < 7; a++) {
      var ang = Math.PI + (a / 6) * Math.PI;
      ctx.beginPath();
      ctx.moveTo(Math.cos(ang)*r*0.6, Math.sin(ang)*r*0.6);
      ctx.lineTo(Math.cos(ang)*r*0.95, Math.sin(ang)*r*0.95);
      ctx.stroke();
    }

    // Turret base ring
    ctx.fillStyle = '#2a4a2a';
    ctx.beginPath();
    ctx.arc(0, 0, r*0.3, 0, Math.PI*2);
    ctx.fill();
    ctx.strokeStyle = '#44aa44';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Cannon barrel
    ctx.save();
    ctx.rotate(turretAngle + (recoil * 0.08));
    var barrelLen = r + 18 - recoil * 8;
    var barrelGrad = ctx.createLinearGradient(0, -4, 0, 4);
    barrelGrad.addColorStop(0, '#5aaa5a');
    barrelGrad.addColorStop(0.5, '#2a6a2a');
    barrelGrad.addColorStop(1, '#1a4a1a');
    ctx.fillStyle = barrelGrad;
    ctx.fillRect(r*0.2, -4, barrelLen - r*0.2, 8);
    ctx.strokeStyle = '#44aa44';
    ctx.lineWidth = 1;
    ctx.strokeRect(r*0.2, -4, barrelLen - r*0.2, 8);

    // Muzzle flash
    if (muzzleFlash > 0) {
      var mx = barrelLen;
      var mAlpha = muzzleFlash * 4;
      ctx.save();
      ctx.globalAlpha = Math.min(1, mAlpha);
      var mGrad = ctx.createRadialGradient(mx, 0, 0, mx, 0, 18 * muzzleFlash);
      mGrad.addColorStop(0, '#ffffff');
      mGrad.addColorStop(0.3, '#ffffaa');
      mGrad.addColorStop(0.7, '#ffaa33');
      mGrad.addColorStop(1, 'transparent');
      ctx.fillStyle = mGrad;
      ctx.beginPath();
      ctx.arc(mx, 0, 18 * muzzleFlash, 0, Math.PI*2);
      ctx.fill();
      ctx.restore();
    }

    ctx.restore(); // cannon
    ctx.restore(); // tank
  }

  function drawWord(w) {
    var fontSize = 14;
    ctx.font = 'bold ' + fontSize + 'px "Share Tech Mono", monospace';
    var charW = fontSize * 0.65;
    var textW = w.text.length * charW;
    var x = w.x - textW / 2;
    var y = w.y;

    // Background box
    var bgAlpha = w === locked ? 0.25 : 0.15;
    ctx.fillStyle = w.isRed ? 'rgba(180,20,20,' + bgAlpha + ')' : 'rgba(0,80,0,' + bgAlpha + ')';
    ctx.fillRect(x - 5, y - fontSize - 2, textW + 10, fontSize + 8);
    ctx.strokeStyle = w.isRed ? (w === locked ? '#ff4444' : '#882222') : (w === locked ? '#44ff88' : '#226622');
    ctx.lineWidth = w === locked ? 1.5 : 1;
    ctx.strokeRect(x - 5, y - fontSize - 2, textW + 10, fontSize + 8);

    // Draw each character
    for (var i = 0; i < w.text.length; i++) {
      var cx = x + i * charW;
      if (i < w.typed) {
        // Typed - faded
        ctx.globalAlpha = 0.38;
        ctx.fillStyle = w.isRed ? '#ff6666' : '#44ff88';
      } else {
        ctx.globalAlpha = 1;
        ctx.fillStyle = w.isRed ? '#ff3333' : '#33ff77';
        // Glow for remaining
        if (w.isRed) {
          ctx.shadowColor = '#ff0000';
          ctx.shadowBlur = 8;
        } else {
          ctx.shadowColor = '#00ff44';
          ctx.shadowBlur = 6;
        }
      }
      ctx.fillText(w.text[i], cx, y);
      ctx.shadowBlur = 0;

      // Active cursor underline
      if (i === w.typed && w === locked) {
        ctx.globalAlpha = 0.9 + 0.1 * Math.sin(Date.now() * 0.01);
        ctx.fillStyle = w.isRed ? '#ff6644' : '#44ffaa';
        ctx.fillRect(cx, y + 2, charW - 1, 2);
      }
    }
    ctx.globalAlpha = 1;
  }

  function drawHUD() {
    var elapsed = (Date.now() - startTime) / 1000;
    var mins = Math.floor(elapsed / 60);
    var secs2 = Math.floor(elapsed % 60);
    var timeStr = (mins < 10 ? '0' : '') + mins + ':' + (secs2 < 10 ? '0' : '') + secs2;
    var scoreStr = String(score).padStart(6, '0');
    var wpm = getWPM();
    var acc = getAccuracy();

    ctx.save();
    // HUD bar background
    var hudH = 38;
    ctx.fillStyle = 'rgba(0,12,0,0.92)';
    ctx.fillRect(0, 0, W, hudH);
    ctx.strokeStyle = '#1a4a1a';
    ctx.lineWidth = 1;
    ctx.strokeRect(0, hudH - 1, W, 1);

    ctx.font = '10px "Press Start 2P", monospace';
    ctx.fillStyle = '#44ff88';
    ctx.shadowColor = '#00ff44';
    ctx.shadowBlur = 4;

    var hx = 8;
    // Mode
    ctx.fillStyle = '#aaffcc';
    ctx.fillText('M' + mode, hx, 24); hx += 28;
    // Score
    ctx.fillStyle = '#44ff88';
    ctx.shadowColor = '#00ff44';
    ctx.fillText(scoreStr, hx, 24); hx += scoreStr.length * 8 + 14;
    // Combo
    if (combo > 0) {
      ctx.fillStyle = '#ffff44';
      ctx.shadowColor = '#aaaa00';
      ctx.fillText('x' + combo, hx, 24); hx += 40;
    } else { hx += 40; }
    // WPM
    ctx.fillStyle = '#aaffcc';
    ctx.shadowColor = '#00aa44';
    ctx.fillText('WPM:' + wpm, hx, 24); hx += 80;
    // Accuracy
    ctx.fillText('ACC:' + acc + '%', hx, 24); hx += 85;
    // Time
    ctx.fillStyle = '#88aacc';
    ctx.fillText(timeStr, hx, 24); hx += 58;

    // Health bar
    var barW = 120;
    var barH = 14;
    var bx = W - barW - 10;
    var by = 12;
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#0a1a0a';
    ctx.fillRect(bx, by, barW, barH);
    var pct = health / 100;
    var barColor = pct > 0.5 ? '#33ff77' : pct > 0.25 ? '#ffaa22' : '#ff3322';
    if (pct < 0.25) {
      var flash = Math.sin(Date.now() * 0.008) > 0;
      barColor = flash ? '#ff0000' : '#aa0000';
    }
    ctx.fillStyle = barColor;
    ctx.shadowColor = barColor;
    ctx.shadowBlur = 6;
    ctx.fillRect(bx, by, barW * pct, barH);
    ctx.shadowBlur = 0;
    ctx.strokeStyle = '#226622';
    ctx.lineWidth = 1;
    ctx.strokeRect(bx, by, barW, barH);
    ctx.font = '7px "Share Tech Mono", monospace';
    ctx.fillStyle = '#ffffff';
    ctx.fillText('HULL ' + health + '%', bx + 2, by + 10);

    ctx.restore();
  }

  function drawDefenseLine() {
    var ly = H - 68;
    ctx.save();
    ctx.strokeStyle = '#1a3a1a';
    ctx.lineWidth = 1;
    ctx.setLineDash([8, 4]);
    ctx.beginPath();
    ctx.moveTo(0, ly); ctx.lineTo(W, ly);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.font = '7px "Share Tech Mono", monospace';
    ctx.fillStyle = '#1a4a1a';
    ctx.fillText('--- DEFENSE PERIMETER ---', W/2 - 80, ly - 3);
    ctx.restore();
  }

  function draw() {
    var ox = 0, oy = 0;
    if (shakeAmt > 0 && shakeTimer > 0) {
      ox = (Math.random() - 0.5) * shakeAmt;
      oy = (Math.random() - 0.5) * shakeAmt;
    }

    ctx.save();
    ctx.translate(ox, oy);
    ctx.clearRect(-20, -20, W+40, H+40);

    // Background
    var bg = ctx.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, '#010301');
    bg.addColorStop(1, '#020702');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    // Grid lines (subtle)
    ctx.strokeStyle = 'rgba(0,80,0,0.07)';
    ctx.lineWidth = 1;
    for (var gx = 0; gx < W; gx += 40) {
      ctx.beginPath(); ctx.moveTo(gx,0); ctx.lineTo(gx,H); ctx.stroke();
    }
    for (var gy = 0; gy < H; gy += 40) {
      ctx.beginPath(); ctx.moveTo(0,gy); ctx.lineTo(W,gy); ctx.stroke();
    }

    drawDefenseLine();

    // Words
    for (var i = 0; i < words.length; i++) drawWord(words[i]);

    // Bullet trails
    for (var j = 0; j < bullets.length; j++) {
      var b = bullets[j];
      if (b.trail.length > 1) {
        ctx.save();
        ctx.strokeStyle = b.isRed ? '#ff6633' : '#44ffaa';
        ctx.shadowColor = b.isRed ? '#ff2200' : '#00ff88';
        ctx.shadowBlur = 6;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(b.trail[0].x, b.trail[0].y);
        for (var t = 1; t < b.trail.length; t++) ctx.lineTo(b.trail[t].x, b.trail[t].y);
        ctx.lineTo(b.x, b.y);
        ctx.globalAlpha = 0.7;
        ctx.stroke();
        ctx.restore();
      }
      // Bullet dot
      ctx.save();
      ctx.fillStyle = b.isRed ? '#ffaa44' : '#aaffcc';
      ctx.shadowColor = b.isRed ? '#ff4400' : '#44ffaa';
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.arc(b.x, b.y, 3, 0, Math.PI*2);
      ctx.fill();
      ctx.restore();
    }

    // Particles
    for (var k = 0; k < particles.length; k++) {
      var p = particles[k];
      var alpha = p.life / p.maxLife;
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = p.color;
      ctx.shadowColor = p.color;
      ctx.shadowBlur = 4;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * alpha, 0, Math.PI*2);
      ctx.fill();
      ctx.restore();
    }

    // Tank
    drawTank(0, 0);

    ctx.restore();

    // HUD on top (no shake)
    drawHUD();
  }

  function loop(timestamp) {
    if (!running) return;
    var dt = Math.min(timestamp - lastTime, 50);
    lastTime = timestamp;
    update(dt);
    draw();
    animId = requestAnimationFrame(loop);
  }

  function gameOver() {
    running = false;
    cancelAnimationFrame(animId);
    AudioEngine.playDestroy();
    // Big explosion at tank
    for (var i = 0; i < 6; i++) {
      setTimeout(function() {
        spawnExplosion(tankX + (Math.random()-0.5)*60, tankY - Math.random()*30, false);
      }, i * 120);
    }
    setTimeout(function() {
      if (onGameOver) {
        onGameOver({
          score: score,
          wpm: getWPM(),
          accuracy: getAccuracy(),
          wordsDestroyed: wordsDestroyed,
          maxCombo: maxCombo,
          mode: mode,
          duration: Math.round((Date.now() - startTime) / 1000)
        });
      }
    }, 800);
  }

  function init(canvasEl, gameMode, callback) {
    canvas = canvasEl;
    ctx = canvas.getContext('2d');
    mode = gameMode;
    onGameOver = callback;
    resize();
    words = []; bullets = []; particles = [];
    locked = null;
    score = 0; combo = 0; maxCombo = 0; health = 100;
    keystrokes = 0; hits = 0; misses = 0; wordsDestroyed = 0;
    shakeAmt = 0; shakeTimer = 0;
    turretAngle = -Math.PI / 2;
    turretTargetAngle = -Math.PI / 2;
    spawnTimer = 1500; spawnInterval = 3000;
    baseSpeed = 28; difficultyTimer = 0;
    muzzleFlash = 0; recoil = 0;
    wpmHistory = []; lastWpmCheck = 0;
    startTime = Date.now();
    ExclusionManager.clear();
    RedSuppression.clear();
  }

  function start() {
    running = true;
    lastTime = performance.now();
    animId = requestAnimationFrame(loop);
  }

  function stop() {
    running = false;
    cancelAnimationFrame(animId);
  }

  function resize() {
    if (!canvas) return;
    W = canvas.width;
    H = canvas.height;
    tankX = W / 2;
    tankR = Math.min(36, W * 0.05);
    tankY = H - 38;
  }

  function abort() {
    stop();
    if (onGameOver) {
      onGameOver({
        score: score,
        wpm: getWPM(),
        accuracy: getAccuracy(),
        wordsDestroyed: wordsDestroyed,
        maxCombo: maxCombo,
        mode: mode,
        duration: Math.round((Date.now() - startTime) / 1000),
        aborted: true
      });
    }
  }

  return { init, start, stop, resize, handleKey, abort };
})();

