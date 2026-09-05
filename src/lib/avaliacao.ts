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
  { chave: "coordenacao_motora", rotulo: "Coordenação motora" },
  { chave: "forca_resistencia", rotulo: "Força e resistência" },
  { chave: "velocidade_agilidade", rotulo: "Velocidade e agilidade" },
  { chave: "respeito_empatia", rotulo: "Respeito e empatia" },
  { chave: "disciplina", rotulo: "Disciplina" },
  { chave: "comportamento", rotulo: "Comportamento" },
  { chave: "execucao_exercicios", rotulo: "Execução dos exercícios" },
];

export const CORES: { cor: Cor; rotulo: string; classe: string }[] = [
  { cor: "vermelho", rotulo: "Ruim", classe: "bg-red-500" },
  { cor: "amarelo", rotulo: "Mediana", classe: "bg-yellow-400" },
  { cor: "verde", rotulo: "Ótimo", classe: "bg-green-500" },
];

export function classeCor(cor: string) {
  return CORES.find((c) => c.cor === cor)?.classe ?? "bg-muted";
}

export function rotuloCor(cor: string) {
  return CORES.find((c) => c.cor === cor)?.rotulo ?? "—";
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

export type Avaliacao = {
  id: string;
  aluno_id: string;
  user_id: string;
  referencia: string;
  observacoes: string | null;
} & Record<CriterioChave, string>;
