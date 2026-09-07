import { useCallback, useEffect, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { ChevronUp, Heart, Medal, RotateCcw, Volume2, VolumeX, Zap } from "lucide-react";
import { HEROIS, heroiPorId, type HeroiId } from "@/data/herois";
import logoVazada from "@/assets/super-ct-outline-white.png";
import { VILOES } from "@/data/viloes";
import RankingJogo from "@/components/RankingJogo";
import {
  acordarAudio,
  iniciarMusica,
  pararMusica,
  somDano,
  somGameOver,
  somMoeda,
  somPoder,
  somPulo,
  somVitoria,
  musicaVitoria,
  pararMusicaVitoria,
} from "@/lib/sons";



const TITLE = "Super Jogo — Fases e chefões do Super CT | Professor Tio Victor";
const DESCRIPTION =
  "Atravesse a academia do Super CT, pegue a medalha de bronze no fim do percurso e enfrente o chefão de cada fase com bolas de tênis e o super poder dos halteres.";

export const Route = createFileRoute("/jogo")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: TITLE },
      { name: "twitter:description", content: DESCRIPTION },
    ],
  }),
  component: JogoPage,
});

/* ---------- mundo ---------- */
const MUNDO = 4200;
const ARENA = 720;
const ALTURA_CENA = 260;
const PISO = 40; /* offset visual do piso (bottom: 40 + y) */
const TETO = ALTURA_CENA - PISO - 40; /* topo do herói (y + altura) nunca passa da faixa de neon */
const GRAVIDADE = -1.25;
const IMPULSO = 17.5;
const IMPULSO_BAIXO = 12;
const TOQUE_DUPLO_CIMA_MS = 400;
const VELOCIDADE = 2.8;
const HEROI_W = 34;
const HEROI_H = 44;
const HEROI_H_ABAIXADO = 24;
const TOTAL_FASES = VILOES.length;

type Solido = { x: number; w: number; h: number; tipo: "caixa" | "step" };
type Barra = { x: number; w: number; y: number };
type Argola = { x: number; y: number };
type Corda = { x: number; base: number; topo: number };
type Jump = { x: number; w: number; h: number };
type Parede = { x: number; w: number; h: number };
type Pino = { x: number; y: number; cor: string };
type Lava = { x: number; w: number };
type Tela = { x: number; w: number };
type Faixa = { x0: number; x1: number };
type Layout = {
  solidos: Solido[];
  barras: Barra[];
  argolas: Argola[];
  cordas: Corda[];
  jumps: Jump[];
  paredes: Parede[];
  lava: Lava[];
  telas: Tela[];
  cones: number[];
  coracoes: { x: number; y: number }[];
  chuvaBatata: Faixa[];
  donuts: boolean;
};

const VELOCIDADE_ESCALADA = 2.2;
const CORES_PINO = ["#f97316", "#22d3ee", "#a855f7", "#84cc16", "#f43f5e", "#facc15"];
const gerarPinos = (paredes: Parede[], quantidade: number): Pino[][] =>
  paredes.map((p, pi) =>
    Array.from({ length: quantidade }).map((_, i) => ({
      x: 14 + ((i * 37 + pi * 19) % (p.w - 28)),
      y: 16 + ((i * 29 + pi * 11) % (p.h - 30)),
      cor: CORES_PINO[(i + pi) % CORES_PINO.length]!,
    })),
  );

/* medalha de bronze suspensa no fim do percurso */
const MEDALHA = { x: MUNDO - 190, y: 118 };

const CONES_BASE: number[] = [
  180, 340, 560, 820, 900, 1100, 1340, 1500, 1700, 1900, 2050, 2300, 2560, 2750,
  2900, 3100, 3260, 3480, 3720, 3900, 4050,
];
/* cones só ficam onde dá para pisar (fora da lava e longe das telas) */
const conesSeguros = (lava: Lava[], telas: Tela[]) =>
  CONES_BASE.filter(
    (cx) =>
      !lava.some((l) => cx + 16 > l.x && cx < l.x + l.w) &&
      !telas.some((t) => cx + 16 > t.x - 20 && cx < t.x + t.w + 20),
  );

/* ---------- FASE 1: academia clássica ---------- */
const L1_SOLIDOS: Solido[] = [
  { x: 430, w: 72, h: 56, tipo: "caixa" },
  { x: 640, w: 58, h: 22, tipo: "step" },
  { x: 706, w: 58, h: 40, tipo: "step" },
  { x: 960, w: 84, h: 82, tipo: "caixa" },
  { x: 1180, w: 58, h: 24, tipo: "step" },
  { x: 1560, w: 72, h: 58, tipo: "caixa" },
  { x: 1760, w: 58, h: 30, tipo: "step" },
  { x: 2160, w: 92, h: 96, tipo: "caixa" },
  { x: 2420, w: 58, h: 24, tipo: "step" },
  { x: 2488, w: 58, h: 46, tipo: "step" },
  { x: 2960, w: 76, h: 66, tipo: "caixa" },
  { x: 3320, w: 58, h: 26, tipo: "step" },
  { x: 3600, w: 88, h: 86, tipo: "caixa" },
];
const L1_PAREDES: Parede[] = [
  { x: 790, w: 150, h: 200 },
  { x: 3700, w: 160, h: 210 },
];
const FASE1: Layout = {
  solidos: L1_SOLIDOS,
  barras: [
    { x: 250, w: 230, y: 150 },
    { x: 1980, w: 210, y: 152 },
    { x: 3420, w: 200, y: 148 },
  ],
  argolas: [
    { x: 1280, y: 132 },
    { x: 1372, y: 140 },
    { x: 1464, y: 132 },
    { x: 2680, y: 138 },
    { x: 2776, y: 146 },
    { x: 2872, y: 138 },
  ],
  cordas: [
    { x: 3125, base: 26, topo: 205 },
    { x: 3235, base: 34, topo: 205 },
  ],
  jumps: [{ x: 3870, w: 86, h: 18 }],
  paredes: L1_PAREDES,
  lava: [],
  telas: [],
  cones: conesSeguros([], []),
  coracoes: [
    { x: 1372, y: 150 },
    { x: 3560, y: 158 },
  ],
  chuvaBatata: [],
  donuts: false,
};

/* ---------- FASE 2: chão de lava com steps ---------- */
const L2_LAVA: Lava[] = [
  { x: 600, w: 340 },
  { x: 1500, w: 420 },
  { x: 2600, w: 480 },
  { x: 3400, w: 300 },
];
const FASE2: Layout = {
  solidos: [
    { x: 300, w: 72, h: 54, tipo: "caixa" },
    { x: 636, w: 62, h: 36, tipo: "step" },
    { x: 756, w: 62, h: 58, tipo: "step" },
    { x: 872, w: 62, h: 36, tipo: "step" },
    { x: 1120, w: 84, h: 78, tipo: "caixa" },
    { x: 1538, w: 62, h: 40, tipo: "step" },
    { x: 1656, w: 62, h: 64, tipo: "step" },
    { x: 1776, w: 62, h: 44, tipo: "step" },
    { x: 1878, w: 62, h: 30, tipo: "step" },
    { x: 2200, w: 90, h: 90, tipo: "caixa" },
    { x: 2636, w: 62, h: 38, tipo: "step" },
    { x: 2756, w: 62, h: 62, tipo: "step" },
    { x: 2876, w: 62, h: 40, tipo: "step" },
    { x: 2996, w: 62, h: 66, tipo: "step" },
    { x: 3436, w: 62, h: 42, tipo: "step" },
    { x: 3552, w: 62, h: 64, tipo: "step" },
    { x: 3648, w: 62, h: 38, tipo: "step" },
    { x: 3900, w: 82, h: 82, tipo: "caixa" },
  ],
  barras: [
    { x: 1000, w: 200, y: 150 },
    { x: 2300, w: 200, y: 152 },
  ],
  argolas: [
    { x: 1980, y: 136 },
    { x: 2070, y: 144 },
    { x: 3140, y: 138 },
    { x: 3230, y: 146 },
  ],
  cordas: [{ x: 2450, base: 30, topo: 205 }],
  jumps: [{ x: 1240, w: 86, h: 18 }],
  paredes: [{ x: 4020, w: 140, h: 200 }],
  lava: L2_LAVA,
  telas: [],
  cones: conesSeguros(L2_LAVA, []),
  coracoes: [
    { x: 1700, y: 150 },
    { x: 3010, y: 156 },
  ],
  chuvaBatata: [],
  donuts: false,
};

/* ---------- FASE 3: percurso aéreo (argolas, cordas navais e caixas) ---------- */
const L3_ARGOLAS: Argola[] = [
  { x: 320, y: 140 },
  { x: 410, y: 132 },
  { x: 500, y: 144 },
  { x: 700, y: 138 },
  { x: 790, y: 130 },
  { x: 880, y: 142 },
  { x: 1080, y: 136 },
  { x: 1170, y: 146 },
  { x: 1550, y: 140 },
  { x: 1640, y: 132 },
  { x: 1730, y: 144 },
  { x: 1920, y: 138 },
  { x: 2010, y: 130 },
  { x: 2100, y: 142 },
  { x: 2300, y: 136 },
  { x: 2390, y: 146 },
  { x: 2770, y: 140 },
  { x: 2860, y: 132 },
  { x: 2950, y: 144 },
  { x: 3140, y: 138 },
  { x: 3230, y: 130 },
  { x: 3320, y: 142 },
  { x: 3520, y: 136 },
  { x: 3610, y: 146 },
  { x: 3800, y: 138 },
  { x: 3890, y: 132 },
];
const L3_LAVA: Lava[] = [
  { x: 300, w: 240 },
  { x: 680, w: 250 },
  { x: 1060, w: 150 },
  { x: 1330, w: 180 },
  { x: 1530, w: 240 },
  { x: 1900, w: 250 },
  { x: 2280, w: 150 },
  { x: 2550, w: 180 },
  { x: 2750, w: 250 },
  { x: 3120, w: 240 },
  { x: 3500, w: 160 },
  { x: 3780, w: 180 },
];
const FASE3: Layout = {
  solidos: [
    { x: 570, w: 70, h: 80, tipo: "caixa" },
    { x: 1240, w: 70, h: 86, tipo: "caixa" },
    { x: 1810, w: 76, h: 84, tipo: "caixa" },
    { x: 2450, w: 70, h: 82, tipo: "caixa" },
    { x: 3020, w: 72, h: 88, tipo: "caixa" },
    { x: 3690, w: 78, h: 90, tipo: "caixa" },
    { x: 4000, w: 80, h: 76, tipo: "caixa" },
  ],
  barras: [{ x: 2150, w: 120, y: 152 }],
  argolas: L3_ARGOLAS,
  cordas: [
    { x: 980, base: 26, topo: 205 },
    { x: 1360, base: 30, topo: 205 },
    { x: 1460, base: 26, topo: 205 },
    { x: 2200, base: 34, topo: 205 },
    { x: 2570, base: 26, topo: 205 },
    { x: 2670, base: 32, topo: 205 },
    { x: 3420, base: 28, topo: 205 },
  ],
  jumps: [],
  paredes: [],
  lava: L3_LAVA,
  telas: [],
  cones: conesSeguros(L3_LAVA, []),
  coracoes: [
    { x: 1460, y: 168 },
    { x: 3420, y: 172 },
  ],
  chuvaBatata: [],
  donuts: false,
};

/* ---------- FASE 4: corredores com chuva de batata frita ---------- */
const FASE4: Layout = {
  solidos: [
    { x: 380, w: 58, h: 26, tipo: "step" },
    { x: 520, w: 80, h: 74, tipo: "caixa" },
    { x: 900, w: 58, h: 30, tipo: "step" },
    { x: 1020, w: 58, h: 52, tipo: "step" },
    { x: 1400, w: 88, h: 88, tipo: "caixa" },
    { x: 1720, w: 58, h: 28, tipo: "step" },
    { x: 2100, w: 76, h: 62, tipo: "caixa" },
    { x: 2460, w: 58, h: 34, tipo: "step" },
    { x: 2800, w: 90, h: 92, tipo: "caixa" },
    { x: 3180, w: 58, h: 26, tipo: "step" },
    { x: 3300, w: 58, h: 50, tipo: "step" },
    { x: 3760, w: 84, h: 80, tipo: "caixa" },
  ],
  barras: [
    { x: 640, w: 210, y: 148 },
    { x: 2540, w: 220, y: 152 },
  ],
  argolas: [
    { x: 1180, y: 134 },
    { x: 1272, y: 142 },
    { x: 3420, y: 136 },
    { x: 3512, y: 144 },
  ],
  cordas: [{ x: 2280, base: 28, topo: 205 }],
  jumps: [{ x: 1620, w: 86, h: 18 }],
  paredes: [{ x: 3900, w: 150, h: 205 }],
  lava: [],
  telas: [],
  cones: conesSeguros([], []),
  coracoes: [
    { x: 1272, y: 158 },
    { x: 3512, y: 160 },
  ],
  chuvaBatata: [
    { x0: 820, x1: 1600 },
    { x0: 2350, x1: 3200 },
  ],
  donuts: false,
};

