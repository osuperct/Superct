import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import seloSuperCt from "@/assets/selo-superct.png.asset.json";
import { assetUrl } from "@/lib/assetUrl";

export type CorrecaoContrato = {
  rotulo: string;
  anterior: string;
  atualizado: string;
};

function quebrarTexto(texto: string, maximo = 88): string[] {
  const palavras = texto.trim().split(/\s+/);
  const linhas: string[] = [];
  let linha = "";
  for (const palavra of palavras) {
    const proxima = linha ? `${linha} ${palavra}` : palavra;
    if (proxima.length <= maximo) {
      linha = proxima;
    } else {
      if (linha) linhas.push(linha);
      linha = palavra;
    }
  }
  if (linha) linhas.push(linha);
  return linhas;
}

async function documentoBase(arquivo: ArrayBuffer, tipo: string): Promise<PDFDocument> {
  if (tipo.includes("pdf")) return PDFDocument.load(arquivo);

  const pdf = await PDFDocument.create();
  const bytes = new Uint8Array(arquivo);
  const imagem = tipo.includes("png") ? await pdf.embedPng(bytes) : await pdf.embedJpg(bytes);
  const pagina = pdf.addPage([595.28, 841.89]);
  const margem = 30;
  const escala = Math.min(
    (pagina.getWidth() - margem * 2) / imagem.width,
    (pagina.getHeight() - margem * 2) / imagem.height,
  );
  const largura = imagem.width * escala;
  const altura = imagem.height * escala;
  pagina.drawImage(imagem, {
    x: (pagina.getWidth() - largura) / 2,
    y: (pagina.getHeight() - altura) / 2,
    width: largura,
    height: altura,
  });
  return pdf;
}

async function carregarImagem(url: string): Promise<Uint8Array | null> {
  try {
    const resposta = await fetch(url);
    if (!resposta.ok) return null;
    return new Uint8Array(await resposta.arrayBuffer());
  } catch {
    return null;
  }
}

/** Preserva o contrato assinado e acrescenta as correções em uma página final de adendo. */
export async function acrescentarAdendoContrato(opcoes: {
  arquivoOriginal: ArrayBuffer;
  tipoArquivo: string;
  aluno: string;
  responsavel: string;
  correcoes: CorrecaoContrato[];
  alteradoEm: Date;
  titulo?: string;
  secao?: string;
  nota?: string;
}): Promise<Blob> {
  const pdf = await documentoBase(opcoes.arquivoOriginal, opcoes.tipoArquivo);
  const pagina = pdf.addPage([595.28, 841.89]);
  const normal = await pdf.embedFont(StandardFonts.Helvetica);
  const negrito = await pdf.embedFont(StandardFonts.HelveticaBold);
  const seloBytes = await carregarImagem(assetUrl(seloSuperCt));
  const selo = seloBytes ? await pdf.embedPng(seloBytes) : null;
  const margem = 48;
  const largura = pagina.getWidth() - margem * 2;
  let y = pagina.getHeight() - margem;

  pagina.drawText("SUPER CT — PROFESSOR TIO VICTOR", {
    x: margem,
    y,
    size: 14,
    font: negrito,
    color: rgb(0.12, 0.12, 0.12),
  });
  y -= 24;
  pagina.drawText(opcoes.titulo ?? "ADENDO DE CORREÇÃO AO CONTRATO ASSINADO", {
    x: margem,
    y,
    size: 12,
    font: negrito,
    color: rgb(0.9, 0.36, 0.04),
  });
  y -= 12;
  pagina.drawLine({
    start: { x: margem, y },
    end: { x: margem + largura, y },
    thickness: 1.5,
    color: rgb(0.9, 0.36, 0.04),
  });
  y -= 28;

  const dataHora = new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    dateStyle: "long",
    timeStyle: "short",
  }).format(opcoes.alteradoEm);
  const introducao = [
    `Aluno(a): ${opcoes.aluno || "não informado"}`,
    `Responsável: ${opcoes.responsavel || "não informado"}`,
    `Alteração registrada em ${dataHora} (horário de Brasília).`,
    opcoes.nota ??
      "Este adendo integra o contrato original assinado. A assinatura e todas as cláusulas não alteradas permanecem válidas.",
  ];

  pagina.setFont(normal);
  pagina.setFontSize(10);
  for (const texto of introducao) {
    for (const linha of quebrarTexto(texto)) {
      pagina.drawText(linha, { x: margem, y, size: 10, font: normal, color: rgb(0.15, 0.15, 0.15) });
      y -= 14;
    }
    y -= 4;
  }

  y -= 8;
  pagina.drawText(opcoes.secao ?? "DADOS CORRIGIDOS", { x: margem, y, size: 11, font: negrito, color: rgb(0.12, 0.12, 0.12) });
  y -= 20;

  for (const correcao of opcoes.correcoes) {
    pagina.drawText(correcao.rotulo.toUpperCase(), {
      x: margem,
      y,
      size: 8.5,
      font: negrito,
      color: rgb(0.9, 0.36, 0.04),
    });
    y -= 14;
    for (const linha of quebrarTexto(`Anterior: ${correcao.anterior || "não informado"}`)) {
      pagina.drawText(linha, { x: margem, y, size: 9.5, font: normal, color: rgb(0.32, 0.32, 0.32) });
      y -= 13;
    }
    for (const linha of quebrarTexto(`Corrigido para: ${correcao.atualizado || "não informado"}`)) {
      pagina.drawText(linha, { x: margem, y, size: 9.5, font: negrito, color: rgb(0.12, 0.12, 0.12) });
      y -= 13;
    }
    y -= 12;
  }

  if (selo) {
    const escalaSelo = Math.min(96 / selo.width, 62 / selo.height);
    const larguraSelo = selo.width * escalaSelo;
    pagina.drawImage(selo, {
      x: margem + (largura - larguraSelo) / 2,
      y: 99,
      width: larguraSelo,
      height: selo.height * escalaSelo,
    });
  }
  pagina.drawLine({
    start: { x: margem + largura / 2 - 105, y: 96 },
    end: { x: margem + largura / 2 + 105, y: 96 },
    thickness: 0.7,
    color: rgb(0.25, 0.25, 0.25),
  });
  pagina.drawText("SUPER CT RECREAÇÃO INFANTIL", {
    x: margem + largura / 2 - 67,
    y: 82,
    size: 8,
    font: negrito,
    color: rgb(0.2, 0.2, 0.2),
  });
  pagina.drawText("CNPJ: 61.251.274/0001-48", {
    x: margem + largura / 2 - 48,
    y: 70,
    size: 7.5,
    font: normal,
    color: rgb(0.3, 0.3, 0.3),
  });

  const bytes = await pdf.save();
  return new Blob([bytes as BlobPart], { type: "application/pdf" });
}