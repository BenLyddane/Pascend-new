import { Json } from "@/types/database.types";

export interface ActiveGame {
  id: string;
  game_state: Json;
  mode: string | null;
  player1_deck_id: string;
  player1_id: string;
  player2_deck_id: string;
  player2_id: string;
  processing: boolean | null;
  status: string;
  winner_id: string | null;
  created_at: string | null;
  last_processed: string | null;
  started_at: string | null;
  updated_at: string | null;
}

export interface RealtimeActiveGame {
  new: ActiveGame;
  old: ActiveGame;
  eventType: "INSERT" | "UPDATE" | "DELETE";
  schema: string;
  table: string;
  commit_timestamp: string;
}

export interface GameAction {
  action_data: Json;
  action_type: string;
  game_id: string | null;
  id: string;
  player_id: string | null;
  processed_at: string | null;
  status: string | null;
}

export interface PlayerProfile {
  settings: Json | null;
  user_id: string;
}
