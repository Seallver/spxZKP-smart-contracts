// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {StableCoinMinter} from "./StableCoinMinter.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

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
    
    mapping(address token => address priceFeed) private s_priceFeeds;
    StableCoinMinter private immutable i_wlc;
    mapping(address user => mapping(address token => uint256 amount)) private s_collateralDeposited;

    event CollateralDeposited(address indexed user, address indexed token, uint256 indexed amount);

    modifier morethanzero(uint256 amount) {
        if (amount <= 0) revert WLCEngine__NeedsMoreThanZero();
        _;
    }

    modifier isAllowedToken(address token) {
        if (s_priceFeeds[token] == address(0)) revert WLCEngine__TokenNotAllowed(token);
        _;
    }

  

    constructor(address[] memory tokenAddresses, address[] memory priceFeedAddresses, address dscAddress) {
        if (tokenAddresses.length != priceFeedAddresses.length) revert WLCEngine__TokenAddressesAndPriceFeedAddressesAmountsDontMatch();
        for (uint256 i = 0; i < tokenAddresses.length; i++) {
            s_priceFeeds[tokenAddresses[i]] = priceFeedAddresses[i];
        }
        i_wlc = StableCoinMinter(dscAddress);
    }

      /*
        @notice: This function allows the user to deposit collateral and mint WLC tokens.
    */

    function depositCollateralAndMintWLC(address token, uint256 amount) external morethanzero(amount) isAllowedToken(token) nonReentrant {
        s_collateralDeposited[msg.sender][token] += amount;
        bool success = IERC20(token).transferFrom(msg.sender, address(this), amount);
        if (!success) revert WLCEngine__TransferFailed();
        emit CollateralDeposited(msg.sender, token, amount);
    }


    function depositCollateralAndMintWLC() external {}

    function depositCollateral() external {}

    function redeemCollateralForDsc() external {}

    function redeemCollateral() external {}

    function mintDsc() external {}

    function burnDsc() external {}

    function liquidate() external {}

    function getHealthFactor() external view {}
}