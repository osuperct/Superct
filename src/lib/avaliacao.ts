export type Cor = "vermelho" | "amarelo" | "verde";

export type CriterioChave =
  | "coordenacao_motora"
  | "forca_resistencia"
  | "velocidade_agilidade"
  | "respeito_empatia"
  | "disciplina"
  | "comportamento"
  | "execucao_exercicios";

export const CRITERIOS: { chave: CriterioChave; rotulo: string }[] = [
  { chave: "forca_resistencia", rotulo: "Força e resistência" },
  { chave: "velocidade_agilidade", rotulo: "Velocidade e agilidade" },
  { chave: "coordenacao_motora", rotulo: "Coordenação motora" },
  { chave: "execucao_exercicios", rotulo: "Execução dos exercícios" },
  { chave: "comportamento", rotulo: "Comportamento" },
  { chave: "disciplina", rotulo: "Disciplina" },
  { chave: "respeito_empatia", rotulo: "Respeito e empatia" },
];

export const CORES: { cor: Cor; rotulo: string; classe: string }[] = [
  { cor: "vermelho", rotulo: "Ruim", classe: "bg-red-500" },
  { cor: "amarelo", rotulo: "Mediana", classe: "bg-yellow-400" },
  { cor: "verde", rotulo: "Ótimo", classe: "bg-green-500" },
];

/** Faixas por estrelas: 1 a 3 ruim, 4 a 6 mediana, 7 a 10 ótimo. */
export const FAIXAS = [
  { ate: 3, rotulo: "Ruim", cor: "vermelho" as Cor, classe: "text-red-400" },
  { ate: 6, rotulo: "Mediana", cor: "amarelo" as Cor, classe: "text-yellow-400" },
  { ate: 10, rotulo: "Ótimo", cor: "verde" as Cor, classe: "text-green-400" },
];

export const TOTAL_ESTRELAS = 10;

export type Notas = Partial<Record<CriterioChave, number>>;

export function faixaDaNota(nota: number) {
  return FAIXAS.find((f) => nota <= f.ate) ?? FAIXAS[FAIXAS.length - 1]!;
}

export function classeCor(cor: string) {
  return CORES.find((c) => c.cor === cor)?.classe ?? "bg-muted";
}

export function rotuloCor(cor: string) {
  return CORES.find((c) => c.cor === cor)?.rotulo ?? "—";
}

/** Média das estrelas (0 quando não há notas). */
export function mediaNotas(notas: Notas) {
  const valores = CRITERIOS.map((c) => notas[c.chave]).filter((v): v is number => typeof v === "number");
  if (valores.length === 0) return 0;
  return Math.round((valores.reduce((a, b) => a + b, 0) / valores.length) * 10) / 10;
}

/** Aspecto com a menor nota — vira a meta do próximo mês. */
export function metaDeNotas(notas: Notas) {
  let melhor: { rotulo: string; nota: number } | null = null;
  for (const c of CRITERIOS) {
    const n = notas[c.chave];
    if (typeof n !== "number") continue;
    if (!melhor || n < melhor.nota) melhor = { rotulo: c.rotulo, nota: n };
  }
  return melhor?.rotulo ?? null;
}

/** Notas em formato seguro, aceitando o jsonb vindo do banco. */
export function lerNotas(bruto: unknown): Notas {
  const notas: Notas = {};
  if (!bruto || typeof bruto !== "object") return notas;
  const obj = bruto as Record<string, unknown>;
  for (const c of CRITERIOS) {
    const v = Number(obj[c.chave]);
    if (Number.isFinite(v) && v > 0) notas[c.chave] = Math.min(TOTAL_ESTRELAS, Math.max(1, Math.round(v)));
  }
  return notas;
}

/** Último dia do mês vigente, em formato ISO (yyyy-MM-dd). */
export function referenciaMesAtual(base = new Date()) {
  const fim = new Date(base.getFullYear(), base.getMonth() + 1, 0);
  const mes = String(fim.getMonth() + 1).padStart(2, "0");
  return `${fim.getFullYear()}-${mes}-${String(fim.getDate()).padStart(2, "0")}`;
}

export function mesExtenso(referencia: string) {
  const [ano, mes] = referencia.split("-");
  const data = new Date(Number(ano), Number(mes) - 1, 1);
  const texto = data.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

export function mesCurto(referencia: string) {
  const [ano, mes] = referencia.split("-");
  const data = new Date(Number(ano), Number(mes) - 1, 1);
  return data.toLocaleDateString("pt-BR", { month: "short" }).replace(".", "") + "/" + String(ano).slice(2);
}

export type Avaliacao = {
  id: string;
  aluno_id: string;
  user_id: string;
  referencia: string;
  observacoes: string | null;
  notas?: unknown;
  meta?: string | null;
  conquistas?: string[] | null;
  publicada?: boolean | null;
  publicada_em?: string | null;
} & Record<CriterioChave, string>;
