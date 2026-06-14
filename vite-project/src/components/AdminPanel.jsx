import React, { useState, useContext, useEffect } from "react";
import { TransactionContext } from "../context/TransactionContext";

function AdminPanel() {
  const { currentAccount, feePercentage, updateFeePercentage, contractOwner, getContractInfo } =
    useContext(TransactionContext);

  const [newFee, setNewFee] = useState(0);
  const [contractInfo, setContractInfo] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const fetchInfo = async () => {
      try {
        const info = await getContractInfo();
        setContractInfo(info);
      } catch (err) {
        console.error("Failed to load contract info:", err);
      }
    };
    fetchInfo();
  }, [getContractInfo]);

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
      const txHash = await updateFeePercentage(newFee.toString());
      setSuccessMessage(`Transaction fee updated to ${newFee}% successfully! Tx Hash: ${txHash}`);
    } catch (err) {
      console.error(err);
      setErrorMessage(err.message || "Failed to update transaction fee.");
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
        <div className="bg-[#0c1118] border border-white/5 rounded-lg p-5 text-center shadow-xl">
          <div className="w-12 h-12 bg-[#EF4444]/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-[#EF4444]/20 shadow-inner">
            <svg className="w-6 h-6 text-[#EF4444]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 15v2m0-8V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h3 className="text-base font-bold text-white mb-2">Access Denied</h3>
          <p className="text-[#71717a] text-xs leading-relaxed mb-4">
            Only the contract owner can access this administration panel.
          </p>
          {contractOwner && (
            <div className="bg-[#050811] p-2 rounded border border-white/5 font-mono text-[10px] text-[#71717a] select-all">
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
        <p className="text-xs text-[#71717a] mt-1.5 max-w-md">
          Manage system configurations, adjust transaction fees, and audit contract variables.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Contract Metadata Card */}
        <div className="bg-[#0c1118] border border-white/5 p-5 rounded-lg shadow-lg flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold mb-4 text-white border-b border-white/5 pb-2">
              Contract Details
            </h3>
            <div className="space-y-3.5 text-xs text-[#a1a7bb]">
              <div>
                <p className="text-[#71717a] text-[10px] font-semibold uppercase">Token Name</p>
                <p className="text-white font-bold">{contractInfo?.name || "MyToken"}</p>
              </div>
              <div>
                <p className="text-[#71717a] text-[10px] font-semibold uppercase">Token Symbol</p>
                <p className="text-white font-mono font-bold">{contractInfo?.symbol || "MTK"}</p>
              </div>
              <div>
                <p className="text-[#71717a] text-[10px] font-semibold uppercase">Total Supply</p>
                <p className="text-white font-mono font-bold">
                  {contractInfo ? (Number(contractInfo.totalSupply) / 10 ** Number(contractInfo.decimals)).toLocaleString() : "1,000,000"} MTK
                </p>
              </div>
              <div className="border-t border-white/5 pt-2.5">
                <p className="text-[#71717a] text-[10px] font-semibold uppercase">Contract Owner Address</p>
                <p className="text-white text-[10px] break-all font-mono">
                  {contractOwner || "0x0000..."}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Action Card: Update Fee */}
        <div className="bg-[#0c1118] border border-white/5 p-5 rounded-lg shadow-lg flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold mb-4 text-white border-b border-white/5 pb-2">
              Fee Management
            </h3>
            <div className="mb-4 p-3 bg-[#050811] rounded border border-white/5 text-xs">
              <p className="text-[#71717a] text-[10px] font-semibold uppercase">Current Contract Fee</p>
              <p className="text-2xl font-bold text-[#38BDF8] font-mono mt-0.5">{feePercentage}%</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between items-center text-xs text-[#a1a7bb]">
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
                className="w-full h-1.5 rounded-lg appearance-none cursor-pointer bg-[#050811] accent-[#FF385C]"
                style={{
                  background: `linear-gradient(to right, #FF385C 0%, #FF7B00 ${(newFee / 10) * 100}%, #050811 ${(newFee / 10) * 100}%, #050811 100%)`
                }}
                required
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className={`w-full h-10 rounded-lg text-xs font-bold text-white transition duration-200 ${
                isLoading
                  ? "bg-white/5 text-[#71717a] border border-white/5 cursor-not-allowed"
                  : "premium-btn"
              }`}
            >
              {isLoading ? "Updating Contract Fee..." : "Update Fee"}
            </button>
          </form>
        </div>
      </div>

      {/* Messages */}
      {errorMessage && (
        <div className="bg-[#EF4444]/10 border border-[#EF4444]/20 text-[#EF4444] px-3.5 py-2 rounded text-xs mt-4" role="alert">
          <p className="font-bold">Error</p>
          <p className="opacity-90 mt-0.5">{errorMessage}</p>
        </div>
      )}

      {successMessage && (
        <div className="bg-[#10B981]/10 border border-[#10B981]/20 text-[#10B981] px-3.5 py-2 rounded text-xs mt-4" role="alert">
          <p className="font-bold">Success</p>
          <p className="opacity-90 mt-0.5 break-all">{successMessage}</p>
        </div>
      )}
    </div>
  );
}

export default AdminPanel;
