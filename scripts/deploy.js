const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying contracts with account:", deployer.address);

  // Deploy DefiToken
  const DefiToken = await hre.ethers.getContractFactory("DefiToken");
  const initialSupply = hre.ethers.utils.parseEther("1000000"); // 1 million tokens
  const defiToken = await DefiToken.deploy(initialSupply);
  await defiToken.deployed();
  console.log("DefiToken deployed to:", defiToken.address);

  // Deploy StakingPool
  const StakingPool = await hre.ethers.getContractFactory("StakingPool");
  const rewardRatePerSecond = hre.ethers.utils.parseEther("0.001"); // 0.001 tokens per second
  const stakingPool = await StakingPool.deploy(
    defiToken.address, 
    defiToken.address, 
    rewardRatePerSecond
  );
  await stakingPool.deployed();
  console.log("StakingPool deployed to:", stakingPool.address);

  // Create a second token for the liquidity pool
  const SecondToken = await hre.ethers.getContractFactory("DefiToken");
  const secondToken = await SecondToken.deploy(initialSupply);
  await secondToken.deployed();
  console.log("SecondToken deployed to:", secondToken.address);

  // Deploy LiquidityPool
  const LiquidityPool = await hre.ethers.getContractFactory("LiquidityPool");
  const liquidityPool = await LiquidityPool.deploy(
    defiToken.address,
    secondToken.address
  );
  await liquidityPool.deployed();
  console.log("LiquidityPool deployed to:", liquidityPool.address);

  // Deploy YieldFarm
  const YieldFarm = await hre.ethers.getContractFactory("YieldFarm");
  const rewardRate = hre.ethers.utils.parseEther("0.1"); // 0.1 tokens per second
  const yieldFarm = await YieldFarm.deploy(
    liquidityPool.address,
    defiToken.address,
    rewardRate
  );
  await yieldFarm.deployed();
  console.log("YieldFarm deployed to:", yieldFarm.address);

  // Transfer some tokens to the YieldFarm contract for rewards
  const rewardAmount = hre.ethers.utils.parseEther("100000"); // 100,000 tokens
  await defiToken.transfer(yieldFarm.address, rewardAmount);
  console.log("Transferred initial rewards to YieldFarm");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });