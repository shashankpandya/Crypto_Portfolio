import React from "react";
import { useParams } from "react-router-dom";

const TokenDetails = ({ tokenData }) => {
  const { id } = useParams();
  const symbol = id || "";
  const token = tokenData?.[symbol];

  return (
    <div className="p-8 bg-gray-800 text-white rounded-lg shadow-lg">
      <h2 className="text-3xl font-bold mb-6 text-teal-400">{symbol} Details</h2>
      {token ? (
        <div>
          <p className="mb-2">Name: {token.name || "N/A"}</p>
          <p className="mb-2">Symbol: {token.symbol || "N/A"}</p>
          <p className="mb-4">
            Current Price: ${token.market_data?.current_price?.usd ?? "N/A"}
          </p>
          {token.history && (
            <>
              <h3 className="text-xl mt-4">Price History</h3>
              <ul className="mt-2">
                {token.history.map(([timestamp, price]) => (
                  <li key={timestamp} className="mb-1">
                    Date: {new Date(timestamp).toLocaleDateString()} - Price: $
                    {typeof price === "number" ? price.toFixed(2) : "N/A"}
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      ) : (
        <p className="mt-4">Token data not available.</p>
      )}
    </div>
  );
};

export default TokenDetails;
