import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { network } from "hardhat";
import { parseEther, zeroAddress } from "viem";

/**
 * 部署一个全新合约实例并返回测试账户与工具。
 * 每个用例独立部署，避免共享状态导致的时间漂移。
 */
async function deployFixture() {
  const { viem, networkHelpers } = await network.getOrCreate();
  const [buyer, seller, other] = await viem.getWalletClients();
  const publicClient = await viem.getPublicClient();
  const escrow = await viem.deployContract("TrustPayEscrow");
  return { viem, networkHelpers, escrow, buyer, seller, other, publicClient };
}

/** 获取当前链上时间戳（避免依赖真实系统时钟） */
async function chainNow(publicClient: any): Promise<bigint> {
  const block = await publicClient.getBlock();
  return block.timestamp;
}

/** 断言某笔交易以指定 revert 原因失败 */
async function expectRevert(p: Promise<unknown>, reason: string) {
  let err: any;
  try {
    await p;
  } catch (e) {
    err = e;
  }
  assert.ok(err, `expected revert with "${reason}", but transaction succeeded`);
  const walked = typeof err?.walk === "function" ? err.walk() : null;
  const msg = walked?.message ?? err?.message ?? String(err);
  assert.ok(
    msg.includes(reason),
    `expected revert reason "${reason}", got: ${msg}`
  );
}

/** 创建一笔 Funded 状态、截止时间为未来的交易 */
async function createFundedEscrow(ctx: any, amount = parseEther("1")) {
  const deadline = (await chainNow(ctx.publicClient)) + 3600n;
  await ctx.escrow.write.createEscrow(
    [ctx.seller.account.address, deadline, "deal"],
    { account: ctx.buyer.account, value: amount }
  );
  return deadline;
}

