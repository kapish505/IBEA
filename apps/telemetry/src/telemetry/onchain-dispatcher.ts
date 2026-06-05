import { createWalletClient, http, publicActions, type Address, encodeFunctionData } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { config } from '../config.js';

const somniaChain = {
  id: config.SOMNIA_CHAIN_ID,
  name: 'Somnia Shannon',
  nativeCurrency: { name: 'STT', symbol: 'STT', decimals: 18 },
  rpcUrls: {
    default: {
      http: [config.SOMNIA_RPC_URL],
      webSocket: [config.SOMNIA_WSS_URL],
    },
  },
} as const;

// The ABI for the updated SROCoordinator (uses AgentManager.createTask internally)
const SRO_COORDINATOR_ABI = [
  {
    type: 'function',
    name: 'requestMetricData',
    inputs: [
      { name: 'taskData', type: 'string' },
      { name: 'evidenceHash', type: 'bytes32' },
      { name: 'targetChainId', type: 'uint256' }
    ],
    outputs: [],
    stateMutability: 'payable',
  },
  {
    type: 'function',
    name: 'requestWebsiteParse',
    inputs: [
      { name: 'taskData', type: 'string' },
      { name: 'evidenceHash', type: 'bytes32' },
      { name: 'targetChainId', type: 'uint256' }
    ],
    outputs: [],
    stateMutability: 'payable',
  },
  {
    type: 'function',
    name: 'requestLLMInference',
    inputs: [
      { name: 'taskData', type: 'string' },
      { name: 'evidenceHash', type: 'bytes32' },
      { name: 'targetChainId', type: 'uint256' }
    ],
    outputs: [],
    stateMutability: 'payable',
  },
] as const;

// Build ABI-encoded task data for the JSON API agent's fetchString method
function buildFetchStringTaskData(url: string, selector: string): string {
  return encodeFunctionData({
    abi: [{
      type: 'function',
      name: 'fetchString',
      inputs: [
        { name: 'url', type: 'string' },
        { name: 'selector', type: 'string' },
      ],
      outputs: [{ name: 'result', type: 'string' }],
      stateMutability: 'view',
    }],
    functionName: 'fetchString',
    args: [url, selector],
  });
}

// Build ABI-encoded task data for the Website Parse agent's ExtractString method
function buildExtractStringTaskData(url: string, key: string, description: string, prompt: string): string {
  return encodeFunctionData({
    abi: [{
      type: 'function',
      name: 'ExtractString',
      inputs: [
        { name: 'key', type: 'string' },
        { name: 'description', type: 'string' },
        { name: 'options', type: 'string[]' },
        { name: 'prompt', type: 'string' },
        { name: 'url', type: 'string' },
        { name: 'resolveUrl', type: 'bool' },
        { name: 'numPages', type: 'uint8' },
        { name: 'confidenceThreshold', type: 'uint8' },
      ],
      outputs: [{ name: 'output', type: 'string' }],
      stateMutability: 'view',
    }],
    functionName: 'ExtractString',
    args: [key, description, [], prompt, url, true, 1, 0],
  });
}

// Build ABI-encoded task data for the LLM Inference agent's inferString method
function buildInferStringTaskData(prompt: string, system: string): string {
  return encodeFunctionData({
    abi: [{
      type: 'function',
      name: 'inferString',
      inputs: [
        { name: 'prompt', type: 'string' },
        { name: 'system', type: 'string' },
        { name: 'chainOfThought', type: 'bool' },
        { name: 'allowedValues', type: 'string[]' },
      ],
      outputs: [{ name: 'response', type: 'string' }],
      stateMutability: 'view',
    }],
    functionName: 'inferString',
    args: [prompt, system, false, []],
  });
}

