import type { Mensalidade } from "@/lib/mensalidade";
import type { PlanoContrato } from "@/lib/planoContrato";

export type StatusPagamento = "pago" | "pago com atraso" | "em atraso" | "a vencer";

/** Primeiro mês com histórico de pagamentos no sistema. */
export const MES_INICIAL = "2026-09-01";

/** Data de vencimento (AAAA-MM-DD) no mês de referência; dia 10 quando o contrato não diz. */
export function vencimentoIso(ref: string, vencimento: string | null | undefined) {
  const dia = Number(String(vencimento ?? "").replace(/\D+/g, "")) || 10;
  const [ano, mm] = ref.split("-").map(Number);
  const ultimo = new Date(ano ?? 2026, mm ?? 1, 0).getDate();
  return `${ref.slice(0, 8)}${String(Math.min(dia, ultimo)).padStart(2, "0")}`;
}

export function statusPagamento(m: Mensalidade | undefined, venc: string, hoje: string): StatusPagamento {
  if (m?.pago) return m.pago_em && m.pago_em > venc ? "pago com atraso" : "pago";
  return hoje > venc ? "em atraso" : "a vencer";
}

export function diasEntre(de: string, ate: string) {
  const a = Date.UTC(+de.slice(0, 4), +de.slice(5, 7) - 1, +de.slice(8, 10));
  const b = Date.UTC(+ate.slice(0, 4), +ate.slice(5, 7) - 1, +ate.slice(8, 10));
  return Math.round((b - a) / 86_400_000);
}

export type Atraso = { alunoId: string; referencia: string; venc: string; dias: number; valor: number };

/** Mensalidades vencidas e não pagas desde MES_INICIAL até o mês atual. */
export function atrasosDoAluno(
  alunoId: string,
  mensalidades: Mensalidade[],
  plano: PlanoContrato | undefined,
  mesAtual: string,
  hoje: string,
): Atraso[] {
  const lista: Atraso[] = [];
  const [ai, mi] = MES_INICIAL.split("-").map(Number);
  const [af, mf] = mesAtual.split("-").map(Number);
  for (let i = 0; ; i++) {
    const d = new Date(ai!, mi! - 1 + i, 1);
    if (d.getFullYear() * 12 + d.getMonth() > af! * 12 + mf! - 1) break;
    const ref = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
    const m = mensalidades.find((x) => x.aluno_id === alunoId && x.referencia === ref);
    if (m && !m.ativo) continue;
    if (!m && !plano) continue;
    if (!m && plano?.inicio && plano.inicio.slice(0, 7) > ref.slice(0, 7)) continue;
    const venc = vencimentoIso(ref, plano?.vencimento);
    if (statusPagamento(m, venc, hoje) !== "em atraso") continue;
    lista.push({
      alunoId,
      referencia: ref,
      venc,
      dias: diasEntre(venc, hoje),
      valor: Number(m?.valor ?? plano?.valor ?? 0),
    });
  }
  return lista;
}

/** Link de WhatsApp com mensagem de cobrança pronta (DDD 35 quando faltar). */
export function linkCobranca(telefone: string, responsavel: string, aluno: string, meses: string[], total: string) {
  let num = telefone.replace(/\D+/g, "");
  if (num.length === 10 || num.length === 11) num = `55${num}`;
  else if (num.length === 8 || num.length === 9) num = `5535${num}`;
  const primeiro = responsavel.trim().split(/\s+/)[0] || "";
  const texto =
    `Olá${primeiro ? `, ${primeiro}` : ""}! Aqui é do Super CT 💪 ` +
    `Consta em aberto a mensalidade de ${aluno} (${meses.join(", ")}), total ${total}. ` +
    `Você pode pagar pelo app em osuperct.com, na sua conta, no botão PAGAR. Se já pagou, desconsidere. Obrigado!`;
  return `https://wa.me/${num}?text=${encodeURIComponent(texto)}`;
}
