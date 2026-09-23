-- Qerin receipts recorded on-chain per day (Base mainnet).
-- Source: AnswerDelivered(bytes32 indexed receiptId, bytes32 indexed questionHash,
--                         uint256 sourceCount, uint256 totalPaidMicroUsdc)
-- topic0 = keccak256("AnswerDelivered(bytes32,bytes32,uint256,uint256)")
WITH receipts AS (
    SELECT
        block_time,
        tx_hash,
        bytearray_to_uint256(bytearray_substring(data, 1, 32))  AS source_count,
        bytearray_to_uint256(bytearray_substring(data, 33, 32)) / 1e6 AS source_paid_usd
    FROM base.logs
    WHERE contract_address = 0xb35788922a5b9C8938dE8AEDf725b88D26eEEa45
      AND topic0 = 0xa5ef1a3b1fa0267f6d8dbf3b66a46519dfe0429ae0edbc288f8d5c1d79be7c0b
)
SELECT
    date_trunc('day', block_time)                                   AS day,
    count(*)                                                        AS answers_delivered,
    sum(source_count)                                               AS paid_sources_used,
    sum(source_paid_usd)                                            AS source_spend_usd,
    sum(count(*)) OVER (ORDER BY date_trunc('day', block_time))     AS cumulative_answers,
    sum(sum(source_paid_usd)) OVER (ORDER BY date_trunc('day', block_time)) AS cumulative_source_spend_usd
FROM receipts
GROUP BY 1
ORDER BY 1 DESC
