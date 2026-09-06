import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronDown, ChevronUp, Clock, Film, Image as ImageIcon, Smartphone, Trash2, Type, Upload, Volume2, VolumeX } from "lucide-react";
import { toast } from "sonner";

import { CortarImagem } from "@/components/CortarImagem";
import video1 from "@/assets/video1.mp4.asset.json";
import video2 from "@/assets/video2.mp4.asset.json";
import video3 from "@/assets/video3.mp4.asset.json";
import { criarTurma, excluirTurma, listarTurmas, salvarTurma, type Turma } from "@/lib/turmas";
import { CHAVES_TEXTO, listarTextos, salvarTexto, type Textos } from "@/lib/textos";
import {
import { assetUrl } from "@/lib/assetUrl";
  type Midia,
  GRUPOS_CARDS,
  GRUPO_LOGO,
  GRUPO_QG,
  GRUPO_VIDEOS,
  atualizarMidia,
  enviarMidia,
  excluirMidia,
  listarMidiasAdm,
} from "@/lib/midias";

const VIDEOS_ORIGINAIS: string[] = [assetUrl(video2), assetUrl(video1), assetUrl(video3)];

export function AppMidias() {
  const [lista, setLista] = useState<Midia[]>([]);
  const [grupo, setGrupo] = useState<string>(GRUPOS_CARDS[0]);
  const [ocupado, setOcupado] = useState(false);
  const [aberto, setAberto] = useState(false);

  const carregar = useCallback(async () => {
    setLista(await listarMidiasAdm());
  }, []);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  const capa = lista.find((m) => m.tipo === "capa" && m.grupo === grupo) ?? null;
  const fotos = lista.filter((m) => m.tipo === "foto" && m.grupo === grupo);
  const videos = lista.filter((m) => m.tipo === "video");
  const logo = lista.find((m) => m.tipo === "logo") ?? null;
  const fotosQg = lista.filter((m) => m.tipo === "foto" && m.grupo === GRUPO_QG);

  async function remover(m: Midia) {
    setOcupado(true);
    try {
      await excluirMidia(m.id, m.caminho);
      await carregar();
      toast.success("Mídia removida da página.");
    } catch {
      toast.error("Não foi possível remover.");
    } finally {
      setOcupado(false);
    }
  }

  return (
    <section className="mt-4 rounded-lg border border-border bg-card/40 p-4">
      <button
        type="button"
        onClick={() => setAberto((v) => !v)}
        className="flex w-full items-center justify-between gap-2 text-left"
        aria-expanded={aberto}
      >
        <h2 className="flex items-center gap-2 font-display text-lg tracking-tight">
          <Smartphone className="size-4 text-primary" /> APP — FOTOS E VÍDEOS
        </h2>
        {aberto ? <ChevronUp className="size-5 text-primary" /> : <ChevronDown className="size-5 text-primary" />}
      </button>
      <p className="mt-1 text-xs text-muted-foreground">
        Troque a foto de capa dos cartões, as fotos que abrem por dentro e os vídeos da página inicial. Tudo
        atualiza na página assim que você salva.
      </p>

      {aberto && (
        <>
          {/* -------- CARTÕES -------- */}
      <div className="mt-4 rounded-md border border-border bg-background/40 p-3">
        <p className="flex items-center gap-2 font-display text-sm tracking-tight">
          <ImageIcon className="size-4 text-primary" /> CARTÕES DA PÁGINA INICIAL
        </p>
        <select
          value={grupo}
          onChange={(e) => setGrupo(e.target.value)}
          className="mt-2 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
        >
          {GRUPOS_CARDS.map((g) => (
            <option key={g} value={g}>
              {g}
            </option>
          ))}
        </select>

        <p className="mt-3 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Foto de capa</p>
        {capa?.url && (
          <div className="mt-1 flex items-center gap-2">
            <img
              src={capa.url}
              alt="Capa atual do cartão"
              className="h-20 w-28 rounded-md border border-border object-cover"
            />
            <button
              type="button"
              disabled={ocupado}
              onClick={() => void remover(capa)}
              className="rounded-md border border-border p-2 text-muted-foreground"
              aria-label="Remover capa"
            >
              <Trash2 className="size-4" />
            </button>
          </div>
        )}
        <EnvioImagem
          rotulo={capa ? "TROCAR FOTO DE CAPA" : "ANEXAR FOTO DE CAPA"}
          aspecto={4 / 3}
          onEnviar={async (blob, nome, descricao) => {
            await enviarMidia({ tipo: "capa", grupo, arquivo: blob, nomeArquivo: nome, descricao });
            await carregar();
          }}
        />

        <p className="mt-4 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
          Fotos de dentro do cartão
        </p>
        {fotos.length > 0 && (
          <ul className="mt-1 grid grid-cols-3 gap-2">
            {fotos.map((f) => (
              <li key={f.id} className="relative">
                {f.url && (
                  <img
                    src={f.url}
                    alt={f.descricao ?? "Foto do cartão"}
                    className="h-20 w-full rounded-md border border-border object-cover"
                  />
                )}
                <button
                  type="button"
                  disabled={ocupado}
                  onClick={() => void remover(f)}
                  aria-label="Remover foto"
                  className="absolute right-1 top-1 rounded-md bg-background/80 p-1 text-muted-foreground"
                >
                  <Trash2 className="size-3" />
                </button>
              </li>
            ))}
          </ul>
        )}
        <EnvioImagem
          rotulo="ANEXAR NOVA FOTO INTERNA"
          aspecto={4 / 3}
          onEnviar={async (blob, nome, descricao) => {
            await enviarMidia({
              tipo: "foto",
              grupo,
              arquivo: blob,
              nomeArquivo: nome,
              descricao,
              ordem: fotos.length,
            });
            await carregar();
          }}
        />
      </div>

      {/* -------- NOSSO QG -------- */}
      <div className="mt-4 rounded-md border border-border bg-background/40 p-3">
        <p className="flex items-center gap-2 font-display text-sm tracking-tight">
          <ImageIcon className="size-4 text-primary" /> FOTOS DO NOSSO QG
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          Enquanto não houver foto aqui, a página mostra as fotos originais do QG. A descrição aparece como legenda.
        </p>
        {fotosQg.length > 0 && (
          <ul className="mt-2 grid grid-cols-3 gap-2">
            {fotosQg.map((f) => (
              <li key={f.id} className="relative">
                {f.url && (
                  <img
                    src={f.url}
                    alt={f.descricao ?? "Foto do QG"}
                    className="h-20 w-full rounded-md border border-border object-cover"
                  />
                )}
                <button
                  type="button"
                  disabled={ocupado}
                  onClick={() => void remover(f)}
                  aria-label="Remover foto do QG"
                  className="absolute right-1 top-1 rounded-md bg-background/80 p-1 text-muted-foreground"
                >
                  <Trash2 className="size-3" />
                </button>
              </li>
            ))}
          </ul>
        )}
        <EnvioImagem
          rotulo="ANEXAR FOTO DO QG"
          aspecto={4 / 3}
          onEnviar={async (blob, nome, descricao) => {
            await enviarMidia({
              tipo: "foto",
              grupo: GRUPO_QG,
              arquivo: blob,
              nomeArquivo: nome,
              descricao,
              ordem: fotosQg.length,
            });
            await carregar();
          }}
        />
      </div>

      {/* -------- HORÁRIOS -------- */}
      <TabelaTurmas />

      {/* -------- LOGO -------- */}
      <div className="mt-4 rounded-md border border-border bg-background/40 p-3">
        <p className="flex items-center gap-2 font-display text-sm tracking-tight">
          <ImageIcon className="size-4 text-primary" /> LOGO PRINCIPAL
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          Enquanto não houver logo aqui, a página mostra a logo original.
        </p>
        {logo?.url && (
          <div className="mt-2 flex items-center gap-2">
            <img
              src={logo.url}
              alt="Logo atual da página inicial"
              className="h-24 w-24 rounded-md border border-border object-contain"
            />
            <button
              type="button"
              disabled={ocupado}
              onClick={() => void remover(logo)}
              className="rounded-md border border-border p-2 text-muted-foreground"
              aria-label="Remover logo"
            >
              <Trash2 className="size-4" />
            </button>
          </div>
        )}
        <EnvioImagem
          rotulo={logo ? "TROCAR LOGO PRINCIPAL" : "ANEXAR NOVA LOGO"}
          aspecto={1}
          onEnviar={async (blob, nome, descricao) => {
            await enviarMidia({ tipo: "logo", grupo: GRUPO_LOGO, arquivo: blob, nomeArquivo: nome, descricao });
            await carregar();
          }}
        />
      </div>

      {/* -------- TEXTOS -------- */}
      <TextosPagina />

      {/* -------- VÍDEOS -------- */}
      <div className="mt-4 rounded-md border border-border bg-background/40 p-3">
        <p className="flex items-center gap-2 font-display text-sm tracking-tight">
          <Film className="size-4 text-primary" /> SUPER CT EM AÇÃO — VÍDEOS
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          Estes são os vídeos que aparecem em “SUPER CT EM AÇÃO”. Ao anexar um vídeo novo, ele entra no lugar dos
          vídeos originais.
        </p>

        {videos.length === 0 && (
          <ul className="mt-2 space-y-2">
            {VIDEOS_ORIGINAIS.map((src, i) => (
              <li key={src} className="rounded-md border border-border bg-background/60 p-2">
                <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                  Vídeo original {i + 1}
                </p>
                <video src={src} controls playsInline preload="metadata" className="mt-1 w-full rounded-md" />
              </li>
            ))}
          </ul>
        )}


        {videos.length > 0 && (
          <ul className="mt-2 space-y-3">
            {videos.map((v) => (
              <li key={v.id} className="rounded-md border border-border bg-background/60 p-2">
                {v.url && <video src={v.url} controls playsInline className="w-full rounded-md" />}
                <div className="mt-2 flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={async () => {
                      await atualizarMidia(v.id, { com_som: !v.com_som });
                      await carregar();
                    }}
                    className="flex items-center gap-1 rounded-md border border-border px-2 py-1 font-mono text-[10px] uppercase text-muted-foreground"
                  >
                    {v.com_som ? <Volume2 className="size-3" /> : <VolumeX className="size-3" />}
                    {v.com_som ? "COM SOM" : "SEM SOM"}
                  </button>
                  <button
                    type="button"
                    disabled={ocupado}
                    onClick={() => void remover(v)}
                    aria-label="Remover vídeo"
                    className="rounded-md border border-border p-1 text-muted-foreground"
                  >
                    <Trash2 className="size-3" />
                  </button>
                </div>
                <TrechoVideo midia={v} onSalvo={carregar} />
              </li>
            ))}
          </ul>
        )}

        <EnvioVideo onFim={carregar} />
      </div>
      </>
    )}
    </section>
  );
}

