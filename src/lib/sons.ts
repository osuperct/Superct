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

/* --------- músicas de fundo estilo videogame ---------
   Uma trilha por fase + uma trilha tensa por chefão. */
type Trilha = {
  melodia: number[];
  baixo: number[];
  intervalo: number;
  tipoMel: OscillatorType;
  tipoBaixo: OscillatorType;
  volMel: number;
  volBaixo: number;
};

const FASES: Trilha[] = [
  {
    melodia: [392, 392, 523, 392, 330, 392, 494, 523, 587, 523, 494, 392, 330, 392, 349, 392],
    baixo: [98, 98, 131, 98, 82, 98, 123, 131],
    intervalo: 200,
    tipoMel: "square",
    tipoBaixo: "triangle",
    volMel: 0.12,
    volBaixo: 0.16,
  },
  {
    melodia: [440, 523, 587, 659, 587, 523, 440, 392, 440, 523, 659, 698, 659, 587, 523, 440],
    baixo: [110, 110, 147, 147, 98, 98, 131, 131],
    intervalo: 190,
    tipoMel: "square",
    tipoBaixo: "triangle",
    volMel: 0.12,
    volBaixo: 0.16,
  },
  {
    melodia: [466, 554, 622, 554, 466, 415, 466, 622, 698, 622, 554, 466, 415, 466, 554, 622],
    baixo: [117, 117, 156, 117, 104, 104, 139, 156],
    intervalo: 185,
    tipoMel: "triangle",
    tipoBaixo: "sawtooth",
    volMel: 0.13,
    volBaixo: 0.14,
  },
  {
    melodia: [349, 440, 523, 440, 587, 523, 440, 349, 392, 494, 587, 494, 659, 587, 494, 392],
    baixo: [87, 87, 110, 110, 98, 98, 123, 123],
    intervalo: 180,
    tipoMel: "square",
    tipoBaixo: "triangle",
    volMel: 0.12,
    volBaixo: 0.17,
  },
  {
    melodia: [523, 494, 440, 494, 523, 587, 659, 587, 523, 494, 440, 392, 440, 494, 523, 587],
    baixo: [131, 131, 110, 110, 147, 147, 98, 98],
    intervalo: 175,
    tipoMel: "square",
    tipoBaixo: "sawtooth",
    volMel: 0.12,
    volBaixo: 0.14,
  },
  {
    melodia: [587, 698, 784, 698, 587, 523, 587, 784, 880, 784, 698, 587, 523, 587, 698, 784],
    baixo: [147, 147, 175, 147, 131, 131, 165, 175],
    intervalo: 168,
    tipoMel: "square",
    tipoBaixo: "triangle",
    volMel: 0.12,
    volBaixo: 0.16,
  },
];

/* trilhas de chefão: mais graves, rápidas e dissonantes */
const CHEFOES: Trilha[] = [
  {
    melodia: [147, 156, 147, 139, 147, 185, 147, 139, 131, 139, 147, 185, 196, 185, 147, 139],
    baixo: [73, 78, 73, 69, 65, 69, 73, 78],
    intervalo: 150,
    tipoMel: "sawtooth",
    tipoBaixo: "square",
    volMel: 0.11,
    volBaixo: 0.18,
  },
  {
    melodia: [175, 185, 175, 165, 233, 220, 175, 165, 156, 165, 175, 233, 247, 233, 175, 165],
    baixo: [87, 92, 87, 82, 78, 82, 87, 92],
    intervalo: 145,
    tipoMel: "sawtooth",
    tipoBaixo: "square",
    volMel: 0.11,
    volBaixo: 0.18,
  },
  {
    melodia: [196, 208, 196, 185, 262, 247, 196, 185, 175, 185, 196, 262, 277, 262, 196, 185],
    baixo: [98, 104, 98, 92, 87, 92, 98, 104],
    intervalo: 140,
    tipoMel: "sawtooth",
    tipoBaixo: "triangle",
    volMel: 0.11,
    volBaixo: 0.19,
  },
  {
    melodia: [220, 233, 220, 208, 294, 277, 220, 208, 196, 208, 220, 294, 311, 294, 220, 208],
    baixo: [110, 117, 110, 104, 98, 104, 110, 117],
    intervalo: 135,
    tipoMel: "sawtooth",
    tipoBaixo: "square",
    volMel: 0.11,
    volBaixo: 0.19,
  },
  {
    melodia: [247, 262, 247, 233, 330, 311, 247, 233, 220, 233, 247, 330, 349, 330, 247, 233],
    baixo: [123, 131, 123, 117, 110, 117, 123, 131],
    intervalo: 130,
    tipoMel: "sawtooth",
    tipoBaixo: "square",
    volMel: 0.11,
    volBaixo: 0.2,
  },
  {
    melodia: [277, 294, 277, 262, 370, 349, 277, 262, 247, 262, 277, 370, 392, 370, 277, 262],
    baixo: [139, 147, 139, 131, 123, 131, 139, 147],
    intervalo: 125,
    tipoMel: "sawtooth",
    tipoBaixo: "square",
    volMel: 0.11,
    volBaixo: 0.2,
  },
];

