import React, { useState, useEffect } from "react";
import { useWallet } from "../../hooks/useWallet";
import { useContract } from "../../hooks/useContract";
import { COLORS } from "../../utils/tokens";
import Button from "../../components/ui/Button";
import { useToast } from "../../components/ui/Toast";

function AdminPanel() {
  const { currentAccount } = useWallet();
  const { feePercentage, updateFeePercentage, contractOwner, getContractInfo } = useContract();
  const { notify } = useToast();

  const [newFee, setNewFee] = useState(0);
  const [contractInfo, setContractInfo] = useState(null);
  const [contractInfoLoading, setContractInfoLoading] = useState(true);
  const [contractInfoError, setContractInfoError] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const fetchInfo = React.useCallback(async () => {
    setContractInfoLoading(true);
    setContractInfoError(null);
    try {
      const info = await getContractInfo();
      setContractInfo(info);
    } catch (err) {
      console.error("Failed to load contract info:", err);
      setContractInfoError("Failed to load contract details. Please try again.");
    } finally {
      setContractInfoLoading(false);
    }
  }, [getContractInfo]);

  useEffect(() => {
    fetchInfo();
  }, [fetchInfo]);

  useEffect(() => {
    if (feePercentage !== undefined && feePercentage !== null) {
      setNewFee(parseFloat(feePercentage));
    }
  }, [feePercentage]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");

    if (isNaN(newFee) || newFee < 0 || newFee > 10) {
      setErrorMessage("Fee must be a valid number between 0% and 10%.");
      return;
    }

    try {
      setIsLoading(true);
      notify({ variant: "info", message: "Confirm the fee change in MetaMask, then wait for on-chain confirmation..." });
      const txHash = await updateFeePercentage(newFee.toString());
      setSuccessMessage(`Transaction fee updated to ${newFee}% successfully! Tx Hash: ${txHash}`);
      notify({ variant: "success", message: `Transaction fee updated to ${newFee}%!` });
    } catch (err) {
      console.error(err);
      const message =
        err.code === 4001 || err.message?.includes("rejected")
          ? "Fee change was rejected in MetaMask."
          : err.reason || err.message || "Failed to update transaction fee.";
      setErrorMessage(message);
      notify({ variant: "error", message: `Fee update failed: ${message}`, duration: 8000 });
    } finally {
      setIsLoading(false);
    }
  };

  const isOwner =
    currentAccount &&
    contractOwner &&
    currentAccount.toLowerCase() === contractOwner.toLowerCase();

  // Owner guard check
  if (!isOwner) {
    return (
      <div className="page-container text-white max-w-sm">
        <div className="bg-surface-raised border border-white/5 rounded-lg p-5 text-center shadow-xl">
          <div className="w-12 h-12 bg-negative/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-negative/20 shadow-inner">
            <svg className="w-6 h-6 text-negative" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 15v2m0-8V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h1 className="text-base font-bold text-white mb-2">Access Denied</h1>
          <p className="text-muted text-xs leading-relaxed mb-4">
            Only the contract owner can access this administration panel.
          </p>
          {contractOwner && (
            <div className="bg-base p-2 rounded border border-white/5 font-mono text-[10px] text-muted select-all">
              Owner: {contractOwner}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="page-container text-white max-w-2xl">
      {/* Header */}
      <div className="mb-6 flex flex-col items-center justify-center text-center">
        <h1 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
          <span className="premium-text-gradient-primary">Admin Control Panel</span>
        </h1>
        <p className="text-xs text-muted mt-1.5 max-w-md">
          Manage system configurations, adjust transaction fees, and audit contract variables.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Contract Metadata Card */}
        <div className="bg-surface-raised border border-white/5 p-5 rounded-lg shadow-lg flex flex-col justify-between">
          <div>
            <h2 className="text-sm font-bold mb-4 text-white border-b border-white/5 pb-2">
              Contract Details
            </h2>
            {contractInfoLoading ? (
              <div className="space-y-3.5" role="status" aria-label="Loading contract details">
                <div className="h-8 animate-pulse rounded bg-white/[0.06]" />
                <div className="h-8 animate-pulse rounded bg-white/[0.06]" />
                <div className="h-8 animate-pulse rounded bg-white/[0.06]" />
              </div>
            ) : contractInfoError ? (
              <div className="flex flex-col items-start gap-2 text-xs">
                <p className="text-negative">{contractInfoError}</p>
                <Button variant="secondary" onClick={fetchInfo} className="text-[10px] py-1 px-3">
                  Retry
                </Button>
              </div>
            ) : (
              <div className="space-y-3.5 text-xs text-slate-400">
                <div>
                  <p className="text-muted text-[10px] font-semibold uppercase">Token Name</p>
                  <p className="text-white font-bold">{contractInfo?.name}</p>
                </div>
                <div>
                  <p className="text-muted text-[10px] font-semibold uppercase">Token Symbol</p>
                  <p className="text-white font-mono font-bold">{contractInfo?.symbol}</p>
                </div>
                <div>
                  <p className="text-muted text-[10px] font-semibold uppercase">Total Supply</p>
                  <p className="text-white font-mono font-bold">
                    {(Number(contractInfo?.totalSupply) / 10 ** Number(contractInfo?.decimals)).toLocaleString()} MTK
                  </p>
                </div>
                <div className="border-t border-white/5 pt-2.5">
                  <p className="text-muted text-[10px] font-semibold uppercase">Contract Owner Address</p>
                  <p className="text-white text-[10px] break-all font-mono">
                    {contractOwner || "Unknown"}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Action Card: Update Fee */}
        <div className="bg-surface-raised border border-white/5 p-5 rounded-lg shadow-lg flex flex-col justify-between">
          <div>
            <h2 className="text-sm font-bold mb-4 text-white border-b border-white/5 pb-2">
              Fee Management
            </h2>
            <div className="mb-4 p-3 bg-base rounded border border-white/5 text-xs">
              <p className="text-muted text-[10px] font-semibold uppercase">Current Contract Fee</p>
              <p className="text-2xl font-bold text-cobalt font-mono mt-0.5">{feePercentage}%</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between items-center text-xs text-slate-400">
                <span className="font-semibold text-xs">New Fee Percentage</span>
                <span className="text-white font-bold font-mono text-sm">{newFee}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="10"
                step="0.1"
                id="newFeeInput"
                name="newFee"
                value={newFee}
                onChange={(e) => setNewFee(parseFloat(e.target.value))}
                className="w-full h-1.5 rounded-lg appearance-none cursor-pointer bg-base accent-coral"
                style={{
                  background: `linear-gradient(to right, ${COLORS.coral} 0%, ${COLORS.coral} ${(newFee / 10) * 100}%, ${COLORS.base} ${(newFee / 10) * 100}%, ${COLORS.base} 100%)`
                }}
                required
              />
            </div>

            <Button type="submit" disabled={isLoading} className="w-full h-10">
              {isLoading ? "Updating Contract Fee..." : "Update Fee"}
            </Button>
          </form>
        </div>
      </div>

      {/* Messages */}
      {errorMessage && (
        <div className="bg-negative/10 border border-negative/20 text-negative px-3.5 py-2 rounded text-xs mt-4" role="alert">
          <p className="font-bold">Error</p>
          <p className="opacity-90 mt-0.5">{errorMessage}</p>
        </div>
      )}

      {successMessage && (
        <div className="bg-positive/10 border border-positive/20 text-positive px-3.5 py-2 rounded text-xs mt-4" role="alert">
          <p className="font-bold">Success</p>
          <p className="opacity-90 mt-0.5 break-all">{successMessage}</p>
        </div>
      )}
    </div>
  );
}

export default AdminPanel;
