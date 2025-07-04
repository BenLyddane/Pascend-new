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
          created_at: string | null
          current_player_id: string | null
          current_turn_number: number | null
          game_state: Json | null
          id: string
          last_processed: string | null
          mode: string | null
          player1_deck_id: string
          player1_id: string
          player2_deck_id: string
          player2_id: string
          processing: boolean | null
          started_at: string | null
          status: string
          updated_at: string | null
          winner_id: string | null
        }
        Insert: {
          created_at?: string | null
          current_player_id?: string | null
          current_turn_number?: number | null
          game_state?: Json | null
          id?: string
          last_processed?: string | null
          mode?: string | null
          player1_deck_id: string
          player1_id: string
          player2_deck_id: string
          player2_id: string
          processing?: boolean | null
          started_at?: string | null
          status?: string
          updated_at?: string | null
          winner_id?: string | null
        }
        Update: {
          created_at?: string | null
          current_player_id?: string | null
          current_turn_number?: number | null
          game_state?: Json | null
          id?: string
          last_processed?: string | null
          mode?: string | null
          player1_deck_id?: string
          player1_id?: string
          player2_deck_id?: string
          player2_id?: string
          processing?: boolean | null
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
      card_effect_values: {
        Row: {
          card_id: string | null
          created_at: string | null
          id: string
          property_id: string | null
          value: number
        }
        Insert: {
          card_id?: string | null
          created_at?: string | null
          id?: string
          property_id?: string | null
          value?: number
        }
        Update: {
          card_id?: string | null
          created_at?: string | null
          id?: string
          property_id?: string | null
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "card_effect_values_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "card_effect_values_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "special_properties"
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
          generated_with_purchased_tokens: boolean
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
          generated_with_purchased_tokens?: boolean
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
          generated_with_purchased_tokens?: boolean
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
      customers: {
        Row: {
          id: string
          stripe_customer_id: string | null
        }
        Insert: {
          id: string
          stripe_customer_id?: string | null
        }
        Update: {
          id?: string
          stripe_customer_id?: string | null
        }
        Relationships: []
      }
      game_events: {
        Row: {
          created_at: string | null
          event_data: Json
          event_type: Database["public"]["Enums"]["game_event_type"]
          game_id: string | null
          id: string
          sequence_number: number
          turn_id: string | null
        }
        Insert: {
          created_at?: string | null
          event_data: Json
          event_type: Database["public"]["Enums"]["game_event_type"]
          game_id?: string | null
          id?: string
          sequence_number: number
          turn_id?: string | null
        }
        Update: {
          created_at?: string | null
          event_data?: Json
          event_type?: Database["public"]["Enums"]["game_event_type"]
          game_id?: string | null
          id?: string
          sequence_number?: number
          turn_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "game_events_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "active_games"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "game_events_turn_id_fkey"
            columns: ["turn_id"]
            isOneToOne: false
            referencedRelation: "game_turns"
            referencedColumns: ["id"]
          },
        ]
      }
      game_turns: {
        Row: {
          actions: Json[] | null
          completed_at: string | null
          created_at: string | null
          game_id: string | null
          id: string
          player_id: string
          turn_number: number
        }
        Insert: {
          actions?: Json[] | null
          completed_at?: string | null
          created_at?: string | null
          game_id?: string | null
          id?: string
          player_id: string
          turn_number: number
        }
        Update: {
          actions?: Json[] | null
          completed_at?: string | null
          created_at?: string | null
          game_id?: string | null
          id?: string
          player_id?: string
          turn_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "game_turns_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "active_games"
            referencedColumns: ["id"]
          },
        ]
      }
      match_history: {
        Row: {
          cards_defeated: number | null
          created_at: string | null
          damage_dealt: number | null
          damage_received: number | null
          ended_at: string | null
          id: string
          match_type: string
          opponent_id: string | null
          result: string
          special_abilities_used: number | null
          started_at: string | null
          turns_played: number | null
          user_id: string | null
        }
        Insert: {
          cards_defeated?: number | null
          created_at?: string | null
          damage_dealt?: number | null
          damage_received?: number | null
          ended_at?: string | null
          id?: string
          match_type: string
          opponent_id?: string | null
          result: string
          special_abilities_used?: number | null
          started_at?: string | null
          turns_played?: number | null
          user_id?: string | null
        }
        Update: {
          cards_defeated?: number | null
          created_at?: string | null
          damage_dealt?: number | null
          damage_received?: number | null
          ended_at?: string | null
          id?: string
          match_type?: string
          opponent_id?: string | null
          result?: string
          special_abilities_used?: number | null
          started_at?: string | null
          turns_played?: number | null
          user_id?: string | null
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
      order_items: {
        Row: {
          created_at: string
          id: string
          order_id: string
          price_id: string
          quantity: number
        }
        Insert: {
          created_at?: string
          id?: string
          order_id: string
          price_id: string
          quantity: number
        }
        Update: {
          created_at?: string
          id?: string
          order_id?: string
          price_id?: string
          quantity?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_price_id_fkey"
            columns: ["price_id"]
            isOneToOne: false
            referencedRelation: "prices"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          amount: number
          created_at: string
          currency: string | null
          id: string
          metadata: Json | null
          payment_intent_id: string | null
          status: Database["public"]["Enums"]["order_status"]
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          currency?: string | null
          id: string
          metadata?: Json | null
          payment_intent_id?: string | null
          status?: Database["public"]["Enums"]["order_status"]
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string | null
          id?: string
          metadata?: Json | null
          payment_intent_id?: string | null
          status?: Database["public"]["Enums"]["order_status"]
          user_id?: string
        }
        Relationships: []
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
        Relationships: []
      }
      player_profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          display_name: string | null
          free_tokens: number
          last_match_at: string | null
          purchased_tokens: number
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          display_name?: string | null
          free_tokens?: number
          last_match_at?: string | null
          purchased_tokens?: number
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          display_name?: string | null
          free_tokens?: number
          last_match_at?: string | null
          purchased_tokens?: number
          user_id?: string
        }
        Relationships: []
      }
      player_settings: {
        Row: {
          card_animation: boolean
          created_at: string
          email_notifications: boolean
          ingame_notifications: boolean
          theme: Database["public"]["Enums"]["theme_type"]
          updated_at: string
          user_id: string
        }
        Insert: {
          card_animation?: boolean
          created_at?: string
          email_notifications?: boolean
          ingame_notifications?: boolean
          theme?: Database["public"]["Enums"]["theme_type"]
          updated_at?: string
          user_id: string
        }
        Update: {
          card_animation?: boolean
          created_at?: string
          email_notifications?: boolean
          ingame_notifications?: boolean
          theme?: Database["public"]["Enums"]["theme_type"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      player_stats: {
        Row: {
          average_game_duration: unknown | null
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
          total_cards_defeated: number | null
          total_damage_dealt: number | null
          total_damage_received: number | null
          total_matches: number | null
          total_special_abilities_used: number | null
          total_turns_played: number | null
          updated_at: string | null
          user_id: string
          wins: number | null
        }
        Insert: {
          average_game_duration?: unknown | null
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
          total_cards_defeated?: number | null
          total_damage_dealt?: number | null
          total_damage_received?: number | null
          total_matches?: number | null
          total_special_abilities_used?: number | null
          total_turns_played?: number | null
          updated_at?: string | null
          user_id: string
          wins?: number | null
        }
        Update: {
          average_game_duration?: unknown | null
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
          total_cards_defeated?: number | null
          total_damage_dealt?: number | null
          total_damage_received?: number | null
          total_matches?: number | null
          total_special_abilities_used?: number | null
          total_turns_played?: number | null
          updated_at?: string | null
          user_id?: string
          wins?: number | null
        }
        Relationships: []
      }
      prices: {
        Row: {
          active: boolean | null
          currency: string | null
          description: string | null
          id: string
          metadata: Json | null
          product_id: string | null
          unit_amount: number | null
        }
        Insert: {
          active?: boolean | null
          currency?: string | null
          description?: string | null
          id: string
          metadata?: Json | null
          product_id?: string | null
          unit_amount?: number | null
        }
        Update: {
          active?: boolean | null
          currency?: string | null
          description?: string | null
          id?: string
          metadata?: Json | null
          product_id?: string | null
          unit_amount?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "prices_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          active: boolean | null
          description: string | null
          id: string
          image: string | null
          metadata: Json | null
          name: string | null
        }
        Insert: {
          active?: boolean | null
          description?: string | null
          id: string
          image?: string | null
          metadata?: Json | null
          name?: string | null
        }
        Update: {
          active?: boolean | null
          description?: string | null
          id?: string
          image?: string | null
          metadata?: Json | null
          name?: string | null
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
          effect_type: Database["public"]["Enums"]["effect_type"]
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
          effect_type: Database["public"]["Enums"]["effect_type"]
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
          effect_type?: Database["public"]["Enums"]["effect_type"]
          id?: string
          name?: string
          power_level?: number | null
          rarity_modifier?: number[] | null
          value?: number | null
        }
        Relationships: []
      }
      stripe_users: {
        Row: {
          avatar_url: string | null
          billing_address: Json | null
          full_name: string | null
          id: string
          payment_method: Json | null
        }
        Insert: {
          avatar_url?: string | null
          billing_address?: Json | null
          full_name?: string | null
          id: string
          payment_method?: Json | null
        }
        Update: {
          avatar_url?: string | null
          billing_address?: Json | null
          full_name?: string | null
          id?: string
          payment_method?: Json | null
        }
        Relationships: []
      }
      temp_cards: {
        Row: {
          created_at: string | null
          description: string
          gen_id: string | null
          generated_with_purchased_tokens: boolean | null
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
          generated_with_purchased_tokens?: boolean | null
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
          generated_with_purchased_tokens?: boolean | null
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
          is_purchased: boolean
          payment_id: string | null
          transaction_type: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          is_purchased?: boolean
          payment_id?: string | null
          transaction_type: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          is_purchased?: boolean
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
          status: Database["public"]["Enums"]["trade_listing_status"]
          token_price: number
        }
        Insert: {
          card_id: string
          id?: string
          listed_at?: string
          seller_id: string
          status?: Database["public"]["Enums"]["trade_listing_status"]
          token_price: number
        }
        Update: {
          card_id?: string
          id?: string
          listed_at?: string
          seller_id?: string
          status?: Database["public"]["Enums"]["trade_listing_status"]
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
      create_game_atomic: {
        Args: {
          p_user_id: string
          p_mode: string
          p_player2_id: string
          p_game_state: Json
          p_player1_deck_id: string
          p_player2_deck_id: string
          p_player1_goes_first: boolean
        }
        Returns: Json
      }
      create_trade_listing: {
        Args: {
          p_card_id: string
          p_seller_id: string
          p_token_price: number
        }
        Returns: string
      }
      get_card_effects: {
        Args: {
          p_card_id: string
        }
        Returns: Json
      }
      get_effect_value: {
        Args: {
          effect_data: Json
        }
        Returns: number
      }
      get_game_state: {
        Args: {
          game_id: string
        }
        Returns: Json
      }
      get_leaderboard: {
        Args: {
          limit_count?: number
          offset_count?: number
        }
        Returns: {
          user_id: string
          display_name: string
          avatar_url: string
          rank_points: number
          rank_tier: string
          wins: number
          losses: number
          total_matches: number
          current_streak: number
          win_rate: number
        }[]
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
      migrate_existing_games: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      migrate_player_stats: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      next_event_sequence: {
        Args: {
          game_id: string
        }
        Returns: number
      }
      purchase_trade_listing: {
        Args: {
          p_listing_id: string
          p_buyer_id: string
          p_use_purchased_tokens?: boolean
        }
        Returns: undefined
      }
      rollback_transaction: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
    }
    Enums: {
      effect_type:
        | "on_turn_start"
        | "on_battle_start"
        | "on_attack"
        | "on_successful_attack"
        | "on_damage_received"
        | "on_damage_dealt"
        | "on_death"
      game_event_type:
        | "TURN_START"
        | "TURN_END"
        | "ATTACK"
        | "DAMAGE_DEALT"
        | "DAMAGE_RECEIVED"
        | "EFFECT_TRIGGERED"
        | "CARD_DEATH"
      order_status: "pending" | "completed" | "failed" | "refunded"
      theme_type: "light" | "dark" | "system"
      trade_listing_status: "active" | "sold" | "cancelled"
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
