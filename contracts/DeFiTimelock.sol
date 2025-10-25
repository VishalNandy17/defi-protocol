// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/governance/TimelockController.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/security/Pausable.sol";

/**
 * @title DeFiTimelock
 * @dev Timelock controller for DeFi Protocol governance
 * Ensures proposals have a delay before execution for security
 */
contract DeFiTimelock is TimelockController, Pausable {
    // Additional roles
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");

    // Events
    event TimelockOperationScheduled(
        bytes32 indexed id,
        uint256 indexed index,
        address target,
        uint256 value,
        bytes data,
        bytes32 predecessor,
        uint256 delay
    );

    event TimelockOperationExecuted(
        bytes32 indexed id,
        uint256 indexed index,
        address target,
        uint256 value,
        bytes data
    );

    constructor(
        uint256 minDelay,
        address[] memory proposers,
        address[] memory executors,
        address admin
    ) TimelockController(minDelay, proposers, executors, admin) {
        _grantRole(ADMIN_ROLE, admin);
        _setRoleAdmin(PROPOSER_ROLE, ADMIN_ROLE);
        _setRoleAdmin(EXECUTOR_ROLE, ADMIN_ROLE);
        _setRoleAdmin(CANCELLER_ROLE, ADMIN_ROLE);
    }

    /**
     * @dev Schedule a timelock operation
     */
    function scheduleOperation(
        address target,
        uint256 value,
        bytes calldata data,
        bytes32 predecessor,
        bytes32 salt,
        uint256 delay
    ) external onlyRole(PROPOSER_ROLE) whenNotPaused returns (bytes32) {
        super.schedule(target, value, data, predecessor, salt, delay);
        bytes32 id = hashOperation(target, value, data, predecessor, salt);
        
        emit TimelockOperationScheduled(
            id,
            0, // index not available in this version
            target,
            value,
            data,
            predecessor,
            delay
        );
        
        return id;
    }

    /**
     * @dev Execute a timelock operation
     */
    function executeOperation(
        address target,
        uint256 value,
        bytes calldata data,
        bytes32 predecessor,
        bytes32 salt
    ) external payable onlyRole(EXECUTOR_ROLE) whenNotPaused returns (bytes32) {
        super.execute(target, value, data, predecessor, salt);
        bytes32 id = hashOperation(target, value, data, predecessor, salt);
        
        emit TimelockOperationExecuted(
            id,
            0, // index not available in this version
            target,
            value,
            data
        );
        
        return id;
    }

    /**
     * @dev Emergency pause (only admin)
     */
    function emergencyPause() external onlyRole(ADMIN_ROLE) {
        _pause();
    }

    /**
     * @dev Emergency unpause (only admin)
     */
    function emergencyUnpause() external onlyRole(ADMIN_ROLE) {
        _unpause();
    }

    /**
     * @dev Check if operation is ready
     */
    function isOperationReady(bytes32 id) public view override returns (bool) {
        return super.isOperationReady(id);
    }

    /**
     * @dev Check if operation is pending
     */
    function isOperationPending(bytes32 id) public view override returns (bool) {
        return super.isOperationPending(id);
    }

    /**
     * @dev Check if operation is done
     */
    function isOperationDone(bytes32 id) public view override returns (bool) {
        return super.isOperationDone(id);
    }
}

