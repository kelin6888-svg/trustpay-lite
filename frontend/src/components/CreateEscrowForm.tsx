import { useState } from "react";
import { isAddress } from "viem";
import { useAccount, useWaitForTransactionReceipt } from "wagmi";
import { useCreateEscrow } from "../hooks/useEscrow";
import { explorerTxUrl } from "../config/contract";

/** 创建交易表单 */
export function CreateEscrowForm() {
  const { isConnected } = useAccount();
  const { createEscrow, isPending } = useCreateEscrow();

  const [seller, setSeller] = useState("");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [deadlineDays, setDeadlineDays] = useState("7");
  const [txHash, setTxHash] = useState<`0x${string}` | null>(null);
  const [error, setError] = useState("");

  const receipt = useWaitForTransactionReceipt({ hash: txHash ?? undefined });

  if (!isConnected) {
    return <div className="empty">请先连接钱包，再创建交易</div>;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // 前端基础校验（最终安全校验由合约保证）
    if (!isAddress(seller)) {
      setError("卖家地址格式不正确");
      return;
    }
    const amountNum = Number(amount);
    if (!amount || amountNum <= 0) {
      setError("金额必须大于 0");
      return;
    }

    // 截止时间 = 当前时间 + N 天
    const deadline = BigInt(
      Math.floor(Date.now() / 1000) + Number(deadlineDays) * 86400
    );

    try {
      const hash = await createEscrow(seller, amount, deadline, description);
      setTxHash(hash);
      setSeller("");
      setAmount("");
      setDescription("");
    } catch (err: any) {
      setError(err?.message?.slice(0, 200) ?? String(err));
    }
  };

  return (
    <form className="create-form" onSubmit={handleSubmit}>
      <h2>创建托管交易</h2>

      <label>
        卖家钱包地址
        <input
          type="text"
          placeholder="0x..."
          value={seller}
          onChange={(e) => setSeller(e.target.value)}
          required
        />
      </label>

      <label>
        交易金额（MON）
        <input
          type="number"
          step="0.000001"
          min="0"
          placeholder="例如 1.5"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          required
        />
      </label>

      <label>
        交易描述
        <input
          type="text"
          placeholder="例如：购买一台二手笔记本电脑"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </label>

      <label>
        托管期限（天）
        <select value={deadlineDays} onChange={(e) => setDeadlineDays(e.target.value)}>
          <option value="1">1 天</option>
          <option value="3">3 天</option>
          <option value="7">7 天</option>
          <option value="14">14 天</option>
          <option value="30">30 天</option>
        </select>
      </label>

      <button className="btn primary" type="submit" disabled={isPending}>
        {isPending ? "交易提交中…" : "创建交易并存入 MON"}
      </button>

      {error && <p className="error">{error}</p>}

      {txHash && (
        <div className="tx-result">
          {receipt.isLoading && <p>交易确认中…</p>}
          {receipt.isSuccess && <p className="ok">✓ 交易创建成功</p>}
          <a href={explorerTxUrl(txHash)} target="_blank" rel="noreferrer">
            在区块浏览器查看交易 →
          </a>
        </div>
      )}
    </form>
  );
}
