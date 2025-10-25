const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying governance contracts with account:", deployer.address);

  // Deploy DefiToken (if not already deployed)
  const DefiToken = await hre.ethers.getContractFactory("DefiToken");
  const initialSupply = hre.ethers.utils.parseEther("1000000");
  const defiToken = await DefiToken.deploy(initialSupply);
  await defiToken.deployed();
  console.log("DefiToken deployed to:", defiToken.address);

  // Deploy TimelockController
  const TimelockController = await hre.ethers.getContractFactory("TimelockController");
  const minDelay = 86400; // 1 day delay
  const proposers = [deployer.address];
  const executors = [deployer.address];
  const admin = deployer.address;
  
  const timelock = await TimelockController.deploy(
    minDelay,
    proposers,
    executors,
    admin
  );
  await timelock.deployed();
  console.log("TimelockController deployed to:", timelock.address);

  // Deploy DeFiGovernor
  const DeFiGovernor = await hre.ethers.getContractFactory("DeFiGovernor");
  const votingDelay = 1; // 1 block
  const votingPeriod = 45818; // ~1 week
  const proposalThreshold = hre.ethers.utils.parseEther("1"); // 1 token
  const quorumPercentage = 4; // 4%

  const governor = await DeFiGovernor.deploy(
    defiToken.address,
    timelock.address,
    votingDelay,
    votingPeriod,
    proposalThreshold,
    quorumPercentage
  );
  await governor.deployed();
  console.log("DeFiGovernor deployed to:", governor.address);

  // Deploy CrossChainBridge
  const CrossChainBridge = await hre.ethers.getContractFactory("CrossChainBridge");
  const bridge = await CrossChainBridge.deploy(defiToken.address);
  await bridge.deployed();
  console.log("CrossChainBridge deployed to:", bridge.address);

  // Deploy ExternalProtocolIntegration
  const ExternalProtocolIntegration = await hre.ethers.getContractFactory("ExternalProtocolIntegration");
  const integration = await ExternalProtocolIntegration.deploy();
  await integration.deployed();
  console.log("ExternalProtocolIntegration deployed to:", integration.address);

  // Setup governance roles
  console.log("\nSetting up governance roles...");
  
  // Grant proposer role to governor
  const proposerRole = await timelock.PROPOSER_ROLE();
  await timelock.grantRole(proposerRole, governor.address);
  console.log("Granted proposer role to governor");

  // Grant executor role to governor
  const executorRole = await timelock.EXECUTOR_ROLE();
  await timelock.grantRole(executorRole, governor.address);
  console.log("Granted executor role to governor");

  // Note: Admin role remains with deployer for now
  // In production, you might want to transfer admin role to a multisig
  console.log("Admin role remains with deployer");

  console.log("\n=== Governance Deployment Complete ===");
  console.log("DefiToken:", defiToken.address);
  console.log("TimelockController:", timelock.address);
  console.log("DeFiGovernor:", governor.address);
  console.log("CrossChainBridge:", bridge.address);
  console.log("ExternalProtocolIntegration:", integration.address);
  
  console.log("\n=== Next Steps ===");
  console.log("1. Transfer ownership of contracts to timelock");
  console.log("2. Create initial governance proposals");
  console.log("3. Set up price feeds for external integration");
  console.log("4. Configure cross-chain bridge parameters");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

