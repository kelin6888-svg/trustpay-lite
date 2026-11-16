import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

/**
 * TrustPayEscrow 部署模块
 * 使用 Hardhat Ignition 声明式部署，支持 --network monadTestnet
 */
const TrustPayEscrowModule = buildModule("TrustPayEscrowModule", (m) => {
  const escrow = m.contract("TrustPayEscrow");

  return { escrow };
});

export default TrustPayEscrowModule;
