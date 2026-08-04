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
      appointments: {
        Row: {
          category: string
          client_id: string | null
          created_at: string
          deleted: boolean
          duration_min: number | null
          google_calendar_id: string | null
          google_event_id: string | null
          google_sync_error: string | null
          google_sync_status: string
          google_synced_at: string | null
          id: string
          last_synced_at: string | null
          notes: string | null
          organization_id: string | null
          owner_id: string
          pet_id: string | null
          scheduled_at: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          category?: string
          client_id?: string | null
          created_at?: string
          deleted?: boolean
          duration_min?: number | null
          google_calendar_id?: string | null
          google_event_id?: string | null
          google_sync_error?: string | null
          google_sync_status?: string
          google_synced_at?: string | null
          id?: string
          last_synced_at?: string | null
          notes?: string | null
          organization_id?: string | null
          owner_id: string
          pet_id?: string | null
          scheduled_at: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          category?: string
          client_id?: string | null
          created_at?: string
          deleted?: boolean
          duration_min?: number | null
          google_calendar_id?: string | null
          google_event_id?: string | null
          google_sync_error?: string | null
          google_sync_status?: string
          google_synced_at?: string | null
          id?: string
          last_synced_at?: string | null
          notes?: string | null
          organization_id?: string | null
          owner_id?: string
          pet_id?: string | null
          scheduled_at?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "appointments_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_pet_id_fkey"
            columns: ["pet_id"]
            isOneToOne: false
            referencedRelation: "pets"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          created_at: string
          details: Json
          id: string
          module: string
          organization_id: string | null
          record_id: string | null
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string
          details?: Json
          id?: string
          module: string
          organization_id?: string | null
          record_id?: string | null
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string
          details?: Json
          id?: string
          module?: string
          organization_id?: string | null
          record_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          address: string | null
          city: string | null
          created_at: string
          deleted: boolean
          document: string | null
          email: string | null
          id: string
          name: string
          notes: string | null
          organization_id: string | null
          owner_id: string
          phone: string | null
          updated_at: string
          whatsapp: string | null
        }
        Insert: {
          address?: string | null
          city?: string | null
          created_at?: string
          deleted?: boolean
          document?: string | null
          email?: string | null
          id?: string
          name: string
          notes?: string | null
          organization_id?: string | null
          owner_id: string
          phone?: string | null
          updated_at?: string
          whatsapp?: string | null
        }
        Update: {
          address?: string | null
          city?: string | null
          created_at?: string
          deleted?: boolean
          document?: string | null
          email?: string | null
          id?: string
          name?: string
          notes?: string | null
          organization_id?: string | null
          owner_id?: string
          phone?: string | null
          updated_at?: string
          whatsapp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clients_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      document_shares: {
        Row: {
          channel: string
          client_id: string | null
          created_at: string
          deleted: boolean
          error: string | null
          expires_at: string | null
          id: string
          medical_record_id: string | null
          organization_id: string | null
          owner_id: string
          pet_id: string | null
          phone: string | null
          status: string
          storage_path: string | null
          updated_at: string
        }
        Insert: {
          channel?: string
          client_id?: string | null
          created_at?: string
          deleted?: boolean
          error?: string | null
          expires_at?: string | null
          id?: string
          medical_record_id?: string | null
          organization_id?: string | null
          owner_id: string
          pet_id?: string | null
          phone?: string | null
          status?: string
          storage_path?: string | null
          updated_at?: string
        }
        Update: {
          channel?: string
          client_id?: string | null
          created_at?: string
          deleted?: boolean
          error?: string | null
          expires_at?: string | null
          id?: string
          medical_record_id?: string | null
          organization_id?: string | null
          owner_id?: string
          pet_id?: string | null
          phone?: string | null
          status?: string
          storage_path?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "document_shares_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      financial_transactions: {
        Row: {
          amount: number
          category: string | null
          client_id: string | null
          created_at: string
          deleted: boolean
          description: string
          due_date: string | null
          id: string
          notes: string | null
          organization_id: string | null
          owner_id: string
          paid_at: string | null
          payment_method: string | null
          type: string
          updated_at: string
        }
        Insert: {
          amount?: number
          category?: string | null
          client_id?: string | null
          created_at?: string
          deleted?: boolean
          description: string
          due_date?: string | null
          id?: string
          notes?: string | null
          organization_id?: string | null
          owner_id: string
          paid_at?: string | null
          payment_method?: string | null
          type?: string
          updated_at?: string
        }
        Update: {
          amount?: number
          category?: string | null
          client_id?: string | null
          created_at?: string
          deleted?: boolean
          description?: string
          due_date?: string | null
          id?: string
          notes?: string | null
          organization_id?: string | null
          owner_id?: string
          paid_at?: string | null
          payment_method?: string | null
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "financial_transactions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      google_calendar_configs: {
        Row: {
          access_token: string | null
          calendar_id: string | null
          client_id: string | null
          client_secret: string | null
          created_at: string | null
          deleted: boolean | null
          expiry_date: string | null
          id: string
          is_active: boolean | null
          organization_id: string
          refresh_token: string | null
          updated_at: string | null
        }
        Insert: {
          access_token?: string | null
          calendar_id?: string | null
          client_id?: string | null
          client_secret?: string | null
          created_at?: string | null
          deleted?: boolean | null
          expiry_date?: string | null
          id?: string
          is_active?: boolean | null
          organization_id: string
          refresh_token?: string | null
          updated_at?: string | null
        }
        Update: {
          access_token?: string | null
          calendar_id?: string | null
          client_id?: string | null
          client_secret?: string | null
          created_at?: string | null
          deleted?: boolean | null
          expiry_date?: string | null
          id?: string
          is_active?: boolean | null
          organization_id?: string
          refresh_token?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "google_calendar_configs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      google_oauth_connections: {
        Row: {
          access_token: string | null
          calendar_id: string
          created_at: string
          expiry_date: string | null
          google_email: string | null
          id: string
          is_active: boolean
          last_error: string | null
          organization_id: string | null
          refresh_token: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          access_token?: string | null
          calendar_id?: string
          created_at?: string
          expiry_date?: string | null
          google_email?: string | null
          id?: string
          is_active?: boolean
          last_error?: string | null
          organization_id?: string | null
          refresh_token?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          access_token?: string | null
          calendar_id?: string
          created_at?: string
          expiry_date?: string | null
          google_email?: string | null
          id?: string
          is_active?: boolean
          last_error?: string | null
          organization_id?: string | null
          refresh_token?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "google_oauth_connections_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      google_oauth_states: {
        Row: {
          created_at: string
          expires_at: string
          nonce: string
          organization_id: string | null
          return_url: string
          state: string
          user_id: string
        }
        Insert: {
          created_at?: string
          expires_at?: string
          nonce: string
          organization_id?: string | null
          return_url: string
          state: string
          user_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          nonce?: string
          organization_id?: string | null
          return_url?: string
          state?: string
          user_id?: string
        }
        Relationships: []
      }
      herd_animals: {
        Row: {
          birth_date: string | null
          breed: string | null
          created_at: string
          deleted: boolean
          id: string
          identification: string
          notes: string | null
          organization_id: string | null
          owner_id: string
          property_id: string
          sex: string | null
          species: string | null
          status: string
          updated_at: string
        }
        Insert: {
          birth_date?: string | null
          breed?: string | null
          created_at?: string
          deleted?: boolean
          id?: string
          identification: string
          notes?: string | null
          organization_id?: string | null
          owner_id: string
          property_id: string
          sex?: string | null
          species?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          birth_date?: string | null
          breed?: string | null
          created_at?: string
          deleted?: boolean
          id?: string
          identification?: string
          notes?: string | null
          organization_id?: string | null
          owner_id?: string
          property_id?: string
          sex?: string | null
          species?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "herd_animals_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      medical_records: {
        Row: {
          anamnesis: string | null
          appointment_date: string
          attachments: Json
          client_id: string | null
          created_at: string
          deleted: boolean
          diagnosis: string | null
          id: string
          observations: string | null
          organization_id: string | null
          owner_id: string
          pet_id: string
          prescription: string | null
          signature_url: string | null
          symptoms: string | null
          temperature: number | null
          updated_at: string
          weight: number | null
        }
        Insert: {
          anamnesis?: string | null
          appointment_date?: string
          attachments?: Json
          client_id?: string | null
          created_at?: string
          deleted?: boolean
          diagnosis?: string | null
          id?: string
          observations?: string | null
          organization_id?: string | null
          owner_id: string
          pet_id: string
          prescription?: string | null
          signature_url?: string | null
          symptoms?: string | null
          temperature?: number | null
          updated_at?: string
          weight?: number | null
        }
        Update: {
          anamnesis?: string | null
          appointment_date?: string
          attachments?: Json
          client_id?: string | null
          created_at?: string
          deleted?: boolean
          diagnosis?: string | null
          id?: string
          observations?: string | null
          organization_id?: string | null
          owner_id?: string
          pet_id?: string
          prescription?: string | null
          signature_url?: string | null
          symptoms?: string | null
          temperature?: number | null
          updated_at?: string
          weight?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "medical_records_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      odontogram_teeth: {
        Row: {
          created_at: string
          deleted: boolean
          id: string
          images: Json
          notes: string | null
          odontogram_id: string
          organization_id: string | null
          owner_id: string
          procedure: string | null
          status: string
          tooth_number: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          deleted?: boolean
          id?: string
          images?: Json
          notes?: string | null
          odontogram_id: string
          organization_id?: string | null
          owner_id: string
          procedure?: string | null
          status?: string
          tooth_number: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          deleted?: boolean
          id?: string
          images?: Json
          notes?: string | null
          odontogram_id?: string
          organization_id?: string | null
          owner_id?: string
          procedure?: string | null
          status?: string
          tooth_number?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "odontogram_teeth_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      odontograms: {
        Row: {
          created_at: string
          deleted: boolean
          exam_date: string
          id: string
          notes: string | null
          organization_id: string | null
          owner_id: string
          pet_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          deleted?: boolean
          exam_date?: string
          id?: string
          notes?: string | null
          organization_id?: string | null
          owner_id: string
          pet_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          deleted?: boolean
          exam_date?: string
          id?: string
          notes?: string | null
          organization_id?: string | null
          owner_id?: string
          pet_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "odontograms_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_members: {
        Row: {
          created_at: string
          id: string
          organization_id: string
          role: Database["public"]["Enums"]["org_role"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          organization_id: string
          role?: Database["public"]["Enums"]["org_role"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          organization_id?: string
          role?: Database["public"]["Enums"]["org_role"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_members_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          created_at: string
          created_by: string | null
          deleted: boolean | null
          id: string
          name: string
          slug: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          deleted?: boolean | null
          id?: string
          name: string
          slug?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          deleted?: boolean | null
          id?: string
          name?: string
          slug?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      pets: {
        Row: {
          allergies: string | null
          birth_date: string | null
          breed: string | null
          client_id: string
          color: string | null
          created_at: string
          deleted: boolean
          diseases: string | null
          id: string
          medications: string | null
          name: string
          neutered: boolean | null
          organization_id: string | null
          owner_id: string
          photo_url: string | null
          photo_urls: Json
          sex: string | null
          species: string | null
          updated_at: string
          weight: number | null
        }
        Insert: {
          allergies?: string | null
          birth_date?: string | null
          breed?: string | null
          client_id: string
          color?: string | null
          created_at?: string
          deleted?: boolean
          diseases?: string | null
          id?: string
          medications?: string | null
          name: string
          neutered?: boolean | null
          organization_id?: string | null
          owner_id: string
          photo_url?: string | null
          photo_urls?: Json
          sex?: string | null
          species?: string | null
          updated_at?: string
          weight?: number | null
        }
        Update: {
          allergies?: string | null
          birth_date?: string | null
          breed?: string | null
          client_id?: string
          color?: string | null
          created_at?: string
          deleted?: boolean
          diseases?: string | null
          id?: string
          medications?: string | null
          name?: string
          neutered?: boolean | null
          organization_id?: string | null
          owner_id?: string
          photo_url?: string | null
          photo_urls?: Json
          sex?: string | null
          species?: string | null
          updated_at?: string
          weight?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "pets_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pets_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          crmv: string | null
          email: string | null
          full_name: string | null
          id: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          crmv?: string | null
          email?: string | null
          full_name?: string | null
          id: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          crmv?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      properties: {
        Row: {
          address: string | null
          area_hectares: number | null
          city: string | null
          client_id: string | null
          created_at: string
          deleted: boolean
          id: string
          latitude: number | null
          longitude: number | null
          name: string
          notes: string | null
          organization_id: string | null
          owner_id: string
          state: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          area_hectares?: number | null
          city?: string | null
          client_id?: string | null
          created_at?: string
          deleted?: boolean
          id?: string
          latitude?: number | null
          longitude?: number | null
          name: string
          notes?: string | null
          organization_id?: string | null
          owner_id: string
          state?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          area_hectares?: number | null
          city?: string | null
          client_id?: string | null
          created_at?: string
          deleted?: boolean
          id?: string
          latitude?: number | null
          longitude?: number | null
          name?: string
          notes?: string | null
          organization_id?: string | null
          owner_id?: string
          state?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "properties_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      rural_visits: {
        Row: {
          completed_at: string | null
          created_at: string
          deleted: boolean
          id: string
          latitude: number | null
          longitude: number | null
          notes: string | null
          organization_id: string | null
          owner_id: string
          property_id: string
          purpose: string | null
          scheduled_at: string
          updated_at: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          deleted?: boolean
          id?: string
          latitude?: number | null
          longitude?: number | null
          notes?: string | null
          organization_id?: string | null
          owner_id: string
          property_id: string
          purpose?: string | null
          scheduled_at?: string
          updated_at?: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          deleted?: boolean
          id?: string
          latitude?: number | null
          longitude?: number | null
          notes?: string | null
          organization_id?: string | null
          owner_id?: string
          property_id?: string
          purpose?: string | null
          scheduled_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "rural_visits_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
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
      vaccines: {
        Row: {
          applied_at: string
          created_at: string
          deleted: boolean
          id: string
          name: string
          next_due: string | null
          notes: string | null
          organization_id: string | null
          owner_id: string
          pet_id: string
          updated_at: string
        }
        Insert: {
          applied_at: string
          created_at?: string
          deleted?: boolean
          id?: string
          name: string
          next_due?: string | null
          notes?: string | null
          organization_id?: string | null
          owner_id: string
          pet_id: string
          updated_at?: string
        }
        Update: {
          applied_at?: string
          created_at?: string
          deleted?: boolean
          id?: string
          name?: string
          next_due?: string | null
          notes?: string | null
          organization_id?: string | null
          owner_id?: string
          pet_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "vaccines_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vaccines_pet_id_fkey"
            columns: ["pet_id"]
            isOneToOne: false
            referencedRelation: "pets"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_organizations: { Args: never; Returns: string[] }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_org_admin: { Args: { _org_id: string }; Returns: boolean }
      shares_organization: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role:
        | "admin"
        | "veterinario"
        | "recepcao"
        | "veterinarian"
        | "reception"
      org_role:
        | "owner"
        | "admin"
        | "member"
        | "viewer"
        | "veterinarian"
        | "reception"
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
      app_role: [
        "admin",
        "veterinario",
        "recepcao",
        "veterinarian",
        "reception",
      ],
      org_role: [
        "owner",
        "admin",
        "member",
        "viewer",
        "veterinarian",
        "reception",
      ],
    },
  },
} as const
