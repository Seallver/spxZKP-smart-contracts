// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {StableCoinMinter} from "./StableCoinMinter.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {AggregatorV3Interface} from "@chainlink-brownie-contracts/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol";

/**
 * @title WLCEngine
 * @notice This contract is responsible for managing the collateral and minting of the WLC token.
 * It allows users to deposit collateral, mint WLC tokens, and manage their positions.
 */

contract WLCEngine is ReentrancyGuard {
  
    error WLCEngine__TokenAddressesAndPriceFeedAddressesAmountsDontMatch();
    error WLCEngine__NeedsMoreThanZero();
    error WLCEngine__TokenNotAllowed(address token);
    error WLCEngine__TransferFailed();
    error WLCEngine__BreaksHealthFactor(uint256 healthFactor);
    
    mapping(address token => address priceFeed) private s_priceFeeds;
    StableCoinMinter private immutable i_wlc;
    mapping(address user => mapping(address token => uint256 amount)) private s_collateralDeposited;
    mapping(address user => uint256 amountWlcMinted) private s_wlcMinted;

    uint256 private constant ADDITIONAL_FEED_PRECISION = 1e10;
    uint256 private constant PRECISION = 1e18;
    uint256 private constant LIQUIDATION_THRESHOLD = 20;
    uint256 private constant LIQUIDATION_PRECISION = 100;
    uint256 private constant MIN_HEALTH_FACTOR = 1e18;
    uint256 private constant LIQUIDATION_BONUS = 10; // 10% bonus for liquidators

    address[] private s_collateralTokens;

    event CollateralDeposited(address indexed user, address indexed token, uint256 indexed amount);

    modifier morethanzero(uint256 amount) {
        if (amount <= 0) revert WLCEngine__NeedsMoreThanZero();
        _;
    }

    modifier isAllowedToken(address token) {
        if (s_priceFeeds[token] == address(0)) revert WLCEngine__TokenNotAllowed(token);
        _;
    }

    constructor(address[] memory tokenAddresses, address[] memory priceFeedAddresses, address WlcAddress) {
        if (tokenAddresses.length != priceFeedAddresses.length) revert WLCEngine__TokenAddressesAndPriceFeedAddressesAmountsDontMatch();
        for (uint256 i = 0; i < tokenAddresses.length; i++) {
            s_priceFeeds[tokenAddresses[i]] = priceFeedAddresses[i];
            s_collateralTokens.push(tokenAddresses[i]);
        }
        i_wlc = StableCoinMinter(WlcAddress);
    }

    function depositCollateralAndMintWLC(address token, uint256 amount) external morethanzero(amount) isAllowedToken(token) nonReentrant {
        s_collateralDeposited[msg.sender][token] += amount;
        bool success = IERC20(token).transferFrom(msg.sender, address(this), amount);
        if (!success) revert WLCEngine__TransferFailed();
        emit CollateralDeposited(msg.sender, token, amount);
    }

    function mintWlc(uint256 amountofWlcMint) public morethanzero(amountofWlcMint) nonReentrant {
        s_wlcMinted[msg.sender] += amountofWlcMint;
        bool success = i_wlc.mint(msg.sender, amountofWlcMint);
        if (!success) revert WLCEngine__TransferFailed();
    }

    function _healthFactor(address user) private view returns (uint256) {
        (uint256 totalWlcMinted, uint256 collateralValueInUsd) = getAccountInformation(user);
        if (totalWlcMinted == 0) return type(uint256).max;
        uint256 collateralAdjustedForThreshold = (collateralValueInUsd * LIQUIDATION_THRESHOLD) / LIQUIDATION_PRECISION;
        return (collateralAdjustedForThreshold * PRECISION) / totalWlcMinted;
    }

    function getAccountInformation(address user) public view returns(uint256 totalWlcMinted, uint256 collateralValueInUsd){
        totalWlcMinted = s_wlcMinted[user]; 
        collateralValueInUsd = getAccountCollateralValue(user);
    }

    function getAccountCollateralValue(address user) public view returns(uint256) {
        uint256 totalCollateralValueInUsd = 0; 
        for(uint256 i = 0; i < s_collateralTokens.length; i++){
            address token = s_collateralTokens[i];
            uint256 amount = s_collateralDeposited[user][token];
            totalCollateralValueInUsd += getUsdValue(token, amount);
        }
        return totalCollateralValueInUsd;
    }

    function _revertIfHealthFactorIsBroken(address user) internal view {
        uint256 userHealthFactor = _healthFactor(user);
        if(userHealthFactor < MIN_HEALTH_FACTOR){
            revert WLCEngine__BreaksHealthFactor(userHealthFactor);
        }
    }

    function getUsdValue(address token, uint256 amount) public view returns(uint256){
        AggregatorV3Interface priceFeed = AggregatorV3Interface(s_priceFeeds[token]);
        (,int256 price,,,) = priceFeed.latestRoundData();
        return ((uint256(price * 1e10) * amount) / 1e18);
    }

    function depositCollateral(address token, uint256 amount) external morethanzero(amount) isAllowedToken(token) nonReentrant {
        s_collateralDeposited[msg.sender][token] += amount;
        bool success = IERC20(token).transferFrom(msg.sender, address(this), amount);
        if (!success) revert WLCEngine__TransferFailed();
        emit CollateralDeposited(msg.sender, token, amount);
    }

    function redeemCollateralForWlc(address token, uint256 amountCollateral, uint256 amountWlcToBurn) external morethanzero(amountCollateral) morethanzero(amountWlcToBurn) nonReentrant {
        _burnWlc(amountWlcToBurn, msg.sender);
        _redeemCollateral(token, amountCollateral, msg.sender, msg.sender);
        _revertIfHealthFactorIsBroken(msg.sender);
    }

    function redeemCollateral(address token, uint256 amount) external morethanzero(amount) nonReentrant {
        _redeemCollateral(token, amount, msg.sender, msg.sender);
        _revertIfHealthFactorIsBroken(msg.sender);
    }

    function burnWlc(uint256 amount) external morethanzero(amount) nonReentrant {
        _burnWlc(amount, msg.sender);
        _revertIfHealthFactorIsBroken(msg.sender);
    }

    function liquidate(address token, address user, uint256 debtToCover) external morethanzero(debtToCover) nonReentrant {
        uint256 startingUserHealthFactor = _healthFactor(user);
        if (startingUserHealthFactor >= MIN_HEALTH_FACTOR) {
            revert WLCEngine__BreaksHealthFactor(MIN_HEALTH_FACTOR);
        }

        uint256 tokenAmountFromDebtCovered = getTokenAmountFromUsd(token, debtToCover);
        uint256 bonusCollateral = (tokenAmountFromDebtCovered * LIQUIDATION_BONUS) / LIQUIDATION_PRECISION;
        uint256 totalCollateralToRedeem = tokenAmountFromDebtCovered + bonusCollateral;
        _redeemCollateral(token, totalCollateralToRedeem, user, msg.sender);
        _burnWlc(debtToCover, user);

        uint256 endingUserHealthFactor = _healthFactor(user);
        if (endingUserHealthFactor <= startingUserHealthFactor) {
            revert WLCEngine__BreaksHealthFactor(endingUserHealthFactor);
        }
    }

    function getHealthFactor() external view returns (uint256) {
        return _healthFactor(msg.sender);
    }

    function _redeemCollateral(address token, uint256 amountCollateral, address from, address to) private {
        s_collateralDeposited[from][token] -= amountCollateral;
        bool success = IERC20(token).transfer(to, amountCollateral);
        if (!success) revert WLCEngine__TransferFailed();
    }

    function _burnWlc(uint256 amountWlcToBurn, address onBehalfOf) private {
        s_wlcMinted[onBehalfOf] -= amountWlcToBurn;
        bool success = i_wlc.transferFrom(msg.sender, address(this), amountWlcToBurn);
        if (!success) revert WLCEngine__TransferFailed();
        i_wlc.burn(amountWlcToBurn);
    }

    function getTokenAmountFromUsd(address token, uint256 usdAmountInWei) public view returns (uint256) {
        AggregatorV3Interface priceFeed = AggregatorV3Interface(s_priceFeeds[token]);
        (, int256 price,,,) = priceFeed.latestRoundData();
        return ((usdAmountInWei * PRECISION) / (uint256(price) * ADDITIONAL_FEED_PRECISION));
    }

    function getCollateralTokens() external view returns (address[] memory) {
        return s_collateralTokens;
    }

    function getCollateralBalanceOfUser(address user, address token) external view returns (uint256) {
        return s_collateralDeposited[user][token];
    }
}