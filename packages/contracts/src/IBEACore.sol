// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Ownable2Step, Ownable} from "@openzeppelin/contracts/access/Ownable2Step.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";

import {IIBEACore} from "./interfaces/IIBEACore.sol";
import {IThreatVectorMatrix} from "./interfaces/IThreatVectorMatrix.sol";
import {IEscalationGate} from "./interfaces/IEscalationGate.sol";
import {ISafeHarborRegistry} from "./interfaces/ISafeHarborRegistry.sol";
import {IODIGGuard} from "./interfaces/IODIGGuard.sol";
import {ThreatMath} from "./libraries/ThreatMath.sol";

/// @title IBEACore
/// @notice Central coordinator for the Invariant-Bounded Escalation Architecture.
///
///         IBEACore owns references to all IBEA modules and serves as the single
///         authoritative source of current alert level. It:
///           - Reads from ThreatVectorMatrix to compute aggregate risk
///           - Translates aggregate risk to AlertLevel and emits RiskEvent
///           - Routes strategy triggers to ODIGGuard
///           - Maintains the module registry
///           - Exposes the keeperHub interface used by downstream modifiers
///
///         Alert level thresholds (based on 0–10000 aggregate score):
///           GREEN:  0 – 2499
///           YELLOW: 2500 – 4999
///           ORANGE: 5000 – 7499
///           RED:    7500 – 10000
contract IBEACore is Ownable2Step, ReentrancyGuard, Pausable, IIBEACore {
    // ─── Module Keys ──────────────────────────────────────────────────────────

    bytes32 private constant _MODULE_ESCALATION_GATE        = keccak256("MODULE_ESCALATION_GATE");
    bytes32 private constant _MODULE_THREAT_VECTOR_MATRIX   = keccak256("MODULE_THREAT_VECTOR_MATRIX");
    bytes32 private constant _MODULE_SEMANTIC_BURST_ENGINE  = keccak256("MODULE_SEMANTIC_BURST_ENGINE");
    bytes32 private constant _MODULE_KEEPER_REGISTRY        = keccak256("MODULE_KEEPER_REGISTRY");
    bytes32 private constant _MODULE_SAFE_HARBOR_REGISTRY   = keccak256("MODULE_SAFE_HARBOR_REGISTRY");
    bytes32 private constant _MODULE_ODIG_GUARD             = keccak256("MODULE_ODIG_GUARD");

    // ─── Alert Thresholds ────────────────────────────────────────────────────

    uint256 public constant YELLOW_THRESHOLD = 2_500;
    uint256 public constant ORANGE_THRESHOLD = 5_000;
    uint256 public constant RED_THRESHOLD    = 7_500;

    // ─── Storage ──────────────────────────────────────────────────────────────

    /// @notice Current system alert level.
    AlertLevel private _alertLevel;

    /// @notice KeeperHub address (authorised to trigger strategies).
    address private _keeperHub;

    /// @notice Module address registry.
    mapping(bytes32 => address) private _modules;

    /// @notice Monotonically increasing epoch counter (incremented on each computeRisk call).
    uint256 private _epoch;

    // ─── Constructor ──────────────────────────────────────────────────────────

    /// @param initialOwner Owner address (uses Ownable2Step for safe transfers).
    /// @param initialKeeperHub Keeper hub address (may be updated later).
    constructor(address initialOwner, address initialKeeperHub) Ownable(initialOwner) {
        if (initialKeeperHub == address(0)) revert ZeroAddress();
        _keeperHub  = initialKeeperHub;
        _alertLevel = AlertLevel.GREEN;
    }

    // ─── Modifiers ────────────────────────────────────────────────────────────

    modifier onlyKeeperHub() {
        if (msg.sender != _keeperHub) revert NotKeeperHub(msg.sender);
        _;
    }

    modifier notFrozen() {
        address odigAddr = _modules[_MODULE_ODIG_GUARD];
        if (odigAddr != address(0) && IODIGGuard(odigAddr).isFrozen()) revert SystemFrozen();
        _;
    }

    // ─── Core Functions ───────────────────────────────────────────────────────

    /// @inheritdoc IIBEACore
    /// @notice Reads the current ThreatVectorMatrix state, computes an aggregate score,
    ///         updates AlertLevel, and emits a RiskEvent.
    function computeRisk()
        external
        override
        nonReentrant
        whenNotPaused
        returns (AlertLevel level, uint256 aggregateThreat)
    {
        address tvmAddr = _modules[_MODULE_THREAT_VECTOR_MATRIX];
        if (tvmAddr != address(0)) {
            aggregateThreat = IThreatVectorMatrix(tvmAddr).getAggregateScore();
        }

        AlertLevel newLevel = _scoreToAlertLevel(aggregateThreat);
        AlertLevel prev     = _alertLevel;

        if (newLevel != prev) {
            _alertLevel = newLevel;
            emit AlertLevelChanged(prev, newLevel, block.timestamp);
        }

        unchecked { _epoch++; }

        emit RiskEvent(_epoch, newLevel, aggregateThreat, block.timestamp);
        return (newLevel, aggregateThreat);
    }

    /// @inheritdoc IIBEACore
    /// @notice Keeper-only function to trigger a defensive strategy.
    ///         Routes the call to the ODIGGuard module.
    function triggerStrategy(
        uint8 strategyEnum,
        uint256 protocolId,
        address targetAsset,
        address lifiDiamond,
        bytes calldata lifiData
    )
        external
        override
        onlyKeeperHub
        nonReentrant
        notFrozen
        whenNotPaused
    {
        if (strategyEnum > 3) revert InvalidModule(bytes32(uint256(strategyEnum)));
        emit StrategyTriggered(strategyEnum, protocolId, block.timestamp);

        if (strategyEnum > 0) {
            address odigAddr = _modules[_MODULE_ODIG_GUARD];
            if (odigAddr == address(0)) revert ZeroAddress();
            IODIGGuard(odigAddr).executeDefensiveStrategy(targetAsset, lifiDiamond, lifiData);
        }
    }

    // ─── Module Registry ──────────────────────────────────────────────────────

    /// @inheritdoc IIBEACore
    function setModule(bytes32 moduleId, address moduleAddr) external override onlyOwner {
        if (moduleAddr == address(0)) revert ZeroAddress();
        if (!_isValidModuleId(moduleId)) revert InvalidModule(moduleId);
        address old = _modules[moduleId];
        _modules[moduleId] = moduleAddr;
        emit ModuleUpdated(moduleId, old, moduleAddr);
    }

    /// @inheritdoc IIBEACore
    function getModule(bytes32 moduleId) external view override returns (address) {
        return _modules[moduleId];
    }

    // ─── KeeperHub ────────────────────────────────────────────────────────────

    /// @inheritdoc IIBEACore
    function setKeeperHub(address hub) external override onlyOwner {
        if (hub == address(0)) revert ZeroAddress();
        address old = _keeperHub;
        _keeperHub = hub;
        emit KeeperHubUpdated(old, hub);
    }

    /// @inheritdoc IIBEACore
    function keeperHub() external view override returns (address) {
        return _keeperHub;
    }

    // ─── Emergency Controls ───────────────────────────────────────────────────

    /// @notice Pause the core (prevents computeRisk and triggerStrategy).
    function pause() external onlyOwner {
        _pause();
    }

    /// @notice Unpause the core.
    function unpause() external onlyOwner {
        _unpause();
    }

    // ─── View Functions ───────────────────────────────────────────────────────

    /// @inheritdoc IIBEACore
    function alertLevel() external view override returns (AlertLevel) {
        return _alertLevel;
    }

    /// @inheritdoc IIBEACore
    function epoch() external view override returns (uint256) {
        return _epoch;
    }

    // ─── Module ID Accessors ──────────────────────────────────────────────────

    function MODULE_ESCALATION_GATE()       external pure override returns (bytes32) { return _MODULE_ESCALATION_GATE; }
    function MODULE_THREAT_VECTOR_MATRIX()  external pure override returns (bytes32) { return _MODULE_THREAT_VECTOR_MATRIX; }
    function MODULE_SEMANTIC_BURST_ENGINE() external pure override returns (bytes32) { return _MODULE_SEMANTIC_BURST_ENGINE; }
    function MODULE_KEEPER_REGISTRY()       external pure override returns (bytes32) { return _MODULE_KEEPER_REGISTRY; }
    function MODULE_SAFE_HARBOR_REGISTRY()  external pure override returns (bytes32) { return _MODULE_SAFE_HARBOR_REGISTRY; }
    function MODULE_ODIG_GUARD()            external pure override returns (bytes32) { return _MODULE_ODIG_GUARD; }

    // ─── Internal ─────────────────────────────────────────────────────────────

    function _scoreToAlertLevel(uint256 score) internal pure returns (AlertLevel) {
        if (score >= RED_THRESHOLD)    return AlertLevel.RED;
        if (score >= ORANGE_THRESHOLD) return AlertLevel.ORANGE;
        if (score >= YELLOW_THRESHOLD) return AlertLevel.YELLOW;
        return AlertLevel.GREEN;
    }

    function _isValidModuleId(bytes32 id) internal pure returns (bool) {
        return (
            id == _MODULE_ESCALATION_GATE       ||
            id == _MODULE_THREAT_VECTOR_MATRIX  ||
            id == _MODULE_SEMANTIC_BURST_ENGINE ||
            id == _MODULE_KEEPER_REGISTRY       ||
            id == _MODULE_SAFE_HARBOR_REGISTRY  ||
            id == _MODULE_ODIG_GUARD
        );
    }
}
