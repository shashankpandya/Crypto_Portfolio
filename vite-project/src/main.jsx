import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import './index.css'

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
}

checkBootEnvironment();

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
