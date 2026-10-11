import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { Database } from "@/integrations/supabase/types";
import { RECESSO, contratosPendentes } from "@/lib/recesso";
import { gerarAditivoRecesso } from "@/lib/recessoPdf";
import { BUCKET } from "@/lib/documentos";

async function hash(bytes: Uint8Array) {
  const digest = await crypto.subtle.digest("SHA-256", new Uint8Array(bytes));
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
}

const respostaSchema = z.object({
  id: z.string().min(1).max(2000), rawId: z.string().min(1).max(2000), type: z.literal("public-key"),
  response: z.object({ clientDataJSON: z.string().min(1).max(16000), attestationObject: z.string().min(1).max(100000), transports: z.array(z.string().max(30)).max(10).optional(), publicKeyAlgorithm: z.number().optional(), publicKey: z.string().max(16000).optional(), authenticatorData: z.string().max(16000).optional() }),
  clientExtensionResults: z.record(z.unknown()), authenticatorAttachment: z.enum(["platform", "cross-platform"]).optional(),
});

/**
 * Valida a biometria e arquiva o aditivo usando apenas o login do próprio responsável
 * (token do pedido + chave pública), para funcionar também na hospedagem externa,
 * que não tem as variáveis privadas do servidor.
 */
export const confirmarRecesso = createServerFn({ method: "POST" })
  .inputValidator(z.object({ desafio: z.string().uuid(), visto: z.literal(true), concordo: z.literal(true), resposta: respostaSchema }))
  .handler(async ({ data }) => {
    const req = getRequest();
    const url = process.env["SUPABASE_URL"] || import.meta.env["VITE_SUPABASE_URL"];
    const chave = process.env["SUPABASE_PUBLISHABLE_KEY"] || import.meta.env["VITE_SUPABASE_PUBLISHABLE_KEY"];
    const token = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
    if (!url || !chave || !token) throw new Error("Sua sessão expirou. Saia e entre de novo na conta.");
    const supabase = createClient<Database>(url, chave, {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
    });
    const { data: usuario, error: eu } = await supabase.auth.getUser(token);
    if (eu || !usuario.user) throw new Error("Sua sessão expirou. Saia e entre de novo na conta.");
    const userId = usuario.user.id;

    const { data: perfil } = await supabase.from("perfis").select("aprovado, bloqueado_em, nome_responsavel").eq("id", userId).maybeSingle();
    if (!perfil?.aprovado || perfil.bloqueado_em) throw new Error("Acesso não liberado.");
    const { data: desafio, error: desafioError } = await supabase.from("recesso_desafios").select("*").eq("id", data.desafio).eq("user_id", userId).single();
    if (desafioError || !desafio || desafio.usado_em || desafio.versao !== RECESSO.versao || Date.now() - Date.parse(desafio.created_at) > 300000) throw new Error("Confirmação expirada. Toque em OK novamente.");
    const verificado = await verifyRegistrationResponse({ response: data.resposta as RegistrationResponseJSON, expectedChallenge: desafio.challenge, expectedOrigin: desafio.origin, expectedRPID: desafio.rp_id, requireUserVerification: true, supportedAlgorithmIDs: [-7, -257] });
    if (!verificado.verified || !verificado.registrationInfo.userVerified) throw new Error("Confirmação do aparelho não validada.");

    const [{ data: docs, error: ed }, { data: aceites, error: ea }] = await Promise.all([
      supabase.from("documentos").select("id, aluno_id, nome_arquivo, created_at, caminho").eq("user_id", userId).eq("tipo", "contrato"),
      supabase.from("recesso_aceites").select("documento_original_id").eq("user_id", userId).eq("versao", RECESSO.versao),
    ]);
    if (ed || ea) throw new Error("Não foi possível carregar os contratos.");
    const pendentes = contratosPendentes(docs ?? [], (aceites ?? []).map((a) => a.documento_original_id));
    if (!pendentes.length) throw new Error("Nenhum contrato disponível para acrescentar o aditivo.");
    const ip = req.headers.get("cf-connecting-ip") || req.headers.get("x-real-ip") || req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "não identificado";
    const arquivos: { original: string; alunoId: string | null; caminho: string; nome: string; hash: string }[] = [];
    try {
      for (const doc of pendentes) {
        const { data: original, error } = await supabase.storage.from(BUCKET).download(doc.caminho);
        if (error || !original) throw new Error("Não foi possível abrir o contrato original. Peça à administração para conferir o arquivo.");
        const bytes = await original.arrayBuffer();
        const tipo = /\.png$/i.test(doc.nome_arquivo) ? "image/png" : /\.jpe?g$/i.test(doc.nome_arquivo) ? "image/jpeg" : "application/pdf";
        const pdf = await gerarAditivoRecesso(bytes, tipo, { nome: perfil.nome_responsavel, email: usuario.user.email ?? "", ip, data: new Date().toISOString(), credencial: data.desafio, hashOriginal: await hash(new Uint8Array(bytes)) });
        const nome = `contrato-recesso-${RECESSO.versao}-${doc.id}.pdf`;
        const caminho = `${userId}/recesso/${data.desafio}-${nome}`;
        const { error: uploadError } = await supabase.storage.from(BUCKET).upload(caminho, pdf, { contentType: "application/pdf" });
        if (uploadError) throw new Error("Não foi possível arquivar o aditivo. Tente novamente.");
        arquivos.push({ original: doc.id, alunoId: doc.aluno_id, nome, caminho, hash: await hash(pdf) });
      }
      const { error } = await supabase.rpc("recesso_registrar", { _desafio: data.desafio, _credencial: JSON.stringify(data.resposta), _ip: ip, _agente: (req.headers.get("user-agent") ?? "").slice(0, 500), _arquivos: arquivos });
      if (error) { console.error("recesso_registrar", error.code, error.message); throw new Error("Não foi possível registrar o aditivo. Toque em OK e tente outra vez."); }
    } catch (error) {
      if (arquivos.length) await supabase.storage.from(BUCKET).remove(arquivos.map((a) => a.caminho));
      throw error;
    }
    return { quantidade: arquivos.length };
  });
