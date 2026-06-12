import { spawn } from 'child_process';

async function main() {
  try {
    const rpcUrl = process.env.PONDER_RPC_URL_50312 || "https://dream-rpc.somnia.network";
    console.log(`[indexer] Fetching latest block from ${rpcUrl}...`);
    
    const res = await fetch(rpcUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'eth_blockNumber', params: [] })
    });
    const json = await res.json();
    const latestBlock = parseInt(json.result, 16);
    const startBlock = latestBlock - 1000;
    
    console.log(`[indexer] ✅ Dynamically set startBlock to ${startBlock} (latest - 1000)`);
    process.env.PONDER_START_BLOCK = startBlock.toString();
  } catch (err) {
    console.warn(`[indexer] ⚠️ Failed to fetch dynamic start block, falling back to default: ${err.message}`);
  }

  const child = spawn('npx', ['ponder', 'dev'], { 
    stdio: 'inherit', 
    env: process.env 
  });
  
  child.on('exit', code => process.exit(code || 0));
}

main();
