import { formatUnits } from "viem";

/** 交易状态枚举（与合约一致：0=Funded, 1=Released, 2=Refunded） */
export const StatusMap: Record<number, { label: string; color: string }> = {
  0: { label: "已托管", color: "#2563eb" },
  1: { label: "已释放", color: "#16a34a" },
  2: { label: "已退款", color: "#dc2626" },
};

/** 将 wei 格式化为 MON 字符串（保留合理小数位） */
export function formatMon(wei: bigint): string {
  const value = formatUnits(wei, 18);
  const num = Number(value);
  return num.toLocaleString("en-US", { maximumFractionDigits: 6 });
}

/** 格式化 Unix 时间戳（秒）为本地时间字符串 */
export function formatTime(timestamp: bigint): string {
  return new Date(Number(timestamp) * 1000).toLocaleString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** 缩短地址显示 */
export function shortAddress(addr: string): string {
  if (!addr || addr.length < 10) return addr;
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}
