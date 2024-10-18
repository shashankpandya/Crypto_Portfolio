import React from "react";
import { Link } from "react-router-dom";

const TopCoins = ({ coins }) => {
  return (
    <div className="w-full bg-gray-800 text-white rounded-lg shadow-lg p-8 mt-12">
      <h2 className="text-4xl font-bold mb-8 text-center text-teal-400">
        Explore Top Crypto Coins
      </h2>
      <div className="overflow-x-auto">
        <table className="w-full table-auto">
          <thead>
            <tr className="bg-gray-700">
              <th className="px-4 py-2 text-left">Rank</th>
              <th className="px-4 py-2 text-left">Coin</th>
              <th className="px-4 py-2 text-right">Price</th>
              <th className="px-4 py-2 text-right">24h Change</th>
              <th className="px-4 py-2 text-right">Market Cap</th>
            </tr>
          </thead>
          <tbody>
            {coins.map((coin, index) => (
              <tr
                key={coin.id}
                className="border-b border-gray-700 hover:bg-gray-700 transition-colors duration-200"
              >
                <td className="px-4 py-4">{index + 1}</td>
                <td className="px-4 py-4">
                  <Link to={`/coin/${coin.id}`} className="flex items-center">
                    <img
                      src={coin.image}
                      alt={coin.name}
                      className="w-8 h-8 mr-3"
                    />
                    <div>
                      <div className="font-bold">{coin.name}</div>
                      <div className="text-sm text-gray-400">
                        {coin.symbol.toUpperCase()}
                      </div>
                    </div>
                  </Link>
                </td>
                <td className="px-4 py-4 text-right">
                  ${coin.current_price.toLocaleString()}
                </td>
                <td
                  className={`px-4 py-4 text-right ${
                    coin.price_change_percentage_24h >= 0
                      ? "text-green-400"
                      : "text-red-400"
                  }`}
                >
                  {coin.price_change_percentage_24h.toFixed(2)}%
                </td>
                <td className="px-4 py-4 text-right">
                  ${coin.market_cap.toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default TopCoins;
