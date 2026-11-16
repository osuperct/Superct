import { jsPDF } from "jspdf";
import logoRelatorio from "@/assets/logo-super-ct-relatorio.png";
import {
  CAIXAS_SALTO, PROVAS_TAF, type DadosTaf, type RegistroSuper,
  formatarMetros, formatarTempo, ganhouOuro, lerCorrida, lerSalto, trofeusTaf,
} from "@/lib/avaliacaoSuper";

async function logo() {
  const img = new Image();
  img.src = logoRelatorio;
  await img.decode();
  const c = document.createElement("canvas");
  c.width = img.naturalWidth; c.height = img.naturalHeight;
  c.getContext("2d")?.drawImage(img, 0, 0);
  return { url: c.toDataURL("image/png"), prop: img.naturalWidth / img.naturalHeight };
}

const data = (iso: string) => new Date(iso).toLocaleDateString("pt-BR");

/** Linhas de texto do relatório de um aluno (TAF, corridas e saltos). */
export function linhasAluno(regs: RegistroSuper[]): string[] {
  const out: string[] = [];
  for (const r of regs.filter((x) => x.tipo === "taf")) {
    const d = (r.dados ?? {}) as DadosTaf;
    out.push(`TAF SUPER CT (${data(r.created_at)}) - ${trofeusTaf(d)} trofeu(s) de ouro`);
    const c = lerCorrida(d.corrida);
    if (c) out.push(`   Corrida: ${formatarTempo(c.tempo_ms)} - ${c.voltas} volta(s)`);
    for (const p of PROVAS_TAF) {
      const v = d[p.chave];
      if (v === undefined) continue;
      out.push(`   ${p.rotulo}: ${v} (ouro com ${p.ouro})${ganhouOuro(p.chave, v) ? "  [OURO]" : ""}`);
    }
  }
  const corridas = regs.filter((x) => x.tipo === "corrida");
  if (corridas.length) out.push("SUPER CORRIDA");
  for (const r of corridas) {
    const c = lerCorrida(r.dados);
    if (c) out.push(`   ${data(r.created_at)}: ${formatarTempo(c.tempo_ms)} - ${c.voltas} volta(s)`);
  }
  const saltos = regs.filter((x) => x.tipo === "salto").map((r) => ({ r, s: lerSalto(r.dados) }));
  const dist = saltos.filter((x) => x.s?.modo === "distancia");
  const caixa = saltos.filter((x) => x.s?.modo === "caixa");
  if (dist.length) out.push("SALTO A DISTANCIA");
  for (const { r, s } of dist) if (s?.modo === "distancia") out.push(`   ${data(r.created_at)}: ${formatarMetros(s.metros)}`);
  if (caixa.length) out.push("SALTO NA CAIXA CROSS");
  for (const { r, s } of caixa) if (s?.modo === "caixa") out.push(`   ${data(r.created_at)}: Caixa ${CAIXAS_SALTO.find((c) => c.chave === s.caixa)?.rotulo ?? s.caixa} - ${formatarTempo(s.tempo_ms)}`);
  return out;
}

export async function gerarPdfSuper(titulo: string, alunos: { id: string; nome: string }[], registros: RegistroSuper[]) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const W = doc.internal.pageSize.getWidth(), H = doc.internal.pageSize.getHeight(), M = 40;
  let y = M;
  try { const l = await logo(); doc.addImage(l.url, "PNG", M, y, 50 * l.prop, 50); } catch { /* sem logo */ }
  doc.setFont("helvetica", "bold"); doc.setFontSize(15);
  doc.text("RELATORIO AREA SUPER", W - M, y + 20, { align: "right" });
  doc.setFont("helvetica", "normal"); doc.setFontSize(10);
  doc.text(titulo, W - M, y + 36, { align: "right" });
  y += 72;
  const avaliados = alunos.filter((a) => registros.some((r) => r.aluno_id === a.id));
  if (!avaliados.length) { doc.text("Nenhum aluno avaliado neste periodo.", M, y); }
  for (const a of avaliados) {
    const linhas = linhasAluno(registros.filter((r) => r.aluno_id === a.id));
    if (y > H - 80) { doc.addPage(); y = M; }
    doc.setFont("helvetica", "bold"); doc.setFontSize(12);
    doc.text(a.nome, M, y); y += 4;
    doc.line(M, y, W - M, y); y += 14;
    doc.setFontSize(10);
    for (const l of linhas) {
      if (y > H - M) { doc.addPage(); y = M; }
      doc.setFont("helvetica", l.startsWith(" ") ? "normal" : "bold");
      doc.text(l, M, y); y += 14;
    }
    y += 10;
  }
  doc.save(`area-super-${titulo.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.pdf`);
}