describe("TrustPayEscrow", function () {
  // ───────── 创建交易 ─────────
  describe("createEscrow", function () {
    it("正常创建交易并存入资金", async function () {
      const ctx = await deployFixture();
      const amount = parseEther("1");
      await createFundedEscrow(ctx, amount);

      const [b, s, a, , , status] = await ctx.escrow.read.getEscrow([0n]);
      assert.equal(b.toLowerCase(), ctx.buyer.account.address.toLowerCase());
      assert.equal(s.toLowerCase(), ctx.seller.account.address.toLowerCase());
      assert.equal(a, amount);
      assert.equal(status, 0); // Funded
      assert.equal(await ctx.escrow.read.getDealCount(), 1n);
    });

    it("金额为零时拒绝", async function () {
      const ctx = await deployFixture();
      const deadline = (await chainNow(ctx.publicClient)) + 3600n;
      await expectRevert(
        ctx.escrow.write.createEscrow(
          [ctx.seller.account.address, deadline, "x"],
          { account: ctx.buyer.account, value: 0n }
        ),
        "amount must be greater than 0"
      );
    });

    it("卖家地址为零地址时拒绝", async function () {
      const ctx = await deployFixture();
      const deadline = (await chainNow(ctx.publicClient)) + 3600n;
      await expectRevert(
        ctx.escrow.write.createEscrow([zeroAddress, deadline, "x"], {
          account: ctx.buyer.account,
          value: parseEther("1"),
        }),
        "seller is zero address"
      );
    });

    it("卖家不能是买家自己", async function () {
      const ctx = await deployFixture();
      const deadline = (await chainNow(ctx.publicClient)) + 3600n;
      await expectRevert(
        ctx.escrow.write.createEscrow(
          [ctx.buyer.account.address, deadline, "x"],
          { account: ctx.buyer.account, value: parseEther("1") }
        ),
        "seller cannot be buyer"
      );
    });

    it("截止时间在过去时拒绝", async function () {
      const ctx = await deployFixture();
      const pastDeadline = (await chainNow(ctx.publicClient)) - 3600n;
      await expectRevert(
        ctx.escrow.write.createEscrow(
          [ctx.seller.account.address, pastDeadline, "x"],
          { account: ctx.buyer.account, value: parseEther("1") }
        ),
        "deadline must be in the future"
      );
    });
  });

  // ───────── 释放资金 ─────────
  describe("release", function () {
    it("非买家释放资金被拒绝", async function () {
      const ctx = await deployFixture();
      await createFundedEscrow(ctx);
      await expectRevert(
        ctx.escrow.write.release([0n], { account: ctx.seller.account }),
        "only buyer can release"
      );
    });

    it("买家正常释放资金，卖家收到正确金额", async function () {
      const ctx = await deployFixture();
      const amount = parseEther("1");
      await createFundedEscrow(ctx, amount);
      const before = await ctx.publicClient.getBalance({
        address: ctx.seller.account.address,
      });

      await ctx.escrow.write.release([0n], { account: ctx.buyer.account });

      const [, , , , , status] = await ctx.escrow.read.getEscrow([0n]);
      assert.equal(status, 1); // Released
      const after = await ctx.publicClient.getBalance({
        address: ctx.seller.account.address,
      });
      assert.equal(after - before, amount);
    });

    it("释放后再次释放被拒绝", async function () {
      const ctx = await deployFixture();
      await createFundedEscrow(ctx);
      await ctx.escrow.write.release([0n], { account: ctx.buyer.account });
      await expectRevert(
        ctx.escrow.write.release([0n], { account: ctx.buyer.account }),
        "escrow not funded"
      );
    });
  });

  // ───────── 超时退款 ─────────
  describe("refund", function () {
    it("未超时申请退款被拒绝", async function () {
      const ctx = await deployFixture();
      await createFundedEscrow(ctx);
      await expectRevert(
        ctx.escrow.write.refund([0n], { account: ctx.buyer.account }),
        "deadline not reached"
      );
    });

    it("超时后买家退款成功，合约余额归零", async function () {
      const ctx = await deployFixture();
      const deadline = await createFundedEscrow(ctx);
      // 将下一个区块时间戳精确设为 deadline 之后
      await ctx.networkHelpers.time.setNextBlockTimestamp(deadline + 1n);
      await ctx.networkHelpers.mine(1);

      await ctx.escrow.write.refund([0n], { account: ctx.buyer.account });

      const [, , , , , status] = await ctx.escrow.read.getEscrow([0n]);
      assert.equal(status, 2); // Refunded
      const contractBalance = await ctx.publicClient.getBalance({
        address: ctx.escrow.address,
      });
      assert.equal(contractBalance, 0n);
    });

    it("非买家申请退款被拒绝", async function () {
      const ctx = await deployFixture();
      const deadline = await createFundedEscrow(ctx);
      await ctx.networkHelpers.time.setNextBlockTimestamp(deadline + 1n);
      await ctx.networkHelpers.mine(1);

      await expectRevert(
        ctx.escrow.write.refund([0n], { account: ctx.seller.account }),
        "only buyer can refund"
      );
    });

    it("退款后再次退款被拒绝", async function () {
      const ctx = await deployFixture();
      const deadline = await createFundedEscrow(ctx);
      await ctx.networkHelpers.time.setNextBlockTimestamp(deadline + 1n);
      await ctx.networkHelpers.mine(1);

      await ctx.escrow.write.refund([0n], { account: ctx.buyer.account });
      await expectRevert(
        ctx.escrow.write.refund([0n], { account: ctx.buyer.account }),
        "escrow not funded"
      );
    });

    it("退款后再次释放被拒绝", async function () {
      const ctx = await deployFixture();
      const deadline = await createFundedEscrow(ctx);
      await ctx.networkHelpers.time.setNextBlockTimestamp(deadline + 1n);
      await ctx.networkHelpers.mine(1);

      await ctx.escrow.write.refund([0n], { account: ctx.buyer.account });
      await expectRevert(
        ctx.escrow.write.release([0n], { account: ctx.buyer.account }),
        "escrow not funded"
      );
    });
  });

  // ───────── 查询与边界 ─────────
  describe("查询与边界", function () {
    it("查询不存在的交易被拒绝", async function () {
      const ctx = await deployFixture();
      await expectRevert(ctx.escrow.read.getEscrow([999n]), "escrow does not exist");
    });

    it("合约托管余额与记账一致", async function () {
      const ctx = await deployFixture();
      const amount = parseEther("2");
      await createFundedEscrow(ctx, amount);
      const contractBalance = await ctx.publicClient.getBalance({
        address: ctx.escrow.address,
      });
      assert.equal(contractBalance, amount);
    });
  });
});
