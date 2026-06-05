// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title IODIGGuard
/// @notice Interface for the ODIG (On-chain Defensive Invariant Guard) module.
interface IODIGGuard {
    // ─── Events ───────────────────────────────────────────────────────────────

    event ExecutionAuthorized(address indexed targetAsset, address indexed lifiDiamond, uint256 timestamp);
    event EmergencyFreezeActivated(address indexed initiator, uint256 block_, uint256 timestamp);
    event EmergencyFreezeLifted(address indexed admin, uint256 timestamp);
    event OracleUpdated(address indexed oldOracle, address indexed newOracle);
    event SlippageToleranceUpdated(uint256 oldBps, uint256 newBps);
    event HealthThresholdUpdated(uint256 oldThreshold, uint256 newThreshold);

    // ─── Errors ───────────────────────────────────────────────────────────────

    error ContractFrozen();
    error NotKeeperHub();
    error OraclePriceBelowThreshold(uint256 price, uint256 threshold);
    error SafeHarborViolation(uint256 chainId, address vault);
    error SlippageExceeded(uint256 actualBps, uint256 maxBps);
    error LiFiRouteFailed();
    error ZeroAddress();
    error InvalidSlippageTolerance(uint256 bps);
    error TWAPDeviationExceeded(uint256 spotPrice, uint256 twapPrice, uint256 deviationBps);
    error StablecoinHealthViolation(address asset, uint256 depegBps);

    // ─── Functions ────────────────────────────────────────────────────────────

    function executeDefensiveStrategy(
        address targetAsset,
        address lifiDiamond,
        bytes calldata lifiData
    ) external;

    function emergencyFreeze() external;
    function liftFreeze() external;
    function isFrozen() external view returns (bool);
    function setOracle(address oracle) external;
    function setSlippageTolerance(uint256 bps) external;
    function setHealthThreshold(uint256 threshold) external;
}
