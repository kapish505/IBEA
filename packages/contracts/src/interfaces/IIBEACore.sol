// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IThreatVectorMatrix} from "./IThreatVectorMatrix.sol";

/// @title IIBEACore
/// @notice Interface for the central IBEA coordinator contract.
interface IIBEACore {
    // ─── Enums ────────────────────────────────────────────────────────────────

    /// @notice System-wide risk alert levels.
    enum AlertLevel {
        GREEN,   // No significant risk
        YELLOW,  // Elevated, monitoring
        ORANGE,  // High risk, defensive measures active
        RED      // Critical, emergency freeze candidate
    }

    // ─── Events ───────────────────────────────────────────────────────────────

    event RiskEvent(
        uint256 indexed epoch,
        AlertLevel indexed alertLevel,
        uint256 aggregateThreat,
        uint256 timestamp
    );
    event ModuleUpdated(bytes32 indexed moduleId, address indexed oldAddr, address indexed newAddr);
    event AlertLevelChanged(AlertLevel indexed prev, AlertLevel indexed next, uint256 timestamp);
    event StrategyTriggered(uint8 indexed strategyEnum, uint256 indexed protocolId, uint256 timestamp);
    event KeeperHubUpdated(address indexed oldHub, address indexed newHub);

    // ─── Errors ───────────────────────────────────────────────────────────────

    error ZeroAddress();
    error InvalidModule(bytes32 moduleId);
    error NotKeeperHub(address caller);
    error ModuleAlreadySet(bytes32 moduleId, address addr);
    error SystemFrozen();

    // ─── Functions ────────────────────────────────────────────────────────────

    function computeRisk() external returns (AlertLevel level, uint256 aggregateThreat);
    function triggerStrategy(uint8 strategyEnum, uint256 protocolId, address targetAsset, address lifiDiamond, bytes calldata lifiData) external;
    function setModule(bytes32 moduleId, address moduleAddr) external;
    function getModule(bytes32 moduleId) external view returns (address);
    function alertLevel() external view returns (AlertLevel);
    function keeperHub() external view returns (address);
    function setKeeperHub(address hub) external;
    function epoch() external view returns (uint256);

    // Module identifiers
    function MODULE_ESCALATION_GATE() external pure returns (bytes32);
    function MODULE_THREAT_VECTOR_MATRIX() external pure returns (bytes32);
    function MODULE_SEMANTIC_BURST_ENGINE() external pure returns (bytes32);
    function MODULE_KEEPER_REGISTRY() external pure returns (bytes32);
    function MODULE_SAFE_HARBOR_REGISTRY() external pure returns (bytes32);
    function MODULE_ODIG_GUARD() external pure returns (bytes32);
}
