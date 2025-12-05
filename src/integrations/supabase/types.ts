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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      administradores: {
        Row: {
          created_at: string | null
          email: string
          id: string
          nombre: string
        }
        Insert: {
          created_at?: string | null
          email: string
          id: string
          nombre: string
        }
        Update: {
          created_at?: string | null
          email?: string
          id?: string
          nombre?: string
        }
        Relationships: []
      }
      boletos: {
        Row: {
          corrida_id: string
          created_at: string | null
          email_pasajero: string
          estado: Database["public"]["Enums"]["estado_boleto"] | null
          folio: string
          id: string
          nombre_pasajero: string
          precio_pagado: number
          tipo_boleto: Database["public"]["Enums"]["tipo_boleto"]
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          corrida_id: string
          created_at?: string | null
          email_pasajero: string
          estado?: Database["public"]["Enums"]["estado_boleto"] | null
          folio: string
          id?: string
          nombre_pasajero: string
          precio_pagado: number
          tipo_boleto: Database["public"]["Enums"]["tipo_boleto"]
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          corrida_id?: string
          created_at?: string | null
          email_pasajero?: string
          estado?: Database["public"]["Enums"]["estado_boleto"] | null
          folio?: string
          id?: string
          nombre_pasajero?: string
          precio_pagado?: number
          tipo_boleto?: Database["public"]["Enums"]["tipo_boleto"]
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "boletos_corrida_id_fkey"
            columns: ["corrida_id"]
            isOneToOne: false
            referencedRelation: "corridas"
            referencedColumns: ["id"]
          },
        ]
      }
      boletos_libres: {
        Row: {
          boleto_original_id: string
          created_at: string | null
          fecha_expiracion: string
          folio: string
          id: string
          usado: boolean | null
          usado_en_boleto_id: string | null
          valor: number
        }
        Insert: {
          boleto_original_id: string
          created_at?: string | null
          fecha_expiracion: string
          folio: string
          id?: string
          usado?: boolean | null
          usado_en_boleto_id?: string | null
          valor: number
        }
        Update: {
          boleto_original_id?: string
          created_at?: string | null
          fecha_expiracion?: string
          folio?: string
          id?: string
          usado?: boolean | null
          usado_en_boleto_id?: string | null
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "boletos_libres_boleto_original_id_fkey"
            columns: ["boleto_original_id"]
            isOneToOne: false
            referencedRelation: "boletos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "boletos_libres_usado_en_boleto_id_fkey"
            columns: ["usado_en_boleto_id"]
            isOneToOne: false
            referencedRelation: "boletos"
            referencedColumns: ["id"]
          },
        ]
      }
      corridas: {
        Row: {
          boletos_vendidos: number | null
          capacidad: number | null
          created_at: string | null
          fecha: string
          hora: string
          horario_id: string
          id: string
          ruta_id: string
        }
        Insert: {
          boletos_vendidos?: number | null
          capacidad?: number | null
          created_at?: string | null
          fecha: string
          hora: string
          horario_id: string
          id?: string
          ruta_id: string
        }
        Update: {
          boletos_vendidos?: number | null
          capacidad?: number | null
          created_at?: string | null
          fecha?: string
          hora?: string
          horario_id?: string
          id?: string
          ruta_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "corridas_horario_id_fkey"
            columns: ["horario_id"]
            isOneToOne: false
            referencedRelation: "horarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "corridas_ruta_id_fkey"
            columns: ["ruta_id"]
            isOneToOne: false
            referencedRelation: "rutas"
            referencedColumns: ["id"]
          },
        ]
      }
      historial_puntos: {
        Row: {
          boleto_id: string | null
          created_at: string | null
          descripcion: string | null
          id: string
          puntos: number
          tipo: string
          user_id: string
        }
        Insert: {
          boleto_id?: string | null
          created_at?: string | null
          descripcion?: string | null
          id?: string
          puntos: number
          tipo: string
          user_id: string
        }
        Update: {
          boleto_id?: string | null
          created_at?: string | null
          descripcion?: string | null
          id?: string
          puntos?: number
          tipo?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "historial_puntos_boleto_id_fkey"
            columns: ["boleto_id"]
            isOneToOne: false
            referencedRelation: "boletos"
            referencedColumns: ["id"]
          },
        ]
      }
      horarios: {
        Row: {
          activo: boolean | null
          created_at: string | null
          dias_semana: number[] | null
          hora: string
          id: string
          ruta_id: string
        }
        Insert: {
          activo?: boolean | null
          created_at?: string | null
          dias_semana?: number[] | null
          hora: string
          id?: string
          ruta_id: string
        }
        Update: {
          activo?: boolean | null
          created_at?: string | null
          dias_semana?: number[] | null
          hora?: string
          id?: string
          ruta_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "horarios_ruta_id_fkey"
            columns: ["ruta_id"]
            isOneToOne: false
            referencedRelation: "rutas"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string | null
          email: string
          fecha_nacimiento: string | null
          id: string
          nombre: string
          puntos_fidelidad: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          email: string
          fecha_nacimiento?: string | null
          id: string
          nombre: string
          puntos_fidelidad?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          fecha_nacimiento?: string | null
          id?: string
          nombre?: string
          puntos_fidelidad?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      recompensas: {
        Row: {
          activa: boolean | null
          created_at: string | null
          descripcion: string | null
          descuento_fijo: number | null
          descuento_porcentaje: number | null
          id: string
          nombre: string
          puntos_requeridos: number
          updated_at: string | null
        }
        Insert: {
          activa?: boolean | null
          created_at?: string | null
          descripcion?: string | null
          descuento_fijo?: number | null
          descuento_porcentaje?: number | null
          id?: string
          nombre: string
          puntos_requeridos: number
          updated_at?: string | null
        }
        Update: {
          activa?: boolean | null
          created_at?: string | null
          descripcion?: string | null
          descuento_fijo?: number | null
          descuento_porcentaje?: number | null
          id?: string
          nombre?: string
          puntos_requeridos?: number
          updated_at?: string | null
        }
        Relationships: []
      }
      recompensas_canjeadas: {
        Row: {
          aplicada: boolean | null
          aplicada_at: string | null
          boleto_aplicado_id: string | null
          created_at: string | null
          id: string
          recompensa_id: string
          user_id: string
        }
        Insert: {
          aplicada?: boolean | null
          aplicada_at?: string | null
          boleto_aplicado_id?: string | null
          created_at?: string | null
          id?: string
          recompensa_id: string
          user_id: string
        }
        Update: {
          aplicada?: boolean | null
          aplicada_at?: string | null
          boleto_aplicado_id?: string | null
          created_at?: string | null
          id?: string
          recompensa_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "recompensas_canjeadas_boleto_aplicado_id_fkey"
            columns: ["boleto_aplicado_id"]
            isOneToOne: false
            referencedRelation: "boletos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recompensas_canjeadas_recompensa_id_fkey"
            columns: ["recompensa_id"]
            isOneToOne: false
            referencedRelation: "recompensas"
            referencedColumns: ["id"]
          },
        ]
      }
      rutas: {
        Row: {
          activa: boolean | null
          created_at: string | null
          destino: string
          id: string
          origen: string
          precio: number
          updated_at: string | null
        }
        Insert: {
          activa?: boolean | null
          created_at?: string | null
          destino: string
          id?: string
          origen: string
          precio: number
          updated_at?: string | null
        }
        Update: {
          activa?: boolean | null
          created_at?: string | null
          destino?: string
          id?: string
          origen?: string
          precio?: number
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      generate_folio: { Args: never; Returns: string }
      get_boleto_by_folio: {
        Args: { p_folio: string }
        Returns: {
          corrida_id: string
          created_at: string | null
          email_pasajero: string
          estado: Database["public"]["Enums"]["estado_boleto"] | null
          folio: string
          id: string
          nombre_pasajero: string
          precio_pagado: number
          tipo_boleto: Database["public"]["Enums"]["tipo_boleto"]
          updated_at: string | null
          user_id: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "boletos"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      is_admin: { Args: never; Returns: boolean }
    }
    Enums: {
      estado_boleto: "activo" | "usado" | "cancelado" | "convertido_libre"
      tipo_boleto: "estudiante" | "adulto_mayor" | "menor" | "adulto"
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
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
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
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
      estado_boleto: ["activo", "usado", "cancelado", "convertido_libre"],
      tipo_boleto: ["estudiante", "adulto_mayor", "menor", "adulto"],
    },
  },
} as const
