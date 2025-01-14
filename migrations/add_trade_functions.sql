-- Drop existing function
drop function if exists purchase_trade_listing(uuid,uuid);

-- Function to handle card purchase and token transfer
create or replace function purchase_trade_listing(
  p_listing_id uuid,
  p_buyer_id uuid
)
returns void
language plpgsql
security definer
as $$
declare
  v_token_price integer;
  v_seller_id uuid;
  v_card_id uuid;
begin
  -- Get listing details and lock the row
  select token_price, seller_id, card_id
  into v_token_price, v_seller_id, v_card_id
  from trade_listings
  where id = p_listing_id
  and status = 'active'
  for update;

  -- Check if listing exists and is active
  if not found then
    raise exception 'Listing not found or is not active';
  end if;

  -- Check if buyer has enough tokens
  if not exists (
    select 1
    from player_profiles
    where user_id = p_buyer_id
    and tokens >= v_token_price
  ) then
    raise exception 'Insufficient tokens';
  end if;

  -- Begin transaction
  -- 1. Deduct tokens from buyer
  update player_profiles
  set tokens = tokens - v_token_price
  where user_id = p_buyer_id;

  -- 2. Add tokens to seller (minus 1 token fee)
  update player_profiles
  set tokens = tokens + (v_token_price - 1)
  where user_id = v_seller_id;

  -- 3. Transfer card ownership
  update cards
  set user_id = p_buyer_id
  where id = v_card_id;

  -- 4. Update listing status
  update trade_listings
  set status = 'sold'
  where id = p_listing_id;

  -- Create transaction records
  insert into token_transactions (
    user_id,
    amount,
    transaction_type,
    is_purchased,
    description
  ) values
  (p_buyer_id, -v_token_price, 'trade_purchase', true, 'Card purchase from marketplace'),
  (v_seller_id, v_token_price - 1, 'trade_sale', true, 'Card sold on marketplace (1 token fee)');
end;
$$;

-- Grant execute permission to authenticated users
grant execute on function purchase_trade_listing to authenticated;
