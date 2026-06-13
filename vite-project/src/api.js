// src/api.js

import axios from "axios";

const BASE_URL = "https://api.coingecko.com/api/v3";
const API_KEY = import.meta.env.VITE_COINGECKO_API_KEY;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
const RETRY_DELAY = 2000; // 2 seconds

const cache = new Map();

const apiParams = {};
if (API_KEY) {
  apiParams.x_cg_demo_api_key = API_KEY;
}

const api = axios.create({
  baseURL: BASE_URL,
  params: apiParams,
});

const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const MOCK_COINS = [
  {
    id: "bitcoin",
    name: "Bitcoin",
    symbol: "btc",
    image: "https://assets.coingecko.com/coins/images/1/large/bitcoin.png",
    current_price: 68420.50,
    price_change_percentage_24h: 2.45,
    sparkline_in_7d: {
      price: [67100, 67300, 66900, 67400, 68000, 67800, 68420.50]
    }
  },
  {
    id: "ethereum",
    name: "Ethereum",
    symbol: "eth",
    image: "https://assets.coingecko.com/coins/images/279/large/ethereum.png",
    current_price: 3520.75,
    price_change_percentage_24h: -1.20,
    sparkline_in_7d: {
      price: [3610, 3590, 3550, 3580, 3530, 3540, 3520.75]
    }
  },
  {
    id: "solana",
    name: "Solana",
    symbol: "sol",
    image: "https://assets.coingecko.com/coins/images/4128/large/solana.png",
    current_price: 154.60,
    price_change_percentage_24h: 5.82,
    sparkline_in_7d: {
      price: [142, 145, 148, 146, 150, 152, 154.60]
    }
  },
  {
    id: "cardano",
    name: "Cardano",
    symbol: "ada",
    image: "https://assets.coingecko.com/coins/images/975/large/cardano.png",
    current_price: 0.455,
    price_change_percentage_24h: -0.85,
    sparkline_in_7d: {
      price: [0.465, 0.462, 0.458, 0.460, 0.452, 0.456, 0.455]
    }
  },
  {
    id: "ripple",
    name: "Ripple",
    symbol: "xrp",
    image: "https://assets.coingecko.com/coins/images/44/large/xrp.png",
    current_price: 0.502,
    price_change_percentage_24h: 1.15,
    sparkline_in_7d: {
      price: [0.495, 0.498, 0.496, 0.501, 0.499, 0.500, 0.502]
    }
  },
  {
    id: "dogecoin",
    name: "Dogecoin",
    symbol: "doge",
    image: "https://assets.coingecko.com/coins/images/5/large/dogecoin.png",
    current_price: 0.142,
    price_change_percentage_24h: 8.10,
    sparkline_in_7d: {
      price: [0.128, 0.132, 0.130, 0.135, 0.138, 0.140, 0.142]
    }
  },
  {
    id: "avalanche-2",
    name: "Avalanche",
    symbol: "avax",
    image: "https://assets.coingecko.com/coins/images/12559/large/Avalanche_Circle_RedWhite_Trans.png",
    current_price: 36.40,
    price_change_percentage_24h: -2.30,
    sparkline_in_7d: {
      price: [37.80, 37.50, 37.00, 37.20, 36.80, 36.50, 36.40]
    }
  },
  {
    id: "chainlink",
    name: "Chainlink",
    symbol: "link",
    image: "https://assets.coingecko.com/coins/images/877/large/chainlink-link-logo.png",
    current_price: 15.85,
    price_change_percentage_24h: 0.50,
    sparkline_in_7d: {
      price: [15.60, 15.70, 15.55, 15.80, 15.75, 15.90, 15.85]
    }
  },
  {
    id: "matic-network",
    name: "Polygon",
    symbol: "matic",
    image: "https://assets.coingecko.com/coins/images/4713/large/polygon.png",
    current_price: 0.645,
    price_change_percentage_24h: 3.25,
    sparkline_in_7d: {
      price: [0.620, 0.625, 0.618, 0.630, 0.635, 0.640, 0.645]
    }
  },
  {
    id: "polkadot",
    name: "Polkadot",
    symbol: "dot",
    image: "https://assets.coingecko.com/coins/images/12171/large/polkadot.png",
    current_price: 6.32,
    price_change_percentage_24h: -1.75,
    sparkline_in_7d: {
      price: [6.50, 6.45, 6.38, 6.42, 6.30, 6.35, 6.32]
    }
  }
];

