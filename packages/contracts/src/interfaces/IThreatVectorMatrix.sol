// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title IThreatVectorMatrix
/// @notice Interface for the 5-dimensional onchain risk state machine.
interface IThreatVectorMatrix {
    // ─── Structs ──────────────────────────────────────────────────────────────

    /// @notice The five risk dimensions tracked by the matrix.
    ///         All values are scaled 0–10000 (10000 = maximum threat).
    struct ThreatState {
        uint256 liquidityStress;         // DIM_0
        uint256 bridgeInstability;       // DIM_1
        uint256 governanceRisk;          // DIM_2
        uint256 oracleManipulationRisk;  // DIM_3
        uint256 contagionProbability;    // DIM_4
        uint256 lastUpdateBlock;         // block number of last write
    }

    // ─── Events ───────────────────────────────────────────────────────────────

    event DimensionUpdated(uint8 indexed dim, uint256 oldValue, uint256 newValue, uint256 block_);
    event DecayApplied(uint256 intervalsElapsed, ThreatState newState);
    event MatrixReset();
    event DecayIntervalConfigured(uint256 newInterval);

    // ─── Errors ───────────────────────────────────────────────────────────────

    error InvalidDimension(uint8 dim);
    error ValueOutOfRange(uint256 value, uint256 max);
    error UnauthorizedUpdater(address caller);

    // ─── Functions ────────────────────────────────────────────────────────────

    function updateDimension(uint8 dim, uint256 newValue) external;
    function amplifyDimension(uint8 dim, uint256 signal) external;
    function applyDecay() external;
    function getThreatState() external view returns (ThreatState memory);
    function getAggregateScore() external view returns (uint256 score);
    function getDimension(uint8 dim) external view returns (uint256);
    function setDecayInterval(uint256 blocks) external;
    function decayInterval() external view returns (uint256);
    function isUpdater(address addr) external view returns (bool);
    function addUpdater(address addr) external;
    function removeUpdater(address addr) external;
}
