const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("DeFi Protocol", function () {
  let DefiToken, defiToken, secondToken;
  let StakingPool, stakingPool;
  let LiquidityPool, liquidityPool;
  let YieldFarm, yieldFarm;
  let owner, addr1, addr2;

  beforeEach(async function () {
    [owner, addr1, addr2] = await ethers.getSigners();

    // Deploy DefiToken
    DefiToken = await ethers.getContractFactory("DefiToken");
    defiToken = await DefiToken.deploy(ethers.utils.parseEther("1000000"));
    await defiToken.deployed();

    // Deploy second token for liquidity pool
    secondToken = await DefiToken.deploy(ethers.utils.parseEther("1000000"));
    await secondToken.deployed();

  // Deploy StakingPool (staking token, reward token, rewardRatePerSecond)
  StakingPool = await ethers.getContractFactory("StakingPool");
  stakingPool = await StakingPool.deploy(defiToken.address, defiToken.address, ethers.utils.parseEther("0.001"));
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
    await secondToken.transfer(addr1.address, ethers.utils.parseEther("10000"));
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
  });

  describe("StakingPool", function () {
    it("Should allow users to stake tokens", async function () {
      const stakeAmount = ethers.utils.parseEther("100");
      await defiToken.connect(addr1).approve(stakingPool.address, stakeAmount);
      await stakingPool.connect(addr1).stake(stakeAmount);

      // balances is a public mapping; use getter
      const staked = await stakingPool.balances(addr1.address);
      expect(staked).to.equal(stakeAmount);
    });
  });

  describe("LiquidityPool", function () {
    it("Should allow users to add liquidity", async function () {
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
    });
  });

  describe("YieldFarm", function () {
    it("Should allow users to stake LP tokens and earn rewards", async function () {
      // First add liquidity to get LP tokens
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

      // Approve and stake LP tokens
      const lpBalance = await liquidityPool.balanceOf(addr1.address);
      await liquidityPool.connect(addr1).approve(yieldFarm.address, lpBalance);
      await yieldFarm.connect(addr1).stake(lpBalance);

      const stakeInfo = await yieldFarm.getStakeInfo(addr1.address);
      expect(stakeInfo.stakedAmount).to.equal(lpBalance);
    });
  });
});