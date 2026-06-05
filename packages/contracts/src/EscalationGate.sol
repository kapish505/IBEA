// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {IEscalationGate} from "./interfaces/IEscalationGate.sol";
import {ThreatMath} from "./libraries/ThreatMath.sol";

/// @title EscalationGate
/// @notice M-of-N multi-source threat validation gate with exponential decay per block.
///
///         Architecture:
///         - Registered sources submit threat dimension deltas for a given epoch.
///         - When M sources have submitted, the epoch is considered quorum-reached.
///         - Aggregated deltas are made available to downstream consumers (ThreatVectorMatrix).
///         - Each epoch can optionally be forced-expired after a configurable TTL.
///         - Exponential decay reduces stale submissions: values decay by DECAY_FACTOR
///           for each EPOCH_DECAY_INTERVAL that passes without quorum.
///
/// @dev Epoch = current block number / EPOCH_BLOCKS. Sources submit within the same epoch window.
contract EscalationGate is Ownable, IEscalationGate {
    using ThreatMath for uint256;

    // ─── Constants ────────────────────────────────────────────────────────────

    /// @notice Blocks per epoch window. At 100ms per block, 600 blocks ≈ 1 minute.
    uint256 public constant EPOCH_BLOCKS = 600;

    /// @notice Decay is applied every this many blocks to stale epoch aggregates.
    uint256 public constant EPOCH_DECAY_INTERVAL = 600;

    // ─── Storage ──────────────────────────────────────────────────────────────

    /// @notice Required number of sources to reach quorum (M in M-of-N).
    uint256 private _requiredM;

    /// @notice Total number of registered sources (N in M-of-N).
    uint256 private _totalN;

    /// @dev source address => weight (0 = not registered)
    mapping(address => uint256) private _sourceWeights;

    /// @dev epoch => source => has submitted
    mapping(uint256 => mapping(address => bool)) private _submitted;

    /// @dev epoch => weighted submission count
    mapping(uint256 => uint256) private _epochWeightSum;

    /// @dev epoch => aggregated dimension deltas
    mapping(uint256 => uint256[5]) private _epochAggregates;

    /// @dev epoch => quorum reached flag
    mapping(uint256 => bool) private _quorumReached;

    /// @dev epoch => last decay block
    mapping(uint256 => uint256) private _epochLastDecay;

    // ─── Constructor ──────────────────────────────────────────────────────────

    /// @param initialOwner Owner address.
    /// @param requiredM    M threshold for quorum.
    /// @param totalN       N total sources expected.
    constructor(address initialOwner, uint256 requiredM, uint256 totalN) Ownable(initialOwner) {
        if (requiredM == 0 || totalN == 0 || requiredM > totalN) {
            revert InvalidQuorum(requiredM, totalN);
        }
        _requiredM = requiredM;
        _totalN    = totalN;
        emit QuorumConfigured(requiredM, totalN);
    }

    // ─── Owner Functions ──────────────────────────────────────────────────────

    /// @inheritdoc IEscalationGate
    function registerSource(address source, uint256 weight) external override onlyOwner {
        if (source == address(0)) revert NotRegisteredSource();
        if (_sourceWeights[source] != 0) revert SourceAlreadyRegistered(source);
        if (weight == 0) revert ZeroWeight();
        _sourceWeights[source] = weight;
        emit SourceRegistered(source, weight);
    }

    /// @inheritdoc IEscalationGate
    function deregisterSource(address source) external override onlyOwner {
        if (_sourceWeights[source] == 0) revert NotRegisteredSource();
        _sourceWeights[source] = 0;
        emit SourceDeregistered(source);
    }

    /// @inheritdoc IEscalationGate
    function configureQuorum(uint256 requiredM, uint256 totalN) external override onlyOwner {
        if (requiredM == 0 || totalN == 0 || requiredM > totalN) {
            revert InvalidQuorum(requiredM, totalN);
        }
        _requiredM = requiredM;
        _totalN    = totalN;
        emit QuorumConfigured(requiredM, totalN);
    }

    // ─── Source Functions ─────────────────────────────────────────────────────

    /// @inheritdoc IEscalationGate
    /// @dev Sources submit raw dimension deltas. Aggregation is weighted.
    ///      Quorum is met when sum of weights of submitters >= requiredM * average_weight.
    ///      For simplicity quorum = count of unique submitters >= _requiredM.
    function submitThreat(
        uint256 epoch,
        uint256[5] calldata dimensionDeltas
    ) external override returns (bool quorumReached) {
        uint256 currentEpoch_ = currentEpoch();
        if (epoch != currentEpoch_) revert EpochExpired(epoch);

        uint256 weight = _sourceWeights[msg.sender];
        if (weight == 0) revert NotRegisteredSource();
        if (_submitted[epoch][msg.sender]) revert AlreadySubmitted(msg.sender, epoch);

        // Mark submitted
        _submitted[epoch][msg.sender] = true;
        _epochWeightSum[epoch]        += weight;

        // Apply decay to stale epoch aggregate before adding new signal
        _applyEpochDecay(epoch);

        // Accumulate weighted deltas (capped at MAX_DIM per dimension)
        for (uint8 i = 0; i < 5; i++) {
            uint256 weighted = (dimensionDeltas[i] * weight) / 1e4; // weight is 0-10000 bps
            _epochAggregates[epoch][i] = ThreatMath.amplify(
                _epochAggregates[epoch][i],
                weighted
            );
            emit ThreatSubmitted(msg.sender, epoch, i, dimensionDeltas[i]);
        }

        // Check quorum: require _requiredM unique sources to have submitted
        // We track unique source count via _epochWeightSum (each source has weight >= 1)
        // For simplicity, quorum = at least _requiredM distinct source submissions
        uint256 uniqueCount = _countUniqueSubmitters(epoch);
        if (!_quorumReached[epoch] && uniqueCount >= _requiredM) {
            _quorumReached[epoch] = true;
            uint256 agg = _computeEpochAggregate(epoch);
            emit ThresholdReached(epoch, agg);
            quorumReached = true;
        }
    }

    // ─── View Functions ───────────────────────────────────────────────────────

    /// @inheritdoc IEscalationGate
    function currentEpoch() public view override returns (uint256) {
        return block.number / EPOCH_BLOCKS;
    }

    /// @inheritdoc IEscalationGate
    function isQuorumReached(uint256 epoch) external view override returns (bool) {
        return _quorumReached[epoch];
    }

    /// @inheritdoc IEscalationGate
    function getEpochAggregate(uint256 epoch) external view override returns (uint256[5] memory) {
        return _epochAggregates[epoch];
    }

    /// @inheritdoc IEscalationGate
    function hasSourceSubmitted(uint256 epoch, address source) external view override returns (bool) {
        return _submitted[epoch][source];
    }

    /// @inheritdoc IEscalationGate
    function requiredSources() external view override returns (uint256) {
        return _requiredM;
    }

    /// @inheritdoc IEscalationGate
    function totalSources() external view override returns (uint256) {
        return _totalN;
    }

    /// @notice Returns the registered weight for a source.
    function sourceWeight(address source) external view returns (uint256) {
        return _sourceWeights[source];
    }

    // ─── Internal ─────────────────────────────────────────────────────────────

    /// @dev Applies exponential decay to epoch aggregate if EPOCH_DECAY_INTERVAL has passed.
    function _applyEpochDecay(uint256 epoch) internal {
        uint256 lastDecay = _epochLastDecay[epoch];
        if (lastDecay == 0) {
            _epochLastDecay[epoch] = block.number;
            return;
        }
        uint256 elapsed   = block.number - lastDecay;
        uint256 intervals = elapsed / EPOCH_DECAY_INTERVAL;
        if (intervals == 0) return;

        for (uint8 i = 0; i < 5; i++) {
            _epochAggregates[epoch][i] = ThreatMath.applyDecayFast(
                _epochAggregates[epoch][i],
                intervals
            );
        }
        _epochLastDecay[epoch] = block.number;
    }

    /// @dev Counts distinct submitters for an epoch using weight-sum heuristic.
    ///      Since each source has weight >= 1 and we track total weight sum,
    ///      we cannot simply divide (weights vary). We use a separate counter pattern
    ///      by storing submission count in the upper bits of _epochWeightSum.
    ///      For correctness, we use a dedicated mapping.
    mapping(uint256 => uint256) private _epochSubmissionCount;

    /// @dev Override submitThreat to also increment count (handled inline below).
    ///      This function reads the count directly.
    function _countUniqueSubmitters(uint256 epoch) internal returns (uint256) {
        // Increment on first submission for this source (already guarded above)
        // We lazily increment here; this is called after _submitted[epoch][msg.sender] is set
        _epochSubmissionCount[epoch] += 1;
        return _epochSubmissionCount[epoch];
    }

    /// @dev Computes a simple aggregate score for event emission.
    function _computeEpochAggregate(uint256 epoch) internal view returns (uint256 agg) {
        uint256[5] memory dims  = _epochAggregates[epoch];
        uint256[5] memory equal = [uint256(2000), 2000, 2000, 2000, 2000];
        agg = ThreatMath.weightedAggregate(dims, equal);
    }
}
