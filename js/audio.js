// TYPE//TANK - Web Audio Synthesizer
const AudioEngine = (function() {
  let ctx = null;
  let muted = false;
  let masterGain = null;

  function init() {
    if (ctx) return;
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    masterGain = ctx.createGain();
    masterGain.gain.value = 0.6;
    masterGain.connect(ctx.destination);
  }

  function resume() {
    if (ctx && ctx.state === 'suspended') ctx.resume();
  }

  function setMuted(val) {
    muted = val;
    if (masterGain) masterGain.gain.setTargetAtTime(val ? 0 : 0.6, ctx.currentTime, 0.05);
  }

  function isMuted() { return muted; }

  function playTone(freq, type, duration, gainVal, startTime) {
    if (!ctx || muted) return;
    var osc = ctx.createOscillator();
    var g = ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    g.gain.setValueAtTime(0, startTime);
    g.gain.linearRampToValueAtTime(gainVal, startTime + 0.005);
    g.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
    osc.connect(g);
    g.connect(masterGain);
    osc.start(startTime);
    osc.stop(startTime + duration + 0.01);
  }

  function playNoise(duration, gainVal, startTime, filterFreq) {
    if (!ctx || muted) return;
    filterFreq = filterFreq || 2000;
    var bufSize = Math.ceil(ctx.sampleRate * duration);
    var buf = ctx.createBuffer(1, bufSize, ctx.sampleRate);
    var data = buf.getChannelData(0);
    for (var i = 0; i < bufSize; i++) data[i] = Math.random() * 2 - 1;
    var src = ctx.createBufferSource();
    src.buffer = buf;
    var filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = filterFreq;
    filter.Q.value = 0.5;
    var g = ctx.createGain();
    g.gain.setValueAtTime(gainVal, startTime);
    g.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
    src.connect(filter);
    filter.connect(g);
    g.connect(masterGain);
    src.start(startTime);
    src.stop(startTime + duration + 0.01);
  }

  function playShot() {
    init(); resume();
    var t = ctx.currentTime;
    var osc = ctx.createOscillator();
    var g = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(1800, t);
    osc.frequency.exponentialRampToValueAtTime(500, t + 0.08);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.22, t + 0.005);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.09);
    osc.connect(g); g.connect(masterGain);
    osc.start(t); osc.stop(t + 0.1);
  }

  function playEliminate() {
    init(); resume();
    var t = ctx.currentTime;
    playTone(120, 'sine', 0.4, 0.5, t);
    playTone(80, 'triangle', 0.3, 0.4, t + 0.05);
    playNoise(0.2, 0.4, t, 500);
    var osc = ctx.createOscillator();
    var g = ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(400, t);
    osc.frequency.exponentialRampToValueAtTime(40, t + 0.15);
    g.gain.setValueAtTime(0.3, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
    osc.connect(g); g.connect(masterGain);
    osc.start(t); osc.stop(t + 0.2);
  }

  function playRedSpawn() {
    init(); resume();
    var t = ctx.currentTime;
    playTone(880, 'sine', 0.15, 0.3, t);
    playTone(1320, 'sine', 0.15, 0.3, t + 0.12);
    playTone(1760, 'sine', 0.1, 0.2, t + 0.24);
  }

  function playDamage() {
    init(); resume();
    var t = ctx.currentTime;
    playNoise(0.35, 0.6, t, 120);
    playTone(60, 'square', 0.3, 0.4, t);
    playTone(45, 'sawtooth', 0.2, 0.3, t + 0.05);
    for (var i = 0; i < 3; i++) playTone(440, 'square', 0.05, 0.2, t + 0.06 * i);
  }

  function playVictory() {
    init(); resume();
    var t = ctx.currentTime;
    var notes = [523.25, 659.25, 783.99, 1046.50, 783.99, 1046.50, 1318.51];
    var durs  = [0.12,   0.12,   0.12,   0.25,    0.12,   0.12,    0.4];
    var offset = 0;
    for (var i = 0; i < notes.length; i++) {
      playTone(notes[i], 'square', durs[i], 0.28, t + offset);
      playTone(notes[i] * 1.5, 'sine', durs[i], 0.14, t + offset);
      offset += durs[i] + 0.02;
    }
    playNoise(0.1, 0.2, t + offset - 0.15, 3000);
  }

  function playClick() {
    init(); resume();
    var t = ctx.currentTime;
    playTone(900, 'square', 0.04, 0.08, t);
    playTone(450, 'square', 0.02, 0.04, t + 0.02);
  }

  function playDestroy() {
    init(); resume();
    var t = ctx.currentTime;
    playNoise(0.8, 0.65, t, 200);
    playTone(80, 'sawtooth', 0.6, 0.5, t);
    playTone(50, 'sine', 0.8, 0.4, t + 0.1);
    for (var i = 0; i < 5; i++) playTone(300 - i * 40, 'square', 0.08, 0.22, t + 0.1 * i);
  }

  function playCombo() {
    init(); resume();
    var t = ctx.currentTime;
    playTone(880, 'sine', 0.1, 0.18, t);
    playTone(1100, 'sine', 0.1, 0.18, t + 0.08);
    playTone(1320, 'sine', 0.15, 0.18, t + 0.16);
  }

  return { init, resume, setMuted, isMuted, playShot, playEliminate, playRedSpawn, playDamage, playVictory, playClick, playDestroy, playCombo };
})();
