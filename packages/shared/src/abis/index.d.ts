/**
 * ISomniaAgent ABI
 *
 * This represents the EVM interface for calling Somnia's native agents.
 * The exact ABI will be updated when Somnia publishes agent contract specs.
 * The interaction PATTERN is production-ready — only addresses change.
 *
 * Tier 1: JSON API Agent — structured offchain intelligence fetch
 * Tier 2: Website Parse Agent — semantic context enrichment
 * Tier 3: LLM Inference Agent — bounded threat reasoning
 */
export declare const ISomniaAgentABI: readonly [{
    readonly name: "requestInference";
    readonly type: "function";
    readonly stateMutability: "nonpayable";
    readonly inputs: readonly [{
        readonly name: "requestId";
        readonly type: "uint256";
    }, {
        readonly name: "payload";
        readonly type: "bytes";
    }];
    readonly outputs: readonly [{
        readonly name: "jobId";
        readonly type: "bytes32";
    }];
}, {
    readonly name: "getInferenceResult";
    readonly type: "function";
    readonly stateMutability: "view";
    readonly inputs: readonly [{
        readonly name: "jobId";
        readonly type: "bytes32";
    }];
    readonly outputs: readonly [{
        readonly name: "ready";
        readonly type: "bool";
    }, {
        readonly name: "result";
        readonly type: "bytes";
    }];
}, {
    readonly name: "InferenceRequested";
    readonly type: "event";
    readonly inputs: readonly [{
        readonly name: "jobId";
        readonly type: "bytes32";
        readonly indexed: true;
    }, {
        readonly name: "requester";
        readonly type: "address";
        readonly indexed: true;
    }, {
        readonly name: "requestId";
        readonly type: "uint256";
        readonly indexed: false;
    }];
}, {
    readonly name: "InferenceCompleted";
    readonly type: "event";
    readonly inputs: readonly [{
        readonly name: "jobId";
        readonly type: "bytes32";
        readonly indexed: true;
    }, {
        readonly name: "resultHash";
        readonly type: "bytes32";
        readonly indexed: false;
    }];
}];
export declare const IBEACoreABI: readonly [{
    readonly name: "RiskEvent";
    readonly type: "event";
    readonly inputs: readonly [{
        readonly name: "eventType";
        readonly type: "uint8";
        readonly indexed: true;
    }, {
        readonly name: "confidence";
        readonly type: "uint8";
        readonly indexed: false;
    }, {
        readonly name: "severity";
        readonly type: "uint8";
        readonly indexed: false;
    }, {
        readonly name: "evidence";
        readonly type: "bytes32";
        readonly indexed: false;
    }, {
        readonly name: "targetChainId";
        readonly type: "uint256";
        readonly indexed: false;
    }];
}, {
    readonly name: "escalate";
    readonly type: "function";
    readonly stateMutability: "nonpayable";
    readonly inputs: readonly [{
        readonly name: "protocolId";
        readonly type: "uint256";
    }, {
        readonly name: "threatVectors";
        readonly type: "uint256[5]";
    }];
    readonly outputs: readonly [];
}, {
    readonly name: "getProtocolState";
    readonly type: "function";
    readonly stateMutability: "view";
    readonly inputs: readonly [{
        readonly name: "protocolId";
        readonly type: "uint256";
    }];
    readonly outputs: readonly [{
        readonly name: "escalationState";
        readonly type: "uint8";
    }, {
        readonly name: "lastRiskEvent";
        readonly type: "uint256";
    }];
}];
export declare const EscalationGateABI: readonly [{
    readonly name: "EscalationTriggered";
    readonly type: "event";
    readonly inputs: readonly [{
        readonly name: "protocolId";
        readonly type: "uint256";
        readonly indexed: true;
    }, {
        readonly name: "validatorCount";
        readonly type: "uint256";
        readonly indexed: false;
    }, {
        readonly name: "threshold";
        readonly type: "uint256";
        readonly indexed: false;
    }, {
        readonly name: "timestamp";
        readonly type: "uint256";
        readonly indexed: false;
    }];
}, {
    readonly name: "submitSignal";
    readonly type: "function";
    readonly stateMutability: "nonpayable";
    readonly inputs: readonly [{
        readonly name: "protocolId";
        readonly type: "uint256";
    }, {
        readonly name: "dimension";
        readonly type: "uint8";
    }, {
        readonly name: "magnitude";
        readonly type: "uint256";
    }, {
        readonly name: "evidence";
        readonly type: "bytes32";
    }];
    readonly outputs: readonly [];
}, {
    readonly name: "isEscalated";
    readonly type: "function";
    readonly stateMutability: "view";
    readonly inputs: readonly [{
        readonly name: "protocolId";
        readonly type: "uint256";
    }];
    readonly outputs: readonly [{
        readonly name: "";
        readonly type: "bool";
    }];
}];
export declare const ThreatVectorMatrixABI: readonly [{
    readonly name: "ThreatVectorsUpdated";
    readonly type: "event";
    readonly inputs: readonly [{
        readonly name: "protocolId";
        readonly type: "uint256";
        readonly indexed: true;
    }, {
        readonly name: "vectors";
        readonly type: "uint256[5]";
        readonly indexed: false;
    }, {
        readonly name: "blockNumber";
        readonly type: "uint256";
        readonly indexed: false;
    }];
}, {
    readonly name: "getVectors";
    readonly type: "function";
    readonly stateMutability: "view";
    readonly inputs: readonly [{
        readonly name: "protocolId";
        readonly type: "uint256";
    }];
    readonly outputs: readonly [{
        readonly name: "vectors";
        readonly type: "uint256[5]";
    }];
}, {
    readonly name: "updateVectors";
    readonly type: "function";
    readonly stateMutability: "nonpayable";
    readonly inputs: readonly [{
        readonly name: "protocolId";
        readonly type: "uint256";
    }, {
        readonly name: "vectors";
        readonly type: "uint256[5]";
    }];
    readonly outputs: readonly [];
}];
export declare const ODIGGuardABI: readonly [{
    readonly name: "ExecutionAuthorized";
    readonly type: "event";
    readonly inputs: readonly [{
        readonly name: "targetAsset";
        readonly type: "address";
        readonly indexed: true;
    }, {
        readonly name: "lifiDiamond";
        readonly type: "address";
        readonly indexed: true;
    }, {
        readonly name: "strategy";
        readonly type: "uint8";
        readonly indexed: false;
    }, {
        readonly name: "timestamp";
        readonly type: "uint256";
        readonly indexed: false;
    }];
}, {
    readonly name: "InvariantFailed";
    readonly type: "event";
    readonly inputs: readonly [{
        readonly name: "targetAsset";
        readonly type: "address";
        readonly indexed: true;
    }, {
        readonly name: "reason";
        readonly type: "string";
        readonly indexed: false;
    }, {
        readonly name: "timestamp";
        readonly type: "uint256";
        readonly indexed: false;
    }];
}, {
    readonly name: "EmergencyFreeze";
    readonly type: "event";
    readonly inputs: readonly [{
        readonly name: "protocolId";
        readonly type: "uint256";
        readonly indexed: true;
    }, {
        readonly name: "trigger";
        readonly type: "string";
        readonly indexed: false;
    }, {
        readonly name: "timestamp";
        readonly type: "uint256";
        readonly indexed: false;
    }];
}, {
    readonly name: "executeDefensiveStrategy";
    readonly type: "function";
    readonly stateMutability: "nonpayable";
    readonly inputs: readonly [{
        readonly name: "targetAsset";
        readonly type: "address";
    }, {
        readonly name: "lifiDiamond";
        readonly type: "address";
    }, {
        readonly name: "lifiData";
        readonly type: "bytes";
    }];
    readonly outputs: readonly [];
}];
export declare const SafeHarborRegistryABI: readonly [{
    readonly name: "SafeHarborAdded";
    readonly type: "event";
    readonly inputs: readonly [{
        readonly name: "chainId";
        readonly type: "uint256";
        readonly indexed: true;
    }, {
        readonly name: "vaultAddress";
        readonly type: "address";
        readonly indexed: true;
    }, {
        readonly name: "timestamp";
        readonly type: "uint256";
        readonly indexed: false;
    }];
}, {
    readonly name: "isApproved";
    readonly type: "function";
    readonly stateMutability: "view";
    readonly inputs: readonly [{
        readonly name: "chainId";
        readonly type: "uint256";
    }, {
        readonly name: "vaultAddress";
        readonly type: "address";
    }];
    readonly outputs: readonly [{
        readonly name: "";
        readonly type: "bool";
    }];
}, {
    readonly name: "addSafeHarbor";
    readonly type: "function";
    readonly stateMutability: "nonpayable";
    readonly inputs: readonly [{
        readonly name: "chainId";
        readonly type: "uint256";
    }, {
        readonly name: "vaultAddress";
        readonly type: "address";
    }];
    readonly outputs: readonly [];
}, {
    readonly name: "getAllDestinations";
    readonly type: "function";
    readonly stateMutability: "view";
    readonly inputs: readonly [];
    readonly outputs: readonly [{
        readonly name: "chainIds";
        readonly type: "uint256[]";
    }, {
        readonly name: "vaultAddresses";
        readonly type: "address[]";
    }];
}];
export declare const KeeperRegistryABI: readonly [{
    readonly name: "KeeperRegistered";
    readonly type: "event";
    readonly inputs: readonly [{
        readonly name: "keeper";
        readonly type: "address";
        readonly indexed: true;
    }, {
        readonly name: "timestamp";
        readonly type: "uint256";
        readonly indexed: false;
    }];
}, {
    readonly name: "isKeeper";
    readonly type: "function";
    readonly stateMutability: "view";
    readonly inputs: readonly [{
        readonly name: "account";
        readonly type: "address";
    }];
    readonly outputs: readonly [{
        readonly name: "";
        readonly type: "bool";
    }];
}];
//# sourceMappingURL=index.d.ts.map