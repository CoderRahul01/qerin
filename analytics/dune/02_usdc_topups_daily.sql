-- Real money in: USDC transfers into Qerin's wallet on Base, per day.
-- Set the {{qerin_wallet}} parameter to the `payTo` address returned by
-- GET /v1/network-info (the same wallet users top up to).
SELECT
    date_trunc('day', evt_block_time)                          AS day,
    count(*)                                                   AS topups,
    count(DISTINCT "from")                                     AS unique_payers,
    sum(value) / 1e6                                           AS usdc_in,
    sum(sum(value) / 1e6) OVER (ORDER BY date_trunc('day', evt_block_time)) AS cumulative_usdc_in
FROM erc20_base.evt_Transfer
WHERE contract_address = 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913 -- USDC on Base
  AND "to" = from_hex(substr('{{qerin_wallet}}', 3))
GROUP BY 1
ORDER BY 1 DESC
