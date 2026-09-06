import { jsPDF } from "jspdf";
import assinaturaVictor from "@/assets/assinatura-victor.png.asset.json";
import seloSuperCt from "@/assets/selo-superct.png.asset.json";
import { assetUrl } from "@/lib/assetUrl";

export type LinhaDoc = { rotulo: string; valor: string };

async function carregarDataUrl(url: string): Promise<string | null> {
  try {
    const resposta = await fetch(url);
    if (!resposta.ok) return null;
    const blob = await resposta.blob();
    return await new Promise<string>((resolver, rejeitar) => {
      const leitor = new FileReader();
      leitor.onload = () => resolver(String(leitor.result));
      leitor.onerror = () => rejeitar(leitor.error);
      leitor.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

/** Gera o PDF do contrato/ficha preenchido, já com a assinatura desenhada. */
export async function gerarDocumentoPdf(opcoes: {
  titulo: string;
  linhas: LinhaDoc[];
  termo: string;
  assinaturaDataUrl: string | null;
  nomeAssinante: string;
  clausulas?: { titulo: string; texto: string }[];
  /** Inclui a assinatura do Prof. Victor e o selo da empresa (contrato). */
  assinaturaEmpresa?: boolean;
}): Promise<Blob> {
  const [assinaturaProf, selo] = opcoes.assinaturaEmpresa
    ? await Promise.all([carregarDataUrl(assetUrl(assinaturaVictor)), carregarDataUrl(assetUrl(seloSuperCt))])
    : [null, null];
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const margem = 48;
  const largura = doc.internal.pageSize.getWidth() - margem * 2;
  let y = margem;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("SUPER CT — Professor Tio Victor", margem, y);
  y += 18;
  doc.setFontSize(13);
  doc.text(opcoes.titulo.toUpperCase(), margem, y);
  y += 14;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text("Rua Geraldo Marcolini, 1609 — São Sebastião do Paraíso/MG — WhatsApp (35) 98822-3596", margem, y);
  y += 20;
  doc.setDrawColor(230, 120, 20);
  doc.line(margem, y, margem + largura, y);
  y += 22;

  doc.setFontSize(11);
  for (const linha of opcoes.linhas) {
    const texto = doc.splitTextToSize(`${linha.rotulo}: ${linha.valor || "-"}`, largura) as string[];
    for (const parte of texto) {
      if (y > 760) {
        doc.addPage();
        y = margem;
      }
      doc.text(parte, margem, y);
      y += 15;
    }
  }

  if (opcoes.clausulas?.length) {
    y += 16;
    if (y > 700) {
      doc.addPage();
      y = margem;
    }
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("CLÁUSULAS E REGRAS DO SUPER CT (lidas e aceitas)", margem, y);
    y += 16;
    for (const clausula of opcoes.clausulas) {
      if (y > 740) {
        doc.addPage();
        y = margem;
      }
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9.5);
      doc.text(clausula.titulo, margem, y);
      y += 12;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      for (const parte of doc.splitTextToSize(clausula.texto, largura) as string[]) {
        if (y > 780) {
          doc.addPage();
          y = margem;
        }
        doc.text(parte, margem, y);
        y += 11;
      }
      y += 8;
    }
  }

  y += 12;
  if (y > 640) {
    doc.addPage();
    y = margem;
  }
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("TERMO DE USO DE IMAGEM (aceito)", margem, y);
  y += 14;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  for (const parte of doc.splitTextToSize(opcoes.termo, largura) as string[]) {
    doc.text(parte, margem, y);
    y += 12;
  }

  y += 26;
  if (y > 660) {
    doc.addPage();
    y = margem;
  }
  if (opcoes.assinaturaDataUrl) {
    doc.addImage(opcoes.assinaturaDataUrl, "PNG", margem, y, 200, 72);
    y += 76;
  } else {
    y += 40;
  }
  doc.line(margem, y, margem + 240, y);
  y += 13;
  doc.setFontSize(9);
  doc.text(`${opcoes.nomeAssinante || "Responsável"} — assinatura do responsável`, margem, y);
  y += 13;
  doc.text(`Assinado on-line em ${new Date().toLocaleString("pt-BR")}`, margem, y);

  if (opcoes.assinaturaEmpresa) {
    y += 34;
    if (y > 620) {
      doc.addPage();
      y = margem;
    }
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text(
      `São Sebastião do Paraíso — MG, ${new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })}.`,
      margem,
      y,
    );
    y += 24;

    const colunaDireita = margem + largura / 2 + 10;
    if (assinaturaProf) doc.addImage(assinaturaProf, "PNG", margem, y, 170, 32);
    if (selo) doc.addImage(selo, "PNG", colunaDireita + 40, y - 4, 52, 32);
    y += 38;

    doc.line(margem, y, margem + 200, y);
    doc.line(colunaDireita, y, colunaDireita + 200, y);
    y += 13;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.text("VICTOR HUGO JORGE DE SIQUEIRA", margem, y);
    doc.text("SUPER CT RECREAÇÃO INFANTIL", colunaDireita, y);
    y += 12;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.text("CREF: 057790-G/MG | CPF: 097.854.576-13", margem, y);
    doc.text("CNPJ: 61.251.274/0001-48", colunaDireita, y);
    y += 11;
    doc.text("(Educador Físico / Prestador)", margem, y);
    doc.text("(Prestadora / Infraestrutura)", colunaDireita, y);
  }

  return doc.output("blob");
}
