import React, { useContext, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { TransactionContext } from "../../context/TransactionContext";
import { ethers } from "ethers";
import { FaEthereum } from "react-icons/fa";
import { AiOutlineInfoCircle } from "react-icons/ai";
import { BiNetworkChart } from "react-icons/bi";
import TopCoins from "../TopCoins";

const Home = ({ coins }) => {
  const { currentAccount, checkTokenBalance, isConnectedToSite } =
    useContext(TransactionContext);
  const [balance, setBalance] = useState("0");
  const [network, setNetwork] = useState("Unknown Network");

  useEffect(() => {
    const fetchBalanceAndNetwork = async () => {
      if (currentAccount && window.ethereum) {
        try {
          const rawBalance = await checkTokenBalance(currentAccount);
          setBalance(parseFloat(rawBalance).toFixed(4));

          const provider = new ethers.BrowserProvider(window.ethereum);
          const networkInfo = await provider.getNetwork();
          const chainId = networkInfo.chainId;

          // Fetch network name using eth_chainId method
          const networkName = await provider.send("eth_chainId", []);
          setNetwork(networkName);

          // Listen for network changes
          window.ethereum.on("chainChanged", async (chainId) => {
            const newProvider = new ethers.BrowserProvider(window.ethereum);
            const newNetworkName = await newProvider.send("eth_chainId", []);
            setNetwork(newNetworkName);
          });
        } catch (error) {
          console.error("Error fetching balance or network:", error);
        }
      }
    };

    fetchBalanceAndNetwork();

    // Cleanup listener
    return () => {
      if (window.ethereum) {
        window.ethereum.removeListener("chainChanged", () => {});
      }
    };
  }, [currentAccount, checkTokenBalance]);

  return (
    <div className="min-h-screen bg-gray-900 rounded-lg text-white">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-5xl font-bold text-center text-teal-400 mb-12">
          Your Crypto Dashboard
        </h1>

        {isConnectedToSite ? (
          <div className="mb-12 grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Ethereum Card */}
            <div className="lg:col-span-1">
              <div
                className="h-[200px] w-full max-w-[350px] mx-auto rounded-2xl shadow-lg p-6 flex flex-col justify-between relative overflow-hidden"
                style={{
                  background:
                    "linear-gradient(135deg, #9c7af2 0%, #f07a7c 50%, #9cdf9b 100%)",
                }}
              >
                <div className="flex justify-between items-start">
                  <div className="w-10 h-10 rounded-full bg-white bg-opacity-20 flex items-center justify-center">
                    <FaEthereum className="text-white text-xl" />
                  </div>
                  <div className="group relative">
                    <AiOutlineInfoCircle className="text-white text-xl opacity-60 cursor-pointer" />
                    <div className="absolute right-0 w-48 p-2 mt-2 text-sm text-white bg-gray-800 rounded-md shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300">
                      Click on the coin to watch details and add to watchlist.
                    </div>
                  </div>
                </div>
                <div>
                  <p className="text-white text-sm font-light opacity-75">
                    {currentAccount
                      ? `${currentAccount.slice(0, 6)}...${currentAccount.slice(
                          -4
                        )}`
                      : "Address"}
                  </p>
                  <h3 className="text-white text-3xl font-bold mt-1">
                    Ethereum
                  </h3>
                </div>
              </div>
            </div>

            {/* Wallet Info */}
            <div className="lg:col-span-2 bg-gray-800 rounded-2xl shadow-md p-6">
              <h2 className="text-2xl font-semibold mb-4 text-teal-400">
                Wallet Information
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="flex items-center">
                  <FaEthereum className="text-teal-400 text-3xl mr-4" />
                  <div>
                    <p className="text-gray-400 text-sm">Balance</p>
                    <p className="text-white text-2xl font-bold">
                      {balance} ETH
                    </p>
                  </div>
                </div>
                <div className="flex items-center">
                  <BiNetworkChart className="text-teal-400 text-3xl mr-4" />
                  <div>
                    <p className="text-gray-400 text-sm">Network</p>
                    <p className="text-white text-xl">{network}</p>
                  </div>
                </div>
              </div>
              <div className="mt-6">
                <p className="text-gray-400 text-sm mb-1">Connected Address</p>
                <p className="text-white text-sm break-all">
                  {currentAccount || "Not connected"}
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center mb-12 bg-gray-800 rounded-lg p-8">
            <p className="text-2xl mb-4">
              Connect your wallet to view your portfolio and access features.
            </p>
            <p className="text-gray-400 text-lg">
              Use the{" "}
              <span className="text-teal-400 font-semibold">
                Connect for experience
              </span>{" "}
              button in the navbar to get started.
            </p>
          </div>
        )}

        {/* Top Cryptocurrencies Grid */}
        <div className="mt-12">
          <h2 className="text-3xl font-bold mb-6 text-teal-400">
            Top Cryptocurrencies
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {coins &&
              coins.slice(0, 6).map((coin) => (
                <Link
                  key={coin.id}
                  to={`/coin/${coin.id}`}
                  className="bg-gray-800 p-4 rounded-lg hover:bg-gray-700 transition-colors"
                >
                  <div className="flex items-center mb-2">
                    <img
                      src={coin.image}
                      alt={coin.name}
                      className="w-8 h-8 mr-2"
                    />
                    <h3 className="text-xl font-semibold">{coin.name}</h3>
                  </div>
                  <p className="text-gray-400">
                    Price: ${coin.current_price.toLocaleString()}
                  </p>
                  <p
                    className={`${
                      coin.price_change_percentage_24h >= 0
                        ? "text-green-500"
                        : "text-red-500"
                    }`}
                  >
                    24h: {coin.price_change_percentage_24h.toFixed(2)}%
                  </p>
                </Link>
              ))}
          </div>
        </div>

        {/* TopCoins component */}
        <TopCoins coins={coins} />
      </div>
    </div>
  );
};

export default Home;
