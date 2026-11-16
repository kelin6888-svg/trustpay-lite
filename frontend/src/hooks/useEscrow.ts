import { useCallback, useState } from "react";
import { parseEther } from "viem";
import {
  useAccount,
  usePublicClient,
  useReadContract,
  useWriteContract,
} from "wagmi";
import { CONTRACT_ABI, CONTRACT_ADDRESS } from "../config/contract";

/** 单笔交易的数据结构（对应合约 Escrow struct） */
export interface EscrowData {
  id: bigint;
  buyer: string;
  seller: string;
  amount: bigint;
  description: string;
  deadline: bigint;
  status: number;
  createdAt: bigint;
}

/**
 * 使用 useReadContract 封装合约只读查询。
 * 读取单笔交易详情。
 */
export function useEscrow(id: bigint | undefined) {
  const { data, isLoading, refetch } = useReadContract({
    abi: CONTRACT_ABI,
    address: CONTRACT_ADDRESS as `0x${string}`,
    functionName: "getEscrow",
    args: id !== undefined ? [id] : undefined,
    query: {
      enabled: id !== undefined && !!CONTRACT_ADDRESS,
    },
  });

  const escrow: EscrowData | undefined = data
    ? {
        id: id as bigint,
        buyer: data[0],
        seller: data[1],
        amount: data[2],
        description: data[3],
        deadline: data[4],
        status: Number(data[5]),
        createdAt: data[6],
      }
    : undefined;

  return { escrow, isLoading, refetch };
}

/** 读取交易总数 */
export function useDealCount() {
  const { data, isLoading, refetch } = useReadContract({
    abi: CONTRACT_ABI,
    address: CONTRACT_ADDRESS as `0x${string}`,
    functionName: "getDealCount",
    query: { enabled: !!CONTRACT_ADDRESS },
  });
  return { dealCount: (data as bigint) ?? 0n, isLoading, refetch };
}

/**
 * 创建交易的封装。返回 createEscrow 函数与进行中状态。
 */
export function useCreateEscrow() {
  const { address } = useAccount();
  const { writeContractAsync } = useWriteContract();
  const [isPending, setIsPending] = useState(false);

  const createEscrow = useCallback(
    async (seller: string, amountMon: string, deadline: bigint, description: string) => {
      if (!address) throw new Error("请先连接钱包");
      setIsPending(true);
      try {
        const hash = await writeContractAsync({
          abi: CONTRACT_ABI,
          address: CONTRACT_ADDRESS as `0x${string}`,
          functionName: "createEscrow",
          args: [seller, deadline, description],
          value: parseEther(amountMon),
        });
        return hash;
      } finally {
        setIsPending(false);
      }
    },
    [address, writeContractAsync]
  );

  return { createEscrow, isPending };
}

/** 释放资金 */
export function useRelease() {
  const { address } = useAccount();
  const { writeContractAsync } = useWriteContract();
  const [isPending, setIsPending] = useState(false);

  const release = useCallback(
    async (id: bigint) => {
      if (!address) throw new Error("请先连接钱包");
      setIsPending(true);
      try {
        const hash = await writeContractAsync({
          abi: CONTRACT_ABI,
          address: CONTRACT_ADDRESS as `0x${string}`,
          functionName: "release",
          args: [id],
        });
        return hash;
      } finally {
        setIsPending(false);
      }
    },
    [address, writeContractAsync]
  );

  return { release, isPending };
}

/** 超时退款 */
export function useRefund() {
  const { address } = useAccount();
  const { writeContractAsync } = useWriteContract();
  const [isPending, setIsPending] = useState(false);

  const refund = useCallback(
    async (id: bigint) => {
      if (!address) throw new Error("请先连接钱包");
      setIsPending(true);
      try {
        const hash = await writeContractAsync({
          abi: CONTRACT_ABI,
          address: CONTRACT_ADDRESS as `0x${string}`,
          functionName: "refund",
          args: [id],
        });
        return hash;
      } finally {
        setIsPending(false);
      }
    },
    [address, writeContractAsync]
  );

  return { refund, isPending };
}

/** 获取 public client（用于读取余额等） */
export function usePublicClientHook() {
  return usePublicClient();
}
