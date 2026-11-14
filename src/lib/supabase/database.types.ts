export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      access_events: {
        Row: {
          actor_id: string | null;
          email: string | null;
          id: number;
          kind: string;
          occurred_at: string;
          project_id: string;
        };
        Insert: {
          actor_id?: string | null;
          email?: string | null;
          id?: never;
          kind: string;
          occurred_at?: string;
          project_id: string;
        };
        Update: {
          actor_id?: string | null;
          email?: string | null;
          id?: never;
          kind?: string;
          occurred_at?: string;
          project_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "access_events_actor_id_fkey";
            columns: ["actor_id"];
            isOneToOne: false;
            referencedRelation: "team_members";
            referencedColumns: ["user_id"];
          },
          {
            foreignKeyName: "access_events_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
        ];
      };
      consultation_requests: {
        Row: {
          consent_at: string;
          created_at: string;
          email: string;
          id: string;
          ip_hash: string;
          locale: string;
          message: string;
          name: string;
          notified_at: string | null;
          phone: string | null;
          service: string;
          status: string;
        };
        Insert: {
          consent_at: string;
          created_at?: string;
          email: string;
          id?: string;
          ip_hash: string;
          locale: string;
          message: string;
          name: string;
          notified_at?: string | null;
          phone?: string | null;
          service: string;
          status?: string;
        };
        Update: {
          consent_at?: string;
          created_at?: string;
          email?: string;
          id?: string;
          ip_hash?: string;
          locale?: string;
          message?: string;
          name?: string;
          notified_at?: string | null;
          phone?: string | null;
          service?: string;
          status?: string;
        };
        Relationships: [];
      };
      newsletter_subscribers: {
        Row: {
          confirmed_at: string | null;
          consent_at: string;
          created_at: string;
          email: string;
          id: string;
          locale: string;
          status: string;
          unsubscribed_at: string | null;
        };
        Insert: {
          confirmed_at?: string | null;
          consent_at: string;
          created_at?: string;
          email: string;
          id?: string;
          locale: string;
          status?: string;
          unsubscribed_at?: string | null;
        };
        Update: {
          confirmed_at?: string | null;
          consent_at?: string;
          created_at?: string;
          email?: string;
          id?: string;
          locale?: string;
          status?: string;
          unsubscribed_at?: string | null;
        };
        Relationships: [];
      };
      portal_settings: {
        Row: {
          allowed_team_domain: string | null;
          code_max_tries: number;
          daily_digest: boolean;
          id: boolean;
          lockout_minutes: number;
          notify_first_client_sign_in: boolean;
          session_days: number;
          updated_at: string;
        };
        Insert: {
          allowed_team_domain?: string | null;
          code_max_tries?: number;
          daily_digest?: boolean;
          id?: boolean;
          lockout_minutes?: number;
          notify_first_client_sign_in?: boolean;
          session_days?: number;
          updated_at?: string;
        };
        Update: {
          allowed_team_domain?: string | null;
          code_max_tries?: number;
          daily_digest?: boolean;
          id?: boolean;
          lockout_minutes?: number;
          notify_first_client_sign_in?: boolean;
          session_days?: number;
          updated_at?: string;
        };
        Relationships: [];
      };
      project_clients: {
        Row: {
          email: string;
          id: string;
          invited_at: string;
          last_sign_in_at: string | null;
          locale: string;
          name: string | null;
          project_id: string;
          removed_at: string | null;
          status: string;
          user_id: string | null;
        };
        Insert: {
          email: string;
          id?: string;
          invited_at?: string;
          last_sign_in_at?: string | null;
          locale?: string;
          name?: string | null;
          project_id: string;
          removed_at?: string | null;
          status?: string;
          user_id?: string | null;
        };
        Update: {
          email?: string;
          id?: string;
          invited_at?: string;
          last_sign_in_at?: string | null;
          locale?: string;
          name?: string | null;
          project_id?: string;
          removed_at?: string | null;
          status?: string;
          user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "project_clients_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
        ];
      };
      project_files: {
        Row: {
          content_type: string;
          created_at: string;
          id: string;
          name: string;
          project_id: string;
          shared: boolean;
          size_bytes: number;
          storage_path: string;
          uploaded_by: string | null;
        };
        Insert: {
          content_type: string;
          created_at?: string;
          id?: string;
          name: string;
          project_id: string;
          shared?: boolean;
          size_bytes: number;
          storage_path: string;
          uploaded_by?: string | null;
        };
        Update: {
          content_type?: string;
          created_at?: string;
          id?: string;
          name?: string;
          project_id?: string;
          shared?: boolean;
          size_bytes?: number;
          storage_path?: string;
          uploaded_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "project_files_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "project_files_uploaded_by_fkey";
            columns: ["uploaded_by"];
            isOneToOne: false;
            referencedRelation: "team_members";
            referencedColumns: ["user_id"];
          },
        ];
      };
      project_team: {
        Row: {
          position: number;
          project_id: string;
          role_label: string;
          user_id: string;
        };
        Insert: {
          position?: number;
          project_id: string;
          role_label: string;
          user_id: string;
        };
        Update: {
          position?: number;
          project_id?: string;
          role_label?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "project_team_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "project_team_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "team_members";
            referencedColumns: ["user_id"];
          },
        ];
      };
      projects: {
        Row: {
          client_name: string;
          created_at: string;
          health: string;
          id: string;
          launches_on: string;
          lead_id: string;
          name: string;
          public_id: string;
          staging_url: string | null;
          starts_on: string;
          status: string;
          updated_at: string;
        };
        Insert: {
          client_name: string;
          created_at?: string;
          health?: string;
          id?: string;
          launches_on: string;
          lead_id: string;
          name: string;
          public_id?: string;
          staging_url?: string | null;
          starts_on: string;
          status?: string;
          updated_at?: string;
        };
        Update: {
          client_name?: string;
          created_at?: string;
          health?: string;
          id?: string;
          launches_on?: string;
          lead_id?: string;
          name?: string;
          public_id?: string;
          staging_url?: string | null;
          starts_on?: string;
          status?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "projects_lead_id_fkey";
            columns: ["lead_id"];
            isOneToOne: false;
            referencedRelation: "team_members";
            referencedColumns: ["user_id"];
          },
        ];
      };
      stages: {
        Row: {
          completed_at: string | null;
          ends_on: string | null;
          id: string;
          name: string;
          position: number;
          project_id: string;
          starts_on: string;
        };
        Insert: {
          completed_at?: string | null;
          ends_on?: string | null;
          id?: string;
          name: string;
          position: number;
          project_id: string;
          starts_on: string;
        };
        Update: {
          completed_at?: string | null;
          ends_on?: string | null;
          id?: string;
          name?: string;
          position?: number;
          project_id?: string;
          starts_on?: string;
        };
        Relationships: [
          {
            foreignKeyName: "stages_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
        ];
      };
      team_members: {
        Row: {
          active: boolean;
          created_at: string;
          email: string;
          name: string;
          role: string;
          user_id: string;
        };
        Insert: {
          active?: boolean;
          created_at?: string;
          email: string;
          name: string;
          role?: string;
          user_id: string;
        };
        Update: {
          active?: boolean;
          created_at?: string;
          email?: string;
          name?: string;
          role?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      ticket_checklist_items: {
        Row: {
          done: boolean;
          id: string;
          label: string;
          position: number;
          project_id: string;
          ticket_id: string;
        };
        Insert: {
          done?: boolean;
          id?: string;
          label: string;
          position: number;
          project_id: string;
          ticket_id: string;
        };
        Update: {
          done?: boolean;
          id?: string;
          label?: string;
          position?: number;
          project_id?: string;
          ticket_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "ticket_checklist_items_project_id_ticket_id_fkey";
            columns: ["project_id", "ticket_id"];
            isOneToOne: false;
            referencedRelation: "tickets";
            referencedColumns: ["project_id", "id"];
          },
        ];
      };
      tickets: {
        Row: {
          client_visible: boolean;
          created_at: string;
          description: string;
          due_on: string | null;
          id: string;
          number: number;
          owner_id: string | null;
          project_id: string;
          stage_id: string;
          status: string;
          title: string;
          updated_at: string;
          waiting_on_client: boolean;
        };
        Insert: {
          client_visible?: boolean;
          created_at?: string;
          description?: string;
          due_on?: string | null;
          id?: string;
          number: number;
          owner_id?: string | null;
          project_id: string;
          stage_id: string;
          status?: string;
          title: string;
          updated_at?: string;
          waiting_on_client?: boolean;
        };
        Update: {
          client_visible?: boolean;
          created_at?: string;
          description?: string;
          due_on?: string | null;
          id?: string;
          number?: number;
          owner_id?: string | null;
          project_id?: string;
          stage_id?: string;
          status?: string;
          title?: string;
          updated_at?: string;
          waiting_on_client?: boolean;
        };
        Relationships: [
          {
            foreignKeyName: "tickets_owner_id_fkey";
            columns: ["owner_id"];
            isOneToOne: false;
            referencedRelation: "team_members";
            referencedColumns: ["user_id"];
          },
          {
            foreignKeyName: "tickets_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "tickets_project_id_stage_id_fkey";
            columns: ["project_id", "stage_id"];
            isOneToOne: false;
            referencedRelation: "stages";
            referencedColumns: ["project_id", "id"];
          },
        ];
      };
      update_tickets: {
        Row: {
          project_id: string;
          ticket_id: string;
          update_id: string;
        };
        Insert: {
          project_id: string;
          ticket_id: string;
          update_id: string;
        };
        Update: {
          project_id?: string;
          ticket_id?: string;
          update_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "update_tickets_project_id_ticket_id_fkey";
            columns: ["project_id", "ticket_id"];
            isOneToOne: false;
            referencedRelation: "tickets";
            referencedColumns: ["project_id", "id"];
          },
          {
            foreignKeyName: "update_tickets_project_id_update_id_fkey";
            columns: ["project_id", "update_id"];
            isOneToOne: false;
            referencedRelation: "updates";
            referencedColumns: ["project_id", "id"];
          },
        ];
      };
      updates: {
        Row: {
          author_id: string;
          body: string;
          created_at: string;
          deleted_at: string | null;
          edited_at: string | null;
          highlight: boolean;
          id: string;
          needs_client: boolean;
          project_id: string;
        };
        Insert: {
          author_id: string;
          body: string;
          created_at?: string;
          deleted_at?: string | null;
          edited_at?: string | null;
          highlight?: boolean;
          id?: string;
          needs_client?: boolean;
          project_id: string;
        };
        Update: {
          author_id?: string;
          body?: string;
          created_at?: string;
          deleted_at?: string | null;
          edited_at?: string | null;
          highlight?: boolean;
          id?: string;
          needs_client?: boolean;
          project_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "updates_author_id_fkey";
            columns: ["author_id"];
            isOneToOne: false;
            referencedRelation: "team_members";
            referencedColumns: ["user_id"];
          },
          {
            foreignKeyName: "updates_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      confirm_newsletter: {
        Args: { p_email: string; p_issued_at: number; p_token: string };
        Returns: boolean;
      };
      mark_consultation_notified: { Args: { p_id: string }; Returns: boolean };
      portal_begin_client_sign_in: {
        Args: { p_email: string; p_ip_hash: string; p_public_id: string };
        Returns: string;
      };
      portal_code_state: {
        Args: { p_email: string; p_public_id: string };
        Returns: string;
      };
      portal_complete_client_sign_in: {
        Args: { p_public_id: string };
        Returns: string;
      };
      portal_register_wrong_code: {
        Args: { p_email: string; p_public_id: string };
        Returns: number;
      };
      submit_consultation_request: {
        Args: {
          p_email: string;
          p_ip_hash: string;
          p_locale: string;
          p_message: string;
          p_name: string;
          p_phone: string;
          p_service: string;
        };
        Returns: string;
      };
      subscribe_newsletter: {
        Args: { p_email: string; p_ip_hash: string; p_locale: string };
        Returns: number;
      };
      unsubscribe_newsletter: {
        Args: { p_email: string; p_token: string };
        Returns: boolean;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<
  keyof Database,
  "public"
>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {},
  },
} as const;
