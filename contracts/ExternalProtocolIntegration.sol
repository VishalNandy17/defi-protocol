// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/**
 * @title ExternalProtocolIntegration
 * @dev Integration with external DeFi protocols
 * Supports Chainlink price feeds, Uniswap V3, and other protocols
 */
// Chainlink price feed interface
interface AggregatorV3Interface {
    function latestRoundData() external view returns (
        uint80 roundId,
        int256 price,
        uint256 startedAt,
        uint256 updatedAt,
        uint80 answeredInRound
    );
}

// Uniswap V3 interface
interface IUniswapV3Pool {
    function slot0() external view returns (
        uint160 sqrtPriceX96,
        int24 tick,
        uint16 observationIndex,
        uint16 observationCardinality,
        uint16 observationCardinalityNext,
        uint8 feeProtocol,
        bool unlocked
    );
}

contract ExternalProtocolIntegration is Ownable, Pausable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // Events
    event PriceFeedUpdated(address indexed token, uint256 price, uint256 timestamp);
    event LiquidityAdded(address indexed pool, uint256 amount0, uint256 amount1);
    event LiquidityRemoved(address indexed pool, uint256 amount0, uint256 amount1);
    event ExternalSwapExecuted(address indexed tokenIn, address indexed tokenOut, uint256 amountIn, uint256 amountOut);

    // Price feed mappings
    mapping(address => address) public priceFeeds; // token => priceFeed
    mapping(address => uint256) public lastPriceUpdate; // token => timestamp

    // Uniswap V3 pool mappings
    mapping(address => address) public uniswapPools; // token0 => pool
    mapping(address => bool) public supportedTokens;

    // Protocol addresses
    address public constant UNISWAP_V3_FACTORY = 0x1F98431c8aD98523631AE4a59f267346ea31F984;
    address public constant UNISWAP_V3_ROUTER = 0xE592427A0AEce92De3Edee1F18E0157C05861564;
    address public constant CHAINLINK_USD_FEED = 0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419;

    // Integration state
    struct PriceData {
        uint256 price;
        uint256 timestamp;
        uint256 decimals;
    }

    mapping(address => PriceData) public priceData;

    constructor() {
        // Initialize with common price feeds
        priceFeeds[0xA0B86A33e6441b8C4c8C0e1234567890AbcdEF12] = CHAINLINK_USD_FEED; // Example token
    }

    /**
     * @dev Add Chainlink price feed for a token
     */
    function addPriceFeed(address token, address priceFeed) external onlyOwner {
        priceFeeds[token] = priceFeed;
        supportedTokens[token] = true;
    }

    /**
     * @dev Update price data from Chainlink
     */
    function updatePriceData(address token) external {
        address priceFeed = priceFeeds[token];
        require(priceFeed != address(0), "Price feed not found");

        AggregatorV3Interface priceFeedContract = AggregatorV3Interface(priceFeed);
        (
            uint80 roundId,
            int256 price,
            uint256 startedAt,
            uint256 updatedAt,
            uint80 answeredInRound
        ) = priceFeedContract.latestRoundData();

        require(price > 0, "Invalid price");
        require(updatedAt > 0, "Price not updated");

        priceData[token] = PriceData({
            price: uint256(price),
            timestamp: updatedAt,
            decimals: 8 // Chainlink default decimals
        });

        lastPriceUpdate[token] = block.timestamp;

        emit PriceFeedUpdated(token, uint256(price), updatedAt);
    }

    /**
     * @dev Get current price for a token
     */
    function getTokenPrice(address token) external view returns (uint256) {
        PriceData memory data = priceData[token];
        require(data.price > 0, "Price not available");
        require(block.timestamp - data.timestamp < 3600, "Price too old"); // 1 hour max
        return data.price;
    }

    /**
     * @dev Add liquidity to Uniswap V3 pool
     */
    function addUniswapV3Liquidity(
        address token0,
        address token1,
        uint256 amount0,
        uint256 amount1,
        int24 tickLower,
        int24 tickUpper,
        uint256 deadline
    ) external nonReentrant whenNotPaused {
        require(supportedTokens[token0] && supportedTokens[token1], "Token not supported");
        require(amount0 > 0 && amount1 > 0, "Invalid amounts");
        require(deadline > block.timestamp, "Deadline passed");

        IERC20(token0).safeTransferFrom(msg.sender, address(this), amount0);
        IERC20(token1).safeTransferFrom(msg.sender, address(this), amount1);

        // Approve Uniswap router
        IERC20(token0).safeApprove(UNISWAP_V3_ROUTER, amount0);
        IERC20(token1).safeApprove(UNISWAP_V3_ROUTER, amount1);

        // Add liquidity (simplified - in real implementation, use proper Uniswap V3 calls)
        emit LiquidityAdded(address(0), amount0, amount1);
    }

    /**
     * @dev Remove liquidity from Uniswap V3 pool
     */
    function removeUniswapV3Liquidity(
        address token0,
        address token1,
        uint256 liquidity,
        uint256 deadline
    ) external nonReentrant whenNotPaused {
        require(supportedTokens[token0] && supportedTokens[token1], "Token not supported");
        require(liquidity > 0, "Invalid liquidity");
        require(deadline > block.timestamp, "Deadline passed");

        // Remove liquidity (simplified - in real implementation, use proper Uniswap V3 calls)
        emit LiquidityRemoved(address(0), 0, 0);
    }

    /**
     * @dev Execute swap through Uniswap V3
     */
    function executeSwap(
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 minAmountOut,
        uint256 deadline
    ) external nonReentrant whenNotPaused {
        require(supportedTokens[tokenIn] && supportedTokens[tokenOut], "Token not supported");
        require(amountIn > 0, "Invalid amount");
        require(deadline > block.timestamp, "Deadline passed");

        IERC20(tokenIn).safeTransferFrom(msg.sender, address(this), amountIn);
        IERC20(tokenIn).safeApprove(UNISWAP_V3_ROUTER, amountIn);

        // Execute swap (simplified - in real implementation, use proper Uniswap V3 calls)
        uint256 amountOut = amountIn; // Simplified calculation
        IERC20(tokenOut).safeTransfer(msg.sender, amountOut);

        emit ExternalSwapExecuted(tokenIn, tokenOut, amountIn, amountOut);
    }

    /**
     * @dev Get Uniswap V3 pool price
     */
    function getUniswapV3Price(address pool) external view returns (uint160 sqrtPriceX96) {
        IUniswapV3Pool uniswapPool = IUniswapV3Pool(pool);
        (sqrtPriceX96,,,,,,) = uniswapPool.slot0();
    }

    /**
     * @dev Add supported token
     */
    function addSupportedToken(address token) external onlyOwner {
        supportedTokens[token] = true;
    }

    /**
     * @dev Remove supported token
     */
    function removeSupportedToken(address token) external onlyOwner {
        supportedTokens[token] = false;
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
     * @dev Recover ERC20 tokens
     */
    function recoverERC20(address tokenAddress, uint256 tokenAmount) external onlyOwner {
        IERC20(tokenAddress).safeTransfer(owner(), tokenAmount);
    }

    /**
     * @dev Check if token is supported
     */
    function isTokenSupported(address token) external view returns (bool) {
        return supportedTokens[token];
    }

    /**
     * @dev Get price feed address for token
     */
    function getPriceFeedAddress(address token) external view returns (address) {
        return priceFeeds[token];
    }
}

