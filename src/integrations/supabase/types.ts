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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      audit_logs: {
        Row: {
          action: string
          actor_id: string
          after_data: Json | null
          before_data: Json | null
          created_at: string
          id: string
          ledger: Database["public"]["Enums"]["ledger"] | null
          reason: string | null
          result: string
          transaction_id: string | null
        }
        Insert: {
          action: string
          actor_id: string
          after_data?: Json | null
          before_data?: Json | null
          created_at?: string
          id?: string
          ledger?: Database["public"]["Enums"]["ledger"] | null
          reason?: string | null
          result?: string
          transaction_id?: string | null
        }
        Update: {
          action?: string
          actor_id?: string
          after_data?: Json | null
          before_data?: Json | null
          created_at?: string
          id?: string
          ledger?: Database["public"]["Enums"]["ledger"] | null
          reason?: string | null
          result?: string
          transaction_id?: string | null
        }
        Relationships: []
      }
      bank_accounts: {
        Row: {
          created_at: string
          id: string
          ledger: Database["public"]["Enums"]["ledger"]
          name: string
          opening_balance: number
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          ledger: Database["public"]["Enums"]["ledger"]
          name: string
          opening_balance?: number
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          ledger?: Database["public"]["Enums"]["ledger"]
          name?: string
          opening_balance?: number
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      import_batches: {
        Row: {
          created_at: string
          created_by: string
          file_name: string
          id: string
          ledger: Database["public"]["Enums"]["ledger"]
          rows_imported: number
          rows_skipped: number
          rows_total: number
          status: string
        }
        Insert: {
          created_at?: string
          created_by?: string
          file_name: string
          id?: string
          ledger: Database["public"]["Enums"]["ledger"]
          rows_imported?: number
          rows_skipped?: number
          rows_total?: number
          status?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          file_name?: string
          id?: string
          ledger?: Database["public"]["Enums"]["ledger"]
          rows_imported?: number
          rows_skipped?: number
          rows_total?: number
          status?: string
        }
        Relationships: []
      }
      pl_activity_logs: {
        Row: {
          action: string
          actor_id: string | null
          actor_name: string | null
          created_at: string
          details: Json | null
          entity: string
          entity_id: string | null
          id: string
          packing_list_id: string | null
          summary: string
        }
        Insert: {
          action: string
          actor_id?: string | null
          actor_name?: string | null
          created_at?: string
          details?: Json | null
          entity: string
          entity_id?: string | null
          id?: string
          packing_list_id?: string | null
          summary: string
        }
        Update: {
          action?: string
          actor_id?: string | null
          actor_name?: string | null
          created_at?: string
          details?: Json | null
          entity?: string
          entity_id?: string | null
          id?: string
          packing_list_id?: string | null
          summary?: string
        }
        Relationships: []
      }
      pl_items: {
        Row: {
          condition: string
          created_at: string
          height_cm: number | null
          id: string
          length_cm: number | null
          line_no: number
          name: string
          notes: string | null
          packing_list_id: string
          qty: number
          unit: string
          value_idr: number | null
          volume_m3: number
          weight_kg: number
          width_cm: number | null
        }
        Insert: {
          condition?: string
          created_at?: string
          height_cm?: number | null
          id?: string
          length_cm?: number | null
          line_no: number
          name: string
          notes?: string | null
          packing_list_id: string
          qty: number
          unit: string
          value_idr?: number | null
          volume_m3?: number
          weight_kg?: number
          width_cm?: number | null
        }
        Update: {
          condition?: string
          created_at?: string
          height_cm?: number | null
          id?: string
          length_cm?: number | null
          line_no?: number
          name?: string
          notes?: string | null
          packing_list_id?: string
          qty?: number
          unit?: string
          value_idr?: number | null
          volume_m3?: number
          weight_kg?: number
          width_cm?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "pl_items_packing_list_id_fkey"
            columns: ["packing_list_id"]
            isOneToOne: false
            referencedRelation: "pl_packing_lists"
            referencedColumns: ["id"]
          },
        ]
      }
      pl_packing_lists: {
        Row: {
          consignee_id: string
          container_no: string | null
          created_at: string
          created_by: string | null
          destination_port_id: string | null
          eta: string | null
          etd: string | null
          id: string
          item_count: number
          notes: string | null
          origin_port_id: string | null
          pl_date: string
          pl_number: string
          seal_no: string | null
          shipper_id: string
          status: Database["public"]["Enums"]["pl_status"]
          status_changed_at: string
          status_changed_by: string | null
          total_koli: number
          total_value: number
          total_volume_m3: number
          total_weight_kg: number
          updated_at: string
          updated_by: string | null
          vessel_id: string | null
          voyage_no: string | null
        }
        Insert: {
          consignee_id: string
          container_no?: string | null
          created_at?: string
          created_by?: string | null
          destination_port_id?: string | null
          eta?: string | null
          etd?: string | null
          id?: string
          item_count?: number
          notes?: string | null
          origin_port_id?: string | null
          pl_date?: string
          pl_number: string
          seal_no?: string | null
          shipper_id: string
          status?: Database["public"]["Enums"]["pl_status"]
          status_changed_at?: string
          status_changed_by?: string | null
          total_koli?: number
          total_value?: number
          total_volume_m3?: number
          total_weight_kg?: number
          updated_at?: string
          updated_by?: string | null
          vessel_id?: string | null
          voyage_no?: string | null
        }
        Update: {
          consignee_id?: string
          container_no?: string | null
          created_at?: string
          created_by?: string | null
          destination_port_id?: string | null
          eta?: string | null
          etd?: string | null
          id?: string
          item_count?: number
          notes?: string | null
          origin_port_id?: string | null
          pl_date?: string
          pl_number?: string
          seal_no?: string | null
          shipper_id?: string
          status?: Database["public"]["Enums"]["pl_status"]
          status_changed_at?: string
          status_changed_by?: string | null
          total_koli?: number
          total_value?: number
          total_volume_m3?: number
          total_weight_kg?: number
          updated_at?: string
          updated_by?: string | null
          vessel_id?: string | null
          voyage_no?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pl_packing_lists_consignee_id_fkey"
            columns: ["consignee_id"]
            isOneToOne: false
            referencedRelation: "pl_parties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pl_packing_lists_destination_port_id_fkey"
            columns: ["destination_port_id"]
            isOneToOne: false
            referencedRelation: "pl_ports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pl_packing_lists_origin_port_id_fkey"
            columns: ["origin_port_id"]
            isOneToOne: false
            referencedRelation: "pl_ports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pl_packing_lists_shipper_id_fkey"
            columns: ["shipper_id"]
            isOneToOne: false
            referencedRelation: "pl_parties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pl_packing_lists_vessel_id_fkey"
            columns: ["vessel_id"]
            isOneToOne: false
            referencedRelation: "pl_vessels"
            referencedColumns: ["id"]
          },
        ]
      }
      pl_parties: {
        Row: {
          address: string | null
          city: string | null
          company: string | null
          created_at: string
          created_by: string | null
          id: string
          kind: string
          name: string
          notes: string | null
          phone: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          city?: string | null
          company?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          kind: string
          name: string
          notes?: string | null
          phone?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          city?: string | null
          company?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          kind?: string
          name?: string
          notes?: string | null
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      pl_ports: {
        Row: {
          city: string | null
          code: string | null
          created_at: string
          created_by: string | null
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          city?: string | null
          code?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          city?: string | null
          code?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      pl_status_history: {
        Row: {
          changed_at: string
          changed_by: string | null
          changed_by_name: string | null
          from_status: Database["public"]["Enums"]["pl_status"] | null
          id: string
          note: string | null
          packing_list_id: string
          to_status: Database["public"]["Enums"]["pl_status"]
        }
        Insert: {
          changed_at?: string
          changed_by?: string | null
          changed_by_name?: string | null
          from_status?: Database["public"]["Enums"]["pl_status"] | null
          id?: string
          note?: string | null
          packing_list_id: string
          to_status: Database["public"]["Enums"]["pl_status"]
        }
        Update: {
          changed_at?: string
          changed_by?: string | null
          changed_by_name?: string | null
          from_status?: Database["public"]["Enums"]["pl_status"] | null
          id?: string
          note?: string | null
          packing_list_id?: string
          to_status?: Database["public"]["Enums"]["pl_status"]
        }
        Relationships: [
          {
            foreignKeyName: "pl_status_history_packing_list_id_fkey"
            columns: ["packing_list_id"]
            isOneToOne: false
            referencedRelation: "pl_packing_lists"
            referencedColumns: ["id"]
          },
        ]
      }
      pl_vessels: {
        Row: {
          call_sign: string | null
          created_at: string
          created_by: string | null
          id: string
          name: string
          notes: string | null
          operator: string | null
          updated_at: string
        }
        Insert: {
          call_sign?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          name: string
          notes?: string | null
          operator?: string | null
          updated_at?: string
        }
        Update: {
          call_sign?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          name?: string
          notes?: string | null
          operator?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          full_name: string
          id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email?: string
          full_name?: string
          id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      reconciliations: {
        Row: {
          account_name: string
          as_of: string
          balance_admin1: number
          balance_admin2: number
          created_at: string
          created_by: string
          difference: number
          id: string
          notes: string | null
        }
        Insert: {
          account_name: string
          as_of: string
          balance_admin1: number
          balance_admin2: number
          created_at?: string
          created_by?: string
          difference: number
          id?: string
          notes?: string | null
        }
        Update: {
          account_name?: string
          as_of?: string
          balance_admin1?: number
          balance_admin2?: number
          created_at?: string
          created_by?: string
          difference?: number
          id?: string
          notes?: string | null
        }
        Relationships: []
      }
      transactions: {
        Row: {
          account_id: string
          amount: number
          category: string | null
          client_ref: string | null
          created_at: string
          created_by: string
          description: string
          fingerprint: string | null
          id: string
          import_id: string | null
          ledger: Database["public"]["Enums"]["ledger"]
          review_status: Database["public"]["Enums"]["review_status"]
          reviewed_at: string | null
          reviewed_by: string | null
          transfer_id: string | null
          tx_date: string
          tx_type: Database["public"]["Enums"]["tx_type"]
          updated_at: string
        }
        Insert: {
          account_id: string
          amount: number
          category?: string | null
          client_ref?: string | null
          created_at?: string
          created_by?: string
          description: string
          fingerprint?: string | null
          id?: string
          import_id?: string | null
          ledger: Database["public"]["Enums"]["ledger"]
          review_status?: Database["public"]["Enums"]["review_status"]
          reviewed_at?: string | null
          reviewed_by?: string | null
          transfer_id?: string | null
          tx_date: string
          tx_type: Database["public"]["Enums"]["tx_type"]
          updated_at?: string
        }
        Update: {
          account_id?: string
          amount?: number
          category?: string | null
          client_ref?: string | null
          created_at?: string
          created_by?: string
          description?: string
          fingerprint?: string | null
          id?: string
          import_id?: string | null
          ledger?: Database["public"]["Enums"]["ledger"]
          review_status?: Database["public"]["Enums"]["review_status"]
          reviewed_at?: string | null
          reviewed_by?: string | null
          transfer_id?: string | null
          tx_date?: string
          tx_type?: Database["public"]["Enums"]["tx_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "transactions_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "account_balances"
            referencedColumns: ["account_id"]
          },
          {
            foreignKeyName: "transactions_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "bank_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_import_id_fkey"
            columns: ["import_id"]
            isOneToOne: false
            referencedRelation: "import_batches"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          disabled_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          disabled_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          disabled_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      account_balances: {
        Row: {
          account_id: string | null
          balance: number | null
          expense: number | null
          income: number | null
          ledger: Database["public"]["Enums"]["ledger"] | null
          name: string | null
          opening_balance: number | null
          sort_order: number | null
          transfer_in: number | null
          transfer_out: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      _audit_account: {
        Args: { _action: string; _after: Json; _before: Json; _target: string }
        Returns: undefined
      }
      _create_staff_account: {
        Args: {
          _email: string
          _full_name: string
          _password: string
          _role: Database["public"]["Enums"]["app_role"]
        }
        Returns: string
      }
      _require_super_admin: { Args: never; Returns: undefined }
      _role_label: {
        Args: { _role: Database["public"]["Enums"]["app_role"] }
        Returns: string
      }
      admin_create_user: {
        Args: {
          _email: string
          _full_name: string
          _password: string
          _role: Database["public"]["Enums"]["app_role"]
        }
        Returns: string
      }
      admin_list_users: {
        Args: never
        Returns: {
          active: boolean
          created_at: string
          email: string
          full_name: string
          id: string
          last_sign_in_at: string
          role: Database["public"]["Enums"]["app_role"]
        }[]
      }
      admin_reset_password: {
        Args: { _password: string; _user_id: string }
        Returns: undefined
      }
      admin_set_user_active: {
        Args: { _active: boolean; _user_id: string }
        Returns: undefined
      }
      admin_update_user: {
        Args: {
          _email: string
          _full_name: string
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: undefined
      }
      bootstrap_super_admin: {
        Args: { _email: string; _full_name: string; _password: string }
        Returns: string
      }
      create_bank_account: {
        Args: {
          p_ledger: Database["public"]["Enums"]["ledger"]
          p_name: string
          p_opening_balance?: number
          p_sort_order?: number
        }
        Returns: {
          created_at: string
          id: string
          ledger: Database["public"]["Enums"]["ledger"]
          name: string
          opening_balance: number
          sort_order: number
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "bank_accounts"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      create_transaction: {
        Args: {
          p_account_id: string
          p_amount: number
          p_category: string
          p_client_ref: string
          p_date: string
          p_description: string
          p_ledger: Database["public"]["Enums"]["ledger"]
          p_type: Database["public"]["Enums"]["tx_type"]
        }
        Returns: {
          account_id: string
          amount: number
          category: string | null
          client_ref: string | null
          created_at: string
          created_by: string
          description: string
          fingerprint: string | null
          id: string
          import_id: string | null
          ledger: Database["public"]["Enums"]["ledger"]
          review_status: Database["public"]["Enums"]["review_status"]
          reviewed_at: string | null
          reviewed_by: string | null
          transfer_id: string | null
          tx_date: string
          tx_type: Database["public"]["Enums"]["tx_type"]
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "transactions"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      create_transfer: {
        Args: {
          p_amount: number
          p_client_ref: string
          p_date: string
          p_from: string
          p_note: string
          p_to: string
        }
        Returns: string
      }
      current_ledger: {
        Args: never
        Returns: Database["public"]["Enums"]["ledger"]
      }
      delete_bank_account: { Args: { p_id: string }; Returns: undefined }
      delete_transaction: {
        Args: { p_id: string; p_reason: string }
        Returns: undefined
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      import_transactions: {
        Args: { p_file_name: string; p_rows: Json; p_skipped_invalid: number }
        Returns: {
          created_at: string
          created_by: string
          file_name: string
          id: string
          ledger: Database["public"]["Enums"]["ledger"]
          rows_imported: number
          rows_skipped: number
          rows_total: number
          status: string
        }
        SetofOptions: {
          from: "*"
          to: "import_batches"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      is_staff: { Args: never; Returns: boolean }
      pl_actor_name: { Args: never; Returns: string }
      pl_item_volume: {
        Args: {
          p_h: number
          p_l: number
          p_manual: number
          p_qty: number
          p_w: number
        }
        Returns: number
      }
      save_packing_list: {
        Args: { p_header: Json; p_id: string; p_items: Json }
        Returns: {
          consignee_id: string
          container_no: string | null
          created_at: string
          created_by: string | null
          destination_port_id: string | null
          eta: string | null
          etd: string | null
          id: string
          item_count: number
          notes: string | null
          origin_port_id: string | null
          pl_date: string
          pl_number: string
          seal_no: string | null
          shipper_id: string
          status: Database["public"]["Enums"]["pl_status"]
          status_changed_at: string
          status_changed_by: string | null
          total_koli: number
          total_value: number
          total_volume_m3: number
          total_weight_kg: number
          updated_at: string
          updated_by: string | null
          vessel_id: string | null
          voyage_no: string | null
        }
        SetofOptions: {
          from: "*"
          to: "pl_packing_lists"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      set_opening_balance: {
        Args: { p_account_id: string; p_amount: number; p_reason: string }
        Returns: undefined
      }
      set_packing_list_status: {
        Args: {
          p_id: string
          p_note: string
          p_status: Database["public"]["Enums"]["pl_status"]
        }
        Returns: {
          consignee_id: string
          container_no: string | null
          created_at: string
          created_by: string | null
          destination_port_id: string | null
          eta: string | null
          etd: string | null
          id: string
          item_count: number
          notes: string | null
          origin_port_id: string | null
          pl_date: string
          pl_number: string
          seal_no: string | null
          shipper_id: string
          status: Database["public"]["Enums"]["pl_status"]
          status_changed_at: string
          status_changed_by: string | null
          total_koli: number
          total_value: number
          total_volume_m3: number
          total_weight_kg: number
          updated_at: string
          updated_by: string | null
          vessel_id: string | null
          voyage_no: string | null
        }
        SetofOptions: {
          from: "*"
          to: "pl_packing_lists"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      set_review_status: {
        Args: {
          p_id: string
          p_status: Database["public"]["Enums"]["review_status"]
        }
        Returns: undefined
      }
      setup_status: { Args: never; Returns: boolean }
      update_bank_account: {
        Args: { p_id: string; p_name: string; p_sort_order: number }
        Returns: {
          created_at: string
          id: string
          ledger: Database["public"]["Enums"]["ledger"]
          name: string
          opening_balance: number
          sort_order: number
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "bank_accounts"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      update_transaction: {
        Args: {
          p_account_id: string
          p_amount: number
          p_category: string
          p_date: string
          p_description: string
          p_id: string
          p_reason: string
          p_type: Database["public"]["Enums"]["tx_type"]
        }
        Returns: {
          account_id: string
          amount: number
          category: string | null
          client_ref: string | null
          created_at: string
          created_by: string
          description: string
          fingerprint: string | null
          id: string
          import_id: string | null
          ledger: Database["public"]["Enums"]["ledger"]
          review_status: Database["public"]["Enums"]["review_status"]
          reviewed_at: string | null
          reviewed_by: string | null
          transfer_id: string | null
          tx_date: string
          tx_type: Database["public"]["Enums"]["tx_type"]
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "transactions"
          isOneToOne: true
          isSetofReturn: false
        }
      }
    }
    Enums: {
      app_role: "super_admin" | "admin1" | "admin2" | "admin_packing"
      ledger: "admin1" | "admin2"
      pl_status:
        | "draft"
        | "siap_dimuat"
        | "dimuat"
        | "berlayar"
        | "tiba"
        | "selesai"
        | "dibatalkan"
      review_status: "unchecked" | "match" | "mismatch"
      tx_type: "income" | "expense" | "transfer_in" | "transfer_out"
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
      app_role: ["super_admin", "admin1", "admin2", "admin_packing"],
      ledger: ["admin1", "admin2"],
      pl_status: [
        "draft",
        "siap_dimuat",
        "dimuat",
        "berlayar",
        "tiba",
        "selesai",
        "dibatalkan",
      ],
      review_status: ["unchecked", "match", "mismatch"],
      tx_type: ["income", "expense", "transfer_in", "transfer_out"],
    },
  },
} as const
