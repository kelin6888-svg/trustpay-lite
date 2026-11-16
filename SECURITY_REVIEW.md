# TrustPay Lite — 安全审查报告（SECURITY_REVIEW）

> 版本：v1.0　|　审查日期：2026-11-16　|　范围：TrustPayEscrow.sol（MVP）

## 0. 重要声明

本报告由 AI 开发负责人按安全审计师角色进行内部自检，**非第三方专业审计**。
本项目为教育与黑客松原型，**不承载真实商业资金**。上线生产环境前必须经过专业审计机构审核。

## 1. 审查结论摘要

| 风险类别 | 结论 | 说明 |
|---|---|---|
| 重入攻击 | ✅ 已防护 | ReentrancyGuard + CEI 模式，实测恶意合约无法重复提款 |
| 权限控制 | ✅ 已防护 | release/refund 仅买家可调用 |
| 重复提款 | ✅ 已防护 | 状态机 + onlyFunded 修饰器 |
| 零地址/零金额 | ✅ 已防护 | 创建时校验 |
| 时间边界 | ✅ 已防护 | deadline 校验 + refund 时间检查 |
| 整数溢出 | ✅ 无风险 | Solidity 0.8 内置溢出检查 |

**未发现未解决的关键安全问题。**

## 2. 逐项测试结果（均实测通过）

| # | 测试项目 | 预期 | 实测结果 |
|---|---|---|---|
| 1 | 正常创建交易 | 成功 | ✅ PASS |
| 2 | 金额为零 | 拒绝 | ✅ PASS（"amount must be greater than 0"）|
| 3 | 卖家地址为零地址 | 拒绝 | ✅ PASS（"seller is zero address"）|
| 4 | 卖家为买家自己 | 拒绝 | ✅ PASS（"seller cannot be buyer"）|
| 5 | 截止时间在过去 | 拒绝 | ✅ PASS（"deadline must be in the future"）|
| 6 | 买家创建并存款 | 成功 | ✅ PASS |
| 7 | 非买家释放资金 | 拒绝 | ✅ PASS（"only buyer can release"）|
| 8 | 买家正常释放资金 | 成功 | ✅ PASS（卖家收到正确金额）|
| 9 | 释放后再次释放 | 拒绝 | ✅ PASS（"escrow not funded"）|
| 10 | 未超时申请退款 | 拒绝 | ✅ PASS（"deadline not reached"）|
| 11 | 超时后买家退款 | 成功 | ✅ PASS（合约余额归零）|
| 12 | 非买家申请退款 | 拒绝 | ✅ PASS（"only buyer can refund"）|
| 13 | 退款后再次退款 | 拒绝 | ✅ PASS |
| 14 | 退款后再次释放 | 拒绝 | ✅ PASS |
| 15 | 卖家收到资金 | 金额正确 | ✅ PASS |
| 16 | 重入攻击 | 资金只被提取一次 | ✅ PASS |
| 17 | 查询不存在交易 | 拒绝 | ✅ PASS |
| 18 | 合约余额与记账一致 | 一致 | ✅ PASS |

## 3. 关键安全机制说明

### 3.1 Checks-Effects-Interactions（CEI）

```solidity
// Checks：先校验
require(msg.sender == escrow.buyer, "...");
// Effects：再改状态
escrow.status = Status.Released;
// Interactions：最后转账
(bool success,) = escrow.seller.call{value: escrow.amount}("");
```

先改状态再转账，即使转账触发回调重入，状态已非 `Funded`，`onlyFunded` 修饰器会拦截。

### 3.2 ReentrancyGuard

`release`/`refund` 均加 `nonReentrant`，双保险。实测通过 `ReentrancyAttack.sol` 验证：
恶意卖家合约在 `receive()` 中递归调用 `release`，最终资金只被提取一次，合约余额归零，攻击合约余额恰等于单笔金额。

### 3.3 权限与状态机

- `onlyFunded(_id)` 修饰器：要求交易存在且状态为 `Funded`，从根源杜绝「释放后再次释放」「退款后再次释放」。
- 释放/退款均 `require(msg.sender == escrow.buyer)`，权限收敛到合约侧。

### 3.4 余额一致性

每笔托管金额独立记录于 `Escrow.amount`，转账金额取 `escrow.amount`（而非 `address(this).balance`），
避免多笔交易共用合约余额导致的账实不符。

## 4. 已知局限（MVP 范围内可接受）

1. **无争议仲裁**：买卖双方纠纷只能靠线下协商 + 超时退款兜底（MVP 明确排除）。
2. **仅支持原生 MON**：不支持 ERC-20（MVP 明确排除）。
3. **description 存储成本**：长描述会增加 gas，前端已建议简短填写。
4. **`call` 转账的 gas 限制**：`call` 默认转发全部 gas，恶意接收方可在回调中消耗 gas，但非重入风险（无状态破坏）。

## 5. 后续改进建议（非 MVP 范围）

- 引入 `pull over push` 模式（买家主动 withdraw），进一步降低转账回调风险。
- 增加「卖家确认」状态，实现双向确认。
- 使用 Slither / Mythril 等静态分析工具做补充扫描。
- 请第三方专业审计机构出具正式审计报告。
