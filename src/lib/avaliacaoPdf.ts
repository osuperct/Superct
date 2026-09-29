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

/** Remove o emoji do início do nome da conquista (o PDF usa ícones desenhados). */
function nomeConquista(conquista: string) {
  return conquista.replace(/^[^\p{L}\p{N}]+\s*/u, "").trim();
}

type IconeConquista = "trofeu" | "evolucao" | "alvo";

function iconeDaConquista(conquista: string): IconeConquista {
  if (conquista.includes("🏆")) return "trofeu";
  if (conquista.includes("📈")) return "evolucao";
  return "alvo";
}

/** Desenha o ícone da conquista (troféu, gráfico de evolução ou alvo) em vetor. */
function desenharIcone(doc: jsPDF, tipo: IconeConquista, x: number, y: number, tamanho: number) {
  const c = tamanho / 2;
  const cx = x + c;
  const cy = y + c;
  if (tipo === "trofeu") {
    doc.setFillColor(230, 120, 20);
    doc.setDrawColor(150, 70, 0);
    // taça
    doc.roundedRect(cx - c * 0.55, y, c * 1.1, c * 0.9, 2, 2, "FD");
    // alças
    doc.setLineWidth(1.4);
    doc.arc(cx - c * 0.75, y + c * 0.35, c * 0.28, -Math.PI / 2, Math.PI / 2, true);
    doc.arc(cx + c * 0.75, y + c * 0.35, c * 0.28, Math.PI / 2, (Math.PI * 3) / 2, true);
    // haste e base
    doc.setFillColor(230, 120, 20);
    doc.rect(cx - 1.5, y + c * 0.9, 3, c * 0.45, "F");
    doc.roundedRect(cx - c * 0.45, y + c * 1.3, c * 0.9, c * 0.28, 1.5, 1.5, "FD");
    // estrela na taça
    doc.setFillColor(255, 220, 90);
    doc.circle(cx, y + c * 0.42, c * 0.18, "F");
    return;
  }
  if (tipo === "evolucao") {
    doc.setDrawColor(41, 128, 255);
    doc.setLineWidth(1.4);
    doc.line(x + 1, y + tamanho - 1, x + 1, y + 1);
    doc.line(x + 1, y + tamanho - 1, x + tamanho - 1, y + tamanho - 1);
    doc.setDrawColor(34, 197, 94);
    doc.setLineWidth(2);
    const px = [x + 2, x + c * 0.75, x + c * 1.25, x + tamanho - 3];
    const py = [y + tamanho - 4, y + c * 1.1, y + c * 1.35, y + 2.5];
    for (let i = 0; i < px.length - 1; i += 1) doc.line(px[i]!, py[i]!, px[i + 1]!, py[i + 1]!);
    // ponta da seta
    doc.setFillColor(34, 197, 94);
    doc.triangle(x + tamanho - 6.5, y + 1.5, x + tamanho - 1, y + 2, x + tamanho - 2.5, y + 7, "F");
    return;
  }
  // alvo
  doc.setFillColor(236, 72, 153);
  doc.circle(cx, cy, c * 0.95, "F");
  doc.setFillColor(255, 255, 255);
  doc.circle(cx, cy, c * 0.62, "F");
  doc.setFillColor(236, 72, 153);
  doc.circle(cx, cy, c * 0.3, "F");
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
  doc.setFont("helvetica", "bold");
  doc.text("Conquistas:", MARGEM, y);
  const listaConquistas = avaliacao.conquistas?.length ? avaliacao.conquistas : ["🎯 Participação do mês"];
  doc.setFont("helvetica", "normal");
  let xConquista = MARGEM + 62;
  for (const conquista of listaConquistas) {
    const nome = nomeConquista(conquista);
    const larguraNome = doc.getTextWidth(nome);
    if (xConquista + 12 + larguraNome > largura - MARGEM) {
      y += 16;
      xConquista = MARGEM;
    }
    desenharIcone(doc, iconeDaConquista(conquista), xConquista, y - 9, 11);
    doc.text(nome, xConquista + 14, y);
    xConquista += 14 + larguraNome + 14;
  }
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
