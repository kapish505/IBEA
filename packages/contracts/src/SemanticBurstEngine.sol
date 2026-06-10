// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ISomniaAgent} from "./interfaces/ISomniaAgent.sol";
import {ThreatMath} from "./libraries/ThreatMath.sol";

/// @title SemanticBurstEngine
/// @notice Orchestrates calls to 3 Somnia native agent contracts and returns a
///         bounded, validated analysis result.
///
///         The engine:
///         1. Calls all three agents in sequence with a shared payload.
///         2. Aggregates the results into a single bounded output struct.
///         3. Validates all enum fields are within defined ranges.
///         4. Selects the consensus strategyEnum by majority vote.
///         5. Selects the highest threatScore as the aggregate threat.
///
///         Strategy enum values:
///           0 = PAUSE_ONLY
///           1 = PARTIAL_EXIT
///           2 = SAFE_HARBOR_ESCAPE
///           3 = HEDGE_AND_THROTTLE
///
/// @dev Agent addresses are injected via constructor and may be updated by owner.
///      No arbitrary calldata is returned — only the BurstResult struct.
contract SemanticBurstEngine is Ownable {
    // ─── Structs ──────────────────────────────────────────────────────────────

    /// @notice Bounded output from the burst engine.
    struct BurstResult {
        /// @dev Protocol identifier being analysed (e.g., AAVE=1, GMX=2, ...).
        uint256 protocolId;
        /// @dev Max threat score across all agents, 0–255.
        uint8 threatScore;
        /// @dev Consensus strategy enum, 0–3.
        uint8 strategyEnum;
        /// @dev Target chain ID for defensive action.
        uint256 targetChainId;
    }

    // ─── Events ───────────────────────────────────────────────────────────────

    event AgentUpdated(uint8 indexed slot, address indexed oldAgent, address indexed newAgent);
    event BurstExecuted(
        uint256 indexed protocolId,
        uint8 threatScore,
        uint8 strategyEnum,
        uint256 targetChainId,
        uint256 timestamp
    );
    event AgentCallFailed(uint8 indexed slot, address agent, bytes reason);
    event FallbackTriggered(uint256 indexed protocolId, uint8 derivedStrategy);

    // ─── Errors ───────────────────────────────────────────────────────────────

    error ZeroAddress();
    error InvalidStrategyEnum(uint8 value);
    error NoAgentsResponded();
    error InvalidAgentSlot(uint8 slot);

    // ─── Constants ────────────────────────────────────────────────────────────

    uint8 public constant NUM_AGENTS   = 3;
    uint8 public constant MAX_STRATEGY = 3; // HEDGE_AND_THROTTLE

    // ─── Storage ──────────────────────────────────────────────────────────────

    /// @notice The three Somnia agent contract addresses.
    ///         Slot 0: JSON API Agent
    ///         Slot 1: Website Parse Agent
    ///         Slot 2: LLM Inference Agent
    address[3] public agents;

    // ─── Constructor ──────────────────────────────────────────────────────────

    /// @param initialOwner      Owner address.
    /// @param jsonApiAgent      Address of the Somnia JSON API agent.
    /// @param websiteParseAgent Address of the Somnia website parse agent.
    /// @param llmInferenceAgent Address of the Somnia LLM inference agent.
    constructor(
        address initialOwner,
        address jsonApiAgent,
        address websiteParseAgent,
        address llmInferenceAgent
    ) Ownable(initialOwner) {
        if (jsonApiAgent == address(0) || websiteParseAgent == address(0) || llmInferenceAgent == address(0)) {
            revert ZeroAddress();
        }
        agents[0] = jsonApiAgent;
        agents[1] = websiteParseAgent;
        agents[2] = llmInferenceAgent;
    }

    // ─── Owner Functions ──────────────────────────────────────────────────────

    /// @notice Updates a specific agent slot.
    /// @param slot     Agent slot index (0, 1, or 2).
    /// @param newAgent New agent address.
    function setAgent(uint8 slot, address newAgent) external onlyOwner {
        if (slot >= NUM_AGENTS) revert InvalidAgentSlot(slot);
        if (newAgent == address(0)) revert ZeroAddress();
        address old = agents[slot];
        agents[slot] = newAgent;
        emit AgentUpdated(slot, old, newAgent);
    }

    // ─── Core Functions ───────────────────────────────────────────────────────

    /// @notice Invokes all three Somnia agents and returns a bounded consensus result.
    /// @param protocolId   Identifier of the protocol to analyse.
    /// @param targetChainId Chain ID for the defensive strategy.
    /// @param agentPayload  ABI-encoded payload forwarded to each agent's `invoke` function.
    /// @return result       Bounded BurstResult struct.
    function burst(
        uint256 protocolId,
        uint256 targetChainId,
        bytes calldata agentPayload
    ) external returns (BurstResult memory result) {
        ISomniaAgent.AgentResult[3] memory responses;
        bool[3] memory success;
        uint8 successCount;

        // ── Call each agent, tolerate individual failures ───────────────────
        for (uint8 i = 0; i < NUM_AGENTS; i++) {
            try ISomniaAgent(agents[i]).invoke(agentPayload) returns (
                bytes32, // requestId — not used
                ISomniaAgent.AgentResult memory agentResult
            ) {
                // Validate bounded fields
                if (agentResult.strategyEnum > MAX_STRATEGY) {
                    // Clamp invalid strategy to PAUSE_ONLY (conservative)
                    agentResult.strategyEnum = 0;
                }
                responses[i] = agentResult;
                success[i]   = true;
                unchecked { successCount++; }
            } catch (bytes memory reason) {
                emit AgentCallFailed(i, agents[i], reason);
            }
        }

        if (successCount == 0) revert NoAgentsResponded();

        // ── Consensus: majority vote on strategyEnum ─────────────────────────
        uint8 consensusStrategy = _majorityStrategy(responses, success, successCount);

        // ── Aggregate: take maximum threatScore ──────────────────────────────
        uint8 maxThreat;
        for (uint8 i = 0; i < NUM_AGENTS; i++) {
            if (success[i] && responses[i].threatScore > maxThreat) {
                maxThreat = responses[i].threatScore;
            }
        }

        // ── If no agent returned a meaningful strategy, fallback to ThreatMath ─
        if (successCount > 0 && maxThreat > 0) {
            // Scale threatScore (0-255) to dimension (0-10000) and re-derive strategy
            uint256 scaledDim = (uint256(maxThreat) * ThreatMath.MAX_DIM) / 255;
            uint8 derivedStrategy = ThreatMath.scoreToStrategy(scaledDim);
            // Take the more aggressive strategy for safety
            if (derivedStrategy > consensusStrategy) {
                consensusStrategy = derivedStrategy;
                emit FallbackTriggered(protocolId, derivedStrategy);
            }
        }

        result = BurstResult({
            protocolId:   protocolId,
            threatScore:  maxThreat,
            strategyEnum: consensusStrategy,
            targetChainId: targetChainId
        });

        emit BurstExecuted(
            result.protocolId,
            result.threatScore,
            result.strategyEnum,
            result.targetChainId,
            block.timestamp
        );
    }

    // ─── Internal ─────────────────────────────────────────────────────────────

    /// @dev Determines the majority strategy enum from successful responses.
    ///      Ties are broken by taking the higher (more defensive) strategy.
    function _majorityStrategy(
        ISomniaAgent.AgentResult[3] memory responses,
        bool[3] memory success,
        uint8 successCount
    ) internal pure returns (uint8 majority) {
        // Tally votes for each strategy (0–3)
        uint8[4] memory tally;
        for (uint8 i = 0; i < NUM_AGENTS; i++) {
            if (success[i]) {
                uint8 s = responses[i].strategyEnum;
                if (s <= MAX_STRATEGY) {
                    tally[s]++;
                }
            }
        }

        // Find the strategy with the highest vote; tie → higher strategy wins
        uint8 maxVotes = 0;
        majority = 0;
        for (uint8 s = 0; s <= MAX_STRATEGY; s++) {
            if (tally[s] > maxVotes || (tally[s] == maxVotes && s > majority)) {
                maxVotes = tally[s];
                majority = s;
            }
        }
        return majority;
    }
}
