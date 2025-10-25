const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("DeFi Protocol - Advanced Features", function () {
  let DefiToken, defiToken;
  let DeFiGovernor, governor;
  let TimelockController, timelock;
  let CrossChainBridge, bridge;
  let ExternalProtocolIntegration, integration;
  let owner, addr1, addr2, addr3;

  beforeEach(async function () {
    [owner, addr1, addr2, addr3] = await ethers.getSigners();

    // Deploy DefiToken
    DefiToken = await ethers.getContractFactory("DefiToken");
    defiToken = await DefiToken.deploy(ethers.utils.parseEther("1000000"));
    await defiToken.deployed();

    // Deploy TimelockController
    TimelockController = await ethers.getContractFactory("TimelockController");
    const minDelay = 86400; // 1 day
    const proposers = [owner.address];
    const executors = [owner.address];
    const admin = owner.address;
    
    timelock = await TimelockController.deploy(
      minDelay,
      proposers,
      executors,
      admin
    );
    await timelock.deployed();

    // Deploy DeFiGovernor
    DeFiGovernor = await ethers.getContractFactory("DeFiGovernor");
    governor = await DeFiGovernor.deploy(
      defiToken.address,
      timelock.address,
      1, // voting delay
      45818, // voting period
      ethers.utils.parseEther("1"), // proposal threshold
      4 // quorum percentage
    );
    await governor.deployed();

    // Deploy CrossChainBridge
    CrossChainBridge = await ethers.getContractFactory("CrossChainBridge");
    bridge = await CrossChainBridge.deploy(defiToken.address);
    await bridge.deployed();

    // Deploy ExternalProtocolIntegration
    ExternalProtocolIntegration = await ethers.getContractFactory("ExternalProtocolIntegration");
    integration = await ExternalProtocolIntegration.deploy();
    await integration.deployed();

    // Transfer tokens to test accounts
    await defiToken.transfer(addr1.address, ethers.utils.parseEther("10000"));
    await defiToken.transfer(addr2.address, ethers.utils.parseEther("10000"));
  });

  describe("Governance Module", function () {
    it("Should create a governance proposal", async function () {
      // Transfer tokens to addr1 for voting
      await defiToken.transfer(addr1.address, ethers.utils.parseEther("1000"));
      
      // Create a proposal
      const targets = [defiToken.address];
      const values = [0];
      const calldatas = [defiToken.interface.encodeFunctionData("mint", [addr1.address, ethers.utils.parseEther("100")])];
      const description = "Test proposal to mint tokens";
      
      const tx = await governor.connect(addr1).proposeWithMetadata(
        targets,
        values,
        calldatas,
        description,
        0, // PROTOCOL_UPGRADE
        "https://example.com"
      );
      
      const receipt = await tx.wait();
      const proposalId = receipt.events[0].args.proposalId;
      
      expect(proposalId).to.not.be.undefined;
    });

    it("Should allow voting on proposals", async function () {
      // Transfer tokens to addr1 for voting
      await defiToken.transfer(addr1.address, ethers.utils.parseEther("1000"));
      
      // Create a proposal
      const targets = [defiToken.address];
      const values = [0];
      const calldatas = [defiToken.interface.encodeFunctionData("mint", [addr1.address, ethers.utils.parseEther("100")])];
      const description = "Test proposal to mint tokens";
      
      const tx = await governor.connect(addr1).proposeWithMetadata(
        targets,
        values,
        calldatas,
        description,
        0,
        "https://example.com"
      );
      
      const receipt = await tx.wait();
      const proposalId = receipt.events[0].args.proposalId;
      
      // Vote on the proposal
      await governor.connect(addr1).castVote(proposalId, 1); // For
      
      const voteWeight = await governor.getVotes(addr1.address, await ethers.provider.getBlockNumber());
      expect(voteWeight).to.be.gt(0);
    });

    it("Should get proposal metadata", async function () {
      // Transfer tokens to addr1 for voting
      await defiToken.transfer(addr1.address, ethers.utils.parseEther("1000"));
      
      // Create a proposal
      const targets = [defiToken.address];
      const values = [0];
      const calldatas = [defiToken.interface.encodeFunctionData("mint", [addr1.address, ethers.utils.parseEther("100")])];
      const description = "Test proposal to mint tokens";
      
      const tx = await governor.connect(addr1).proposeWithMetadata(
        targets,
        values,
        calldatas,
        description,
        1, // PARAMETER_CHANGE
        "https://example.com"
      );
      
      const receipt = await tx.wait();
      const proposalId = receipt.events[0].args.proposalId;
      
      // Get proposal metadata
      const metadata = await governor.getProposalMetadata(proposalId);
      expect(metadata.category).to.equal(1); // PARAMETER_CHANGE
      expect(metadata.description).to.equal(description);
      expect(metadata.externalUrl).to.equal("https://example.com");
    });
  });

  describe("Cross-Chain Bridge", function () {
    it("Should lock tokens for cross-chain transfer", async function () {
      const amount = ethers.utils.parseEther("100");
      const targetChainId = 137; // Polygon
      const txHash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("test-tx"));
      
      // Approve bridge to spend tokens
      await defiToken.connect(addr1).approve(bridge.address, amount);
      
      // Lock tokens
      await bridge.connect(addr1).lockTokens(
        amount,
        targetChainId,
        txHash,
        { value: ethers.utils.parseEther("0.001") } // Bridge fee
      );
      
      const lockedBalance = await bridge.lockedBalances(addr1.address);
      expect(lockedBalance).to.equal(amount);
    });

    it("Should unlock tokens from cross-chain transfer", async function () {
      const amount = ethers.utils.parseEther("100");
      const sourceChainId = 137; // Polygon
      const txHash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("test-tx"));
      
      // Transfer tokens to bridge first
      await defiToken.transfer(bridge.address, amount);
      
      // Unlock tokens
      await bridge.unlockTokens(addr1.address, amount, sourceChainId, txHash);
      
      const userBalance = await defiToken.balanceOf(addr1.address);
      expect(userBalance).to.be.gt(ethers.utils.parseEther("10000"));
    });

    it("Should check if chain is supported", async function () {
      const isSupported = await bridge.isChainSupported(137); // Polygon
      expect(isSupported).to.be.true;
      
      const isNotSupported = await bridge.isChainSupported(999); // Non-existent chain
      expect(isNotSupported).to.be.false;
    });

    it("Should update bridge fee", async function () {
      const newFee = ethers.utils.parseEther("0.002");
      await bridge.setBridgeFee(newFee);
      
      const currentFee = await bridge.bridgeFee();
      expect(currentFee).to.equal(newFee);
    });
  });

  describe("External Protocol Integration", function () {
    it("Should add price feed for a token", async function () {
      const token = addr1.address;
      const priceFeed = addr2.address;
      
      await integration.addPriceFeed(token, priceFeed);
      
      const feedAddress = await integration.getPriceFeedAddress(token);
      expect(feedAddress).to.equal(priceFeed);
    });

    it("Should add supported token", async function () {
      const token = addr1.address;
      
      await integration.addSupportedToken(token);
      
      const isSupported = await integration.isTokenSupported(token);
      expect(isSupported).to.be.true;
    });

    it("Should remove supported token", async function () {
      const token = addr1.address;
      
      // Add token first
      await integration.addSupportedToken(token);
      
      // Remove token
      await integration.removeSupportedToken(token);
      
      const isSupported = await integration.isTokenSupported(token);
      expect(isSupported).to.be.false;
    });

    it("Should execute emergency pause", async function () {
      await integration.emergencyPause();
      
      // Try to add a token (should fail)
      await expect(
        integration.addSupportedToken(addr1.address)
      ).to.be.revertedWith("Pausable: paused");
    });
  });

  describe("Integration Tests", function () {
    it("Should work end-to-end: governance -> bridge -> integration", async function () {
      // 1. Create a governance proposal to add a new token
      await defiToken.transfer(addr1.address, ethers.utils.parseEther("1000"));
      
      const targets = [integration.address];
      const values = [0];
      const calldatas = [integration.interface.encodeFunctionData("addSupportedToken", [addr2.address])];
      const description = "Add new token to external integration";
      
      const tx = await governor.connect(addr1).proposeWithMetadata(
        targets,
        values,
        calldatas,
        description,
        0,
        "https://example.com"
      );
      
      const receipt = await tx.wait();
      const proposalId = receipt.events[0].args.proposalId;
      
      // 2. Vote on the proposal
      await governor.connect(addr1).castVote(proposalId, 1);
      
      // 3. Use bridge to lock tokens
      const bridgeAmount = ethers.utils.parseEther("50");
      await defiToken.connect(addr1).approve(bridge.address, bridgeAmount);
      await bridge.connect(addr1).lockTokens(
        bridgeAmount,
        137, // Polygon
        ethers.utils.keccak256(ethers.utils.toUtf8Bytes("integration-test")),
        { value: ethers.utils.parseEther("0.001") }
      );
      
      // 4. Check integration status
      const isTokenSupported = await integration.isTokenSupported(addr2.address);
      expect(isTokenSupported).to.be.false; // Proposal not executed yet
      
      // Verify bridge locked balance
      const lockedBalance = await bridge.lockedBalances(addr1.address);
      expect(lockedBalance).to.equal(bridgeAmount);
    });
  });
});

