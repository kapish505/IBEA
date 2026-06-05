// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/// @title SROCoordinator
/// @notice On-Chain Ingestion Hub orchestrating Somnia Native Agents.
contract SROCoordinator is Ownable {
    // ─── Events ───────────────────────────────────────────────────────────────

    // Matches the flowchart precisely
    event RiskEvent(
        uint8 indexed eventType,
        uint8 confidence,
        uint8 severity,
        bytes32 evidence,
        uint256 targetChainId
    );

    event AgentRegistered(address indexed agent, string role);
    
    // For tracing
    event FastPathTriggered(uint256 metricDeviation);
    event SlowPathConsensusRequested(bytes32 evidenceHash);

    // ─── Storage ──────────────────────────────────────────────────────────────

    // Authorized Somnia Native Agents
    address public admMetricAgent; // JSON API Agent
    address public admSemanticAgent; // LLM Parse + Inference
    address public admPredictiveAgent; // Governance Scraper

    // ─── Constructor ──────────────────────────────────────────────────────────

    constructor(address initialOwner) Ownable(initialOwner) {}

    // ─── Configuration ────────────────────────────────────────────────────────

    function setAgents(
        address metric,
        address semantic,
        address predictive
    ) external onlyOwner {
        admMetricAgent = metric;
        admSemanticAgent = semantic;
        admPredictiveAgent = predictive;
        emit AgentRegistered(metric, "ADM_METRIC");
        emit AgentRegistered(semantic, "ADM_SEMANTIC");
        emit AgentRegistered(predictive, "ADM_PREDICTIVE");
    }

    // ─── ADM_METRIC (Fast-Path) ───────────────────────────────────────────────

    /// @notice Called by ADM_METRIC (JSON API Agent) on a 60s loop.
    /// @param metricDeviation Percentage deviation of TVL/Price (0-100).
    function ingestMetricData(
        uint256 metricDeviation,
        uint8 confidence,
        bytes32 evidence,
        uint256 targetChainId
    ) external {
        require(msg.sender == admMetricAgent, "Unauthorized: Not ADM_METRIC");

        // [FAST-PATH BYPASS] If Math Threshold > 15%
        if (metricDeviation > 15) {
            emit FastPathTriggered(metricDeviation);
            
            // Skip LLM Consensus and emit RiskEvent instantly
            uint8 severity = metricDeviation > 50 ? 4 : 3; // CRITICAL or ELEVATED
            
            // type 4 = CROSS-CHAIN ESCAPE (from Action Executor mapping)
            emit RiskEvent(4, confidence, severity, evidence, targetChainId);
        }
    }

    // ─── ADM_SEMANTIC & ADM_PREDICTIVE (Slow-Path) ────────────────────────────

    /// @notice Called by ADM_SEMANTIC (5m loop) or ADM_PREDICTIVE (6h loop).
    function ingestSemanticData(
        bytes32 evidenceHash,
        uint8 confidence,
        uint8 computedSeverity,
        uint256 targetChainId
    ) external {
        require(
            msg.sender == admSemanticAgent || msg.sender == admPredictiveAgent,
            "Unauthorized: Not Semantic/Predictive Agent"
        );

        // [SLOW-PATH CONSENSUS]
        emit SlowPathConsensusRequested(evidenceHash);

        // In a fully native Somnia environment, this would await LLM Validator consensus.
        // For the hackathon, we simulate the Validator confirming the threat if confidence is high.
        if (confidence > 80 && computedSeverity >= 3) {
            // Emit RiskEvent for CROSS-CHAIN ESCAPE (4)
            emit RiskEvent(4, confidence, computedSeverity, evidenceHash, targetChainId);
        }
    }
}