/* ------------------------------ ENVIO DE FOTO ------------------------------ */

function EnvioImagem({
  rotulo,
  aspecto,
  onEnviar,
}: {
  rotulo: string;
  aspecto: number;
  onEnviar: (blob: Blob, nome: string, descricao: string) => Promise<void>;
}) {
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [descricao, setDescricao] = useState("");
  const [salvando, setSalvando] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  async function usar(blob: Blob) {
    if (!arquivo) return;
    setSalvando(true);
    try {
      await onEnviar(blob, arquivo.name.replace(/\.\w+$/, ".jpg"), descricao);
      setArquivo(null);
      setDescricao("");
      if (input.current) input.current.value = "";
      toast.success("Foto atualizada na página.");
    } catch {
      toast.error("Não foi possível enviar a foto.");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className="mt-2">
      <label className="flex cursor-pointer items-center justify-center gap-2 rounded-md border border-border bg-background px-3 py-2 font-display text-xs tracking-tight text-muted-foreground">
        <Upload className="size-4" /> {salvando ? "ENVIANDO…" : rotulo}
        <input
          ref={input}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => setArquivo(e.target.files?.[0] ?? null)}
        />
      </label>
      {arquivo && (
        <>
          <input
            value={descricao}
            onChange={(e) => setDescricao(e.target.value)}
            placeholder="Descrição da foto (para acessibilidade)"
            className="mt-2 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
          />
          <CortarImagem
            arquivo={arquivo}
            aspectoInicial={aspecto}
            onPronto={(blob) => void usar(blob)}
            onCancelar={() => setArquivo(null)}
          />
        </>
      )}
    </div>
  );
}