const cachedRequest = async (url, params, retries = 3) => {
  const cacheKey = JSON.stringify({ url, params });
  const cachedResponse = cache.get(cacheKey);

  if (
    cachedResponse &&
    Date.now() - cachedResponse.timestamp < CACHE_DURATION
  ) {
    return cachedResponse.data;
  }

  try {
    const response = await api.get(url, { params });
    cache.set(cacheKey, { data: response.data, timestamp: Date.now() });
    return response.data;
  } catch (error) {
    if (
      error.response &&
      error.response.status === 429 &&
      retries > 0
    ) {
      console.log(`Rate limited. Retrying in ${RETRY_DELAY / 1000} seconds...`);
      await wait(RETRY_DELAY);
      return cachedRequest(url, params, retries - 1);
    }
    throw error;
  }
};

export const getCoinDetails = async (id) => {
  try {
    return await cachedRequest(`/coins/${id}`, {
      localization: false,
      tickers: false,
      market_data: true,
      community_data: false,
      developer_data: false,
      sparkline: false,
    });
  } catch (error) {
    console.warn("Error fetching coin details from API, using mock:", error);
    const mock = MOCK_COINS.find(c => c.id === id) || MOCK_COINS[0];
    return {
      id: mock.id,
      symbol: mock.symbol,
      name: mock.name,
      image: { large: mock.image },
      description: { en: `Mock description for ${mock.name}. This token is part of our local fallback dataset.` },
      market_data: {
        current_price: { usd: mock.current_price },
        market_cap: { usd: mock.current_price * 10000000 },
        fully_diluted_valuation: { usd: mock.current_price * 12000000 },
        total_volume: { usd: 1254300 },
        high_24h: { usd: mock.current_price * 1.05 },
        low_24h: { usd: mock.current_price * 0.95 },
        price_change_percentage_24h: mock.price_change_percentage_24h,
        price_change_24h: mock.current_price * (mock.price_change_percentage_24h / 100),
        circulating_supply: 5000000,
        total_supply: 10000000,
        max_supply: 20000000,
      }
    };
  }
};

export const getCoinHistory = async (id, days) => {
  try {
    return await cachedRequest(`/coins/${id}/market_chart`, {
      vs_currency: "usd",
      days: days,
    });
  } catch (error) {
    console.warn("Error fetching coin history from API, using mock:", error);
    const mock = MOCK_COINS.find(c => c.id === id) || MOCK_COINS[0];
    const prices = [];
    const now = Date.now();
    const points = days === 1 ? 24 : days;
    const interval = (days * 24 * 60 * 60 * 1000) / points;
    for (let i = points; i >= 0; i--) {
      const time = now - i * interval;
      const variation = (Math.random() - 0.48) * 0.04;
      prices.push([time, mock.current_price * (1 + variation)]);
    }
    return { prices };
  }
};

export const fetchCoins = async (limit = 100) => {
  try {
    return await cachedRequest('/coins/markets', {
      vs_currency: 'usd',
      order: 'market_cap_desc',
      per_page: limit,
      page: 1,
      sparkline: true
    });
  } catch (error) {
    console.warn("Error fetching coins from API, using mock:", error);
    return MOCK_COINS.slice(0, limit);
  }
};

export const fetchAllCoins = async () => {
  try {
    return await cachedRequest('/coins/markets', {
      vs_currency: 'usd',
      order: 'market_cap_desc',
      per_page: 250,
      page: 1,
      sparkline: true
    });
  } catch (error) {
    console.warn("Error fetching all coins from API, using mock:", error);
    return MOCK_COINS;
  }
};

export const fetchTokenData = async (query) => {
  try {
    const response = await cachedRequest("/search", { query });
    if (response.coins.length > 0) {
      const coinId = response.coins[0].id;
      return getCoinDetails(coinId);
    }
    return null;
  } catch (error) {
    console.warn("Error fetching token data from API, trying mock search:", error);
    const matched = MOCK_COINS.find(
      c => c.name.toLowerCase().includes(query.toLowerCase()) || 
           c.symbol.toLowerCase().includes(query.toLowerCase())
    );
    if (matched) {
      return getCoinDetails(matched.id);
    }
    return null;
  }
};

export const fetchTokenHistory = async (id, days = 30) => {
  return getCoinHistory(id, days);
};

export const searchCoins = async (query, coins) => {
  const coinsList = coins && coins.length > 0 ? coins : MOCK_COINS;
  return coinsList.filter(coin => 
    coin && (
      (coin.name || '').toLowerCase().includes(query.toLowerCase()) ||
      (coin.symbol || '').toLowerCase().includes(query.toLowerCase())
    )
  );
};

