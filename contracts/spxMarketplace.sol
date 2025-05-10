// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./spxCoin.sol";
import "./spxNFT.sol";
import "openzeppelin-contracts/contracts/access/Ownable.sol";

// spxMarketplace 是一个简单的 NFT 市场合约
contract spxMarketplace is Ownable {
    spxCoin public coin;
    spxNFT public nft;

    bytes public tssPublicKey;
    bytes public tssSignature;

    // 销售信息，NFT 的 ID 与价格的映射
    mapping(uint256 => uint256) public nftPrices;

    // 事件：NFT 销售
    event NFTBought(uint256 indexed nftId, address indexed buyer, uint256 price);

    // 事件: TSS 签名验证通过
    event TSSSignatureVerified(bytes indexed publicKey, bytes indexed signature);

    // 构造函数，初始化 NFT 合约和代币合约地址
    constructor(spxCoin _spxCoin, spxNFT _spxNFT) Ownable(msg.sender) {
        coin = _spxCoin;
        nft = _spxNFT;
    }

    // 修饰器，确保只有签名验证通过才可以触发buy
    modifier onlyVerifiedSignature(bytes memory sig) {
        require(getSignatureResult(sig) == true, "Signature verification failed");
        _;
    }

    //buy NFT
    function buyNFT(uint256 nftId, bytes memory sig) public onlyVerifiedSignature(sig) {
        uint256 price = nftPrices[nftId];
        require(price > 0, "NFT is not for sale");
        require(coin.balanceOf(msg.sender) >= price, "Insufficient balance");

        // 确保市场合约被授权转移 NFT
        require(nft.isApprovedForAll(nft.ownerOf(nftId), address(this)), "Marketplace not approved");

        // 买家支付代币给合约（卖家）
        coin.transferFrom(msg.sender, nft.ownerOf(nftId), price);

        // 将 NFT 转给买家
        nft.safeTransferFrom(nft.ownerOf(nftId), msg.sender, nftId);

        // 清除销售记录
        delete nftPrices[nftId];

        // 触发购买事件
        emit NFTBought(nftId, msg.sender, price);
    }

    // 设置 NFT 销售价格
    function setPrice(uint256 nftId, uint256 price) public {
        require(nft.ownerOf(nftId) == msg.sender, "Only the owner can set the price");
        nftPrices[nftId] = price;
    }

    // 设置 TSS 公钥
    function setTSSPublicKey(bytes memory publicKey) public onlyOwner {
        tssPublicKey = publicKey;
    }

    // 获取签名
    function getSignature(bytes memory signature) public onlyOwner {
        tssSignature = signature;
    }

    // 获取签名验证结果
    function getSignatureResult(bytes memory sig) public view returns (bool) {
        if (sig.length == 0) {
            return false;
        }
        bytes memory pubkeyres = tssPublicKey;
        return keccak256(abi.encodePacked(pubkeyres)) == keccak256(abi.encodePacked(tssPublicKey));
    }
}
