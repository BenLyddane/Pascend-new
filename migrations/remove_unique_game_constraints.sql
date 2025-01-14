-- Drop the unique constraints that prevent multiple active games
drop index if exists unique_active_game_per_player;
drop index if exists unique_active_game_per_opponent;

-- Add a new index to help query active games efficiently
create index if not exists active_games_player_status_idx 
on public.active_games (player1_id, player2_id, status);
