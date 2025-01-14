-- Enable RLS on relevant tables
ALTER TABLE public.player_decks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.matchmaking_queue ENABLE ROW LEVEL SECURITY;

-- Policy for player_decks: users can only access their own decks
CREATE POLICY "Users can only access their own decks"
ON public.player_decks
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Policy for cards: users can only access their own cards
CREATE POLICY "Users can only access their own cards"
ON public.cards
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Policy for matchmaking: users can see all entries but only modify their own
CREATE POLICY "Users can view all matchmaking entries"
ON public.matchmaking_queue
FOR SELECT
USING (true);

CREATE POLICY "Users can only modify their own matchmaking entries"
ON public.matchmaking_queue
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Add constraints to prevent deck manipulation
ALTER TABLE public.player_decks
ADD CONSTRAINT valid_deck_size 
CHECK (jsonb_array_length(card_list::jsonb) = 5);

-- Add function to validate card ownership
CREATE OR REPLACE FUNCTION public.validate_deck_cards()
RETURNS TRIGGER AS $$
DECLARE
  card_id text;
  card_count integer;
BEGIN
  -- Check each card in the deck belongs to the user
  FOR card_id IN SELECT jsonb_array_elements(NEW.card_list::jsonb)->>'id'
  LOOP
    SELECT COUNT(*) INTO card_count
    FROM public.cards
    WHERE id = card_id::uuid
    AND user_id = NEW.user_id
    AND is_active = true;

    IF card_count = 0 THEN
      RAISE EXCEPTION 'Invalid card in deck: %', card_id;
    END IF;
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add trigger to validate cards when deck is created or updated
CREATE TRIGGER validate_deck_cards_trigger
BEFORE INSERT OR UPDATE ON public.player_decks
FOR EACH ROW
EXECUTE FUNCTION public.validate_deck_cards();

-- Add function to prevent card property manipulation during game
CREATE OR REPLACE FUNCTION public.validate_card_properties()
RETURNS TRIGGER AS $$
BEGIN
  -- Ensure power and health are within reasonable bounds
  IF NEW.power < 0 OR NEW.power > 999 OR
     NEW.health < 1 OR NEW.health > 999 THEN
    RAISE EXCEPTION 'Invalid card properties: power and health must be within reasonable bounds';
  END IF;

  -- Validate special effects format
  IF NEW.special_effects IS NOT NULL AND 
     jsonb_typeof(NEW.special_effects::jsonb) != 'array' THEN
    RAISE EXCEPTION 'Invalid special effects format';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add trigger to validate card properties
CREATE TRIGGER validate_card_properties_trigger
BEFORE INSERT OR UPDATE ON public.cards
FOR EACH ROW
EXECUTE FUNCTION public.validate_card_properties();

-- Add function to prevent matchmaking manipulation
CREATE OR REPLACE FUNCTION public.validate_matchmaking_entry()
RETURNS TRIGGER AS $$
BEGIN
  -- Ensure user isn't already in queue
  IF EXISTS (
    SELECT 1 FROM public.matchmaking_queue
    WHERE user_id = NEW.user_id
    AND status = 'waiting'
    AND id != NEW.id
  ) THEN
    RAISE EXCEPTION 'User already in matchmaking queue';
  END IF;

  -- Validate deck exists and belongs to user
  IF NOT EXISTS (
    SELECT 1 FROM public.player_decks
    WHERE id = NEW.deck_id::uuid
    AND user_id = NEW.user_id
    AND is_active = true
  ) THEN
    RAISE EXCEPTION 'Invalid deck for matchmaking';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add trigger to validate matchmaking entries
CREATE TRIGGER validate_matchmaking_entry_trigger
BEFORE INSERT OR UPDATE ON public.matchmaking_queue
FOR EACH ROW
EXECUTE FUNCTION public.validate_matchmaking_entry();
