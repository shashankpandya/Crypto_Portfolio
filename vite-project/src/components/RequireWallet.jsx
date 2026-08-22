import React, { useState } from "react";
import { useWallet } from "../hooks/useWallet";
import { useToast } from "./ui/Toast";
import Button from "./ui/Button";
import EmptyState from "./ui/EmptyState";

const LockIcon = () => (
  <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
  </svg>
);

/**
 * RequireWallet — route-level gate for pages that need a connected wallet
 * (Transfer, Allowance, Admin). Without this, a disconnected visitor saw the
 * full form and only found out it didn't work after submitting.
 */
const RequireWallet = ({ children }) => {
  const { currentAccount, isConnectedToSite, connectWallet } = useWallet();
  const { notify } = useToast();
  const [isConnecting, setIsConnecting] = useState(false);

  if (isConnectedToSite && currentAccount) return children;

  const handleConnect = async () => {
    if (isConnecting) return;
    if (!window.ethereum) {
      notify({ variant: "error", message: "No wallet found. Install MetaMask to connect." });
      return;
    }
    setIsConnecting(true);
    try {
      await connectWallet();
      notify({ variant: "success", message: "Wallet connected." });
    } catch (error) {
      console.error("Failed to connect wallet:", error);
      notify({ variant: "error", message: error.message || "Failed to connect wallet. Please try again." });
    } finally {
      setIsConnecting(false);
    }
  };

  return (
    <div className="page-container text-white">
      <EmptyState
        icon={<LockIcon />}
        title="Connect your wallet"
        description="This page needs a connected wallet to continue."
        action={
          <Button onClick={handleConnect} disabled={isConnecting} className="text-xs py-2 px-6">
            {isConnecting ? "Connecting…" : "Connect Wallet"}
          </Button>
        }
        className="max-w-md mx-auto mt-10"
      />
    </div>
  );
};

export default RequireWallet;
