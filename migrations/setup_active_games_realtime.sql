-- Enable realtime for active_games table
BEGIN;

-- Set replica identity for better change tracking
ALTER TABLE active_games REPLICA IDENTITY FULL;

-- Enable row level security if not already enabled
ALTER TABLE active_games ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'active_games' 
        AND policyname = 'Players can view their own games'
    ) THEN
        DROP POLICY "Players can view their own games" ON active_games;
    END IF;

    IF EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'active_games' 
        AND policyname = 'Game engine can manage games'
    ) THEN
        DROP POLICY "Game engine can manage games" ON active_games;
    END IF;
END $$;

-- Create policies for real-time access
CREATE POLICY "Players can view their own games"
    ON active_games FOR SELECT
    USING (
        auth.uid() = player1_id OR 
        auth.uid() = player2_id
    );

CREATE POLICY "Game engine can manage games"
    ON active_games FOR ALL
    USING (true)
    WITH CHECK (true);

-- Enable realtime for this table with specific operations
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime'
    ) THEN
        -- Remove table if it's already in the publication to avoid errors
        ALTER PUBLICATION supabase_realtime DROP TABLE IF EXISTS active_games;
        -- Add table back with specific operations
        ALTER PUBLICATION supabase_realtime ADD TABLE active_games;
    ELSE
        -- Create new publication if it doesn't exist
        CREATE PUBLICATION supabase_realtime FOR TABLE active_games;
    END IF;
END $$;

-- Ensure the update_timestamp function exists
CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Ensure the update_updated_at_column function exists
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

COMMIT;

-- Add comment to describe the table's realtime capabilities
COMMENT ON TABLE active_games IS 'Stores active game states with real-time updates enabled for game state synchronization';
