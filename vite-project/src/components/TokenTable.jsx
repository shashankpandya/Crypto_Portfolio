import React from "react";

function TokenTable({ tokenData }) {
  return (
    <div className="p-8 bg-gray-800 text-white rounded-lg shadow-lg">
      <h2 className="text-3xl font-bold mb-6 text-teal-400">Token Prices</h2>
      <table className="min-w-full border-collapse border border-gray-700">
        <thead>
          <tr className="bg-gray-900 text-white">
            <th className="border border-gray-600 px-4 py-2">Name</th>
            <th className="border border-gray-600 px-4 py-2">Symbol</th>
            <th className="border border-gray-600 px-4 py-2">
              Current Price (USD)
            </th>
            <th className="border border-gray-600 px-4 py-2">
              Market Cap (USD)
            </th>
            <th className="border border-gray-600 px-4 py-2">
              24h Volume (USD)
            </th>
            <th className="border border-gray-600 px-4 py-2">24h Change (%)</th>
          </tr>
        </thead>
        <tbody>
          {Object.keys(tokenData).map((symbol) => {
            const token = tokenData[symbol];
            return (
              <tr
                key={symbol}
                className="bg-gray-700 hover:bg-gray-600 transition duration-200"
              >
                <td className="border border-gray-600 px-4 py-2">
                  {token.name}
                </td>
                <td className="border border-gray-600 px-4 py-2">
                  {token.symbol}
                </td>
                <td className="border border-gray-600 px-4 py-2">
                  ${token.current_price.toFixed(2)}
                </td>
                <td className="border border-gray-600 px-4 py-2">
                  ${token.market_cap.toLocaleString()}
                </td>
                <td className="border border-gray-600 px-4 py-2">
                  ${token.total_volume.toLocaleString()}
                </td>
                <td className="border border-gray-600 px-4 py-2">
                  {token.price_change_percentage_24h.toFixed(2)}%
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default TokenTable;
