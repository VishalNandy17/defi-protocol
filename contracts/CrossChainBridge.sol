// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

/**
 * @title CrossChainBridge
 * @dev Cross-chain bridge for DeFi Protocol tokens
 * Supports multiple chains with lock/unlock mechanism
 */
contract CrossChainBridge is Ownable, Pausable, ReentrancyGuard {
    // Chain IDs
    uint256 public constant ETHEREUM_CHAIN_ID = 1;
    uint256 public constant POLYGON_CHAIN_ID = 137;
    uint256 public constant BSC_CHAIN_ID = 56;
    uint256 public constant ARBITRUM_CHAIN_ID = 42161;
    uint256 public constant OPTIMISM_CHAIN_ID = 10;

    // Bridge events
    event TokensLocked(
        address indexed user,
        uint256 amount,
        uint256 targetChainId,
        bytes32 indexed txHash
    );

    event TokensUnlocked(
        address indexed user,
        uint256 amount,
        uint256 sourceChainId,
        bytes32 indexed txHash
    );

    event ChainSupported(uint256 chainId, bool supported);
    event BridgeFeeUpdated(uint256 newFee);

    // Bridge state
    struct BridgeTransaction {
        address user;
        uint256 amount;
        uint256 targetChainId;
        uint256 timestamp;
        bool processed;
        bytes32 txHash;
    }

    mapping(bytes32 => BridgeTransaction) public bridgeTransactions;
    mapping(uint256 => bool) public supportedChains;
    mapping(address => uint256) public lockedBalances;

    uint256 public bridgeFee = 0.001 ether; // 0.1% fee
    uint256 public minBridgeAmount = 1 ether;
    uint256 public maxBridgeAmount = 1000000 ether;

    IERC20 public token;

    constructor(address _token) {
        token = IERC20(_token);
        
        // Initialize supported chains
        supportedChains[ETHEREUM_CHAIN_ID] = true;
        supportedChains[POLYGON_CHAIN_ID] = true;
        supportedChains[BSC_CHAIN_ID] = true;
        supportedChains[ARBITRUM_CHAIN_ID] = true;
        supportedChains[OPTIMISM_CHAIN_ID] = true;
    }

    /**
     * @dev Lock tokens for cross-chain transfer
     */
    function lockTokens(
        uint256 amount,
        uint256 targetChainId,
        bytes32 txHash
    ) external payable nonReentrant whenNotPaused {
        require(supportedChains[targetChainId], "Chain not supported");
        require(amount >= minBridgeAmount, "Amount too small");
        require(amount <= maxBridgeAmount, "Amount too large");
        require(msg.value >= bridgeFee, "Insufficient bridge fee");

        // Transfer tokens from user to bridge
        token.transferFrom(msg.sender, address(this), amount);
        
        // Update locked balance
        lockedBalances[msg.sender] += amount;

        // Create bridge transaction
        bytes32 bridgeId = keccak256(abi.encodePacked(
            msg.sender,
            amount,
            targetChainId,
            block.timestamp,
            txHash
        ));

        bridgeTransactions[bridgeId] = BridgeTransaction({
            user: msg.sender,
            amount: amount,
            targetChainId: targetChainId,
            timestamp: block.timestamp,
            processed: false,
            txHash: txHash
        });

        emit TokensLocked(msg.sender, amount, targetChainId, txHash);
    }

    /**
     * @dev Unlock tokens from cross-chain transfer (only owner/relayer)
     */
    function unlockTokens(
        address user,
        uint256 amount,
        uint256 sourceChainId,
        bytes32 txHash
    ) external onlyOwner nonReentrant {
        require(supportedChains[sourceChainId], "Source chain not supported");
        require(amount > 0, "Invalid amount");

        // Transfer tokens to user
        token.transfer(user, amount);

        // Update locked balance (with overflow protection)
        require(lockedBalances[user] >= amount, "Insufficient locked balance");
        lockedBalances[user] -= amount;

        emit TokensUnlocked(user, amount, sourceChainId, txHash);
    }

    /**
     * @dev Add/remove supported chain
     */
    function setChainSupport(uint256 chainId, bool supported) external onlyOwner {
        supportedChains[chainId] = supported;
        emit ChainSupported(chainId, supported);
    }

    /**
     * @dev Update bridge fee
     */
    function setBridgeFee(uint256 newFee) external onlyOwner {
        bridgeFee = newFee;
        emit BridgeFeeUpdated(newFee);
    }

    /**
     * @dev Update bridge limits
     */
    function setBridgeLimits(uint256 minAmount, uint256 maxAmount) external onlyOwner {
        minBridgeAmount = minAmount;
        maxBridgeAmount = maxAmount;
    }

    /**
     * @dev Emergency pause
     */
    function emergencyPause() external onlyOwner {
        _pause();
    }

    /**
     * @dev Emergency unpause
     */
    function emergencyUnpause() external onlyOwner {
        _unpause();
    }

    /**
     * @dev Withdraw bridge fees
     */
    function withdrawFees() external onlyOwner {
        payable(owner()).transfer(address(this).balance);
    }

    /**
     * @dev Get bridge transaction details
     */
    function getBridgeTransaction(bytes32 bridgeId) 
        external 
        view 
        returns (BridgeTransaction memory) 
    {
        return bridgeTransactions[bridgeId];
    }

    /**
     * @dev Check if chain is supported
     */
    function isChainSupported(uint256 chainId) external view returns (bool) {
        return supportedChains[chainId];
    }

    /**
     * @dev Get total locked balance
     */
    function getTotalLockedBalance() external view returns (uint256) {
        return token.balanceOf(address(this));
    }
}