/* ------------------------------ ENVIO DE VÍDEO ------------------------------ */

function EnvioVideo({ onFim }: { onFim: () => Promise<void> }) {
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [comSom, setComSom] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  async function enviar() {
    if (!arquivo) return;
    setSalvando(true);
    try {
      await enviarMidia({
        tipo: "video",
        grupo: GRUPO_VIDEOS,
        arquivo,
        nomeArquivo: arquivo.name,
        com_som: comSom,
      });
      setArquivo(null);
      if (input.current) input.current.value = "";
      await onFim();
      toast.success("Vídeo publicado na página inicial.");
    } catch {
      toast.error("Não foi possível enviar o vídeo.");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className="mt-3">
      <label className="flex cursor-pointer items-center justify-center gap-2 rounded-md border border-border bg-background px-3 py-2 font-display text-xs tracking-tight text-muted-foreground">
        <Upload className="size-4" /> ANEXAR NOVO VÍDEO
        <input
          ref={input}
          type="file"
          accept="video/*"
          className="hidden"
          onChange={(e) => setArquivo(e.target.files?.[0] ?? null)}
        />
      </label>
      {arquivo && (
        <div className="mt-2 rounded-md border border-border bg-background/60 p-2">
          <p className="text-xs text-muted-foreground">{arquivo.name}</p>
          <button
            type="button"
            onClick={() => setComSom((s) => !s)}
            className="mt-2 flex items-center gap-1 rounded-md border border-border px-2 py-1 font-mono text-[10px] uppercase text-muted-foreground"
          >
            {comSom ? <Volume2 className="size-3" /> : <VolumeX className="size-3" />}
            {comSom ? "TOCAR COM SOM" : "TOCAR SEM SOM"}
          </button>
          <button
            type="button"
            disabled={salvando}
            onClick={() => void enviar()}
            className="mt-2 w-full rounded-md bg-primary px-3 py-2 font-display text-xs tracking-tight text-primary-foreground disabled:opacity-60"
          >
            {salvando ? "ENVIANDO…" : "PUBLICAR VÍDEO"}
          </button>
          <p className="mt-1 text-[10px] text-muted-foreground">
            Depois de publicar, você pode escolher o trecho que vai tocar.
          </p>
        </div>
      )}
    </div>
  );
}

/* --------------------------- TRECHO DO VÍDEO --------------------------- */

function TrechoVideo({ midia, onSalvo }: { midia: Midia; onSalvo: () => Promise<void> }) {
  const [inicio, setInicio] = useState(midia.inicio ?? 0);
  const [fim, setFim] = useState<number | null>(midia.fim ?? null);
  const [duracao, setDuracao] = useState<number | null>(null);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    if (!midia.url) return;
    const v = document.createElement("video");
    v.preload = "metadata";
    v.src = midia.url;
    v.onloadedmetadata = () => setDuracao(Number.isFinite(v.duration) ? v.duration : null);
  }, [midia.url]);

  const max = duracao ?? 60;

  async function salvar() {
    setSalvando(true);
    try {
      await atualizarMidia(midia.id, { inicio, fim });
      await onSalvo();
      toast.success("Trecho do vídeo salvo.");
    } catch {
      toast.error("Não foi possível salvar o trecho.");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className="mt-2 border-t border-border pt-2">
      <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
        Recortar trecho — começa em {inicio.toFixed(1)}s e termina em {(fim ?? max).toFixed(1)}s
      </p>
      <input
        type="range"
        min={0}
        max={max}
        step={0.5}
        value={inicio}
        onChange={(e) => setInicio(Math.min(Number(e.target.value), (fim ?? max) - 1))}
        className="w-full accent-[hsl(var(--primary))]"
        aria-label="Início do trecho"
      />
      <input
        type="range"
        min={0}
        max={max}
        step={0.5}
        value={fim ?? max}
        onChange={(e) => setFim(Math.max(Number(e.target.value), inicio + 1))}
        className="w-full accent-[hsl(var(--primary))]"
        aria-label="Fim do trecho"
      />
      <button
        type="button"
        disabled={salvando}
        onClick={() => void salvar()}
        className="w-full rounded-md border border-primary px-3 py-2 font-display text-xs tracking-tight text-primary disabled:opacity-60"
      >
        {salvando ? "SALVANDO…" : "SALVAR TRECHO"}
      </button>
    </div>
  );
}

