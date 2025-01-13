export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      active_games: {
        Row: {
          game_state: Json | null
          id: string
          player1_deck_id: string
          player1_id: string
          player2_deck_id: string
          player2_id: string
          started_at: string | null
          status: string
          updated_at: string | null
          winner_id: string | null
        }
        Insert: {
          game_state?: Json | null
          id?: string
          player1_deck_id: string
          player1_id: string
          player2_deck_id: string
          player2_id: string
          started_at?: string | null
          status?: string
          updated_at?: string | null
          winner_id?: string | null
        }
        Update: {
          game_state?: Json | null
          id?: string
          player1_deck_id?: string
          player1_id?: string
          player2_deck_id?: string
          player2_id?: string
          started_at?: string | null
          status?: string
          updated_at?: string | null
          winner_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "active_games_player1_deck_id_fkey"
            columns: ["player1_deck_id"]
            isOneToOne: false
            referencedRelation: "player_decks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "active_games_player2_deck_id_fkey"
            columns: ["player2_deck_id"]
            isOneToOne: false
            referencedRelation: "player_decks"
            referencedColumns: ["id"]
          },
        ]
      }
      card_properties: {
        Row: {
          card_id: string | null
          created_at: string
          id: string
          property_id: string | null
          value: number | null
        }
        Insert: {
          card_id?: string | null
          created_at?: string
          id?: string
          property_id?: string | null
          value?: number | null
        }
        Update: {
          card_id?: string | null
          created_at?: string
          id?: string
          property_id?: string | null
          value?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "card_properties_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "card_properties_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "special_properties"
            referencedColumns: ["id"]
          },
        ]
      }
      cards: {
        Row: {
          created_at: string | null
          description: string
          edition: string
          health: number
          id: string
          image_url: string | null
          is_active: boolean | null
          keywords: string[] | null
          modifier: number | null
          name: string
          power: number
          rarity: string
          special_effects: Json | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          description: string
          edition?: string
          health: number
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          keywords?: string[] | null
          modifier?: number | null
          name: string
          power: number
          rarity: string
          special_effects?: Json | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          description?: string
          edition?: string
          health?: number
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          keywords?: string[] | null
          modifier?: number | null
          name?: string
          power?: number
          rarity?: string
          special_effects?: Json | null
          user_id?: string
        }
        Relationships: []
      }
      collection_stats: {
        Row: {
          collection_progress: number | null
          common_count: number | null
          epic_count: number | null
          last_updated_at: string | null
          legendary_count: number | null
          rare_count: number | null
          total_cards: number | null
          unique_cards: number | null
          user_id: string
        }
        Insert: {
          collection_progress?: number | null
          common_count?: number | null
          epic_count?: number | null
          last_updated_at?: string | null
          legendary_count?: number | null
          rare_count?: number | null
          total_cards?: number | null
          unique_cards?: number | null
          user_id: string
        }
        Update: {
          collection_progress?: number | null
          common_count?: number | null
          epic_count?: number | null
          last_updated_at?: string | null
          legendary_count?: number | null
          rare_count?: number | null
          total_cards?: number | null
          unique_cards?: number | null
          user_id?: string
        }
        Relationships: []
      }
      deck_cards: {
        Row: {
          card_id: string
          created_at: string | null
          deck_id: string
          id: number
        }
        Insert: {
          card_id: string
          created_at?: string | null
          deck_id: string
          id?: number
        }
        Update: {
          card_id?: string
          created_at?: string | null
          deck_id?: string
          id?: number
        }
        Relationships: [
          {
            foreignKeyName: "deck_cards_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deck_cards_deck_id_fkey"
            columns: ["deck_id"]
            isOneToOne: false
            referencedRelation: "deck_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      deck_templates: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          user_id?: string
        }
        Relationships: []
      }
      game_actions: {
        Row: {
          action_data: Json
          action_type: string
          created_at: string | null
          game_id: string | null
          id: string
          player_id: string | null
          processed_at: string | null
          status: string | null
        }
        Insert: {
          action_data: Json
          action_type: string
          created_at?: string | null
          game_id?: string | null
          id?: string
          player_id?: string | null
          processed_at?: string | null
          status?: string | null
        }
        Update: {
          action_data?: Json
          action_type?: string
          created_at?: string | null
          game_id?: string | null
          id?: string
          player_id?: string | null
          processed_at?: string | null
          status?: string | null
        }
        Relationships: []
      }
      matchmaking_queue: {
        Row: {
          deck_id: string
          id: string
          joined_at: string | null
          opponent_deck_id: string | null
          rank_points: number
          status: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          deck_id: string
          id?: string
          joined_at?: string | null
          opponent_deck_id?: string | null
          rank_points?: number
          status?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          deck_id?: string
          id?: string
          joined_at?: string | null
          opponent_deck_id?: string | null
          rank_points?: number
          status?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "matchmaking_queue_deck_id_fkey"
            columns: ["deck_id"]
            isOneToOne: false
            referencedRelation: "player_decks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matchmaking_queue_opponent_deck_id_fkey"
            columns: ["opponent_deck_id"]
            isOneToOne: false
            referencedRelation: "player_decks"
            referencedColumns: ["id"]
          },
        ]
      }
      player_cards: {
        Row: {
          acquired_at: string | null
          card_id: string | null
          card_level: number | null
          experience_points: number | null
          id: string
          is_favorite: boolean | null
          quantity: number | null
          user_id: string | null
        }
        Insert: {
          acquired_at?: string | null
          card_id?: string | null
          card_level?: number | null
          experience_points?: number | null
          id?: string
          is_favorite?: boolean | null
          quantity?: number | null
          user_id?: string | null
        }
        Update: {
          acquired_at?: string | null
          card_id?: string | null
          card_level?: number | null
          experience_points?: number | null
          id?: string
          is_favorite?: boolean | null
          quantity?: number | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "player_cards_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "cards"
            referencedColumns: ["id"]
          },
        ]
      }
      player_decks: {
        Row: {
          card_list: Json
          created_at: string | null
          deck_type: string
          description: string | null
          id: string
          is_active: boolean | null
          last_used_at: string | null
          losses: number | null
          name: string
          template_id: string | null
          total_matches: number | null
          updated_at: string | null
          user_id: string | null
          wins: number | null
        }
        Insert: {
          card_list: Json
          created_at?: string | null
          deck_type: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          last_used_at?: string | null
          losses?: number | null
          name: string
          template_id?: string | null
          total_matches?: number | null
          updated_at?: string | null
          user_id?: string | null
          wins?: number | null
        }
        Update: {
          card_list?: Json
          created_at?: string | null
          deck_type?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          last_used_at?: string | null
          losses?: number | null
          name?: string
          template_id?: string | null
          total_matches?: number | null
          updated_at?: string | null
          user_id?: string | null
          wins?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "player_decks_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "deck_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      player_profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          current_streak: number | null
          draws: number | null
          last_match_at: string | null
          longest_streak: number | null
          losses: number | null
          rank_points: number | null
          rank_tier: string | null
          season_highest_rank: number | null
          seasonal_rank_points: number | null
          settings: Json | null
          tokens: number
          total_matches: number | null
          user_id: string
          wins: number | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          current_streak?: number | null
          draws?: number | null
          last_match_at?: string | null
          longest_streak?: number | null
          losses?: number | null
          rank_points?: number | null
          rank_tier?: string | null
          season_highest_rank?: number | null
          seasonal_rank_points?: number | null
          settings?: Json | null
          tokens?: number
          total_matches?: number | null
          user_id: string
          wins?: number | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          current_streak?: number | null
          draws?: number | null
          last_match_at?: string | null
          longest_streak?: number | null
          losses?: number | null
          rank_points?: number | null
          rank_tier?: string | null
          season_highest_rank?: number | null
          seasonal_rank_points?: number | null
          settings?: Json | null
          tokens?: number
          total_matches?: number | null
          user_id?: string
          wins?: number | null
        }
        Relationships: []
      }
      special_properties: {
        Row: {
          allowed_rarities: string[] | null
          combo_tags: string[] | null
          created_at: string
          description: string
          effect_icon: string
          effect_type: string
          id: string
          name: string
          power_level: number | null
          rarity_modifier: number[] | null
          value: number | null
        }
        Insert: {
          allowed_rarities?: string[] | null
          combo_tags?: string[] | null
          created_at?: string
          description: string
          effect_icon: string
          effect_type: string
          id?: string
          name: string
          power_level?: number | null
          rarity_modifier?: number[] | null
          value?: number | null
        }
        Update: {
          allowed_rarities?: string[] | null
          combo_tags?: string[] | null
          created_at?: string
          description?: string
          effect_icon?: string
          effect_type?: string
          id?: string
          name?: string
          power_level?: number | null
          rarity_modifier?: number[] | null
          value?: number | null
        }
        Relationships: []
      }
      temp_cards: {
        Row: {
          created_at: string | null
          description: string
          gen_id: string | null
          health: number
          id: string
          image_url: string
          modifier: number
          name: string
          power: number
          rarity: string
          special_effects: Json | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          description: string
          gen_id?: string | null
          health: number
          id?: string
          image_url: string
          modifier?: number
          name: string
          power: number
          rarity: string
          special_effects?: Json | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          description?: string
          gen_id?: string | null
          health?: number
          id?: string
          image_url?: string
          modifier?: number
          name?: string
          power?: number
          rarity?: string
          special_effects?: Json | null
          user_id?: string
        }
        Relationships: []
      }
      token_transactions: {
        Row: {
          amount: number
          created_at: string
          id: string
          payment_id: string | null
          transaction_type: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          payment_id?: string | null
          transaction_type: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          payment_id?: string | null
          transaction_type?: string
          user_id?: string
        }
        Relationships: []
      }
      trade_listings: {
        Row: {
          card_id: string
          id: string
          listed_at: string
          seller_id: string
          status: string
          token_price: number
        }
        Insert: {
          card_id: string
          id?: string
          listed_at?: string
          seller_id: string
          status?: string
          token_price: number
        }
        Update: {
          card_id?: string
          id?: string
          listed_at?: string
          seller_id?: string
          status?: string
          token_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "trade_listings_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "cards"
            referencedColumns: ["id"]
          },
        ]
      }
      trade_transactions: {
        Row: {
          buyer_id: string
          card_id: string
          created_at: string
          id: string
          listing_id: string
          seller_id: string
          token_amount: number
        }
        Insert: {
          buyer_id: string
          card_id: string
          created_at?: string
          id?: string
          listing_id: string
          seller_id: string
          token_amount: number
        }
        Update: {
          buyer_id?: string
          card_id?: string
          created_at?: string
          id?: string
          listing_id?: string
          seller_id?: string
          token_amount?: number
        }
        Relationships: [
          {
            foreignKeyName: "trade_transactions_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trade_transactions_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "trade_listings"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      begin_transaction: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      calculate_card_mana_modifier: {
        Args: {
          card_id: string
        }
        Returns: number
      }
      commit_transaction: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      get_valid_properties_for_rarity: {
        Args: {
          card_rarity: string
        }
        Returns: {
          property_id: string
        }[]
      }
      match_players: {
        Args: {
          player1_id: string
          player2_id: string
        }
        Returns: undefined
      }
      purchase_trade_listing: {
        Args: {
          p_listing_id: string
          p_buyer_id: string
        }
        Returns: string
      }
      rollback_transaction: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type PublicSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (PublicSchema["Tables"] & PublicSchema["Views"])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
        Database[PublicTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
      Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (PublicSchema["Tables"] &
        PublicSchema["Views"])
    ? (PublicSchema["Tables"] &
        PublicSchema["Views"])[PublicTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  PublicEnumNameOrOptions extends
    | keyof PublicSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : PublicEnumNameOrOptions extends keyof PublicSchema["Enums"]
    ? PublicSchema["Enums"][PublicEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof PublicSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof PublicSchema["CompositeTypes"]
    ? PublicSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never
