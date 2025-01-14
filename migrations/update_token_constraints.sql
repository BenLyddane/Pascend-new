-- Update token_transactions constraints to properly handle refunds
alter table token_transactions
drop constraint if exists valid_amount;

alter table token_transactions
add constraint valid_amount check (
  (
    (transaction_type = 'card_generation' and amount = -1)
    or
    (transaction_type = 'card_generation_refund' and amount = 1)
    or
    (transaction_type = any (array['signup_bonus', 'purchase']) and amount > 0)
  )
);

-- Function to handle all token balance updates
create or replace function check_token_balance()
returns trigger
language plpgsql
security definer
as $$
begin
    -- For card generation (amount = -1)
    if NEW.transaction_type = 'card_generation' then
        -- Check and update the appropriate token type
        if NEW.is_purchased then
            -- Check purchased tokens
            if not exists (
                select 1
                from player_profiles
                where user_id = NEW.user_id
                and purchased_tokens >= abs(NEW.amount)
            ) then
                raise exception 'Insufficient purchased tokens';
            end if;
            
            -- Update purchased tokens
            update player_profiles
            set purchased_tokens = purchased_tokens + NEW.amount
            where user_id = NEW.user_id;
        else
            -- Check free tokens
            if not exists (
                select 1
                from player_profiles
                where user_id = NEW.user_id
                and tokens >= abs(NEW.amount)
            ) then
                raise exception 'Insufficient free tokens';
            end if;
            
            -- Update free tokens
            update player_profiles
            set tokens = tokens + NEW.amount
            where user_id = NEW.user_id;
        end if;
    -- For refunds (amount = 1)
    elsif NEW.transaction_type = 'card_generation_refund' then
        -- Add to the appropriate token type
        if NEW.is_purchased then
            update player_profiles
            set purchased_tokens = purchased_tokens + NEW.amount
            where user_id = NEW.user_id;
        else
            update player_profiles
            set tokens = tokens + NEW.amount
            where user_id = NEW.user_id;
        end if;
    -- For signup bonus and purchases (amount > 0)
    elsif NEW.transaction_type in ('signup_bonus', 'purchase') then
        -- Add to the appropriate token type
        if NEW.is_purchased then
            update player_profiles
            set purchased_tokens = purchased_tokens + NEW.amount
            where user_id = NEW.user_id;
        else
            update player_profiles
            set tokens = tokens + NEW.amount
            where user_id = NEW.user_id;
        end if;
    end if;

    return NEW;
end;
$$;
