import React, { useState, useContext, useEffect } from "react";
import { TransactionContext } from "../context/TransactionContext";
import { ethers } from "ethers";
import { checkAllowance, approveAllowance } from "../utils/constant";

function ApproveAllowance() {
  const { currentAccount } = useContext(TransactionContext);
  const [spender, setSpender] = useState("");
  const [amount, setAmount] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [currentAllowance, setCurrentAllowance] = useState("0");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (currentAccount && spender) {
      fetchAllowance();
    }
  }, [currentAccount, spender]);

  const fetchAllowance = async () => {
    if (currentAccount && spender) {
      try {
        const allowance = await checkAllowance(currentAccount, spender);
        setCurrentAllowance(ethers.formatEther(allowance));
      } catch (error) {
        console.error("Error fetching allowance:", error);
        setErrorMessage(
          "Unable to fetch current allowance. However, approval transactions should still work."
        );
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");
    setIsLoading(true);

    try {
      if (!currentAccount) {
        throw new Error("Please connect your wallet first using the 'Connect Wallet' button.");
      }

      if (!ethers.isAddress(spender)) {
        throw new Error("Invalid spender address");
      }

      const amountInWei = ethers.parseEther(amount);
      const txHash = await approveAllowance(spender, amountInWei);

      setSuccessMessage(
        `Allowance approved successfully. Transaction hash: ${txHash}`
      );

      // Delay the allowance check to allow time for the transaction to be processed
      setTimeout(async () => {
        try {
          await fetchAllowance();
        } catch (error) {
          console.error("Error fetching updated allowance:", error);
        }
      }, 5000); // Wait for 5 seconds before checking
    } catch (error) {
      console.error("Error approving allowance:", error);
      setErrorMessage(
        error.message || "Error approving allowance. Please try again."
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-8 premium-glow-card text-white rounded-3xl relative overflow-hidden max-w-md mx-auto">
      <div className="absolute inset-0 bg-shine opacity-5 pointer-events-none"></div>
      <div className="relative z-10">
        <h2 className="text-3xl font-extrabold mb-6 text-center tracking-tight">
          <span className="premium-text-gradient-primary">Approve Allowance</span>
        </h2>
        <p className="text-center text-sm text-[#a1a7bb] mb-8">
          Grant permissions to external addresses to swap or transfer your custom tokens
        </p>

        {currentAllowance !== "0" && (
          <div className="mb-6 p-4 bg-[#0e0f17]/50 border border-[#2e324d]/80 rounded-2xl animate-fade-in flex flex-col justify-center items-center backdrop-filter backdrop-blur-sm shadow-inner">
            <p className="text-sm font-semibold text-[#a1a7bb] mb-1">
              Current Allowance:
            </p>
            <p className="text-2xl font-black text-[#16c784] font-mono">
              {currentAllowance} MTK
            </p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="spenderAddressInput" className="block text-[#a1a7bb] text-sm font-semibold mb-2">
              Spender Wallet Address
            </label>
            <input
              type="text"
              id="spenderAddressInput"
              name="spenderAddress"
              placeholder="Spender Address (0x...)"
              value={spender}
              onChange={(e) => setSpender(e.target.value)}
              className="w-full px-4 py-3 rounded-2xl premium-input focus:outline-none text-white placeholder-gray-500"
              required
            />
          </div>

          <div>
            <label htmlFor="approveAmountInput" className="block text-[#a1a7bb] text-sm font-semibold mb-2">
              Allowance Amount (MTK)
            </label>
            <input
              type="text"
              id="approveAmountInput"
              name="approveAmount"
              placeholder="Amount"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full px-4 py-3 rounded-2xl premium-input focus:outline-none text-white placeholder-gray-500"
              required
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className={`w-full px-6 py-3 rounded-full font-bold text-white transition duration-350 ease-in-out ${
              isLoading
                ? "bg-slate-900 text-slate-550 cursor-not-allowed border border-slate-800"
                : "premium-btn"
            }`}
          >
            {isLoading ? "Processing..." : "Approve Allowance"}
          </button>
        </form>

        {errorMessage && (
          <div className="bg-[#ea3943]/10 border border-[#ea3943]/30 text-[#ea3943] px-4 py-3 rounded-2xl mt-6 animate-fade-in" role="alert">
            <p className="font-bold">Error</p>
            <p className="text-sm">{errorMessage}</p>
          </div>
        )}

        {successMessage && (
          <div className="bg-[#16c784]/10 border border-[#16c784]/30 text-[#16c784] px-4 py-3 rounded-2xl mt-6 animate-fade-in" role="alert">
            <p className="font-bold">Success</p>
            <p className="text-sm break-all leading-normal">{successMessage}</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default ApproveAllowance;
