import React, { useState, useContext, useEffect } from "react";
import { TransactionContext } from "../context/TransactionContext";
import { ethers } from "ethers";
import { checkAllowance, approveAllowance } from "../utils/constant";

const isValidAddress = (addr) => {
  return /^0x[a-fA-F0-9]{40}$/.test(addr);
};

function AllowanceManager() {
  const { currentAccount } = useContext(TransactionContext);
  const [activeTab, setActiveTab] = useState("check");
  const [spender, setSpender] = useState("");
  const [amount, setAmount] = useState("");
  const [currentAllowance, setCurrentAllowance] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [addressValid, setAddressValid] = useState(null);

  useEffect(() => {
    setErrorMessage("");
    setSuccessMessage("");
    setCurrentAllowance(null);
  }, [activeTab]);

  const handleAddressBlur = () => {
    if (!spender) setAddressValid(null);
    else setAddressValid(isValidAddress(spender));
  };

  const handleCheck = async (e) => {
    e.preventDefault();
    if (!currentAccount) {
      setErrorMessage("Please connect your wallet first.");
      return;
    }
    if (!isValidAddress(spender)) {
      setErrorMessage("Invalid spender address.");
      return;
    }

    setErrorMessage("");
    setCurrentAllowance(null);
    setIsLoading(true);

    try {
      const allowanceVal = await checkAllowance(currentAccount, spender);
      setCurrentAllowance(ethers.formatEther(allowanceVal));
    } catch (error) {
      console.error("Error checking allowance:", error);
      setErrorMessage(error.message || "Error checking allowance. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleApprove = async (e) => {
    e.preventDefault();
    if (!currentAccount) {
      setErrorMessage("Please connect your wallet first.");
      return;
    }
    if (!isValidAddress(spender)) {
      setErrorMessage("Invalid spender address.");
      return;
    }
    if (!amount || parseFloat(amount) <= 0) {
      setErrorMessage("Please enter a valid amount greater than 0.");
      return;
    }

    setErrorMessage("");
    setSuccessMessage("");
    setIsLoading(true);

    try {
      const amountInWei = ethers.parseEther(amount);
      const txHash = await approveAllowance(spender, amountInWei);
      setSuccessMessage(`Approval transaction sent. Hash: ${txHash}`);

      // Wait 5 seconds and check updated allowance
      setTimeout(async () => {
        try {
          const allowanceVal = await checkAllowance(currentAccount, spender);
          setCurrentAllowance(ethers.formatEther(allowanceVal));
        } catch (err) {
          console.error("Error updating allowance:", err);
        }
      }, 5000);
    } catch (error) {
      console.error("Error approving allowance:", error);
      setErrorMessage(error.message || "Error approving allowance. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="page-container text-white max-w-md">
      {/* Header */}
      <div className="mb-6 flex flex-col items-center justify-center text-center">
        <h1 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
          <span className="premium-text-gradient-primary">Token Allowance</span>
        </h1>
        <p className="text-xs text-[#71717a] mt-1.5 max-w-sm">
          Check or approve spend permissions granted to external decentralized applications.
        </p>
      </div>

      <div className="w-full bg-[#0c1118] border border-white/5 rounded-lg p-5 shadow-lg relative">
        {/* Tabs */}
        <div className="flex mb-5 bg-[#050811] p-1 rounded border border-white/5 font-semibold text-xs select-none">
          <button
            type="button"
            onClick={() => setActiveTab("check")}
            className={`flex-1 py-1.5 text-center rounded transition duration-200 ${
              activeTab === "check"
                ? "bg-white/[0.04] text-white border border-white/5"
                : "text-[#71717a] hover:text-white"
            }`}
          >
            Check Allowance
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("approve")}
            className={`flex-1 py-1.5 text-center rounded transition duration-200 ${
              activeTab === "approve"
                ? "bg-white/[0.04] text-white border border-white/5"
                : "text-[#71717a] hover:text-white"
            }`}
          >
            Approve Spender
          </button>
        </div>

        {/* Status Messages */}
        {errorMessage && (
          <div className="bg-[#EF4444]/10 border border-[#EF4444]/20 text-[#EF4444] px-3.5 py-2 rounded text-xs mb-4" role="alert">
            <p className="font-bold">Error</p>
            <p className="opacity-90 mt-0.5">{errorMessage}</p>
          </div>
        )}
        {successMessage && (
          <div className="bg-[#10B981]/10 border border-[#10B981]/20 text-[#10B981] px-3.5 py-2 rounded text-xs mb-4" role="alert">
            <p className="font-bold">Success</p>
            <p className="opacity-90 mt-0.5 break-all">{successMessage}</p>
          </div>
        )}

        {/* Check/Approve Spender Inputs */}
        <form onSubmit={activeTab === "check" ? handleCheck : handleApprove} className="space-y-4">
          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label htmlFor="spenderAddress" className="text-[#a1a7bb] text-xs font-semibold">
                Spender Wallet Address
              </label>
              {addressValid !== null && (
                <span className={`text-[10px] font-bold ${addressValid ? "text-[#10B981]" : "text-[#EF4444]"}`}>
                  {addressValid ? "✓ Valid Address" : "✗ Invalid Address"}
                </span>
              )}
            </div>
            <input
              type="text"
              id="spenderAddress"
              placeholder="0x..."
              value={spender}
              onChange={(e) => setSpender(e.target.value)}
              onBlur={handleAddressBlur}
              className={`w-full h-10 px-3 text-xs rounded premium-input font-mono focus:outline-none text-white placeholder-[#71717a] ${
                addressValid === true ? "border-[#10B981]" : addressValid === false ? "border-[#EF4444]" : ""
              }`}
              required
            />
          </div>

          {activeTab === "approve" && (
            <div>
              <label htmlFor="approveAmount" className="block text-[#a1a7bb] text-xs font-semibold mb-1.5">
                Approve Amount (MTK)
              </label>
              <input
                type="number"
                step="any"
                min="0"
                id="approveAmount"
                placeholder="0.0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full h-10 px-3 text-xs rounded premium-input font-mono focus:outline-none text-white placeholder-[#71717a]"
                required
              />
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className={`w-full h-10 rounded-lg text-xs font-bold text-white transition duration-200 ${
              isLoading
                ? "bg-white/5 text-[#71717a] border border-white/5 cursor-not-allowed"
                : "premium-btn"
            }`}
          >
            {isLoading ? "Processing Contract Call..." : activeTab === "check" ? "Check Allowance" : "Approve Allowance"}
          </button>
        </form>

        {/* Premium Glow Gradient Results Card (No flat cyan) */}
        {currentAllowance !== null && (
          <div className="mt-5 p-4 rounded bg-gradient-to-br from-[#FF385C]/05 via-[#0b0f19] to-[#2563EB]/05 border border-white/5 shadow-lg relative overflow-hidden animate-fade-in flex flex-col justify-center items-center">
            {/* Subtle top glow line */}
            <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-[#FF385C]/20 to-transparent"></div>
            <p className="text-[#a1a7bb] text-[10px] uppercase font-bold tracking-wider mb-1">
              Spendable Allowance Limit
            </p>
            <p className="text-2xl font-bold font-mono text-white">
              {parseFloat(currentAllowance).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}{" "}
              <span className="text-xs text-[#71717a] font-normal font-sans ml-1">MTK</span>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default AllowanceManager;
