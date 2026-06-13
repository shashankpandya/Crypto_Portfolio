import React, { useContext, useState } from "react";
import { TransactionContext } from "../context/TransactionContext";

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
    <div className="p-8 premium-glow-card text-white rounded-3xl relative overflow-hidden max-w-2xl mx-auto">
      <div className="absolute inset-0 bg-shine opacity-5 pointer-events-none"></div>
      <div className="relative z-10">
        {/* Header */}
        <h2 className="text-4xl font-extrabold mb-6 text-center tracking-tight">
          <span className="premium-text-gradient-primary">Token Transfer Center</span>
        </h2>
        <p className="text-center text-sm text-[#a1a7bb] mb-8">
          Send ERC20 custom tokens to single or multiple destination addresses
        </p>

        {/* Tab Selector */}
        <div className="flex mb-8 bg-[#111827]/50 p-1 rounded-2xl border border-[#374151]/80">
          <button
            type="button"
            onClick={() => {
              setActiveTab("single");
              setErrorMessage("");
              setSuccessMessage("");
            }}
            className={`flex-1 py-3 text-center font-bold text-base rounded-xl transition duration-300 ${
              activeTab === "single"
                ? "premium-btn text-white shadow-lg shadow-teal-500/20"
                : "text-gray-405 hover:text-white"
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
                ? "premium-btn text-white shadow-lg shadow-teal-500/20"
                : "text-gray-405 hover:text-white"
            }`}
          >
            Batch Transfer
          </button>
        </div>

        {/* Error and Success Messages */}
        {errorMessage && (
          <div className="bg-[#ea3943]/10 border border-[#ea3943]/30 text-[#ea3943] px-4 py-3 rounded-2xl mb-6 animate-fade-in" role="alert">
            <p className="font-bold">Error</p>
            <p className="text-sm">{errorMessage}</p>
          </div>
        )}
        {successMessage && (
          <div className="bg-[#16c784]/10 border border-[#16c784]/30 text-[#16c784] px-4 py-3 rounded-2xl mb-6 animate-fade-in" role="alert">
            <p className="font-bold">Success</p>
            <p className="text-sm break-all">{successMessage}</p>
          </div>
        )}

        {/* Single Transfer Form */}
        {activeTab === "single" && (
          <form onSubmit={handleSingleSubmit} className="space-y-6">
            <div>
              <label htmlFor="addressToInput" className="block text-[#a1a7bb] text-sm font-semibold mb-2">
                Recipient Wallet Address
              </label>
              <input
                type="text"
                id="addressToInput"
                placeholder="0x..."
                name="addressTo"
                value={formData.addressTo || ""}
                onChange={(e) => handleChange(e, "addressTo")}
                className="w-full px-4 py-3 rounded-2xl premium-input focus:outline-none text-white placeholder-gray-500"
                required
              />
            </div>

            <div>
              <label htmlFor="amountInput" className="block text-[#a1a7bb] text-sm font-semibold mb-2">
                Amount (MTK)
              </label>
              <input
                type="number"
                step="any"
                min="0"
                id="amountInput"
                placeholder="0.0"
                name="amount"
                value={formData.amount || ""}
                onChange={(e) => handleChange(e, "amount")}
                className="w-full px-4 py-3 rounded-2xl premium-input focus:outline-none text-white placeholder-gray-500"
                required
              />
            </div>

            <div>
              <label htmlFor="messageInput" className="block text-[#a1a7bb] text-sm font-semibold mb-2">
                Message (Optional)
              </label>
              <textarea
                id="messageInput"
                placeholder="What's this transaction for?"
                name="message"
                value={formData.message || ""}
                onChange={(e) => handleChange(e, "message")}
                className="w-full px-4 py-3 rounded-2xl premium-input focus:outline-none text-white placeholder-gray-500 resize-none h-24"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className={`w-full px-6 py-3 rounded-full font-bold text-white transition duration-300 ${
                loading
                  ? "bg-slate-900 text-slate-550 cursor-not-allowed border border-slate-800"
                  : "premium-btn"
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
                <span className="text-gray-300 font-bold text-base">
                  Recipients List
                </span>
                <button
                  type="button"
                  onClick={addBatchRow}
                  className="bg-[#14b8a6]/10 border border-[#14b8a6]/30 hover:bg-[#14b8a6] hover:text-white text-[#14b8a6] px-4 py-1.5 rounded-full text-xs font-bold transition duration-200"
                >
                  Add Recipient +
                </button>
              </div>

              <div className="max-h-60 overflow-y-auto space-y-3 pr-2 border-t border-b border-[#374151]/60 py-4">
                {batchRecipients.map((recipient, index) => (
                  <div key={index} className="flex space-x-3 items-end bg-[#111827]/40 p-3.5 rounded-2xl border border-[#374151]/60 relative">
                    <div className="flex-1">
                      <label htmlFor={`batchAddressInput_${index}`} className="block text-[#a1a7bb] text-xs font-semibold mb-1">
                        #{index + 1} Recipient Wallet Address
                      </label>
                      <input
                        type="text"
                        id={`batchAddressInput_${index}`}
                        placeholder="0x..."
                        name={`batchAddress_${index}`}
                        value={recipient.address}
                        onChange={(e) => handleBatchChange(index, "address", e.target.value)}
                        className="w-full px-3 py-2 rounded-xl premium-input focus:outline-none text-sm text-white placeholder-gray-550"
                        required
                      />
                    </div>
                    <div className="w-1/3">
                      <label htmlFor={`batchAmountInput_${index}`} className="block text-[#a1a7bb] text-xs font-semibold mb-1">
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
                        className="w-full px-3 py-2 rounded-xl premium-input focus:outline-none text-sm text-white placeholder-gray-550"
                        required
                      />
                    </div>
                    {batchRecipients.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeBatchRow(index)}
                        className="bg-[#ea3943]/10 hover:bg-[#ea3943] hover:text-white text-[#ea3943] px-3.5 py-2 text-xs font-bold rounded-xl transition duration-200 border border-[#ea3943]/20"
                        aria-label={`Remove recipient ${index + 1}`}
                      >
                        Delete
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div>
              <label htmlFor="batchMessageInput" className="block text-[#a1a7bb] text-sm font-semibold mb-2">
                Common Message (Optional)
              </label>
              <textarea
                id="batchMessageInput"
                placeholder="Reason for this batch transfer..."
                name="batchMessage"
                value={batchMessage}
                onChange={(e) => setBatchMessage(e.target.value)}
                className="w-full px-4 py-3 rounded-2xl premium-input focus:outline-none text-white placeholder-gray-500 resize-none h-24"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className={`w-full px-6 py-3 rounded-full font-bold text-white transition duration-300 ${
                loading
                  ? "bg-slate-900 text-slate-550 cursor-not-allowed border border-slate-800"
                  : "premium-btn"
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
