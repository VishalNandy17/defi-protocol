// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/utils/math/Math.sol";

/**
 * @title StakingPool
 * @dev Time-locked staking with dynamic rewards, compounding and emergency withdraw
 */
contract StakingPool is ReentrancyGuard, Ownable, Pausable {
    using SafeERC20 for IERC20;

    IERC20 public stakingToken; // token users stake (usually DPT)
    IERC20 public rewardToken;  // reward token (can be same as stakingToken)

    uint256 public rewardRatePerSecond; // rewards distributed per second across totalSupply
    uint256 public lastUpdateTime;
    uint256 public rewardPerTokenStored;

    uint256 public totalSupply; // total staked

    // lock parameters
    uint256 public lockPeriod = 7 days; // default lock period
    uint256 public earlyWithdrawPenalty = 100; // basis points: 100 = 1%
    uint256 public constant BP_DIVISOR = 10000;

    mapping(address => uint256) public balances;
    mapping(address => uint256) public userRewardPerTokenPaid;
    mapping(address => uint256) public rewards;
    mapping(address => uint256) public stakeStart;

    event Staked(address indexed user, uint256 amount);
    event Withdrawn(address indexed user, uint256 amount);
    event RewardPaid(address indexed user, uint256 reward);
    event EmergencyWithdraw(address indexed user, uint256 amount, uint256 penalty);

    constructor(address _stakingToken, address _rewardToken, uint256 _rewardRatePerSecond) {
        stakingToken = IERC20(_stakingToken);
        rewardToken = IERC20(_rewardToken);
        rewardRatePerSecond = _rewardRatePerSecond;
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
        return rewardPerTokenStored + ((block.timestamp - lastUpdateTime) * rewardRatePerSecond * 1e18) / totalSupply;
    }

    function earned(address account) public view returns (uint256) {
        return (balances[account] * (rewardPerToken() - userRewardPerTokenPaid[account])) / 1e18 + rewards[account];
    }

    function stake(uint256 amount) external nonReentrant whenNotPaused updateReward(msg.sender) {
        require(amount > 0, "Cannot stake 0");
        totalSupply += amount;
        balances[msg.sender] += amount;
        if (stakeStart[msg.sender] == 0) stakeStart[msg.sender] = block.timestamp;

        stakingToken.safeTransferFrom(msg.sender, address(this), amount);
        emit Staked(msg.sender, amount);
    }

    function withdraw(uint256 amount) public nonReentrant updateReward(msg.sender) {
        require(amount > 0, "Cannot withdraw 0");
        require(balances[msg.sender] >= amount, "Insufficient balance");

        // check lock
        uint256 penalty = 0;
        if (block.timestamp < stakeStart[msg.sender] + lockPeriod) {
            // apply early withdraw penalty
            penalty = (amount * earlyWithdrawPenalty) / BP_DIVISOR;
            // penalty stays in contract to be redistributed
            amount = amount - penalty;
        }

        totalSupply -= (amount + penalty);
        balances[msg.sender] -= (amount + penalty);

        if (penalty > 0) {
            // keep penalty in contract (can be redistributed or withdrawn by owner)
            emit EmergencyWithdraw(msg.sender, amount, penalty);
        }

        stakingToken.safeTransfer(msg.sender, amount);
        emit Withdrawn(msg.sender, amount);
    }

    function claimRewards() public nonReentrant updateReward(msg.sender) {
        uint256 reward = rewards[msg.sender];
        if (reward > 0) {
            rewards[msg.sender] = 0;
            rewardToken.safeTransfer(msg.sender, reward);
            emit RewardPaid(msg.sender, reward);
        }
    }

    // compound: claim rewards and restake them
    function compound() external nonReentrant updateReward(msg.sender) {
        uint256 reward = rewards[msg.sender];
        require(reward > 0, "No rewards to compound");
        require(address(stakingToken) == address(rewardToken), "Tokens must be same for compounding");
        
        rewards[msg.sender] = 0;
        // increase stake
        totalSupply += reward;
        balances[msg.sender] += reward;
        stakeStart[msg.sender] = block.timestamp; // reset lock for compounded amount
        emit Staked(msg.sender, reward);
    }

    // emergency withdraw all staked amount forfeiting rewards and possibly with penalty
    function emergencyWithdraw() external nonReentrant {
        uint256 amount = balances[msg.sender];
        require(amount > 0, "Nothing to withdraw");

        // forfeit rewards
        rewards[msg.sender] = 0;
        userRewardPerTokenPaid[msg.sender] = rewardPerTokenStored;

        // apply penalty if within lock
        uint256 penalty = 0;
        if (block.timestamp < stakeStart[msg.sender] + lockPeriod) {
            penalty = (amount * earlyWithdrawPenalty) / BP_DIVISOR;
            amount = amount - penalty;
        }

        totalSupply -= (balances[msg.sender]);
        balances[msg.sender] = 0;
        stakeStart[msg.sender] = 0;

        if (penalty > 0) {
            emit EmergencyWithdraw(msg.sender, amount, penalty);
        }

        stakingToken.safeTransfer(msg.sender, amount);
    }

    // Admin functions
    function getStakeInfo(address _user) external view returns (uint256 amount, uint256 pendingRewards) {
        amount = balances[_user];
        pendingRewards = earned(_user);
    }
    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    // Recover ERC20 (avoid recovering staking token accidentally)
    function recoverERC20(address tokenAddress, uint256 tokenAmount) external onlyOwner {
        require(tokenAddress != address(stakingToken), "Cannot recover staking token");
        IERC20(tokenAddress).safeTransfer(owner(), tokenAmount);
    }
}