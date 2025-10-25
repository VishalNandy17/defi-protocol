const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("DeFi Protocol - Comprehensive Tests", function () {
  let DefiToken, defiToken, secondToken;
  let StakingPool, stakingPool;
  let LiquidityPool, liquidityPool;
  let YieldFarm, yieldFarm;
  let owner, addr1, addr2, addr3;

  beforeEach(async function () {
    [owner, addr1, addr2, addr3] = await ethers.getSigners();

    // Deploy DefiToken
    DefiToken = await ethers.getContractFactory("DefiToken");
    defiToken = await DefiToken.deploy(ethers.utils.parseEther("1000000"));
    await defiToken.deployed();

    // Deploy second token for liquidity pool
    secondToken = await DefiToken.deploy(ethers.utils.parseEther("1000000"));
    await secondToken.deployed();

    // Deploy StakingPool (staking token, reward token, rewardRatePerSecond)
    StakingPool = await ethers.getContractFactory("StakingPool");
    stakingPool = await StakingPool.deploy(
      defiToken.address, 
      defiToken.address, 
      ethers.utils.parseEther("0.001")
    );
    await stakingPool.deployed();

    // Deploy LiquidityPool
    LiquidityPool = await ethers.getContractFactory("LiquidityPool");
    liquidityPool = await LiquidityPool.deploy(
      defiToken.address,
      secondToken.address
    );
    await liquidityPool.deployed();

    // Deploy YieldFarm
    YieldFarm = await ethers.getContractFactory("YieldFarm");
    yieldFarm = await YieldFarm.deploy(
      liquidityPool.address,
      defiToken.address,
      ethers.utils.parseEther("0.1")
    );
    await yieldFarm.deployed();

    // Transfer tokens to test accounts
    await defiToken.transfer(addr1.address, ethers.utils.parseEther("10000"));
    await defiToken.transfer(addr2.address, ethers.utils.parseEther("10000"));
    await secondToken.transfer(addr1.address, ethers.utils.parseEther("10000"));
    await secondToken.transfer(addr2.address, ethers.utils.parseEther("10000"));
  });

  describe("DefiToken", function () {
    it("Should set the right token name and symbol", async function () {
      expect(await defiToken.name()).to.equal("Defi Protocol Token");
      expect(await defiToken.symbol()).to.equal("DPT");
    });

    it("Should have correct total supply", async function () {
      const totalSupply = await defiToken.totalSupply();
      expect(totalSupply).to.equal(ethers.utils.parseEther("1000000"));
    });

    it("Should allow owner to mint tokens", async function () {
      const mintAmount = ethers.utils.parseEther("1000");
      await defiToken.mint(addr1.address, mintAmount);
      const balance = await defiToken.balanceOf(addr1.address);
      expect(balance).to.equal(ethers.utils.parseEther("11000")); // 10000 + 1000
    });

    it("Should allow token burning", async function () {
      const initialBalance = await defiToken.balanceOf(owner.address);
      const burnAmount = ethers.utils.parseEther("1000");
      await defiToken.burn(burnAmount);
      const finalBalance = await defiToken.balanceOf(owner.address);
      expect(finalBalance).to.equal(initialBalance.sub(burnAmount));
    });

    it("Should allow owner to pause/unpause", async function () {
      await defiToken.pause();
      expect(await defiToken.paused()).to.be.true;
      
      await defiToken.unpause();
      expect(await defiToken.paused()).to.be.false;
    });
  });

  describe("StakingPool", function () {
    it("Should allow users to stake tokens", async function () {
      const stakeAmount = ethers.utils.parseEther("100");
      await defiToken.connect(addr1).approve(stakingPool.address, stakeAmount);
      await stakingPool.connect(addr1).stake(stakeAmount);

      const staked = await stakingPool.balances(addr1.address);
      expect(staked).to.equal(stakeAmount);
    });

    it("Should calculate rewards correctly", async function () {
      const stakeAmount = ethers.utils.parseEther("1000");
      await defiToken.connect(addr1).approve(stakingPool.address, stakeAmount);
      await stakingPool.connect(addr1).stake(stakeAmount);

      // Fast forward time
      await ethers.provider.send("evm_increaseTime", [3600]); // 1 hour
      await ethers.provider.send("evm_mine");

      const rewards = await stakingPool.earned(addr1.address);
      expect(rewards).to.be.gt(0);
    });

    it("Should allow withdrawal with rewards", async function () {
      const stakeAmount = ethers.utils.parseEther("1000");
      await defiToken.connect(addr1).approve(stakingPool.address, stakeAmount);
      await stakingPool.connect(addr1).stake(stakeAmount);

      // Fast forward time
      await ethers.provider.send("evm_increaseTime", [3600]);
      await ethers.provider.send("evm_mine");

      const initialBalance = await defiToken.balanceOf(addr1.address);
      await stakingPool.connect(addr1).withdraw(stakeAmount);
      const finalBalance = await defiToken.balanceOf(addr1.address);

      expect(finalBalance).to.be.gt(initialBalance);
    });

    it("Should handle multiple stakers", async function () {
      const stakeAmount1 = ethers.utils.parseEther("1000");
      const stakeAmount2 = ethers.utils.parseEther("2000");

      await defiToken.connect(addr1).approve(stakingPool.address, stakeAmount1);
      await defiToken.connect(addr2).approve(stakingPool.address, stakeAmount2);

      await stakingPool.connect(addr1).stake(stakeAmount1);
      await stakingPool.connect(addr2).stake(stakeAmount2);

      const totalSupply = await stakingPool.totalSupply();
      expect(totalSupply).to.equal(ethers.utils.parseEther("3000"));
    });

    it("Should allow emergency withdrawal", async function () {
      const stakeAmount = ethers.utils.parseEther("1000");
      await defiToken.connect(addr1).approve(stakingPool.address, stakeAmount);
      await stakingPool.connect(addr1).stake(stakeAmount);

      const initialBalance = await defiToken.balanceOf(addr1.address);
      await stakingPool.connect(addr1).emergencyWithdraw();
      const finalBalance = await defiToken.balanceOf(addr1.address);

      // Emergency withdrawal returns the staked amount (minus penalty if applicable)
      expect(finalBalance).to.be.gt(initialBalance);
    });
  });

  describe("LiquidityPool", function () {
    it("Should add liquidity and mint LP tokens", async function () {
      const amount = ethers.utils.parseEther("100");
      await defiToken.connect(addr1).approve(liquidityPool.address, amount);
      await secondToken.connect(addr1).approve(liquidityPool.address, amount);

      await liquidityPool.connect(addr1).addLiquidity(
        amount,
        amount,
        0,
        0,
        addr1.address
      );

      const [reserve0, reserve1] = await liquidityPool.getReserves();
      expect(reserve0).to.equal(amount);
      expect(reserve1).to.equal(amount);

      const lpBalance = await liquidityPool.balanceOf(addr1.address);
      expect(lpBalance).to.be.gt(0);
    });

    it("Should swap tokens correctly", async function () {
      // First add liquidity
      const liquidityAmount = ethers.utils.parseEther("1000");
      await defiToken.connect(addr1).approve(liquidityPool.address, liquidityAmount);
      await secondToken.connect(addr1).approve(liquidityPool.address, liquidityAmount);

      await liquidityPool.connect(addr1).addLiquidity(
        liquidityAmount,
        liquidityAmount,
        0,
        0,
        addr1.address
      );

      // Now swap
      const swapAmount = ethers.utils.parseEther("100");
      await defiToken.connect(addr2).approve(liquidityPool.address, swapAmount);

      const initialBalance = await secondToken.balanceOf(addr2.address);
      await liquidityPool.connect(addr2).swap(
        swapAmount,
        0,
        defiToken.address,
        addr2.address
      );
      const finalBalance = await secondToken.balanceOf(addr2.address);

      expect(finalBalance).to.be.gt(initialBalance);
    });

    it("Should remove liquidity", async function () {
      const amount = ethers.utils.parseEther("100");
      await defiToken.connect(addr1).approve(liquidityPool.address, amount);
      await secondToken.connect(addr1).approve(liquidityPool.address, amount);

      await liquidityPool.connect(addr1).addLiquidity(
        amount,
        amount,
        0,
        0,
        addr1.address
      );

      const lpBalance = await liquidityPool.balanceOf(addr1.address);
      const initialBalance0 = await defiToken.balanceOf(addr1.address);
      const initialBalance1 = await secondToken.balanceOf(addr1.address);

      await liquidityPool.connect(addr1).removeLiquidity(
        lpBalance,
        0,
        0,
        addr1.address
      );

      const finalBalance0 = await defiToken.balanceOf(addr1.address);
      const finalBalance1 = await secondToken.balanceOf(addr1.address);

      expect(finalBalance0).to.be.gt(initialBalance0);
      expect(finalBalance1).to.be.gt(initialBalance1);
    });
  });

  describe("YieldFarm", function () {
    beforeEach(async function () {
      // Add liquidity first to get LP tokens
      const amount = ethers.utils.parseEther("1000");
      await defiToken.connect(addr1).approve(liquidityPool.address, amount);
      await secondToken.connect(addr1).approve(liquidityPool.address, amount);

      await liquidityPool.connect(addr1).addLiquidity(
        amount,
        amount,
        0,
        0,
        addr1.address
      );

      // Transfer some reward tokens to the farm
      await defiToken.transfer(yieldFarm.address, ethers.utils.parseEther("10000"));
    });

    it("Should allow users to stake LP tokens and earn rewards", async function () {
      const lpBalance = await liquidityPool.balanceOf(addr1.address);
      await liquidityPool.connect(addr1).approve(yieldFarm.address, lpBalance);
      await yieldFarm.connect(addr1).stake(lpBalance);

      const stakeInfo = await yieldFarm.getStakeInfo(addr1.address);
      expect(stakeInfo.stakedAmount).to.equal(lpBalance);
    });

    it("Should calculate pending rewards", async function () {
      const lpBalance = await liquidityPool.balanceOf(addr1.address);
      await liquidityPool.connect(addr1).approve(yieldFarm.address, lpBalance);
      await yieldFarm.connect(addr1).stake(lpBalance);

      // Fast forward time
      await ethers.provider.send("evm_increaseTime", [3600]);
      await ethers.provider.send("evm_mine");

      const pendingRewards = await yieldFarm.earned(addr1.address);
      expect(pendingRewards).to.be.gt(0);
    });

    it("Should allow harvesting rewards", async function () {
      const lpBalance = await liquidityPool.balanceOf(addr1.address);
      await liquidityPool.connect(addr1).approve(yieldFarm.address, lpBalance);
      await yieldFarm.connect(addr1).stake(lpBalance);

      // Fast forward time
      await ethers.provider.send("evm_increaseTime", [3600]);
      await ethers.provider.send("evm_mine");

      const initialBalance = await defiToken.balanceOf(addr1.address);
      await yieldFarm.connect(addr1).getReward();
      const finalBalance = await defiToken.balanceOf(addr1.address);

      expect(finalBalance).to.be.gt(initialBalance);
    });

    it("Should allow withdrawal of LP tokens", async function () {
      const lpBalance = await liquidityPool.balanceOf(addr1.address);
      await liquidityPool.connect(addr1).approve(yieldFarm.address, lpBalance);
      await yieldFarm.connect(addr1).stake(lpBalance);

      const withdrawAmount = ethers.utils.parseEther("50");
      await yieldFarm.connect(addr1).withdraw(withdrawAmount);

      const stakeInfo = await yieldFarm.getStakeInfo(addr1.address);
      expect(stakeInfo.stakedAmount).to.equal(lpBalance.sub(withdrawAmount));
    });
  });

  describe("Integration Tests", function () {
    it("Should work end-to-end: stake -> add liquidity -> yield farm", async function () {
      // 1. Stake tokens
      const stakeAmount = ethers.utils.parseEther("1000");
      await defiToken.connect(addr1).approve(stakingPool.address, stakeAmount);
      await stakingPool.connect(addr1).stake(stakeAmount);

      // 2. Add liquidity
      const liquidityAmount = ethers.utils.parseEther("500");
      await defiToken.connect(addr1).approve(liquidityPool.address, liquidityAmount);
      await secondToken.connect(addr1).approve(liquidityPool.address, liquidityAmount);

      await liquidityPool.connect(addr1).addLiquidity(
        liquidityAmount,
        liquidityAmount,
        0,
        0,
        addr1.address
      );

      // 3. Stake LP tokens in yield farm
      const lpBalance = await liquidityPool.balanceOf(addr1.address);
      await liquidityPool.connect(addr1).approve(yieldFarm.address, lpBalance);
      await yieldFarm.connect(addr1).stake(lpBalance);

      // Verify all positions
      const stakingInfo = await stakingPool.getStakeInfo(addr1.address);
      const yieldInfo = await yieldFarm.getStakeInfo(addr1.address);

      expect(stakingInfo.amount).to.equal(stakeAmount);
      expect(yieldInfo.stakedAmount).to.equal(lpBalance);
    });
  });
});
