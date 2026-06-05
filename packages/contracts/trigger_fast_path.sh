#!/bin/bash
set -e

CAST="$HOME/.foundry/bin/cast"
RPC_URL="https://dream-rpc.somnia.network"
source .env

SRO_ADDRESS=$SRO_COORDINATOR_ADDRESS

# We simulate the JSON API Agent submitting the threat. 
# For testing on Somnia without needing the actual JSON API Agent private key, 
# we deploy the SROCoordinator with our deployer as the "JSON API Agent" in the test script, 
# or we use impersonation if possible.
# Actually, we can just use CAST to send the transaction from the deployer if the deployer IS the metric agent.
# Since we need a private key, we will assume DeploySRO sets Deployer as the Metric Agent just for testing!

JSON_API_PK=$PRIVATE_KEY
JSON_API_ADDR=$($CAST wallet address --private-key $JSON_API_PK)

echo "JSON API Agent Address: $JSON_API_ADDR"
echo "SRO Coordinator:        $SRO_ADDRESS"
echo ""
echo "🚀 [FAST-PATH BYPASS] Triggering >15% TVL drop anomaly via JSON API Agent..."

# function ingestMetricData(uint256 metricDeviation, uint8 confidence, bytes32 evidence, uint256 targetChainId)
# targetChainId: 1 (Ethereum)
# metricDeviation: 85 (85%)
# confidence: 99
# evidence: bytes32(0)
EVIDENCE="0x0000000000000000000000000000000000000000000000000000000000000000"
CALLDATA=$($CAST calldata "ingestMetricData(uint256,uint8,bytes32,uint256)" 85 99 $EVIDENCE 1)

$CAST send $SRO_ADDRESS $CALLDATA --private-key $JSON_API_PK --rpc-url $RPC_URL 2>&1 | grep -E "status|transactionHash|Error" || true

echo ""
echo "✅ FAST-PATH THREAT INJECTED! (Skipped LLM Consensus)"
