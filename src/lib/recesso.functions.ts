import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { generateRegistrationOptions, verifyRegistrationResponse } from "@simplewebauthn/server";
import type { RegistrationResponseJSON } from "@simplewebauthn/server";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { RECESSO, contratosPendentes } from "@/lib/recesso";
import { gerarAditivoRecesso } from "@/lib/recessoPdf";
import { BUCKET } from "@/lib/documentos";

async function hash(bytes: Uint8Array) {
  const digest = await crypto.subtle.digest("SHA-256", new Uint8Array(bytes));
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
}

export const consultarRecesso = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const [{ data: perfil, error: ep }, { data: documentos, error: ed }, { data: aceites, error: ea }] = await Promise.all([
      context.supabase.from("perfis").select("aprovado, bloqueado_em").eq("id", context.userId).maybeSingle(),
      context.supabase.from("documentos").select("id, aluno_id, nome_arquivo, created_at").eq("user_id", context.userId).eq("tipo", "contrato"),
      context.supabase.from("recesso_aceites").select("documento_original_id").eq("user_id", context.userId).eq("versao", RECESSO.versao),
    ]);
    if (ep || ed || ea) throw new Error("Não foi possível consultar o aviso de recesso.");
    const pendentes = contratosPendentes(documentos ?? [], (aceites ?? []).map((a) => a.documento_original_id));
    return { mostrar: Boolean(perfil?.aprovado && !perfil.bloqueado_em && (pendentes.length > 0 || !aceites?.length)), contratos: pendentes.length };
  });

export const prepararRecesso = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: perfil } = await context.supabase.from("perfis").select("aprovado, bloqueado_em, nome_responsavel").eq("id", context.userId).maybeSingle();
    if (!perfil?.aprovado || perfil.bloqueado_em) throw new Error("Acesso não liberado.");
    const req = getRequest();
    const origin = req.headers.get("origin");
    if (!origin) throw new Error("Abra o aviso novamente para confirmar.");
    const url = new URL(origin);
    const host = new URL(req.url).hostname;
    const conhecidos = ["osuperct.com", "www.osuperct.com", "superct.lovable.app", "localhost"];
    const preview = url.hostname.endsWith(".lovable.app") && url.hostname.includes("f98de061-dc8c-43b5-9c7f-56210aba7b2d");
    if (url.hostname !== host && !conhecidos.includes(url.hostname) && !preview) throw new Error("Origem inválida.");
    const options = await generateRegistrationOptions({
      rpName: "Super CT — Recesso", rpID: url.hostname, userName: context.userId,
      userDisplayName: perfil.nome_responsavel, userID: new TextEncoder().encode(context.userId),
      attestationType: "none", supportedAlgorithmIDs: [-7, -257],
      authenticatorSelection: { authenticatorAttachment: "platform", userVerification: "required", residentKey: "discouraged" },
    });
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin.from("recesso_desafios").insert({ user_id: context.userId, origin: url.origin, rp_id: url.hostname, challenge: options.challenge, versao: RECESSO.versao }).select("id").single();
    if (error || !data) throw new Error("Não foi possível iniciar a confirmação.");
    return { id: data.id, options };
  });

const respostaSchema = z.object({
  id: z.string().min(1).max(2000), rawId: z.string().min(1).max(2000), type: z.literal("public-key"),
  response: z.object({ clientDataJSON: z.string().min(1).max(16000), attestationObject: z.string().min(1).max(100000), transports: z.array(z.enum(["ble", "cable", "hybrid", "internal", "nfc", "smart-card", "usb"])).optional(), publicKeyAlgorithm: z.number().optional(), publicKey: z.string().optional(), authenticatorData: z.string().optional() }),
  clientExtensionResults: z.record(z.unknown()), authenticatorAttachment: z.enum(["platform", "cross-platform"]).optional(),
});