/* ------------------------------ TEXTOS DA PÁGINA ------------------------------ */

function TextosPagina() {
  const [textos, setTextos] = useState<Textos>({});
  const [salvando, setSalvando] = useState<string | null>(null);

  useEffect(() => {
    void listarTextos().then(setTextos);
  }, []);

  async function salvar(chave: string) {
    setSalvando(chave);
    try {
      await salvarTexto(chave, textos[chave] ?? "");
      toast.success("Texto atualizado na página.");
    } catch {
      toast.error("Não foi possível salvar o texto.");
    } finally {
      setSalvando(null);
    }
  }

  return (
    <div className="mt-4 rounded-md border border-border bg-background/40 p-3">
      <p className="flex items-center gap-2 font-display text-sm tracking-tight">
        <Type className="size-4 text-primary" /> TEXTOS DA PÁGINA INICIAL
      </p>
      <p className="mt-1 text-xs text-muted-foreground">
        Escreva o título e o texto que aparecem abaixo da logo principal.
      </p>

      {CHAVES_TEXTO.map((t) => (
        <div key={t.chave} className="mt-3">
          <label className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">{t.rotulo}</label>
          <textarea
            value={textos[t.chave] ?? ""}
            onChange={(e) => setTextos((v) => ({ ...v, [t.chave]: e.target.value }))}
            rows={t.chave === "hero_titulo" ? 2 : 3}
            className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
          />
          <button
            type="button"
            disabled={salvando === t.chave}
            onClick={() => void salvar(t.chave)}
            className="mt-1 w-full rounded-md border border-primary px-3 py-2 font-display text-xs tracking-tight text-primary disabled:opacity-60"
          >
            {salvando === t.chave ? "SALVANDO…" : "SALVAR TEXTO"}
          </button>
        </div>
      ))}
    </div>
  );
}

