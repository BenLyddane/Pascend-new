-- Create match_history table first
CREATE TABLE IF NOT EXISTS match_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id),
    opponent_id UUID REFERENCES auth.users(id),
    match_type TEXT NOT NULL,
    result TEXT NOT NULL,
    damage_dealt INTEGER DEFAULT 0,
    damage_received INTEGER DEFAULT 0,
    cards_defeated INTEGER DEFAULT 0,
    turns_played INTEGER DEFAULT 0,
    special_abilities_used INTEGER DEFAULT 0,
    started_at TIMESTAMPTZ DEFAULT NOW(),
    ended_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Set up RLS for match_history
ALTER TABLE match_history ENABLE ROW LEVEL SECURITY;

-- Policy for viewing match history (authenticated users can view their own matches)
CREATE POLICY "View own match history" ON match_history
    FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id OR auth.uid() = opponent_id);

-- Policy for inserting match history (only system can insert via functions)
CREATE POLICY "System inserts match history" ON match_history
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

-- Create player_stats table
CREATE TABLE IF NOT EXISTS player_stats (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id),
    total_matches INTEGER DEFAULT 0,
    wins INTEGER DEFAULT 0,
    losses INTEGER DEFAULT 0,
    draws INTEGER DEFAULT 0,
    current_streak INTEGER DEFAULT 0,
    longest_streak INTEGER DEFAULT 0,
    total_damage_dealt BIGINT DEFAULT 0,
    total_damage_received BIGINT DEFAULT 0,
    total_cards_defeated INTEGER DEFAULT 0,
    total_turns_played INTEGER DEFAULT 0,
    total_special_abilities_used INTEGER DEFAULT 0,
    average_game_duration INTERVAL,
    rank_points INTEGER DEFAULT 1000,
    rank_tier TEXT DEFAULT 'bronze',
    seasonal_rank_points INTEGER DEFAULT 0,
    season_highest_rank INTEGER DEFAULT 1000,
    last_match_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Set up Row Level Security (RLS)
ALTER TABLE player_stats ENABLE ROW LEVEL SECURITY;

-- Policy for viewing stats (authenticated users can view all stats)
CREATE POLICY "View stats" ON player_stats
    FOR SELECT
    TO authenticated
    USING (true);

-- Policy for updating stats (only the system can update stats via functions)
CREATE POLICY "System updates stats" ON player_stats
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Policy for inserting stats (only the system can insert via functions)
CREATE POLICY "System inserts stats" ON player_stats
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

-- Create function to migrate existing stats
CREATE OR REPLACE FUNCTION migrate_player_stats()
RETURNS void AS $$
BEGIN
    -- Insert existing stats from player_profiles
    INSERT INTO player_stats (
        user_id,
        total_matches,
        wins,
        losses,
        draws,
        current_streak,
        longest_streak,
        rank_points,
        rank_tier,
        seasonal_rank_points,
        season_highest_rank,
        last_match_at
    )
    SELECT 
        user_id,
        total_matches,
        wins,
        losses,
        draws,
        current_streak,
        longest_streak,
        rank_points,
        rank_tier,
        seasonal_rank_points,
        season_highest_rank,
        last_match_at
    FROM player_profiles
    ON CONFLICT (user_id) DO UPDATE SET
        total_matches = EXCLUDED.total_matches,
        wins = EXCLUDED.wins,
        losses = EXCLUDED.losses,
        draws = EXCLUDED.draws,
        current_streak = EXCLUDED.current_streak,
        longest_streak = EXCLUDED.longest_streak,
        rank_points = EXCLUDED.rank_points,
        rank_tier = EXCLUDED.rank_tier,
        seasonal_rank_points = EXCLUDED.seasonal_rank_points,
        season_highest_rank = EXCLUDED.season_highest_rank,
        last_match_at = EXCLUDED.last_match_at;

    -- Aggregate match history stats
    WITH match_stats AS (
        SELECT 
            user_id,
            SUM(damage_dealt) as total_damage,
            SUM(damage_received) as total_damage_received,
            SUM(cards_defeated) as total_cards,
            SUM(turns_played) as total_turns,
            SUM(special_abilities_used) as total_abilities,
            AVG(EXTRACT(EPOCH FROM (ended_at - started_at))) as avg_duration
        FROM match_history
        GROUP BY user_id
    )
    UPDATE player_stats ps
    SET 
        total_damage_dealt = COALESCE(ms.total_damage, 0),
        total_damage_received = COALESCE(ms.total_damage_received, 0),
        total_cards_defeated = COALESCE(ms.total_cards, 0),
        total_turns_played = COALESCE(ms.total_turns, 0),
        total_special_abilities_used = COALESCE(ms.total_abilities, 0),
        average_game_duration = CASE 
            WHEN ms.avg_duration IS NOT NULL THEN make_interval(secs => ms.avg_duration)
            ELSE NULL
        END
    FROM match_stats ms
    WHERE ps.user_id = ms.user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger function to update stats