/* ---------- FASE 5: vilões atirando donuts ---------- */
const FASE5: Layout = {
  solidos: [
    { x: 320, w: 76, h: 64, tipo: "caixa" },
    { x: 700, w: 58, h: 24, tipo: "step" },
    { x: 820, w: 58, h: 48, tipo: "step" },
    { x: 1150, w: 90, h: 90, tipo: "caixa" },
    { x: 1520, w: 58, h: 28, tipo: "step" },
    { x: 1900, w: 78, h: 70, tipo: "caixa" },
    { x: 2280, w: 58, h: 32, tipo: "step" },
    { x: 2400, w: 58, h: 56, tipo: "step" },
    { x: 2760, w: 86, h: 84, tipo: "caixa" },
    { x: 3150, w: 58, h: 26, tipo: "step" },
    { x: 3520, w: 80, h: 76, tipo: "caixa" },
    { x: 3960, w: 76, h: 66, tipo: "caixa" },
  ],
  barras: [
    { x: 950, w: 180, y: 150 },
    { x: 2950, w: 180, y: 148 },
  ],
  argolas: [
    { x: 1650, y: 136 },
    { x: 1742, y: 144 },
    { x: 1834, y: 136 },
    { x: 3280, y: 138 },
    { x: 3372, y: 146 },
  ],
  cordas: [
    { x: 2560, base: 26, topo: 205 },
    { x: 2660, base: 32, topo: 205 },
  ],
  jumps: [{ x: 2050, w: 86, h: 18 }],
  paredes: [{ x: 1280, w: 140, h: 200 }],
  lava: [],
  telas: [],
  cones: conesSeguros([], []),
  coracoes: [
    { x: 1742, y: 162 },
    { x: 3372, y: 164 },
  ],
  chuvaBatata: [],
  donuts: true,
};

/* ---------- FASE 6: sala de computadores (não passe na frente das telas) ---------- */
const L6_TELAS: Tela[] = [
  { x: 700, w: 46 },
  { x: 1320, w: 46 },
  { x: 1900, w: 46 },
  { x: 2520, w: 46 },
  { x: 3080, w: 46 },
  { x: 3660, w: 46 },
];
const FASE6: Layout = {
  solidos: [
    { x: 620, w: 60, h: 62, tipo: "step" },
    { x: 760, w: 60, h: 62, tipo: "step" },
    { x: 1000, w: 84, h: 80, tipo: "caixa" },
    { x: 1240, w: 60, h: 66, tipo: "step" },
    { x: 1380, w: 60, h: 66, tipo: "step" },
    { x: 1660, w: 58, h: 30, tipo: "step" },
    { x: 1820, w: 60, h: 68, tipo: "step" },
    { x: 1960, w: 60, h: 68, tipo: "step" },
    { x: 2240, w: 88, h: 86, tipo: "caixa" },
    { x: 2440, w: 60, h: 66, tipo: "step" },
    { x: 2580, w: 60, h: 66, tipo: "step" },
    { x: 3000, w: 60, h: 70, tipo: "step" },
    { x: 3140, w: 60, h: 70, tipo: "step" },
    { x: 3580, w: 60, h: 68, tipo: "step" },
    { x: 3720, w: 60, h: 68, tipo: "step" },
    { x: 3960, w: 80, h: 78, tipo: "caixa" },
  ],
  barras: [
    { x: 1420, w: 200, y: 150 },
    { x: 2660, w: 200, y: 152 },
  ],
  argolas: [
    { x: 2900, y: 136 },
    { x: 2992, y: 144 },
    { x: 3400, y: 138 },
  ],
  cordas: [{ x: 2100, base: 28, topo: 205 }],
  jumps: [{ x: 1120, w: 86, h: 18 }],
  paredes: [{ x: 3200, w: 140, h: 205 }],
  lava: [],
  telas: L6_TELAS,
  cones: conesSeguros([], L6_TELAS),
  coracoes: [
    { x: 2992, y: 160 },
    { x: 3400, y: 164 },
  ],
  chuvaBatata: [],
  donuts: false,
};

const LAYOUTS: Layout[] = [FASE1, FASE2, FASE3, FASE4, FASE5, FASE6];
const layoutFase = (fase: number) => LAYOUTS[(fase - 1) % LAYOUTS.length]!;

/* arena do chefão: mesmos elementos, cenário mais curto */
const ARENA_SOLIDOS: Solido[] = [
  { x: 150, w: 58, h: 24, tipo: "step" },
  { x: 300, w: 76, h: 64, tipo: "caixa" },
  { x: 520, w: 58, h: 30, tipo: "step" },
];
const ARENA_BARRAS: Barra[] = [{ x: 90, w: 190, y: 150 }];
const ARENA_ARGOLAS: Argola[] = [
  { x: 430, y: 134 },
  { x: 520, y: 142 },
];
const ARENA_PAREDES: Parede[] = [{ x: 620, w: 90, h: 170 }];
const PINOS_POR_FASE = LAYOUTS.map((l) => gerarPinos(l.paredes, 26));
const PINOS_ARENA = gerarPinos(ARENA_PAREDES, 14);
const CONES_ARENA: number[] = [70, 230, 400, 480, 600, 680];


/* paleta do cenário por fase (mesmos elementos, cores diferentes) */
const CENARIOS = [
  { teto: "#ff7a18", teto2: "#c2410c", neon: "#ff9f43" },
  { teto: "#22d3ee", teto2: "#0e7490", neon: "#67e8f9" },
  { teto: "#a855f7", teto2: "#6d28d9", neon: "#d8b4fe" },
  { teto: "#84cc16", teto2: "#3f6212", neon: "#bef264" },
  { teto: "#f43f5e", teto2: "#9f1239", neon: "#fda4af" },
  { teto: "#facc15", teto2: "#a16207", neon: "#fde68a" },
];

type Padrao = "reta" | "queda" | "zigue";
type Inimigo = {
  id: number;
  x: number;
  y: number;
  vilao: number;
  padrao: Padrao;
  vx: number;
  fase: number;
  base: number;
};
type Bola = { id: number; x: number; y: number; vx: number; super: boolean };
type Haltere = { id: number; x: number; y: number; cor: "verde" | "azul"; caindo: boolean };
type Chefao = { x: number; y: number; vx: number; vy: number; hp: number; hpMax: number };
type Modo = "corrida" | "intervalo" | "chefao" | "fase-vencida";
type TipoTiro = "celular" | "batata" | "furacao" | "corda" | "donut" | "balao";
type Tiro = {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  tipo: TipoTiro;
  volta: boolean;
  origem: number;
  cor: string;
  fase: number;
};

/* cada chefão tem seu ataque, na ordem dos vilões */
const ATAQUE_FASE: TipoTiro[] = ["celular", "batata", "furacao", "corda", "donut", "balao"];
const TAM_TIRO: Record<TipoTiro, { w: number; h: number }> = {
  celular: { w: 16, h: 26 },
  batata: { w: 20, h: 14 },
  furacao: { w: 30, h: 42 },
  corda: { w: 44, h: 10 },
  donut: { w: 22, h: 22 },
  balao: { w: 40, h: 24 },
};
const CORES_DONUT = ["#ec4899", "#f59e0b", "#22d3ee", "#a3e635", "#f43f5e"];
const VIDAS_CHEFAO = 3;
const VIDAS_MAX = 5;

/* dois corações por fase, bem altos — só alcançáveis pulando dos aparelhos */
const CORACOES: { x: number; y: number }[] = FASE1.coracoes;



const alturaHeroi = (abaixado: boolean) => (abaixado ? HEROI_H_ABAIXADO : HEROI_H);
/* fase 1 com 30% menos dificuldade; sobe gradualmente a cada fase */
const dificuldade = (fase: number) => 0.2573 + (fase - 1) * 0.18;
const chefaoTamanho = (fase: number) => 78 + fase * 4;


