export type ProvaTaf = "polichinelo" | "sprawl" | "corda" | "argola" | "trepa" | "parede";

export const PROVAS_TAF: { chave: ProvaTaf; rotulo: string; max: number; ouro: number; unidade: string }[] = [
  { chave: "polichinelo", rotulo: "Polichinelo", max: 100, ouro: 100, unidade: "repetições" },
  { chave: "sprawl", rotulo: "Sprawl", max: 50, ouro: 50, unidade: "repetições" },
  { chave: "corda", rotulo: "Corda", max: 3, ouro: 1, unidade: "subidas" },
  { chave: "argola", rotulo: "Argola", max: 1, ouro: 1, unidade: "cambalhota" },
  { chave: "trepa", rotulo: "Trepa-trepa", max: 42, ouro: 2, unidade: "passadas" },
  { chave: "parede", rotulo: "Parede de escalada", max: 1, ouro: 1, unidade: "subida" },
];

export const MAX_VOLTAS = 10;

export type Corrida = { tempo_ms: number; voltas: number };
export type DadosTaf = { [K in ProvaTaf]?: number | undefined } & { corrida?: Corrida | undefined };

export type RegistroSuper = {
  id: string;
  aluno_id: string;
  tipo: "taf" | "corrida";
  ano: number;
  dados: unknown;
  created_at: string;
};

export function limitar(valor: number, max: number, min = 0) {
  if (!Number.isFinite(valor)) return min;
  return Math.min(max, Math.max(min, Math.round(valor)));
}

export function ganhouOuro(chave: ProvaTaf, valor: number | undefined) {
  const p = PROVAS_TAF.find((x) => x.chave === chave);
  return !!p && typeof valor === "number" && valor >= p.ouro;
}

export function trofeusTaf(d: DadosTaf) {
  return PROVAS_TAF.filter((p) => ganhouOuro(p.chave, d[p.chave])).length;
}

export function formatarTempo(ms: number) {
  const total = Math.max(0, Math.floor(ms / 100));
  const dec = total % 10;
  const s = Math.floor(total / 10);
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}.${dec}`;
}

export function lerCorrida(d: unknown): Corrida | null {
  const c = d as Partial<Corrida> | null;
  if (!c || typeof c.tempo_ms !== "number") return null;
  return { tempo_ms: c.tempo_ms, voltas: limitar(c.voltas ?? 1, MAX_VOLTAS, 1) };
}
