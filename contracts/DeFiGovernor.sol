// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/governance/Governor.sol";
import "@openzeppelin/contracts/governance/extensions/GovernorSettings.sol";
import "@openzeppelin/contracts/governance/extensions/GovernorCountingSimple.sol";
import "@openzeppelin/contracts/governance/extensions/GovernorVotes.sol";
import "@openzeppelin/contracts/governance/extensions/GovernorVotesQuorumFraction.sol";
import "@openzeppelin/contracts/governance/extensions/GovernorTimelockControl.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/Pausable.sol";

/**
 * @title DeFiGovernor
 * @dev DAO governance contract for DeFi Protocol
 * Allows token holders to vote on protocol changes and proposals
 */
contract DeFiGovernor is 
    Governor,
    GovernorSettings,
    GovernorCountingSimple,
    GovernorVotes,
    GovernorVotesQuorumFraction,
    GovernorTimelockControl,
    Ownable,
    Pausable
{
    // Proposal categories
    enum ProposalCategory {
        PROTOCOL_UPGRADE,
        PARAMETER_CHANGE,
        TREASURY_MANAGEMENT,
        PARTNERSHIP,
        EMERGENCY
    }

    // Proposal struct with additional metadata
    struct ProposalMetadata {
        ProposalCategory category;
        string description;
        string externalUrl;
        uint256 createdAt;
        bool executed;
    }

    // Mapping from proposal ID to metadata
    mapping(uint256 => ProposalMetadata) public proposalMetadata;

    // Events
    event ProposalCreatedWithMetadata(
        uint256 indexed proposalId,
        ProposalCategory indexed category,
        string description,
        address indexed proposer
    );

    event ProposalExecutedCustom(uint256 indexed proposalId);
    event EmergencyActionExecuted(address indexed executor, string action);

    constructor(
        IVotes _token,
        TimelockController _timelock,
        uint256 _votingDelay,
        uint256 _votingPeriod,
        uint256 _proposalThreshold,
        uint256 _quorumPercentage
    )
        Governor("DeFi Protocol Governor")
        GovernorSettings(
            _votingDelay,     // 1 block
            _votingPeriod,    // 45818 blocks (~1 week)
            _proposalThreshold // 1 token
        )
        GovernorVotes(_token)
        GovernorVotesQuorumFraction(_quorumPercentage)
        GovernorTimelockControl(_timelock)
    {}

    /**
     * @dev Create a new proposal with metadata
     */
    function proposeWithMetadata(
        address[] memory targets,
        uint256[] memory values,
        bytes[] memory calldatas,
        string memory description,
        ProposalCategory category,
        string memory externalUrl
    ) public whenNotPaused returns (uint256) {
        uint256 proposalId = propose(targets, values, calldatas, description);
        
        proposalMetadata[proposalId] = ProposalMetadata({
            category: category,
            description: description,
            externalUrl: externalUrl,
            createdAt: block.timestamp,
            executed: false
        });

        emit ProposalCreatedWithMetadata(proposalId, category, description, msg.sender);
        return proposalId;
    }

    /**
     * @dev Override execute to track execution
     */
    function execute(
        address[] memory targets,
        uint256[] memory values,
        bytes[] memory calldatas,
        bytes32 descriptionHash
    ) public payable override(Governor, IGovernor) returns (uint256) {
        uint256 proposalId = super.execute(targets, values, calldatas, descriptionHash);
        proposalMetadata[proposalId].executed = true;
        emit ProposalExecutedCustom(proposalId);
        return proposalId;
    }

    /**
     * @dev Emergency pause function (only owner)
     */
    function emergencyPause() external onlyOwner {
        _pause();
    }

    /**
     * @dev Emergency unpause function (only owner)
     */
    function emergencyUnpause() external onlyOwner {
        _unpause();
    }

    /**
     * @dev Emergency action execution (only owner, requires timelock)
     */
    function emergencyAction(
        address target,
        uint256 value,
        bytes memory data,
        string memory action
    ) external onlyOwner {
        (bool success, ) = target.call{value: value}(data);
        require(success, "Emergency action failed");
        emit EmergencyActionExecuted(msg.sender, action);
    }

    /**
     * @dev Get proposal metadata
     */
    function getProposalMetadata(uint256 proposalId) 
        external 
        view 
        returns (ProposalMetadata memory) 
    {
        return proposalMetadata[proposalId];
    }

    /**
     * @dev Get voting power at a specific block
     */
    function getVotingPower(address account, uint256 blockNumber) 
        external 
        view 
        returns (uint256) 
    {
        return getVotes(account, blockNumber);
    }

    /**
     * @dev Check if a proposal is executable
     */
    function isProposalExecutable(uint256 proposalId) external view returns (bool) {
        return state(proposalId) == ProposalState.Succeeded;
    }

    // Required overrides
    function votingDelay() public view override(IGovernor, GovernorSettings) returns (uint256) {
        return super.votingDelay();
    }

    function votingPeriod() public view override(IGovernor, GovernorSettings) returns (uint256) {
        return super.votingPeriod();
    }

    function quorum(uint256 blockNumber) 
        public 
        view 
        override(IGovernor, GovernorVotesQuorumFraction) 
        returns (uint256) 
    {
        return super.quorum(blockNumber);
    }

    function state(uint256 proposalId)
        public
        view
        override(Governor, GovernorTimelockControl)
        returns (ProposalState)
    {
        return super.state(proposalId);
    }

    function proposalThreshold() public view override(Governor, GovernorSettings) returns (uint256) {
        return super.proposalThreshold();
    }

    // Required overrides for multiple inheritance
    function _cancel(
        address[] memory targets,
        uint256[] memory values,
        bytes[] memory calldatas,
        bytes32 descriptionHash
    ) internal override(Governor, GovernorTimelockControl) returns (uint256) {
        return super._cancel(targets, values, calldatas, descriptionHash);
    }

    function _execute(
        uint256 proposalId,
        address[] memory targets,
        uint256[] memory values,
        bytes[] memory calldatas,
        bytes32 descriptionHash
    ) internal override(Governor, GovernorTimelockControl) {
        super._execute(proposalId, targets, values, calldatas, descriptionHash);
    }

    function _executor() internal view override(Governor, GovernorTimelockControl) returns (address) {
        return super._executor();
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(Governor, GovernorTimelockControl)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}

