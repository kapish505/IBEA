// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ISomniaAgent} from "./ISomniaAgent.sol";

/// @title IEscalationGate
/// @notice Interface for the M-of-N multi-source threat validation gate.
interface IEscalationGate {
    // ─── Events ───────────────────────────────────────────────────────────────

    event SourceRegistered(address indexed source, uint256 weight);
    event SourceDeregistered(address indexed source);
    event ThreatSubmitted(address indexed source, uint256 indexed epoch, uint256 dimension, uint256 value);
    event ThresholdReached(uint256 indexed epoch, uint256 aggregateThreat);
    event GateReset(uint256 indexed epoch);
    event QuorumConfigured(uint256 requiredSources, uint256 totalSources);

    // ─── Errors ───────────────────────────────────────────────────────────────

    error NotRegisteredSource();
    error AlreadySubmitted(address source, uint256 epoch);
    error EpochExpired(uint256 epoch);
    error InvalidQuorum(uint256 required, uint256 total);
    error ZeroWeight();
    error SourceAlreadyRegistered(address source);

    // ─── Functions ────────────────────────────────────────────────────────────

    function registerSource(address source, uint256 weight) external;
    function deregisterSource(address source) external;
    function submitThreat(uint256 epoch, uint256[5] calldata dimensionDeltas) external returns (bool quorumReached);
    function configureQuorum(uint256 requiredM, uint256 totalN) external;
    function currentEpoch() external view returns (uint256);
    function isQuorumReached(uint256 epoch) external view returns (bool);
    function getEpochAggregate(uint256 epoch) external view returns (uint256[5] memory);
    function hasSourceSubmitted(uint256 epoch, address source) external view returns (bool);
    function requiredSources() external view returns (uint256);
    function totalSources() external view returns (uint256);
}