/* ------------------------------ HORÁRIOS DAS TURMAS ------------------------------ */

function TabelaTurmas() {
  const [turmas, setTurmas] = useState<Turma[]>([]);
  const [ocupado, setOcupado] = useState(false);

  const carregar = useCallback(async () => {
    setTurmas(await listarTurmas());
  }, []);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  async function salvar(t: Turma) {
    setOcupado(true);
    try {
      await salvarTurma(t.id, { turma: t.turma, horario: t.horario, idade: t.idade, dias: t.dias });
      toast.success("Horário atualizado na página.");
    } catch {
      toast.error("Não foi possível salvar o horário.");
    } finally {
      setOcupado(false);
    }
  }

  async function adicionar() {
    setOcupado(true);
    try {
      await criarTurma(turmas.length + 1);
      await carregar();
    } catch {
      toast.error("Não foi possível adicionar a turma.");
    } finally {
      setOcupado(false);
    }
  }

  async function remover(id: string) {
    setOcupado(true);
    try {
      await excluirTurma(id);
      await carregar();
      toast.success("Turma removida da página.");
    } catch {
      toast.error("Não foi possível remover a turma.");
    } finally {
      setOcupado(false);
    }
  }

  const campos: { campo: keyof Turma; rotulo: string }[] = [
    { campo: "turma", rotulo: "Turma" },
    { campo: "horario", rotulo: "Horário" },
    { campo: "idade", rotulo: "Idade" },
    { campo: "dias", rotulo: "Dias" },
  ];

  return (
    <div className="mt-4 rounded-md border border-border bg-background/40 p-3">
      <p className="flex items-center gap-2 font-display text-sm tracking-tight">
        <Clock className="size-4 text-primary" /> HORÁRIOS DAS TURMAS
      </p>
      <p className="mt-1 text-xs text-muted-foreground">
        Altere turma, horário, idade e dias. A tabela da página inicial muda assim que você salva.
      </p>

      <ul className="mt-3 space-y-3">
        {turmas.map((t) => (
          <li key={t.id} className="rounded-md border border-border bg-background/60 p-2">
            <div className="grid grid-cols-2 gap-2">
              {campos.map((c) => (
                <label key={c.campo} className="block">
                  <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                    {c.rotulo}
                  </span>
                  <input
                    value={String(t[c.campo] ?? "")}
                    onChange={(e) =>
                      setTurmas((lista) =>
                        lista.map((x) => (x.id === t.id ? { ...x, [c.campo]: e.target.value } : x)),
                      )
                    }
                    className="mt-1 w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm"
                  />
                </label>
              ))}
            </div>
            <div className="mt-2 flex items-center gap-2">
              <button
                type="button"
                disabled={ocupado}
                onClick={() => void salvar(t)}
                className="flex-1 rounded-md border border-primary px-3 py-2 font-display text-xs tracking-tight text-primary disabled:opacity-60"
              >
                SALVAR
              </button>
              <button
                type="button"
                disabled={ocupado}
                onClick={() => void remover(t.id)}
                aria-label="Remover turma"
                className="rounded-md border border-border p-2 text-muted-foreground"
              >
                <Trash2 className="size-4" />
              </button>
            </div>
          </li>
        ))}
      </ul>

      <button
        type="button"
        disabled={ocupado}
        onClick={() => void adicionar()}
        className="mt-3 w-full rounded-md bg-primary px-3 py-2 font-display text-xs tracking-tight text-primary-foreground disabled:opacity-60"
      >
        ADICIONAR TURMA
      </button>
    </div>
  );
}
