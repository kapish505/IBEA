// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

interface IAgentManager {
    function createTask(
        uint256 agentId,
        string calldata taskData
    ) external payable returns (uint256 taskId);
}

/// @title SROCoordinator
/// @notice On-Chain Ingestion Hub orchestrating Somnia Native Agents via the AgentManager.
contract SROCoordinator is Ownable {
    // ─── Events ───────────────────────────────────────────────────────────────

    event RiskEvent(
        uint8 indexed eventType,
        uint8 confidence,
        uint8 severity,
        bytes32 evidence,
        uint256 targetChainId
    );

    event AgentTaskCreated(uint256 indexed taskId, uint256 agentId, string workflow);
    event FastPathTriggered(uint256 metricDeviation);
    event SlowPathConsensusRequested(bytes32 evidenceHash);

    // ─── Storage ──────────────────────────────────────────────────────────────

    IAgentManager public agentManager;

    // Authorized Somnia Native Agent IDs
    uint256 public jsonApiAgentId;     // JSON API Request Agent
    uint256 public websiteParseAgentId; // LLM Parse Website Agent
    uint256 public llmAgentId;          // LLM Inference Agent

    mapping(uint256 => bytes32) public taskToEvidenceHash;
    mapping(uint256 => uint256) public taskToTargetChainId;

    address public keeperHub;

    error NotKeeperHub();

    modifier onlyKeeperHub() {
        if (msg.sender != keeperHub) revert NotKeeperHub();
        _;
    }

    // ─── Constructor ──────────────────────────────────────────────────────────

    constructor(address initialOwner, address _agentManager) Ownable(initialOwner) {
        agentManager = IAgentManager(_agentManager);

        // Real Testnet Agent IDs from Somnia Agents Explorer
        jsonApiAgentId     = 13174292974160097713;
        websiteParseAgentId = 12875401142070969085;
        llmAgentId          = 12847293847561029384;
    }

    // ─── Configuration ────────────────────────────────────────────────────────

    function setAgentIds(
        uint256 _jsonApi,
        uint256 _websiteParse,
        uint256 _llm
    ) external onlyOwner {
        jsonApiAgentId = _jsonApi;
        websiteParseAgentId = _websiteParse;
        llmAgentId = _llm;
    }

    function setAgentManager(address _agentManager) external onlyOwner {
        agentManager = IAgentManager(_agentManager);
    }

    function setKeeperHub(address _keeperHub) external onlyOwner {
        keeperHub = _keeperHub;
    }

    // ─── ADM_METRIC (Fast-Path) ──────────────────────────────────────────────

    /// @notice Dispatch a JSON API fetch task to the Somnia JSON API Request Agent
    function requestMetricData(
        string calldata taskData,
        bytes32 evidenceHash,
        uint256 targetChainId
    ) external payable {
        uint256 taskId = agentManager.createTask{value: msg.value}(
            jsonApiAgentId,
            taskData
        );

        taskToEvidenceHash[taskId] = evidenceHash;
        taskToTargetChainId[taskId] = targetChainId;

        emit AgentTaskCreated(taskId, jsonApiAgentId, "ADM_METRIC");
    }

    // ─── ADM_SEMANTIC & ADM_PREDICTIVE (Slow-Path) ───────────────────────────

    /// @notice Dispatch a website parse task to the Somnia LLM Parse Website Agent
    function requestWebsiteParse(
        string calldata taskData,
        bytes32 evidenceHash,
        uint256 targetChainId
    ) external payable {
        uint256 taskId = agentManager.createTask{value: msg.value}(
            websiteParseAgentId,
            taskData
        );

        taskToEvidenceHash[taskId] = evidenceHash;
        taskToTargetChainId[taskId] = targetChainId;

        emit AgentTaskCreated(taskId, websiteParseAgentId, "ADM_PREDICTIVE");
    }

    /// @notice Dispatch an LLM inference task to the Somnia LLM Inference Agent
    function requestLLMInference(
        string calldata taskData,
        bytes32 evidenceHash,
        uint256 targetChainId
    ) external payable {
        uint256 taskId = agentManager.createTask{value: msg.value}(
            llmAgentId,
            taskData
        );

        taskToEvidenceHash[taskId] = evidenceHash;
        taskToTargetChainId[taskId] = targetChainId;

        emit AgentTaskCreated(taskId, llmAgentId, "ADM_SEMANTIC");
    }

    // ─── Result Processing (called by backend after TaskCompleted event) ─────

    /// @notice Called by the backend once the off-chain agent result is available
    function reportMetricResult(
        uint256 taskId,
        uint256 metricDeviation
    ) external onlyKeeperHub {
        if (metricDeviation > 15) {
            emit FastPathTriggered(metricDeviation);

            uint8 severity = metricDeviation > 50 ? 4 : 3;
            emit RiskEvent(
                4,
                100,
                severity,
                taskToEvidenceHash[taskId],
                taskToTargetChainId[taskId]
            );
        }
    }

    /// @notice Called by the backend once the LLM inference result is available
    function reportSemanticResult(
        uint256 taskId,
        uint8 computedSeverity
    ) external onlyKeeperHub {
        bytes32 evidenceHash = taskToEvidenceHash[taskId];
        emit SlowPathConsensusRequested(evidenceHash);

        if (computedSeverity >= 3) {
            emit RiskEvent(
                4,
                100,
                computedSeverity,
                evidenceHash,
                taskToTargetChainId[taskId]
            );
        }
    }

    // Support receiving STT
    receive() external payable {}
}
