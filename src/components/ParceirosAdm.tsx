import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronDown, ChevronUp, Handshake, Plus, Save, Trash2, Upload, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { ImagemParceiro } from "@/components/ImagemParceiro";
import { enviarImagemParceiro, novoParceiro, parceirosQuery, salvarParceiro, type ParceiroCompleto, type ConfigParceiros } from "@/lib/parceiros";
import { supabase } from "@/integrations/supabase/client";

function CampoImagem({ titulo, caminho, onChange, disabled }: { titulo: string; caminho: string; onChange: (valor: string) => void; disabled: boolean }) {
  const [enviando, setEnviando] = useState(false);
  return <div className="space-y-2">
    <p className="text-sm font-semibold">{titulo}</p>
    <ImagemParceiro caminho={caminho} alt={titulo} className="max-h-40 max-w-full rounded-md object-contain" />
    <div className="flex flex-wrap items-center gap-2">
      <Button asChild variant="outline" size="sm" disabled={disabled || enviando}>
        <label className="cursor-pointer"><Upload /> {enviando ? "ENVIANDO…" : "TROCAR IMAGEM"}
          <input aria-label={titulo} type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" disabled={disabled || enviando} onChange={async (e) => {
            const arquivo = e.target.files?.[0]; e.target.value = ""; if (!arquivo) return;
            setEnviando(true);
            try { onChange(await enviarImagemParceiro(arquivo)); } catch (erro) { toast.error(erro instanceof Error ? erro.message : "Não foi possível enviar a imagem."); } finally { setEnviando(false); }
          }} />
        </label>
      </Button>
      {caminho && <Button type="button" size="icon" variant="ghost" disabled={disabled || enviando} aria-label={`Remover ${titulo}`} title={`Remover ${titulo}`} onClick={() => onChange("")}><Trash2 /></Button>}
    </div>
  </div>;
}

function EditarParceiro({ parceiro, onClose }: { parceiro: ParceiroCompleto; onClose: () => void }) {
  const [dados, setDados] = useState(parceiro);
  const [ocupado, setOcupado] = useState(false);
  const queryClient = useQueryClient();
  const alterar = (chave: keyof ParceiroCompleto, valor: string | boolean | number) => setDados((antes) => ({ ...antes, [chave]: valor }));
  async function salvar(e: React.FormEvent) {
    e.preventDefault(); setOcupado(true);
    try { await salvarParceiro(dados); await queryClient.invalidateQueries({ queryKey: ["parceiros"] }); toast.success("Parceria salva nas duas áreas."); onClose(); }
    catch (erro) { toast.error(erro instanceof Error ? erro.message : "Não foi possível salvar."); } finally { setOcupado(false); }
  }
  return <form onSubmit={salvar} className="mt-4 space-y-4 border-t border-border pt-4">
    <div className="flex items-center justify-between gap-2"><h3 className="font-display text-lg">{parceiro.nome || "NOVA PARCERIA"}</h3><Button type="button" variant="ghost" size="icon" aria-label="Fechar edição" title="Fechar edição" onClick={onClose}><X /></Button></div>
    <fieldset disabled={ocupado} className="space-y-4">
      <label className="block space-y-1 text-sm"><span>Nome *</span><Input required value={dados.nome} onChange={(e) => alterar("nome", e.target.value)} /></label>
      <div className="flex items-center justify-between gap-3"><label htmlFor="parceiro-ativo" className="text-sm">Exibir parceria</label><Switch id="parceiro-ativo" checked={dados.ativo} onCheckedChange={(valor) => alterar("ativo", valor)} /></div>
      <label className="block space-y-1 text-sm"><span>Ordem de exibição</span><Input type="number" min={0} step={1} value={dados.ordem} onChange={(e) => alterar("ordem", Number(e.target.value))} /></label>
      <h4 className="font-display text-base text-primary">BARRA LATERAL — PÚBLICO</h4>
      <CampoImagem titulo="Logo pública" caminho={dados.logo_url} onChange={(v) => alterar("logo_url", v)} disabled={ocupado} />
      <label className="block space-y-1 text-sm"><span>Instagram</span><Input type="url" value={dados.instagram} onChange={(e) => alterar("instagram", e.target.value)} /></label>
      <h4 className="font-display text-base text-primary">ÁREA DO RESPONSÁVEL — BENEFÍCIOS</h4>
      <CampoImagem titulo="Arte do benefício" caminho={dados.imagem_url} onChange={(v) => alterar("imagem_url", v)} disabled={ocupado} />
      {([
        ["categoria", "Categoria"], ["descricao", "Descrição"], ["desconto", "Desconto"], ["beneficio", "Benefício"], ["cupom", "Cupom"], ["telefone", "WhatsApp (com DDD)"], ["condicoes", "Condições"],
      ] as const).map(([chave, titulo]) => <label key={chave} className="block space-y-1 text-sm"><span>{titulo}</span>{chave === "beneficio" || chave === "condicoes" ? <Textarea value={dados[chave]} onChange={(e) => alterar(chave, e.target.value)} /> : <Input value={dados[chave]} onChange={(e) => alterar(chave, e.target.value)} />}</label>)}
      <Button type="submit" className="w-full"><Save /> {ocupado ? "SALVANDO…" : "SALVAR PARCERIA"}</Button>
    </fieldset>
  </form>;
}

