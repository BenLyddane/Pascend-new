-- Enable RLS for temp_cards
ALTER TABLE public.temp_cards ENABLE ROW LEVEL SECURITY;

-- Create policies for temp_cards
CREATE POLICY "Allow insert for authenticated users"
ON public.temp_cards
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
);

CREATE POLICY "Allow select for authenticated users"
ON public.temp_cards
FOR SELECT
TO authenticated
USING (
  auth.uid() = user_id
);

CREATE POLICY "Allow delete for authenticated users"
ON public.temp_cards
FOR DELETE
TO authenticated
USING (
  auth.uid() = user_id
);

-- Enable RLS for cards
ALTER TABLE public.cards ENABLE ROW LEVEL SECURITY;

-- Create policies for cards
CREATE POLICY "Allow insert for authenticated users"
ON public.cards
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
);

CREATE POLICY "Allow select for authenticated users"
ON public.cards
FOR SELECT
TO authenticated
USING (
  auth.uid() = user_id
);

CREATE POLICY "Allow update for authenticated users"
ON public.cards
FOR UPDATE
TO authenticated
USING (
  auth.uid() = user_id
)
WITH CHECK (
  auth.uid() = user_id
);
