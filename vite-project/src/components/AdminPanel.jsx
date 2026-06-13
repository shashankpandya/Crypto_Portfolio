import React, { useState, useContext, useEffect } from "react";
import { TransactionContext } from "../context/TransactionContext";
import { FaUserShield, FaSlidersH, FaLink, FaCoins } from "react-icons/fa";

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
    <div className="p-8 bg-gray-950 text-white rounded-3xl shadow-2xl border border-gray-800 backdrop-filter backdrop-blur-md relative overflow-hidden max-w-4xl mx-auto">
      <div className="absolute inset-0 bg-shine opacity-10 pointer-events-none"></div>
      <div className="relative z-10">
        <h2 className="text-4xl font-extrabold mb-8 text-teal-400 flex items-center justify-center tracking-tight">
          <FaUserShield className="mr-3 text-teal-500" /> Admin Control Panel
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Contract Metadata Card */}
          <div className="bg-gray-900 bg-opacity-50 p-6 rounded-2xl shadow-xl border border-gray-850 backdrop-filter backdrop-blur-sm">
            <h3 className="text-2xl font-bold mb-6 text-teal-400 flex items-center border-b border-gray-850 pb-3">
              <FaLink className="mr-2 text-teal-500" /> Contract Details
            </h3>
            <div className="space-y-4 text-sm text-gray-300">
              <div>
                <p className="text-gray-500 text-xs font-semibold uppercase">Token Name</p>
                <p className="text-white font-bold text-lg">{contractInfo?.name || "MyToken"}</p>
              </div>
              <div>
                <p className="text-gray-500 text-xs font-semibold uppercase">Token Symbol</p>
                <p className="text-white font-mono font-bold text-lg">{contractInfo?.symbol || "MTK"}</p>
              </div>
              <div>
                <p className="text-gray-500 text-xs font-semibold uppercase">Total Supply</p>
                <p className="text-white font-mono font-bold text-lg">
                  {contractInfo ? (Number(contractInfo.totalSupply) / 10 ** Number(contractInfo.decimals)).toLocaleString() : "1,000,000"} MTK
                </p>
              </div>
              <div className="border-t border-gray-850 pt-3">
                <p className="text-gray-500 text-xs font-semibold uppercase">Contract Owner Address</p>
                <p className="text-white text-xs break-all font-mono">
                  {contractOwner || "0x0000..."}
                </p>
              </div>
              <div>
                <p className="text-gray-500 text-xs font-semibold uppercase">Connected Admin Wallet</p>
                <p className="text-white text-xs break-all font-mono">
                  {currentAccount || "Not connected"}
                </p>
              </div>
            </div>
          </div>

          {/* Action Card: Update Fee */}
          <div className="bg-gray-900 bg-opacity-50 p-6 rounded-2xl shadow-xl border border-gray-850 backdrop-filter backdrop-blur-sm flex flex-col justify-between">
            <div>
              <h3 className="text-2xl font-bold mb-6 text-teal-400 flex items-center border-b border-gray-850 pb-3">
                <FaSlidersH className="mr-2 text-teal-500" /> Fee Management
              </h3>
              <div className="mb-6 p-4 bg-gray-950 rounded-2xl border border-gray-850">
                <p className="text-gray-500 text-xs font-semibold uppercase">Current Contract Fee</p>
                <p className="text-3xl font-black text-teal-400 font-mono">{feePercentage}%</p>
                <p className="text-xs text-gray-500 mt-1">
                  Charged on transfers called via addToBlockchain.
                </p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="newFeeInput" className="block text-gray-400 text-sm font-semibold mb-2">
                  New Fee Percentage (%)
                </label>
                <div className="relative">
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
                    className="w-full px-4 py-3 pl-11 rounded-2xl bg-gray-950 border border-gray-850 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent placeholder-gray-500 text-white font-mono transition duration-300"
                    required
                  />
                  <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none">
                    <FaCoins className="text-gray-500" />
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
                {isLoading ? "Updating Contract..." : "Update Fee"}
              </button>
            </form>
          </div>
        </div>

        {errorMessage && (
          <div className="bg-red-500 bg-opacity-10 border border-red-500/30 text-red-400 px-4 py-3 rounded-2xl mt-8 animate-fade-in" role="alert">
            <p className="font-bold">Error</p>
            <p className="text-sm">{errorMessage}</p>
          </div>
        )}

        {successMessage && (
          <div className="bg-green-500 bg-opacity-10 border border-green-500/30 text-emerald-400 px-4 py-3 rounded-2xl mt-8 animate-fade-in" role="alert">
            <p className="font-bold">Success</p>
            <p className="text-sm break-all leading-normal">{successMessage}</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default AdminPanel;
