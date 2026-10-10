import { test, expect } from "bun:test";
import { PDFDocument } from "pdf-lib";
import { RECESSO, contratosPendentes } from "../src/lib/recesso";
import { gerarAditivoRecesso } from "../src/lib/recessoPdf";

test("recesso começa em 24/12/2026", () => { expect(RECESSO.inicio).toBe("2026-12-24"); });
test("recesso termina em 03/01/2027", () => { expect(RECESSO.fim).toBe("2027-01-03"); });
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