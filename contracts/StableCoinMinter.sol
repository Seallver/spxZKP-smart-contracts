// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

import {ERC20Burnable, ERC20} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

contract StableCoinMinter is Ownable, ERC20Burnable {
    error StableCoinMinter__NotOwner();
    error StableCoinMinter__MustBeMoreThanZero();
    error StableCoinMinter__BurnAmountExceedsBalance();
    error StableCoinMinter__NotZeroAddress();

    constructor(address initialOwner) ERC20("WalletCoin", "WLC") Ownable(initialOwner) {}

    function burn(uint256 _amount) public override onlyOwner {
        uint256 balance = balanceOf(msg.sender);
        if (_amount <= 0) revert StableCoinMinter__MustBeMoreThanZero();
        if (_amount > balance) revert StableCoinMinter__BurnAmountExceedsBalance();
        super.burn(_amount);
    }

    function mint(address _to, uint256 _amount) public onlyOwner returns (bool) {
        if (_to == address(0)) {
            revert StableCoinMinter__NotZeroAddress();
        }
        if (_amount <= 0) {
            revert StableCoinMinter__MustBeMoreThanZero();
        }

        _mint(_to, _amount);
        return true;
    }
}
