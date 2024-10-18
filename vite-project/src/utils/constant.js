import { ethers } from "ethers";
import abi from "./Transactions.json";

export const transactionsABI = abi.abi;
export const transactionsAddress = "0x22664A9539c165f2A462Dc0eBE78b85063613A12";

// Utility function for retrying operations
const retry = async (fn, retries = 3, delay = 1000) => {
  try {
    return await fn();
  } catch (error) {
    if (retries === 0) throw error;
    await new Promise((resolve) => setTimeout(resolve, delay));
    return retry(fn, retries - 1, delay * 2);
  }
};

export const verifyContract = async () => {
  if (typeof window.ethereum === "undefined") {
    console.error("Ethereum object not found. Please install MetaMask.");
    return false;
  }

  return retry(async () => {
    const provider = new ethers.BrowserProvider(window.ethereum);
    const transactionsContract = new ethers.Contract(
      transactionsAddress,
      transactionsABI,
      provider
    );
    try {
      const transactionCount = await transactionsContract.getTransactionCount();
      console.log(
        `Transactions contract verified. Current transaction count: ${transactionCount}`
      );
      return true;
    } catch (error) {
      console.error("Failed to verify transactions contract:", error);
      throw error; // Throw the error to trigger retry
    }
  });
};

export const logContractMethods = (contract) => {
  if (!contract) {
    console.log("Contract is not available");
    return;
  }

  console.log(
    "Contract methods:",
    Object.getOwnPropertyNames(contract).filter(
      (prop) => typeof contract[prop] === "function"
    )
  );

  if (contract.interface && contract.interface.functions) {
    console.log(
      "Contract interface functions:",
      Object.keys(contract.interface.functions)
    );
  } else {
    console.log("Contract interface or functions not available");
  }
};

export const logContractDetails = (contract) => {
  if (!contract) {
    console.log("Contract is not available");
    return;
  }

  console.log("Contract:", contract);
  console.log("Contract properties:", Object.getOwnPropertyNames(contract));

  if (contract.interface) {
    console.log("Contract interface:", contract.interface);
  } else {
    console.log("Contract interface not available");
  }
};

export const checkAllowance = async (owner, spender) => {
  if (typeof window.ethereum === "undefined") {
    throw new Error("Ethereum object not found");
  }

  return retry(async () => {
    const provider = new ethers.BrowserProvider(window.ethereum);
    const contract = new ethers.Contract(
      transactionsAddress,
      transactionsABI,
      provider
    );

    if (typeof contract.allowance !== "function") {
      console.warn(
        "Allowance function not found in contract ABI. Returning default value."
      );
      return ethers.parseEther("0");
    }

    try {
      const allowance = await contract.allowance(owner, spender);
      return allowance;
    } catch (error) {
      console.error("Error checking allowance:", error);
      throw error;
    }
  });
};

export const approveAllowance = async (spender, amount) => {
  if (typeof window.ethereum === "undefined") {
    throw new Error("Ethereum object not found");
  }

  return retry(async () => {
    await window.ethereum.request({ method: "eth_requestAccounts" });
    const provider = new ethers.BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();
    const contract = new ethers.Contract(
      transactionsAddress,
      transactionsABI,
      signer
    );
    try {
      const tx = await contract.approve(spender, amount);
      await tx.wait();
      return tx.hash;
    } catch (error) {
      console.error("Error approving allowance:", error);
      throw error;
    }
  });
};

export default { transactionsABI, transactionsAddress };
