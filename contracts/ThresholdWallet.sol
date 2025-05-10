// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.20;

import {IRiscZeroVerifier} from "risc0/IRiscZeroVerifier.sol";
import {ImageID} from "./ImageID.sol";
import {ISpxVrfy} from "./ISpxVrfy.sol";
import {SpxVrfy} from "./SpxVrfy.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title 基于多方门限签名的钱包合约
 * @notice 当zkVM guest执行签名验证通过后允许交易进行，否则拒绝交易
 * @dev 处理链上nonce管理、交易确认、Gas估算等问题
 */
contract ThresholdWallet is ReentrancyGuard {
    /// @notice RISC Zero 验证器合约
    IRiscZeroVerifier public immutable verifier;
    
    /// @notice 图像ID常量，从ImageID导入
    bytes32 public constant imageId = ImageID.SPXVRFY_ID;
    
    /// @notice 钱包拥有者地址
    address public owner;
    
    /// @notice 当前交易nonce
    uint256 public nonce;
    
    /// @notice 存储验证结果
    bool public isVerified;
    
    /// @notice 交易超时时间（秒）
    uint256 public constant TRANSACTION_TIMEOUT = 1 hours;
    
    /// @notice 最小gas保留量，防止钱包无法支付交易费用，仍需修改验证
    uint256 public constant MIN_GAS_RESERVE = 0.01 ether;
    
    /// @notice 交易状态枚举
    enum TransactionStatus {
        Nonexistent, // 交易不存在
        Pending,     // 等待执行
        Executed,    // 已执行
        Cancelled    // 已取消
    }
    
    /// @notice 交易结构体
    struct Transaction {
        address to;          // 目标地址
        uint256 value;       // 转账金额
        bytes data;          // 调用数据
        uint256 gas;         // gas限制
        uint256 timestamp;   // 创建时间戳
        TransactionStatus status; // 交易状态
    }
    
    /// @notice 存储所有交易的映射 (nonce => Transaction)
    mapping(uint256 => Transaction) public transactions;
    

    event WalletCreated(address indexed owner);
    event TransactionSubmitted(uint256 indexed nonce, address indexed to, uint256 value);
    event TransactionExecuted(uint256 indexed nonce, address indexed to, uint256 value, bool success);
    event TransactionCancelled(uint256 indexed nonce);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);
    event VerificationResult(bool success);
    

    error ZKProofVerificationFailed();
    error TransactionDoesNotExist();
    error TransactionAlreadyExecuted();
    error TransactionTimedOut();
    error TransactionFailed();
    error InsufficientGasReserve();
    error InvalidGasEstimation();
    error OnlyOwner();
    
    modifier onlyOwner() {
        if (msg.sender != owner) revert OnlyOwner();
        _;
    }

    /**
     * @notice 构造函数
     * @param _verifier RISC Zero 验证器合约
     */
    constructor(IRiscZeroVerifier _verifier) {
        verifier = _verifier;
        owner = msg.sender;
        nonce = 0;
        isVerified = false;
        
        emit WalletCreated(owner);
    }
    
    /**
     * @notice 提交交易（不执行）
     * @param _to 目标地址
     * @param _value 转账金额
     * @param _data 调用数据
     * @param _gas 预估gas限制
     * @return 交易nonce
     */
    function submitTransaction(
        address _to,
        uint256 _value,
        bytes calldata _data,
        uint256 _gas
    ) external onlyOwner returns (uint256) {
        uint256 currentNonce = nonce++;
        
        transactions[currentNonce] = Transaction({
            to: _to,
            value: _value,
            data: _data,
            gas: _gas,
            timestamp: block.timestamp,
            status: TransactionStatus.Pending
        });
        
        emit TransactionSubmitted(currentNonce, _to, _value);
        
        return currentNonce;
    }
    
    /**
     * @notice 验证签名
     * @param _seal ZK证明seal
     * @return 验证是否成功
     */
    function verifySignature(bytes calldata _seal) public returns (bool) {
        // 期望 journal 为 true，这表示签名验证成功
        bytes memory journal = abi.encode(true); 
        bytes32 journalHash = sha256(journal);
        
        try verifier.verify(_seal, imageId, journalHash) {
            isVerified = true;
            emit VerificationResult(true);
            return true;
        } catch {
            isVerified = false;
            emit VerificationResult(false);
            return false;
        }
    }
    
    /**
     * @notice 执行交易，需要通过ZK证明验证
     * @param _nonce 待执行交易的nonce
     * @param _seal ZK证明seal
     * @return success 交易执行是否成功
     */
    function executeTransaction(
        uint256 _nonce,
        bytes calldata _seal
    ) external onlyOwner nonReentrant returns (bool success) {
        Transaction storage txn = transactions[_nonce];
        
        if (txn.status != TransactionStatus.Pending) {
            revert TransactionDoesNotExist();
        }
        
        if (block.timestamp > txn.timestamp + TRANSACTION_TIMEOUT) {
            revert TransactionTimedOut();
        }
        
        // 验证ZK证明
        if (!verifySignature(_seal)) {
            revert ZKProofVerificationFailed();
        }
        
        // 确保钱包在交易后保留最小gas
        if (address(this).balance < txn.value + MIN_GAS_RESERVE) {
            revert InsufficientGasReserve();
        }
        
        // 更新状态为已执行
        txn.status = TransactionStatus.Executed;
        
        // 执行交易
        (success, ) = txn.to.call{value: txn.value, gas: txn.gas}(txn.data);
        
        if (!success) {
            txn.status = TransactionStatus.Pending; // 回滚状态
            revert TransactionFailed();
        }
        
        emit TransactionExecuted(_nonce, txn.to, txn.value, success);
        
        return success;
    }
    
    /**
     * @notice 估算交易gas费用，仍需修改验证，不够完整，仅用于演示
     * @param _to 目标地址
     * @param _value 转账金额
     * @param _data 调用数据
     * @return 预估的gas用量
     */
    function estimateTransactionGas(
        address _to,
        uint256 _value,
        bytes calldata _data
    ) external view returns (uint256) {
        // 基础交易gas成本
        uint256 baseGas = 21000;
        
        // 如果包含数据，增加gas估算
        if (_data.length > 0) {
            // 对于非零字节消耗16gas，零字节消耗4gas
            uint256 dataGas = 0;
            for (uint256 i = 0; i < _data.length; i++) {
                if (_data[i] == 0) {
                    dataGas += 4;
                } else {
                    dataGas += 16;
                }
            }
            
            // 添加固定gas成本
            baseGas += dataGas + 40000; // 额外加固定成本以确保足够
        }
        
        // 如果是合约调用，增加gas估算
        uint256 codeSize;
        assembly {
            codeSize := extcodesize(_to)
        }
        
        if (codeSize > 0) {
            baseGas += 40000; // 合约调用的额外gas
        }
        
        return baseGas;
    }
    
    /**
     * @notice 取消待执行的交易
     * @param _nonce 待取消交易的nonce
     */
    function cancelTransaction(uint256 _nonce) external onlyOwner {
        Transaction storage txn = transactions[_nonce];
        
        if (txn.status != TransactionStatus.Pending) {
            revert TransactionDoesNotExist();
        }
        
        txn.status = TransactionStatus.Cancelled;
        
        emit TransactionCancelled(_nonce);
    }
    
    /**
     * @notice 获取交易详情
     * @param _nonce 交易nonce
     * @return 交易详情
     */
    function getTransaction(uint256 _nonce) external view returns (Transaction memory) {
        return transactions[_nonce];
    }
    
    /**
     * @notice 转移钱包所有权
     * @param _newOwner 新的所有者地址
     */
    function transferOwnership(address _newOwner) external onlyOwner {
        address oldOwner = owner;
        owner = _newOwner;
        
        emit OwnershipTransferred(oldOwner, _newOwner);
    }
    
    /**
     * @notice 接收ETH
     */
    receive() external payable {}
}