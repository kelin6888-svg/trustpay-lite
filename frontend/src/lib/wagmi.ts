import { http, createConfig } from "wagmi";
import { injected } from "wagmi/connectors";
import { monadTestnet } from "../config/chains";

/**
 * Wagmi 配置：声明支持的链、RPC 传输与连接器。
 * 使用 injected 连接器（MetaMask 等浏览器注入钱包）。
 */
export const wagmiConfig = createConfig({
  chains: [monadTestnet],
  connectors: [injected()],
  transports: {
    [monadTestnet.id]: http(),
  },
});
