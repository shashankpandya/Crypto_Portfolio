import React, { useState, useEffect, useContext } from "react";
import { useParams } from "react-router-dom";
import { getCoinDetails, getCoinHistory } from "../api";
import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import { TransactionContext } from "../context/TransactionContext";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

const timeRanges = [
  { label: "24 Hours", days: 1 },
  { label: "7 Days", days: 7 },
  { label: "30 Days", days: 30 },
  { label: "3 Months", days: 90 },
  { label: "1 Year", days: 365 },
];

const CoinDetails = () => {
  const { id } = useParams();
  const { currentAccount } = useContext(TransactionContext);
  const [coinDetails, setCoinDetails] = useState(null);
  const [coinHistory, setCoinHistory] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedRange, setSelectedRange] = useState(timeRanges[2]); // Default to 30 days
  const [isInWatchlist, setIsInWatchlist] = useState(false);

  useEffect(() => {
    const watchlist =
      JSON.parse(localStorage.getItem(`watchlist_${currentAccount}`)) || [];
    setIsInWatchlist(watchlist.includes(id));
  }, [id, currentAccount]);

  useEffect(() => {
    async function fetchData() {
      setIsLoading(true);
      setError(null);
      try {
        const [details, history] = await Promise.all([
          getCoinDetails(id),
          getCoinHistory(id, selectedRange.days),
        ]);
        setCoinDetails(details);
        setCoinHistory(history.prices);
      } catch (err) {
        console.error("Error fetching coin data:", err);
        setError("Failed to load coin data. Please try again later.");
      } finally {
        setIsLoading(false);
      }
    }
    fetchData();
  }, [id, selectedRange]);

  const toggleWatchlist = () => {
    const watchlist =
      JSON.parse(localStorage.getItem(`watchlist_${currentAccount}`)) || [];
    if (isInWatchlist) {
      const updatedWatchlist = watchlist.filter((coinId) => coinId !== id);
      localStorage.setItem(
        `watchlist_${currentAccount}`,
        JSON.stringify(updatedWatchlist)
      );
      setIsInWatchlist(false);
    } else {
      watchlist.push(id);
      localStorage.setItem(
        `watchlist_${currentAccount}`,
        JSON.stringify(watchlist)
      );
      setIsInWatchlist(true);
    }
  };

  if (isLoading) return <div className="text-white">Loading...</div>;
  if (error) return <div className="text-red-500">{error}</div>;
  if (!coinDetails || !coinHistory)
    return <div className="text-white">No data available for this coin.</div>;

  const chartData = {
    labels: coinHistory.map((price) => new Date(price[0]).toLocaleDateString()),
    datasets: [
      {
        label: "Price",
        data: coinHistory.map((price) => price[1]),
        fill: false,
        borderColor: "rgb(75, 192, 192)",
        tension: 0.1,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: { mode: "index", intersect: false },
    },
    scales: {
      x: {
        type: "category",
        title: { display: true, text: "Date" },
        ticks: { maxTicksLimit: 8 },
      },
      y: {
        title: { display: true, text: "Price (USD)" },
        ticks: {
          callback: (value) => "$" + value.toLocaleString(),
        },
      },
    },
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white p-8">
      <div className="max-w-6xl mx-auto bg-gray-800 rounded-3xl shadow-2xl overflow-hidden">
        <div className="p-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center">
              {coinDetails.image && (
                <img
                  src={coinDetails.image.large}
                  alt={coinDetails.name}
                  className="w-16 h-16 mr-4"
                />
              )}
              <h2 className="text-4xl font-bold text-teal-400">
                {coinDetails.name}{" "}
                <span className="text-2xl text-gray-400">
                  ({coinDetails.symbol?.toUpperCase()})
                </span>
              </h2>
            </div>
            <button
              onClick={toggleWatchlist}
              className="bg-teal-500 hover:bg-teal-600 text-white font-bold py-2 px-4 rounded-full transition duration-300 ease-in-out transform hover:-translate-y-1 hover:shadow-lg"
            >
              {isInWatchlist ? "Remove from Watchlist" : "Add to Watchlist"}
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
            <div className="bg-gray-700 p-4 rounded-xl">
              <p className="text-gray-400 mb-1">Current Price</p>
              <p className="text-2xl font-bold">
                $
                {coinDetails.market_data?.current_price?.usd?.toLocaleString() ||
                  "N/A"}
              </p>
            </div>
            <div className="bg-gray-700 p-4 rounded-xl">
              <p className="text-gray-400 mb-1">Market Cap</p>
              <p className="text-2xl font-bold">
                $
                {coinDetails.market_data?.market_cap?.usd?.toLocaleString() ||
                  "N/A"}
              </p>
            </div>
            <div className="bg-gray-700 p-4 rounded-xl">
              <p className="text-gray-400 mb-1">24h Change</p>
              <p
                className={`text-2xl font-bold ${
                  coinDetails.market_data?.price_change_percentage_24h >= 0
                    ? "text-green-400"
                    : "text-red-400"
                }`}
              >
                {coinDetails.market_data?.price_change_percentage_24h?.toFixed(
                  2
                ) || "N/A"}
                %
              </p>
            </div>
          </div>
          <div className="mb-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-2xl font-bold text-teal-400">
                Price History
              </h3>
              <select
                value={JSON.stringify(selectedRange)}
                onChange={(e) => setSelectedRange(JSON.parse(e.target.value))}
                className="bg-gray-700 text-white p-2 rounded"
              >
                {timeRanges.map((range) => (
                  <option key={range.days} value={JSON.stringify(range)}>
                    {range.label}
                  </option>
                ))}
              </select>
            </div>
            <div
              className="bg-gray-700 p-4 rounded-xl"
              style={{ height: "400px" }}
            >
              <Line data={chartData} options={chartOptions} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CoinDetails;
