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
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-700 to-black rounded-xl text-white relative overflow-hidden">
      <div className="absolute inset-0 bg-shine"></div>
      <div className="relative z-10 p-8">
        <div className="max-w-md mx-auto bg-gray-800 bg-opacity-80 rounded-2xl shadow-2xl p-8 backdrop-filter backdrop-blur-sm">
          <h2 className="text-3xl font-bold mb-6 text-teal-400 flex items-center justify-center">
            <FaSearchDollar className="mr-2" /> Check Allowance
          </h2>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="relative">
              <input
                type="text"
                placeholder="Spender Address"
                value={spender}
                onChange={(e) => setSpender(e.target.value)}
                className="w-full px-4 py-3 pl-10 rounded-lg bg-gray-700 border border-gray-600 focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-transparent placeholder-gray-400 transition duration-300"
              />
              <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                <FaCheckCircle className="text-gray-400" />
              </div>
            </div>
            <button
              type="submit"
              disabled={isLoading}
              className={`w-full px-6 py-3 rounded-lg font-semibold text-white ${
                isLoading
                  ? "bg-gray-600 cursor-not-allowed"
                  : "bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700"
              } transition duration-300 ease-in-out transform hover:-translate-y-1 hover:shadow-lg`}
            >
              {isLoading ? (
                <span className="flex items-center justify-center">
                  <svg
                    className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  Checking...
                </span>
              ) : (
                "Check Allowance"
              )}
            </button>
          </form>
          {allowance !== null && (
            <div className="mt-6 p-4 bg-gray-700 rounded-lg animate-fade-in">
              <p className="text-lg font-semibold text-white">Allowance:</p>
              <p className="text-2xl font-bold text-teal-400">
                {ethers.formatEther(allowance)} ETH
              </p>
            </div>
          )}
          {errorMessage && (
            <div
              className="bg-red-500 bg-opacity-80 text-white px-4 py-3 rounded-lg mt-6 animate-fade-in"
              role="alert"
            >
              <p className="font-bold">Error</p>
              <p className="text-sm">{errorMessage}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default AllowanceCheck;
