export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "13.0.5";
  };
  public: {
    Tables: {
      customer: {
        Row: {
          address: string | null;
          email: string | null;
          id: string;
          name: string;
          phone: string | null;
          user_id: string;
        };
        Insert: {
          address?: string | null;
          email?: string | null;
          id?: string;
          name: string;
          phone?: string | null;
          user_id: string;
        };
        Update: {
          address?: string | null;
          email?: string | null;
          id?: string;
          name?: string;
          phone?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "customer_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };

      event: {
        Row: {
          cost: number | null;
          customer: string;
          date: string | null;
          description: string | null;
          duration: number | null; // default 120
          id: string;
          location: string | null;
          numguests: number | null;
          price: number | null;
          status: string | null;
          time: string | null;
          title: string;
          type: string | null;
          user_id: string;
        };
        Insert: {
          cost?: number | null;
          customer: string;
          date?: string | null;
          description?: string | null;
          duration?: number | null;
          id?: string;
          location?: string | null;
          numguests?: number | null;
          price?: number | null;
          status?: string | null;
          time?: string | null;
          title?: string;
          type?: string | null;
          user_id: string;
        };
        Update: {
          cost?: number | null;
          customer?: string;
          date?: string | null;
          description?: string | null;
          duration?: number | null;
          id?: string;
          location?: string | null;
          numguests?: number | null;
          price?: number | null;
          status?: string | null;
          time?: string | null;
          title?: string;
          type?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "event_customer_fkey";
            columns: ["customer"];
            isOneToOne: false;
            referencedRelation: "customer";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "event_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "event_menu_event_fkey";
            columns: ["id"]; // reverse reference note
            isOneToOne: false;
            referencedRelation: "event_menu";
            referencedColumns: ["event"];
          },
        ];
      };

      event_menu: {
        Row: {
          event: string;
          produced: boolean | null;
          qty: number | null; // default 1
          recipe: string;
        };
        Insert: {
          event: string;
          produced?: boolean | null;
          qty?: number | null;
          recipe: string;
        };
        Update: {
          event?: string;
          produced?: boolean | null;
          qty?: number | null;
          recipe?: string;
        };
        Relationships: [
          {
            foreignKeyName: "event_menu_event_fkey";
            columns: ["event"];
            isOneToOne: false;
            referencedRelation: "event";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "event_menu_recipe_fkey";
            columns: ["recipe"];
            isOneToOne: false;
            referencedRelation: "recipe";
            referencedColumns: ["id"];
          },
        ];
      };

      item: {
        Row: {
          cost: number | null;
          description: string;
          factor: number | null;
          id: string;
          isproduct: boolean; // default false
          unit_purch: string | null;
          unit_use: string | null;
          user_id: string;
        };
        Insert: {
          cost?: number | null;
          description: string;
          factor?: number | null;
          id?: string;
          isproduct?: boolean;
          unit_purch?: string | null;
          unit_use?: string | null;
          user_id: string;
        };
        Update: {
          cost?: number | null;
          description?: string;
          factor?: number | null;
          id?: string;
          isproduct?: boolean;
          unit_purch?: string | null;
          unit_use?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "item_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "item_unit_purch_uuid_fkey";
            columns: ["unit_purch"];
            isOneToOne: false;
            referencedRelation: "unit";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "item_unit_use_uuid_fkey";
            columns: ["unit_use"];
            isOneToOne: false;
            referencedRelation: "unit";
            referencedColumns: ["id"];
          },
        ];
      };

      profiles: {
        Row: {
          avatar_url: string | null;
          created_at: string | null; // default now()
          email: string; // unique
          full_name: string | null;
          id: string;
          updated_at: string | null; // default now()
        };
        Insert: {
          avatar_url?: string | null;
          created_at?: string | null;
          email: string;
          full_name?: string | null;
          id: string;
          updated_at?: string | null;
        };
        Update: {
          avatar_url?: string | null;
          created_at?: string | null;
          email?: string;
          full_name?: string | null;
          id?: string;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "profiles_id_fkey";
            columns: ["id"];
            isOneToOne: true;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };

      recipe: {
        Row: {
          description: string;
          efficiency: number | null; // default 1.00
          id: string;
          user_id: string;
        };
        Insert: {
          description: string;
          efficiency?: number | null;
          id?: string;
          user_id: string;
        };
        Update: {
          description?: string;
          efficiency?: number | null;
          id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "recipe_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "event_menu_recipe_fkey";
            columns: ["id"]; // reverse reference note
            isOneToOne: false;
            referencedRelation: "event_menu";
            referencedColumns: ["recipe"];
          },
        ];
      };

      recipe_item: {
        Row: {
          item: string;
          qty: number | null;
          recipe: string;
        };
        Insert: {
          item: string;
          qty?: number | null;
          recipe: string;
        };
        Update: {
          item?: string;
          qty?: number | null;
          recipe?: string;
        };
        Relationships: [
          {
            foreignKeyName: "recipe_item_item_fkey";
            columns: ["item"];
            isOneToOne: false;
            referencedRelation: "item";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "recipe_item_recipe_fkey";
            columns: ["recipe"];
            isOneToOne: false;
            referencedRelation: "recipe";
            referencedColumns: ["id"];
          },
        ];
      };

      unit: {
        Row: {
          description: string;
          id: string;
          user_id: string;
        };
        Insert: {
          description: string;
          id?: string;
          user_id: string;
        };
        Update: {
          description?: string;
          id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "unit_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "item_unit_purch_uuid_fkey";
            columns: ["id"]; // reverse reference note
            isOneToOne: false;
            referencedRelation: "item";
            referencedColumns: ["unit_purch"];
          },
          {
            foreignKeyName: "item_unit_use_uuid_fkey";
            columns: ["id"]; // reverse reference note
            isOneToOne: false;
            referencedRelation: "item";
            referencedColumns: ["unit_use"];
          },
        ];
      };

      wizard_cache: {
        Row: {
          created_at: string; // default now()
          expires_at: string;
          id: string;
          query_hash: string;
          response_data: Json;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          expires_at: string;
          id?: string;
          query_hash: string;
          response_data: Json;
          user_id: string;
        };
        Update: {
          created_at?: string;
          expires_at?: string;
          id?: string;
          query_hash?: string;
          response_data?: Json;
          user_id?: string;
        };
        Relationships: [];
      };

      wizard_chats: {
        Row: {
          created_at: string; // default now()
          id: string;
          title: string;
          updated_at: string; // default now()
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          title: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          title?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };

      wizard_messages: {
        Row: {
          chat_id: string;
          content: string;
          created_at: string; // default now()
          id: string;
          metadata: Json | null; // default {}
          role: string; // check: 'user' | 'assistant'
        };
        Insert: {
          chat_id: string;
          content: string;
          created_at?: string;
          id?: string;
          metadata?: Json | null;
          role: string;
        };
        Update: {
          chat_id?: string;
          content?: string;
          created_at?: string;
          id?: string;
          metadata?: Json | null;
          role?: string;
        };
        Relationships: [
          {
            foreignKeyName: "wizard_messages_chat_id_fkey";
            columns: ["chat_id"];
            isOneToOne: false;
            referencedRelation: "wizard_chats";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      calculate_event_cost: {
        Args: { event_id_param: string };
        Returns: { error: true };
      };
      calculate_recipe_base_cost: {
        Args: { recipe_id_param: string };
        Returns: { error: true };
      };
      calculate_recipe_unit_cost: {
        Args: { recipe_id_param: string };
        Returns: { error: true };
      };
      cleanup_expired_wizard_cache: {
        Args: Record<PropertyKey, never>;
        Returns: undefined;
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

// Helpers

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;
type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends { Row: infer R }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends { Row: infer R }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends { Insert: infer I }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends { Insert: infer I }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends { Update: infer U }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends { Update: infer U }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: { Enums: {} },
} as const;
