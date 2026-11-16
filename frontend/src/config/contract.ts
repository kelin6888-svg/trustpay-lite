import abi from "./TrustPayEscrow.json";

/**
 * 合约地址配置
 * 部署到 Monad Testnet 后，将真实地址填入 CONTRACT_ADDRESS。
 * 部署前保留占位值，前端会提示未部署。
 */
export const CONTRACT_ADDRESS =
  (import.meta.env.VITE_CONTRACT_ADDRESS as string) || "";

export const CONTRACT_ABI = abi.abi;

/** 区块浏览器交易链接 */
export function explorerTxUrl(txHash: string): string {
  return `https://testnet.monadscan.com/tx/${txHash}`;
}

/** 区块浏览器地址链接 */
export function explorerAddressUrl(address: string): string {
  return `https://testnet.monadscan.com/address/${address}`;
}
