import React, { useContext, useState } from "react";
import { TransactionContext } from "../context/TransactionContext";

const isValidAddress = (addr) => {
  return /^0x[a-fA-F0-9]{40}$/.test(addr);
};

function TokenTransfer() {
  const { currentAccount, formData, handleChange, sendTransaction, sendBatchTransaction } =
    useContext(TransactionContext);
  
  const [activeTab, setActiveTab] = useState("single");
  const [batchRecipients, setBatchRecipients] = useState([{ address: "", amount: "" }]);
  const [batchMessage, setBatchMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  // Validation states for single transfer
  const [singleAddressValid, setSingleAddressValid] = useState(null); // null, true, false
  const [singleAmountValid, setSingleAmountValid] = useState(null);

  // Validation check handlers
  const checkSingleAddress = (val) => {
    if (!val) setSingleAddressValid(null);
    else setSingleAddressValid(isValidAddress(val));
  };

  const checkSingleAmount = (val) => {
    if (!val) setSingleAmountValid(null);
    else setSingleAmountValid(parseFloat(val) > 0);
  };

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
      setErrorMessage("Please connect your wallet first.");
      return;
    }

    const { addressTo, amount } = formData;

    if (!addressTo || !amount) {
      setErrorMessage("Please fill in all required fields.");
      return;
    }

    if (!isValidAddress(addressTo)) {
      setErrorMessage("Invalid recipient Ethereum address.");
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
        setErrorMessage("Transaction was rejected.");
      } else {
        setErrorMessage(error.message || "Unknown error occurred");
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

    const receivers = [];
    const amounts = [];
    for (let i = 0; i < batchRecipients.length; i++) {
      const { address, amount } = batchRecipients[i];
      if (!address || !amount) {
        setErrorMessage(`Please fill out all fields in row ${i + 1}.`);
        return;
      }
      if (!isValidAddress(address)) {
        setErrorMessage(`Invalid address in row ${i + 1}.`);
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
      setErrorMessage(error.message || "Unknown error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-container text-white max-w-md">
      {/* Header */}
      <div className="mb-6 flex flex-col items-center justify-center text-center">
        <h1 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
          <span className="premium-text-gradient-primary">Token Transfer</span>
        </h1>
        <p className="text-xs text-[#71717a] mt-1.5 max-w-sm">
          Send ERC20 custom tokens to single or multiple destination addresses instantly.
        </p>
      </div>

      <div className="w-full bg-[#0c1118] border border-white/5 rounded-lg p-5 shadow-lg relative">
        {/* Tab Selector */}
        <div className="flex mb-5 bg-[#050811] p-1 rounded border border-white/5 font-semibold text-xs select-none">
          <button
            type="button"
            onClick={() => {
              setActiveTab("single");
              setErrorMessage("");
              setSuccessMessage("");
            }}
            className={`flex-1 py-1.5 text-center rounded transition duration-200 ${
              activeTab === "single"
                ? "bg-white/[0.04] text-white border border-white/5"
                : "text-[#71717a] hover:text-white"
            }`}
          >
            Single Address
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab("batch");
              setErrorMessage("");
              setSuccessMessage("");
            }}
            className={`flex-1 py-1.5 text-center rounded transition duration-200 ${
              activeTab === "batch"
                ? "bg-white/[0.04] text-white border border-white/5"
                : "text-[#71717a] hover:text-white"
            }`}
          >
            Batch List
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

        {/* Single Transfer Form */}
        {activeTab === "single" && (
          <form onSubmit={handleSingleSubmit} className="space-y-4">
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label htmlFor="addressToInput" className="text-[#a1a7bb] text-xs font-semibold">
                  Recipient Address
                </label>
                {singleAddressValid !== null && (
                  <span className={`text-[10px] font-bold ${singleAddressValid ? "text-[#10B981]" : "text-[#EF4444]"}`}>
                    {singleAddressValid ? "✓ Valid Address" : "✗ Invalid Address"}
                  </span>
                )}
              </div>
              <input
                type="text"
                id="addressToInput"
                placeholder="0x..."
                name="addressTo"
                value={formData.addressTo || ""}
                onChange={(e) => handleChange(e, "addressTo")}
                onBlur={(e) => checkSingleAddress(e.target.value)}
                className={`w-full h-10 px-3 text-xs rounded premium-input font-mono focus:outline-none text-white placeholder-[#71717a] ${
                  singleAddressValid === true ? "border-[#10B981]" : singleAddressValid === false ? "border-[#EF4444]" : ""
                }`}
                required
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label htmlFor="amountInput" className="text-[#a1a7bb] text-xs font-semibold">
                  Amount (MTK)
                </label>
                <span className="text-[10px] text-[#71717a] font-mono">
                  {formData.amount ? `= $${(parseFloat(formData.amount) * 0.5).toFixed(2)} USD` : ""}
                </span>
              </div>
              <input
                type="number"
                step="any"
                min="0"
                id="amountInput"
                placeholder="0.0"
                name="amount"
                value={formData.amount || ""}
                onChange={(e) => handleChange(e, "amount")}
                onBlur={(e) => checkSingleAmount(e.target.value)}
                className={`w-full h-10 px-3 text-xs rounded premium-input font-mono focus:outline-none text-white placeholder-[#71717a] ${
                  singleAmountValid === true ? "border-[#10B981]" : singleAmountValid === false ? "border-[#EF4444]" : ""
                }`}
                required
              />
            </div>

            <div>
              <label htmlFor="messageInput" className="block text-[#a1a7bb] text-xs font-semibold mb-1.5">
                Memo Message (Optional)
              </label>
              <textarea
                id="messageInput"
                placeholder="Attach a transaction note..."
                name="message"
                value={formData.message || ""}
                onChange={(e) => handleChange(e, "message")}
                className="w-full p-3 text-xs rounded premium-input focus:outline-none text-white placeholder-[#71717a] resize-none h-16"
              />
            </div>

            {/* Gas estimator */}
            <div className="bg-[#050811] p-3 rounded border border-white/5 flex justify-between items-center text-[10px] text-[#71717a] font-mono select-none">
              <span>Estimated Network Fee:</span>
              <span className="text-white">~45,000 Gwei (approx. $0.12)</span>
            </div>

            <button
              type="submit"
              disabled={loading}
              className={`w-full h-10 rounded-lg text-xs font-bold text-white transition duration-200 ${
                loading
                  ? "bg-white/5 text-[#71717a] border border-white/5 cursor-not-allowed"
                  : "premium-btn"
              }`}
            >
              {loading ? "Processing Transfer..." : "Transfer Tokens"}
            </button>
          </form>
        )}

        {/* Batch Transfer Form */}
        {activeTab === "batch" && (
          <form onSubmit={handleBatchSubmit} className="space-y-4">
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-white font-bold text-xs">
                  Recipients List
                </span>
                <button
                  type="button"
                  onClick={addBatchRow}
                  className="bg-white/5 border border-white/5 hover:bg-white/10 text-[#38BDF8] hover:text-white px-2.5 py-1 rounded text-[10px] font-bold transition duration-150"
                >
                  + Add Recipient
                </button>
              </div>

              <div className="max-h-48 overflow-y-auto space-y-2.5 pr-1 py-1 border-t border-b border-white/5">
                {batchRecipients.map((recipient, index) => (
                  <div key={index} className="flex space-x-2 items-end bg-[#050811] p-2.5 rounded border border-white/5 relative">
                    <div className="flex-1">
                      <label htmlFor={`batchAddressInput_${index}`} className="block text-[#71717a] text-[9px] font-semibold mb-1">
                        #{index + 1} Address
                      </label>
                      <input
                        type="text"
                        id={`batchAddressInput_${index}`}
                        placeholder="0x..."
                        name={`batchAddress_${index}`}
                        value={recipient.address}
                        onChange={(e) => handleBatchChange(index, "address", e.target.value)}
                        className="w-full h-8 px-2.5 rounded bg-[#060912] border border-white/5 text-xs text-white placeholder-[#71717a] font-mono focus:outline-none focus:border-[#2563EB]"
                        required
                      />
                    </div>
                    <div className="w-1/4">
                      <label htmlFor={`batchAmountInput_${index}`} className="block text-[#71717a] text-[9px] font-semibold mb-1">
                        Amount
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
                        className="w-full h-8 px-2 rounded bg-[#060912] border border-white/5 text-xs text-white placeholder-[#71717a] font-mono focus:outline-none focus:border-[#2563EB]"
                        required
                      />
                    </div>
                    {batchRecipients.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeBatchRow(index)}
                        className="text-[#EF4444] hover:bg-[#EF4444]/15 px-2.5 h-8 text-[11px] font-bold rounded border border-[#EF4444]/20 transition duration-150"
                        aria-label={`Remove recipient ${index + 1}`}
                      >
                        &times;
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div>
              <label htmlFor="batchMessageInput" className="block text-[#a1a7bb] text-xs font-semibold mb-1.5">
                Common Message (Optional)
              </label>
              <textarea
                id="batchMessageInput"
                placeholder="Reason for this batch transfer..."
                name="batchMessage"
                value={batchMessage}
                onChange={(e) => setBatchMessage(e.target.value)}
                className="w-full p-3 text-xs rounded premium-input focus:outline-none text-white placeholder-[#71717a] resize-none h-16"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className={`w-full h-10 rounded-lg text-xs font-bold text-white transition duration-200 ${
                loading
                  ? "bg-white/5 text-[#71717a] border border-white/5 cursor-not-allowed"
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
