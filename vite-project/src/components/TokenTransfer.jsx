import React, { useContext, useState } from "react";
import { TransactionContext } from "../context/TransactionContext";
import { FaEthereum, FaPlus, FaTrash, FaListUl, FaUser } from "react-icons/fa";

// TokenTransfer component allows the user to transfer tokens or perform batch transfers
function TokenTransfer() {
  const { currentAccount, formData, handleChange, sendTransaction, sendBatchTransaction } =
    useContext(TransactionContext);
  
  const [activeTab, setActiveTab] = useState("single"); // "single" or "batch"
  const [batchRecipients, setBatchRecipients] = useState([{ address: "", amount: "" }]);
  const [batchMessage, setBatchMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const addBatchRow = () => {
    setBatchRecipients([...batchRecipients, { address: "", amount: "" }]);
  };

  const removeBatchRow = (index) => {
    if (batchRecipients.length === 1) return;
    setBatchRecipients(batchRecipients.filter((_, i) => i !== index));
  };

  const handleBatchChange = (index, field, value) => {
    const updated = [...batchRecipients];
    updated[index][field] = value;
    setBatchRecipients(updated);
  };

  const handleSingleSubmit = async (e) => {
    e.preventDefault();

    if (!currentAccount) {
      setErrorMessage("Please connect your wallet first using the 'Connect Wallet' button.");
      return;
    }

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
        setErrorMessage("Transaction was rejected. You can try again when you're ready.");
      } else {
        setErrorMessage("Transaction error: " + (error.message || "Unknown error occurred"));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleBatchSubmit = async (e) => {
    e.preventDefault();

    if (!currentAccount) {
      setErrorMessage("Please connect your wallet first.");
      return;
    }

    // Validate rows
    const receivers = [];
    const amounts = [];
    for (let i = 0; i < batchRecipients.length; i++) {
      const { address, amount } = batchRecipients[i];
      if (!address || !amount) {
        setErrorMessage(`Please fill out all fields in row ${i + 1}.`);
        return;
      }
      receivers.push(address);
      amounts.push(amount);
    }

    try {
      setLoading(true);
      setErrorMessage("");
      setSuccessMessage("");

      const result = await sendBatchTransaction(receivers, amounts, batchMessage);
      setSuccessMessage("Batch transaction sent. Waiting for confirmation...");
      await result.wait();
      setSuccessMessage(`Batch transaction successful! Hash: ${result.hash}`);
      setBatchRecipients([{ address: "", amount: "" }]);
      setBatchMessage("");
    } catch (error) {
      setErrorMessage("Batch transaction error: " + (error.message || "Unknown error occurred"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 bg-gray-950 text-white rounded-3xl shadow-2xl border border-gray-800 backdrop-filter backdrop-blur-md relative overflow-hidden max-w-2xl mx-auto">
      <div className="absolute inset-0 bg-shine opacity-10 pointer-events-none"></div>
      <div className="relative z-10">
        {/* Header */}
        <h2 className="text-4xl font-extrabold mb-6 text-teal-400 flex items-center justify-center tracking-tight">
          <FaEthereum className="mr-2 text-teal-500 animate-pulse" /> Token Transfer Center
        </h2>
        <p className="text-center text-sm text-gray-400 mb-8">
          Send ERC20 custom tokens to single or multiple destination addresses
        </p>

        {/* Tab Selector */}
        <div className="flex border-b border-gray-800 mb-8 bg-gray-900 bg-opacity-40 p-1 rounded-2xl border">
          <button
            type="button"
            onClick={() => {
              setActiveTab("single");
              setErrorMessage("");
              setSuccessMessage("");
            }}
            className={`flex-1 py-3 text-center font-bold text-base rounded-xl transition duration-300 ${
              activeTab === "single"
                ? "bg-teal-500 text-white shadow-lg shadow-teal-500/20"
                : "text-gray-400 hover:text-white"
            }`}
          >
            Single Transfer
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab("batch");
              setErrorMessage("");
              setSuccessMessage("");
            }}
            className={`flex-1 py-3 text-center font-bold text-base rounded-xl transition duration-300 ${
              activeTab === "batch"
                ? "bg-teal-500 text-white shadow-lg shadow-teal-500/20"
                : "text-gray-400 hover:text-white"
            }`}
          >
            Batch Transfer
          </button>
        </div>

        {/* Error and Success Messages */}
        {errorMessage && (
          <div className="bg-red-500 bg-opacity-10 border border-red-500/30 text-red-400 px-4 py-3 rounded-2xl mb-6 animate-fade-in" role="alert">
            <p className="font-bold">Error</p>
            <p className="text-sm">{errorMessage}</p>
          </div>
        )}
        {successMessage && (
          <div className="bg-green-500 bg-opacity-10 border border-green-500/30 text-emerald-400 px-4 py-3 rounded-2xl mb-6 animate-fade-in" role="alert">
            <p className="font-bold">Success</p>
            <p className="text-sm break-all">{successMessage}</p>
          </div>
        )}

        {/* Single Transfer Form */}
        {activeTab === "single" && (
          <form onSubmit={handleSingleSubmit} className="space-y-6">
            <div>
              <label htmlFor="addressToInput" className="block text-gray-400 text-sm font-semibold mb-2">
                Recipient Wallet Address
              </label>
              <div className="relative">
                <input
                  type="text"
                  id="addressToInput"
                  placeholder="0x..."
                  name="addressTo"
                  value={formData.addressTo || ""}
                  onChange={(e) => handleChange(e, "addressTo")}
                  className="w-full px-4 py-3 pl-11 rounded-2xl bg-gray-900 border border-gray-800 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent placeholder-gray-500 text-white transition duration-300 shadow-inner"
                  required
                />
                <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none">
                  <FaUser className="text-gray-500 text-sm" />
                </div>
              </div>
            </div>

            <div>
              <label htmlFor="amountInput" className="block text-gray-400 text-sm font-semibold mb-2">
                Amount (MTK)
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="any"
                  min="0"
                  id="amountInput"
                  placeholder="0.0"
                  name="amount"
                  value={formData.amount || ""}
                  onChange={(e) => handleChange(e, "amount")}
                  className="w-full px-4 py-3 pl-11 rounded-2xl bg-gray-900 border border-gray-800 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent placeholder-gray-500 text-white transition duration-300 shadow-inner"
                  required
                />
                <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none">
                  <FaEthereum className="text-gray-500 text-sm" />
                </div>
              </div>
            </div>

            <div>
              <label htmlFor="messageInput" className="block text-gray-400 text-sm font-semibold mb-2">
                Message (Optional)
              </label>
              <textarea
                id="messageInput"
                placeholder="What's this transaction for?"
                name="message"
                value={formData.message || ""}
                onChange={(e) => handleChange(e, "message")}
                className="w-full px-4 py-3 rounded-2xl bg-gray-900 border border-gray-800 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent placeholder-gray-500 text-white transition duration-300 resize-none h-24 shadow-inner"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className={`w-full px-6 py-3 rounded-full font-bold text-white transition duration-300 ease-in-out transform hover:-translate-y-0.5 hover:shadow-lg shadow-teal-500/10 ${
                loading
                  ? "bg-gray-850 text-gray-500 cursor-not-allowed border border-gray-800"
                  : "bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700"
              }`}
            >
              {loading ? "Processing..." : "Transfer Tokens"}
            </button>
          </form>
        )}

        {/* Batch Transfer Form */}
        {activeTab === "batch" && (
          <form onSubmit={handleBatchSubmit} className="space-y-6">
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-gray-300 font-bold text-base flex items-center">
                  <FaListUl className="mr-2 text-teal-400" /> Recipients List
                </span>
                <button
                  type="button"
                  onClick={addBatchRow}
                  className="bg-teal-500/10 border border-teal-500/30 hover:bg-teal-500 hover:text-white text-teal-400 px-3.5 py-1.5 rounded-full text-xs font-bold flex items-center transition duration-200"
                >
                  <FaPlus className="mr-1" /> Add Recipient
                </button>
              </div>

              <div className="max-h-60 overflow-y-auto space-y-3 pr-2 border-t border-b border-gray-850 py-4">
                {batchRecipients.map((recipient, index) => (
                  <div key={index} className="flex space-x-3 items-end bg-gray-900 bg-opacity-30 p-3.5 rounded-2xl border border-gray-850 relative">
                    <div className="flex-1">
                      <label htmlFor={`batchAddressInput_${index}`} className="block text-gray-400 text-xs font-semibold mb-1">
                        #{index + 1} Recipient Wallet Address
                      </label>
                      <input
                        type="text"
                        id={`batchAddressInput_${index}`}
                        placeholder="0x..."
                        name={`batchAddress_${index}`}
                        value={recipient.address}
                        onChange={(e) => handleBatchChange(index, "address", e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-gray-950 border border-gray-850 focus:outline-none focus:ring-1 focus:ring-teal-400 text-sm text-white placeholder-gray-500"
                        required
                      />
                    </div>
                    <div className="w-1/3">
                      <label htmlFor={`batchAmountInput_${index}`} className="block text-gray-400 text-xs font-semibold mb-1">
                        Amount (MTK)
                      </label>
                      <input
                        type="number"
                        step="any"
                        min="0"
                        id={`batchAmountInput_${index}`}
                        placeholder="0.0"
                        name={`batchAmount_${index}`}
                        value={recipient.amount}
                        onChange={(e) => handleBatchChange(index, "amount", e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-gray-950 border border-gray-850 focus:outline-none focus:ring-1 focus:ring-teal-400 text-sm text-white placeholder-gray-500"
                        required
                      />
                    </div>
                    {batchRecipients.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeBatchRow(index)}
                        className="bg-rose-500/10 hover:bg-rose-500 hover:text-white text-rose-400 p-2.5 rounded-xl transition duration-200 border border-rose-500/25"
                        aria-label={`Remove recipient ${index + 1}`}
                      >
                        <FaTrash className="text-xs" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div>
              <label htmlFor="batchMessageInput" className="block text-gray-400 text-sm font-semibold mb-2">
                Common Message (Optional)
              </label>
              <textarea
                id="batchMessageInput"
                placeholder="Reason for this batch transfer..."
                name="batchMessage"
                value={batchMessage}
                onChange={(e) => setBatchMessage(e.target.value)}
                className="w-full px-4 py-3 rounded-2xl bg-gray-900 border border-gray-800 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent placeholder-gray-500 text-white transition duration-300 resize-none h-24 shadow-inner"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className={`w-full px-6 py-3 rounded-full font-bold text-white transition duration-300 ease-in-out transform hover:-translate-y-0.5 hover:shadow-lg shadow-teal-500/10 ${
                loading
                  ? "bg-gray-850 text-gray-500 cursor-not-allowed border border-gray-800"
                  : "bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700"
              }`}
            >
              {loading ? "Processing Batch..." : `Send Batch (${batchRecipients.length} transfers)`}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

export default TokenTransfer;
