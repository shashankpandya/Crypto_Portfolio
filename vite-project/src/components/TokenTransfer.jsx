import React, { useContext, useState } from "react";
import { TransactionContext } from "../context/TransactionContext";
import { FaEthereum, FaPaperPlane } from "react-icons/fa";

// TokenTransfer component allows the user to transfer tokens to another address
function TokenTransfer() {
  const { formData, handleChange, sendTransaction } =
    useContext(TransactionContext);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();

    const { addressTo, amount } = formData;

    if (!addressTo || !amount) {
      setErrorMessage("Please fill in all required fields.");
      return;
    }

    try {
      setLoading(true);
      setErrorMessage("");
      setSuccessMessage("");

      const result = await sendTransaction();

      setSuccessMessage("Transaction sent. Waiting for confirmation...");

      await result.wait();

      setSuccessMessage(`Transaction successful! Hash: ${result.hash}`);
    } catch (error) {
      if (error.message === "Transaction was rejected in MetaMask.") {
        setErrorMessage(
          "Transaction was rejected. You can try again when you're ready."
        );
      } else {
        setErrorMessage(
          "Transaction error: " + (error.message || "Unknown error occurred")
        );
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen rounded-xl bg-gradient-to-br from-gray-900 via-gray-700 to-black text-white relative overflow-hidden">
      <div className="absolute inset-0 bg-shine"></div>
      <div className="relative z-10 p-8">
        <div className="max-w-md mx-auto bg-gray-800 bg-opacity-80 rounded-2xl shadow-2xl p-8 backdrop-filter backdrop-blur-sm">
          <h2 className="text-3xl font-bold mb-6 text-teal-400 flex items-center justify-center">
            <FaEthereum className="mr-2" /> ETH Transfer
          </h2>
          <div className="space-y-6">
            <div className="relative">
              <input
                type="text"
                placeholder="Recipient Address"
                name="addressTo"
                onChange={(e) => handleChange(e, "addressTo")}
                className="w-full px-4 py-3 pl-10 rounded-lg bg-gray-700 border border-gray-600 focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-transparent placeholder-gray-400 transition duration-300"
              />
              <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                <FaPaperPlane className="text-gray-400" />
              </div>
            </div>
            <input
              type="text"
              placeholder="Amount (ETH)"
              name="amount"
              onChange={(e) => handleChange(e, "amount")}
              className="w-full px-4 py-3 rounded-lg bg-gray-700 border border-gray-600 focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-transparent placeholder-gray-400 transition duration-300"
            />
            <textarea
              placeholder="Message (optional)"
              name="message"
              onChange={(e) => handleChange(e, "message")}
              className="w-full px-4 py-3 rounded-lg bg-gray-700 border border-gray-600 focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-transparent placeholder-gray-400 transition duration-300 resize-none h-24"
            />
            <button
              onClick={handleSubmit}
              disabled={loading}
              className={`w-full px-6 py-3 rounded-lg font-semibold text-white ${
                loading
                  ? "bg-gray-600 cursor-not-allowed"
                  : "bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700"
              } transition duration-300 ease-in-out transform hover:-translate-y-1 hover:shadow-lg`}
            >
              {loading ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Processing...
                </span>
              ) : (
                "Transfer"
              )}
            </button>
          </div>
          {errorMessage && (
            <div className="bg-red-500 bg-opacity-80 text-white px-4 py-3 rounded-lg mt-6 animate-fade-in" role="alert">
              <p className="font-bold">Error</p>
              <p className="text-sm">{errorMessage}</p>
            </div>
          )}
          {successMessage && (
            <div className="bg-green-500 bg-opacity-80 text-white px-4 py-3 rounded-lg mt-6 animate-fade-in" role="alert">
              <p className="font-bold">Success</p>
              <p className="text-sm break-words">{successMessage}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default TokenTransfer;
