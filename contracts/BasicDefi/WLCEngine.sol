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
    uint256 private constant LIQUIDATION_THRESHOLD = 50;
    uint256 private constant LIQUIDATION_PRECISION = 100;
    uint256 private constant MIN_HEALTH_FACTOR = 1e18;

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

      /*
        @notice: This function allows the user to deposit collateral and mint WLC tokens.
        抵押并且铸造token
    */

    function depositCollateralAndMintWLC(address token, uint256 amount) external morethanzero(amount) isAllowedToken(token) nonReentrant {
        s_collateralDeposited[msg.sender][token] += amount;
        bool success = IERC20(token).transferFrom(msg.sender, address(this), amount);
        if (!success) revert WLCEngine__TransferFailed();
        emit CollateralDeposited(msg.sender, token, amount);
    }

/*
    @param amountofWlcMint: The amount of WLC tokens to mint.
    The amount of WLC tokens cannot exceed the collateral.
    铸造的token不可超过抵押物
*/
    function mintWlc(uint256 amountofWlcMint) public morethanzero(amountofWlcMint) nonReentrant{
        s_wlcMinted[msg.sender] += amountofWlcMint;
    }

/*
    An example calculate the health factor is learning from cyfrin
    应该探索更多方案...
*/


    function _healthFactor(address user) private view returns (uint256) {
        (uint256 totalWlcMinted, uint256 collateralValueInUsd) = _getAccountInformation(user);
        uint256 collateralAdjustedForThreshold = (collateralValueInUsd * LIQUIDATION_THRESHOLD) / LIQUIDATION_PRECISION;
        return (collateralAdjustedForThreshold * PRECISION) / totalWlcMinted;
    }

    function _getAccountInformation(address user) private view returns(uint256 totalWlcMinted, uint256 collateralValueInUsd){
        totalWlcMinted = s_wlcMinted[user]; 
        collateralValueInUsd = getAccountCollaterValue(user);

    }

    function getAccountCollaterValue(address user) public view returns(uint256) {
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
    /*
        @notice: This function is checking the real-time price of the collateral token.
        实时检测价格
    */
    function getUsdValue(address token, uint256 amount) public view returns(uint256){
        AggregatorV3Interface priceFeed = AggregatorV3Interface(s_priceFeeds[token]);
        (,int256 price,,,) = priceFeed.latestRoundData();
        return ((uint256(price * 1e10) * amount) / 1e18);
    }

    function depositCollateral() external {}

    function redeemCollateralForWlc() external {}

    function redeemCollateral() external {}

    

    function burnWlc() external {}

    function liquidate() external {}

    function getHealthFactor() external view {}
}