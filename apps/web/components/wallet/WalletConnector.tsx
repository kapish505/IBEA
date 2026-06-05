import { useAccount, useConnect, useDisconnect } from "wagmi";

export function WalletConnector() {
  const { address, isConnected } = useAccount();
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();

  if (isConnected) {
    return (
      <button 
        onClick={() => disconnect()}
        className="px-3 py-1.5 border border-border bg-base-1 hover:bg-base-2 text-text-primary text-xs font-mono rounded-sm transition-colors flex items-center gap-2"
      >
        <span className="w-1.5 h-1.5 rounded-full bg-safe" />
        {address?.slice(0, 6)}...{address?.slice(-4)}
      </button>
    );
  }

  return (
    <button 
      onClick={() => connect({ connector: connectors[0] })}
      className="px-3 py-1.5 border border-border bg-base-0 hover:bg-base-1 text-text-secondary hover:text-text-primary text-xs font-mono rounded-sm transition-colors"
    >
      CONNECT WALLET
    </button>
  );
}
