// All sound is synthesized. Silent until initAudio() runs on the first click.
// Each sound allocates audio nodes, per event and not per frame.

let ac, out, noiseBuf, muted = false;

export function initAudio() {
  if (ac) return void ac.resume();
  ac = new AudioContext();
  out = ac.createGain();
  out.gain.value = muted ? 0 : 0.5;
  out.connect(ac.destination);
  noiseBuf = ac.createBuffer(1, ac.sampleRate / 2, ac.sampleRate);
  const d = noiseBuf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
}

// Returns the new state.
export function toggleMute() {
  muted = !muted;
  if (out) out.gain.value = muted ? 0 : 0.5;
  return muted;
}

// Volume envelope that fades out over dur seconds.
function env(vol, dur) {
  const g = ac.createGain();
  g.gain.setValueAtTime(vol, ac.currentTime);
  g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + dur);
  g.connect(out);
  return g;
}

function tone(from, to, dur, type, vol) {
  if (!ac) return;
  const o = ac.createOscillator();
  o.type = type;
  o.frequency.setValueAtTime(from, ac.currentTime);
  o.frequency.exponentialRampToValueAtTime(to, ac.currentTime + dur);
  o.connect(env(vol, dur));
  o.start();
  o.stop(ac.currentTime + dur);
}

function noise(dur, vol, cutoff) {
  if (!ac) return;
  const s = ac.createBufferSource(), f = ac.createBiquadFilter();
  s.buffer = noiseBuf;
  f.frequency.value = cutoff;
  s.connect(f);
  f.connect(env(vol, dur));
  s.start(0, Math.random() * 0.4, dur);
}

export function sfxShot() { noise(0.07, 0.3, 2600); tone(420, 110, 0.07, 'square', 0.06); }
export function sfxHit() { noise(0.04, 0.14, 900); }
export function sfxKill() { noise(0.14, 0.26, 500); tone(150, 45, 0.14, 'sawtooth', 0.1); }
export function sfxHurt() { tone(240, 70, 0.22, 'square', 0.2); noise(0.1, 0.2, 1500); }
export function sfxPickup() { tone(420, 1100, 0.16, 'square', 0.14); }
export function sfxBoss() { tone(70, 35, 1.1, 'sawtooth', 0.3); noise(0.6, 0.2, 300); }
export function sfxOrb() { tone(700, 180, 0.25, 'triangle', 0.16); }
export function sfxOver() { tone(200, 30, 0.9, 'sawtooth', 0.25); }
