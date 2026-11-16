import { network } from "hardhat";
import { parseEther, formatUnits } from "viem";

/**
 * 端到端验收演示脚本
 * 在本地 Hardhat 网络完整走一遍两条链路：
 *  链路 A：创建交易 → 资金锁定 → 买家释放 → 卖家收款
 *  链路 B：创建交易 → 资金锁定 → 超时 → 买家退款
 * 每步输出真实交易哈希与链上状态。
 */
async function main() {
  const { viem, networkHelpers } = await network.getOrCreate();
  const [buyer, seller] = await viem.getWalletClients();
  const publicClient = await viem.getPublicClient();

  console.log("==============================================");
  console.log(" TrustPay Lite — 端到端验收（本地网络）");
  console.log("==============================================");
  console.log(`买家: ${buyer.account.address}`);
  console.log(`卖家: ${seller.account.address}`);

  // 部署合约
  const escrow = await viem.deployContract("TrustPayEscrow");
  console.log(`\n[部署] 合约地址: ${escrow.address}`);
  console.log(`  部署交易哈希: ${escrow.deploymentTransaction?.hash ?? "(in-process)"}`);

  const now = (await publicClient.getBlock()).timestamp;
  const deadline = now + 3600n;

  // ───────── 链路 A：创建 → 托管 → 释放 ─────────
  console.log("\n──────── 链路 A：正常交易 ────────");
  const amountA = parseEther("1.5");
  const txCreate = await escrow.write.createEscrow(
    [seller.account.address, deadline, "购买一台二手 MacBook"],
    { account: buyer.account, value: amountA }
  );
  console.log(`[创建] 交易哈希: ${txCreate}`);
  console.log(`[创建] 金额: ${formatUnits(amountA, 18)} MON`);

  let [, , amt, desc, , status] = await escrow.read.getEscrow([0n]);
  console.log(`[锁定] 状态: Funded(${status})，描述: ${desc}，托管金额: ${formatUnits(amt, 18)} MON`);

  let contractBalance = await publicClient.getBalance({ address: escrow.address });
  console.log(`[锁定] 合约余额: ${formatUnits(contractBalance, 18)} MON（资金已锁定在合约）`);

  const txRelease = await escrow.write.release([0n], { account: buyer.account });
  console.log(`[释放] 交易哈希: ${txRelease}`);

  status = (await escrow.read.getEscrow([0n]))[5];
  console.log(`[释放] 状态: Released(${status})`);

  contractBalance = await publicClient.getBalance({ address: escrow.address });
  console.log(`[释放] 合约余额: ${formatUnits(contractBalance, 18)} MON（归零）`);

  // ───────── 链路 B：创建 → 托管 → 超时退款 ─────────
  console.log("\n──────── 链路 B：超时退款 ────────");
  const amountB = parseEther("0.8");
  // 重新读取当前链上时间，确保截止时间在未来
  const nowB = (await publicClient.getBlock()).timestamp;
  const shortDeadline = nowB + 2n; // 2 秒后到期
  const txCreateB = await escrow.write.createEscrow(
    [seller.account.address, shortDeadline, "购买设计服务"],
    { account: buyer.account, value: amountB }
  );
  console.log(`[创建] 交易哈希: ${txCreateB}`);

  // 推进时间到超时
  await networkHelpers.time.setNextBlockTimestamp(shortDeadline + 1n);
  await networkHelpers.mine(1);

  const buyerBalanceBefore = await publicClient.getBalance({ address: buyer.account.address });
  const txRefund = await escrow.write.refund([1n], { account: buyer.account });
  console.log(`[退款] 交易哈希: ${txRefund}`);

  status = (await escrow.read.getEscrow([1n]))[5];
  console.log(`[退款] 状态: Refunded(${status})`);

  const buyerBalanceAfter = await publicClient.getBalance({ address: buyer.account.address });
  const refunded = buyerBalanceAfter - buyerBalanceBefore;
  console.log(`[退款] 买家余额变化: +${formatUnits(refunded, 18)} MON（扣除 gas 后约等于退款金额）`);

  contractBalance = await publicClient.getBalance({ address: escrow.address });
  console.log(`[退款] 合约余额: ${formatUnits(contractBalance, 18)} MON（归零）`);

  console.log("\n==============================================");
  console.log(" 端到端验收完成：两条链路均成功");
  console.log("==============================================");
}

main().catch((e) => {
  console.error("端到端验收失败：", e);
  process.exitCode = 1;
});
