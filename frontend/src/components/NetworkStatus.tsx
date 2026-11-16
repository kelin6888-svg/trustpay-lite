import { useAccount } from "wagmi";
import { monadTestnet } from "../config/chains";

/** 网络状态提示条：当前网络错误时高亮警告 */
export function NetworkStatus() {
  const { isConnected, chainId } = useAccount();

  if (!isConnected) {
    return (
      <div className="network-banner neutral">
        未连接钱包 — 请连接 MetaMask 等 EVM 钱包开始使用
      </div>
    );
  }

  if (chainId !== monadTestnet.id) {
    return (
      <div className="network-banner warn">
        ⚠️ 当前网络不是 Monad Testnet（Chain ID 10143），请切换网络
      </div>
    );
  }

  return (
    <div className="network-banner ok">
      ✓ 已连接 Monad Testnet（Chain ID 10143）
    </div>
  );
}
