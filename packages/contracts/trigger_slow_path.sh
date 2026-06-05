#!/bin/bash
set -e

CAST="$HOME/.foundry/bin/cast"
RPC_URL="https://dream-rpc.somnia.network"
source .env

SRO_ADDRESS=$SRO_COORDINATOR_ADDRESS

SEMANTIC_PK=$PRIVATE_KEY
SEMANTIC_ADDR=$($CAST wallet address --private-key $SEMANTIC_PK)

echo "Semantic Agent Address: $SEMANTIC_ADDR"
echo "SRO Coordinator:        $SRO_ADDRESS"
echo ""
echo "🐌 [SLOW-PATH CONSENSUS] Triggering Semantic Data Ingestion via Web Parsing Agent..."

# function ingestSemanticData(bytes32 evidenceHash, uint8 confidence, uint8 computedSeverity, uint256 targetChainId)
EVIDENCE="0x0000000000000000000000000000000000000000000000000000000000000001"
# We send confidence 95, severity 4 to pass the mock validation threshold
CALLDATA=$($CAST calldata "ingestSemanticData(bytes32,uint8,uint8,uint256)" $EVIDENCE 95 4 1)

$CAST send $SRO_ADDRESS $CALLDATA --private-key $SEMANTIC_PK --rpc-url $RPC_URL 2>&1 | grep -E "status|transactionHash|Error" || true

echo ""
echo "✅ SLOW-PATH THREAT INJECTED! (Simulated LLM Inference Validator Consensus Reached)"
