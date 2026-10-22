export const RECESSO = {
  versao: "recesso-2026-2027-v1",
  inicio: "2026-12-24",
  fim: "2027-01-03",
  titulo: "CLÁUSULA — DO CALENDÁRIO ANUAL, RECESSO DE FIM DE ANO E MENSALIDADE FIXA",
  texto: `O SUPER CT poderá estabelecer períodos de recesso durante as festividades de Carnaval, Natal e Ano-Novo, conforme calendário anual previamente informado aos CONTRATANTES.

As datas de suspensão das atividades regulares serão comunicadas antecipadamente, por meios oficiais de comunicação do SUPER CT.

Os períodos de recesso integrarão o calendário de funcionamento apresentado no momento da contratação, com informação clara sobre sua repercussão na prestação dos serviços e nos valores dos planos.

Parágrafo primeiro — Da mensalidade fixa: O CONTRATANTE declara estar ciente de que o valor da mensalidade contratada é fixo, correspondendo ao plano de atividades oferecido pelo SUPER CT ao longo do calendário anual, não sendo calculado proporcionalmente à quantidade de dias úteis ou aulas existentes em cada mês.

Parágrafo segundo — Dos recessos programados: Os períodos de recesso previamente estabelecidos e informados no calendário anual já estarão considerados na composição do valor da mensalidade fixa, não implicando, por si só, descontos proporcionais ou reposições automáticas das atividades, desde que respeitadas as condições contratadas e a legislação aplicável.

Parágrafo terceiro — Da ciência e concordância: Ao assinar o presente contrato ou aditivo, o CONTRATANTE declara ter recebido informações claras sobre os períodos de recesso, o calendário de funcionamento e a sistemática de cobrança da mensalidade fixa, manifestando sua ciência e concordância com as condições estabelecidas.`,
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
  // Sem biometria no aparelho (false), o OK confirma pelo login; só espera enquanto ainda verifica (null).
  return aceitou && biometria !== null && contratos > 0 && !salvando;
}

// "consultando" não mostra o aviso: quem já concordou não deve vê-lo piscar antes da resposta.
// O bloqueio só vale quando a leitura conclui (pendente/erro) — o aceite é validado pela leitura, não pelo bloqueio.
export function recessoBloqueiaAcesso(enabled: boolean, estado: EstadoAvisoRecesso): boolean {
  return enabled && (estado === "pendente" || estado === "erro");
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