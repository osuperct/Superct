export type Mensalidade = {
  id: string;
  aluno_id: string;
  user_id: string;
  referencia: string;
  ativo: boolean;
  valor: number | null;
  pago: boolean;
  pago_em: string | null;
  forma: string | null;
};

export const FORMAS = ["Pix", "Dinheiro", "Cartão de débito", "Cartão de crédito", "Transferência"];

/** Primeiro dia do mês, em ISO (yyyy-MM-dd). */
export function refMes(base = new Date(), somaMeses = 0) {
  const d = new Date(base.getFullYear(), base.getMonth() + somaMeses, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}

export function mesExtensoRef(referencia: string) {
  const [ano, mes] = referencia.split("-");
  const data = new Date(Number(ano), Number(mes) - 1, 1);
  const texto = data.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

export function formatarValor(valor: number | null | undefined) {
  return (valor ?? 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function formatarDataIso(iso: string | null) {
  if (!iso) return "—";
  const [ano, mes, dia] = iso.split("-");
  return `${dia}/${mes}/${ano}`;
}

export function hojeIso() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