let trilhaAtual = "";

/** Inicia (ou troca) a música de fundo da fase / do chefão. */
export function iniciarMusica(fase = 1, chefao = false) {
  const lista = chefao ? CHEFOES : FASES;
  const t = lista[(Math.max(1, fase) - 1) % lista.length]!;
  const chave = `${chefao ? "boss" : "fase"}-${(Math.max(1, fase) - 1) % lista.length}`;
  if (ligado && trilhaAtual === chave) return;
  pararMusica();
  const c = audio();
  if (!c) return;
  ligado = true;
  trilhaAtual = chave;
  passoMusica = 0;
  musicaTimer = window.setInterval(() => {
    const nota = t.melodia[passoMusica % t.melodia.length]!;
    tom(nota, t.intervalo / 1200, t.tipoMel, t.volMel);
    if (passoMusica % 2 === 0) {
      tom(
        t.baixo[(passoMusica / 2) % t.baixo.length]!,
        t.intervalo / 900,
        t.tipoBaixo,
        t.volBaixo,
      );
    }
    passoMusica += 1;
  }, t.intervalo);
}

export function pararMusica() {
  ligado = false;
  trilhaAtual = "";
  if (musicaTimer !== null) {
    window.clearInterval(musicaTimer);
    musicaTimer = null;
  }
}

export function musicaAtiva() {
  return ligado;
}


/* --------- fanfarra de vitória final (medalha suprema) --------- */
let vitoriaTimer: number | null = null;

const FANFARRA: Trilha = {
  melodia: [523, 659, 784, 1047, 988, 784, 880, 1047, 1175, 1047, 880, 784, 659, 784, 1047, 1319],
  baixo: [131, 165, 196, 262, 247, 196, 220, 262],
  intervalo: 210,
  tipoMel: "square",
  tipoBaixo: "triangle",
  volMel: 0.14,
  volBaixo: 0.18,
};

/** Música de vitória em loop para a tela da medalha suprema. */
export function musicaVitoria() {
  pararMusica();
  pararMusicaVitoria();
  const c = audio();
  if (!c) return;
  let passo = 0;
  somVitoria();
  vitoriaTimer = window.setInterval(() => {
    tom(FANFARRA.melodia[passo % FANFARRA.melodia.length]!, 0.16, FANFARRA.tipoMel, FANFARRA.volMel);
    if (passo % 2 === 0) {
      tom(
        FANFARRA.baixo[(passo / 2) % FANFARRA.baixo.length]!,
        0.24,
        FANFARRA.tipoBaixo,
        FANFARRA.volBaixo,
      );
    }
    passo += 1;
  }, FANFARRA.intervalo);
}

export function pararMusicaVitoria() {
  if (vitoriaTimer !== null) {
    window.clearInterval(vitoriaTimer);
    vitoriaTimer = null;
  }
}

/* --------- atrito (raspão ao encostar num vilão) --------- */
export function somAtrito() {
  const c = audio();
  if (!c || !master) return;
  const t0 = c.currentTime;
  const dur = 0.32;
  const buf = c.createBuffer(1, Math.floor(c.sampleRate * dur), c.sampleRate);
  const dados = buf.getChannelData(0);
  for (let i = 0; i < dados.length; i += 1) {
    const p = i / dados.length;
    dados[i] = (Math.random() * 2 - 1) * (1 - p) * (0.6 + 0.4 * Math.sin(p * 60));
  }
  const src = c.createBufferSource();
  src.buffer = buf;
  const filtro = c.createBiquadFilter();
  filtro.type = "bandpass";
  filtro.frequency.setValueAtTime(2200, t0);
  filtro.frequency.exponentialRampToValueAtTime(500, t0 + dur);
  filtro.Q.value = 1.2;
  const g = c.createGain();
  g.gain.setValueAtTime(0.5, t0);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  src.connect(filtro);
  filtro.connect(g);
  g.connect(master);
  src.start(t0);
  src.stop(t0 + dur);
}
