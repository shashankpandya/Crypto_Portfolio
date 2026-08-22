import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { getCoinDetails, getCoinHistory } from "../../api";
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
import { useWallet } from "../../hooks/useWallet";
import { useWatchlist } from "../../hooks/useWatchlist";
import { COLORS } from "../../utils/tokens";
import Button from "../../components/ui/Button";

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
  const { currentAccount } = useWallet();
  const {
    fetchWatchlistDB,
    addToWatchlistDB,
    removeFromWatchlistDB,
    getAnonymousWatchlist,
    addToAnonymousWatchlist,
    removeFromAnonymousWatchlist,
  } = useWatchlist();
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
        const watchlist = getAnonymousWatchlist();
        setIsInWatchlist(watchlist.includes(id));
      }
    };
    checkWatchlist();
  }, [id, currentAccount, fetchWatchlistDB, getAnonymousWatchlist]);

  const fetchData = React.useCallback(async () => {
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
  }, [id, selectedRange]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const toggleWatchlist = async () => {
    if (isInWatchlist) {
      if (currentAccount) {
        await removeFromWatchlistDB(currentAccount, id);
      } else {
        removeFromAnonymousWatchlist(id);
      }
      setIsInWatchlist(false);
    } else {
      if (currentAccount) {
        await addToWatchlistDB(currentAccount, id);
      } else {
        addToAnonymousWatchlist(id);
      }
      setIsInWatchlist(true);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-coral"></div>
      </div>
    );
  }
  if (error)
    return (
      <div className="flex flex-col items-center gap-3 p-5 text-center bg-negative/10 border border-negative/20 rounded-lg max-w-lg mx-auto">
        <p className="text-negative">{error}</p>
        <Button onClick={fetchData} className="text-xs py-1.5 px-4">
          Retry
        </Button>
      </div>
    );
  if (!coinDetails || !coinHistory)
    return <div className="text-white p-5 text-center bg-surface-raised border border-white/5 rounded-lg max-w-lg mx-auto text-xs">No data available for this coin.</div>;

  const chartData = {
    labels: (coinHistory || []).map((price) => new Date(price[0]).toLocaleDateString()),
    datasets: [
      {
        label: "Price",
        data: (coinHistory || []).map((price) => price[1]),
        fill: false,
        borderColor: COLORS.cobalt,
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
        title: { display: true, text: "Date", color: COLORS.muted },
        ticks: { maxTicksLimit: 8, color: COLORS.muted, font: { size: 10 } },
        grid: { color: "rgba(255, 255, 255, 0.03)" }
      },
      y: {
        title: { display: true, text: "Price (USD)", color: COLORS.muted },
        ticks: {
          color: COLORS.muted,
          font: { size: 10 },
          callback: (value) => "$" + value.toLocaleString(),
        },
        grid: { color: "rgba(255, 255, 255, 0.03)" }
      },
    },
  };

  return (
    <div className="page-container text-white max-w-4xl animate-fade-in">
      <div className="relative z-10">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <div className="flex items-center">
            {coinDetails.image && (
              <img
                src={coinDetails.image.large}
                alt={coinDetails.name}
                className="w-12 h-12 mr-3 rounded-full"
              />
            )}
            <div className="leading-tight">
              <h2 className="text-2xl font-extrabold tracking-tight text-white">
                {coinDetails.name}
              </h2>
              <span className="text-[10px] text-muted font-mono font-bold uppercase">
                {coinDetails.symbol?.toUpperCase() ?? "N/A"}
              </span>
            </div>
          </div>
          <Button
            onClick={toggleWatchlist}
            variant={isInWatchlist ? "secondary" : "primary"}
            className={`text-xs py-1.5 px-4 ${
              isInWatchlist ? "!bg-negative/10 !border-negative/20 !text-negative hover:!bg-negative hover:!text-white" : ""
            }`}
          >
            {isInWatchlist ? "Remove from Watchlist" : "Add to Watchlist"}
          </Button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <div className="bg-surface-raised p-4 rounded-lg border border-white/5">
            <p className="text-muted text-[10px] font-semibold uppercase tracking-wider mb-1">Current Price</p>
            <p className="text-xl font-bold font-mono text-white">
              $
              {coinDetails.market_data?.current_price?.usd?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 6 }) ||
                "N/A"}
            </p>
          </div>
          <div className="bg-surface-raised p-4 rounded-lg border border-white/5">
            <p className="text-muted text-[10px] font-semibold uppercase tracking-wider mb-1">Market Cap</p>
            <p className="text-xl font-bold font-mono text-white">
              $
              {coinDetails.market_data?.market_cap?.usd?.toLocaleString() ||
                "N/A"}
            </p>
          </div>
          <div className="bg-surface-raised p-4 rounded-lg border border-white/5">
            <p className="text-muted text-[10px] font-semibold uppercase tracking-wider mb-1">24h Change</p>
            <p
              className={`text-xl font-bold font-mono ${
                (coinDetails.market_data?.price_change_percentage_24h ?? 0) >= 0
                  ? "text-positive"
                  : "text-negative"
              }`}
            >
              {(coinDetails.market_data?.price_change_percentage_24h ?? 0) >= 0 ? "+" : ""}
              {coinDetails.market_data?.price_change_percentage_24h?.toFixed(2) || "N/A"}%
            </p>
          </div>
        </div>

        {/* Chart Area */}
        <div className="bg-surface-raised p-5 rounded-lg border border-white/5">
          <div className="flex justify-between items-center gap-4 mb-4">
            <h3 className="text-sm font-bold text-white">
              Historical Price
            </h3>
            <div className="relative">
              <select
                value={JSON.stringify(selectedRange)}
                onChange={(e) => setSelectedRange(JSON.parse(e.target.value))}
                className="text-xs text-slate-400 font-semibold px-3 py-1.5 rounded bg-base border border-white/5 cursor-pointer focus:outline-none"
              >
                {timeRanges.map((range) => (
                  <option key={range.days} value={JSON.stringify(range)}>
                    {range.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div style={{ height: "300px" }}>
            <Line data={chartData} options={chartOptions} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default CoinDetails;
