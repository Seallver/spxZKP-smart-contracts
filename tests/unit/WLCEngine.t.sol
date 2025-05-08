// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

import {Test} from "forge-std/Test.sol";
import {DeployDefi} from "../../script/DeployDefi.s.sol";
import {WLCEngine} from "../../contracts/BasicDefi/WLCEngine.sol";
import {StableCoinMinter} from "../../contracts/BasicDefi/StableCoinMinter.sol";
import {ERC20Mock} from "../../contracts/test/mocks/ERC20Mock.sol";
import {MockV3Aggregator} from "../../contracts/test/mocks/MockV3Aggregator.sol";
import {HelperConfig} from "../../script/HelperCofig.s.sol";

contract WLCEngineTest is Test {
    DeployDefi deployer;
    StableCoinMinter stableCoinMinter;
    WLCEngine wlcEngine;
    HelperConfig helperConfig;
    address weth;
    address wbtc;
    address wethUsdPriceFeed;
    address wbtcUsdPriceFeed;
    uint256 public constant STARTING_USER_BALANCE = 10 ether;
    uint256 public constant COLLATERAL_AMOUNT = 1 ether;
    uint256 public constant MINT_AMOUNT = 100 ether;
    address public USER = makeAddr("user");
    address public LIQUIDATOR = makeAddr("liquidator");

    function setUp() external {
        deployer = new DeployDefi();
        (stableCoinMinter, wlcEngine, helperConfig) = deployer.run();
        (wethUsdPriceFeed, wbtcUsdPriceFeed, weth, wbtc,) = helperConfig.activeNetworkConfig();

        ERC20Mock(weth).mint(USER, STARTING_USER_BALANCE);
        ERC20Mock(wbtc).mint(USER, STARTING_USER_BALANCE);
    }

    ///////////////////////
    // Constructor Tests //
    ///////////////////////
    function testRevertsIfTokenLengthDoesntMatchPriceFeeds() public {
        address[] memory tokenAddresses = new address[](1);
        address[] memory priceFeedAddresses = new address[](2);
        vm.expectRevert(WLCEngine.WLCEngine__TokenAddressesAndPriceFeedAddressesAmountsDontMatch.selector);
        new WLCEngine(tokenAddresses, priceFeedAddresses, address(stableCoinMinter));
    }

    ///////////////////////
    // Price Tests //
    ///////////////////////
    function testGetUsdValue() public {
        uint256 ethAmount = 15e18;
        uint256 expectedUsd = 30000e18;
        uint256 actualUsd = wlcEngine.getUsdValue(weth, ethAmount);
        assertEq(expectedUsd, actualUsd);
    }

    function testGetTokenAmountFromUsd() public {
        uint256 usdAmount = 100 ether;
        uint256 expectedWeth = 0.05 ether;
        uint256 actualWeth = wlcEngine.getTokenAmountFromUsd(weth, usdAmount);
        assertEq(expectedWeth, actualWeth);
    }

    ///////////////////////
    // Deposit Tests //
    ///////////////////////
    function testRevertsIfCollateralZero() public {
        vm.startPrank(USER);
        ERC20Mock(weth).approve(address(wlcEngine), COLLATERAL_AMOUNT);
        vm.expectRevert(WLCEngine.WLCEngine__NeedsMoreThanZero.selector);
        wlcEngine.depositCollateral(weth, 0);
        vm.stopPrank();
    }

    function testRevertsWithUnapprovedCollateral() public {
        ERC20Mock randToken = new ERC20Mock("RAN", "RAN", USER, 100e18);
        vm.startPrank(USER);
        vm.expectRevert(abi.encodeWithSelector(WLCEngine.WLCEngine__TokenNotAllowed.selector, address(randToken)));
        wlcEngine.depositCollateral(address(randToken), COLLATERAL_AMOUNT);
        vm.stopPrank();
    }

    function testCanDepositCollateralAndGetAccountInfo() public {
        vm.startPrank(USER);
        ERC20Mock(weth).approve(address(wlcEngine), COLLATERAL_AMOUNT);
        wlcEngine.depositCollateral(weth, COLLATERAL_AMOUNT);
        (uint256 totalWlcMinted, uint256 collateralValueInUsd) = wlcEngine.getAccountInformation(USER);
        assertEq(totalWlcMinted, 0);
        assertEq(collateralValueInUsd, 2000e18);
        vm.stopPrank();
    }

    ///////////////////////
    // Mint Tests //
    ///////////////////////
    function testRevertsIfMintAmountIsZero() public {
        vm.startPrank(USER);
        ERC20Mock(weth).approve(address(wlcEngine), COLLATERAL_AMOUNT);
        wlcEngine.depositCollateral(weth, COLLATERAL_AMOUNT);
        vm.expectRevert(WLCEngine.WLCEngine__NeedsMoreThanZero.selector);
        wlcEngine.mintWlc(0);
        vm.stopPrank();
    }

    function testCanMintWlc() public {
        vm.startPrank(USER);
        ERC20Mock(weth).approve(address(wlcEngine), COLLATERAL_AMOUNT);
        wlcEngine.depositCollateral(weth, COLLATERAL_AMOUNT);
        wlcEngine.mintWlc(MINT_AMOUNT);
        uint256 userBalance = stableCoinMinter.balanceOf(USER);
        assertEq(userBalance, MINT_AMOUNT);
        vm.stopPrank();
    }

    ///////////////////////
    // Health Factor Tests //
    ///////////////////////
    function testProperlyReportsHealthFactor() public {
        vm.startPrank(USER);
        ERC20Mock(weth).approve(address(wlcEngine), COLLATERAL_AMOUNT);
        wlcEngine.depositCollateral(weth, COLLATERAL_AMOUNT);
        wlcEngine.mintWlc(MINT_AMOUNT);
        uint256 healthFactor = wlcEngine.getHealthFactor();
        assertEq(healthFactor, 4e18);
        vm.stopPrank();
    }

    function testHealthFactorCanGoBelowOne() public {
        vm.startPrank(USER);
        ERC20Mock(weth).approve(address(wlcEngine), COLLATERAL_AMOUNT);
        wlcEngine.depositCollateral(weth, COLLATERAL_AMOUNT);
        wlcEngine.mintWlc(MINT_AMOUNT);
        // Price drops
        int256 newPrice = 250e8; // $250
        MockV3Aggregator(wethUsdPriceFeed).updateAnswer(newPrice);
        uint256 healthFactor = wlcEngine.getHealthFactor();
        assert(healthFactor < 1e18);
        vm.stopPrank();
    }

    ///////////////////////
    // Liquidation Tests //
    ///////////////////////
    function testCantLiquidateGoodHealthFactor() public {
        vm.startPrank(USER);
        ERC20Mock(weth).approve(address(wlcEngine), COLLATERAL_AMOUNT);
        wlcEngine.depositCollateral(weth, COLLATERAL_AMOUNT);
        wlcEngine.mintWlc(MINT_AMOUNT);
        vm.stopPrank();

        vm.startPrank(LIQUIDATOR);
        vm.expectRevert(abi.encodeWithSelector(WLCEngine.WLCEngine__BreaksHealthFactor.selector, 1e18));
        wlcEngine.liquidate(weth, USER, MINT_AMOUNT);
        vm.stopPrank();
    }

    function testLiquidationPayoutIsCorrect() public {
        uint256 collateralToCover = 20 ether;
        vm.startPrank(USER);
        ERC20Mock(weth).approve(address(wlcEngine), COLLATERAL_AMOUNT);
        wlcEngine.depositCollateral(weth, COLLATERAL_AMOUNT);
        wlcEngine.mintWlc(MINT_AMOUNT);
        
        // 转移一些WLC代币给清算者
        stableCoinMinter.approve(LIQUIDATOR, collateralToCover);
        stableCoinMinter.transfer(LIQUIDATOR, collateralToCover);
        vm.stopPrank();

        int256 newPrice = 250e8; // $250
        MockV3Aggregator(wethUsdPriceFeed).updateAnswer(newPrice);

        // 清算者授权
        vm.startPrank(LIQUIDATOR);
        stableCoinMinter.approve(address(wlcEngine), collateralToCover);
        
        uint256 liquidatorWethBefore = ERC20Mock(weth).balanceOf(LIQUIDATOR);
        wlcEngine.liquidate(weth, USER, collateralToCover);
        vm.stopPrank();
        uint256 liquidatorWethAfter = ERC20Mock(weth).balanceOf(LIQUIDATOR);
        uint256 expectedWeth = 0.088 ether; // 20 ether * 1.1 (10% bonus)
        assertEq(liquidatorWethAfter - liquidatorWethBefore, expectedWeth);
    }

    ///////////////////////
    // View & Pure Tests //
    ///////////////////////
    function testGetCollateralTokens() public {
        address[] memory collateralTokens = wlcEngine.getCollateralTokens();
        assertEq(collateralTokens[0], weth);
        assertEq(collateralTokens[1], wbtc);
    }

    function testGetCollateralBalanceOfUser() public {
        vm.startPrank(USER);
        ERC20Mock(weth).approve(address(wlcEngine), COLLATERAL_AMOUNT);
        wlcEngine.depositCollateral(weth, COLLATERAL_AMOUNT);
        vm.stopPrank();
        uint256 collateralBalance = wlcEngine.getCollateralBalanceOfUser(USER, weth);
        assertEq(collateralBalance, COLLATERAL_AMOUNT);
    }

    function testGetAccountCollateralValue() public {
        vm.startPrank(USER);
        ERC20Mock(weth).approve(address(wlcEngine), COLLATERAL_AMOUNT);
        wlcEngine.depositCollateral(weth, COLLATERAL_AMOUNT);
        vm.stopPrank();
        uint256 collateralValue = wlcEngine.getAccountCollateralValue(USER);
        assertEq(collateralValue, 2000e18);
    }
}