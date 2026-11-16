import { useMemo, useState } from "react";
import { useAccount, useWaitForTransactionReceipt } from "wagmi";
import { useDealCount, useEscrow, useRelease, useRefund } from "../hooks/useEscrow";
import { formatMon, formatTime, shortAddress, StatusMap } from "../lib/utils";
import { explorerAddressUrl, explorerTxUrl } from "../config/contract";

/** 交易列表页：展示所有交易 */
export function TransactionList() {
  const { dealCount, isLoading } = useDealCount();
  const count = Number(dealCount);
  const ids = useMemo(
    () => (count > 0 ? Array.from({ length: count }, (_, i) => BigInt(i)) : []),
    [count]
  );

  if (isLoading) return <div className="empty">加载中…</div>;
  if (count === 0) return <div className="empty">暂无交易，快去创建第一笔吧</div>;

  return (
    <div className="tx-list">
      <div className="tx-header">
        <span>ID</span>
        <span>买家</span>
        <span>卖家</span>
        <span>金额</span>
        <span>状态</span>
        <span>截止时间</span>
      </div>
      {ids.map((id) => (
        <EscrowRow key={id.toString()} id={id} />
      ))}
    </div>
  );
}

function EscrowRow({ id }: { id: bigint }) {
  const { escrow } = useEscrow(id);
  const [open, setOpen] = useState(false);

  if (!escrow) return null;
  const status = StatusMap[escrow.status];

  return (
    <>
      <div className="tx-row" onClick={() => setOpen(!open)}>
        <span className="tx-id">#{escrow.id.toString()}</span>
        <a
          href={explorerAddressUrl(escrow.buyer)}
          target="_blank"
          rel="noreferrer"
          onClick={(e) => e.stopPropagation()}
        >
          {shortAddress(escrow.buyer)}
        </a>
        <a
          href={explorerAddressUrl(escrow.seller)}
          target="_blank"
          rel="noreferrer"
          onClick={(e) => e.stopPropagation()}
        >
          {shortAddress(escrow.seller)}
        </a>
        <span className="amount">{formatMon(escrow.amount)} MON</span>
        <span className="status-badge" style={{ backgroundColor: status.color }}>
          {status.label}
        </span>
        <span className="deadline">{formatTime(escrow.deadline)}</span>
      </div>
      {open && <EscrowDetail id={id} escrow={escrow} />}
    </>
  );
}

function EscrowDetail({ id, escrow }: { id: bigint; escrow: any }) {
  const { address } = useAccount();
  const { release, isPending: releasing } = useRelease();
  const { refund, isPending: refunding } = useRefund();
  const [txHash, setTxHash] = useState<`0x${string}` | null>(null);
  const [error, setError] = useState("");

  const isBuyer = address?.toLowerCase() === escrow.buyer.toLowerCase();
  const isExpired = BigInt(Math.floor(Date.now() / 1000)) >= escrow.deadline;
  const status = StatusMap[escrow.status];

  const receipt = useWaitForTransactionReceipt({ hash: txHash ?? undefined });

  const doRelease = async () => {
    setError("");
    try {
      const h = await release(id);
      setTxHash(h);
    } catch (e: any) {
      setError(e?.message?.slice(0, 200) ?? String(e));
    }
  };

  const doRefund = async () => {
    setError("");
    try {
      const h = await refund(id);
      setTxHash(h);
    } catch (e: any) {
      setError(e?.message?.slice(0, 200) ?? String(e));
    }
  };

  return (
    <div className="tx-detail">
      <p className="desc">描述：{escrow.description || "（无）"}</p>
      <p className="desc">
        当前状态：
        <span style={{ color: status.color }}>{status.label}</span>
      </p>

      {escrow.status === 0 && (
        <div className="actions">
          {isBuyer && (
            <button className="btn primary" onClick={doRelease} disabled={releasing}>
              {releasing ? "处理中…" : "释放资金给卖家"}
            </button>
          )}
          {isBuyer && isExpired && (
            <button className="btn danger" onClick={doRefund} disabled={refunding}>
              {refunding ? "处理中…" : "超时退款"}
            </button>
          )}
          {!isBuyer && (
            <p className="hint">只有买家可以执行释放或退款操作</p>
          )}
        </div>
      )}

      {error && <p className="error">{error}</p>}

      {txHash && (
        <div className="tx-result">
          {receipt.isLoading && <p>交易确认中…</p>}
          {receipt.isSuccess && <p className="ok">✓ 交易成功</p>}
          <a href={explorerTxUrl(txHash)} target="_blank" rel="noreferrer">
            在区块浏览器查看交易 →
          </a>
        </div>
      )}
    </div>
  );
}
