// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Ownable2Step} from "@openzeppelin/contracts/access/Ownable2Step.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {SafeCast} from "@openzeppelin/contracts/utils/math/SafeCast.sol";

/// @title QerinReceiptRegistry
/// @notice Append-only, on-chain log of answers Qerin has delivered. Anyone
/// can read; only wallets the contract owner has explicitly authorized can
/// write. This is a credibility/audit layer on top of the individual x402
/// payment transactions — each payment is already independently verifiable
/// on Basescan; this contract additionally lets a third party query Qerin's
/// own delivery history in one place.
/// @dev Question text is never stored, only its keccak256 hash, so a
/// developer can independently verify a specific delivery by hashing their
/// own question client-side and comparing it against
/// `receipts[receiptId].questionHash`.
contract QerinReceiptRegistry is Ownable2Step, Pausable {
    using SafeCast for uint256;

    /// @dev Packed into a single storage slot (16 + 5 + 2 = 23 of 32 bytes)
    /// alongside `questionHash` in its own slot — halves the SSTORE cost of
    /// `recordReceipt` versus four separate 32-byte fields. Bounds are chosen
    /// with large headroom over any realistic value, not the tightest fit:
    /// - totalPaidMicroUsdc: USDC has 6 decimals; uint128's max represents
    ///   roughly 3.4 * 10^32 USD, far beyond any lifetime total this
    ///   contract could plausibly log.
    /// - timestamp: uint40 covers block.timestamp (seconds) until year ~36812.
    /// - sourceCount: sources are capped at 3 today (selectSources.ts);
    ///   uint16 leaves headroom for that cap changing without a migration.
    struct Receipt {
        bytes32 questionHash;
        uint128 totalPaidMicroUsdc;
        uint40 timestamp;
        uint16 sourceCount;
    }

    /// @notice receiptId => recorded receipt. A zero `timestamp` means "not recorded".
    mapping(bytes32 receiptId => Receipt) public receipts;

    /// @notice Wallets currently allowed to call `recordReceipt`.
    mapping(address writer => bool authorized) public authorizedWriters;

    event AnswerDelivered(
        bytes32 indexed receiptId,
        bytes32 indexed questionHash,
        uint256 sourceCount,
        uint256 totalPaidMicroUsdc
    );
    event WriterAuthorized(address indexed writer);
    event WriterRevoked(address indexed writer);

    error NotAuthorized(address caller);
    error ReceiptAlreadyExists(bytes32 receiptId);
    error ZeroAddress();

    modifier onlyAuthorizedWriter() {
        _checkAuthorizedWriter();
        _;
    }

    /// @param initialBackend The first wallet authorized to record receipts
    /// (Qerin's backend signing wallet). Ownership starts with the deployer;
    /// transfer it to a multisig/timelock post-deploy if desired.
    constructor(address initialBackend) Ownable(msg.sender) {
        _authorizeWriter(initialBackend);
    }

    /// @notice Authorizes an additional wallet to record receipts.
    /// @dev Used for backend wallet rotation: authorize the new wallet first,
    /// switch the backend over, then `revokeWriter` the old one — avoids any
    /// downtime and, critically, avoids ever needing to redeploy this
    /// contract (and losing its receipt history at a new address) just
    /// because the signing key changed.
    function authorizeWriter(address writer) external onlyOwner {
        _authorizeWriter(writer);
    }

    /// @notice Revokes a wallet's ability to record receipts.
    /// @dev Revoking every writer does not brick the contract — the owner
    /// can always `authorizeWriter` a replacement; only the log already
    /// written is (by design) immutable.
    function revokeWriter(address writer) external onlyOwner {
        authorizedWriters[writer] = false;
        emit WriterRevoked(writer);
    }

    /// @notice Pauses `recordReceipt`. Use if a backend signing key is
    /// suspected compromised, to stop writes immediately while a
    /// replacement wallet is authorized — faster than revoking, since it
    /// needs no address argument.
    function pause() external onlyOwner {
        _pause();
    }

    /// @notice Resumes `recordReceipt` after a pause.
    function unpause() external onlyOwner {
        _unpause();
    }

    /// @notice Records a delivered answer. Reverts if `receiptId` was
    /// already recorded — this is an append-only log, not a mutable table.
    /// @param receiptId Caller-generated unique identifier for this delivery.
    /// @param questionHash keccak256 of the question text (never the text itself).
    /// @param sourceCount Number of paid sources that contributed to the answer.
    /// @param totalPaidMicroUsdc Total paid across all sources, in USDC's 6-decimal atomic units.
    function recordReceipt(
        bytes32 receiptId,
        bytes32 questionHash,
        uint256 sourceCount,
        uint256 totalPaidMicroUsdc
    ) external onlyAuthorizedWriter whenNotPaused {
        if (receipts[receiptId].timestamp != 0) revert ReceiptAlreadyExists(receiptId);

        // SafeCast reverts on overflow rather than silently truncating, so an
        // unexpectedly large input fails loudly instead of corrupting storage.
        receipts[receiptId] = Receipt({
            questionHash: questionHash,
            totalPaidMicroUsdc: totalPaidMicroUsdc.toUint128(),
            timestamp: block.timestamp.toUint40(),
            sourceCount: sourceCount.toUint16()
        });

        emit AnswerDelivered(receiptId, questionHash, sourceCount, totalPaidMicroUsdc);
    }

    /// @notice Convenience view for whether a receipt has been recorded.
    function receiptExists(bytes32 receiptId) external view returns (bool) {
        return receipts[receiptId].timestamp != 0;
    }

    function _authorizeWriter(address writer) private {
        if (writer == address(0)) revert ZeroAddress();
        authorizedWriters[writer] = true;
        emit WriterAuthorized(writer);
    }

    function _checkAuthorizedWriter() private view {
        if (!authorizedWriters[msg.sender]) revert NotAuthorized(msg.sender);
    }
}
