-- Function to handle token purchases
create or replace function handle_token_purchase(
  p_user_id uuid,
  p_amount integer
)
returns void
language plpgsql
security definer
as $$
begin
  -- Insert or update player profile
  insert into player_profiles (user_id, purchased_tokens, tokens)
  values (p_user_id, p_amount, p_amount)
  on conflict (user_id) 
  do update set
    purchased_tokens = player_profiles.purchased_tokens + p_amount,
    tokens = player_profiles.tokens + p_amount;
end;
$$;

-- Grant execute permission to authenticated users
grant execute on function handle_token_purchase to authenticated;
