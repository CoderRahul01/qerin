// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {QerinReceiptRegistry} from "../src/QerinReceiptRegistry.sol";

contract QerinReceiptRegistryTest is Test {
    QerinReceiptRegistry registry;
    address owner = address(this);
    address backend = address(0xB0B);
    address newBackend = address(0xB0B2);
    address stranger = address(0xBAD);

    function setUp() public {
        registry = new QerinReceiptRegistry(backend);
    }

    // --- constructor ---

    function test_constructorAuthorizesInitialBackend() public view {
        assertTrue(registry.authorizedWriters(backend));
        assertEq(registry.owner(), owner);
    }

    function test_constructorRejectsZeroAddress() public {
        vm.expectRevert(QerinReceiptRegistry.ZeroAddress.selector);
        new QerinReceiptRegistry(address(0));
    }

    // --- recordReceipt: happy path ---

    function test_authorizedWriterCanRecordReceipt() public {
        bytes32 receiptId = keccak256("receipt-1");
        bytes32 questionHash = keccak256("what happened this week?");

        vm.prank(backend);
        vm.expectEmit(true, true, false, true);
        emit QerinReceiptRegistry.AnswerDelivered(receiptId, questionHash, 3, 71_000);
        registry.recordReceipt(receiptId, questionHash, 3, 71_000);

        (bytes32 storedHash, uint128 totalPaid, uint40 timestamp, uint16 sourceCount) =
            registry.receipts(receiptId);
        assertEq(storedHash, questionHash);
        assertEq(totalPaid, 71_000);
        assertEq(sourceCount, 3);
        assertEq(timestamp, block.timestamp);
        assertTrue(registry.receiptExists(receiptId));
    }

    function test_receiptExistsFalseForUnknownId() public view {
        assertFalse(registry.receiptExists(keccak256("never-recorded")));
    }

    // --- recordReceipt: access control ---

    function test_unauthorizedWriterCannotRecordReceipt() public {
        vm.prank(stranger);
        vm.expectRevert(abi.encodeWithSelector(QerinReceiptRegistry.NotAuthorized.selector, stranger));
        registry.recordReceipt(keccak256("x"), keccak256("y"), 1, 1);
    }

    function test_revokedWriterCannotRecordReceipt() public {
        registry.revokeWriter(backend);

        vm.prank(backend);
        vm.expectRevert(abi.encodeWithSelector(QerinReceiptRegistry.NotAuthorized.selector, backend));
        registry.recordReceipt(keccak256("x"), keccak256("y"), 1, 1);
    }

    // --- recordReceipt: append-only ---

    function test_duplicateReceiptIdReverts() public {
        bytes32 receiptId = keccak256("receipt-1");

        vm.prank(backend);
        registry.recordReceipt(receiptId, keccak256("q1"), 1, 100);

        vm.prank(backend);
        vm.expectRevert(abi.encodeWithSelector(QerinReceiptRegistry.ReceiptAlreadyExists.selector, receiptId));
        registry.recordReceipt(receiptId, keccak256("q2"), 2, 200);
    }

    // --- recordReceipt: overflow safety ---

    function test_recordReceiptRevertsOnTotalPaidOverflow() public {
        vm.prank(backend);
        vm.expectRevert();
        registry.recordReceipt(keccak256("x"), keccak256("y"), 1, uint256(type(uint128).max) + 1);
    }

    function test_recordReceiptRevertsOnSourceCountOverflow() public {
        vm.prank(backend);
        vm.expectRevert();
        registry.recordReceipt(keccak256("x"), keccak256("y"), uint256(type(uint16).max) + 1, 1);
    }

    // --- writer management ---

    function test_ownerCanAuthorizeAndRevokeWriters() public {
        assertFalse(registry.authorizedWriters(newBackend));

        vm.expectEmit(true, false, false, false);
        emit QerinReceiptRegistry.WriterAuthorized(newBackend);
        registry.authorizeWriter(newBackend);
        assertTrue(registry.authorizedWriters(newBackend));

        vm.prank(newBackend);
        registry.recordReceipt(keccak256("from-new-backend"), keccak256("q"), 1, 1);

        vm.expectEmit(true, false, false, false);
        emit QerinReceiptRegistry.WriterRevoked(newBackend);
        registry.revokeWriter(newBackend);
        assertFalse(registry.authorizedWriters(newBackend));
    }

    function test_nonOwnerCannotAuthorizeWriters() public {
        vm.prank(stranger);
        vm.expectRevert(abi.encodeWithSelector(Ownable.OwnableUnauthorizedAccount.selector, stranger));
        registry.authorizeWriter(stranger);
    }

    function test_nonOwnerCannotRevokeWriters() public {
        vm.prank(stranger);
        vm.expectRevert(abi.encodeWithSelector(Ownable.OwnableUnauthorizedAccount.selector, stranger));
        registry.revokeWriter(backend);
    }

    function test_authorizeWriterRejectsZeroAddress() public {
        vm.expectRevert(QerinReceiptRegistry.ZeroAddress.selector);
        registry.authorizeWriter(address(0));
    }

    // --- pausability ---

    function test_ownerCanPauseAndUnpause() public {
        registry.pause();

        vm.prank(backend);
        vm.expectRevert(Pausable.EnforcedPause.selector);
        registry.recordReceipt(keccak256("x"), keccak256("y"), 1, 1);

        registry.unpause();

        vm.prank(backend);
        registry.recordReceipt(keccak256("x"), keccak256("y"), 1, 1);
        assertTrue(registry.receiptExists(keccak256("x")));
    }

    function test_nonOwnerCannotPause() public {
        vm.prank(stranger);
        vm.expectRevert(abi.encodeWithSelector(Ownable.OwnableUnauthorizedAccount.selector, stranger));
        registry.pause();
    }

    // --- ownership transfer (Ownable2Step) ---

    function test_ownershipTransferRequiresAcceptance() public {
        registry.transferOwnership(stranger);
        assertEq(registry.owner(), owner, "ownership should not change until accepted");

        vm.prank(stranger);
        registry.acceptOwnership();
        assertEq(registry.owner(), stranger);
    }
}