export const confirmarRecesso = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ desafio: z.string().uuid(), visto: z.literal(true), concordo: z.literal(true), resposta: respostaSchema }))
  .handler(async ({ context, data }) => {
    const { data: perfil } = await context.supabase.from("perfis").select("aprovado, bloqueado_em, nome_responsavel").eq("id", context.userId).maybeSingle();
    if (!perfil?.aprovado || perfil.bloqueado_em) throw new Error("Acesso não liberado.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: desafio, error: desafioError } = await supabaseAdmin.from("recesso_desafios").select("*").eq("id", data.desafio).eq("user_id", context.userId).single();
    if (desafioError || !desafio || desafio.usado_em || desafio.versao !== RECESSO.versao || Date.now() - Date.parse(desafio.created_at) > 300000) throw new Error("Confirmação expirada. Tente novamente.");
    const verificado = await verifyRegistrationResponse({ response: data.resposta as RegistrationResponseJSON, expectedChallenge: desafio.challenge, expectedOrigin: desafio.origin, expectedRPID: desafio.rp_id, requireUserVerification: true, supportedAlgorithmIDs: [-7, -257] });
    if (!verificado.verified || !verificado.registrationInfo.userVerified) throw new Error("Confirmação do aparelho não validada.");
    const { data: usuario, error: eu } = await context.supabase.auth.getUser();
    if (eu || !usuario.user) throw new Error("Sua sessão expirou.");
    const [{ data: docs, error: ed }, { data: aceites, error: ea }] = await Promise.all([
      context.supabase.from("documentos").select("id, aluno_id, nome_arquivo, created_at, caminho").eq("user_id", context.userId).eq("tipo", "contrato"),
      context.supabase.from("recesso_aceites").select("documento_original_id").eq("user_id", context.userId).eq("versao", RECESSO.versao),
    ]);
    if (ed || ea) throw new Error("Não foi possível carregar os contratos.");
    const pendentes = contratosPendentes(docs ?? [], (aceites ?? []).map((a) => a.documento_original_id));
    if (!pendentes.length) throw new Error("Nenhum contrato disponível para acrescentar o aditivo.");
    const req = getRequest();
    const ip = req.headers.get("cf-connecting-ip") || req.headers.get("x-real-ip") || req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "não identificado";
    const arquivos: { original: string; alunoId: string | null; caminho: string; nome: string; hash: string }[] = [];
    try {
      for (const doc of pendentes) {
        const { data: original, error } = await context.supabase.storage.from(BUCKET).download(doc.caminho);
        if (error || !original) throw new Error("Não foi possível abrir o contrato original. Peça à administração para conferir o arquivo.");
        const bytes = await original.arrayBuffer();
        const tipo = /\.png$/i.test(doc.nome_arquivo) ? "image/png" : /\.jpe?g$/i.test(doc.nome_arquivo) ? "image/jpeg" : "application/pdf";
        const pdf = await gerarAditivoRecesso(bytes, tipo, { nome: perfil.nome_responsavel, email: usuario.user.email ?? "", ip, data: new Date().toISOString(), credencial: data.desafio, hashOriginal: await hash(new Uint8Array(bytes)) });
        const nome = `contrato-recesso-${RECESSO.versao}-${doc.id}.pdf`;
        const caminho = `${context.userId}/recesso/${data.desafio}-${nome}`;
        const { error: uploadError } = await supabaseAdmin.storage.from(BUCKET).upload(caminho, pdf, { contentType: "application/pdf" });
        if (uploadError) throw new Error("Não foi possível arquivar o aditivo. Tente novamente.");
        arquivos.push({ original: doc.id, alunoId: doc.aluno_id, nome, caminho, hash: await hash(pdf) });
      }
      const { error } = await supabaseAdmin.rpc("recesso_arquivar", { _desafio: data.desafio, _user_id: context.userId, _credencial: JSON.stringify(data.resposta), _ip: ip, _agente: (req.headers.get("user-agent") ?? "").slice(0, 500), _email: usuario.user.email ?? "", _nome: perfil.nome_responsavel, _arquivos: arquivos });
      if (error) throw new Error("Não foi possível registrar o aditivo. Abra o aviso novamente e tente outra vez.");
    } catch (error) {
      if (arquivos.length) await supabaseAdmin.storage.from(BUCKET).remove(arquivos.map((a) => a.caminho));
      throw error;
    }
    return { quantidade: arquivos.length };
  });