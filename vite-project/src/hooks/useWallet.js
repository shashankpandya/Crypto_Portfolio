import { useContext } from "react";
import { WalletContext } from "../context/WalletContext";

/**
 * useWallet (P2-10) — reads wallet connect/disconnect/account/chain state
 * from WalletContext. Must be used within a WalletProvider.
 */
export const useWallet = () => useContext(WalletContext);
