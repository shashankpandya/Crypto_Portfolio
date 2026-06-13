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
  const { currentAccount, fetchWatchlistDB, addToWatchlistDB, removeFromWatchlistDB } =
    useContext(TransactionContext);
  const [coinDetails, setCoinDetails] = useState(null);
  const [coinHistory, setCoinHistory] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedRange, setSelectedRange] = useState(timeRanges[2]); // Default to 30 days
  const [isInWatchlist, setIsInWatchlist] = useState(false);

  useEffect(() => {
    const checkWatchlist = async () => {
      if (currentAccount) {
        const dbCoins = await fetchWatchlistDB(currentAccount);
        setIsInWatchlist(dbCoins.includes(id));
      } else {
        const watchlist =
          JSON.parse(localStorage.getItem("watchlist_anonymous")) || [];
        setIsInWatchlist(watchlist.includes(id));
      }
    };
    checkWatchlist();
  }, [id, currentAccount, fetchWatchlistDB]);

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

  const toggleWatchlist = async () => {
    if (isInWatchlist) {
      if (currentAccount) {
        await removeFromWatchlistDB(currentAccount, id);
        const watchlist =
          JSON.parse(localStorage.getItem(`watchlist_${currentAccount}`)) || [];
        const updatedWatchlist = watchlist.filter((coinId) => coinId !== id);
        localStorage.setItem(
          `watchlist_${currentAccount}`,
          JSON.stringify(updatedWatchlist)
        );
      } else {
        const watchlist =
          JSON.parse(localStorage.getItem("watchlist_anonymous")) || [];
        const updatedWatchlist = watchlist.filter((coinId) => coinId !== id);
        localStorage.setItem(
          "watchlist_anonymous",
          JSON.stringify(updatedWatchlist)
        );
      }
      setIsInWatchlist(false);
    } else {
      if (currentAccount) {
        await addToWatchlistDB(currentAccount, id);
        const watchlist =
          JSON.parse(localStorage.getItem(`watchlist_${currentAccount}`)) || [];
        if (!watchlist.includes(id)) {
          watchlist.push(id);
          localStorage.setItem(
            `watchlist_${currentAccount}`,
            JSON.stringify(watchlist)
          );
        }
      } else {
        const watchlist =
          JSON.parse(localStorage.getItem("watchlist_anonymous")) || [];
        if (!watchlist.includes(id)) {
          watchlist.push(id);
          localStorage.setItem(
            "watchlist_anonymous",
            JSON.stringify(watchlist)
          );
        }
      }
      setIsInWatchlist(true);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#3861fb] shadow-md shadow-blue-500/20"></div>
      </div>
    );
  }
  if (error) return <div className="text-[#ea3943] p-8 text-center bg-[#ea3943]/10 border border-[#ea3943]/30 rounded-3xl max-w-xl mx-auto">{error}</div>;
  if (!coinDetails || !coinHistory)
    return <div className="text-white p-8 text-center bg-[#0e0f17]/40 border border-[#2e324d] rounded-3xl max-w-xl mx-auto">No data available for this coin.</div>;

  const chartData = {
    labels: (coinHistory || []).map((price) => new Date(price[0]).toLocaleDateString()),
    datasets: [
      {
        label: "Price",
        data: (coinHistory || []).map((price) => price[1]),
        fill: false,
        borderColor: "#3861fb",
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
        title: { display: true, text: "Date", color: "#9ca3af" },
        ticks: { maxTicksLimit: 8, color: "#9ca3af" },
        grid: { color: "rgba(56, 97, 251, 0.08)" }
      },
      y: {
        title: { display: true, text: "Price (USD)", color: "#9ca3af" },
        ticks: {
          color: "#9ca3af",
          callback: (value) => "$" + value.toLocaleString(),
        },
        grid: { color: "rgba(56, 97, 251, 0.08)" }
      },
    },
  };

  return (
    <div className="p-8 premium-glow-card text-white rounded-3xl relative overflow-hidden max-w-6xl mx-auto animate-fade-in">
      <div className="absolute inset-0 bg-shine opacity-5 pointer-events-none"></div>
      <div className="relative z-10">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
          <div className="flex items-center">
            {coinDetails.image && (
              <img
                src={coinDetails.image.large}
                alt={coinDetails.name}
                className="w-16 h-16 mr-4 rounded-full shadow-lg"
              />
            )}
            <div>
              <h2 className="text-4xl font-extrabold tracking-tight leading-tight">
                <span className="premium-text-gradient-primary">{coinDetails.name}</span>
              </h2>
              <span className="text-xs text-[#a1a7bb] font-mono font-bold uppercase">
                {coinDetails.symbol?.toUpperCase() ?? "N/A"}
              </span>
            </div>
          </div>
          <button
            onClick={toggleWatchlist}
            className={`font-bold py-2.5 px-6 rounded-full transition duration-305 ${
              isInWatchlist
                ? "bg-[#ea3943]/10 border border-[#ea3943]/30 text-[#ea3943] hover:bg-[#ea3943] hover:text-white"
                : "premium-btn text-white"
            }`}
          >
            {isInWatchlist ? "Remove from Watchlist" : "Add to Watchlist"}
          </button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-[#0e0f17]/50 p-5 rounded-2xl border border-[#2e324d]/85 shadow-inner">
            <p className="text-[#a1a7bb] text-xs font-semibold uppercase tracking-wider mb-1">Current Price</p>
            <p className="text-2xl font-black font-mono text-white">
              $
              {coinDetails.market_data?.current_price?.usd?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 6 }) ||
                "N/A"}
            </p>
          </div>
          <div className="bg-[#0e0f17]/50 p-5 rounded-2xl border border-[#2e324d]/85 shadow-inner">
            <p className="text-[#a1a7bb] text-xs font-semibold uppercase tracking-wider mb-1">Market Cap</p>
            <p className="text-2xl font-black font-mono text-white">
              $
              {coinDetails.market_data?.market_cap?.usd?.toLocaleString() ||
                "N/A"}
            </p>
          </div>
          <div className="bg-[#0e0f17]/50 p-5 rounded-2xl border border-[#2e324d]/85 shadow-inner">
            <p className="text-[#a1a7bb] text-xs font-semibold uppercase tracking-wider mb-1">24h Change</p>
            <p
              className={`text-2xl font-black font-mono ${
                (coinDetails.market_data?.price_change_percentage_24h ?? 0) >= 0
                  ? "text-[#16c784]"
                  : "text-[#ea3943]"
              }`}
            >
              {(coinDetails.market_data?.price_change_percentage_24h ?? 0) >= 0 ? "+" : ""}
              {coinDetails.market_data?.price_change_percentage_24h?.toFixed(
                2
              ) || "N/A"}
              %
            </p>
          </div>
        </div>

        {/* Chart Area */}
        <div className="bg-[#0e0f17]/50 p-6 rounded-2xl border border-[#2e324d]/85 shadow-inner">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
            <h3 className="text-2xl font-bold tracking-tight">
              <span className="premium-text-gradient-primary">Price Chart</span>
            </h3>
            <div className="relative w-full sm:w-auto">
              <select
                value={JSON.stringify(selectedRange)}
                onChange={(e) => setSelectedRange(JSON.parse(e.target.value))}
                className="w-full sm:w-auto text-[#a1a7bb] font-semibold px-4 py-2 rounded-xl focus:outline-none premium-input cursor-pointer"
              >
                {timeRanges.map((range) => (
                  <option key={range.days} value={JSON.stringify(range)}>
                    {range.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div style={{ height: "400px" }}>
            <Line data={chartData} options={chartOptions} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default CoinDetails;
