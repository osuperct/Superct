/* Sons do jogo gerados via WebAudio (sem arquivos externos) */

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let ligado = false;
let musicaTimer: number | null = null;
let passoMusica = 0;

function audio(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const Ctor =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    ctx = new Ctor();
    master = ctx.createGain();
    master.gain.value = 0.25;
    master.connect(ctx.destination);
  }
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

function tom(
  freq: number,
  dur: number,
  tipo: OscillatorType = "square",
  vol = 0.5,
  atraso = 0,
) {
  const c = audio();
  if (!c || !master) return;
  const t0 = c.currentTime + atraso;
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = tipo;
  osc.frequency.setValueAtTime(freq, t0);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(vol, t0 + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(g);
  g.connect(master);
  osc.start(t0);
  osc.stop(t0 + dur + 0.02);
}

/** Libera o áudio no primeiro toque do usuário. */
export function acordarAudio() {
  audio();
}

export function somPulo() {
  const c = audio();
  if (!c || !master) return;
  const t0 = c.currentTime;
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = "square";
  osc.frequency.setValueAtTime(320, t0);
  osc.frequency.exponentialRampToValueAtTime(880, t0 + 0.13);
  g.gain.setValueAtTime(0.4, t0);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.2);
  osc.connect(g);
  g.connect(master);
  osc.start(t0);
  osc.stop(t0 + 0.22);
}

/** Som de moeda: usado em coração, cone e haltere. */
export function somMoeda() {
  tom(988, 0.07, "square", 0.35);
  tom(1319, 0.18, "square", 0.35, 0.07);
}

export function somPoder() {
  tom(700, 0.08, "sawtooth", 0.28);
  tom(440, 0.1, "sawtooth", 0.2, 0.05);
}

export function somDano() {
  tom(200, 0.18, "triangle", 0.35);
  tom(120, 0.22, "triangle", 0.3, 0.12);
}

export function somGameOver() {
  pararMusica();
  const notas = [523, 440, 349, 262, 196];
  notas.forEach((f, i) => tom(f, 0.32, "square", 0.4, i * 0.22));
  tom(131, 0.8, "triangle", 0.3, notas.length * 0.22);
}

export function somVitoria() {
  [523, 659, 784, 1047].forEach((f, i) => tom(f, 0.2, "square", 0.4, i * 0.12));
}

/* --------- música de fundo estilo videogame --------- */
const MELODIA = [
  392, 392, 523, 392, 330, 392, 494, 523, 587, 523, 494, 392, 330, 392, 349, 392,
];
const BAIXO = [98, 98, 131, 98, 82, 98, 123, 131];

export function iniciarMusica() {
  if (ligado) return;
  const c = audio();
  if (!c) return;
  ligado = true;
  const intervalo = 200;
  musicaTimer = window.setInterval(() => {
    const nota = MELODIA[passoMusica % MELODIA.length]!;
    tom(nota, 0.16, "square", 0.12);
    if (passoMusica % 2 === 0) {
      tom(BAIXO[(passoMusica / 2) % BAIXO.length]!, 0.22, "triangle", 0.16);
    }
    passoMusica += 1;
  }, intervalo);
}

export function pararMusica() {
  ligado = false;
  if (musicaTimer !== null) {
    window.clearInterval(musicaTimer);
    musicaTimer = null;
  }
}

export function musicaAtiva() {
  return ligado;
}
