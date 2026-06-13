import React, { useState, useContext, useEffect } from "react";
import { TransactionContext } from "../context/TransactionContext";
import { ethers } from "ethers";
import { checkAllowance, approveAllowance } from "../utils/constant";
import { FaCoins, FaCheckCircle, FaInfoCircle } from "react-icons/fa";

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
    <div className="p-8 bg-gray-950 text-white rounded-3xl shadow-2xl border border-gray-800 backdrop-filter backdrop-blur-md relative overflow-hidden max-w-md mx-auto">
      <div className="absolute inset-0 bg-shine opacity-10 pointer-events-none"></div>
      <div className="relative z-10">
        <h2 className="text-3xl font-extrabold mb-6 text-teal-400 flex items-center justify-center tracking-tight">
          <FaCoins className="mr-2 text-teal-500" /> Approve Allowance
        </h2>
        <p className="text-center text-sm text-gray-400 mb-8">
          Grant permissions to external addresses to swap or transfer your custom tokens
        </p>

        {currentAllowance !== "0" && (
          <div className="mb-6 p-4 bg-gray-900 bg-opacity-60 border border-gray-850 rounded-2xl animate-fade-in flex flex-col justify-center items-center">
            <p className="text-sm font-semibold text-gray-400 flex items-center mb-1">
              <FaInfoCircle className="mr-1.5 text-teal-400" /> Current Allowance:
            </p>
            <p className="text-2xl font-black text-teal-400 font-mono">
              {currentAllowance} MTK
            </p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="spenderAddressInput" className="block text-gray-400 text-sm font-semibold mb-2">
              Spender Wallet Address
            </label>
            <div className="relative">
              <input
                type="text"
                id="spenderAddressInput"
                name="spenderAddress"
                placeholder="Spender Address (0x...)"
                value={spender}
                onChange={(e) => setSpender(e.target.value)}
                className="w-full px-4 py-3 pl-11 rounded-2xl bg-gray-900 border border-gray-800 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent placeholder-gray-500 text-white transition duration-300 shadow-inner"
                required
              />
              <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none">
                <FaCheckCircle className="text-gray-500 text-sm" />
              </div>
            </div>
          </div>

          <div>
            <label htmlFor="approveAmountInput" className="block text-gray-400 text-sm font-semibold mb-2">
              Allowance Amount (MTK)
            </label>
            <div className="relative">
              <input
                type="text"
                id="approveAmountInput"
                name="approveAmount"
                placeholder="Amount"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full px-4 py-3 pl-11 rounded-2xl bg-gray-900 border border-gray-800 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent placeholder-gray-500 text-white transition duration-300 shadow-inner"
                required
              />
              <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none">
                <FaCoins className="text-gray-500 text-sm" />
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className={`w-full px-6 py-3 rounded-full font-bold text-white transition duration-350 ease-in-out transform hover:-translate-y-0.5 hover:shadow-lg shadow-teal-500/10 ${
              isLoading
                ? "bg-gray-850 text-gray-500 cursor-not-allowed border border-gray-800"
                : "bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700"
            }`}
          >
            {isLoading ? "Processing..." : "Approve Allowance"}
          </button>
        </form>

        {errorMessage && (
          <div className="bg-red-500 bg-opacity-10 border border-red-500/30 text-red-400 px-4 py-3 rounded-2xl mt-6 animate-fade-in" role="alert">
            <p className="font-bold">Error</p>
            <p className="text-sm">{errorMessage}</p>
          </div>
        )}

        {successMessage && (
          <div className="bg-green-500 bg-opacity-10 border border-green-500/30 text-emerald-400 px-4 py-3 rounded-2xl mt-6 animate-fade-in" role="alert">
            <p className="font-bold">Success</p>
            <p className="text-sm break-all leading-normal">{successMessage}</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default ApproveAllowance;
