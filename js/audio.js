/**
 * Web Audio sketches — original 36TY boom-bap / R&B loops.
 * No external samples. Triggered by user gesture.
 */
(function (root) {
  "use strict";

  var ctx = null;
  var master = null;
  var current = null;
  var playing = null;
  var paused = false;
  var vol = 0.22;
  var analyser = null;
  var freqBuf = null;

  function audio() {
    if (ctx) return ctx;
    var AC = root.AudioContext || root.webkitAudioContext;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = vol;
    var comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -18;
    comp.ratio.value = 4;
    master.connect(comp);
    analyser = ctx.createAnalyser();
    analyser.fftSize = 128;
    freqBuf = new Uint8Array(analyser.frequencyBinCount);
    comp.connect(analyser);
    analyser.connect(ctx.destination);
    return ctx;
  }

  function envGain(t, a, d, s, r, peak) {
    var g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + a);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak * s), t + a + d);
    g.gain.exponentialRampToValueAtTime(0.0001, t + a + d + r);
    return g;
  }

  function kick(t, pitch) {
    var o = ctx.createOscillator();
    var g = ctx.createGain();
    o.type = "sine";
    o.frequency.setValueAtTime(pitch || 140, t);
    o.frequency.exponentialRampToValueAtTime(42, t + 0.12);
    g.gain.setValueAtTime(1, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.32);
    o.connect(g);
    g.connect(master);
    o.start(t);
    o.stop(t + 0.34);
  }

  function snare(t) {
    var n = ctx.createBufferSource();
    var len = ctx.sampleRate * 0.18;
    var buf = ctx.createBuffer(1, len, ctx.sampleRate);
    var d = buf.getChannelData(0);
    for (var i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.2);
    n.buffer = buf;
    var bp = ctx.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.value = 1800;
    var g = ctx.createGain();
    g.gain.setValueAtTime(0.7, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.16);
    var o = ctx.createOscillator();
    o.type = "triangle";
    o.frequency.value = 180;
    var og = ctx.createGain();
    og.gain.setValueAtTime(0.35, t);
    og.gain.exponentialRampToValueAtTime(0.0001, t + 0.08);
    n.connect(bp);
    bp.connect(g);
    g.connect(master);
    o.connect(og);
    og.connect(master);
    n.start(t);
    o.start(t);
    o.stop(t + 0.1);
  }

  function hat(t, open) {
    var n = ctx.createBufferSource();
    var len = ctx.sampleRate * (open ? 0.18 : 0.05);
    var buf = ctx.createBuffer(1, len, ctx.sampleRate);
    var d = buf.getChannelData(0);
    for (var i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    n.buffer = buf;
    var hp = ctx.createBiquadFilter();
    hp.type = "highpass";
    hp.frequency.value = 7000;
    var g = ctx.createGain();
    g.gain.setValueAtTime(open ? 0.18 : 0.12, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + (open ? 0.14 : 0.04));
    n.connect(hp);
    hp.connect(g);
    g.connect(master);
    n.start(t);
  }

  function chord(t, freqs, dur, type) {
    freqs.forEach(function (f, i) {
      var o = ctx.createOscillator();
      o.type = type || "triangle";
      o.frequency.value = f;
      var g = envGain(t, 0.02, 0.12, 0.45, dur - 0.16, 0.09 / (i + 1));
      var f1 = ctx.createBiquadFilter();
      f1.type = "lowpass";
      f1.frequency.setValueAtTime(2200, t);
      f1.frequency.linearRampToValueAtTime(900, t + dur);
      o.connect(f1);
      f1.connect(g);
      g.connect(master);
      o.start(t);
      o.stop(t + dur + 0.02);
    });
  }

  function bass(t, f, dur) {
    var o = ctx.createOscillator();
    o.type = "sine";
    o.frequency.setValueAtTime(f, t);
    var g = envGain(t, 0.01, 0.08, 0.4, dur - 0.1, 0.28);
    o.connect(g);
    g.connect(master);
    o.start(t);
    o.stop(t + dur);
  }

  function crackle(t, dur) {
    var n = ctx.createBufferSource();
    var len = Math.floor(ctx.sampleRate * dur);
    var buf = ctx.createBuffer(1, len, ctx.sampleRate);
    var d = buf.getChannelData(0);
    for (var i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * 0.04 * (Math.random() > 0.995 ? 4 : 1);
    n.buffer = buf;
    var g = ctx.createGain();
    g.gain.value = 0.35;
    n.connect(g);
    g.connect(master);
    n.start(t);
    n.stop(t + dur);
  }

  var sketches = {
    silk: { bpm: 86, bars: 2, title: "SILK ON THE 808" },
    booth: { bpm: 93, bars: 2, title: "BOOTH TAPE VOL. 3" },
    hours: { bpm: 72, bars: 2, title: "AFTER HOURS CHORDS" },
    crate: { bpm: 97, bars: 2, title: "CRATE DIG '97" }
  };

  function schedule(name, start) {
    var spec = sketches[name];
    var spb = 60 / spec.bpm;
    var total = spec.bars * 4 * spb;
    crackle(start, total);
    for (var step = 0; step < spec.bars * 16; step++) {
      var t = start + step * (spb / 4);
      var s = step % 16;
      if (name === "hours") {
        if (s === 0 || s === 8) kick(t, 110);
        if (s === 4 || s === 12) snare(t);
        if (s % 4 === 2) hat(t, false);
        if (s === 0) chord(t, [155.56, 196, 233.08, 311.13], spb * 2, "sine");
        if (s === 8) chord(t, [146.83, 174.61, 220, 277.18], spb * 2, "sine");
        if (s === 0) bass(t, 38.89, spb * 2);
        if (s === 8) bass(t, 36.71, spb * 2);
      } else if (name === "silk") {
        if (s === 0 || s === 7 || s === 10) kick(t, 150);
        if (s === 4 || s === 12) snare(t);
        if (s % 2 === 0) hat(t, s === 14);
        if (s === 0) chord(t, [174.61, 207.65, 261.63, 349.23], spb * 2, "triangle");
        if (s === 8) chord(t, [155.56, 196, 233.08, 311.13], spb * 2, "triangle");
        if (s === 0 || s === 10) bass(t, 43.65, spb * 1.2);
      } else if (name === "booth") {
        if (s === 0 || s === 3 || s === 8 || s === 11) kick(t, 130);
        if (s === 4 || s === 12) snare(t);
        hat(t, s === 15);
        if (s === 0) chord(t, [123.47, 146.83, 185, 246.94], spb * 2, "sawtooth");
        if (s === 8) chord(t, [130.81, 155.56, 196, 246.94], spb * 2, "sawtooth");
        if (s === 0) bass(t, 61.74, spb);
        if (s === 8) bass(t, 55, spb);
      } else {
        if (s === 0 || s === 6 || s === 9) kick(t, 145);
        if (s === 4 || s === 12) snare(t);
        if (s % 2 === 1) hat(t, false);
        if (s === 0) chord(t, [196, 233.08, 293.66], spb * 1.5, "square");
        if (s === 8) chord(t, [174.61, 207.65, 261.63], spb * 1.5, "square");
        if (s === 0) bass(t, 49, spb);
        if (s === 8) bass(t, 43.65, spb);
      }
    }
    return total;
  }

  function setState(name) {
    root.__audioState = name;
    if (document.body) document.body.setAttribute("data-audio", name);
  }

  function stop() {
    if (current) {
      current.stopped = true;
      current = null;
    }
    playing = null;
    paused = false;
    root.__mixOn = false;
    root.__mixBpm = 0;
    root.__mixPulseAt = 0;
    setState("idle");
    if (document.body) {
      document.body.classList.remove("is-mix-live");
      if ((root.__worldRecede || 0) > 0.9) document.body.classList.add("is-3d-idle");
    }
    if (ctx && ctx.state !== "closed") {
      master.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.08);
      master.gain.setValueAtTime(vol, ctx.currentTime + 0.12);
    }
  }

  function pause() {
    if (!playing || !current) return false;
    paused = true;
    current.stopped = true;
    root.__mixOn = false;
    setState("paused");
    if (document.body) document.body.classList.remove("is-mix-live");
    if (ctx && ctx.state !== "closed") {
      master.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.12);
    }
    return true;
  }

  function resume() {
    if (!playing || !paused) return false;
    paused = false;
    audio();
    if (ctx.state === "suspended") ctx.resume();
    master.gain.cancelScheduledValues(ctx.currentTime);
    master.gain.setValueAtTime(Math.max(0.0001, vol), ctx.currentTime);
    root.__mixOn = true;
    root.__journeyOn = true;
    setState("playing");
    if (document.body) {
      document.body.classList.remove("is-3d-idle");
      document.body.classList.add("is-mix-live");
    }
    var loop = { stopped: false };
    current = loop;
    function run() {
      if (loop.stopped || paused || playing == null) return;
      var t = ctx.currentTime + 0.05;
      var dur = schedule(playing, t);
      loop.timer = setTimeout(run, dur * 1000 - 40);
    }
    run();
    return true;
  }

  function setVolume(v) {
    vol = Math.max(0, Math.min(1, Number(v) || 0));
    if (master && ctx) master.gain.setTargetAtTime(vol, ctx.currentTime, 0.05);
  }

  function play(name) {
    audio();
    if (ctx.state === "suspended") ctx.resume();
    if (playing === name && !paused) {
      stop();
      return false;
    }
    stop();
    playing = name;
    paused = false;
    root.__mixOn = true;
    root.__journeyOn = true;
    root.__mixBpm = (sketches[name] && sketches[name].bpm) || 90;
    root.__mixPulseAt = performance.now();
    setState("playing");
    if (document.body) {
      document.body.classList.remove("is-3d-idle");
      document.body.classList.add("is-mix-live");
    }
    master.gain.setValueAtTime(vol, ctx.currentTime);
    var loop = { stopped: false };
    current = loop;
    function run() {
      if (loop.stopped || playing !== name) return;
      var t = ctx.currentTime + 0.05;
      var dur = schedule(name, t);
      loop.timer = setTimeout(run, dur * 1000 - 40);
    }
    run();
    return true;
  }

  function bands() {
    if (!analyser || !freqBuf) return { low: 0, mid: 0, high: 0 };
    analyser.getByteFrequencyData(freqBuf);
    var n = freqBuf.length;
    var low = 0, mid = 0, high = 0;
    var a = Math.max(1, Math.floor(n * 0.18));
    var b = Math.max(a + 1, Math.floor(n * 0.55));
    var i;
    for (i = 0; i < a; i++) low += freqBuf[i];
    for (i = a; i < b; i++) mid += freqBuf[i];
    for (i = b; i < n; i++) high += freqBuf[i];
    return { low: low / (a * 255), mid: mid / ((b - a) * 255), high: high / ((n - b) * 255) };
  }

  root.Audio36 = {
    play: play,
    stop: stop,
    pause: pause,
    resume: resume,
    setVolume: setVolume,
    sketches: sketches,
    bands: bands,
    current: function () { return playing; }
  };
})(window);
