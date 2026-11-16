# TrustPay Lite — Web3 核心概念讲解（结合本项目代码）

> 面向 Web3 初学者，结合 TrustPay Lite 实际代码讲解四大模块的核心概念。

## 模块一：区块链基础

### 区块链是什么？
一种「分布式账本」——数据不是存在某台服务器，而是由网络中众多节点共同维护。每个区块记录一批交易，按时间顺序用哈希链接成链，篡改历史记录需要重算后续所有区块，成本极高。

### 钱包、地址、私钥
- **私钥（Private Key）**：一串随机数，是你资产的唯一凭证，谁拿到谁就能控制你的资产。**绝不能泄露**。
- **地址（Address）**：由公钥哈希生成，公开可见，用于收款和标识身份，形如 `0x9d65...4C3b`。
- **钱包（Wallet）**：管理私钥并帮你签名的工具（如 MetaMask）。私钥在本地，签名后广播交易到链上。

在 TrustPay Lite 中，你的地址就是你的身份——买家就是创建交易时调用合约的那个地址。

### EVM 是什么？
EVM（以太坊虚拟机）是运行智能合约的计算环境。**Monad 兼容 EVM**，所以以太坊的 Solidity 语言、Hardhat 工具都能直接用在 Monad 上。

### Monad 与 Ethereum 的关系
Monad 是独立的、高性能的 EVM 兼容 L1（Layer 1，独立公链），不是以太坊的二层。它用并行执行等技术达到 10,000 TPS、300ms 出块，但开发者体验与以太坊几乎一致。

### Gas 是什么？
每次链上「写操作」都要付手续费，叫 gas，用原生币支付（Monad 上是 MON）。读操作免费。创建交易、释放、退款都要付 gas；查询余额、读状态免费。

## 模块二：智能合约（对照 TrustPayEscrow.sol）

### Solidity 基础语法
Solidity 是以太坊智能合约语言，类似 JavaScript + 静态类型。

```solidity
// contract 声明一个合约，类似 class
contract TrustPayEscrow {
    // 状态变量永久存储在链上
    uint256 public dealCount;   // 无符号 256 位整数
    mapping(uint256 => Escrow) public escrows;  // 映射，类似字典
}
```

- `mapping`：键值对存储，`mapping(uint256 => Escrow)` 表示「交易ID → 交易详情」。
- `struct`：自定义复合类型，定义了一笔交易的字段（买家、卖家、金额、状态等）。

### msg.sender（谁在调用我）
`msg.sender` 是当前调用合约的地址，是**权限控制的核心**。

```solidity
// 只有买家能释放资金
require(msg.sender == escrow.buyer, "TrustPay: only buyer can release");
```

### payable（能收钱）
`payable` 关键字表示函数或地址可以接收原生币。

```solidity
function createEscrow(...) external payable returns (uint256 id) {
    // msg.value 是随调用附带的金额
    require(msg.value > 0, "amount must be greater than 0");
}
```

买家调用 `createEscrow` 时附带 MON，`msg.value` 就是这笔钱，自动进入合约。

### event（链上日志）
事件是合约写出的「日志」，前端和区块浏览器可监听，成本远低于状态存储。

```solidity
event EscrowReleased(uint256 indexed id, address indexed buyer, ...);
// 释放成功后发出
emit EscrowReleased(_id, escrow.buyer, escrow.seller, escrow.amount);
```

### modifier（复用校验）
修饰器是可复用的前置校验逻辑。

```solidity
modifier onlyFunded(uint256 _id) {
    require(_id < dealCount, "escrow does not exist");
    require(escrows[_id].status == Status.Funded, "escrow not funded");
    _;  // 校验通过后执行原函数体
}

function release(uint256 _id) external nonReentrant onlyFunded(_id) { ... }
```

### 合约状态与资金转移
- 状态机：`Funded → Released` 或 `Funded → Refunded`，用 `enum Status` 表达。
- 资金转移：`call{value: amount}("")` 是转账的低级调用，需检查返回值确认成功。

**为什么状态先改再转账？** 这是 Checks-Effects-Interactions 模式（见模块四），防止重入攻击。

## 模块三：前端与钱包（对照 frontend/src）

### React 如何构建页面？
React 用组件（Component）组织 UI，每个组件是返回 HTML 的函数。本项目页面有首页、创建交易、交易列表、钱包模块等，全部是组件。

### 钱包如何连接？
用 **Wagmi**（React 的钱包连接库）封装。核心 API：

```tsx
const { address, isConnected } = useAccount();      // 读取当前账户
const { connect } = useConnect();                   // 触发连接
const { switchChain } = useSwitchChain();           // 切换网络
```

### 前端如何调用合约？
前端不直接「操作」链，而是通过 ABI 生成调用，由钱包签名后广播。Wagmi 封装了读写：

```tsx
// 读（免费）
const { data } = useReadContract({ abi, address, functionName: "getEscrow", args: [id] });

// 写（付 gas，需钱包签名）
await writeContractAsync({ abi, address, functionName: "release", args: [id] });
```

### ABI 是什么？
ABI（应用二进制接口）是合约的「说明书」，描述合约有哪些函数、参数类型。前端靠它把 JS 调用翻译成链上能理解的字节码。本项目把 ABI 从编译产物复制到 `frontend/src/config/TrustPayEscrow.json`。

### 交易哈希是什么？
每笔上链交易都有一个唯一哈希（如 `0x8a659dd5...e79d9`），是交易的「收据号」。通过区块浏览器（MonadScan）输入哈希，即可查到交易详情。

## 模块四：部署与测试

### 如何编译合约？
```bash
npx hardhat compile
```
Solidity 源码 → 字节码 + ABI，产物在 `artifacts/` 目录。

### 如何部署合约？
用 Hardhat Ignition 声明式部署：
```bash
npx hardhat ignition deploy ignition/modules/TrustPayEscrow.ts --network monadTestnet
```
部署会创建一个合约地址，之后所有人通过该地址交互。

### 如何测试？
```bash
npx hardhat test
```
本项目 16 个测试覆盖正常流程 + 异常流程 + 重入攻击，全部通过。

### 如何查看链上数据？
通过 RPC 查询，或访问区块浏览器（MonadScan / MonadVision），输入合约地址或交易哈希查看。

### 如何测试交易安全？
重点测三类：**权限**（非授权调用被拒）、**状态机**（重复操作被拒）、**重入**（恶意合约无法重复提款）。本项目已用恶意合约 `ReentrancyAttack.sol` 实测防护有效。
