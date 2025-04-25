// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.20;

/*
@description: 多方门限签名钱包工厂, 集成签名过程准备中
*/

import {IRiscZeroVerifier} from "risc0/IRiscZeroVerifier.sol";
import {ThresholdWallet} from "./ThresholdWallet.sol";

/**
 * @title 多方门限签名钱包工厂合约
 * @notice 用于创建和管理多方门限签名钱包
 */

contract ThresholdWalletFactory {
    /// @notice RISC Zero 验证器合约
    IRiscZeroVerifier public immutable verifier;
    
    /// @notice 钱包创建事件
    event WalletCreated(address indexed wallet, address indexed owner);
    
    /// @notice 保存用户创建的钱包地址
    mapping(address => address[]) public userWallets;
    
    /**
     * @notice 构造函数
     * @param _verifier RISC Zero 验证器合约
     */
    constructor(IRiscZeroVerifier _verifier) {
        verifier = _verifier;
    }
    
    /**
     * @notice 创建新的门限签名钱包
     * @return 新创建的钱包地址
     */
    function createWallet() external returns (address) {
        ThresholdWallet wallet = new ThresholdWallet(verifier);
        
        userWallets[msg.sender].push(address(wallet));
        
        emit WalletCreated(address(wallet), msg.sender);
        
        return address(wallet);
    }
    
    /**
     * @notice 获取用户创建的所有钱包
     * @param _user 用户地址
     * @return 该用户创建的所有钱包地址
     */
    function getUserWallets(address _user) external view returns (address[] memory) {
        return userWallets[_user];
    }
}

/**
 * @title 钱包接口
 */
interface IThresholdWallet {
    enum TransactionStatus {
        Nonexistent,
        Pending,
        Executed,
        Cancelled
    }
    
    struct Transaction {
        address to;
        uint256 value;
        bytes data;
        uint256 gas;
        uint256 timestamp;
        TransactionStatus status;
    }
    
    function submitTransaction(
        address _to,
        uint256 _value,
        bytes calldata _data,
        uint256 _gas
    ) external returns (uint256);
    
    function executeTransaction(
        uint256 _nonce,
        bytes calldata _seal
    ) external returns (bool);
    
    function estimateTransactionGas(
        address _to,
        uint256 _value,
        bytes calldata _data
    ) external view returns (uint256);
    
    function cancelTransaction(uint256 _nonce) external;
    
    function getTransaction(uint256 _nonce) external view returns (Transaction memory);
    
    function transferOwnership(address _newOwner) external;
} 