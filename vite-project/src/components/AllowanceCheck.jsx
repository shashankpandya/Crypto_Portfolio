import React, { useState, useContext } from "react";
import { TransactionContext } from "../context/TransactionContext";
import { ethers } from "ethers";
import { checkAllowance } from "../utils/constant";
import { FaSearchDollar, FaCheckCircle } from "react-icons/fa";

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
    <div className="p-8 bg-gray-950 text-white rounded-3xl shadow-2xl border border-gray-800 backdrop-filter backdrop-blur-md relative overflow-hidden max-w-md mx-auto">
      <div className="absolute inset-0 bg-shine opacity-10 pointer-events-none"></div>
      <div className="relative z-10">
        <h2 className="text-3xl font-extrabold mb-6 text-teal-400 flex items-center justify-center tracking-tight">
          <FaSearchDollar className="mr-2 text-teal-500" /> Check Allowance
        </h2>
        <p className="text-center text-sm text-gray-400 mb-8">
          Verify the allowance limit that a spender address can transfer from your wallet
        </p>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="spenderInput" className="block text-gray-400 text-sm font-semibold mb-2">
              Spender Wallet Address
            </label>
            <div className="relative">
              <input
                type="text"
                id="spenderInput"
                name="spender"
                placeholder="Spender Address (0x...)"
                value={spender}
                onChange={(e) => setSpender(e.target.value)}
                className="w-full px-4 py-3 pl-11 rounded-2xl bg-gray-900 border border-gray-800 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent placeholder-gray-400 text-white transition duration-300 shadow-inner"
                required
              />
              <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none">
                <FaCheckCircle className="text-gray-500 text-sm" />
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className={`w-full px-6 py-3 rounded-full font-bold text-white transition duration-300 ease-in-out transform hover:-translate-y-0.5 hover:shadow-lg shadow-teal-500/10 ${
              isLoading
                ? "bg-gray-850 text-gray-500 cursor-not-allowed border border-gray-800"
                : "bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700"
            }`}
          >
            {isLoading ? "Checking..." : "Check Allowance"}
          </button>
        </form>

        {allowance !== null && (
          <div className="mt-6 p-4 bg-gray-900 bg-opacity-65 border border-gray-850 rounded-2xl animate-fade-in flex flex-col items-center">
            <p className="text-sm font-semibold text-gray-450 mb-1">Allowance Limit:</p>
            <p className="text-2xl font-black text-teal-400 font-mono">
              {ethers.formatEther(allowance)} MTK
            </p>
          </div>
        )}

        {errorMessage && (
          <div className="bg-red-500 bg-opacity-10 border border-red-500/30 text-red-400 px-4 py-3 rounded-2xl mt-6 animate-fade-in" role="alert">
            <p className="font-bold">Error</p>
            <p className="text-sm">{errorMessage}</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default AllowanceCheck;
