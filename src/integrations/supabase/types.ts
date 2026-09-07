export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      alunos: {
        Row: {
          created_at: string
          id: string
          idade: number | null
          matricula: string | null
          nascimento: string | null
          nome: string
          observacoes: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          idade?: number | null
          matricula?: string | null
          nascimento?: string | null
          nome: string
          observacoes?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          idade?: number | null
          matricula?: string | null
          nascimento?: string | null
          nome?: string
          observacoes?: string | null
          user_id?: string
        }
        Relationships: []
      }
      avaliacoes: {
        Row: {
          aluno_id: string
          comportamento: string
          coordenacao_motora: string
          created_at: string
          disciplina: string
          execucao_exercicios: string
          forca_resistencia: string
          id: string
          observacoes: string | null
          professor_id: string
          referencia: string
          respeito_empatia: string
          updated_at: string
          user_id: string
          velocidade_agilidade: string
        }
        Insert: {
          aluno_id: string
          comportamento?: string
          coordenacao_motora?: string
          created_at?: string
          disciplina?: string
          execucao_exercicios?: string
          forca_resistencia?: string
          id?: string
          observacoes?: string | null
          professor_id: string
          referencia: string
          respeito_empatia?: string
          updated_at?: string
          user_id: string
          velocidade_agilidade?: string
        }
        Update: {
          aluno_id?: string
          comportamento?: string
          coordenacao_motora?: string
          created_at?: string
          disciplina?: string
          execucao_exercicios?: string
          forca_resistencia?: string
          id?: string
          observacoes?: string | null
          professor_id?: string
          referencia?: string
          respeito_empatia?: string
          updated_at?: string
          user_id?: string
          velocidade_agilidade?: string
        }
        Relationships: [
          {
            foreignKeyName: "avaliacoes_aluno_id_fkey"
            columns: ["aluno_id"]
            isOneToOne: false
            referencedRelation: "alunos"
            referencedColumns: ["id"]
          },
        ]
      }
      avisos: {
        Row: {
          autor_id: string
          created_at: string
          id: string
          imagem_url: string | null
          mensagem: string
          titulo: string
        }
        Insert: {
          autor_id: string
          created_at?: string
          id?: string
          imagem_url?: string | null
          mensagem: string
          titulo: string
        }
        Update: {
          autor_id?: string
          created_at?: string
          id?: string
          imagem_url?: string | null
          mensagem?: string
          titulo?: string
        }
        Relationships: []
      }
      avisos_lidos: {
        Row: {
          aviso_id: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          aviso_id: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          aviso_id?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "avisos_lidos_aviso_id_fkey"
            columns: ["aviso_id"]
            isOneToOne: false
            referencedRelation: "avisos"
            referencedColumns: ["id"]
          },
        ]
      }
      documentos: {
        Row: {
          aluno_id: string | null
          caminho: string
          created_at: string
          enviado_por_professor: boolean
          id: string
          liberado: boolean
          liberado_em: string | null
          nome_arquivo: string
          oculto_responsavel: boolean
          tipo: string
          user_id: string
        }
        Insert: {
          aluno_id?: string | null
          caminho: string
          created_at?: string
          enviado_por_professor?: boolean
          id?: string
          liberado?: boolean
          liberado_em?: string | null
          nome_arquivo: string
          oculto_responsavel?: boolean
          tipo?: string
          user_id: string
        }
        Update: {
          aluno_id?: string | null
          caminho?: string
          created_at?: string
          enviado_por_professor?: boolean
          id?: string
          liberado?: boolean
          liberado_em?: string | null
          nome_arquivo?: string
          oculto_responsavel?: boolean
          tipo?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "documentos_aluno_id_fkey"
            columns: ["aluno_id"]
            isOneToOne: false
            referencedRelation: "alunos"
            referencedColumns: ["id"]
          },
        ]
      }
      fichas: {
        Row: {
          aluno_id: string | null
          created_at: string
          dados: Json
          enviado_em: string | null
          id: string
          tipo: string
          user_id: string
        }
        Insert: {
          aluno_id?: string | null
          created_at?: string
          dados?: Json
          enviado_em?: string | null
          id?: string
          tipo?: string
          user_id: string
        }
        Update: {
          aluno_id?: string | null
          created_at?: string
          dados?: Json
          enviado_em?: string | null
          id?: string
          tipo?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fichas_aluno_id_fkey"
            columns: ["aluno_id"]
            isOneToOne: false
            referencedRelation: "alunos"
            referencedColumns: ["id"]
          },
        ]
      }
      mensalidades: {
        Row: {
          aluno_id: string
          ativo: boolean
          created_at: string
          forma: string | null
          id: string
          pago: boolean
          pago_em: string | null
          referencia: string
          updated_at: string
          user_id: string
          valor: number | null
        }
        Insert: {
          aluno_id: string
          ativo?: boolean
          created_at?: string
          forma?: string | null
          id?: string
          pago?: boolean
          pago_em?: string | null
          referencia: string
          updated_at?: string
          user_id: string
          valor?: number | null
        }
        Update: {
          aluno_id?: string
          ativo?: boolean
          created_at?: string
          forma?: string | null
          id?: string
          pago?: boolean
          pago_em?: string | null
          referencia?: string
          updated_at?: string
          user_id?: string
          valor?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "mensalidades_aluno_id_fkey"
            columns: ["aluno_id"]
            isOneToOne: false
            referencedRelation: "alunos"
            referencedColumns: ["id"]
          },
        ]
      }
      midias_app: {
        Row: {
          ativo: boolean
          caminho: string
          com_som: boolean
          created_at: string
          descricao: string | null
          fim: number | null
          grupo: string
          id: string
          inicio: number
          ordem: number
          tipo: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          caminho: string
          com_som?: boolean
          created_at?: string
          descricao?: string | null
          fim?: number | null
          grupo: string
          id?: string
          inicio?: number
          ordem?: number
          tipo?: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          caminho?: string
          com_som?: boolean
          created_at?: string
          descricao?: string | null
          fim?: number | null
          grupo?: string
          id?: string
          inicio?: number
          ordem?: number
          tipo?: string
          updated_at?: string
        }
        Relationships: []
      }
      perfis: {
        Row: {
          aceite_imagem: boolean
          aceite_imagem_em: string | null
          aprovado: boolean
          aprovado_em: string | null
          cpf: string | null
          created_at: string
          endereco: string | null
          id: string
          nascimento: string | null
          nome_responsavel: string
          telefone: string | null
          updated_at: string
        }
        Insert: {
          aceite_imagem?: boolean
          aceite_imagem_em?: string | null
          aprovado?: boolean
          aprovado_em?: string | null
          cpf?: string | null
          created_at?: string
          endereco?: string | null
          id: string
          nascimento?: string | null
          nome_responsavel?: string
          telefone?: string | null
          updated_at?: string
        }
        Update: {
          aceite_imagem?: boolean
          aceite_imagem_em?: string | null
          aprovado?: boolean
          aprovado_em?: string | null
          cpf?: string | null
          created_at?: string
          endereco?: string | null
          id?: string
          nascimento?: string | null
          nome_responsavel?: string
          telefone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      produtos: {
        Row: {
          ativo: boolean
          created_at: string
          descricao: string | null
          id: string
          imagem_url: string | null
          link_pagamento: string | null
          nome: string
          ordem: number
          pede_tamanho: boolean
          preco: number
          tamanhos: string[]
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          descricao?: string | null
          id?: string
          imagem_url?: string | null
          link_pagamento?: string | null
          nome: string
          ordem?: number
          pede_tamanho?: boolean
          preco?: number
          tamanhos?: string[]
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          descricao?: string | null
          id?: string
          imagem_url?: string | null
          link_pagamento?: string | null
          nome?: string
          ordem?: number
          pede_tamanho?: boolean
          preco?: number
          tamanhos?: string[]
          updated_at?: string
        }
        Relationships: []
      }
      ranking_jogo: {
        Row: {
          apelido: string
          created_at: string
          fase: number
          id: string
          pontos: number
          updated_at: string
          user_id: string
        }
        Insert: {
          apelido: string
          created_at?: string
          fase?: number
          id?: string
          pontos?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          apelido?: string
          created_at?: string
          fase?: number
          id?: string
          pontos?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      textos_app: {
        Row: {
          chave: string
          created_at: string
          updated_at: string
          valor: string
        }
        Insert: {
          chave: string
          created_at?: string
          updated_at?: string
          valor?: string
        }
        Update: {
          chave?: string
          created_at?: string
          updated_at?: string
          valor?: string
        }
        Relationships: []
      }
      turmas_app: {
        Row: {
          created_at: string
          dias: string
          horario: string
          id: string
          idade: string
          ordem: number
          turma: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          dias?: string
          horario?: string
          id?: string
          idade?: string
          ordem?: number
          turma?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          dias?: string
          horario?: string
          id?: string
          idade?: string
          ordem?: number
          turma?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      ranking_publico: {
        Row: {
          apelido: string | null
          fase: number | null
          pontos: number | null
          updated_at: string | null
        }
        Insert: {
          apelido?: string | null
          fase?: number | null
          pontos?: number | null
          updated_at?: string | null
        }
        Update: {
          apelido?: string | null
          fase?: number | null
          pontos?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      adm_definir_acesso: {
        Args: {
          _liberar: boolean
          _papel: Database["public"]["Enums"]["app_role"]
          _senha?: string
          _user_id: string
        }
        Returns: Json
      }
      adm_definir_aprovacao: {
        Args: { _aprovado: boolean; _senha?: string; _user_id: string }
        Returns: Json
      }
      adm_excluir_conta: {
        Args: { _senha: string; _user_id: string }
        Returns: Json
      }
      adm_listar_acessos: {
        Args: never
        Returns: {
          adm: boolean
          aprovado: boolean
          criado_em: string
          email: string
          id: string
          nome: string
          professor: boolean
          telefone: string
        }[]
      }
      cpf_disponivel: { Args: { _cpf: string }; Returns: boolean }
      vincular_alunos_dos_contratos: { Args: never; Returns: number }
    }
    Enums: {
      app_role: "professor" | "responsavel" | "adm"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["professor", "responsavel", "adm"],
    },
  },
} as const
