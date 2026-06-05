// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {EnumerableSet} from "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";
import {IThreatVectorMatrix} from "./interfaces/IThreatVectorMatrix.sol";
import {ThreatMath} from "./libraries/ThreatMath.sol";

/// @title ThreatVectorMatrix
/// @notice 5-dimensional onchain risk state machine with exponential decay.
///
///         Dimensions (all uint256, scaled 0–10000):
///           DIM_0 — liquidityStress
///           DIM_1 — bridgeInstability
///           DIM_2 — governanceRisk
///           DIM_3 — oracleManipulationRisk
///           DIM_4 — contagionProbability
///
///         Decay is applied every `decayInterval` blocks. Any authorized updater
///         may write or amplify individual dimensions. Reads always return the
///         latest decayed values (decay is applied lazily on write or explicit call).
///
///         Weights used for aggregate score (in bps, sum = 10000):
///           liquidityStress:        2500
///           bridgeInstability:      2000
///           governanceRisk:         1500
///           oracleManipulationRisk: 2500
///           contagionProbability:   1500
contract ThreatVectorMatrix is Ownable, IThreatVectorMatrix {
    using EnumerableSet for EnumerableSet.AddressSet;

    // ─── Constants ────────────────────────────────────────────────────────────

    uint8 public constant DIM_LIQUIDITY_STRESS          = 0;
    uint8 public constant DIM_BRIDGE_INSTABILITY        = 1;
    uint8 public constant DIM_GOVERNANCE_RISK           = 2;
    uint8 public constant DIM_ORACLE_MANIPULATION_RISK  = 3;
    uint8 public constant DIM_CONTAGION_PROBABILITY     = 4;
    uint8 public constant NUM_DIMS                      = 5;

    /// @notice Default decay interval in blocks (~5 minutes at 100ms blocks = 3000 blocks).
    uint256 public constant DEFAULT_DECAY_INTERVAL = 3_000;

    uint256[5] private WEIGHTS = [uint256(2500), 2000, 1500, 2500, 1500];

    // ─── Storage ──────────────────────────────────────────────────────────────

    /// @notice Number of blocks between automatic decay applications.
    uint256 public override decayInterval;

    /// @notice The current risk state (lazily decayed).
    ThreatState private _state;

    /// @notice Authorized addresses that may update dimensions.
    EnumerableSet.AddressSet private _updaters;

    // ─── Constructor ──────────────────────────────────────────────────────────

    /// @param initialOwner Owner address.
    /// @param initialUpdater Initial authorised updater (typically IBEACore or EscalationGate).
    constructor(address initialOwner, address initialUpdater) Ownable(initialOwner) {
        decayInterval = DEFAULT_DECAY_INTERVAL;
        _state.lastUpdateBlock = block.number;
        if (initialUpdater != address(0)) {
            _updaters.add(initialUpdater);
        }
    }

    // ─── Modifiers ────────────────────────────────────────────────────────────

    modifier onlyUpdater() {
        if (!_updaters.contains(msg.sender) && msg.sender != owner()) {
            revert UnauthorizedUpdater(msg.sender);
        }
        _;
    }

    modifier validDim(uint8 dim) {
        if (dim >= NUM_DIMS) revert InvalidDimension(dim);
        _;
    }

    // ─── Owner / Admin Functions ──────────────────────────────────────────────

    /// @inheritdoc IThreatVectorMatrix
    function addUpdater(address addr) external override onlyOwner {
        if (addr == address(0)) revert UnauthorizedUpdater(addr);
        _updaters.add(addr);
    }

    /// @inheritdoc IThreatVectorMatrix
    function removeUpdater(address addr) external override onlyOwner {
        _updaters.remove(addr);
    }

    /// @inheritdoc IThreatVectorMatrix
    function setDecayInterval(uint256 blocks) external override onlyOwner {
        require(blocks > 0, "TVM: zero interval");
        decayInterval = blocks;
        emit DecayIntervalConfigured(blocks);
    }

    // ─── Updater Functions ────────────────────────────────────────────────────

    /// @inheritdoc IThreatVectorMatrix
    function updateDimension(uint8 dim, uint256 newValue) external override onlyUpdater validDim(dim) {
        if (newValue > ThreatMath.MAX_DIM) revert ValueOutOfRange(newValue, ThreatMath.MAX_DIM);
        _applyDecayInternal();
        uint256 old = _getDimRaw(dim);
        _setDim(dim, newValue);
        emit DimensionUpdated(dim, old, newValue, block.number);
    }

    /// @inheritdoc IThreatVectorMatrix
    function amplifyDimension(uint8 dim, uint256 signal) external override onlyUpdater validDim(dim) {
        if (signal > ThreatMath.MAX_DIM) revert ValueOutOfRange(signal, ThreatMath.MAX_DIM);
        _applyDecayInternal();
        uint256 old  = _getDimRaw(dim);
        uint256 next = ThreatMath.amplify(old, signal);
        _setDim(dim, next);
        emit DimensionUpdated(dim, old, next, block.number);
    }

    /// @inheritdoc IThreatVectorMatrix
    function applyDecay() external override {
        _applyDecayInternal();
    }

    // ─── View Functions ───────────────────────────────────────────────────────

    /// @inheritdoc IThreatVectorMatrix
    function getThreatState() external view override returns (ThreatState memory) {
        return _stateWithDecay();
    }

    /// @inheritdoc IThreatVectorMatrix
    function getAggregateScore() external view override returns (uint256 score) {
        ThreatState memory s = _stateWithDecay();
        uint256[5] memory dims = [
            s.liquidityStress,
            s.bridgeInstability,
            s.governanceRisk,
            s.oracleManipulationRisk,
            s.contagionProbability
        ];
        score = ThreatMath.weightedAggregate(dims, WEIGHTS);
    }

    /// @inheritdoc IThreatVectorMatrix
    function getDimension(uint8 dim) external view override validDim(dim) returns (uint256) {
        ThreatState memory s = _stateWithDecay();
        return _getDimFromState(s, dim);
    }

    /// @inheritdoc IThreatVectorMatrix
    function isUpdater(address addr) external view override returns (bool) {
        return _updaters.contains(addr) || addr == owner();
    }

    // ─── Internal ─────────────────────────────────────────────────────────────

    /// @dev Applies decay in-place to storage, updates lastUpdateBlock.
    function _applyDecayInternal() internal {
        uint256 elapsed = block.number - _state.lastUpdateBlock;
        if (elapsed == 0 || decayInterval == 0) return;
        uint256 intervals = elapsed / decayInterval;
        if (intervals == 0) return;

        ThreatState memory prev = _state;

        _state.liquidityStress        = ThreatMath.applyDecayFast(_state.liquidityStress,        intervals);
        _state.bridgeInstability      = ThreatMath.applyDecayFast(_state.bridgeInstability,      intervals);
        _state.governanceRisk         = ThreatMath.applyDecayFast(_state.governanceRisk,         intervals);
        _state.oracleManipulationRisk = ThreatMath.applyDecayFast(_state.oracleManipulationRisk, intervals);
        _state.contagionProbability   = ThreatMath.applyDecayFast(_state.contagionProbability,   intervals);
        _state.lastUpdateBlock        = block.number;

        emit DecayApplied(intervals, _state);

        // suppress unused var warning for prev
        prev;
    }

    /// @dev Returns a decayed view of the state without writing to storage.
    function _stateWithDecay() internal view returns (ThreatState memory s) {
        s = _state;
        uint256 elapsed   = block.number - s.lastUpdateBlock;
        uint256 intervals = decayInterval > 0 ? elapsed / decayInterval : 0;
        if (intervals > 0) {
            s.liquidityStress        = ThreatMath.applyDecayFast(s.liquidityStress,        intervals);
            s.bridgeInstability      = ThreatMath.applyDecayFast(s.bridgeInstability,      intervals);
            s.governanceRisk         = ThreatMath.applyDecayFast(s.governanceRisk,         intervals);
            s.oracleManipulationRisk = ThreatMath.applyDecayFast(s.oracleManipulationRisk, intervals);
            s.contagionProbability   = ThreatMath.applyDecayFast(s.contagionProbability,   intervals);
            s.lastUpdateBlock        = block.number;
        }
    }

    function _getDimRaw(uint8 dim) internal view returns (uint256) {
        if (dim == 0) return _state.liquidityStress;
        if (dim == 1) return _state.bridgeInstability;
        if (dim == 2) return _state.governanceRisk;
        if (dim == 3) return _state.oracleManipulationRisk;
        return _state.contagionProbability;
    }

    function _getDimFromState(ThreatState memory s, uint8 dim) internal pure returns (uint256) {
        if (dim == 0) return s.liquidityStress;
        if (dim == 1) return s.bridgeInstability;
        if (dim == 2) return s.governanceRisk;
        if (dim == 3) return s.oracleManipulationRisk;
        return s.contagionProbability;
    }

    function _setDim(uint8 dim, uint256 value) internal {
        if (dim == 0) _state.liquidityStress        = value;
        else if (dim == 1) _state.bridgeInstability  = value;
        else if (dim == 2) _state.governanceRisk      = value;
        else if (dim == 3) _state.oracleManipulationRisk = value;
        else _state.contagionProbability              = value;
        _state.lastUpdateBlock = block.number;
    }
}
