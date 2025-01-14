-- Drop existing function if it exists
drop function if exists create_trade_listing(uuid,uuid,integer);

-- Function to handle creating a trade listing
create or replace function create_trade_listing(
  p_card_id uuid,
  p_seller_id uuid,
  p_token_price integer
)
returns uuid
language plpgsql
security definer
as $$
declare
  v_listing_id uuid;
begin
  -- Delete any cancelled listings for this card
  delete from trade_listings
  where card_id = p_card_id
  and seller_id = p_seller_id
  and status = 'cancelled';

  -- Check if card is already actively listed
  if exists (
    select 1
    from trade_listings
    where card_id = p_card_id
    and status = 'active'
  ) then
    raise exception 'Card is already listed for trade';
  end if;

  -- Create new listing
  insert into trade_listings (
    card_id,
    seller_id,
    token_price,
    status,
    listed_at
  ) values (
    p_card_id,
    p_seller_id,
    p_token_price,
    'active',
    now()
  )
  returning id into v_listing_id;

  return v_listing_id;
end;
$$;

-- Grant execute permission to authenticated users
grant execute on function create_trade_listing to authenticated;
