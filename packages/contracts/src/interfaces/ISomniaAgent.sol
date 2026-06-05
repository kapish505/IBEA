// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title ISomniaAgent
/// @notice EVM call interface for Somnia Network native agent contracts.
///         Somnia agents expose a standardised `invoke` entrypoint that accepts
///         an ABI-encoded payload and returns a bounded result bundle.
/// @dev Callers MUST NOT trust arbitrary bytes returned by agents — all data
///      should be decoded through this interface and validated by the consumer.
interface ISomniaAgent {
    // ─── Events ───────────────────────────────────────────────────────────────

    /// @notice Emitted inside the agent contract when a job is accepted.
    /// @param caller     The EOA or contract that invoked the agent.
    /// @param requestId  Unique ID assigned to this job.
    /// @param payload    Raw payload forwarded to the agent.
    event JobAccepted(address indexed caller, bytes32 indexed requestId, bytes payload);

    /// @notice Emitted when the agent finalises its analysis.
    /// @param requestId  Unique job ID.
    /// @param result     ABI-encoded AgentResult struct.
    event JobCompleted(bytes32 indexed requestId, bytes result);

    // ─── Structs ──────────────────────────────────────────────────────────────

    /// @notice Bounded result returned by every Somnia agent invocation.
    ///         All fields are explicit-width types to prevent calldata manipulation.
    struct AgentResult {
        /// @dev Unique protocol identifier being analysed (e.g., AAVE=1, GMX=2).
        uint256 protocolId;
        /// @dev Threat score, 0–255, where 255 is maximum severity.
        uint8 threatScore;
        /// @dev Recommended strategy: 0=PAUSE_ONLY, 1=PARTIAL_EXIT,
        ///      2=SAFE_HARBOR_ESCAPE, 3=HEDGE_AND_THROTTLE.
        uint8 strategyEnum;
        /// @dev Target chain ID the strategy should execute on.
        uint256 targetChainId;
    }

    // ─── Functions ────────────────────────────────────────────────────────────

    /// @notice Synchronous agent invocation — available on Somnia's fast block path.
    ///         The agent MUST respond within the same block for EVM atomicity.
    /// @param payload   ABI-encoded input data for the agent (schema is agent-specific).
    /// @return requestId Unique job ID for event correlation.
    /// @return result    Bounded AgentResult struct.
    function invoke(bytes calldata payload)
        external
        returns (bytes32 requestId, AgentResult memory result);

    /// @notice Returns agent metadata for consumer validation.
    /// @return agentType     Short identifier string (e.g., "JSON_API", "LLM_INFERENCE").
    /// @return version       SemVer string (e.g., "1.0.0").
    /// @return maxThreatScore Maximum possible threatScore this agent can return.
    function metadata()
        external
        view
        returns (string memory agentType, string memory version, uint8 maxThreatScore);
}
