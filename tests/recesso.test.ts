import { test, expect } from "bun:test";
import { PDFDocument } from "pdf-lib";
import { RECESSO, contratosPendentes, recessoBloqueiaAcesso, avaliacaoPodeNotificar, recessoPodeConfirmar, origemConfirmacaoRecesso } from "../src/lib/recesso";
import { gerarAditivoRecesso } from "../src/lib/recessoPdf";

test("recesso começa em 24/12/2026", () => { expect(RECESSO.inicio).toBe("2026-12-24"); });
test("recesso termina em 03/01/2027", () => { expect(RECESSO.fim).toBe("2027-01-03"); });
test("desafio biométrico preserva a origem real da prévia e do site", () => {
  const preview = "https://f98de061-dc8c-43b5-9c7f-56210aba7b2d.lovableproject.com";
  expect(origemConfirmacaoRecesso(preview).hostname).toBe("f98de061-dc8c-43b5-9c7f-56210aba7b2d.lovableproject.com");
  expect(origemConfirmacaoRecesso("https://osuperct.com").origin).toBe("https://osuperct.com");
  expect(origemConfirmacaoRecesso("http://localhost:8080").hostname).toBe("localhost");
});
test("desafio rejeita origens externas e imitações do domínio", () => {
  for (const origem of ["https://evil.example", "https://osuperct.com.evil.example", "http://osuperct.com", "https://osuperct.com/conta", "https://outro.lovableproject.com"]) {
    expect(() => origemConfirmacaoRecesso(origem)).toThrow();
  }
});
test("uma única seleção dos termos permite iniciar a confirmação biométrica", () => {
  expect(recessoPodeConfirmar(false, true, 1, false)).toBe(false);
  expect(recessoPodeConfirmar(true, true, 1, false)).toBe(true);
});
test("OK não permite confirmar sem biometria disponível", () => {
  expect(recessoPodeConfirmar(true, false, 1, false)).toBe(false);
  expect(recessoPodeConfirmar(true, null, 1, false)).toBe(false);
});
test("confirmação requer contrato e não pode ser repetida durante o registro", () => {
  expect(recessoPodeConfirmar(true, true, 0, false)).toBe(false);
  expect(recessoPodeConfirmar(true, true, 1, true)).toBe(false);
});
test("avaliação não encobre o aviso da cláusula e recesso ao entrar", () => {
  expect(avaliacaoPodeNotificar(true, false, true)).toBe(false);
  expect(avaliacaoPodeNotificar(false, false, false)).toBe(false);
  expect(avaliacaoPodeNotificar(true, true, false)).toBe(false);
  expect(avaliacaoPodeNotificar(true, false, false)).toBe(true);
});
test("responsável não segue na conta enquanto a confirmação de recesso estiver pendente", () => {
  expect(recessoBloqueiaAcesso(true, "pendente")).toBe(true);
  expect(recessoBloqueiaAcesso(true, "consultando")).toBe(true);
  expect(recessoBloqueiaAcesso(true, "erro")).toBe(true);
  expect(recessoBloqueiaAcesso(true, "liberado")).toBe(false);
  expect(recessoBloqueiaAcesso(false, "pendente")).toBe(false);
});
const documento = (id: string, aluno_id = "aluno-1", nome_arquivo = "contrato-assinado.pdf", created_at = "2026-10-01") => ({ id, aluno_id, nome_arquivo, created_at });
test("concordância registrada não volta a solicitar confirmação para o mesmo contrato", () => {
  expect(contratosPendentes([documento("original"), documento("aditivo", "aluno-1", "contrato-recesso-v1.pdf", "2026-10-10")], ["original"])).toHaveLength(0);
});
test("aditivo inclui todos os contratos dos filhos pendentes", () => {
  expect(contratosPendentes([documento("a"), documento("b", "aluno-2")], []).map((d) => d.id)).toEqual(["a", "b"]);
});
test("aditivo preserva as páginas do contrato original", async () => {
  const original = await PDFDocument.create(); original.addPage([300, 400]); original.addPage([500, 600]);
  const bytes = await original.save();
  const aditivo = await gerarAditivoRecesso(new Uint8Array(bytes).buffer, "application/pdf", { nome: "Responsável de teste", email: "teste@example.org", ip: "127.0.0.1", data: "2026-10-10T22:06:00Z", credencial: "confirmacao-teste", hashOriginal: "a".repeat(64) });
  const pdf = await PDFDocument.load(aditivo);
  expect(pdf.getPageCount()).toBeGreaterThan(2);
  expect(pdf.getPage(0).getSize()).toEqual({ width: 300, height: 400 });
  expect(pdf.getPage(1).getSize()).toEqual({ width: 500, height: 600 });
});