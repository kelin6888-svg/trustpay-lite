import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { network } from "hardhat";
import { parseEther } from "viem";

async function fixture() {
  const { viem, networkHelpers } = await network.getOrCreate();
  const [buyer, , attacker] = await viem.getWalletClients();
  const publicClient = await viem.getPublicClient();
  const escrow = await viem.deployContract("TrustPayEscrow");
  return { viem, networkHelpers, escrow, buyer, attacker, publicClient };
}

async function chainNow(publicClient: any): Promise<bigint> {
  const block = await publicClient.getBlock();
  return block.timestamp;
}

describe("重入攻击防护", function () {
  it("恶意卖家合约无法在 release 中重入重复提款", async function () {
    const { viem, networkHelpers, escrow, buyer, publicClient } =
      await fixture();

    // 部署恶意攻击合约，作为「卖家」
    const attackerContract = await viem.deployContract("ReentrancyAttack", [
      escrow.address,
    ]);

    const amount = parseEther("1");
    const deadline = (await chainNow(publicClient)) + 3600n;

    // 买家创建托管，卖家为恶意合约
    await escrow.write.createEscrow(
      [attackerContract.address, deadline, "attack"],
      { account: buyer.account, value: amount }
    );

    // 买家释放资金 → 触发恶意合约 receive() → 尝试重入 release
    await escrow.write.release([0n], { account: buyer.account });

    // 关键断言：
    // 1. 交易状态仍为 Released（没有重复释放导致异常）
    const [, , , , , status] = await escrow.read.getEscrow([0n]);
    assert.equal(status, 1);

    // 2. 合约余额归零：资金只被提取一次
    const contractBalance = await publicClient.getBalance({
      address: escrow.address,
    });
    assert.equal(contractBalance, 0n);

    // 3. 恶意合约余额应恰为 amount（而非 2 倍/3 倍）
    const attackerBalance = await publicClient.getBalance({
      address: attackerContract.address,
    });
    assert.equal(attackerBalance, amount);
  });
});
