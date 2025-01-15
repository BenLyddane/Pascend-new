-- Drop existing function and trigger if they exist
DROP TRIGGER IF EXISTS update_token_balance ON token_transactions;
DROP FUNCTION IF EXISTS check_token_balance();

-- Create new function to update token balances
CREATE OR REPLACE FUNCTION check_token_balance()
RETURNS TRIGGER AS $$
BEGIN
    -- For card generation (amount = -1)
    IF NEW.transaction_type = 'card_generation' THEN
        -- Check and update the appropriate token type
        IF NEW.is_purchased THEN
            -- Check purchased tokens
            IF NOT EXISTS (
                SELECT 1
                FROM player_profiles
                WHERE user_id = NEW.user_id
                AND purchased_tokens >= abs(NEW.amount)
            ) THEN
                RAISE EXCEPTION 'Insufficient purchased tokens';
            END IF;
            
            -- Update purchased tokens
            UPDATE player_profiles
            SET purchased_tokens = purchased_tokens + NEW.amount
            WHERE user_id = NEW.user_id;
        ELSE
            -- Check free tokens
            IF NOT EXISTS (
                SELECT 1
                FROM player_profiles
                WHERE user_id = NEW.user_id
                AND free_tokens >= abs(NEW.amount)
            ) THEN
                RAISE EXCEPTION 'Insufficient free tokens';
            END IF;
            
            -- Update free tokens
            UPDATE player_profiles
            SET free_tokens = free_tokens + NEW.amount
            WHERE user_id = NEW.user_id;
        END IF;
    -- For refunds (amount = 1)
    ELSIF NEW.transaction_type = 'card_generation_refund' THEN
        -- Add to the appropriate token type
        IF NEW.is_purchased THEN
            UPDATE player_profiles
            SET purchased_tokens = purchased_tokens + NEW.amount
            WHERE user_id = NEW.user_id;
        ELSE
            UPDATE player_profiles
            SET free_tokens = free_tokens + NEW.amount
            WHERE user_id = NEW.user_id;
        END IF;
    -- For purchases (amount > 0)
    ELSIF NEW.transaction_type = 'purchase' THEN
        -- Purchases always update purchased_tokens
        UPDATE player_profiles
        SET purchased_tokens = purchased_tokens + NEW.amount
        WHERE user_id = NEW.user_id;
    -- For signup bonus (amount > 0)
    ELSIF NEW.transaction_type = 'signup_bonus' THEN
        -- Signup bonus always updates free_tokens
        UPDATE player_profiles
        SET free_tokens = free_tokens + NEW.amount
        WHERE user_id = NEW.user_id;
    -- For trade purchases and sales
    ELSIF NEW.transaction_type IN ('trade_purchase', 'trade_sale') THEN
        -- For trade purchases, deduct from buyer's tokens
        IF NEW.transaction_type = 'trade_purchase' THEN
            -- Check if buyer has enough tokens
            IF NOT EXISTS (
                SELECT 1
                FROM player_profiles
                WHERE user_id = NEW.user_id
                AND (
                    (NEW.is_purchased AND purchased_tokens >= abs(NEW.amount))
                    OR
                    (NOT NEW.is_purchased AND free_tokens >= abs(NEW.amount))
                )
            ) THEN
                RAISE EXCEPTION 'Insufficient tokens for trade purchase';
            END IF;
            
            -- Update buyer's tokens
            IF NEW.is_purchased THEN
                UPDATE player_profiles
                SET purchased_tokens = purchased_tokens + NEW.amount
                WHERE user_id = NEW.user_id;
            ELSE
                UPDATE player_profiles
                SET free_tokens = free_tokens + NEW.amount
                WHERE user_id = NEW.user_id;
            END IF;
        -- For trade sales, add to seller's tokens (minus fee)
        ELSIF NEW.transaction_type = 'trade_sale' THEN
            IF NEW.is_purchased THEN
                UPDATE player_profiles
                SET purchased_tokens = purchased_tokens + NEW.amount
                WHERE user_id = NEW.user_id;
            ELSE
                UPDATE player_profiles
                SET free_tokens = free_tokens + NEW.amount
                WHERE user_id = NEW.user_id;
            END IF;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to run after insert
CREATE TRIGGER update_token_balance
AFTER INSERT ON token_transactions
FOR EACH ROW
EXECUTE FUNCTION check_token_balance();
