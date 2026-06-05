// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title ThreatMath
/// @notice Library for exponential decay and threat-score arithmetic used across IBEA modules.
/// @dev All values are fixed-point with 18 decimal places unless noted.
///      Threat dimensions are scaled 0–10000 (4 decimals of bps precision).
library ThreatMath {
    // ─── Constants ────────────────────────────────────────────────────────────

    /// @notice Decay factor per DECAY_INTERVAL blocks. 0.995 * 1e18 ≈ 995000000000000000.
    ///         Decays ~0.5% per interval, half-life ≈ 138 intervals.
    uint256 internal constant DECAY_FACTOR = 995_000_000_000_000_000; // 0.995e18

    /// @notice 1e18 fixed-point base.
    uint256 internal constant WAD = 1e18;

    /// @notice Maximum dimension value (10 000 = 100.00%).
    uint256 internal constant MAX_DIM = 10_000;

    // ─── Decay ────────────────────────────────────────────────────────────────

    /// @notice Applies n rounds of exponential decay to a dimension value.
    /// @param value     Current dimension value (0–10000).
    /// @param intervals Number of DECAY_INTERVALs elapsed since last update.
    /// @return decayed  New dimension value after decay.
    function applyDecay(uint256 value, uint256 intervals) internal pure returns (uint256 decayed) {
        if (value == 0 || intervals == 0) return value;
        decayed = value;
        // Iterative exponentiation — safe for typical interval counts (<= 1000 blocks)
        for (uint256 i = 0; i < intervals; i++) {
            decayed = (decayed * DECAY_FACTOR) / WAD;
        }
    }

    /// @notice Fast decay using binary exponentiation (cheaper for large intervals).
    /// @param value     Current dimension value (0–10000).
    /// @param intervals Number of decay intervals.
    /// @return decayed  New dimension value.
    function applyDecayFast(uint256 value, uint256 intervals) internal pure returns (uint256 decayed) {
        if (value == 0 || intervals == 0) return value;
        uint256 factor = WAD;
        uint256 base   = DECAY_FACTOR;
        uint256 exp    = intervals;
        // Binary fast-pow: factor = DECAY_FACTOR^intervals (in WAD space)
        while (exp > 0) {
            if (exp & 1 == 1) {
                factor = (factor * base) / WAD;
            }
            base = (base * base) / WAD;
            exp >>= 1;
        }
        decayed = (value * factor) / WAD;
    }

    // ─── Amplification ────────────────────────────────────────────────────────

    /// @notice Amplifies a dimension by an additive signal, capped at MAX_DIM.
    /// @param current Current dimension value.
    /// @param signal  Additive increase (0–10000).
    /// @return result Clamped new value.
    function amplify(uint256 current, uint256 signal) internal pure returns (uint256 result) {
        result = current + signal;
        if (result > MAX_DIM) result = MAX_DIM;
    }

    // ─── Aggregation ──────────────────────────────────────────────────────────

    /// @notice Computes a weighted aggregate threat score from 5 dimensions.
    ///         Weights are in basis points (sum should equal 10 000 for full scale).
    /// @param dims    Array of 5 dimension values.
    /// @param weights Array of 5 weights in bps (total 10 000).
    /// @return score  Aggregate score in 0–10000.
    function weightedAggregate(
        uint256[5] memory dims,
        uint256[5] memory weights
    ) internal pure returns (uint256 score) {
        uint256 sum;
        uint256 totalWeight;
        for (uint256 i = 0; i < 5; i++) {
            sum         += dims[i] * weights[i];
            totalWeight += weights[i];
        }
        if (totalWeight == 0) return 0;
        score = sum / totalWeight;
        if (score > MAX_DIM) score = MAX_DIM;
    }

    /// @notice Scales a 0–10000 dimension value to a uint8 threat score (0–255).
    ///         Uses linear interpolation: threatScore = (dim * 255) / 10000.
    /// @param dim Dimension value in 0–10000.
    /// @return ts  Threat score in 0–255.
    function toThreatScore(uint256 dim) internal pure returns (uint8 ts) {
        uint256 scaled = (dim * 255) / MAX_DIM;
        ts = uint8(scaled > 255 ? 255 : scaled);
    }

    /// @notice Maps an aggregate threat score to a StrategyEnum.
    ///         Thresholds (in 0–10000):
    ///           < 2500 → PAUSE_ONLY (0)
    ///           < 5000 → HEDGE_AND_THROTTLE (3)
    ///           < 7500 → PARTIAL_EXIT (1)
    ///           >= 7500 → SAFE_HARBOR_ESCAPE (2)
    /// @param aggregateScore 0–10000 aggregate score.
    /// @return strategyEnum  0–3 strategy index.
    function scoreToStrategy(uint256 aggregateScore) internal pure returns (uint8 strategyEnum) {
        if (aggregateScore < 2_500) return 0; // PAUSE_ONLY
        if (aggregateScore < 5_000) return 3; // HEDGE_AND_THROTTLE
        if (aggregateScore < 7_500) return 1; // PARTIAL_EXIT
        return 2; // SAFE_HARBOR_ESCAPE
    }

    // ─── Validation ───────────────────────────────────────────────────────────

    /// @notice Clamps a value to the MAX_DIM ceiling.
    function clampDim(uint256 value) internal pure returns (uint256) {
        return value > MAX_DIM ? MAX_DIM : value;
    }

    /// @notice Returns true when a dimension exceeds the given threshold.
    function exceedsThreshold(uint256 dim, uint256 threshold) internal pure returns (bool) {
        return dim >= threshold;
    }

    /// @notice Computes slippage basis points between two prices.
    ///         slippageBps = |expectedPrice - actualPrice| * 10000 / expectedPrice
    /// @param expectedPrice Expected price, WAD-scaled.
    /// @param actualPrice   Actual execution price, WAD-scaled.
    /// @return bps          Slippage in basis points.
    function slippageBps(uint256 expectedPrice, uint256 actualPrice) internal pure returns (uint256 bps) {
        if (expectedPrice == 0) return type(uint256).max;
        uint256 delta = expectedPrice > actualPrice ? expectedPrice - actualPrice : actualPrice - expectedPrice;
        bps = (delta * 10_000) / expectedPrice;
    }
}
