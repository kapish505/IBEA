#!/bin/bash
set -e

CAST="$HOME/.foundry/bin/cast"
RPC_URL="https://dream-rpc.somnia.network"
source .env

GATE_ADDRESS=$ESCALATION_GATE_ADDRESS

# Generate a second source wallet
SOURCE2_PK="0x"$(openssl rand -hex 32)
SOURCE2_ADDR=$($CAST wallet address --private-key $SOURCE2_PK)
DEPLOYER_ADDR=$($CAST wallet address --private-key $PRIVATE_KEY)

echo "Deployer Address: $DEPLOYER_ADDR"
echo "Source 2 Address: $SOURCE2_ADDR"
echo "Gate Address:     $GATE_ADDRESS"

echo ""
echo "1. Registering sources..."
$CAST send $GATE_ADDRESS "registerSource(address,uint256)" $DEPLOYER_ADDR 10000 --private-key $PRIVATE_KEY --rpc-url $RPC_URL 2>&1 | grep -E "status|transactionHash|Error" || true
$CAST send $GATE_ADDRESS "registerSource(address,uint256)" $SOURCE2_ADDR 10000 --private-key $PRIVATE_KEY --rpc-url $RPC_URL 2>&1 | grep -E "status|transactionHash|Error" || true

echo ""
echo "2. Funding Source 2 for gas..."
$CAST send $SOURCE2_ADDR --value 1ether --private-key $PRIVATE_KEY --rpc-url $RPC_URL 2>&1 | grep -E "status|transactionHash" || true

echo ""
echo "3. Fetching current epoch..."
EPOCH=$($CAST call $GATE_ADDRESS "currentEpoch()(uint256)" --rpc-url $RPC_URL)
# Strip any whitespace/brackets from cast output
EPOCH=$(echo $EPOCH | sed 's/\[.*\]//g' | tr -d ' ')
echo "Current Epoch: $EPOCH"

echo ""
echo "4. Submitting Threat from Deployer (Source 1)..."
# Manually encode: submitThreat(uint256, uint256[5])
# Function selector for submitThreat(uint256,uint256[5])
CALLDATA=$($CAST calldata "submitThreat(uint256,uint256[5])" $EPOCH "[10000,10000,10000,10000,10000]")
$CAST send $GATE_ADDRESS $CALLDATA --private-key $PRIVATE_KEY --rpc-url $RPC_URL 2>&1 | grep -E "status|transactionHash|Error" || true

echo ""
echo "5. Submitting Threat from Source 2..."
# Re-fetch epoch in case it changed
EPOCH2=$($CAST call $GATE_ADDRESS "currentEpoch()(uint256)" --rpc-url $RPC_URL)
EPOCH2=$(echo $EPOCH2 | sed 's/\[.*\]//g' | tr -d ' ')
echo "Current Epoch: $EPOCH2"

CALLDATA2=$($CAST calldata "submitThreat(uint256,uint256[5])" $EPOCH2 "[10000,10000,10000,10000,10000]")
$CAST send $GATE_ADDRESS $CALLDATA2 --private-key $SOURCE2_PK --rpc-url $RPC_URL 2>&1 | grep -E "status|transactionHash|Error" || true

echo ""
echo "✅ CRITICAL THREAT INJECTED ON-CHAIN!"
