import { supabase } from "@/integrations/supabase/client";

export type Turma = {
  id: string;
  turma: string;
  horario: string;
  idade: string;
  dias: string;
  ordem: number;
};

const COLUNAS = "id, turma, horario, idade, dias, ordem";

export async function listarTurmas(): Promise<Turma[]> {
  const { data } = await supabase.from("turmas_app").select(COLUNAS).order("ordem", { ascending: true });
  return (data ?? []) as Turma[];
}

export async function criarTurma(ordem: number) {
  const { error } = await supabase
    .from("turmas_app")
    .insert({ turma: String(ordem), horario: "", idade: "", dias: "", ordem });
  if (error) throw error;
}

export async function salvarTurma(id: string, dados: Partial<Omit<Turma, "id">>) {
  const { error } = await supabase.from("turmas_app").update(dados).eq("id", id);
  if (error) throw error;
}

export async function excluirTurma(id: string) {
  const { error } = await supabase.from("turmas_app").delete().eq("id", id);
  if (error) throw error;
}
