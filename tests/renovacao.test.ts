import { describe, expect, it } from "vitest";
import { DIAS_AVISO_RENOVACAO, fimDoContrato, mesesDoPlano, somarMeses } from "@/lib/renovacao";

describe("renovação de planos", () => {
  it("semestral dura 6 meses", () => expect(mesesDoPlano("Plano semestral 6x de R$150,00")).toBe(6));
  it("anual dura 12 meses", () => expect(mesesDoPlano("Plano anual 12x de R$140,00")).toBe(12));
  it("mensal não entra no aviso", () => expect(mesesDoPlano("Mensal R$160,00")).toBeNull());
  it("semestral iniciado em 13/10/2026 termina em 13/04/2027", () => expect(somarMeses("2026-10-13", 6)).toBe("2027-04-13"));
  it("anual iniciado em 01/10/2026 termina em 01/10/2027", () =>
    expect(fimDoContrato({ valor: "Plano anual 12x de R$140,00", data_inicio: "01/10/2026" })).toBe("2027-10-01"));
  it("ADM é avisada com 7 dias de antecedência", () => expect(DIAS_AVISO_RENOVACAO).toBe(7));
});
