// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.19;

import { Script } from "forge-std/Script.sol";
import { StableCoinMinter } from "../contracts/BasicDefi/StableCoinMinter.sol";
import { WLCEngine } from "../contracts/BasicDefi/WLCEngine.sol";
import { HelperConfig } from "./HelperCofig.s.sol";

contract DeployDefi is Script {
    function run() external returns (StableCoinMinter, WLCEngine, HelperConfig) {
        HelperConfig helperConfig = new HelperConfig();
        (
            address wethUsdPriceFeed,
            address wbtcUsdPriceFeed,
            address weth,
            address wbtc,
            uint256 deployerKey
        ) = helperConfig.activeNetworkConfig();

        if (deployerKey != 0) {
            vm.startBroadcast(deployerKey);
        } else {
            vm.startBroadcast();
        }

        address[] memory tokenAddresses = new address[](2);
        tokenAddresses[0] = weth;
        tokenAddresses[1] = wbtc;

        address[] memory priceFeedAddresses = new address[](2);
        priceFeedAddresses[0] = wethUsdPriceFeed;
        priceFeedAddresses[1] = wbtcUsdPriceFeed;

        StableCoinMinter stableCoinMinter = new StableCoinMinter();
        WLCEngine wlcEngine = new WLCEngine(
            tokenAddresses,
            priceFeedAddresses,
            address(stableCoinMinter)
        );
        stableCoinMinter.transferOwnership(address(wlcEngine));

        vm.stopBroadcast();

        return (stableCoinMinter, wlcEngine, helperConfig);
    }
}