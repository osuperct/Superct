export type TipoMarcacao = "nacional" | "local" | "emenda";

export type Marcacao = {
  /** YYYY-MM-DD */
  data: string;
  nome: string;
  tipo: TipoMarcacao;
};

function iso(ano: number, mes: number, dia: number) {
  return `${ano}-${String(mes).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;
}

/** Domingo de Páscoa (algoritmo de Meeus/Jones/Butcher). */
function pascoa(ano: number): Date {
  const a = ano % 19;
  const b = Math.floor(ano / 100);
  const c = ano % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const mes = Math.floor((h + l - 7 * m + 114) / 31);
  const dia = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(Date.UTC(ano, mes - 1, dia));
}

function somaDias(base: Date, dias: number) {
  const d = new Date(base.getTime());
  d.setUTCDate(d.getUTCDate() + dias);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(
    d.getUTCDate(),
  ).padStart(2, "0")}`;
}

/** Feriados nacionais + locais de São Sebastião do Paraíso (MG) e as emendas. */
export function marcacoesDoAno(ano: number): Marcacao[] {
  const p = pascoa(ano);

  const base: Marcacao[] = [
    { data: iso(ano, 1, 1), nome: "Confraternização Universal", tipo: "nacional" },
    { data: iso(ano, 1, 20), nome: "São Sebastião — padroeiro da cidade", tipo: "local" },
    { data: somaDias(p, -48), nome: "Carnaval (segunda)", tipo: "nacional" },
    { data: somaDias(p, -47), nome: "Carnaval", tipo: "nacional" },
    { data: somaDias(p, -46), nome: "Quarta-feira de Cinzas (até o meio-dia)", tipo: "nacional" },
    { data: somaDias(p, -2), nome: "Sexta-feira Santa", tipo: "nacional" },
    { data: iso(ano, 4, 21), nome: "Tiradentes", tipo: "nacional" },
    { data: iso(ano, 5, 1), nome: "Dia do Trabalho", tipo: "nacional" },
    { data: somaDias(p, 60), nome: "Corpus Christi", tipo: "nacional" },
    { data: iso(ano, 9, 7), nome: "Independência do Brasil", tipo: "nacional" },
    { data: iso(ano, 10, 12), nome: "Nossa Senhora Aparecida", tipo: "nacional" },
    { data: iso(ano, 11, 2), nome: "Finados", tipo: "nacional" },
    { data: iso(ano, 11, 15), nome: "Proclamação da República", tipo: "nacional" },
    { data: iso(ano, 11, 20), nome: "Dia da Consciência Negra", tipo: "nacional" },
    { data: iso(ano, 12, 25), nome: "Natal", tipo: "nacional" },
  ];

  const mapa = new Map(base.map((m) => [m.data, m]));

  // Feriado na terça ou na sexta: o dia anterior entra como emenda.
  for (const m of base) {
    const dia = new Date(`${m.data}T12:00:00Z`).getUTCDay();
    if (dia !== 2 && dia !== 5) continue;
    const anterior = somaDias(new Date(`${m.data}T12:00:00Z`), -1);
    if (mapa.has(anterior)) continue;
    mapa.set(anterior, { data: anterior, nome: `Emenda de ${m.nome}`, tipo: "emenda" });
  }

  return [...mapa.values()].sort((a, b) => a.data.localeCompare(b.data));
}

export const MESES = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
] as const;

export const DIAS_SEMANA = ["D", "S", "T", "Q", "Q", "S", "S"] as const;

export function diaExtenso(dataIso: string) {
  const d = new Date(`${dataIso}T12:00:00Z`);
  const semana = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];
  return `${d.getUTCDate()} de ${MESES[d.getUTCMonth()]} (${semana[d.getUTCDay()]})`;
}
