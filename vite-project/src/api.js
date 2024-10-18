// src/api.js

import axios from "axios";

const BASE_URL = "https://api.coingecko.com/api/v3";
const API_KEY = "CG-Vg854mvNNJR3N8KfKxKZ68N8";
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
const RETRY_DELAY = 2000; // 2 seconds

const cache = new Map();

const api = axios.create({
  baseURL: BASE_URL,
  params: {
    x_cg_demo_api_key: API_KEY
  }
});

const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

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
    console.error("Error fetching coin details:", error);
    throw error;
  }
};

export const getCoinHistory = async (id, days) => {
  try {
    return await cachedRequest(`/coins/${id}/market_chart`, {
      vs_currency: "usd",
      days: days,
    });
  } catch (error) {
    console.error("Error fetching coin history:", error);
    throw error;
  }
};

export const fetchCoins = async (limit = 100) => {
  try {
    return await cachedRequest('/coins/markets', {
      vs_currency: 'usd',
      order: 'market_cap_desc',
      per_page: limit,
      page: 1,
      sparkline: false
    });
  } catch (error) {
    console.error("Error fetching coins:", error);
    throw error;
  }
};

export const fetchAllCoins = async () => {
  try {
    return await cachedRequest('/coins/markets', {
      vs_currency: 'usd',
      order: 'market_cap_desc',
      per_page: 250,
      page: 1,
      sparkline: false
    });
  } catch (error) {
    console.error("Error fetching all coins:", error);
    throw error;
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
    console.error("Error fetching token data:", error);
    throw error;
  }
};

export const fetchTokenHistory = async (id, days = 30) => {
  return getCoinHistory(id, days);
};

export const searchCoins = async (query, coins) => {
  return coins.filter(coin => 
    coin.name.toLowerCase().includes(query.toLowerCase()) ||
    coin.symbol.toLowerCase().includes(query.toLowerCase())
  );
};
