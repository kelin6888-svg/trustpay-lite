# TrustPay Lite — 演示脚本与答辩 FAQ（DEMO_SCRIPT）

## 一、60 秒英文项目介绍

> "Hi, I'm building **TrustPay Lite** — a simple on-chain escrow payment dApp on Monad.
>
> The problem: when two strangers trade online, the buyer worries about paying first, and the seller worries about getting paid.
>
> TrustPay Lite fixes this with a smart contract. The buyer locks MON in the contract when creating a deal. When the buyer confirms delivery, the funds are released to the seller. If the deadline passes, the buyer can claim a refund.
>
> Everything is on-chain, transparent, and requires no trusted third party. Built with Solidity, Hardhat 3, and a React frontend — running on Monad Testnet."

## 二、3 分钟项目演示稿

**开场（30s）**
今天演示的是 TrustPay Lite，一个运行在 Monad 上的去中心化担保支付应用，解决陌生交易中的信任问题。

**演示流程（2 分钟）**
1. 连接钱包，展示 Monad Testnet 网络状态与账户余额。
2. 创建交易：填写卖家地址、金额 1 MON、描述、7 天期限，提交并确认交易哈希。
3. 查看交易列表，展示资金已锁定在合约中，状态为「已托管」。
4. 买家确认交付，点击「释放资金」，钱包签名后资金转给卖家，状态变为「已释放」。
5. 切换到退款流程：再创建一笔短期交易，等到超时后点击「超时退款」，资金退回买家。
6. 展示区块浏览器中的交易记录，证明所有操作真实上链。

**收尾（30s）**
核心价值：用代码替代第三方担保，规则透明、不可篡改。这是教育原型，未来可扩展 AI 仲裁、多币种等。

## 三、现场答辩常见问题（FAQ）

### Q1：资金真的安全吗？买家会不会被骗？
A：资金由智能合约托管，代码规则公开透明。买家确认交付前，资金不会转给卖家；超过截止时间，买家可退款。合约经过重入防护测试，非买家无法提取资金。

### Q2：卖家如何相信资金真的存在？
A：卖家可通过区块浏览器查看合约地址的余额和对应交易，证明资金已真实锁定在链上，且只有买家确认后才能释放。

### Q3：如果双方有争议怎么办？
A：MVP 阶段依赖超时退款兜底 + 线下协商。争议仲裁、AI 仲裁是明确排除在 MVP 之外的未来扩展。

### Q4：为什么选择 Monad？
A：Monad 是高性能 EVM 兼容 L1，10,000 TPS、300ms 出块，交易成本低、确认快，适合支付类高频场景，同时完全兼容以太坊工具链。

### Q5：EVM 是什么？
A：EVM 是以太坊虚拟机（Ethereum Virtual Machine），是运行智能合约的计算环境。Monad 兼容 EVM，所以 Solidity 合约和 Hardhat 等工具可直接使用。

### Q6：Gas 是什么？
A：Gas 是执行链上操作所需的计算费用，用原生币（MON）支付。每次写操作（创建、释放、退款）都需要支付 gas，读操作免费。

### Q7：合约如何防止重入攻击？
A：采用 Checks-Effects-Interactions 模式（先校验、再改状态、最后转账），并继承 OpenZeppelin 的 ReentrancyGuard。测试中用恶意合约验证了无法重复提款。

### Q8：为什么释放和退款只能成功一个？
A：交易状态机 `Funded → Released/Refunded`，状态一旦改变就不可逆。`onlyFunded` 修饰器保证只有 Funded 状态才能执行操作，从根源杜绝重复释放/退款。

### Q9：私钥如何管理？
A：私钥通过环境变量/keystore 管理，绝不写入源码或提交到版本控制。部署使用独立测试钱包。

### Q10：这个项目距离生产还有多远？
A：还需第三方专业审计、争议解决机制、多币种支持、前端安全加固等。当前定位是教育与黑客松原型。
