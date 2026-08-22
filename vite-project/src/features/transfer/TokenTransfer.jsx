import React, { useEffect, useRef, useState } from "react";
import { ethers } from "ethers";
import { useWallet } from "../../hooks/useWallet";
import { useContract } from "../../hooks/useContract";
import Button from "../../components/ui/Button";

const isValidAddress = (addr) => {
  return /^0x[a-fA-F0-9]{40}$/.test(addr);
};

function TokenTransfer() {
  const { currentAccount } = useWallet();
  const { formData, handleChange, sendTransaction, sendBatchTransaction } = useContract();
  
  const [activeTab, setActiveTab] = useState("single");
  const nextBatchRowId = useRef(1);
  const [batchRecipients, setBatchRecipients] = useState([{ id: 0, address: "", amount: "" }]);
  const [batchMessage, setBatchMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [gasEstimate, setGasEstimate] = useState(null);

  // Validation states for single transfer
  const [singleAddressValid, setSingleAddressValid] = useState(null); // null, true, false
  const [singleAmountValid, setSingleAmountValid] = useState(null);

  // Dynamic fee estimate (P1-13)
  useEffect(() => {
    let isMounted = true;

    const estimateFee = async () => {
      if (!window.ethereum || !formData.addressTo || !formData.amount) {
        if (isMounted) setGasEstimate(null);
        return;
      }
      if (!isValidAddress(formData.addressTo) || parseFloat(formData.amount) <= 0) {
        if (isMounted) setGasEstimate(null);
        return;
      }

      try {
        const provider = new ethers.BrowserProvider(window.ethereum);
        const feeData = await provider.getFeeData();
        const gasPrice = feeData.gasPrice || feeData.maxFeePerGas || 0n;

        if (gasPrice > 0n) {
          const gweiVal = Math.round(Number(ethers.formatUnits(gasPrice, "gwei")));
          const estimatedWei = 85000n * gasPrice; // ~85,000 gas units estimate
          const ethVal = parseFloat(ethers.formatEther(estimatedWei)).toFixed(5);

          if (isMounted) {
            setGasEstimate({
              gwei: `~${gweiVal} Gwei`,
              eth: `~${ethVal} ETH`,
            });
          }
        } else {
          if (isMounted) setGasEstimate(null);
        }
      } catch {
        if (isMounted) setGasEstimate(null);
      }
    };

    estimateFee();
    return () => {
      isMounted = false;
    };
  }, [formData.addressTo, formData.amount]);

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
    setBatchRecipients([...batchRecipients, { id: nextBatchRowId.current++, address: "", amount: "" }]);
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
      {/* Compact inline page header row */}
      <div className="flex items-center justify-between mb-5 pt-6">
        <div>
          <h1 className="text-base font-semibold text-white">Transfer</h1>
          <p className="text-xs text-slate-500 mt-0.5">Send tokens to other addresses</p>
        </div>
      </div>

      <div className="w-full bg-surface-raised border border-white/5 rounded-lg p-5 shadow-lg relative">
        {/* Tab Selector */}
        <div className="flex justify-center mb-6">
          <div className="inline-flex bg-surface border border-white/10 rounded-lg p-0.5 w-fit font-semibold text-xs select-none">
            <button
              type="button"
              onClick={() => {
                setActiveTab("single");
                setErrorMessage("");
                setSuccessMessage("");
              }}
              className={`text-sm px-4 py-1.5 rounded-md transition-all ${
                activeTab === "single"
                  ? "bg-white/5 text-white font-medium shadow-inner border border-white/10"
                  : "text-slate-500 hover:text-slate-300"
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
              className={`text-sm px-4 py-1.5 rounded-md transition-all ${
                activeTab === "batch"
                  ? "bg-white/5 text-white font-medium shadow-inner border border-white/10"
                  : "text-slate-500 hover:text-slate-300"
              }`}
            >
              Batch List
            </button>
          </div>
        </div>

        {/* Status Messages */}
        {errorMessage && (
          <div className="bg-negative/10 border border-negative/20 text-negative px-3.5 py-2 rounded text-xs mb-4" role="alert">
            <p className="font-bold">Error</p>
            <p className="opacity-90 mt-0.5">{errorMessage}</p>
          </div>
        )}
        {successMessage && (
          <div className="bg-positive/10 border border-positive/20 text-positive px-3.5 py-2 rounded text-xs mb-4" role="alert">
            <p className="font-bold">Success</p>
            <p className="opacity-90 mt-0.5 break-all">{successMessage}</p>
          </div>
        )}

        {/* Single Transfer Form */}
        {activeTab === "single" && (
          <form onSubmit={handleSingleSubmit} className="space-y-4">
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label htmlFor="addressToInput" className="text-xs font-medium text-slate-400">
                  Recipient Address
                </label>
                {singleAddressValid !== null && (
                  <span
                    id="addressToInput-validity"
                    className={`text-[10px] font-bold ${singleAddressValid ? "text-positive" : "text-negative"}`}
                  >
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
                aria-invalid={singleAddressValid === false ? "true" : undefined}
                aria-describedby={singleAddressValid !== null ? "addressToInput-validity" : undefined}
                className={`w-full h-10 px-3 text-sm rounded bg-surface border border-white/8 text-white placeholder:text-slate-600 font-mono transition-colors duration-150 focus:border-white/20 focus:ring-0 focus:outline-none ${
                  singleAddressValid === true ? "border-positive" : singleAddressValid === false ? "border-negative" : ""
                }`}
                required
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label htmlFor="amountInput" className="text-xs font-medium text-slate-400">
                  Amount (MTK)
                </label>
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
                className={`w-full h-10 px-3 text-sm rounded bg-surface border border-white/8 text-white placeholder:text-slate-600 transition-colors duration-150 focus:border-white/20 focus:ring-0 focus:outline-none ${
                  singleAmountValid === true ? "border-positive" : singleAmountValid === false ? "border-negative" : ""
                }`}
                required
              />
            </div>

            <div>
              <label htmlFor="messageInput" className="block text-xs font-medium text-slate-400 mb-1.5">
                Memo Message (Optional)
              </label>
              <textarea
                id="messageInput"
                placeholder="Attach a transaction note..."
                name="message"
                value={formData.message || ""}
                onChange={(e) => handleChange(e, "message")}
                className="w-full p-3 text-sm rounded bg-surface border border-white/8 text-white placeholder:text-slate-600 transition-colors duration-150 focus:border-white/20 focus:ring-0 focus:outline-none resize-none h-16"
              />
            </div>

            {/* Dynamic Gas estimator (P1-13) — hidden when estimate is unavailable */}
            {gasEstimate && (
              <div className="bg-white/[0.02] border border-white/5 rounded-md px-3 py-2 text-[11px] font-mono text-slate-500 flex justify-between items-center select-none">
                <span><span className="text-slate-600 mr-1">⛽</span> Network Fee (Estimate):</span>
                <span className="text-white">
                  {gasEstimate.gwei} {gasEstimate.eth ? `(${gasEstimate.eth})` : ""}
                </span>
              </div>
            )}


            <Button type="submit" disabled={loading} className="w-full h-10 hover:shadow-lg hover:shadow-coral/20">
              {loading ? (
                "Processing Transfer..."
              ) : (
                <>
                  <svg className="w-4 h-4 mr-1.5 inline-block align-middle" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M7 17L17 7M17 7H7M17 7V17" />
                  </svg>
                  Transfer Tokens
                </>
              )}
            </Button>
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
                  className="bg-white/5 border border-white/5 hover:bg-white/10 text-cobalt hover:text-white px-2.5 py-1 rounded text-[10px] font-bold transition duration-150"
                >
                  + Add Recipient
                </button>
              </div>

              <div className="max-h-48 overflow-y-auto space-y-2.5 pr-1 py-1 border-t border-b border-white/5">
                {batchRecipients.map((recipient, index) => (
                  <div key={recipient.id} className="flex space-x-2 items-end bg-base p-2.5 rounded border border-white/5 relative">
                    <div className="flex-1">
                      <label htmlFor={`batchAddressInput_${index}`} className="block text-slate-400 text-[9px] font-semibold mb-1">
                        #{index + 1} Address
                      </label>
                      <input
                        type="text"
                        id={`batchAddressInput_${index}`}
                        placeholder="0x..."
                        name={`batchAddress_${index}`}
                        value={recipient.address}
                        onChange={(e) => handleBatchChange(index, "address", e.target.value)}
                        className="w-full h-8 px-2.5 rounded bg-surface border border-white/8 text-xs text-white placeholder:text-slate-600 font-mono transition-colors duration-150 focus:border-white/20 focus:outline-none"
                        required
                      />
                    </div>
                    <div className="w-1/4">
                      <label htmlFor={`batchAmountInput_${index}`} className="block text-slate-400 text-[9px] font-semibold mb-1">
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
                        className="w-full h-8 px-2 rounded bg-surface border border-white/8 text-xs text-white placeholder:text-slate-600 transition-colors duration-150 focus:border-white/20 focus:outline-none"
                        required
                      />
                    </div>
                    {batchRecipients.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeBatchRow(index)}
                        className="text-negative hover:bg-negative/15 px-2.5 h-8 text-[11px] font-bold rounded border border-negative/20 transition duration-150"
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
              <label htmlFor="batchMessageInput" className="block text-xs font-medium text-slate-400 mb-1.5">
                Common Message (Optional)
              </label>
              <textarea
                id="batchMessageInput"
                placeholder="Reason for this batch transfer..."
                name="batchMessage"
                value={batchMessage}
                onChange={(e) => setBatchMessage(e.target.value)}
                className="w-full p-3 text-sm rounded bg-surface border border-white/8 text-white placeholder:text-slate-600 transition-colors duration-150 focus:border-white/20 focus:outline-none resize-none h-16"
              />
            </div>

            <Button type="submit" disabled={loading} className="w-full h-10 hover:shadow-lg hover:shadow-coral/20">
              {loading ? (
                "Processing Batch..."
              ) : (
                <>
                  <svg className="w-4 h-4 mr-1.5 inline-block align-middle" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M7 17L17 7M17 7H7M17 7V17" />
                  </svg>
                  Send Batch ({batchRecipients.length} transfers)
                </>
              )}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}

export default TokenTransfer;
