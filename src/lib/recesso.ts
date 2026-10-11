export const RECESSO = {
  versao: "recesso-2026-2027-v1",
  inicio: "2026-12-24",
  fim: "2027-01-03",
  titulo: "CLÁUSULA — DO CALENDÁRIO ANUAL E RECESSO DE FIM DE ANO",
  texto: `O SUPER CT poderá estabelecer períodos de recesso durante as festividades de Carnaval, Natal e Ano-Novo, conforme calendário anual previamente informado aos CONTRATANTES.

As datas de suspensão das atividades regulares serão comunicadas antecipadamente, por meios oficiais de comunicação do SUPER CT.

Os períodos de recesso integrarão o calendário de funcionamento apresentado no momento da contratação, com informação clara sobre sua repercussão na prestação dos serviços e nos valores dos planos.`,
};

export type EstadoAvisoRecesso = "consultando" | "pendente" | "erro" | "liberado";

export function origemConfirmacaoRecesso(origem: string): URL {
  const url = new URL(origem);
  const projeto = "f98de061-dc8c-43b5-9c7f-56210aba7b2d";
  const hosts = ["osuperct.com", "www.osuperct.com", "superct.lovable.app", `${projeto}.lovableproject.com`, `id-preview--${projeto}.lovable.app`];
  const local = url.hostname === "localhost" && ["http:", "https:"].includes(url.protocol);
  if (url.origin !== origem || url.username || url.password || (!local && (url.protocol !== "https:" || url.port || !hosts.includes(url.hostname)))) {
    throw new Error("Endereço não autorizado para confirmar o recesso.");
  }
  return url;
}

export function recessoPodeConfirmar(aceitou: boolean, biometria: boolean | null, contratos: number, salvando: boolean): boolean {
  return aceitou && biometria === true && contratos > 0 && !salvando;
}

export function recessoBloqueiaAcesso(enabled: boolean, estado: EstadoAvisoRecesso): boolean {
  return enabled && estado !== "liberado";
}

export function avaliacaoPodeNotificar(perfilCarregado: boolean, avisoDocumentos: boolean, recessoBloqueado: boolean): boolean {
  return perfilCarregado && !avisoDocumentos && !recessoBloqueado;
}

export function contratosPendentes<T extends { id: string; aluno_id: string | null; nome_arquivo: string; created_at: string }>(documentos: T[], aceites: string[]): T[] {
  const ultimos = new Map<string, T>();
  for (const doc of [...documentos].sort((a, b) => b.created_at.localeCompare(a.created_at))) {
    if (doc.nome_arquivo.startsWith("contrato-recesso-")) continue;
    const chave = doc.aluno_id ?? "responsavel";
    if (!ultimos.has(chave)) ultimos.set(chave, doc);
  }
  return [...ultimos.values()].filter((doc) => !aceites.includes(doc.id));
}