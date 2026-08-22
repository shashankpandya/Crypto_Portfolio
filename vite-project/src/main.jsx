import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import axios from 'axios'
import App from './App.jsx'
import './index.css'

/**
 * API base URL (this session) — every axios call in this app (api.js,
 * WalletContext, WatchlistContext, ContractContext) uses a relative path
 * like `/api/watchlist/...`, which resolves against whatever origin the
 * frontend itself is served from. That's correct for local dev (Vite's
 * proxy forwards /api to localhost:3000) and for a same-origin production
 * deployment, but silently wrong the moment frontend and backend are
 * deployed as two different hosts (e.g. a static host like Netlify for the
 * frontend + a separate Node host for the Express server) — every request
 * ends up hitting the frontend's own host instead of the backend, which is
 * exactly what happened here (Netlify's SPA fallback served index.html back
 * for every /api/* call instead of a 404 or real API response).
 * VITE_API_BASE_URL lets a split deployment point the frontend at the
 * backend's real URL; left unset, behavior is unchanged (relative paths).
 */
if (import.meta.env.VITE_API_BASE_URL) {
  axios.defaults.baseURL = import.meta.env.VITE_API_BASE_URL;
}

/**
 * checkBootEnvironment (P5-07) — VITE_CONTRACT_ADDRESS was unset in the
 * baseline capture, so chain features (transfer/allowance/admin) were
 * silently disabled the whole time. They already degrade gracefully
 * (contractService/ContractContext check for a valid address before making
 * chain calls) — this just makes the "why" loud instead of silent. Never
 * throws; a missing var degrades, it doesn't crash the app.
 */
function checkBootEnvironment() {
  if (!import.meta.env.VITE_CONTRACT_ADDRESS) {
    const message =
      '[Boot] VITE_CONTRACT_ADDRESS is not set — wallet transfer, allowance, and admin features will be disabled.';
    if (import.meta.env.PROD) {
      console.error(message);
    } else {
      console.warn(message);
    }
  }
  if (import.meta.env.PROD && !import.meta.env.VITE_API_BASE_URL) {
    console.warn(
      '[Boot] VITE_API_BASE_URL is not set in a production build — API calls will target this same origin. ' +
      'If the backend is hosted separately (e.g. this frontend is on Netlify), set VITE_API_BASE_URL to the backend\'s URL.'
    );
  }
}

checkBootEnvironment();

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
