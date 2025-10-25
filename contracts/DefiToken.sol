// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/Pausable.sol";

/**
 * @title DefiToken (DPT)
 * @dev ERC20 token with pausability, minting, burning and simple transfer restrictions.
 */
contract DefiToken is ERC20, ERC20Burnable, Ownable, Pausable {
    // If transfers are locked, only owner can move tokens (useful for initial distribution)
    bool public transfersAllowed = true;

    event TransfersAllowedSet(bool allowed);

    constructor(uint256 initialSupply) ERC20("Defi Protocol Token", "DPT") {
        // initialSupply is in wei (smallest unit). Tests pass parseEther values, so mint directly.
        _mint(msg.sender, initialSupply);
    }

    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }

    function burnFrom(address account, uint256 amount) public override onlyOwner {
        // Allow owner to burn tokens on behalf of an account
        _burn(account, amount);
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    function setTransfersAllowed(bool _allowed) external onlyOwner {
        transfersAllowed = _allowed;
        emit TransfersAllowedSet(_allowed);
    }

    function _beforeTokenTransfer(address from, address to, uint256 amount) internal override {
        super._beforeTokenTransfer(from, to, amount);
        require(!paused(), "DPT: token transfer while paused");

        if (!transfersAllowed) {
            // allow minting (from == address(0)) and burning (to == address(0)) and owner transfers
            if (from != address(0) && to != address(0)) {
                require(from == owner() || to == owner(), "DPT: transfers are restricted");
            }
        }
    }
}