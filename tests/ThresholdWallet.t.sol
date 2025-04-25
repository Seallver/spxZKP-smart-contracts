// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.20;

import {RiscZeroCheats} from "risc0/test/RiscZeroCheats.sol";
import {console2} from "forge-std/console2.sol";
import {Test} from "forge-std/Test.sol";
import {IRiscZeroVerifier} from "risc0/IRiscZeroVerifier.sol";
import {ThresholdWallet} from "../contracts/ThresholdWallet.sol";
import {Elf} from "./Elf.sol";

contract ThresholdWalletTest is RiscZeroCheats, Test {
    ThresholdWallet public wallet;
    address public userA;
    address public userB;
    bytes mockSeal;

    function setUp() public {
        userA = makeAddr("userA");
        userB = makeAddr("userB");
        
        IRiscZeroVerifier verifier = deployRiscZeroVerifier();
        wallet = new ThresholdWallet(verifier);
        
        vm.deal(address(wallet), 5 ether);
        
        mockSeal = hex"1234567890";
    }

    function test_WalletCreation() public {
        assertEq(wallet.owner(), address(this));
        assertEq(wallet.nonce(), 0);
        assertEq(wallet.isVerified(), false);
        assertEq(address(wallet).balance, 5 ether);
    }

    function test_SubmitTransaction() public {
        uint256 txNonce = wallet.submitTransaction(userA, 1 ether, "", 21000);
        
        assertEq(txNonce, 0);
        assertEq(wallet.nonce(), 1);
        
        ThresholdWallet.Transaction memory txn = wallet.getTransaction(txNonce);
        
        assertEq(txn.to, userA);
        assertEq(txn.value, 1 ether);
        assertEq(txn.data.length, 0);
        assertEq(txn.gas, 21000);
        assertTrue(txn.timestamp > 0);
        assertEq(uint(txn.status), uint(ThresholdWallet.TransactionStatus.Pending));
    }

    function test_ExecuteTransactionWithMockVerification() public {

        uint256 txNonce = wallet.submitTransaction(userA, 1 ether, "", 21000);
        
        assertEq(userA.balance, 0);
        
        bytes memory journal = abi.encode(true);
        bytes32 journalHash = sha256(journal);
        
        bytes4 verifySelector = IRiscZeroVerifier.verify.selector;
        
        vm.mockCall(
            address(wallet.verifier()),
            abi.encodeWithSelector(verifySelector, mockSeal, wallet.imageId(), journalHash),
            abi.encode()  
        );
        
        bool success = wallet.executeTransaction(txNonce, mockSeal);

        assertTrue(success);
        assertTrue(wallet.isVerified());
        assertEq(userA.balance, 1 ether);
        
 
        ThresholdWallet.Transaction memory txn = wallet.getTransaction(txNonce);
        assertEq(uint(txn.status), uint(ThresholdWallet.TransactionStatus.Executed));
    }

    function test_ExecuteTransactionWithMockVerificationFailure() public {

        uint256 txNonce = wallet.submitTransaction(userA, 1 ether, "", 21000);
        

        bytes memory journal = abi.encode(true);
        bytes32 journalHash = sha256(journal);
        

        bytes4 verifySelector = IRiscZeroVerifier.verify.selector;
        
        vm.mockCallRevert(
            address(wallet.verifier()),
            abi.encodeWithSelector(verifySelector, mockSeal, wallet.imageId(), journalHash),
            "Verification failed"
        );
        
  
        vm.expectRevert(ThresholdWallet.ZKProofVerificationFailed.selector);
        wallet.executeTransaction(txNonce, mockSeal);
        

        ThresholdWallet.Transaction memory txn = wallet.getTransaction(txNonce);
        assertEq(uint(txn.status), uint(ThresholdWallet.TransactionStatus.Pending));
        

        assertEq(userA.balance, 0);
    }

    function test_CancelTransaction() public {
    
        uint256 txNonce = wallet.submitTransaction(userA, 1 ether, "", 21000);
 
        wallet.cancelTransaction(txNonce);
        
        ThresholdWallet.Transaction memory txn = wallet.getTransaction(txNonce);
        assertEq(uint(txn.status), uint(ThresholdWallet.TransactionStatus.Cancelled));
    }

    function test_TransferOwnership() public {
      
        assertEq(wallet.owner(), address(this));
        

        wallet.transferOwnership(userB);
        

        assertEq(wallet.owner(), userB);
    }

    function test_OnlyOwnerModifier() public {
 
        vm.prank(userA);
        

        vm.expectRevert(ThresholdWallet.OnlyOwner.selector);
        wallet.submitTransaction(userB, 1 ether, "", 21000);
    }

    function test_TransactionTimeout() public {
       
        uint256 txNonce = wallet.submitTransaction(userA, 1 ether, "", 21000);
        
   
        vm.warp(block.timestamp + wallet.TRANSACTION_TIMEOUT() + 1);
        
  
        vm.expectRevert(ThresholdWallet.TransactionTimedOut.selector);
        wallet.executeTransaction(txNonce, mockSeal);
    }

    function test_GasEstimation() public {
  
        uint256 gasEstimate = wallet.estimateTransactionGas(userA, 1 ether, "");
        assertEq(gasEstimate, 21000); 
        
        bytes memory data = hex"1234567890abcdef";
        uint256 gasEstimateWithData = wallet.estimateTransactionGas(userA, 1 ether, data);
        assertTrue(gasEstimateWithData > 21000); 
        
        address mockContract = deployEmptyContract();
        uint256 gasEstimateForContract = wallet.estimateTransactionGas(mockContract, 0, "");
        assertTrue(gasEstimateForContract > 21000); 
    }

    function deployEmptyContract() internal returns (address) {
        bytes memory bytecode = hex"6080604052348015600f57600080fd5b50603c80601d6000396000f3fe6080604052600080fdfea2646970667358221220d86a40f88e4c94dd5c1b6a493eb3af581a839881efe19322c231b30fac899ae564736f6c63430008170033";
        address addr;
        assembly {
            addr := create(0, add(bytecode, 0x20), mload(bytecode))
        }
        return addr;
    }
}