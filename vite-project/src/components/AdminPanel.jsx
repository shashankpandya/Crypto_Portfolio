import React, { useState, useContext, useEffect } from "react";
import { TransactionContext } from "../context/TransactionContext";

function AdminPanel() {
  const { currentAccount, feePercentage, updateFeePercentage, contractOwner, getContractInfo } =
    useContext(TransactionContext);

  const [newFee, setNewFee] = useState("");
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");

    const parsedFee = parseFloat(newFee);
    if (isNaN(parsedFee) || parsedFee < 0 || parsedFee > 10) {
      setErrorMessage("Fee must be a valid number between 0% and 10%.");
      return;
    }

    try {
      setIsLoading(true);
      const txHash = await updateFeePercentage(newFee);
      setSuccessMessage(`Transaction fee updated to ${newFee}% successfully! Tx Hash: ${txHash}`);
      setNewFee("");
    } catch (err) {
      console.error(err);
      setErrorMessage(err.message || "Failed to update transaction fee.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-8 premium-glow-card text-white rounded-3xl relative overflow-hidden max-w-4xl mx-auto">
      <div className="absolute inset-0 bg-shine opacity-5 pointer-events-none"></div>
      <div className="relative z-10">
        <h2 className="text-4xl font-extrabold mb-8 text-center tracking-tight">
          <span className="premium-text-gradient-primary">Admin Control Panel</span>
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Contract Metadata Card */}
          <div className="bg-[#111827]/50 p-6 rounded-2xl border border-[#374151]/85 shadow-inner">
            <h3 className="text-2xl font-bold mb-6 text-transparent bg-clip-text bg-gradient-to-r from-white to-[#a1a7bb] border-b border-[#374151] pb-3 tracking-tight">
              Contract Details
            </h3>
            <div className="space-y-4 text-sm text-[#a1a7bb]">
              <div>
                <p className="text-[#a1a7bb] text-xs font-semibold uppercase">Token Name</p>
                <p className="text-white font-bold text-lg">{contractInfo?.name || "MyToken"}</p>
              </div>
              <div>
                <p className="text-[#a1a7bb] text-xs font-semibold uppercase">Token Symbol</p>
                <p className="text-white font-mono font-bold text-lg">{contractInfo?.symbol || "MTK"}</p>
              </div>
              <div>
                <p className="text-[#a1a7bb] text-xs font-semibold uppercase">Total Supply</p>
                <p className="text-white font-mono font-bold text-lg">
                  {contractInfo ? (Number(contractInfo.totalSupply) / 10 ** Number(contractInfo.decimals)).toLocaleString() : "1,000,000"} MTK
                </p>
              </div>
              <div className="border-t border-[#374151] pt-3">
                <p className="text-[#a1a7bb] text-xs font-semibold uppercase">Contract Owner Address</p>
                <p className="text-white text-xs break-all font-mono">
                  {contractOwner || "0x0000..."}
                </p>
              </div>
              <div>
                <p className="text-[#a1a7bb] text-xs font-semibold uppercase">Connected Admin Wallet</p>
                <p className="text-white text-xs break-all font-mono">
                  {currentAccount || "Not connected"}
                </p>
              </div>
            </div>
          </div>

          {/* Action Card: Update Fee */}
          <div className="bg-[#111827]/50 p-6 rounded-2xl border border-[#374151]/85 shadow-inner flex flex-col justify-between">
            <div>
              <h3 className="text-2xl font-bold mb-6 text-transparent bg-clip-text bg-gradient-to-r from-white to-[#a1a7bb] border-b border-[#374151] pb-3 tracking-tight">
                Fee Management
              </h3>
              <div className="mb-6 p-4 bg-[#111827] rounded-2xl border border-[#374151]">
                <p className="text-[#a1a7bb] text-xs font-semibold uppercase">Current Contract Fee</p>
                <p className="text-3xl font-black text-[#14b8a6] font-mono">{feePercentage}%</p>
                <p className="text-xs text-[#a1a7bb] mt-1">
                  Charged on transfers called via addToBlockchain.
                </p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="newFeeInput" className="block text-[#a1a7bb] text-sm font-semibold mb-2">
                  New Fee Percentage (%)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max="10"
                  id="newFeeInput"
                  name="newFee"
                  placeholder="e.g. 1.5"
                  value={newFee}
                  onChange={(e) => setNewFee(e.target.value)}
                  className="w-full px-4 py-3 rounded-2xl premium-input focus:outline-none text-white font-mono"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className={`w-full px-6 py-3 rounded-full font-bold text-white transition duration-300 ${
                  isLoading
                    ? "bg-[#111827] text-slate-550 cursor-not-allowed border border-[#374151]"
                    : "premium-btn"
                }`}
              >
                {isLoading ? "Updating Contract..." : "Update Fee"}
              </button>
            </form>
          </div>
        </div>

        {errorMessage && (
          <div className="bg-[#ea3943]/10 border border-[#ea3943]/30 text-[#ea3943] px-4 py-3 rounded-2xl mt-8 animate-fade-in" role="alert">
            <p className="font-bold">Error</p>
            <p className="text-sm">{errorMessage}</p>
          </div>
        )}

        {successMessage && (
          <div className="bg-[#16c784]/10 border border-[#16c784]/30 text-[#16c784] px-4 py-3 rounded-2xl mt-8 animate-fade-in" role="alert">
            <p className="font-bold">Success</p>
            <p className="text-sm break-all leading-normal">{successMessage}</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default AdminPanel;
