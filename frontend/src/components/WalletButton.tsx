import { useAccount, useBalance, useConnect, useDisconnect, useSwitchChain } from "wagmi";
import { monadTestnet } from "../config/chains";
import { formatMon, shortAddress } from "../lib/utils";

/** 钱包连接按钮：连接、显示余额、切换网络、断开 */
export function WalletButton() {
  const { address, isConnected, chainId } = useAccount();
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();
  const { switchChain } = useSwitchChain();
  const { data: balance } = useBalance({ address });

  if (!isConnected || !address) {
    return (
      <button
        className="wallet-btn"
        onClick={() => connect({ connector: connectors[0] })}
      >
        连接钱包
      </button>
    );
  }

  const wrongNetwork = chainId !== monadTestnet.id;

  return (
    <div className="wallet-connected">
      {balance && (
        <span className="balance">
          {formatMon(balance.value)} {balance.symbol}
        </span>
      )}
      <span className="address">{shortAddress(address)}</span>
      {wrongNetwork && (
        <button
          className="wallet-btn switch"
          onClick={() => switchChain({ chainId: monadTestnet.id })}
        >
          切换到 Monad Testnet
        </button>
      )}
      <button className="wallet-btn danger" onClick={() => disconnect()}>
        断开
      </button>
    </div>
  );
}