CREATE OR REPLACE FUNCTION update_player_stats()
RETURNS TRIGGER AS $$
BEGIN
    -- Update basic stats
    UPDATE player_stats
    SET 
        total_matches = total_matches + 1,
        wins = CASE WHEN NEW.result = 'win' THEN wins + 1 ELSE wins END,
        losses = CASE WHEN NEW.result = 'loss' THEN losses + 1 ELSE losses END,
        draws = CASE WHEN NEW.result = 'draw' THEN draws + 1 ELSE draws END,
        current_streak = CASE 
            WHEN NEW.result = 'win' THEN current_streak + 1
            WHEN NEW.result = 'loss' THEN 0
            ELSE current_streak
        END,
        total_damage_dealt = total_damage_dealt + NEW.damage_dealt,
        total_damage_received = total_damage_received + NEW.damage_received,
        total_cards_defeated = total_cards_defeated + NEW.cards_defeated,
        total_turns_played = total_turns_played + NEW.turns_played,
        total_special_abilities_used = total_special_abilities_used + NEW.special_abilities_used,
        last_match_at = NEW.ended_at,
        updated_at = NOW()
    WHERE user_id = NEW.user_id;

    -- Update longest streak if needed
    UPDATE player_stats
    SET longest_streak = current_streak
    WHERE user_id = NEW.user_id
    AND current_streak > longest_streak;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger
DROP TRIGGER IF EXISTS update_player_stats_trigger ON match_history;
CREATE TRIGGER update_player_stats_trigger
AFTER INSERT ON match_history
FOR EACH ROW
EXECUTE FUNCTION update_player_stats();

-- Create function to get leaderboard
CREATE OR REPLACE FUNCTION get_leaderboard(
    limit_count INTEGER DEFAULT 100,
    offset_count INTEGER DEFAULT 0
)
RETURNS TABLE (
    user_id UUID,
    display_name TEXT,
    avatar_url TEXT,
    rank_points INTEGER,
    rank_tier TEXT,
    wins INTEGER,
    losses INTEGER,
    total_matches INTEGER,
    current_streak INTEGER,
    win_rate NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ps.user_id,
        pp.display_name,
        pp.avatar_url,
        ps.rank_points,
        ps.rank_tier,
        ps.wins,
        ps.losses,
        ps.total_matches,
        ps.current_streak,
        CASE 
            WHEN ps.total_matches > 0 THEN 
                (ps.wins::NUMERIC / ps.total_matches::NUMERIC) * 100
            ELSE 0
        END as win_rate
    FROM player_stats ps
    JOIN player_profiles pp ON ps.user_id = pp.user_id
    ORDER BY ps.rank_points DESC
    LIMIT limit_count
    OFFSET offset_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant necessary permissions
GRANT SELECT ON match_history TO authenticated;
GRANT INSERT ON match_history TO authenticated;
GRANT SELECT ON player_stats TO authenticated;
GRANT UPDATE ON player_stats TO authenticated;
GRANT INSERT ON player_stats TO authenticated;
GRANT EXECUTE ON FUNCTION get_leaderboard TO authenticated;
GRANT EXECUTE ON FUNCTION update_player_stats TO authenticated;
GRANT EXECUTE ON FUNCTION migrate_player_stats TO authenticated;

-- Execute migration
SELECT migrate_player_stats();

-- Remove stats columns from player_profiles
ALTER TABLE player_profiles
DROP COLUMN IF EXISTS wins,
DROP COLUMN IF EXISTS losses,
DROP COLUMN IF EXISTS draws,
DROP COLUMN IF EXISTS total_matches,
DROP COLUMN IF EXISTS current_streak,
DROP COLUMN IF EXISTS longest_streak,
DROP COLUMN IF EXISTS rank_points,
DROP COLUMN IF EXISTS rank_tier,
DROP COLUMN IF EXISTS seasonal_rank_points,
DROP COLUMN IF EXISTS season_highest_rank;
