import React, { useState, useContext } from "react";
import { TransactionContext } from "../context/TransactionContext";
import { ethers } from "ethers";
import { checkAllowance } from "../utils/constant";

function AllowanceCheck() {
  const { currentAccount } = useContext(TransactionContext);
  const [spender, setSpender] = useState("");
  const [allowance, setAllowance] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage("");
    setAllowance(null);
    setIsLoading(true);

    try {
      if (!currentAccount) {
        throw new Error("Please connect your wallet first using the 'Connect Wallet' button.");
      }

      if (!ethers.isAddress(spender)) {
        throw new Error("Invalid spender address");
      }

      const allowanceAmount = await checkAllowance(currentAccount, spender);
      setAllowance(allowanceAmount);
    } catch (error) {
      console.error("Error checking allowance:", error);
      setErrorMessage(
        error.message || "Error checking allowance. Please try again."
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
          <span className="premium-text-gradient-primary">Check Allowance</span>
        </h2>
        <p className="text-center text-sm text-[#a1a7bb] mb-8">
          Verify the allowance limit that a spender address can transfer from your wallet
        </p>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="spenderInput" className="block text-[#a1a7bb] text-sm font-semibold mb-2">
              Spender Wallet Address
            </label>
            <input
              type="text"
              id="spenderInput"
              name="spender"
              placeholder="Spender Address (0x...)"
              value={spender}
              onChange={(e) => setSpender(e.target.value)}
              className="w-full px-4 py-3 rounded-2xl premium-input focus:outline-none text-white placeholder-gray-550"
              required
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className={`w-full px-6 py-3 rounded-full font-bold text-white transition duration-300 ${
              isLoading
                ? "bg-slate-900 text-slate-550 cursor-not-allowed border border-slate-800"
                : "premium-btn"
            }`}
          >
            {isLoading ? "Checking..." : "Check Allowance"}
          </button>
        </form>

        {allowance !== null && (
          <div className="mt-6 p-4 bg-[#0e0f17]/50 border border-[#2e324d]/80 rounded-2xl animate-fade-in flex flex-col items-center backdrop-filter backdrop-blur-sm shadow-inner">
            <p className="text-sm font-semibold text-[#a1a7bb] mb-1">Allowance Limit:</p>
            <p className="text-2xl font-black text-[#16c784] font-mono">
              {ethers.formatEther(allowance)} MTK
            </p>
          </div>
        )}

        {errorMessage && (
          <div className="bg-[#ea3943]/10 border border-[#ea3943]/30 text-[#ea3943] px-4 py-3 rounded-2xl mt-6 animate-fade-in" role="alert">
            <p className="font-bold">Error</p>
            <p className="text-sm">{errorMessage}</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default AllowanceCheck;