export async function submitMetricRequest(url: string, targetChainId: number = 1) {
  if (!config.RELAYER_PRIVATE_KEY) return;
  const account = privateKeyToAccount(config.RELAYER_PRIVATE_KEY as `0x${string}`);
  const client = createWalletClient({
    account,
    chain: somniaChain,
    transport: http(config.SOMNIA_RPC_URL),
  }).extend(publicActions);

  const evidenceHash = '0x0000000000000000000000000000000000000000000000000000000000000000';

  // Build task data: fetchString(url, selector)
  const taskData = buildFetchStringTaskData(url, '$.data');

  // JSON API agent requires 0.12 STT deposit, send 0.15 STT to be safe
  const deposit = BigInt(150000000000000000);

  const { request } = await client.simulateContract({
    address: config.ESCALATION_GATE_ADDRESS as Address,
    abi: SRO_COORDINATOR_ABI,
    functionName: 'requestMetricData',
    args: [taskData, evidenceHash as `0x${string}`, BigInt(targetChainId)],
    value: deposit
  });

  const hash = await client.writeContract(request);
  console.log(`[onchain-dispatcher] Submitted Metric task to Somnia AgentManager! Tx: ${hash}`);
  return hash;
}

export async function submitWebsiteParseRequest(url: string, targetChainId: number = 1) {
  if (!config.RELAYER_PRIVATE_KEY) return;
  const account = privateKeyToAccount(config.RELAYER_PRIVATE_KEY as `0x${string}`);
  const client = createWalletClient({
    account,
    chain: somniaChain,
    transport: http(config.SOMNIA_RPC_URL),
  }).extend(publicActions);

  const evidenceHash = '0x0000000000000000000000000000000000000000000000000000000000000000';

  // Build task data: ExtractString(key, description, options, prompt, url, ...)
  const taskData = buildExtractStringTaskData(
    url,
    'threat_analysis',
    'Extract and describe any security threat or anomaly found',
    'Analyze this page for DeFi security threats, exploits, or suspicious activity'
  );

  // Website Parse agent requires 0.33 STT deposit, send 0.4 STT to be safe
  const deposit = BigInt(400000000000000000);

  const { request } = await client.simulateContract({
    address: config.ESCALATION_GATE_ADDRESS as Address,
    abi: SRO_COORDINATOR_ABI,
    functionName: 'requestWebsiteParse',
    args: [taskData, evidenceHash as `0x${string}`, BigInt(targetChainId)],
    value: deposit
  });

  const hash = await client.writeContract(request);
  console.log(`[onchain-dispatcher] Submitted Website Parse task to Somnia AgentManager! Tx: ${hash}`);
  return hash;
}

export async function submitLLMInferenceRequest(prompt: string, targetChainId: number = 1) {
  if (!config.RELAYER_PRIVATE_KEY) return;
  const account = privateKeyToAccount(config.RELAYER_PRIVATE_KEY as `0x${string}`);
  const client = createWalletClient({
    account,
    chain: somniaChain,
    transport: http(config.SOMNIA_RPC_URL),
  }).extend(publicActions);

  const evidenceHash = '0x0000000000000000000000000000000000000000000000000000000000000000';

  // Build task data: inferString(prompt, system, chainOfThought, allowedValues)
  const taskData = buildInferStringTaskData(
    prompt,
    'You are a DeFi security analyst. Evaluate the severity of the given threat on a scale of 0-4 (0=none, 1=low, 2=medium, 3=high, 4=critical). Respond with just the number.'
  );

  // LLM Inference agent requires 0.24 STT deposit, send 0.3 STT to be safe
  const deposit = BigInt(300000000000000000);

  const { request } = await client.simulateContract({
    address: config.ESCALATION_GATE_ADDRESS as Address,
    abi: SRO_COORDINATOR_ABI,
    functionName: 'requestLLMInference',
    args: [taskData, evidenceHash as `0x${string}`, BigInt(targetChainId)],
    value: deposit
  });

  const hash = await client.writeContract(request);
  console.log(`[onchain-dispatcher] Submitted LLM Inference task to Somnia AgentManager! Tx: ${hash}`);
  return hash;
}
