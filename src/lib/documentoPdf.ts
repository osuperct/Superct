import { jsPDF } from "jspdf";

export type LinhaDoc = { rotulo: string; valor: string };

/** Gera o PDF do contrato/ficha preenchido, já com a assinatura desenhada. */
export function gerarDocumentoPdf(opcoes: {
  titulo: string;
  linhas: LinhaDoc[];
  termo: string;
  assinaturaDataUrl: string | null;
  nomeAssinante: string;
}): Blob {
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

  return doc.output("blob");
}
