import { marcacoesDoAno } from "@/lib/feriados";

export type Presenca = { id: string; aluno_id: string; user_id: string; dia: string };

export type DiaAula = {
  /** YYYY-MM-DD */
  dia: string;
  /** número do dia no mês */
  numero: number;
  /** S, T, Q, Q, S */
  semana: string;
  feriado: string | null;
};

const LETRA_SEMANA = ["D", "S", "T", "Q", "Q", "S", "S"] as const;

export function isoDia(ano: number, mes: number, dia: number) {
  return `${ano}-${String(mes).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;
}

/** Dias de segunda a sexta do mês, marcando os feriados. */
export function diasDeAula(ano: number, mes: number): DiaAula[] {
  const marcacoes = marcacoesDoAno(ano);
  const feriados = new Map(
    marcacoes.filter((m) => m.tipo !== "emenda").map((m) => [m.data, m.nome] as const),
  );
  const total = new Date(ano, mes, 0).getDate();
  const lista: DiaAula[] = [];
  for (let d = 1; d <= total; d += 1) {
    const data = new Date(ano, mes - 1, d);
    const semana = data.getDay();
    if (semana === 0 || semana === 6) continue;
    const dia = isoDia(ano, mes, d);
    lista.push({
      dia,
      numero: d,
      semana: LETRA_SEMANA[semana] ?? "",
      feriado: feriados.get(dia) ?? null,
    });
  }
  return lista;
}

export function mesAtual() {
  const d = new Date();
  return { ano: d.getFullYear(), mes: d.getMonth() + 1 };
}

export function hojeDia() {
  const d = new Date();
  return isoDia(d.getFullYear(), d.getMonth() + 1, d.getDate());
}