function EditarCabecalho({ config }: { config: ConfigParceiros }) {
  const [dados, setDados] = useState(config);
  const [ocupado, setOcupado] = useState(false);
  const queryClient = useQueryClient();
  return <form className="space-y-4 border-b border-border pb-4" onSubmit={async (e) => {
    e.preventDefault(); setOcupado(true);
    try { const { error } = await supabase.from("parceiros_ct_config").update(dados).eq("id", 1); if (error) throw error; await queryClient.invalidateQueries({ queryKey: ["parceiros"] }); toast.success("Apresentação das parcerias atualizada."); }
    catch { toast.error("Não foi possível salvar a apresentação."); } finally { setOcupado(false); }
  }}>
    <fieldset disabled={ocupado} className="space-y-4">
      <label className="block space-y-1 text-sm"><span>Título *</span><Input required value={dados.titulo} onChange={(e) => setDados({ ...dados, titulo: e.target.value })} /></label>
      <label className="block space-y-1 text-sm"><span>Texto de apresentação</span><Textarea value={dados.introducao} onChange={(e) => setDados({ ...dados, introducao: e.target.value })} /></label>
      <CampoImagem titulo="Imagem e fundo da janela pública" caminho={dados.banner_publico} onChange={(v) => setDados({ ...dados, banner_publico: v })} disabled={ocupado} />
      <CampoImagem titulo="Imagem da área do responsável" caminho={dados.banner_responsavel} onChange={(v) => setDados({ ...dados, banner_responsavel: v })} disabled={ocupado} />
      <Button type="submit" variant="outline" className="w-full"><Save /> {ocupado ? "SALVANDO…" : "SALVAR APRESENTAÇÃO"}</Button>
    </fieldset>
  </form>;
}

export function ParceirosAdm() {
  const [aberto, setAberto] = useState(false);
  const [edicao, setEdicao] = useState<ParceiroCompleto | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const queryClient = useQueryClient();
  const { data, isPending, isError, refetch } = useQuery({ ...parceirosQuery(true, true), enabled: aberto });
  return <div className="mt-4 border-t border-border pt-4">
    <Button type="button" variant="ghost" className="h-auto w-full justify-between px-0 text-left" aria-expanded={aberto} onClick={() => setAberto(!aberto)}><span className="flex items-center gap-2 font-display text-base"><Handshake className="text-primary" /> PARCERIAS DO CT</span>{aberto ? <ChevronUp /> : <ChevronDown />}</Button>
    {aberto && <div className="mt-4 space-y-4">
      {isPending && <p className="text-sm text-muted-foreground">Carregando parcerias…</p>}
      {isError && <Button variant="outline" onClick={() => void refetch()}>Tentar novamente</Button>}
      {data && <>
        <EditarCabecalho key={JSON.stringify(data.config)} config={data.config} />
        <Button variant="outline" onClick={() => setEdicao({ ...novoParceiro(), ordem: Math.max(-1, ...data.parceiros.map((p) => p.ordem)) + 1 })}><Plus /> ADICIONAR PARCERIA</Button>
        {data.parceiros.length === 0 && <p className="text-sm text-muted-foreground">Nenhuma parceria cadastrada.</p>}
        <ul className="divide-y divide-border">{data.parceiros.map((p) => <li key={p.id} className="flex min-w-0 items-center gap-2 py-3">
          <Button variant="ghost" className="h-auto min-w-0 flex-1 justify-start whitespace-normal text-left" onClick={() => setEdicao({ ...novoParceiro(), ...p, ...data.beneficios.find((b) => b.id === p.id) })}><span>{p.nome}<span className="block text-xs text-muted-foreground">{p.ativo ? "Visível" : "Oculta"}</span></span></Button>
          <Button variant="ghost" size="icon" disabled={ocupado} aria-label={`Excluir ${p.nome}`} title={`Excluir ${p.nome}`} onClick={async () => {
            if (!confirm(`Excluir a parceria ${p.nome} das duas áreas?`)) return;
            setOcupado(true);
            try { const { error } = await supabase.from("parceiros_ct").delete().eq("id", p.id); if (error) throw error; if (edicao?.id === p.id) setEdicao(null); await queryClient.invalidateQueries({ queryKey: ["parceiros"] }); toast.success("Parceria excluída."); } catch { toast.error("Não foi possível excluir a parceria."); } finally { setOcupado(false); }
          }}><Trash2 className="text-destructive" /></Button>
        </li>)}</ul>
        {edicao && <EditarParceiro key={edicao.id} parceiro={edicao} onClose={() => setEdicao(null)} />}
      </>}
    </div>}
  </div>;
}