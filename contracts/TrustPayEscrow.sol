// SPDX-License-Identifier: MIT
pragma solidity ^0.8.31;

import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title TrustPayEscrow
 * @notice 去中心化交易担保支付合约（MVP）
 *
 * 业务逻辑：
 *  - 买家 (buyer) 创建托管交易，并把原生 MON 存入合约锁定。
 *  - 卖家 (seller) 是收款方，无法绕过合约提取托管资金。
 *  - 买家确认交付后调用 release()，资金转给卖家。
 *  - 超过截止时间 (deadline) 后，买家可调用 refund()，资金退回买家。
 *  - release 与 refund 只能成功其一（由 status 状态机保证互斥）。
 *
 * 安全设计：
 *  - 继承 OpenZeppelin 的 ReentrancyGuard，防止重入攻击。
 *  - 遵循 Checks-Effects-Interactions 模式：先校验、再改状态、最后转账。
 */
contract TrustPayEscrow is ReentrancyGuard {
    // ───────────────────────── 类型定义 ─────────────────────────

    /// @dev 交易状态：Funded=已托管 / Released=已释放 / Refunded=已退款
    enum Status {
        Funded,
        Released,
        Refunded
    }

    /// @dev 单笔托管交易的数据结构
    struct Escrow {
        uint256 id; // 自增交易 ID
        address buyer; // 买家（创建者，出资方）
        address seller; // 卖家（收款方）
        uint256 amount; // 托管金额（原生 MON，单位 wei）
        string description; // 交易描述
        uint256 deadline; // 截止时间（Unix 时间戳，单位秒）
        Status status; // 当前状态
        uint256 createdAt; // 创建时间（Unix 时间戳，单位秒）
    }

    // ───────────────────────── 状态变量 ─────────────────────────

    /// @dev 交易 ID 自增计数器（同时代表已创建的交易总数）
    uint256 public dealCount;

    /// @dev 交易 ID -> 交易详情
    mapping(uint256 => Escrow) public escrows;

    // ───────────────────────── 事件 ─────────────────────────

    /// @notice 创建交易时触发
    event EscrowCreated(
        uint256 indexed id,
        address indexed buyer,
        address indexed seller,
        uint256 amount,
        uint256 deadline
    );

    /// @notice 释放资金时触发
    event EscrowReleased(uint256 indexed id, address indexed buyer, address indexed seller, uint256 amount);

    /// @notice 退款时触发
    event EscrowRefunded(uint256 indexed id, address indexed buyer, uint256 amount);

    // ───────────────────────── 修饰器 ─────────────────────────

    /// @dev 校验交易存在且处于 Funded 状态
    modifier onlyFunded(uint256 _id) {
        require(_id < dealCount, "TrustPay: escrow does not exist");
        require(escrows[_id].status == Status.Funded, "TrustPay: escrow not funded");
        _;
    }

    // ───────────────────────── 核心函数 ─────────────────────────

    /**
     * @notice 创建托管交易，并存入原生 MON
     * @dev 调用者即为买家 (buyer)，必须随交易附带 msg.value 作为托管金额。
     * @param _seller 卖家地址
     * @param _deadline 截止时间（Unix 时间戳，单位秒）
     * @param _description 交易描述
     * @return id 新交易的 ID
     */
    function createEscrow(address _seller, uint256 _deadline, string calldata _description)
        external
        payable
        returns (uint256 id)
    {
        // Checks：校验输入合法性
        require(_seller != address(0), "TrustPay: seller is zero address");
        require(_seller != msg.sender, "TrustPay: seller cannot be buyer");
        require(msg.value > 0, "TrustPay: amount must be greater than 0");
        require(_deadline > block.timestamp, "TrustPay: deadline must be in the future");

        // Effects：更新状态（先写状态，再触发事件；资金由 msg.value 随调用进入合约）
        id = dealCount;
        escrows[id] = Escrow({
            id: id,
            buyer: msg.sender,
            seller: _seller,
            amount: msg.value,
            description: _description,
            deadline: _deadline,
            status: Status.Funded,
            createdAt: block.timestamp
        });
        dealCount += 1;

        emit EscrowCreated(id, msg.sender, _seller, msg.value, _deadline);
    }

    /**
     * @notice 买家释放资金给卖家
     * @dev 仅买家可调用；允许在截止时间之后仍主动释放（视为放弃退款权利、完成交易）。
     */
    function release(uint256 _id) external nonReentrant onlyFunded(_id) {
        Escrow storage escrow = escrows[_id];

        // Checks：校验调用者身份
        require(msg.sender == escrow.buyer, "TrustPay: only buyer can release");

        // Effects：先改状态，防止重入时重复释放
        escrow.status = Status.Released;

        emit EscrowReleased(_id, escrow.buyer, escrow.seller, escrow.amount);

        // Interactions：最后转账，并检查转账结果
        (bool success,) = escrow.seller.call{value: escrow.amount}("");
        require(success, "TrustPay: release transfer failed");
    }

    /**
     * @notice 买家超时退款
     * @dev 仅买家可调用，且必须已超过截止时间。
     */
    function refund(uint256 _id) external nonReentrant onlyFunded(_id) {
        Escrow storage escrow = escrows[_id];

        // Checks：校验调用者身份与时间
        require(msg.sender == escrow.buyer, "TrustPay: only buyer can refund");
        require(block.timestamp >= escrow.deadline, "TrustPay: deadline not reached");

        // Effects：先改状态
        escrow.status = Status.Refunded;

        emit EscrowRefunded(_id, escrow.buyer, escrow.amount);

        // Interactions：最后转账，并检查转账结果
        (bool success,) = escrow.buyer.call{value: escrow.amount}("");
        require(success, "TrustPay: refund transfer failed");
    }

    // ───────────────────────── 只读查询 ─────────────────────────

    /// @notice 查询单笔交易详情
    function getEscrow(uint256 _id)
        external
        view
        returns (
            address buyer,
            address seller,
            uint256 amount,
            string memory description,
            uint256 deadline,
            Status status,
            uint256 createdAt
        )
    {
        require(_id < dealCount, "TrustPay: escrow does not exist");
        Escrow storage escrow = escrows[_id];
        return (
            escrow.buyer,
            escrow.seller,
            escrow.amount,
            escrow.description,
            escrow.deadline,
            escrow.status,
            escrow.createdAt
        );
    }

    /// @notice 查询交易总数（等价于 dealCount，提供语义化入口）
    function getDealCount() external view returns (uint256) {
        return dealCount;
    }
}
