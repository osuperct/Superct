import { describe, expect, it } from "vitest";
import { atrasosDoAluno, linkCobranca, statusPagamento, vencimentoIso } from "../src/lib/financeiro";

const plano = { alunoId: "a", planoTexto: "Mensal", forma: "Pix", valor: 150, parcelas: 1, vencimento: "15", inicio: null } as never;

describe("financeiro", () => {
  it("vencimento padrão é dia 10", () => {
    expect(vencimentoIso("2026-10-01", null)).toBe("2026-10-10");
  });
  it("pago depois do vencimento é pago com atraso", () => {
    expect(statusPagamento({ pago: true, pago_em: "2026-10-16" } as never, "2026-10-15", "2026-11-01")).toBe("pago com atraso");
  });
  it("conta meses em aberto desde setembro com dias de atraso", () => {
    const pagos = [{ aluno_id: "a", referencia: "2026-09-01", ativo: true, pago: true, pago_em: "2026-09-10", valor: 150 }] as never[];
    const r = atrasosDoAluno("a", pagos, plano, "2026-11-01", "2026-11-06");
    expect(r.map((x) => x.referencia)).toEqual(["2026-10-01"]);
    expect(r[0]!.dias).toBe(22);
  });
  it("cobrança usa DDI 55", () => {
    expect(linkCobranca("(35) 98822-3596", "Ana", "Lucas", ["Outubro"], "R$ 150")).toContain("wa.me/5535988223596");
  });
});
