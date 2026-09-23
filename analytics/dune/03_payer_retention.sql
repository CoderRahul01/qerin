-- Paying wallets: first top-up date, repeat top-ups, and lifetime value.
-- Use as a table widget. Repeat payers are your strongest growth signal.
WITH t AS (
    SELECT "from" AS wallet, evt_block_time, value / 1e6 AS usd
    FROM erc20_base.evt_Transfer
    WHERE contract_address = 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913
      AND "to" = from_hex(substr('{{qerin_wallet}}', 3))
)
SELECT
    wallet,
    min(evt_block_time)  AS first_topup,
    max(evt_block_time)  AS last_topup,
    count(*)             AS topups,
    sum(usd)             AS lifetime_usd,
    count(*) > 1         AS is_repeat_payer
FROM t
GROUP BY 1
ORDER BY lifetime_usd DESC