function JogoPage() {
  const palcoRef = useRef<HTMLDivElement>(null);

  const [heroX, setHeroX] = useState(60);
  const [heroY, setHeroY] = useState(0);
  const [camera, setCamera] = useState(0);
  const [inimigos, setInimigos] = useState<Inimigo[]>([]);
  const [bolas, setBolas] = useState<Bola[]>([]);
  const [halteres, setHalteres] = useState<Haltere[]>([]);
  const [chefao, setChefao] = useState<Chefao | null>(null);
  const [tiros, setTiros] = useState<Tiro[]>([]);
  const [vidas, setVidas] = useState(VIDAS_CHEFAO);
  const [coracoes, setCoracoes] = useState<number[]>(CORACOES.map((_, i) => i));
  const [estoqueCoracoes, setEstoqueCoracoes] = useState(0);
  const [conesPegos, setConesPegos] = useState<number[]>([]);
  const [piscando, setPiscando] = useState(false);
  const [chocado, setChocado] = useState(false);

  const [heroiSel, setHeroiSel] = useState<HeroiId | null>(null);
  const [olhando, setOlhando] = useState<1 | -1>(1);
  const [andando, setAndando] = useState(false);
  const [passoFrame, setPassoFrame] = useState<0 | 1>(0);
  const [pulando, setPulando] = useState(false);
  const heroiRef = useRef<HeroiId | null>(null);
  const olhandoRef = useRef<1 | -1>(1);
  const andandoRef = useRef(false);
  const passoRef = useRef<0 | 1>(0);
  const passoDistancia = useRef(0);
  const pulandoRef = useRef(false);



  const [carga, setCarga] = useState(0);
  const [pontos, setPontos] = useState(0);
  const [fase, setFase] = useState(1);
  const [modo, setModo] = useState<Modo>("corrida");
  const [pendurado, setPendurado] = useState<false | "barra" | "argola" | "corda" | "parede">(false);
  const [abaixado, setAbaixado] = useState(false);
  const [fim, setFim] = useState(false);
  const [venceu, setVenceu] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);
  const [derrotado, setDerrotado] = useState<number | null>(null);
  const [somLigado, setSomLigado] = useState(true);
  const somRef = useRef(true);
  const sfx = (fn: () => void) => {
    if (somRef.current) fn();
  };
  const acordarSom = () => {
    if (!somRef.current) return;
    acordarAudio();
    iniciarMusica(faseRef.current, modoRef.current === "chefao");
  };


  const dir = useRef(0);
  const dirY = useRef(0);
  const x = useRef(60);
  const y = useRef(0);
  const vy = useRef(0);
  const noAr = useRef(false);
  const seguro = useRef<false | "barra" | "argola" | "corda" | "parede">(false);
  const subindo = useRef(false);
  const descendoParede = useRef(false);
  const subindoDesde = useRef<number | null>(null);
  const ultimoToqueBaixo = useRef<number | null>(null);
  const ultimoToqueCima = useRef<number | null>(null);
  const podeSuperPular = useRef(true);
  const bloquearAgarreAte = useRef(0);
  const vxAr = useRef(0);
  const duck = useRef(false);
  const fimRef = useRef(false);
  const pausaRef = useRef(false);
  const modoRef = useRef<Modo>("corrida");
  const faseRef = useRef(1);
  const vistaRef = useRef(360);
  const nextId = useRef(0);
  const nextBola = useRef(0);
  const nextHaltere = useRef(0);
  const spawn = useRef(60);
  const spawnHaltere = useRef(120);
  const tick = useRef(0);
  const maxX = useRef(60);
  const passados = useRef(0);
  const pontosRef = useRef(0);
  const cargaRef = useRef(0);
  const bolasRef = useRef<Bola[]>([]);
  const chefaoRef = useRef<Chefao | null>(null);
  const tirosRef = useRef<Tiro[]>([]);
  const nextTiro = useRef(0);
  const spawnTiro = useRef(90);
  const vidasRef = useRef(VIDAS_CHEFAO);
  const coracoesRef = useRef<number[]>(CORACOES.map((_, i) => i));
  const estoqueRef = useRef(0);
  const conesRef = useRef<number[]>([]);
  const invulAte = useRef(0);
  const presoAte = useRef(0);
  const spawnQueda = useRef(60);
  const impactos = useRef(0);
  /* cada batata/donut que encosta deixa o personagem mais "gordo" e mais lento */
  const gordura = useRef(0);
  const [gorduraUi, setGorduraUi] = useState(0);
  const GORDURA_MAX = 5;



  useEffect(() => {
    const el = palcoRef.current;
    if (!el) return;
    const medir = () => {
      vistaRef.current = el.clientWidth;
    };
    medir();
    const ro = new ResizeObserver(medir);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  /* os quadros da caminhada são trocados dentro do loop do jogo (sincronizados) */



  const zerarHeroi = useCallback(() => {
    dir.current = 0;
    x.current = 60;
    y.current = 0;
    vy.current = 0;
    noAr.current = false;
    seguro.current = false;
    duck.current = false;
    subindo.current = false;
    descendoParede.current = false;
    subindoDesde.current = null;
    ultimoToqueBaixo.current = null;
    bloquearAgarreAte.current = 0;
    maxX.current = 60;
    setHeroX(60);
    setHeroY(0);
    setCamera(0);
    setPendurado(false);
    setAbaixado(false);
  }, []);

  const iniciarCorrida = useCallback(
    (novaFase: number, reporCoracoes = true) => {
      if (modoRef.current === "chefao") {
        /* saindo do chefão: as chances que sobraram voltam a ser vidas */
        vidasRef.current = estoqueRef.current + 1;
        setVidas(vidasRef.current);
        estoqueRef.current = 0;
        setEstoqueCoracoes(0);
      }
      faseRef.current = novaFase;
      setFase(novaFase);
      modoRef.current = "corrida";
      setModo("corrida");
      pausaRef.current = false;
      fimRef.current = false;
      tick.current = 0;
      spawn.current = 140;
      spawnHaltere.current = 120;
      passados.current = 0;
      cargaRef.current = 0;
      chefaoRef.current = null;
      bolasRef.current = [];
      tirosRef.current = [];
      invulAte.current = performance.now() + 900;
      presoAte.current = 0;
      impactos.current = 0;
      gordura.current = 0;
      setGorduraUi(0);
      spawnQueda.current = 60;
      setChocado(false);
      if (reporCoracoes) {
        coracoesRef.current = layoutFase(novaFase).coracoes.map((_, i) => i);
        setCoracoes(coracoesRef.current);
      }

      setTiros([]);
      setCarga(0);
      setChefao(null);
      setBolas([]);
      setHalteres([]);
      setInimigos([]);
      setDerrotado(null);
      setVenceu(false);
      setFim(false);
      setPiscando(false);
      conesRef.current = [];
      setConesPegos([]);
      zerarHeroi();
    },
    [zerarHeroi],
  );

  const reiniciar = useCallback(() => {
    pontosRef.current = 0;
    setPontos(0);
    vidasRef.current = VIDAS_CHEFAO;
    setVidas(VIDAS_CHEFAO);
    estoqueRef.current = 0;
    setEstoqueCoracoes(0);
    iniciarCorrida(1);
  }, [iniciarCorrida]);

  const iniciarChefao = useCallback(() => {
    modoRef.current = "chefao";
    setModo("chefao");
    /* vidas extras juntadas na corrida viram novas chances; a barra começa cheia */
    estoqueRef.current = Math.max(0, vidasRef.current - 1);
    setEstoqueCoracoes(estoqueRef.current);
    vidasRef.current = VIDAS_CHEFAO;
    setVidas(VIDAS_CHEFAO);
    pausaRef.current = false;
    fimRef.current = false;
    tick.current = 0;
    spawnHaltere.current = 90;
    spawnTiro.current = 70;
    cargaRef.current = 0;
    invulAte.current = performance.now() + 900;
    presoAte.current = 0;
    impactos.current = 0;
    setChocado(false);

    setPiscando(false);
    setCarga(0);
    setBolas([]);
    bolasRef.current = [];
    tirosRef.current = [];
    setTiros([]);
    setHalteres([]);
    setInimigos([]);
    conesRef.current = [];
    setConesPegos([]);
    zerarHeroi();
    const hpMax = 6 + faseRef.current * 2;
    const boss: Chefao = { x: ARENA - 200, y: 60, vx: -1.1, vy: 0.9, hp: hpMax, hpMax };
    chefaoRef.current = boss;
    setChefao(boss);
  }, [zerarHeroi]);


  useEffect(() => {
    let raf = 0;

    /* perder uma vida: volta ao checkpoint do trecho atual (corrida ou arena do chefão) */
    const perderVida = (vilao: number | null) => {
      if (fimRef.current || performance.now() <= invulAte.current) return;
      vidasRef.current -= 1;
      setVidas(vidasRef.current);
      sfx(somDano);
      invulAte.current = performance.now() + 1800;
      setPiscando(true);
      window.setTimeout(() => setPiscando(false), 1600);
      if (vidasRef.current <= 0) {
        if (estoqueRef.current > 0) {
          /* usa um coração coletado e volta com a barra cheia */
          estoqueRef.current -= 1;
          setEstoqueCoracoes(estoqueRef.current);
          vidasRef.current = VIDAS_CHEFAO;
          setVidas(VIDAS_CHEFAO);
          sfx(somMoeda);
        } else {
          fimRef.current = true;
          sfx(somGameOver);
          setFim(true);
          setDerrotado(vilao);
          return;
        }
      }
      impactos.current = 0;
      presoAte.current = 0;
      setChocado(false);
      x.current = 60;

      y.current = 0;
      vy.current = 0;
      subindoDesde.current = null;
      vxAr.current = 0;
      noAr.current = false;
      seguro.current = false;
      duck.current = false;
      subindo.current = false;
      descendoParede.current = false;
      setHeroX(60);
      setHeroY(0);
      setAbaixado(false);
      setPendurado(false);
      tirosRef.current = [];
      setTiros([]);
      bolasRef.current = [];
      setBolas([]);
      if (modoRef.current !== "chefao") setInimigos([]);
    };


    const loop = () => {
      raf = requestAnimationFrame(loop);
      if (fimRef.current || pausaRef.current || !heroiRef.current) return;
      tick.current += 1;
      const xAntesDoQuadro = x.current;

      const emChefao = modoRef.current === "chefao";
      const lay = layoutFase(faseRef.current);
      const mundo = emChefao ? ARENA : MUNDO;
      const solidos: Solido[] = emChefao ? ARENA_SOLIDOS : lay.solidos;
      const barras: Barra[] = emChefao ? ARENA_BARRAS : lay.barras;
      const argolas: Argola[] = emChefao ? ARENA_ARGOLAS : lay.argolas;
      const cordas: Corda[] = emChefao ? [] : lay.cordas;
      const jumps: Jump[] = emChefao ? [] : lay.jumps;
      const paredes: Parede[] = emChefao ? ARENA_PAREDES : lay.paredes;
      const dif = dificuldade(faseRef.current);
      const preso = !emChefao && performance.now() < presoAte.current;
      if (preso) {
        dir.current = 0;
        dirY.current = 0;
      }



      /* ---- segurar o analógico para baixo agacha o personagem ---- */
      const querAgachar = dirY.current > 0.45 && !seguro.current && !noAr.current;
      if (querAgachar !== duck.current) {
        duck.current = querAgachar;
        setAbaixado(querAgachar);
      }

      const alt = alturaHeroi(duck.current);


      /* ---- movimento horizontal (mais lento a cada batata/donut no corpo) ---- */
      const lento = Math.max(0.5, 1 - gordura.current * 0.11);
      const passo = (delta: number) => {
        const alvo = x.current + delta;
        let livre = true;
        if (!seguro.current) {
          for (const s of solidos) {
            const dentro = alvo + HEROI_W > s.x && alvo < s.x + s.w;
            if (dentro && y.current < s.h - 6) {
              livre = false;
              break;
            }
          }
        }
        if (livre) x.current = Math.min(mundo - HEROI_W, Math.max(0, alvo));
      };

      if (dir.current !== 0) {
        const lado: 1 | -1 = dir.current > 0 ? 1 : -1;
        if (olhandoRef.current !== lado) {
          olhandoRef.current = lado;
          setOlhando(lado);
        }
        if (seguro.current === "parede") {
          /* na parede: desliza para os lados e sai da parede ao passar da borda */
          const cx = x.current + HEROI_W / 2;
          const p = paredes.find((pp) => cx > pp.x - 6 && cx < pp.x + pp.w + 6);
          const alvo = x.current + dir.current * VELOCIDADE * 0.7 * lento;
          if (p && alvo + HEROI_W / 2 > p.x - 4 && alvo + HEROI_W / 2 < p.x + p.w + 4) {
            x.current = Math.min(mundo - HEROI_W, Math.max(0, alvo));
          } else {
            /* saiu da parede: volta imediatamente para a caminhada / queda */
            seguro.current = false;
            bloquearAgarreAte.current = performance.now() + 320;
            noAr.current = y.current > 0;
            x.current = Math.min(mundo - HEROI_W, Math.max(0, alvo));
          }
        } else {
          passo(dir.current * (seguro.current ? VELOCIDADE * 0.7 : VELOCIDADE) * lento);
        }
      }


      /* ---- impulso lateral do salto ao soltar aparelho ---- */
      if (vxAr.current !== 0) {
        if (seguro.current) vxAr.current = 0;
        else {
          const ladoAr: 1 | -1 = vxAr.current > 0 ? 1 : -1;
          if (olhandoRef.current !== ladoAr) {
            olhandoRef.current = ladoAr;
            setOlhando(ladoAr);
          }
          passo(vxAr.current);
          vxAr.current *= 0.94;
          if (Math.abs(vxAr.current) < 0.25) vxAr.current = 0;
        }
      }

      /* encostou na parede: troca para a pose de escalada no mesmo quadro */
      if (!seguro.current && performance.now() >= bloquearAgarreAte.current) {
        const cx = x.current + HEROI_W / 2;
        const paredeEncostada = paredes.find(
          (p) => cx >= p.x && cx <= p.x + p.w && y.current >= 0 && y.current < p.h - alt,
        );
        if (paredeEncostada && (dir.current !== 0 || dirY.current !== 0 || noAr.current)) {
          seguro.current = "parede";
          x.current = Math.min(
            paredeEncostada.x + paredeEncostada.w - HEROI_W,
            Math.max(paredeEncostada.x, x.current),
          );
          vy.current = 0;
          noAr.current = false;
          subindoDesde.current = null;
        }
      }


      /* ---- vertical ---- */
      if (seguro.current) {
        let apoio = 0;
        if (seguro.current === "barra") {
          const b = barras.find((b) => x.current + HEROI_W / 2 > b.x && x.current + HEROI_W / 2 < b.x + b.w);
          if (b) apoio = b.y - alt;
          else seguro.current = false;
        } else if (seguro.current === "argola") {
          const a = argolas.find((a) => Math.abs(a.x - (x.current + HEROI_W / 2)) < (faseRef.current === 3 ? 52 : 34));
          if (a) apoio = a.y - alt;
          else seguro.current = false;
        } else if (seguro.current === "parede") {
          const cx = x.current + HEROI_W / 2;
          const p = paredes.find((p) => cx > p.x - 6 && cx < p.x + p.w + 6);
          if (p) {
            x.current = Math.min(p.x + p.w - HEROI_W, Math.max(p.x, x.current));
            const querSubir = subindo.current || dirY.current < -0.3;
            const querDescer = descendoParede.current || dirY.current > 0.3;
            const delta = querSubir ? VELOCIDADE_ESCALADA : querDescer ? -VELOCIDADE_ESCALADA : 0;
            const proximaAltura = Math.min(p.h - alt, Math.max(0, y.current + delta));
            if (querDescer && proximaAltura <= 0) {
              y.current = 0;
              seguro.current = false;
              noAr.current = false;
              descendoParede.current = false;
            } else {
              apoio = proximaAltura;
            }
          } else seguro.current = false;
        } else {
          const corda = cordas.find((c) => Math.abs(c.x - (x.current + HEROI_W / 2)) < 28);
          if (corda) {
            x.current = corda.x - HEROI_W / 2;
            apoio = Math.min(corda.topo - alt, Math.max(corda.base, y.current + 0.7));
          } else seguro.current = false;
        }
        if (seguro.current) {
          y.current = Math.min(TETO - alt, apoio);
          vy.current = 0;
          noAr.current = false;
        } else {
          noAr.current = y.current > 0;
        }
      } else if (noAr.current || y.current > 0) {
        const anterior = y.current;
        vy.current += faseRef.current === 3 ? GRAVIDADE * 0.82 : GRAVIDADE;
        if (vy.current > 0 && subindoDesde.current === null) subindoDesde.current = performance.now();
        if (vy.current <= 0) subindoDesde.current = null;
        if (vy.current > 0 && subindoDesde.current !== null && performance.now() - subindoDesde.current > 1000) {
          vy.current = 0;
          subindoDesde.current = null;
        }
        let prox = y.current + vy.current;
        if (prox + alt > TETO) {
          prox = TETO - alt;
          vy.current = 0;
          subindoDesde.current = null;
        }

        const fase3 = faseRef.current === 3;
        if ((vy.current > -4 || fase3) && performance.now() >= bloquearAgarreAte.current) {
          const topo = prox + alt;
          const cx = x.current + HEROI_W / 2;
          const barra = barras.find((b) => cx > b.x && cx < b.x + b.w && Math.abs(topo - b.y) < 16);
          const argTolX = fase3 ? 46 : 26;
          const argTolY = fase3 ? 34 : 20;
          const argola = argolas.find((a) => Math.abs(a.x - cx) < argTolX && Math.abs(topo - a.y) < argTolY);
          const cordaTolX = fase3 ? 64 : 22;
          const cordaFolga = fase3 ? 34 : 0;
          const cordasProximas = cordas.filter(
            (c) =>
              Math.abs(c.x - cx) < cordaTolX &&
              prox + alt > c.base - cordaFolga &&
              prox < c.topo + cordaFolga,
          );
          const corda = cordasProximas.sort((a, b) => Math.abs(a.x - cx) - Math.abs(b.x - cx))[0];

          const parede = paredes.find(
            (p) => cx > p.x - 4 && cx < p.x + p.w + 4 && prox >= 0 && prox < p.h - alt,
          );
          if (barra) {
            seguro.current = "barra";
            y.current = barra.y - alt;
            vy.current = 0;
            subindoDesde.current = null;
            noAr.current = false;
          } else if (argola) {
            seguro.current = "argola";
            y.current = argola.y - alt;
            vy.current = 0;
            subindoDesde.current = null;
            noAr.current = false;
          } else if (corda) {
            seguro.current = "corda";
            x.current = corda.x - HEROI_W / 2;
            y.current = Math.min(corda.topo - alt, Math.max(corda.base, prox));
            vy.current = 0;
            subindoDesde.current = null;
            noAr.current = false;
          } else if (parede) {
            seguro.current = "parede";
            x.current = Math.min(parede.x + parede.w - HEROI_W, Math.max(parede.x, x.current));
            y.current = Math.max(0, prox);
            vy.current = 0;
            subindoDesde.current = null;
            noAr.current = false;
          }
        }

        if (!seguro.current) {
          if (vy.current < 0) {
            const jump = jumps.find(
              (j) => x.current + HEROI_W > j.x + 2 && x.current < j.x + j.w - 2 && anterior >= j.h && prox <= j.h,
            );
            if (jump) {
              prox = jump.h;
              vy.current = IMPULSO * 1.2;
              subindoDesde.current = performance.now();
              noAr.current = true;
            }
            for (const s of solidos) {
              const sobre = x.current + HEROI_W > s.x + 2 && x.current < s.x + s.w - 2;
              if (!jump && sobre && anterior >= s.h && prox <= s.h) {
                prox = s.h;
                vy.current = 0;
                subindoDesde.current = null;
                noAr.current = false;
                break;
              }
            }
          }
          if (prox <= 0) {
            prox = 0;
            vy.current = 0;
            subindoDesde.current = null;
            noAr.current = false;
          }
          y.current = prox;
        }
      }

      if (y.current > 0 && !seguro.current && !noAr.current) {
        const apoiado = solidos.some(
          (s) => x.current + HEROI_W > s.x + 2 && x.current < s.x + s.w - 2 && Math.abs(y.current - s.h) < 3,
        );
        if (!apoiado) noAr.current = true;
      }

      /* sincroniza os passos com a distância realmente percorrida */
      {
        const distanciaPercorrida = Math.abs(x.current - xAntesDoQuadro);
        const caminhandoAgora = distanciaPercorrida > 0.05 && !noAr.current && !seguro.current;
        if (andandoRef.current !== caminhandoAgora) {
          andandoRef.current = caminhandoAgora;
          setAndando(caminhandoAgora);
          passoDistancia.current = 0;
        }
        if (caminhandoAgora) {
          passoDistancia.current += distanciaPercorrida;
          if (passoDistancia.current >= 9) {
            passoDistancia.current = 0;
            passoRef.current = passoRef.current === 0 ? 1 : 0;
            setPassoFrame(passoRef.current);
          }
        } else if (passoRef.current !== 0) {
          passoDistancia.current = 0;
          passoRef.current = 0;
          setPassoFrame(0);
        }
      }

      setHeroX(x.current);
      setHeroY(y.current);
      setPendurado(seguro.current);
      const ar = noAr.current && !seguro.current;
      if (ar !== pulandoRef.current) {
        pulandoRef.current = ar;
        setPulando(ar);
      }

      /* ---- câmera ---- */
      const vista = vistaRef.current;
      const cam = Math.min(Math.max(0, mundo - vista), Math.max(0, x.current - vista * 0.35));
      setCamera(cam);

      const hAlt = alturaHeroi(duck.current);

      /* ---- cones: 5 pontos cada ---- */
      {
        const lista = emChefao ? CONES_ARENA : lay.cones;
        let ganhouCone = false;
        for (let i = 0; i < lista.length; i += 1) {
          if (conesRef.current.includes(i)) continue;
          const cx = lista[i]!;
          if (
            x.current + HEROI_W > cx - 4 &&
            x.current < cx + 20 &&
            y.current < 30
          ) {
            conesRef.current = [...conesRef.current, i];
            pontosRef.current += 5;
            ganhouCone = true;
          }
        }
        if (ganhouCone) {
          sfx(somMoeda);
          setConesPegos(conesRef.current);
          setPontos(pontosRef.current);
        }
      }

      /* =================== FASE DE CORRIDA =================== */
      if (!emChefao) {
        if (x.current > maxX.current) {
          maxX.current = x.current;
          const ganho = passados.current + Math.floor((maxX.current - 60) / 60);
          setPontos(pontosRef.current + ganho);
        }

        /* ---- chão de lava: cair nele custa uma vida ---- */
        if (lay.lava.length > 0 && !seguro.current && y.current <= 2) {
          const naLava = lay.lava.some(
            (l) => x.current + HEROI_W > l.x + 4 && x.current < l.x + l.w - 4,
          );
          if (naLava) {
            perderVida(null);
            return;
          }
        }

        /* ---- telas de computador: passar na frente prende e dá choque ---- */
        if (
          lay.telas.length > 0 &&
          performance.now() >= presoAte.current &&
          performance.now() > invulAte.current
        ) {
          const tela = lay.telas.find(
            (t) => x.current + HEROI_W > t.x - 2 && x.current < t.x + t.w + 2 && y.current < 52,
          );
          if (tela) {
            presoAte.current = performance.now() + 2000;
            setChocado(true);
            sfx(somDano);
            window.setTimeout(() => {
              setChocado(false);
              perderVida(null);
            }, 2000);
          }
        }

        /* ---- chuva de batata frita (fase 4) ---- */
        if (lay.chuvaBatata.length > 0) {
          spawnQueda.current -= 1;
          if (spawnQueda.current <= 0) {
            spawnQueda.current = 22 + Math.floor(Math.random() * 26);
            const faixa = lay.chuvaBatata[Math.floor(Math.random() * lay.chuvaBatata.length)]!;
            const px = faixa.x0 + Math.random() * (faixa.x1 - faixa.x0);
            if (px > cam - 30 && px < cam + vista + 60) {
              tirosRef.current = [
                ...tirosRef.current,
                {
                  id: nextTiro.current++,
                  x: px,
                  y: ALTURA_CENA - 70,
                  vx: 0,
                  vy: -2.6 - dif,
                  tipo: "batata",
                  volta: false,
                  origem: px,
                  cor: "#fbbf24",
                  fase: Math.random() * Math.PI * 2,
                },
              ];
            }
          }
        }

        /* ---- vilões atirando donuts (fase 5) ---- */
        if (lay.donuts) {
          spawnQueda.current -= 1;
          if (spawnQueda.current <= 0) {
            spawnQueda.current = 95 + Math.floor(Math.random() * 70);
            tirosRef.current = [
              ...tirosRef.current,
              {
                id: nextTiro.current++,
                x: cam + vista + 20,
                y: 12 + Math.random() * 90,
                vx: -(2.4 + Math.random() * 1.2),
                vy: 0.8,
                tipo: "donut",
                volta: false,
                origem: cam + vista + 20,
                cor: CORES_DONUT[Math.floor(Math.random() * CORES_DONUT.length)]!,
                fase: Math.random() * Math.PI * 2,
              },
            ];
          }
        }

        /* ---- movimento dos perigos da corrida: 2 acertos = uma vida ---- */
        if (tirosRef.current.length > 0) {
          const restantes: Tiro[] = [];
          let acertou = false;
          let engordou = false;
          for (const t of tirosRef.current) {
            let ny = t.y + t.vy;
            let nvy = t.vy;
            const nx = t.x + t.vx;
            if (t.tipo === "batata") {
              nvy = t.vy - 0.12;
              if (ny <= 0) continue;
            } else {
              nvy = t.vy - 0.14;
              if (ny <= 0) {
                ny = 0;
                nvy = Math.abs(nvy) * 0.7;
              }
            }
            if (nx < cam - 120 || nx > mundo + 80) continue;
            const d = TAM_TIRO[t.tipo];
            const bate =
              nx + d.w > x.current + 3 &&
              nx < x.current + HEROI_W - 3 &&
              ny + d.h > y.current + 3 &&
              ny < y.current + hAlt;
            if (bate && performance.now() > invulAte.current) {
              acertou = true;
              if (t.tipo === "batata" || t.tipo === "donut") engordou = true;
              continue;
            }
            restantes.push({ ...t, x: nx, y: ny, vy: nvy });
          }
          tirosRef.current = restantes;
          setTiros(restantes);
          if (engordou && gordura.current < GORDURA_MAX) {
            gordura.current += 1;
            setGorduraUi(gordura.current);
          }
          if (acertou) {
            impactos.current += 1;
            sfx(somDano);
            invulAte.current = performance.now() + 650;
            if (impactos.current >= 2) {
              impactos.current = 0;
              perderVida(null);
              return;
            }
          }
        }

        /* corações escondidos no alto: cada um vale uma vida extra */
        if (coracoesRef.current.length > 0) {
          const pego = coracoesRef.current.find((idx) => {
            const c = lay.coracoes[idx]!;
            return (
              x.current + HEROI_W > c.x - 12 &&
              x.current < c.x + 12 &&
              y.current + hAlt > c.y - 6 &&
              y.current < c.y + 24
            );
          });
          if (pego !== undefined) {
            coracoesRef.current = coracoesRef.current.filter((idx) => idx !== pego);
            setCoracoes(coracoesRef.current);
            if (modoRef.current === "chefao") {
              estoqueRef.current = Math.min(VIDAS_MAX, estoqueRef.current + 1);
              setEstoqueCoracoes(estoqueRef.current);
            } else {
              vidasRef.current = Math.min(VIDAS_MAX + VIDAS_CHEFAO, vidasRef.current + 1);
              setVidas(vidasRef.current);
            }
            pontosRef.current += 10;
            setPontos(pontosRef.current);
            sfx(somMoeda);
          }
        }


        /* medalha de bronze suspensa: pegar pulando */
        const pegouMedalha =
          x.current + HEROI_W > MEDALHA.x - 18 &&
          x.current < MEDALHA.x + 18 &&
          y.current + hAlt > MEDALHA.y - 6 &&
          y.current < MEDALHA.y + 26;
        if (pegouMedalha) {
          const ganho = passados.current + Math.floor((maxX.current - 60) / 60) + 30;
          sfx(somVitoria);
          pontosRef.current += ganho;
          setPontos(pontosRef.current);
          pausaRef.current = true;
          modoRef.current = "intervalo";
          setModo("intervalo");
          setInimigos([]);
          return;
        }


        /* inimigos do percurso (mais lentos na fase 1; fase 3 sem vilões) */
        spawn.current -= 1;
        if (spawn.current <= 0 && faseRef.current !== 3) {
          spawn.current =
            Math.max(44, 264 - faseRef.current * 22) + Math.floor(Math.random() * 50);
          const vilao = Math.floor(Math.random() * VILOES.length);
          const r = Math.random();
          const padrao: Padrao = r < 0.4 ? "reta" : r < 0.7 ? "queda" : "zigue";
          const base = padrao === "reta" ? 0 : 90 + Math.random() * 60;
          setInimigos((prev) => [
            ...prev,
            {
              id: nextId.current++,
              x: cam + vista + 30,
              y: base,
              vilao,
              padrao,
              vx: (0.55 + Math.min(0.85, tick.current / 7000) + Math.random() * 0.35) * dif,
              fase: Math.random() * Math.PI * 2,
              base,
            },
          ]);
        }

        setInimigos((prev) => {
          const proximos: Inimigo[] = [];
          const hx = x.current;
          const hy = y.current;
          for (const i of prev) {
            const nx = i.x - i.vx;
            let ny = i.y;
            if (i.padrao === "queda") ny = Math.max(0, i.y - 0.9 * dif);
            if (i.padrao === "zigue")
              ny = Math.max(0, i.base + Math.sin((tick.current + i.fase * 30) / (24 / dif)) * 46);
            if (nx < cam - 90) {
              passados.current += 1;
              setPontos(pontosRef.current + passados.current + Math.floor((maxX.current - 60) / 60));
              continue;
            }
            const bateX = nx + 34 > hx + 4 && nx + 4 < hx + HEROI_W - 4;
            const bateY = ny + 34 > hy + 4 && ny + 4 < hy + hAlt;
            if (bateX && bateY) {
              perderVida(i.vilao);
              continue;
            }
            proximos.push({ ...i, x: nx, y: ny });

          }
          return proximos;
        });
        return;
      }

      /* =================== FASE DO CHEFÃO =================== */
      const boss = chefaoRef.current;
      if (!boss) return;
      const tam = chefaoTamanho(faseRef.current);

      /* movimento lento e rápido, para os lados e para cima e baixo */
      const rapido = tick.current % 420 < 130;
      const mult = (rapido ? 2.4 : 0.85) * dif;
      boss.x += boss.vx * mult;
      boss.y += boss.vy * mult;
      if (boss.x < 120) {
        boss.x = 120;
        boss.vx = Math.abs(boss.vx);
      }
      if (boss.x > ARENA - tam - 10) {
        boss.x = ARENA - tam - 10;
        boss.vx = -Math.abs(boss.vx);
      }
      if (boss.y < 0) {
        boss.y = 0;
        boss.vy = Math.abs(boss.vy);
      }
      if (boss.y > ALTURA_CENA - 60 - tam) {
        boss.y = ALTURA_CENA - 60 - tam;
        boss.vy = -Math.abs(boss.vy);
      }
      if (tick.current % 90 === 0) {
        boss.vx = (Math.random() < 0.5 ? -1 : 1) * (0.8 + Math.random() * 1.2);
        boss.vy = (Math.random() < 0.5 ? -1 : 1) * (0.6 + Math.random() * 1.1);
      }

      /* halteres verdes e azuis que caem para carregar o super poder */
      spawnHaltere.current -= 1;
      if (spawnHaltere.current <= 0 && cargaRef.current < 3) {
        spawnHaltere.current = 170 + Math.floor(Math.random() * 120);
        setHalteres((prev) => [
          ...prev,
          {
            id: nextHaltere.current++,
            x: 60 + Math.random() * (ARENA - 140),
            y: ALTURA_CENA - 70,
            cor: Math.random() < 0.5 ? "verde" : "azul",
            caindo: true,
          },
        ]);
      }

      setHalteres((prev) => {
        const restantes: Haltere[] = [];
        for (const h of prev) {
          let ny = h.y;
          if (h.caindo) {
            ny = h.y - 2.4;
            /* apoio: chão ou topo de caixa/step abaixo do haltere */
            let apoio = 0;
            for (const s of ARENA_SOLIDOS) {
              const sobrepoe = h.x + 24 > s.x && h.x < s.x + s.w;
              if (sobrepoe && h.y >= s.h && s.h > apoio) apoio = s.h;
            }
            if (ny <= apoio) ny = apoio;
          }
          const pegou =
            x.current + HEROI_W > h.x - 4 &&
            x.current < h.x + 24 &&
            y.current + hAlt > ny &&
            y.current < ny + 20;
          if (pegou) {
            cargaRef.current = Math.min(3, cargaRef.current + 1);
            setCarga(cargaRef.current);
            sfx(somMoeda);
            continue;
          }
          restantes.push({ ...h, y: ny, caindo: h.caindo && ny > 0 && ny !== h.y });
        }
        return restantes;
      });


      /* bolas de tênis */
      let acertos = 0;
      const bolasAtuais: Bola[] = [];
      for (const b of bolasRef.current) {
        const nx = b.x + b.vx;
        if (nx > ARENA + 20 || nx < -40) continue;
        const raio = b.super ? 26 : 12;
        const bateu =
          nx + raio > boss.x && nx < boss.x + tam && b.y + raio > boss.y && b.y < boss.y + tam;
        if (bateu) {
          acertos += b.super ? 5 : 1;
          continue;
        }
        bolasAtuais.push({ ...b, x: nx });
      }
      bolasRef.current = bolasAtuais;
      setBolas(bolasAtuais);

      if (acertos > 0) {
        boss.hp = Math.max(0, boss.hp - acertos);
        pontosRef.current += acertos * 5;
        setPontos(pontosRef.current);
      }

      setChefao({ ...boss });

      /* ---- ataque próprio de cada chefão ---- */
      const tipo = ATAQUE_FASE[Math.min(faseRef.current, TOTAL_FASES) - 1]!;
      const corVilao = VILOES[Math.min(faseRef.current, TOTAL_FASES) - 1]!.cor;
      spawnTiro.current -= 1;
      if (spawnTiro.current <= 0) {
        const base = tipo === "batata" ? 55 : tipo === "donut" ? 70 : tipo === "corda" ? 95 : 80;
        spawnTiro.current = Math.max(28, Math.round((base - faseRef.current * 4) + Math.random() * 60));
        const altura =
          tipo === "furacao"
            ? 0
            : tipo === "corda" && Math.random() < 0.5
              ? 0
              : Math.random() * (ALTURA_CENA - 130);
        const novo: Tiro = {
          id: nextTiro.current++,
          x: boss.x,
          y: altura,
          vx: -(1.9 + Math.random() * 1.1) * (0.8 + dif * 0.5),
          vy: tipo === "celular" ? 2.2 : tipo === "donut" ? 1.2 : 0,
          tipo,
          volta: false,
          origem: boss.x,
          cor: tipo === "donut" ? CORES_DONUT[Math.floor(Math.random() * CORES_DONUT.length)]! : corVilao,
          fase: Math.random() * Math.PI * 2,
        };
        tirosRef.current = [...tirosRef.current, novo];
      }

      const tirosAtuais: Tiro[] = [];
      let levouDano = false;
      for (const t of tirosRef.current) {
        let nx = t.x + t.vx;
        let ny = t.y + t.vy;
        let nvy = t.vy;
        let nvx = t.vx;
        let volta = t.volta;

        if (t.tipo === "celular") {
          nvy = t.vy - 0.18;
        } else if (t.tipo === "donut") {
          nvy = t.vy - 0.16;
          if (ny <= 0) {
            ny = 0;
            nvy = Math.abs(nvy) * 0.72;
          }
        } else if (t.tipo === "balao") {
          ny = t.y + Math.sin((tick.current + t.fase * 20) / 16) * 1.2;
        } else if (t.tipo === "furacao") {
          const alvo = x.current;
          nvx = nx > alvo ? -Math.abs(t.vx) * 1.15 : Math.abs(t.vx) * 1.15;
          nx = t.x + nvx;
          ny = Math.max(0, Math.sin((tick.current + t.fase * 20) / 12) * 8);
        } else if (t.tipo === "corda") {
          if (!volta && (nx < x.current - 60 || t.origem - nx > 320)) volta = true;
          if (volta) {
            nvx = Math.abs(t.vx) * 1.5;
            nx = t.x + nvx;
            if (nx > boss.x - 6) continue;
          }
        }

        if (ny < -30 || nx < -70 || nx > ARENA + 70) continue;

        const dimensoes = TAM_TIRO[t.tipo];
        const bate =
          nx + dimensoes.w > x.current + 3 &&
          nx < x.current + HEROI_W - 3 &&
          ny + dimensoes.h > y.current + 3 &&
          ny < y.current + hAlt;
        if (bate && performance.now() > invulAte.current) {
          levouDano = true;
          continue;
        }
        tirosAtuais.push({ ...t, x: nx, y: ny, vx: nvx, vy: nvy, volta });
      }
      tirosRef.current = tirosAtuais;
      setTiros(tirosAtuais);

      /* chefão encostou no herói */
      const bateBoss =
        x.current + HEROI_W > boss.x + 8 &&
        x.current < boss.x + tam - 8 &&
        y.current + hAlt > boss.y + 8 &&
        y.current < boss.y + tam - 8;

      if (levouDano || (bateBoss && performance.now() > invulAte.current)) {
        perderVida(Math.min(faseRef.current, TOTAL_FASES) - 1);
        return;
      }



      /* chefão derrotado */
      if (boss.hp <= 0) {
        sfx(somVitoria);
        pontosRef.current += 50;
        setPontos(pontosRef.current);
        pausaRef.current = true;
        chefaoRef.current = null;
        setChefao(null);
        setBolas([]);
        setHalteres([]);
        tirosRef.current = [];
        setTiros([]);
        if (faseRef.current >= TOTAL_FASES) {
          fimRef.current = true;
          setVenceu(true);
          setFim(true);
        } else {
          modoRef.current = "fase-vencida";
          setModo("fase-vencida");
        }
      }
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  const atirar = useCallback(() => {
    if (modoRef.current !== "chefao" || fimRef.current || pausaRef.current) return;
    if (somRef.current) somPoder();
    const ehSuper = cargaRef.current >= 3;
    if (ehSuper) {
      cargaRef.current = 0;
      setCarga(0);
    }
    /* o poder sai para o lado onde o chefão está no momento */
    const boss = chefaoRef.current;
    const tam = chefaoTamanho(faseRef.current);
    const centroBoss = boss ? boss.x + tam / 2 : ARENA;
    const lado = centroBoss >= x.current + HEROI_W / 2 ? 1 : -1;
    const tamBola = ehSuper ? 26 : 12;
    const velocidade = ehSuper ? 7.5 : 6.5;
    const nova: Bola = {
      id: nextBola.current++,
      x: lado > 0 ? x.current + HEROI_W : x.current - tamBola,
      y: y.current + alturaHeroi(duck.current) / 2 - (ehSuper ? 13 : 6),
      vx: lado * velocidade,
      super: ehSuper,
    };
    bolasRef.current = [...bolasRef.current, nova];
    setBolas(bolasRef.current);
  }, []);


  const pular = () => {
    if (fimRef.current) return;
    acordarSom();
    sfx(somPulo);
    const agora = performance.now();
    const toqueAnterior = ultimoToqueCima.current;
    const duploToque = toqueAnterior !== null && agora - toqueAnterior <= TOQUE_DUPLO_CIMA_MS;
    ultimoToqueCima.current = agora;

    /* pendurado + seta lateral pressionada = solta e pula na diagonal */
    if (seguro.current && dir.current !== 0) {
      const lado = dir.current;
      seguro.current = false;
      subindo.current = false;
      descendoParede.current = false;
      duck.current = false;
      setAbaixado(false);
      setPendurado(false);
      noAr.current = true;
      vy.current = (duploToque ? IMPULSO : IMPULSO * 0.95);
      if (vy.current > 0) subindoDesde.current = performance.now();
      vxAr.current = lado * VELOCIDADE * 2.1;
      bloquearAgarreAte.current = agora + (faseRef.current === 3 ? 180 : 400);
      return;
    }
    if (seguro.current === "parede") {
      subindo.current = true;
      duck.current = false;
      setAbaixado(false);
      return;
    }
    duck.current = false;
    setAbaixado(false);
    if (seguro.current) {
      seguro.current = false;
      noAr.current = true;
      vy.current = duploToque ? IMPULSO : IMPULSO * 0.85;
      if (vy.current > 0) subindoDesde.current = performance.now();
      /* impulso leve para frente ao soltar do aparelho */
      vxAr.current = olhandoRef.current * VELOCIDADE * 1.3;
      return;
    }

    /* toque duplo rápido converte o pulo baixo em pulo alto (sem quicar) */
    if (duploToque) {
      noAr.current = true;
      vy.current = IMPULSO;
      if (vy.current > 0) subindoDesde.current = performance.now();
      /* salto alto mais inclinado para frente */
      vxAr.current = olhandoRef.current * VELOCIDADE * 1.55;
      return;
    }

    if (noAr.current) return;
    noAr.current = true;
    vy.current = IMPULSO_BAIXO;
    if (vy.current > 0) subindoDesde.current = performance.now();
    /* salto normal com leve inclinação para frente */
    vxAr.current = olhandoRef.current * VELOCIDADE * 1.25;
  };


  const pararSubida = () => {
    subindo.current = false;
  };

  const descer = (ativo: boolean) => () => {
    if (fimRef.current) return;
    if (ativo && seguro.current) {
      const agora = performance.now();
      const toqueAnterior = ultimoToqueBaixo.current;
      if (toqueAnterior !== null && agora - toqueAnterior <= 2000) {
        seguro.current = false;
        noAr.current = true;
        subindo.current = false;
        descendoParede.current = false;
        duck.current = false;
        setAbaixado(false);
        y.current = Math.max(0, y.current - 4);
        vy.current = -6;
        subindoDesde.current = null;
        bloquearAgarreAte.current = agora + 650;
        ultimoToqueBaixo.current = null;
        setPendurado(false);
        return;
      }
      ultimoToqueBaixo.current = agora;
      if (seguro.current === "parede") {
        subindo.current = false;
        descendoParede.current = true;
      }
      return;
    }
    if (!ativo) descendoParede.current = false;
    if (ativo) ultimoToqueBaixo.current = null;
    duck.current = ativo;
    setAbaixado(ativo);
  };

  const alt = alturaHeroi(abaixado);
  const emChefao = modo === "chefao";
  const mundoAtual = emChefao ? ARENA : MUNDO;
  const layAtual = layoutFase(fase);
  const solidos: Solido[] = emChefao ? ARENA_SOLIDOS : layAtual.solidos;
  const barras: Barra[] = emChefao ? ARENA_BARRAS : layAtual.barras;
  const argolas: Argola[] = emChefao ? ARENA_ARGOLAS : layAtual.argolas;
  const cordas: Corda[] = emChefao ? [] : layAtual.cordas;
  const jumps: Jump[] = emChefao ? [] : layAtual.jumps;
  const paredes: Parede[] = emChefao ? ARENA_PAREDES : layAtual.paredes;
  const pinos: Pino[][] = emChefao
    ? PINOS_ARENA
    : PINOS_POR_FASE[(fase - 1) % PINOS_POR_FASE.length]!;
  const cones: number[] = emChefao ? CONES_ARENA : layAtual.cones;
  const lavaAtual: Lava[] = emChefao ? [] : layAtual.lava;
  const telasAtuais: Tela[] = emChefao ? [] : layAtual.telas;

  const tema = CENARIOS[(fase - 1) % CENARIOS.length]!;
  const vilaoFase = VILOES[Math.min(fase, TOTAL_FASES) - 1]!;
  const tamBoss = chefaoTamanho(fase);
  const progresso = emChefao ? 100 : Math.min(100, (heroX / (MUNDO - HEROI_W)) * 100);
  const heroiAtual = heroiPorId(heroiSel ?? "kael");

  useEffect(() => () => {
    pararMusica();
    pararMusicaVitoria();
  }, []);

  /* música de vitória na tela da medalha suprema */
  useEffect(() => {
    if (venceu && fim && somRef.current) {
      acordarAudio();
      musicaVitoria();
    } else {
      pararMusicaVitoria();
    }
  }, [venceu, fim]);

  const salvarPrint = async () => {
    const alvo = printRef.current;
    if (!alvo || salvando) return;
    setSalvando(true);
    try {
      const { default: html2canvas } = await import("html2canvas-pro");
      const canvas = await html2canvas(alvo, {
        backgroundColor: "#0b0b0f",
        scale: 2,
        scrollX: 0,
        scrollY: 0,
        width: alvo.scrollWidth,
        height: alvo.scrollHeight,
        windowWidth: alvo.scrollWidth,
        windowHeight: alvo.scrollHeight,
      });
      const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/png"));
      if (!blob) return;
      const arquivo = new File([blob], "super-ct-medalha-suprema.png", { type: "image/png" });
      const nav = navigator as Navigator & {
        canShare?: (d: { files?: File[] }) => boolean;
        share?: (d: { files?: File[]; title?: string; text?: string }) => Promise<void>;
      };
      if (nav.canShare?.({ files: [arquivo] }) && nav.share) {
        await nav.share({
          files: [arquivo],
          title: "Medalha Suprema Super CT",
          text: "Ganhei a medalha suprema do Super CT!",
        });
      } else {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "super-ct-medalha-suprema.png";
        a.click();
        URL.revokeObjectURL(url);
      }
    } finally {
      setSalvando(false);
    }
  };

  useEffect(() => {
    if (fim) pararMusica();
    else if (somRef.current && heroiSel) {
      acordarAudio();
      iniciarMusica(fase, modo === "chefao");
    }
  }, [fim, heroiSel, fase, modo]);


  const escolherHeroi = (id: HeroiId) => {
    heroiRef.current = id;
    setHeroiSel(id);
    reiniciar();
  };


  return (
    <div className="min-h-screen bg-background pl-16 text-foreground">
      <main className="mx-auto max-w-screen-md px-4 py-8">
        <h1 className="font-display text-4xl uppercase leading-none tracking-tighter">
          SUPER <span className="text-primary italic">JOGO</span>
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Atravesse a academia, pegue a medalha de bronze suspensa no fim do percurso e encare o chefão da
          fase. Use o botão de poder para jogar bolas de tênis no chefão e junte 3 halteres para soltar a
          super bola.
        </p>

        <RankingJogo
          pontos={pontos}
          fase={fase}
          fim={fim}
          onApelidoSalvo={() => {
            palcoRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
          }}
        />

        <div className="mt-4 flex items-center justify-between font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
          <span>
            Fase <span className="text-primary">{fase}</span>/{TOTAL_FASES} • Pontos:{" "}
            <span className="text-primary">{pontos}</span>
          </span>
          <button
            type="button"
            onClick={reiniciar}
            className="inline-flex items-center gap-1 rounded-full border border-border px-3 py-1 text-primary"
          >
            <RotateCcw className="size-3" /> Reiniciar
          </button>
          <button
            type="button"
            onClick={() => {
              heroiRef.current = null;
              setHeroiSel(null);
            }}
            className="ml-2 inline-flex items-center gap-1 rounded-full border border-border px-3 py-1 text-primary"
          >
            Trocar herói
          </button>
          <button
            type="button"
            onClick={() => {
              const novo = !somRef.current;
              somRef.current = novo;
              setSomLigado(novo);
              if (novo) {
                acordarAudio();
                iniciarMusica(fase, modo === "chefao");

              } else {
                pararMusica();
              }
            }}
            aria-label={somLigado ? "Desligar som" : "Ligar som"}
            className="ml-2 inline-flex items-center gap-1 rounded-full border border-border px-3 py-1 text-primary"
          >
            {somLigado ? <Volume2 className="size-3" /> : <VolumeX className="size-3" />} Som
          </button>

        </div>

        {/* super poder */}
        <div className="mt-2 flex items-center gap-2 font-mono text-[9px] uppercase tracking-widest text-muted-foreground">
          <span>Super poder</span>
          {[0, 1, 2].map((i) => (
            <span
              key={`carga-${i}`}
              className="size-3 rounded-full border"
              style={{
                borderColor: i % 2 === 0 ? "#22c55e" : "#3b82f6",
                background: carga > i ? (i % 2 === 0 ? "#22c55e" : "#3b82f6") : "transparent",
                boxShadow: carga > i ? `0 0 8px ${i % 2 === 0 ? "#22c55e" : "#3b82f6"}` : undefined,
              }}
            />
          ))}
          {carga >= 3 && <span className="text-primary">Super bola pronta!</span>}
        </div>

        {/* barra de progresso / vida do chefão */}
        <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-card">
          {emChefao && chefao ? (
            <div
              className="h-full bg-[#f43f5e]"
              style={{ width: `${(chefao.hp / chefao.hpMax) * 100}%` }}
            />
          ) : (
            <div className="h-full bg-primary" style={{ width: `${progresso}%` }} />
          )}
        </div>

        <div
          ref={palcoRef}
          className="relative mt-3 overflow-hidden rounded-lg border border-border bg-black"
          style={{ height: ALTURA_CENA }}
        >
          {/* teto com neon (cor muda por fase) */}
          <div
            className="absolute inset-x-0 top-0 h-10 opacity-90"
            style={{ background: `linear-gradient(to bottom, ${tema.teto}, ${tema.teto2}, transparent)` }}
          />
          <div
            className="absolute inset-x-0 top-10 h-[2px]"
            style={{ background: tema.neon, boxShadow: `0 0 16px 6px ${tema.neon}88` }}
          />

          <div
            className="absolute inset-y-0 left-0"
            style={{ width: mundoAtual, transform: `translate3d(${-camera}px,0,0)` }}
          >
            <div className="absolute inset-x-0 bottom-0 top-10 bg-gradient-to-b from-[#141414] to-[#050505]" />

            {Array.from({ length: Math.ceil(mundoAtual / 400) }).map((_, i) => (
              <div
                key={`neon-${i}`}
                className="absolute w-[3px]"
                style={{
                  left: i * 400 + 120,
                  top: 46,
                  height: 110,
                  background: `${tema.neon}80`,
                  boxShadow: `0 0 12px 3px ${tema.neon}66`,
                }}
              />
            ))}

            <div className="absolute inset-x-0 bottom-0 h-10 border-t-2 border-primary/50 bg-[#0b0b0b]" />
            {Array.from({ length: Math.ceil(mundoAtual / 46) }).map((_, i) => (
              <div
                key={`tat-${i}`}
                className="absolute bottom-0 h-10 w-[46px] border-l border-white/5"
                style={{ left: i * 46 }}
              />
            ))}

            {lavaAtual.map((l, i) => (
              <div
                key={`lava-${i}`}
                className="absolute bottom-0 h-10 animate-pulse border-t-2 border-amber-300 bg-gradient-to-t from-[#7f1d1d] via-[#ea580c] to-[#fde047]"
                style={{ left: l.x, width: l.w, boxShadow: "0 0 22px 8px rgba(249,115,22,0.55)" }}
              />
            ))}

            {telasAtuais.map((t, i) => (
              <div key={`tela-${i}`} className="absolute" style={{ left: t.x, bottom: 40 }}>
                <div
                  className="rounded-sm border-2 border-cyan-300/80 bg-[linear-gradient(180deg,#0e7490,#082f49)]"
                  style={{ width: t.w, height: 34, boxShadow: "0 0 18px 5px rgba(34,211,238,0.5)" }}
                />
                <div className="mx-auto h-3 w-2 bg-[#3f3f46]" />
                <div className="mx-auto h-1 w-6 rounded bg-[#52525b]" />
              </div>
            ))}


            {barras.map((b, i) => (
              <div key={`b-${i}`}>
                <div
                  className="absolute h-2 rounded-full bg-[#d4d4d8] shadow-[0_0_10px_2px_rgba(255,255,255,0.25)]"
                  style={{ left: b.x, width: b.w, bottom: 40 + b.y }}
                />
                <div className="absolute w-[5px] bg-[#3f3f46]" style={{ left: b.x, bottom: 40, height: b.y }} />
                <div
                  className="absolute w-[5px] bg-[#3f3f46]"
                  style={{ left: b.x + b.w - 5, bottom: 40, height: b.y }}
                />
              </div>
            ))}

            {argolas.map((a, i) => (
              <div key={`a-${i}`}>
                <div
                  className="absolute w-[3px] bg-[#52525b]"
                  style={{ left: a.x - 1, bottom: 40 + a.y, height: ALTURA_CENA - 40 - a.y - 10 }}
                />
                <div
                  className="absolute size-6 rounded-full border-[4px] border-[#f59e0b] shadow-[0_0_10px_2px_rgba(245,158,11,0.5)]"
                  style={{ left: a.x - 12, bottom: 40 + a.y - 12 }}
                />
              </div>
            ))}

            {cordas.map((corda, i) => (
              <div
                key={`corda-${i}`}
                className="absolute w-3 rounded-b-full border-x-2 border-amber-200/70 bg-[repeating-linear-gradient(0deg,#92400e_0px,#92400e_5px,#f59e0b_6px,#f59e0b_9px)] shadow-[0_0_8px_rgba(245,158,11,0.35)]"
                style={{ left: corda.x - 6, bottom: 40 + corda.base, height: corda.topo - corda.base }}
              />
            ))}

            {cones.map((cx, i) => (conesPegos.includes(i) ? null : (
              <div key={`c-${i}`} className="absolute" style={{ left: cx, bottom: 38 }}>
                <div className="h-[3px] w-4 rounded-full bg-[#f97316]/70" />
                <div
                  className="mx-auto -mt-[11px] h-3 w-0 border-x-[5px] border-b-[12px] border-x-transparent border-b-[#fb923c]"
                  style={{ filter: "drop-shadow(0 0 4px rgba(249,115,22,0.6))" }}
                />
              </div>
            )))}

            {solidos.map((s, i) =>
              s.tipo === "caixa" ? (
                <div
                  key={`s-${i}`}
                  className="absolute rounded-sm border border-primary/50 bg-[#1c1917] shadow-[0_0_12px_rgba(255,120,0,0.25)]"
                  style={{ left: s.x, width: s.w, height: s.h, bottom: 40 }}
                >
                  <div className="absolute inset-x-0 top-0 h-1 bg-primary/70" />
                  <div className="absolute inset-2 rounded-sm border border-white/10" />
                  <div className="absolute inset-1 flex items-center justify-center">
                    <img
                      src={logoVazada}
                      alt=""
                      aria-hidden="true"
                      className="h-full w-full object-contain opacity-80"
                    />
                  </div>
                </div>
              ) : (
                <div
                  key={`s-${i}`}
                  className="absolute rounded-sm border border-white/20 bg-[#27272a]"
                  style={{ left: s.x, width: s.w, height: s.h, bottom: 40 }}
                >
                  <div className="absolute inset-x-0 top-0 h-[3px] bg-primary/60" />
                </div>
              ),
            )}

            {paredes.map((p, pi) => (
              <div
                key={`parede-${pi}`}
                className="absolute rounded-t-md border-2 border-white/15 bg-[#0a0a0a] shadow-[inset_0_0_24px_rgba(0,0,0,0.9)]"
                style={{ left: p.x, width: p.w, height: p.h, bottom: 40 }}
              >
                <div className="absolute inset-0 bg-[repeating-linear-gradient(90deg,rgba(255,255,255,0.06)_0px,rgba(255,255,255,0.06)_1px,transparent_1px,transparent_26px),repeating-linear-gradient(0deg,rgba(255,255,255,0.06)_0px,rgba(255,255,255,0.06)_1px,transparent_1px,transparent_26px)]" />
                {pinos[pi]!.map((pino, i) => (
                  <div
                    key={`pino-${pi}-${i}`}
                    className="absolute size-2 rounded-sm"
                    style={{
                      left: pino.x,
                      bottom: pino.y,
                      background: pino.cor,
                      boxShadow: `0 0 6px 1px ${pino.cor}`,
                    }}
                  />
                ))}
                <div className="absolute inset-x-0 top-0 h-[3px] bg-primary/70 shadow-[0_0_10px_2px_rgba(255,120,0,0.5)]" />
              </div>
            ))}

            {jumps.map((jump, i) => (
              <div
                key={`jump-${i}`}
                className="absolute rounded-t-full border-2 border-cyan-200 bg-cyan-500/25 shadow-[0_0_16px_rgba(34,211,238,0.75)]"
                style={{ left: jump.x, width: jump.w, height: jump.h, bottom: 40 }}
              >
                <div className="absolute inset-x-3 top-1 h-1 rounded-full bg-cyan-100" />
              </div>
            ))}

            {/* medalha de bronze suspensa no fim do percurso */}
            {!emChefao && (
              <div className="absolute" style={{ left: MEDALHA.x - 14, bottom: 40 + MEDALHA.y }}>
                <div
                  className="absolute left-1/2 w-[2px] -translate-x-1/2 bg-[#a16207]"
                  style={{ bottom: 26, height: ALTURA_CENA - 40 - MEDALHA.y - 36 }}
                />
                <div
                  className="flex size-8 items-center justify-center rounded-full border-2"
                  style={{
                    borderColor: "#fbbf24",
                    background: "linear-gradient(160deg,#d97706,#92400e)",
                    boxShadow: "0 0 16px 4px rgba(217,119,6,0.7)",
                  }}
                >
                  <Medal className="size-4 text-amber-100" />
                </div>
              </div>
            )}

            {/* corações extras suspensos bem alto */}
            {!emChefao &&
              coracoes.map((idx) => {
                const c = layAtual.coracoes[idx]!;
                return (
                  <div
                    key={`coracao-${idx}`}
                    aria-label="Coração extra"
                    className="absolute flex size-7 items-center justify-center rounded-full border-2 border-[#f43f5e] bg-[#f43f5e]/20 animate-pulse-slow"
                    style={{
                      left: c.x - 14,
                      bottom: 40 + c.y,
                      boxShadow: "0 0 14px 4px rgba(244,63,94,0.65)",
                    }}
                  >
                    <Heart className="size-4" style={{ color: "#f43f5e", fill: "#f43f5e" }} />
                  </div>
                );
              })}


            {/* herói (vira para o movimento; escala de costas e ergue os braços nos aparelhos) */}
            {(() => {
              const escalando = pendurado === "parede";
              const comBracosNoAlto = pendurado === "barra" || pendurado === "argola";
              const sombra = pendurado
                ? "drop-shadow(0 0 8px rgba(255,140,0,0.9))"
                : `drop-shadow(0 0 6px ${heroiAtual.cor})`;
              const caminhando = andando && !pendurado;
              const src = escalando
                ? heroiAtual.escala
                : comBracosNoAlto
                  ? heroiAtual.trepaTrepa
                : caminhando
                  ? heroiAtual.anda[passoFrame]
                  : heroiAtual.anda[0];
              const inclinacao = pulando && !escalando ? olhando * 14 : 0;
              /* cada batata/donut que encostou deixa o personagem um pouco maior */
              const gordoX = 1 + gorduraUi * 0.1;
              const gordoY = 1 + gorduraUi * 0.045;
              return (
                <div
                  className="absolute transition-[height] duration-100"
                  style={{
                    left: heroX,
                    width: HEROI_W,
                    height: alt,
                    bottom: 40 + heroY,
                    transform: escalando
                      ? `scale(${gordoX}, ${gordoY})`
                      : `scaleX(${olhando * gordoX}) scaleY(${gordoY}) rotate(${inclinacao}deg)`,
                    transformOrigin: "bottom center",
                  }}
                >
                  <img
                    src={src}
                    alt={`${heroiAtual.nome}, herói do Super CT`}
                    className={`absolute inset-0 size-full object-contain object-bottom${
                      escalando ? " animate-hero-climb-body" : caminhando ? " animate-hero-walk" : ""
                    }`}
                    style={{ filter: sombra }}
                  />
                </div>
              );
            })()}




            {/* vilões do percurso */}
            {inimigos.map((i) => (
              <img
                key={i.id}
                src={VILOES[i.vilao]!.img}
                alt={VILOES[i.vilao]!.nome}
                className="absolute h-9 w-9 object-contain"
                style={{
                  left: i.x,
                  bottom: 40 + i.y,
                  filter: `drop-shadow(0 0 8px ${VILOES[i.vilao]!.cor})`,
                }}
              />
            ))}

            {/* halteres verde e azul */}
            {halteres.map((h) => (
              <div key={`h-${h.id}`} className="absolute flex items-center" style={{ left: h.x, bottom: 40 + h.y }}>
                <span
                  className="size-3 rounded-sm"
                  style={{
                    background: h.cor === "verde" ? "#22c55e" : "#3b82f6",
                    boxShadow: `0 0 8px ${h.cor === "verde" ? "#22c55e" : "#3b82f6"}`,
                  }}
                />
                <span className="h-1 w-3 bg-zinc-300" />
                <span
                  className="size-3 rounded-sm"
                  style={{
                    background: h.cor === "verde" ? "#22c55e" : "#3b82f6",
                    boxShadow: `0 0 8px ${h.cor === "verde" ? "#22c55e" : "#3b82f6"}`,
                  }}
                />
              </div>
            ))}

            {/* bolas de tênis */}
            {bolas.map((b) => (
              <div
                key={`bola-${b.id}`}
                className="absolute rounded-full border border-white/70"
                style={{
                  left: b.x,
                  bottom: 40 + b.y,
                  width: b.super ? 26 : 12,
                  height: b.super ? 26 : 12,
                  background: b.super
                    ? "radial-gradient(circle at 30% 30%,#fef08a,#a3e635)"
                    : "radial-gradient(circle at 30% 30%,#e5ff70,#84cc16)",
                  boxShadow: b.super ? "0 0 18px 6px rgba(163,230,53,0.8)" : "0 0 8px rgba(163,230,53,0.6)",
                }}
              />
            ))}

            {/* chefão */}
            {emChefao && chefao && (
              <img
                src={vilaoFase.img}
                alt={`Chefão ${vilaoFase.nome}`}
                className="absolute object-contain"
                style={{
                  left: chefao.x,
                  bottom: 40 + chefao.y,
                  width: tamBoss,
                  height: tamBoss,
                  filter: `drop-shadow(0 0 14px ${vilaoFase.cor})`,
                }}
              />
            )}
            {emChefao && chefao && (
              <div
                className="absolute overflow-hidden rounded-full border bg-black/70"
                style={{
                  left: chefao.x,
                  bottom: 40 + chefao.y + tamBoss + 6,
                  width: tamBoss,
                  height: 6,
                  borderColor: `${vilaoFase.cor}80`,
                }}
              >
                <div
                  className="h-full rounded-full transition-[width] duration-150"
                  style={{
                    width: `${(chefao.hp / chefao.hpMax) * 100}%`,
                    background: `linear-gradient(90deg,${vilaoFase.cor},#fff8)`,
                    boxShadow: `0 0 10px ${vilaoFase.cor}`,
                  }}
                />
              </div>
            )}

            {/* ataques do chefão */}
            {tiros.map((t) => {
              const d = TAM_TIRO[t.tipo];
              const comum = {
                left: t.x,
                bottom: 40 + t.y,
                width: d.w,
                height: d.h,
              } as const;
              if (t.tipo === "celular")
                return (
                  <div
                    key={`t-${t.id}`}
                    className="absolute rounded-[3px] border border-white/60 bg-[#1e293b]"
                    style={{ ...comum, boxShadow: `0 0 10px ${t.cor}` }}
                  >
                    <span className="absolute inset-[2px] rounded-[2px] bg-[#38bdf8]/70" />
                  </div>
                );
              if (t.tipo === "batata")
                return (
                  <div key={`t-${t.id}`} className="absolute flex items-end gap-[2px]" style={comum}>
                    {[0, 1, 2, 3].map((i) => (
                      <span
                        key={i}
                        className="w-[3px] rounded-sm bg-[#fbbf24]"
                        style={{ height: 8 + i * 2, boxShadow: "0 0 6px #fbbf24" }}
                      />
                    ))}
                  </div>
                );
              if (t.tipo === "donut")
                return (
                  <div
                    key={`t-${t.id}`}
                    className="absolute rounded-full border-[6px]"
                    style={{ ...comum, borderColor: t.cor, boxShadow: `0 0 10px ${t.cor}` }}
                  />
                );
              if (t.tipo === "balao")
                return (
                  <div
                    key={`t-${t.id}`}
                    className="absolute flex items-center justify-center rounded-md border bg-white/90 font-mono text-[10px] font-bold text-black"
                    style={{ ...comum, borderColor: t.cor, boxShadow: `0 0 10px ${t.cor}` }}
                  >
                    @#!#!
                  </div>
                );
              if (t.tipo === "corda")
                return (
                  <div
                    key={`t-${t.id}`}
                    className="absolute rounded-full"
                    style={{
                      ...comum,
                      background: "repeating-linear-gradient(90deg,#d97706 0 6px,#92400e 6px 12px)",
                      boxShadow: "0 0 8px #d97706",
                    }}
                  />
                );
              return (
                <div
                  key={`t-${t.id}`}
                  className="absolute"
                  style={{
                    ...comum,
                    background: `conic-gradient(from 0deg, transparent, ${t.cor}, transparent, ${t.cor})`,
                    clipPath: "polygon(0 0,100% 0,72% 100%,28% 100%)",
                    borderRadius: "50% 50% 40% 40%",
                    boxShadow: `0 0 14px ${t.cor}`,
                    opacity: 0.9,
                  }}
                />
              );
            })}
          </div>

          {emChefao && (
            <span className="absolute right-2 top-12 rounded-full bg-black/70 px-2 py-1 font-mono text-[9px] uppercase tracking-widest text-primary">
              Chefão: {vilaoFase.nome}
            </span>
          )}

          <span className="absolute left-1/2 top-12 flex -translate-x-1/2 items-center gap-2 rounded-full bg-black/70 px-2 py-1">
            {emChefao ? (
              <>
                <span className="relative block h-2 w-24 overflow-hidden rounded-full border border-[#f43f5e]/40 bg-[#3f3f46]/70">
                  <span
                    className="absolute inset-y-0 left-0 rounded-full transition-[width] duration-200"
                    style={{
                      width: `${(Math.max(0, Math.min(vidas, VIDAS_CHEFAO)) / VIDAS_CHEFAO) * 100}%`,
                      background: "linear-gradient(90deg,#f43f5e,#fb7185)",
                      boxShadow: "0 0 8px #f43f5e",
                    }}
                  />
                </span>
                {estoqueCoracoes > 0 && (
                  <span className="flex items-center gap-1">
                    <Heart
                      className="size-3 shrink-0"
                      style={{ color: "#f43f5e", fill: "#f43f5e", filter: "drop-shadow(0 0 6px #f43f5e)" }}
                    />
                    <span className="font-mono text-[9px] tracking-widest text-[#fb7185]">{estoqueCoracoes}</span>
                  </span>
                )}
              </>
            ) : (
              <span className="flex items-center gap-1">
                <Heart
                  className="size-4 shrink-0"
                  style={{ color: "#f43f5e", fill: "#f43f5e", filter: "drop-shadow(0 0 6px #f43f5e)" }}
                />
                <span className="font-mono text-[10px] tracking-widest text-[#fb7185]">{vidas}</span>
              </span>
            )}




            {piscando && (
              <span className="ml-1 font-mono text-[8px] uppercase tracking-widest text-[#f43f5e]">
                Perdeu uma vida — voltou ao checkpoint!
              </span>
            )}
            {chocado && (
              <span className="ml-1 animate-pulse font-mono text-[8px] uppercase tracking-widest text-cyan-300">
                Choque! Preso na tela por 2s
              </span>
            )}

          </span>



          {pendurado && (
            <span className="absolute left-2 top-12 rounded-full bg-black/70 px-2 py-1 font-mono text-[9px] uppercase tracking-widest text-primary">
              {pendurado === "corda"
                ? "Subindo — pule para a próxima"
                : pendurado === "parede"
                  ? "Escalando — ▲ sobe, ▼ desce, setas movem"
                  : "Pendurado"}{" "}
              • ▼ 2x em 2s para soltar
            </span>
          )}

          {!heroiSel && (
            <div className="absolute inset-0 z-40 flex flex-col items-center justify-center gap-3 bg-black/90 px-4 text-center">
              <p className="font-display text-xl uppercase tracking-tight text-primary">Escolha seu herói</p>
              <div className="flex items-end gap-6">
                {HEROIS.map((h) => (
                  <button
                    key={h.id}
                    type="button"
                    onClick={() => escolherHeroi(h.id)}
                    className="flex flex-col items-center gap-1 rounded-lg border border-border px-3 py-2 active:scale-95"
                    style={{ boxShadow: `0 0 20px -8px ${h.cor}` }}
                  >
                    <img
                      src={h.img}
                      alt={`${h.nome} em pose de herói`}
                      className="h-24 w-auto object-contain"
                      style={{ filter: `drop-shadow(0 0 10px ${h.cor})` }}
                    />
                    <span
                      className="font-mono text-[10px] uppercase tracking-widest"
                      style={{ color: h.cor }}
                    >
                      {h.nome}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {modo === "intervalo" && !fim && (

            <div className="absolute inset-0 z-40 flex flex-col items-center justify-center gap-2 bg-black/85 px-6 text-center">
              <Medal className="size-8 text-amber-400" />
              <p className="font-display text-xl uppercase tracking-tight text-primary">
                Medalha de bronze da fase {fase}!
              </p>
              <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                Pontuação: {pontos}
              </p>
              <p className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">
                Agora o chefão: {vilaoFase.nome} — {vilaoFase.poder}
              </p>
              <button
                type="button"
                onClick={iniciarChefao}
                className="mt-1 rounded-full border border-primary bg-primary/15 px-4 py-2 font-mono text-[10px] uppercase tracking-widest text-primary"
              >
                Encarar o chefão
              </button>
            </div>
          )}

          {modo === "fase-vencida" && !fim && (
            <div className="absolute inset-0 z-40 flex flex-col items-center justify-center gap-2 bg-black/85 px-6 text-center">
              <p className="font-display text-xl uppercase tracking-tight text-primary">
                {vilaoFase.nome} derrotado!
              </p>
              <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                Pontuação: {pontos} • Fase {fase} concluída
              </p>
              <button
                type="button"
                onClick={() => iniciarCorrida(faseRef.current + 1)}
                className="mt-1 rounded-full border border-primary bg-primary/15 px-4 py-2 font-mono text-[10px] uppercase tracking-widest text-primary"
              >
                Ir para a fase {fase + 1}
              </button>
            </div>
          )}

          {fim && venceu && (
            <div className="absolute inset-0 z-50 flex items-center justify-center bg-background/80 px-3 py-4 backdrop-blur-md">
              <div className="flex w-full max-w-sm flex-col items-center gap-2">
                <div
                  ref={printRef}
                  className="w-full rounded-2xl border-2 bg-[#0b0b0f] px-4 py-4 text-center animate-pulse-slow"
                  style={{ borderColor: heroiAtual.cor, boxShadow: `0 0 24px ${heroiAtual.cor}66` }}
                >
                  <div className="mx-auto w-fit origin-bottom animate-erguer-medalha-uma">
                    <img
                      src={heroiAtual.medalha}
                      alt={`${heroiAtual.nome} segurando a medalha suprema do Super CT`}
                      className="mx-auto h-32 w-auto select-none animate-brilho-medalha"
                    />
                  </div>
                  <div className="overflow-hidden">
                    <p
                      className="mt-2 font-display text-xl uppercase leading-tight tracking-tight animate-titulo-desliza"
                      style={{ color: heroiAtual.cor, textShadow: `0 0 16px ${heroiAtual.cor}` }}
                    >
                      Yeeees! Você ganhou a medalha suprema!
                    </p>
                  </div>
                  <p className="mt-2 font-body text-[13px] leading-snug text-foreground animate-texto-surge">
                    Você conseguiu atravessar os maiores desafios da nossa academia e derrotar todos
                    os terríveis vilões! Parabéns!
                  </p>
                  <p className="mt-3 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                    {heroiAtual.nome} • {pontos} pontos • Super CT
                  </p>
                </div>
                <div className="flex flex-wrap items-center justify-center gap-2">
                  <button
                    type="button"
                    onClick={salvarPrint}
                    className="rounded-full border border-primary bg-primary/15 px-4 py-2 font-mono text-[10px] uppercase tracking-widest text-primary"
                  >
                    {salvando ? "Gerando imagem..." : "Salvar / compartilhar print"}
                  </button>
                  <button
                    type="button"
                    onClick={reiniciar}
                    className="rounded-full border border-border px-4 py-2 font-mono text-[10px] uppercase tracking-widest text-muted-foreground"
                  >
                    Jogar de novo
                  </button>
                </div>
              </div>
            </div>
          )}

          {fim && !venceu && (
            <div className="absolute inset-0 z-40 flex flex-col items-center justify-center gap-2 overflow-hidden bg-black/85 px-6 text-center">
              {!venceu && (
                <img
                  src={VILOES[2]!.img}
                  alt="Choralina"
                  className="pointer-events-none absolute bottom-6 left-1/2 h-40 w-auto animate-boss-charge select-none"
                  style={{ filter: `drop-shadow(0 0 24px ${VILOES[2]!.cor})` }}
                />
              )}
              <p
                className={`relative font-display text-2xl uppercase tracking-tight text-primary ${venceu ? "" : "animate-game-over"}`}
              >
                {venceu
                  ? "Você venceu todos os chefões!"
                  : derrotado !== null
                    ? `Game Over — ${VILOES[derrotado]!.nome} te pegou!`
                    : "Game Over"}
              </p>
              <p className="relative font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                Pontos: {pontos} • Fase {fase}
              </p>

              <button
                type="button"
                onClick={reiniciar}
                className="relative mt-1 rounded-full border border-primary bg-primary/15 px-4 py-2 font-mono text-[10px] uppercase tracking-widest text-primary"
              >
                Jogar de novo
              </button>
            </div>
          )}
        </div>

        <div className="relative z-30 mt-1 flex items-end justify-between gap-3 landscape:-mt-[104px] landscape:px-2">
          <Joystick
            onChange={(v) => {
              dir.current = v.x;
              dirY.current = v.y;
              if (v.x !== 0 || v.y !== 0) acordarSom();
            }}
          />
          <div className="flex gap-2">
            <ControlButton onStart={pular} onEnd={pararSubida} label="Pular baixo (1 toque) ou alto (2 toques rápidos)">
              <ChevronUp className="size-6" />
            </ControlButton>
            <ControlButton onStart={atirar} label="Atirar bola de tênis no chefão">
              <Zap className="size-6" />
            </ControlButton>
          </div>
        </div>

        <div className="mt-4 rounded-lg border border-border bg-card/50 p-3 font-mono text-[9px] uppercase leading-relaxed tracking-widest text-muted-foreground">
          <p>
            <span className="text-primary">Joystick</span> move; segure para baixo para agachar (na parede, cima/baixo sobe e desce) •{" "}
            <span className="text-primary">▲</span> pula baixo, <span className="text-primary">▲▲</span> rápido pula alto •{" "}
            <span className="text-primary">⚡</span> atira o poder para o lado do chefão •{" "}
            <span className="text-primary">3 halteres</span> = super bola •{" "}
            <span className="text-primary">2 corações</span> de cada fase dão vida e 10 pontos •{" "}
            <span className="text-primary">cones</span> valem 5 pontos, medalha 30 e chefão derrotado 50 •{" "}
            ao perder uma vida você volta ao <span className="text-primary">checkpoint</span> da fase
          </p>
        </div>

      </main>
    </div>
  );
}

function Joystick({ onChange }: { onChange: (v: { x: number; y: number }) => void }) {
  const baseRef = useRef<HTMLDivElement>(null);
  const [knob, setKnob] = useState({ x: 0, y: 0 });
  const dragging = useRef(false);
  const pointerId = useRef<number | null>(null);
  const center = useRef({ x: 0, y: 0 });
  const maxR = 32;

  const update = (clientX: number, clientY: number) => {
    const dx = clientX - center.current.x;
    const dy = clientY - center.current.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const r = Math.min(dist, maxR);
    const angle = Math.atan2(dy, dx);
    const kx = Math.cos(angle) * r;
    const ky = Math.sin(angle) * r;
    setKnob({ x: kx, y: ky });
    onChange({
      x: Math.max(-1, Math.min(1, dx / maxR)),
      y: Math.max(-1, Math.min(1, dy / maxR)),
    });
  };

  const end = () => {
    dragging.current = false;
    pointerId.current = null;
    setKnob({ x: 0, y: 0 });
    onChange({ x: 0, y: 0 });
  };

  return (
    <div
      ref={baseRef}
      className="relative flex h-28 w-28 select-none touch-none items-center justify-center rounded-full border-2 border-border bg-card/80 shadow-inner"
      onPointerDown={(e) => {
        if (!baseRef.current) return;
        const rect = baseRef.current.getBoundingClientRect();
        center.current = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
        dragging.current = true;
        pointerId.current = e.pointerId;
        baseRef.current.setPointerCapture(e.pointerId);
        update(e.clientX, e.clientY);
      }}
      onPointerMove={(e) => {
        if (!dragging.current || e.pointerId !== pointerId.current) return;
        update(e.clientX, e.clientY);
      }}
      onPointerUp={(e) => {
        if (e.pointerId !== pointerId.current) return;
        if (baseRef.current) baseRef.current.releasePointerCapture(e.pointerId);
        end();
      }}
      onPointerLeave={(e) => {
        if (e.pointerId !== pointerId.current) return;
        if (baseRef.current) baseRef.current.releasePointerCapture(e.pointerId);
        end();
      }}
      onPointerCancel={(e) => {
        if (e.pointerId !== pointerId.current) return;
        end();
      }}
    >
      <div
        className="pointer-events-none size-12 rounded-full border border-primary bg-primary shadow-[0_0_14px_var(--primary)]"
        style={{ transform: `translate(${knob.x}px, ${knob.y}px)` }}
      />
    </div>
  );
}

function ControlButton({
  children,
  onStart,
  onEnd,
  label,
}: {
  children: React.ReactNode;
  onStart: () => void;
  onEnd?: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onPointerDown={onStart}
      onPointerUp={onEnd}
      onPointerLeave={onEnd}
      onPointerCancel={onEnd}
      className="flex size-12 select-none touch-none items-center justify-center rounded-full border border-border bg-card text-primary active:scale-95 active:bg-primary/20"
    >
      {children}
    </button>
  );
}
