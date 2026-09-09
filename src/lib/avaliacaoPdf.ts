import { jsPDF } from "jspdf";

import logoRelatorio from "@/assets/logo-super-ct-relatorio.png";
import {
  CRITERIOS,
  type Avaliacao,
  faixaDaNota,
  lerNotas,
  mediaNotas,
  mesExtenso,
  metaDeNotas,
} from "@/lib/avaliacao";

const MARGEM = 40;
const LOGO_ALTURA = 54;

async function carregarLogo() {
  const imagem = new Image();
  imagem.src = logoRelatorio;
  await imagem.decode();
  const canvas = document.createElement("canvas");
  canvas.width = imagem.naturalWidth;
  canvas.height = imagem.naturalHeight;
  const contexto = canvas.getContext("2d");
  if (!contexto) throw new Error("Não foi possível preparar a logo do relatório.");
  contexto.drawImage(imagem, 0, 0);
  return { dataUrl: canvas.toDataURL("image/png"), proporcao: imagem.naturalWidth / imagem.naturalHeight };
}

function estrelasTexto(nota: number | undefined) {
  if (!nota) return "sem nota";
  return `${"*".repeat(nota)}${"-".repeat(10 - nota)}  ${nota}/10  ${faixaDaNota(nota).rotulo}`;
}

/** Relatório individual da avaliação mensal do aluno. */
export async function relatorioAvaliacao(
  aluno: string,
  avaliacao: Avaliacao,
  historico: Avaliacao[],
): Promise<Blob> {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const largura = doc.internal.pageSize.getWidth();
  const notas = lerNotas(avaliacao.notas);
  const media = mediaNotas(notas);
  let y = MARGEM;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.text("SUPER CT — Professor Tio Victor", MARGEM, y);
  y += 16;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text("Rua Geraldo Marcolini, 1609 — São Sebastião do Paraíso/MG — (35) 98822-3596", MARGEM, y);
  y += 18;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text(`AVALIAÇÃO MENSAL — ${aluno.toUpperCase()}`, MARGEM, y);
  y += 14;
  doc.setFontSize(10);
  doc.text(`${mesExtenso(avaliacao.referencia)}  ·  Média geral: ${media.toFixed(1)}/10`, MARGEM, y);
  y += 8;
  doc.setDrawColor(230, 120, 20);
  doc.line(MARGEM, y, largura - MARGEM, y);
  y += 20;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  for (const c of CRITERIOS) {
    doc.text(c.rotulo, MARGEM, y);
    doc.setFont("courier", "normal");
    doc.text(estrelasTexto(notas[c.chave]), MARGEM + 190, y);
    doc.setFont("helvetica", "normal");
    y += 16;
  }

  y += 8;
  doc.setFont("helvetica", "bold");
  doc.text(`Meta atual: ${avaliacao.meta ?? metaDeNotas(notas) ?? "—"}`, MARGEM, y);
  y += 16;
  const conquistas = (avaliacao.conquistas ?? []).join(" · ") || "Participação do mês";
  doc.text(`Conquistas: ${conquistas}`, MARGEM, y);
  y += 20;

  doc.setFont("helvetica", "bold");
  doc.text("Observação do professor", MARGEM, y);
  y += 14;
  doc.setFont("helvetica", "normal");
  const obs = doc.splitTextToSize(avaliacao.observacoes ?? "Sem observações neste mês.", largura - MARGEM * 2) as string[];
  for (const linha of obs) {
    doc.text(linha, MARGEM, y);
    y += 13;
  }

  const anteriores = historico
    .filter((a) => a.referencia !== avaliacao.referencia)
    .slice(0, 12)
    .reverse();
  if (anteriores.length > 0) {
    y += 14;
    doc.setFont("helvetica", "bold");
    doc.text("Evolução (média por mês)", MARGEM, y);
    y += 14;
    doc.setFont("helvetica", "normal");
    for (const a of anteriores) {
      if (y > doc.internal.pageSize.getHeight() - MARGEM) {
        doc.addPage();
        y = MARGEM;
      }
      const m = mediaNotas(lerNotas(a.notas));
      doc.text(`${mesExtenso(a.referencia)}`, MARGEM, y);
      doc.setFont("courier", "normal");
      doc.text(`${"#".repeat(Math.round(m))} ${m.toFixed(1)}/10`, MARGEM + 190, y);
      doc.setFont("helvetica", "normal");
      y += 14;
    }
    y += 6;
    doc.setFont("helvetica", "bold");
    doc.text(`${mesExtenso(avaliacao.referencia)} (atual)`, MARGEM, y);
    doc.setFont("courier", "normal");
    doc.text(`${"#".repeat(Math.round(media))} ${media.toFixed(1)}/10`, MARGEM + 190, y);
  }

  const logo = await carregarLogo();
  const larguraLogo = LOGO_ALTURA * logo.proporcao;
  const total = doc.getNumberOfPages();
  for (let pagina = 1; pagina <= total; pagina += 1) {
    doc.setPage(pagina);
    doc.addImage(logo.dataUrl, "PNG", largura - MARGEM - larguraLogo, 22, larguraLogo, LOGO_ALTURA);
  }

  return doc.output("blob");
}
