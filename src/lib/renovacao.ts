import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { CLAUSULAS_CONTRATO } from "@/lib/documentos";
import { RECESSO } from "@/lib/recesso";
import { lerPlano, inicioIso } from "@/lib/planoContrato";

/** Dias de antecedência para avisar a ADM sobre o fim dos planos semestral/anual. */
export const DIAS_AVISO_RENOVACAO = 7;

/** Plano de período determinado: semestral (6 meses) ou anual (12 meses). Mensal retorna null. */
export function mesesDoPlano(planoTexto: string): number | null {
  const t = planoTexto.toLowerCase();
  if (t.includes("semestral")) return 6;
  if (t.includes("anual")) return 12;
  const { parcelas } = lerPlano(planoTexto);
  return parcelas === 6 || parcelas === 12 ? parcelas : null;
}

export function somarMeses(iso: string, meses: number): string {
  const [a, m, d] = iso.split("-").map(Number);
  const dt = new Date(Date.UTC(a!, m! - 1 + meses, d!));
  return dt.toISOString().slice(0, 10);
}

/** Data de término (yyyy-MM-dd) de um contrato semestral/anual, ou null. */
export function fimDoContrato(dados: Record<string, unknown>): string | null {
  const fim = inicioIso(String(dados["data_fim"] ?? "").trim() || undefined);
  if (fim) return fim;
  const meses = mesesDoPlano(String(dados["valor"] ?? ""));
  const inicio = inicioIso(String(dados["data_inicio"] ?? "").trim() || undefined);
  return meses && inicio ? somarMeses(inicio, meses) : null;
}

/** Dias corridos entre hoje e o fim (negativo = já venceu). */
export function diasAte(fim: string, hoje = new Date()): number {
  const base = Date.UTC(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());
  const [a, m, d] = fim.split("-").map(Number);
  return Math.round((Date.UTC(a!, m! - 1, d!) - base) / 86400000);
}

export function dataBr(iso: string) {
  const [a, m, d] = iso.split("-");
  return `${d}/${m}/${a}`;
}

export type DadosRenovacao = { plano: string; forma: string; inicio: string; fim: string; vencimento: string; valor_total: number | null };

export function textoRenovacao(r: DadosRenovacao, aluno: string) {
  return `Pelo presente termo aditivo, as partes renovam o contrato de prestação de serviços do(a) aluno(a) ${aluno || "matriculado(a)"}, nas seguintes condições:

Plano contratado: ${r.plano}${r.valor_total ? ` (valor total de R$ ${r.valor_total.toFixed(2).replace(".", ",")})` : ""}
Forma de pagamento: ${r.forma}
Vigência: de ${dataBr(r.inicio)} a ${dataBr(r.fim)}
Vencimento das parcelas: todo dia ${r.vencimento}

Permanecem válidas todas as demais cláusulas do contrato original, que passam a vigorar na versão atualizada transcrita abaixo, incluindo a cláusula dos planos semestral e anual e a cláusula do calendário anual e recesso.`;
}

export async function gerarAditivoRenovacao(
  original: ArrayBuffer,
  tipo: string,
  r: DadosRenovacao,
  registro: { aluno: string; nome: string; email: string; data: string; credencial: string },
): Promise<Uint8Array> {
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
  const limpar = (t: string) => t.replace(/[^\x20-\x7E\u00A0-\u00FF\n]/g, (c) => (c === "—" || c === "–" ? "-" : c === "“" || c === "”" ? '"' : c === "ª" ? "a" : ""));
  const desenhar = (linha: string, bold: boolean, tam: number) => {
    if (y < 50) { pagina = pdf.addPage([595.28, 841.89]); y = 790; }
    pagina.drawText(linha, { x: 50, y, size: tam, font: bold ? negrito : normal, color: rgb(0, 0, 0) });
    y -= tam + 4;
  };
  const escrever = (texto: string, bold = false, tam = 9) => {
    const font = bold ? negrito : normal;
    for (const paragrafo of limpar(texto).split("\n")) {
      let linha = "";
      for (const palavra of paragrafo.split(/\s+/)) {
        const proxima = linha ? `${linha} ${palavra}` : palavra;
        if (font.widthOfTextAtSize(proxima, tam) > 495 && linha) { desenhar(linha, bold, tam); linha = palavra; } else linha = proxima;
      }
      desenhar(linha, bold, tam);
    }
    y -= 6;
  };
  escrever("TERMO ADITIVO DE RENOVAÇÃO DE CONTRATO - SUPER CT", true, 12);
  escrever(textoRenovacao(r, registro.aluno));
  escrever("CLÁUSULAS ATUALIZADAS DO CONTRATO", true, 11);
  for (const c of CLAUSULAS_CONTRATO) { escrever(c.titulo, true); escrever(c.texto); }
  escrever(RECESSO.titulo, true); escrever(RECESSO.texto);
  escrever("REGISTRO DA ASSINATURA ELETRÔNICA", true, 11);
  escrever(`Assinado eletronicamente por ${registro.nome} (${registro.email}) em ${new Date(registro.data).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })} (horário de Brasília), com login verificado e confirmação biométrica do aparelho. Identificador da confirmação: ${registro.credencial}. Lei 14.063/2020 e MP 2.200-2/2001.`);
  return pdf.save();
}
