-- Add processing and last_processed columns to active_games table
ALTER TABLE active_games 
ADD COLUMN processing boolean DEFAULT false,
ADD COLUMN last_processed timestamp with time zone DEFAULT now();

-- Add index for faster processing status lookups
CREATE INDEX idx_active_games_processing ON active_games(processing);

-- Add function to handle version conflicts
CREATE OR REPLACE FUNCTION check_game_state_version()
RETURNS trigger AS $$
BEGIN
  -- Only check version if game_state is being updated
  IF NEW.game_state IS NOT NULL AND OLD.game_state IS NOT NULL THEN
    -- Extract version from game_state
    IF (NEW.game_state->>'version')::int <= (OLD.game_state->>'version')::int THEN
      RAISE EXCEPTION 'version_conflict';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add trigger for version checking
CREATE TRIGGER check_game_state_version_trigger
BEFORE UPDATE ON active_games
FOR EACH ROW
EXECUTE FUNCTION check_game_state_version();

-- Add RLS policies for processing column
ALTER TABLE active_games ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Players can read processing status"
ON active_games FOR SELECT
TO authenticated
USING (
  auth.uid() = player1_id OR 
  auth.uid() = player2_id
);

CREATE POLICY "Players can update processing status"
ON active_games FOR UPDATE
TO authenticated
USING (
  auth.uid() = player1_id OR 
  auth.uid() = player2_id
)
WITH CHECK (
  auth.uid() = player1_id OR 
  auth.uid() = player2_id
);
