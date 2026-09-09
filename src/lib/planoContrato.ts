/** Leitura dos dados de pagamento vindos do contrato assinado pelo responsável. */

export type FormaContrato = "Pix" | "Dinheiro" | "Cartão" | "Cartão Recorrente (link)" | "Não informado";

export type PlanoContrato = {
  alunoId: string;
  /** Texto original do plano escolhido no contrato. */
  planoTexto: string;
  forma: FormaContrato;
  /** Valor de cada parcela / mensalidade. */
  valor: number | null;
  /** Número de parcelas (1 = mensal contínuo). */
  parcelas: number;
  /** Dia de vencimento escolhido. */
  vencimento: string | null;
  /** Data de adesão (yyyy-MM-dd) quando informada. */
  inicio: string | null;
};

/** Normaliza o texto da forma de pagamento (aceita variações e o antigo "Pix / dinheiro"). */
export function normalizarForma(texto: string): FormaContrato {
  const t = texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim();
  if (!t) return "Não informado";
  if (t.includes("recorrente")) return "Cartão Recorrente (link)";
  if (t.includes("cart")) return "Cartão";
  if (t.includes("pix")) return "Pix";
  if (t.includes("dinheiro")) return "Dinheiro";
  return "Não informado";
}

function numeroBr(texto: string) {
  const limpo = texto.replace(/\./g, "").replace(",", ".");
  const n = Number(limpo);
  return Number.isFinite(n) ? n : null;
}

/** "Plano anual 12x de R$140,00" -> { parcelas: 12, valor: 140 } */
export function lerPlano(planoTexto: string) {
  const parcelasMatch = planoTexto.match(/(\d+)\s*x/i);
  const parcelas = parcelasMatch ? Number(parcelasMatch[1]) : 1;
  // Sem "R$" também vale: "120,00", "Outro valor — 120", "12x de 140,00".
  const semParcelas = planoTexto.replace(/(\d+)\s*x/gi, " ");
  const valorMatch =
    planoTexto.match(/R\$\s*([\d.]+,\d{2}|[\d.]+)/i) ??
    semParcelas.match(/([\d.]+,\d{2})/) ??
    semParcelas.match(/(\d[\d.]*)/);
  return {
    parcelas,
    valor: valorMatch ? numeroBr(valorMatch[1]!) : null,
  };
}

/** Converte a data de início do contrato (dd/MM/yyyy ou ISO) em ISO. */
export function inicioIso(texto: string | undefined) {
  if (!texto) return null;
  const br = texto.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (br) return `${br[3]}-${br[2]}-${br[1]}`;
  if (/^\d{4}-\d{2}-\d{2}/.test(texto)) return texto.slice(0, 10);
  return null;
}

export function planoDoContrato(alunoId: string, dados: Record<string, unknown>): PlanoContrato {
  const planoTexto = String(dados["valor"] ?? "").trim();
  const { parcelas, valor } = lerPlano(planoTexto);
  const forma = normalizarForma(formaTexto);
  return {
    alunoId,
    planoTexto,
    forma,
    valor,
    parcelas,
    vencimento: String(dados["vencimento"] ?? "").trim() || null,
    inicio: inicioIso(String(dados["data_inicio"] ?? "").trim() || undefined),
  };
}

/** Diferença em meses entre duas referências (yyyy-MM-01). */
export function diffMeses(de: string, ate: string) {
  const [a1, m1] = de.split("-").map(Number);
  const [a2, m2] = ate.split("-").map(Number);
  return (a2! - a1!) * 12 + (m2! - m1!);
}

/** Referência do mês (yyyy-MM-01) somando meses. */
export function refSomando(referencia: string, meses: number) {
  const [ano, mes] = referencia.split("-").map(Number);
  const d = new Date(ano!, mes! - 1 + meses, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}

export type ParcelaPlano = {
  /** Número da parcela nesse mês (1-based). Null quando o plano é mensal sem prazo. */
  numero: number | null;
  /** Total de parcelas do plano. */
  total: number;
  /** Mês da última parcela (yyyy-MM-01), quando o plano tem prazo. */
  fim: string | null;
  /** Plano já encerrado nesse mês. */
  encerrado: boolean;
};

/** Posição do mês de referência dentro do plano contratado. */
export function parcelaNoMes(plano: PlanoContrato, referencia: string): ParcelaPlano {
  if (plano.parcelas <= 1 || !plano.inicio)
    return { numero: null, total: plano.parcelas, fim: null, encerrado: false };
  const refInicio = `${plano.inicio.slice(0, 7)}-01`;
  const numero = diffMeses(refInicio, referencia) + 1;
  const fim = refSomando(refInicio, plano.parcelas - 1);
  return {
    numero: numero >= 1 ? numero : null,
    total: plano.parcelas,
    fim,
    encerrado: numero > plano.parcelas,
  };
}

/** Data de vencimento formatada para o mês de referência. */
export function vencimentoNoMes(vencimento: string | null, referencia: string) {
  if (!vencimento) return null;
  const dia = String(vencimento).replace(/\D+/g, "");
  if (!dia) return null;
  const [ano, mes] = referencia.split("-");
  return `${dia.padStart(2, "0")}/${mes}/${ano}`;
}
