// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/math/Math.sol";

/**
 * @title YieldFarm
 * @dev LP staking with rewards, optional boosts and auto-compounding
 */
contract YieldFarm is ReentrancyGuard, Ownable {
    using SafeERC20 for IERC20;

    IERC20 public lpToken;
    IERC20 public rewardToken;

    uint256 public rewardRate; // rewards per second distributed across totalSupply
    uint256 public lastUpdateTime;
    uint256 public rewardPerTokenStored;

    mapping(address => uint256) public userRewardPerTokenPaid;
    mapping(address => uint256) public rewards;
    mapping(address => uint256) public balances;

    uint256 public totalSupply;

    // Boosts: multiplier in basis points (10000 = 100%) applied to user's reward accrual
    mapping(address => uint256) public boostBP;
    uint256 public constant BP_DIVISOR = 10000;

    event Staked(address indexed user, uint256 amount);
    event Withdrawn(address indexed user, uint256 amount);
    event RewardPaid(address indexed user, uint256 reward);
    event AutoCompounded(address indexed user, uint256 amount);

    constructor(address _lpToken, address _rewardToken, uint256 _rewardRate) {
        lpToken = IERC20(_lpToken);
        rewardToken = IERC20(_rewardToken);
        rewardRate = _rewardRate;
        lastUpdateTime = block.timestamp;
    }

    modifier updateReward(address account) {
        rewardPerTokenStored = rewardPerToken();
        lastUpdateTime = block.timestamp;
        if (account != address(0)) {
            rewards[account] = earned(account);
            userRewardPerTokenPaid[account] = rewardPerTokenStored;
        }
        _;
    }

    function rewardPerToken() public view returns (uint256) {
        if (totalSupply == 0) return rewardPerTokenStored;
        return rewardPerTokenStored + ((block.timestamp - lastUpdateTime) * rewardRate * 1e18) / totalSupply;
    }

    function earned(address account) public view returns (uint256) {
        uint256 base = (balances[account] * (rewardPerToken() - userRewardPerTokenPaid[account])) / 1e18 + rewards[account];
        uint256 bp = boostBP[account];
        if (bp == 0) return base;
        return (base * (BP_DIVISOR + bp)) / BP_DIVISOR; // apply boost as extra percent
    }

    function stake(uint256 amount) external nonReentrant updateReward(msg.sender) {
        require(amount > 0, "Cannot stake 0");
        totalSupply += amount;
        balances[msg.sender] += amount;
        lpToken.safeTransferFrom(msg.sender, address(this), amount);
        emit Staked(msg.sender, amount);
    }

    function withdraw(uint256 amount) public nonReentrant updateReward(msg.sender) {
        require(amount > 0, "Cannot withdraw 0");
        totalSupply -= amount;
        balances[msg.sender] -= amount;
        lpToken.safeTransfer(msg.sender, amount);
        emit Withdrawn(msg.sender, amount);
    }

    function getReward() public nonReentrant updateReward(msg.sender) {
        uint256 reward = rewards[msg.sender];
        if (reward > 0) {
            rewards[msg.sender] = 0;
            rewardToken.safeTransfer(msg.sender, reward);
            emit RewardPaid(msg.sender, reward);
        }
    }

    // Auto-compound: claim rewards and restake them as LP tokens
    // Note: rewardToken must be the same token as lpToken or an LP-equivalent for meaningful compounding
    function autoCompound() external nonReentrant updateReward(msg.sender) {
        uint256 reward = rewards[msg.sender];
        require(reward > 0, "No rewards to compound");
        require(address(lpToken) == address(rewardToken), "Tokens must be same for auto-compounding");
        
        rewards[msg.sender] = 0;
        // restake reward
        totalSupply += reward;
        balances[msg.sender] += reward;
        emit AutoCompounded(msg.sender, reward);
    }

    function exit() external {
        withdraw(balances[msg.sender]);
        getReward();
    }

    // Admin functions
    function setRewardRate(uint256 _rewardRate) external onlyOwner updateReward(address(0)) {
        rewardRate = _rewardRate;
    }

    function setBoost(address user, uint256 bp) external onlyOwner {
        require(bp <= BP_DIVISOR * 5, "Boost too high"); // allow up to 500% as a guard
        boostBP[user] = bp;
    }

    function recoverERC20(address tokenAddress, uint256 tokenAmount) external onlyOwner {
        require(tokenAddress != address(lpToken), "Cannot withdraw staking token");
        IERC20(tokenAddress).safeTransfer(owner(), tokenAmount);
    }

    // View functions
    function getStakeInfo(address _user) external view returns (uint256 stakedAmount, uint256 pendingRewards) {
        return (balances[_user], earned(_user));
    }
}