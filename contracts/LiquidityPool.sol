// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/math/Math.sol";

/**
 * @title LiquidityPool
 * @dev Simple constant-product AMM with fees, LP token minting and burn, and slippage protection
 */
contract LiquidityPool is ERC20, ReentrancyGuard, Ownable {
    using SafeERC20 for IERC20;

    IERC20 public token0;
    IERC20 public token1;

    uint256 public constant MINIMUM_LIQUIDITY = 1000;
    uint256 public constant FEE_DENOMINATOR = 1000; // denominator for fee calculations
    uint256 public swapFee = 3; // 0.3% default

    event AddLiquidity(address indexed provider, uint256 amount0, uint256 amount1, uint256 liquidity);
    event RemoveLiquidity(address indexed provider, uint256 amount0, uint256 amount1, uint256 liquidity);
    event Swap(address indexed sender, uint256 amountIn, uint256 amountOut, address indexed tokenIn, address indexed tokenOut);

    constructor(address _token0, address _token1) ERC20("Defi Protocol LP", "DP-LP") {
        token0 = IERC20(_token0);
        token1 = IERC20(_token1);
    }

    function addLiquidity(
        uint256 amount0Desired,
        uint256 amount1Desired,
        uint256 amount0Min,
        uint256 amount1Min,
        address to
    ) external nonReentrant returns (uint256 amount0, uint256 amount1, uint256 liquidity) {
        if (totalSupply() == 0) {
            amount0 = amount0Desired;
            amount1 = amount1Desired;
        } else {
            (uint256 reserve0, uint256 reserve1) = getReserves();
            uint256 amount1Optimal = (amount0Desired * reserve1) / reserve0;
            if (amount1Optimal <= amount1Desired) {
                amount0 = amount0Desired;
                amount1 = amount1Optimal;
            } else {
                uint256 amount0Optimal = (amount1Desired * reserve0) / reserve1;
                amount0 = amount0Optimal;
                amount1 = amount1Desired;
            }
        }

        require(amount0 >= amount0Min && amount1 >= amount1Min, "Insufficient amounts");

        token0.safeTransferFrom(msg.sender, address(this), amount0);
        token1.safeTransferFrom(msg.sender, address(this), amount1);

        liquidity = _mintLPTokens(to, amount0, amount1);
        emit AddLiquidity(msg.sender, amount0, amount1, liquidity);
    }

    function removeLiquidity(uint256 liquidity, uint256 amount0Min, uint256 amount1Min, address to) external nonReentrant returns (uint256 amount0, uint256 amount1) {
        require(liquidity > 0, "Insufficient LP tokens");
        uint256 _totalSupply = totalSupply();
        (uint256 reserve0, uint256 reserve1) = getReserves();

        amount0 = (reserve0 * liquidity) / _totalSupply;
        amount1 = (reserve1 * liquidity) / _totalSupply;

        require(amount0 >= amount0Min && amount1 >= amount1Min, "Insufficient output");

        _burn(msg.sender, liquidity);
        token0.safeTransfer(to, amount0);
        token1.safeTransfer(to, amount1);

        emit RemoveLiquidity(msg.sender, amount0, amount1, liquidity);
    }

    function swap(uint256 amountIn, uint256 amountOutMin, address tokenIn, address to) external nonReentrant returns (uint256 amountOut) {
        require(tokenIn == address(token0) || tokenIn == address(token1), "Invalid token");

        IERC20 inputToken = IERC20(tokenIn);
        IERC20 outputToken = tokenIn == address(token0) ? token1 : token0;

        (uint256 reserve0, uint256 reserve1) = getReserves();
        uint256 reserveIn = tokenIn == address(token0) ? reserve0 : reserve1;
        uint256 reserveOut = tokenIn == address(token0) ? reserve1 : reserve0;

        inputToken.safeTransferFrom(msg.sender, address(this), amountIn);

        // Apply fee
        uint256 amountInWithFee = (amountIn * (FEE_DENOMINATOR - swapFee)) / FEE_DENOMINATOR;

        // constant product: (reserveIn + amountInWithFee) * (reserveOut - amountOut) = reserveIn * reserveOut
        // Solve for amountOut:
        // amountOut = (amountInWithFee * reserveOut) / (reserveIn + amountInWithFee)
        amountOut = (amountInWithFee * reserveOut) / (reserveIn + amountInWithFee);

        require(amountOut >= amountOutMin, "Insufficient output amount");

        outputToken.safeTransfer(to, amountOut);
        emit Swap(msg.sender, amountIn, amountOut, tokenIn, address(outputToken));
    }

    function _mintLPTokens(address to, uint256 amount0, uint256 amount1) internal returns (uint256 liquidity) {
        if (totalSupply() == 0) {
            // initial liquidity: sqrt(amount0 * amount1)
            liquidity = Math.sqrt(amount0 * amount1);
        } else {
            uint256 _totalSupply = totalSupply();
            (uint256 reserve0, uint256 reserve1) = getReserves();
            uint256 liquidity0 = (amount0 * _totalSupply) / reserve0;
            uint256 liquidity1 = (amount1 * _totalSupply) / reserve1;
            liquidity = Math.min(liquidity0, liquidity1);
        }
        _mint(to, liquidity);
    }

    function setSwapFee(uint256 _swapFee) external onlyOwner {
        require(_swapFee <= FEE_DENOMINATOR / 2, "Fee too high");
        swapFee = _swapFee;
    }

    function getReserves() public view returns (uint256 reserve0, uint256 reserve1) {
        reserve0 = token0.balanceOf(address(this));
        reserve1 = token1.balanceOf(address(this));
    }
}