import { jsPDF } from "jspdf";
import logoRelatorio from "@/assets/logo-super-ct-relatorio.png";

export type SecaoRelatorio = {
  titulo: string;
  colunas: string[];
  linhas: string[][];
  resumo?: string;
};

const MARGEM = 40;
const LOGO_TAMANHO = 54;

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
  return canvas.toDataURL("image/png");
}

function adicionarLogoEmTodasAsPaginas(doc: jsPDF, logo: string) {
  const total = doc.getNumberOfPages();
  const larguraPagina = doc.internal.pageSize.getWidth();
  for (let pagina = 1; pagina <= total; pagina += 1) {
    doc.setPage(pagina);
    doc.addImage(logo, "PNG", larguraPagina - MARGEM - LOGO_TAMANHO, 22, LOGO_TAMANHO, LOGO_TAMANHO);
  }
}

function cabecalho(doc: jsPDF, subtitulo: string) {
  let y = MARGEM;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.text("SUPER CT — Professor Tio Victor", MARGEM, y);
  y += 16;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text("Rua Geraldo Marcolini, 1609 — São Sebastião do Paraíso/MG — (35) 98822-3596", MARGEM, y);
  y += 12;
  doc.text(`Relatório gerado em ${new Date().toLocaleString("pt-BR")}`, MARGEM, y);
  y += 12;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text(subtitulo.toUpperCase(), MARGEM, y);
  y += 8;
  doc.setDrawColor(230, 120, 20);
  doc.line(MARGEM, y, doc.internal.pageSize.getWidth() - MARGEM, y);
  return y + 18;
}

function desenharSecao(doc: jsPDF, secao: SecaoRelatorio, yInicial: number) {
  const largura = doc.internal.pageSize.getWidth() - MARGEM * 2;
  const altura = doc.internal.pageSize.getHeight();
  let y = yInicial;

  const quebrar = (extra = 0) => {
    if (y + extra > altura - MARGEM) {
      doc.addPage();
      y = MARGEM;
    }
  };

  quebrar(30);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text(secao.titulo.toUpperCase(), MARGEM, y);
  y += 16;

  const colunas = secao.colunas.length || 1;
  const larguraCol = largura / colunas;

  doc.setFontSize(9);
  quebrar(20);
  secao.colunas.forEach((c, i) => doc.text(c, MARGEM + i * larguraCol, y));
  y += 4;
  doc.setDrawColor(180, 180, 180);
  doc.line(MARGEM, y, MARGEM + largura, y);
  y += 12;

  doc.setFont("helvetica", "normal");
  if (secao.linhas.length === 0) {
    quebrar(16);
    doc.text("Nenhum registro nesta seleção.", MARGEM, y);
    y += 16;
  }
  for (const linha of secao.linhas) {
    quebrar(16);
    linha.forEach((celula, i) => {
      const texto = (doc.splitTextToSize(celula || "-", larguraCol - 6) as string[])[0] ?? "";
      doc.text(texto, MARGEM + i * larguraCol, y);
    });
    y += 14;
  }

  if (secao.resumo) {
    y += 4;
    quebrar(20);
    doc.setFont("helvetica", "bold");
    doc.text(secao.resumo, MARGEM, y);
    doc.setFont("helvetica", "normal");
    y += 18;
  }

  return y + 12;
}

/** Um PDF com todas as seções escolhidas. */
export async function relatorioConjunto(secoes: SecaoRelatorio[], subtitulo = "Relatório geral") {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  let y = cabecalho(doc, subtitulo);
  for (const secao of secoes) y = desenharSecao(doc, secao, y);
  adicionarLogoEmTodasAsPaginas(doc, await carregarLogo());
  return doc.output("blob");
}

/** Um PDF só com esta seção. */
export async function relatorioSeparado(secao: SecaoRelatorio) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const y = cabecalho(doc, secao.titulo);
  desenharSecao(doc, secao, y);
  adicionarLogoEmTodasAsPaginas(doc, await carregarLogo());
  return doc.output("blob");
}

export function baixarBlob(blob: Blob, nome: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nome;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}
