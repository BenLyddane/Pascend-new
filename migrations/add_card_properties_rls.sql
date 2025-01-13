-- Enable RLS
ALTER TABLE public.card_properties ENABLE ROW LEVEL SECURITY;

-- Create policy to allow all operations for authenticated users
CREATE POLICY "Allow all operations for authenticated users"
ON public.card_properties
FOR ALL
USING (
  auth.uid() IN (
    SELECT user_id 
    FROM public.cards 
    WHERE id = card_id
  )
)
WITH CHECK (
  auth.uid() IN (
    SELECT user_id 
    FROM public.cards 
    WHERE id = card_id
  )
);
