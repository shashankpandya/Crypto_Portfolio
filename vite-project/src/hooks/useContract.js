import { useContext } from "react";
import { ContractContext } from "../context/ContractContext";

/**
 * useContract (P2-12) — reads on-chain transfer/batch-transfer, allowance,
 * admin fee-change, gas options, and transaction history state from
 * ContractContext. Must be used within a ContractProvider.
 */
export const useContract = () => useContext(ContractContext);
