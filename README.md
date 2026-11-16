# TrustPay Lite

> A Simple On-chain Escrow Payment dApp on Monad — 基于 Monad 的去中心化交易担保支付应用

TrustPay Lite 用 Solidity 智能合约在 Monad 区块链上实现交易资金托管、资金释放与超时退款，解决陌生买卖双方的信任问题。

> ⚠️ **免责声明**：本项目为教育与黑客松原型，**未经专业审计，不承载真实商业资金**。

## 技术架构

| 模块 | 技术 |
|---|---|
| 智能合约 | Solidity 0.8.31（EVM 目标 osaka）|
| 合约开发环境 | Hardhat 3 |
| 安全组件 | OpenZeppelin（ReentrancyGuard）|
| 前端 | React + TypeScript + Vite |
| 钱包交互 | Wagmi + Viem |
| 网络 | Monad Testnet（Chain ID 10143，原生币 MON）|

## 核心业务

- **创建交易**：买家填写卖家地址、金额、描述、截止时间，随交易存入 MON。
- **资金托管**：资金锁定在合约中，双方无法绕过合约直接提取。
- **释放资金**：买家确认交付后调用 `release`，资金转给卖家。
- **超时退款**：超过截止时间后，买家调用 `refund`，资金退回。

交易状态机：`Funded → Released` 或 `Funded → Refunded`（二选一，互斥）。

## 环境要求

- Node.js ≥ 22.13.0（实测 22.22.2）
- npm
- 浏览器 EVM 钱包（MetaMask 等）

## 安装与启动

```bash
# 安装合约依赖
npm install

# 编译合约
npm run compile

# 运行测试（16 项）
npm test

# 启动前端
cd frontend
npm install
npm run dev
```

前端默认运行于 `http://localhost:5173`。

## 测试方法

```bash
# 全部测试（含重入攻击测试）
npx hardhat test

# 端到端验收演示（本地网络）
npx hardhat run scripts/e2e-demo.ts
```

## Testnet 部署说明

1. 复制 `.env.example` 为 `.env`，填入测试钱包私钥（`.env` 已在 `.gitignore` 中）。
2. 领取测试币：访问 Monad Testnet 水龙头 `https://testnet.monad.xyz`。
3. 部署：

```bash
npx hardhat ignition deploy ignition/modules/TrustPayEscrow.ts --network monadTestnet
```

4. 将部署返回的合约地址填入 `frontend/.env`：

```
VITE_CONTRACT_ADDRESS=0x...
```

5. 重新构建前端即可与链上合约交互。

## 钱包连接方法

1. 安装 MetaMask 等 EVM 钱包。
2. 添加 Monad Testnet 网络（Chain ID `10143`，RPC `https://testnet-rpc.monad.xyz`）。
3. 打开前端，点击「连接钱包」，切换到 Monad Testnet 后即可使用。

## 项目结构

```
trustpay-lite/
├── contracts/           # 智能合约（TrustPayEscrow.sol、ReentrancyAttack.sol）
├── test/                # 自动化测试
├── ignition/            # 部署模块
├── scripts/             # 端到端演示脚本
├── frontend/            # React 前端
└── *.md                 # 项目文档
```

## 文档索引

- `PRD.md` — 产品需求文档
- `ARCHITECTURE.md` — 系统架构设计
- `SECURITY_REVIEW.md` — 安全审查报告
- `TEST_REPORT.md` — 测试报告
- `DEMO_SCRIPT.md` — 演示脚本与答辩 FAQ
- `PROJECT_STATUS.md` — 项目状态追踪
