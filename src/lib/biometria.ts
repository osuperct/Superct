/** Confirmação por biometria/bloqueio de tela do aparelho (WebAuthn com verificação do usuário). */
export async function biometriaDisponivel(): Promise<boolean> {
  try {
    return (
      typeof window !== "undefined" &&
      !!window.PublicKeyCredential &&
      (await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable())
    );
  } catch {
    return false;
  }
}

export async function confirmarBiometria(uid: string, nome: string): Promise<string | null> {
  const desafio = crypto.getRandomValues(new Uint8Array(32));
  const cred = (await navigator.credentials.create({
    publicKey: {
      challenge: desafio,
      rp: { name: "Super CT" },
      user: { id: new TextEncoder().encode(uid.slice(0, 64)), name: nome || "responsavel", displayName: nome || "Responsável" },
      pubKeyCredParams: [
        { type: "public-key", alg: -7 },
        { type: "public-key", alg: -257 },
      ],
      authenticatorSelection: { authenticatorAttachment: "platform", userVerification: "required", residentKey: "discouraged" },
      timeout: 60000,
      attestation: "none",
    },
  })) as PublicKeyCredential | null;
  return cred?.id ?? null;
}

/** Aparelho sem biometria/bloqueio: confirmação pelo login + toque em OK, marcada como "sem_biometria". */
export function confirmacaoSemBiometria(challenge: string) {
  const b64 = (s: string) => btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  return {
    id: "sem-biometria", rawId: "sem-biometria", type: "public-key" as const,
    response: { clientDataJSON: b64(JSON.stringify({ type: "webauthn.create", challenge, origin: window.location.origin, metodo: "sem_biometria_login_ok" })), attestationObject: "sem-biometria" },
    clientExtensionResults: {}, authenticatorAttachment: "platform" as const,
  };
}

export async function sha256Hex(texto: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(texto));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}
