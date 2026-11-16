// SPDX-License-Identifier: MIT
pragma solidity ^0.8.31;

/**
 * @title ReentrancyAttack
 * @dev 恶意合约，用于验证 TrustPayEscrow 的重入防护是否生效。
 *
 * 攻击原理：卖家是一个恶意合约，当收到 release() 转来的资金时，
 * 在 receive() 回调中再次调用 release()，试图重复提取托管资金。
 * 如果合约缺少防重入机制，攻击者可在单笔交易中反复提款。
 */
contract ReentrancyAttack {
    address public target;
    uint256 public attackCount;

    constructor(address _target) {
        target = _target;
    }

    /// @dev 触发攻击：以卖家身份被 release，收到资金后尝试再次 release
    receive() external payable {
        attackCount += 1;
        if (attackCount < 3) {
            // 递归调用 release，尝试重复提款
            (bool ok,) = target.call(
                abi.encodeWithSignature("release(uint256)", 0)
            );
            // 若重入被阻止，此调用会失败，资金已在单次 release 中结清
            ok;
        }
    }

    /// @dev 供测试断言：攻击重入尝试次数
    function getAttackCount() external view returns (uint256) {
        return attackCount;
    }
}
