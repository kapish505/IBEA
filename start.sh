#!/bin/bash
echo "Fetching latest block from Somnia..."
LATEST_HEX=$(curl -s -X POST -H 'Content-Type: application/json' --data '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' https://dream-rpc.somnia.network | grep -o '"result":"[^"]*' | cut -d'"' -f4)
LATEST_DEC=$(printf "%d\n" $LATEST_HEX)

echo "Latest block is $LATEST_DEC"

echo "Updating ponder.config.ts..."
# On macOS, sed -i requires an empty string argument for the extension
sed -i '' "s/startBlock: [0-9]*/startBlock: $LATEST_DEC/g" packages/indexer/ponder.config.ts

echo "Clearing Ponder cache..."
killall node 2>/dev/null
rm -rf packages/indexer/.ponder

echo "Starting dev server..."
pnpm dev
