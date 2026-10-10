import { PDFDocument, StandardFonts } from "pdf-lib";
import { RECESSO } from "@/lib/recesso";

export async function gerarAditivoRecesso(original: ArrayBuffer, tipo: string, registro: { nome: string; email: string; ip: string; data: string; credencial: string; hashOriginal: string }): Promise<Uint8Array> {
  const pdf = tipo.includes("pdf") ? await PDFDocument.load(original) : await PDFDocument.create();
  if (!tipo.includes("pdf")) {
    const img = tipo.includes("png") ? await pdf.embedPng(original) : await pdf.embedJpg(original);
    const pag = pdf.addPage([595.28, 841.89]);
    const escala = Math.min(535 / img.width, 781 / img.height);
    pag.drawImage(img, { x: 30, y: (841.89 - img.height * escala) / 2, width: img.width * escala, height: img.height * escala });
  }
  const normal = await pdf.embedFont(StandardFonts.Helvetica);
  const negrito = await pdf.embedFont(StandardFonts.HelveticaBold);
  let pagina = pdf.addPage([595.28, 841.89]);
  let y = 790;
  const escrever = (texto: string, bold = false) => {
    const font = bold ? negrito : normal;
    for (const paragrafo of texto.split("\n")) {
      let linha = "";
      for (const palavra of paragrafo.split(/\s+/)) {
        const proxima = linha ? `${linha} ${palavra}` : palavra;
        if (font.widthOfTextAtSize(proxima, 10) > 495 && linha) { desenhar(linha, bold); linha = palavra; }
        else linha = proxima;
      }
      desenhar(linha, bold);
      y -= 5;
    }
  };
  const desenhar = (linha: string, bold: boolean) => {
    if (y < 55) { pagina = pdf.addPage([595.28, 841.89]); y = 790; }
    pagina.drawText(linha, { x: 50, y, font: bold ? negrito : normal, size: 10 });
    y -= 15;
  };
  escrever("SUPER CT — ADITIVO AO CONTRATO ASSINADO", true);
  escrever(RECESSO.titulo, true);
  escrever("Recesso: de 24/12/2026 a 03/01/2027, inclusive.");
  escrever(RECESSO.texto);
  escrever("CIÊNCIA E CONCORDÂNCIA", true);
  escrever("Declaro que li a cláusula acima e estou ciente e de acordo com o recesso informado. Este aditivo integra o contrato original, cujas demais disposições e assinatura permanecem preservadas.");
  escrever(`Responsável: ${registro.nome}\nE-mail verificado: ${registro.email}\nConfirmação: ${new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", dateStyle: "long", timeStyle: "medium" }).format(new Date(registro.data))} (Brasília)\nIP: ${registro.ip}\nVerificação local do aparelho: confirmada pelo servidor (WebAuthn).\nReferência da confirmação: ${registro.credencial}\nVersão: ${RECESSO.versao}\nSHA-256 do contrato original: ${registro.hashOriginal}`);
  return pdf.save();
}