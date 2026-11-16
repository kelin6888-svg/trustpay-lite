import { useState } from "react";
import { useDealCount } from "./hooks/useEscrow";
import { CONTRACT_ADDRESS } from "./config/contract";
import { explorerAddressUrl } from "./config/contract";
import { WalletButton } from "./components/WalletButton";
import { NetworkStatus } from "./components/NetworkStatus";
import { CreateEscrowForm } from "./components/CreateEscrowForm";
import { TransactionList } from "./components/TransactionList";

type Tab = "dashboard" | "create" | "list";

export default function App() {
  const [tab, setTab] = useState<Tab>("dashboard");
  const { dealCount } = useDealCount();

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <span className="logo">⚡</span>
          <span className="brand-name">TrustPay Lite</span>
          <span className="brand-sub">On-chain Escrow on Monad</span>
        </div>
        <WalletButton />
      </header>

      <NetworkStatus />

      <nav className="tabs">
        <button
          className={tab === "dashboard" ? "tab active" : "tab"}
          onClick={() => setTab("dashboard")}
        >
          首页
        </button>
        <button
          className={tab === "create" ? "tab active" : "tab"}
          onClick={() => setTab("create")}
        >
          创建交易
        </button>
        <button
          className={tab === "list" ? "tab active" : "tab"}
          onClick={() => setTab("list")}
        >
          交易列表
        </button>
      </nav>

      <main className="content">
        {tab === "dashboard" && <Dashboard goCreate={() => setTab("create")} goList={() => setTab("list")} />}
        {tab === "create" && <CreateEscrowForm />}
        {tab === "list" && <TransactionList />}
      </main>

      <footer className="footer">
        <p>教育 / 黑客松原型 · 未经专业审计 · 不承载真实商业资金</p>
        <p>
          合约地址：
          {CONTRACT_ADDRESS ? (
            <a href={explorerAddressUrl(CONTRACT_ADDRESS)} target="_blank" rel="noreferrer">
              {CONTRACT_ADDRESS}
            </a>
          ) : (
            "未部署"
          )}
          {" · "}交易总数：{dealCount.toString()}
        </p>
      </footer>
    </div>
  );
}

function Dashboard({
  goCreate,
  goList,
}: {
  goCreate: () => void;
  goList: () => void;
}) {
  return (
    <div className="dashboard">
      <section className="hero">
        <h1>去中心化交易担保支付</h1>
        <p>
          TrustPay Lite 用智能合约锁定买家资金，按预设条件完成资金释放或超时退款，
          解决陌生买卖双方的信任问题。
        </p>
        <div className="hero-actions">
          <button className="btn primary" onClick={goCreate}>
            创建一笔托管交易
          </button>
          <button className="btn ghost" onClick={goList}>
            查看交易列表
          </button>
        </div>
      </section>

      <section className="features">
        <div className="feature">
          <h3>🔒 资金托管</h3>
          <p>买家资金锁定在合约中，双方都无法绕过合约直接提取。</p>
        </div>
        <div className="feature">
          <h3>✅ 确认释放</h3>
          <p>买家确认交付后一键释放，资金自动转给卖家。</p>
        </div>
        <div className="feature">
          <h3>⏰ 超时退款</h3>
          <p>超过截止时间未确认，买家可申请全额退款。</p>
        </div>
      </section>

      <section className="how-it-works">
        <h2>如何工作</h2>
        <ol>
          <li>买家连接钱包，填写卖家地址、金额与截止时间</li>
          <li>调用合约，MON 被锁定在智能合约中</li>
          <li>买家确认交付 → 释放资金给卖家</li>
          <li>或超时后 → 买家申请退款，资金退回</li>
        </ol>
      </section>
    </div>
  );
}
