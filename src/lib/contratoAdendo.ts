import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import assinaturaVictor from "@/assets/assinatura-victor.png.asset.json";
import logoSuperCt from "@/assets/super-ct-logo-sem-fundo.png.asset.json";
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
}): Promise<Blob> {
  const pdf = await documentoBase(opcoes.arquivoOriginal, opcoes.tipoArquivo);
  const pagina = pdf.addPage([595.28, 841.89]);
  const normal = await pdf.embedFont(StandardFonts.Helvetica);
  const negrito = await pdf.embedFont(StandardFonts.HelveticaBold);
  const [assinaturaBytes, logoBytes] = await Promise.all([
    carregarImagem(assetUrl(assinaturaVictor)),
    carregarImagem(assetUrl(logoSuperCt)),
  ]);
  const assinatura = assinaturaBytes ? await pdf.embedPng(assinaturaBytes) : null;
  const logo = logoBytes ? await pdf.embedPng(logoBytes) : null;
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
  pagina.drawText("ADENDO DE CORREÇÃO AO CONTRATO ASSINADO", {
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
  pagina.drawText("DADOS CORRIGIDOS", { x: margem, y, size: 11, font: negrito, color: rgb(0.12, 0.12, 0.12) });
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

  const colunaDireita = margem + largura / 2 + 10;
  if (assinatura) {
    const escalaAssinatura = Math.min(170 / assinatura.width, 42 / assinatura.height);
    pagina.drawImage(assinatura, {
      x: margem + 12,
      y: 104,
      width: assinatura.width * escalaAssinatura,
      height: assinatura.height * escalaAssinatura,
    });
  }
  if (logo) {
    const escalaLogo = Math.min(78 / logo.width, 58 / logo.height);
    const larguraLogo = logo.width * escalaLogo;
    pagina.drawImage(logo, {
      x: colunaDireita + (210 - larguraLogo) / 2,
      y: 99,
      width: larguraLogo,
      height: logo.height * escalaLogo,
    });
  }
  pagina.drawLine({
    start: { x: margem, y: 96 },
    end: { x: margem + 210, y: 96 },
    thickness: 0.7,
    color: rgb(0.25, 0.25, 0.25),
  });
  pagina.drawLine({
    start: { x: colunaDireita, y: 96 },
    end: { x: colunaDireita + 210, y: 96 },
    thickness: 0.7,
    color: rgb(0.25, 0.25, 0.25),
  });
  pagina.drawText("VICTOR HUGO JORGE DE SIQUEIRA", {
    x: margem,
    y: 82,
    size: 8,
    font: negrito,
    color: rgb(0.2, 0.2, 0.2),
  });
  pagina.drawText("SUPER CT RECREAÇÃO INFANTIL", {
    x: colunaDireita,
    y: 82,
    size: 8,
    font: negrito,
    color: rgb(0.2, 0.2, 0.2),
  });
  pagina.drawText("CREF: 057790-G/MG", {
    x: margem,
    y: 70,
    size: 7.5,
    font: normal,
    color: rgb(0.3, 0.3, 0.3),
  });
  pagina.drawText("CNPJ: 61.251.274/0001-48", {
    x: colunaDireita,
    y: 70,
    size: 7.5,
    font: normal,
    color: rgb(0.3, 0.3, 0.3),
  });

  const bytes = await pdf.save();
  return new Blob([bytes as BlobPart], { type: "application/pdf" });
}